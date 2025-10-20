import browser from "webextension-polyfill";
import {createBinding} from "webext-pref-ui";
import {createLock, createLockPool} from "@eight04/read-write-lock";

import {pref} from "./lib/pref.js";
import {createProgressBar} from "./lib/progress.js";
import {IS_CHROME} from "./lib/env.js";
import {translateDOM} from "./lib/i18n.js";
import {setupHistory} from "./lib/input-history.js";
import {createTab} from "./lib/tab.js";

import {createCustomCSS} from "./lib/custom-css.js";
import {compileStringTemplate} from "./lib/string-template.js";
import {expandDate, expandEnv} from "./lib/expand-env.mjs";
import { IS_ANDROID } from "./lib/env.js";
import {timeout} from "./lib/timeout.js";

createCustomCSS();

const BATCH_ID = getBatchId();
const loadLock = createLockPool({maxActiveReader: 3});

let picker;

browser.runtime.sendMessage({method: "getBatchData", batchId: BATCH_ID})
	.then(async req => {
    await pref.ready();
    picker = init(req);
  });
  
// toolbar expand
for (const el of document.querySelectorAll(".toolbar")) {
  el.querySelector(".toolbar-expand-button").addEventListener("click", () => {
    el.classList.toggle("expanded");
  });
}

createBinding({
  pref,
  root: document.body,
  keyPrefix: ""
});

translateDOM(document.body);

for (const input of document.querySelectorAll(".history-container input")) {
  setupHistory(input, input.id);
}

let lastContextTarget;
document.addEventListener("contextmenu", e => {
  lastContextTarget = e.target;
});

browser.runtime.onMessage.addListener(req => {
  if (req.method === "viewSourceElementClicked") {
    return onViewSourceElementClicked(req);
  }
});

async function onViewSourceElementClicked(req) {
  let element;
  if (req.elementId) {
    element = browser.menus.getTargetElement(req.elementId);
  } else {
    element = lastContextTarget;
  }
  if (!element) {
    throw new Error("No element found");
  }
  const imageCheck = picker.coverToCheck(element);
  await Promise.all([
    browser.tabs.update(imageCheck.tabId, {active: true}),
    browser.tabs.sendMessage(imageCheck.tabId, {
      method: "viewSourceElement",
      pickaId: imageCheck.pickaId
    }, {frameId: imageCheck.frameId})
  ]);
}

function getBatchId() {
	const id = new URL(location.href).searchParams.get("batchId");
	return +id;
}

