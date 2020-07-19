import browser from "webextension-polyfill";
import {createBinding} from "webext-pref-ui";
import {createLock} from "@eight04/read-write-lock";

import {pref} from "./lib/pref.js";
import {createProgressBar} from "./lib/progress.js";
import {IS_CHROME} from "./lib/env.js";
import {translateDOM} from "./lib/i18n.js";
import {setupHistory} from "./lib/input-history.js";

import {createCustomCSS} from "./lib/custom-css.js";

createCustomCSS();

const BATCH_ID = getBatchId();

browser.runtime.sendMessage({method: "getBatchData", batchId: BATCH_ID})
	.then(req => pref.ready().then(() => init(req)));
  
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

pref.on("change", onPrefChange);
onPrefChange(pref.getAll());
for (const input of document.querySelectorAll(".history-container input")) {
  setupHistory(input, input.id);
}

function onPrefChange(change) {
  if (change.previewMaxHeight) {
    document.documentElement.style.setProperty(`--previewMaxHeight`, change.previewMaxHeight);
  }
  if (change.previewMaxHeightUpperBound) {
    document.querySelector("#previewMaxHeight").max = change.previewMaxHeightUpperBound;
  }
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
				({url, noReferrer}) => {
          const check = createImageCheckbox(url, f.frameId, tab.tabId, noReferrer);
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
	initUI();
	
	var handler = {
		invert() {
			getImages().forEach(i => i.toggleCheck());
		},
		save(e) {
      e.target.disabled = true;
			browser.runtime.sendMessage({
				method: "batchDownload",
				tabs: tabs.map(t =>
					Object.assign({}, t, {
						images: t.images
							.filter(i => i.selected())
							.map(i => ({
								url: i.url,
								filename: i.data.filename
							}))
					})
				),
				env,
        batchId: BATCH_ID
			})
				.then(() => {
					browser.runtime.sendMessage({method: "closeTab"});
				});
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
	
	function getUrls(images) {
		return images.filter(i => i.selected()).map(i => i.url);
	}
	
	function getImages() {
		return [].concat(...tabs.map(t => t.images));
	}
}

function initUI() {
	pref.on("change", changes => {
		if (changes.previewMaxHeightUpperBound != null) {
			update();
		}
	});
	update();
	
	function update() {
		document.querySelector("#previewMaxHeight").max = pref.get("previewMaxHeightUpperBound");
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

function createImageCheckbox(url, frameId, tabId, noReferrer) {
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
	// don't drag
	if (IS_CHROME) {
		imgCover.draggable = false;
	} else {
		imgCover.ondragstart = () => false;
	}
	imgContainer.append(imgCover);
	
	label.append(input, imgContainer);
	
	return ctrl = {
		url,
		data: null,
		el: label,
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
		} catch (err) {
			return false;
		}
	}
	
	function load() {
    if (!validUrl(url)) {
      return Promise.reject(new Error(`Invalid URL: ${url}`));
    }
    return browser.runtime.sendMessage({
      method: "cacheImage",
      url,
      tabId,
      frameId,
      noReferrer,
      batchId: BATCH_ID
    })
			.then(data => {
				ctrl.data = data;
        imgCover.parentNode.insertBefore(createPlacehold(data.width, data.height), imgCover);
        imgCover.dataset.src = url;
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
			})
			.catch(err => {
				ctrl.error = true;
        label.classList.add("error");
        throw err;
			});
	}
}

function createPlacehold(width, height) {
	const placehold = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	placehold.classList.add("image-checkbox-image");
  placehold.setAttribute("height", height);
  placehold.setAttribute("viewBox", `0 0 ${width} ${height}`);
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