function init({tabs: originalTabs, env}) {
	var container = document.querySelector(".main-container"),
		frag = document.createDocumentFragment();
	const tabs = originalTabs.map(tab =>
		({
			tabId: tab.tabId,
			images: [].concat(...tab.frames.map(f => f.images.map(
				(imageData) => {
          const check = createImageCheckbox({
            frameId: f.frameId,
            tabId: tab.tabId,
            ...imageData
          });
          if (!pref.get("selectByDefault")) {
            check.toggleCheck();
          }
          return check;
        }
			))),
			env: tab.env
		})
	);
  const progress = createProgressBar();
		
	if (!pref.get("isolateTabs") || tabs.length === 1) {
		const container = document.createElement("div");
		container.className = "image-container";
		const appended = new Set;
		for (const tab of tabs) {
			for (const image of tab.images) {
				if (appended.has(image.url)) {
					continue;
				}
				appended.add(image.url);
				container.append(image.el);
				progress.add(image.load());
			}
		}
		frag.appendChild(container);
	} else {
		const ul = document.createElement("ul");
		ul.className = "tab-container";
		for (const tab of tabs) {
			if (!tab.images.length) {
				continue;
			}
			const li = document.createElement("li");
			li.className = "image-container";
			for (const image of tab.images) {
				li.appendChild(image.el);
				progress.add(image.load());
			}
			const counter = document.createElement("div");
			counter.className = "tab-image-counter";
			li.appendChild(counter);
			ul.appendChild(li);
		}
		frag.appendChild(ul);
	}
	
	container.appendChild(frag);
	
	initFilter(container, getImages());
	initUI(tabs);
	
	var handler = {
		invert() {
			getImages().forEach(i => i.toggleCheck());
		},
		async save(e) {
      // make it easier to close tab on Android
      if (IS_ANDROID) {
        history.pushState(null, "", location.href);
        addEventListener("popstate", () => {
          browser.runtime.sendMessage({method: "closeTab"});
        }, {once: true});
      }
      e.target.disabled = true;
      e.target.classList.add("loading");
      try {
        const result = await browser.runtime.sendMessage({
          method: "batchDownload",
          tabs: tabs.map(t =>
            Object.assign({}, t, {
              images: t.images
                .filter(i => i.selected())
                .map(i => ({
                  url: i.url,
                  filename: i.data.filename,
                  alt: i.alt
                }))
            })
          ),
          env,
          batchId: BATCH_ID
        });
        if (pref.get("packer") === "tar") {
          const root = await navigator.storage.getDirectory();
          const fileHandle = await root.getFileHandle(result.tarName);
          const file = await fileHandle.getFile();
          const url = URL.createObjectURL(file);
          const a = document.createElement("a");
          a.href = url;
          a.download = result.downloadName || result.tarName;
          a.style.display = "none";
          document.body.appendChild(a);
          a.click();
          a.remove();
          // copilot suggested adding a delay here or download may abort in some browsers becuase of URL.revokeObjectURL being called too early
          await timeout(1000);
          URL.revokeObjectURL(url);
          // NOTE: can't remove file until download complete
          // await root.removeEntry(result.tarName);
        }
        if (!IS_ANDROID) {
          // NOTE: closing the tab will close the download confirmation in Firefox Android
          await browser.runtime.sendMessage({method: "closeTab"});
        }
      } catch (err) {
        console.error(err);
        alert(err);
      } finally {
        e.target.disabled = false;
        e.target.classList.remove("loading");
      }
		},
		copyUrl() {
			const input = document.createElement("textarea");
			input.value = getUrls(getImages()).join("\n");
			document.body.appendChild(input);
			input.select();
			document.execCommand("copy");
			input.remove();
			if (!this.originalTextContent) {
				this.originalTextContent = this.textContent;
			}
			this.style.minWidth = this.offsetWidth + "px";
			this.textContent = browser.i18n.getMessage("pickerActionCopyUrlCopied");
			if (this.timer != null) {
				clearTimeout(this.timer);
			}
			this.timer = setTimeout(() => {
				this.textContent = this.originalTextContent;
				this.style.minWidth = "";
				this.timer = null;
			}, 1000);
		},
		cancel() {
			browser.runtime.sendMessage({method: "closeTab"});
		}
	};
	
	var actions = document.querySelector(".actions");
	for (var [cls, cb] of Object.entries(handler)) {
		actions.querySelector(`.${cls}`).onclick = cb;
	}

  return {coverToCheck};
	
	function getUrls(images) {
		return images.filter(i => i.selected()).map(i => i.url);
	}
	
	function getImages() {
		return [].concat(...tabs.map(t => t.images));
	}

  function coverToCheck(cover) {
    for (const image of getImages()) {
      if (image.cover === cover) {
        return image;
      }
    }
    throw new Error("Failed converting cover to check");
  }
}

function findSelectedImage(tabs) {
  let env, image;
  for (const tab of tabs) {
    env = tab.env;
    for (const i of tab.images) {
      if (i.selected()) {
        image = i;
        return [env, image];
      }
    }
  }
  // use the first image in this case
  for (const tab of tabs) {
    if (tab.images.length) {
      return [tab.env, tab.images[0]];
    }
  }
  throw new Error("failed finding selected image, no image available");
}

function updateFilenamePreviewFactory(tabs) {
  // FIXME: should we update image when the selection change?
  let env, image;
  return pattern => {
    if (!image || !image.selected) {
      const [newEnv, newImage] = findSelectedImage(tabs);
      env = Object.assign({}, newEnv);
      image = newImage;
    }
    expandDate(env);
    expandEnv(env, {
      // FIXME: do we want to use real index number?
      index: 1,
      url: image.url,
      base: image.data && image.data.filename,
      alt: image.alt
    });
    const filename = compileStringTemplate(pattern)(env);
    document.querySelector("#filePatternBatch").closest(".toolbar-control").title = `Preview: ${filename}`;
  };
}

function initUI(tabs) {
  const HANDLES = {
    previewMaxHeight: value => document.documentElement.style.setProperty(`--previewMaxHeight`, value),
    previewMaxHeightUpperBound: value => document.querySelector("#previewMaxHeight").max = value,
    filePatternBatch: updateFilenamePreviewFactory(tabs)
  };
	pref.on("change", changes => {
    for (const key in changes) {
      if (HANDLES[key]) {
        HANDLES[key](changes[key]);
      }
    }
	});

  for (const key in HANDLES) {
    HANDLES[key](pref.get(key));
  }
}

function initFilter(container, images) {
	var conf = pref.getAll(),
		FILTER_OPTIONS = ["minFileSize", "minWidth", "minHeight", "matchUrl", "matchType"];
	if (conf.matchUrl) {
		conf.matchUrl = buildRe(conf.matchUrl);
	}
	
	pref.on("change", changes => {
		if (FILTER_OPTIONS.some(o => changes[o] != null)) {
			Object.assign(conf, changes);
			if (conf.matchUrl && typeof conf.matchUrl == "string") {
				conf.matchUrl = buildRe(conf.matchUrl);
			}
			filterAll();
		}
	});
	
	// some images are still loading
	container.addEventListener("imageLoad", e => {
		var {image} = e.detail;
		filter(image);
	});
	
	// some images are already loaded
	filterAll();
	
	function buildRe(re) {
		try {
			return new RegExp(re, "i");
		} catch (err) {
			console.error(err);
		}
		return null;
	}
	
	function valid(image) {
    if (image.error || !image.data) {
      return false;
    }
		const {width, height, size} = image.data;
		const src = image.url;
		return size &&
			// svg has no natural width/height
			(!width || width >= conf.minWidth) &&
			(!height || height >= conf.minHeight) && 
			(!conf.matchUrl || 
				(conf.matchUrl.test(src) == (conf.matchType == "include"))) &&
			size >= conf.minFileSize * 1024;
	}
	
	function filter(image) {
		image.toggleEnable(valid(image));
	}

	function filterAll() {
		for (var image of images) {
			filter(image);
		}
	}
}

function createImageCheckbox({url, frameId, tabId, referrer, alt, pickaId}) {
	const label = document.createElement("label");
	const input = document.createElement("input");
	let ctrl;
	
	label.className = "image-checkbox checked";
	label.onclick = e => {
		if (e.target == input || input.disabled) {
			return;
		}
		const checked = input.checked;
		setTimeout(() => {
			if (input.checked == checked) {
				ctrl.toggleCheck();
				input.focus();
			}
		});
	};
	
	input.type = "checkbox";
	input.checked = true;
	input.onchange = () => {
		label.classList.toggle("checked", input.checked);
	};
	
	label.title = url;
	
	const imgContainer = document.createElement("div");
	imgContainer.className = "image-checkbox-image-container";
	
	const imgCover = new Image;
	imgCover.className = "image-checkbox-cover";
  imgCover.alt = "";
  imgCover.src = "about:blank";
	// don't drag
	if (IS_CHROME) {
		imgCover.draggable = false;
	} else {
		imgCover.ondragstart = () => false;
	}
  let middleClick = false;
  imgCover.onmousedown = e => {
    if (e.button == 1) {
      e.preventDefault();
      middleClick = true;
    }
  };
  imgCover.onmouseup = e => {
    if (middleClick && e.button == 1) {
      middleClick = false;
      createTab({url, openerTabId: "CURRENT_TAB", active: false});
      e.preventDefault();
    }
  };
	imgContainer.append(imgCover);
	
	label.append(input, imgContainer);
	
	return ctrl = {
		url,
		data: null,
    alt,
    pickaId,
		el: label,
    cover: imgCover,
    tabId,
    frameId,
		toggleEnable(enable) {
			label.classList.toggle("disabled", !enable);
			input.disabled = !enable;
		},
		toggleCheck() {
			label.classList.toggle("checked");
			input.checked = !input.checked;
		},
		selected() {
			return !input.disabled && input.checked;
		},
		load
	};
	
	function validUrl(url) {
		// make sure the URL is not relative?
		try {
			new URL(url);
			return true;
		} catch {
			return false;
		}
	}
	
	async function load() {
    label.classList.add("loading");
    let origin;
    try {
      origin = new URL(url).origin;
    } catch {
      // pass
    }
    try {
      if (origin) {
        return await loadLock.read([origin], doLoad);
      }
      return await doLoad();
    } catch (err) {
      ctrl.error = true;
      label.classList.add("error");
      throw err;
    } finally {
      label.classList.remove("loading");
      label.addEventListener("transitionend", () => {
        label.classList.add("loaded");
      }, {once: true});
    }
    
    async function doLoad() {
      if (!validUrl(url)) {
        throw new Error(`Invalid URL: ${url}`);
      }
      const data = await browser.runtime.sendMessage({
        method: "cacheImage",
        url,
        tabId,
        frameId,
        referrer,
        batchId: BATCH_ID
      });
      ctrl.data = data;
      imgCover.parentNode.insertBefore(createPlacehold(data.width, data.height), imgCover);
      imgCover.dataset.src = data.thumbnail || data.url;
      // FIXME: is there a way to keep real img while still using the low-res thumbnail?
      // https://github.com/eight04/image-picka/issues/237
      // imgCover.addEventListener("mouseover", () => {
      //   imgCover.src = data.url;
      // });
      setupLazyLoad(imgCover);
      if (pref.get("displayImageSizeUnderThumbnail")) {
        const info = document.createElement("span");
        info.className = "image-checkbox-info";
        info.textContent = `${data.width} x ${data.height}`;
        label.append(info);
      } else {
        if (data.width) {
          label.title += ` (${data.width} x ${data.height})`;
        }
      }
      label.title += ` [${formatFileSize(data.size)}]`;
      // https://bugzilla.mozilla.org/show_bug.cgi?id=329509
      imgCover.dispatchEvent(new CustomEvent("imageLoad", {
        bubbles: true,
        detail: {image: ctrl}
      }));
    }
	}
}

function createPlacehold(width, height) {
	const placehold = document.createElement("div");
	placehold.classList.add("image-checkbox-image");
  placehold.style.maxWidth = `calc(var(--previewMaxHeight) * ${width} / ${height} * 1px)`;
  placehold.style.width = `${width}px`;
  placehold.style.paddingTop = `${(height / width) * 100}%`;
  return placehold;
}

function formatFileSize(size) {
	return `${(size / 1024).toFixed(2)} KB`;
}

function setupLazyLoad(target) {
  let loadError = false;
  let bgUrl = "";
  const lock = createLock();
  if (typeof IntersectionObserver === "undefined") {
    load();
    return;
  }
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        load();
      } else {
        unload();
      }
    }
  });
  observer.observe(target);
  
  function load() {
    lock.write(() => {
      if (loadError) {
        return loadFromCache();
      }
      return loadImage(target, target.dataset.src)
        .catch(() => {
          loadError = true;
          return loadFromCache();
        });
    });
  }

  function loadFromCache() {
    return browser.runtime.sendMessage({
      method: "getCacheURL",
      url: target.dataset.src
    })
      .then(url => {
        bgUrl = url;
        target.style.backgroundImage = `url(${url})`;
        target.style.backgroundSize = "100%";
      });
  }
  
  function unload() {
    lock.write(() => {
      if (!loadError) {
        target.src = "";
      }
      target.style.backgroundImage = "";
      if (bgUrl) {
        return browser.runtime.sendMessage({
          method: "revokeURL",
          url: bgUrl
        })
          .catch(console.error);
      }
    });
  }
  
  function loadImage(img, url) {
    return new Promise((resolve, reject) => {
      img.src = url;
      img.addEventListener("load", onLoad);
      img.addEventListener("error", onError);
      
      function onLoad() {
        resolve();
        cleanup();
      }
      
      function onError() {
        reject(new Error(`Failed to load image: ${url}`));
        cleanup();
      }
      
      function cleanup() {
        img.removeEventListener("load", onLoad);
        img.removeEventListener("error", onError);
      }
    });
  }
}
