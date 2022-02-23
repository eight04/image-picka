import webextMenus from "webext-menus";
import {createLock} from "@eight04/read-write-lock";
import browser from "webextension-polyfill";

import {pref} from "./lib/pref.js";
import {createTab} from "./lib/tab.js";
import {fetchImage} from "./lib/fetch-image.js";
import {download} from "./lib/downloader.js";
import {imageCache} from "./lib/image-cache.js";
import {createCounter} from "./lib/counter.js";
import {IS_CHROME} from "./lib/env.js";
import {createDialog} from "./lib/popup-dialog.js";
import {compileStringTemplate} from "./lib/string-template.js";
import {expandEnv, expandDate} from "./lib/expand-env.mjs";

const MENU_ACTIONS = {
	PICK_FROM_CURRENT_TAB: {
		label: browser.i18n.getMessage("commandPickFromHighlightedTab"),
		handler: pickImagesFromHighlighted
	},
	PICK_FROM_RIGHT_TABS: {
		label: browser.i18n.getMessage("commandPickFromRightTabs"),
		handler: pickImagesToRight
	},
	PICK_FROM_RIGHT_TABS_EXCLUDE_CURRENT: {
		label: browser.i18n.getMessage("commandPickFromRightTabsExcludeCurrent"),
		handler: pickImagesToRightNoCurrent
	}
};
let INC = 0;
const batches = new Map;
const batchDownloadLock = createLock({maxActiveReader: 5});

browser.runtime.onMessage.addListener((message, sender) => {
	switch (message.method) {
		case "singleDownload":
			message.tabId = sender.tab.id;
      message.frameId = sender.frameId;
			singleDownload(message).catch(notifyDownloadError);
      return false;
		case "batchDownload":
			return batchDownload(message);
		case "closeTab":
			if (!message.tabId) {
				message.tabId = sender.tab.id;
			}
			return closeTab(message);
    case "cacheImage":
      return imageCache.add(message)
        .then(r => {
          const batch = batches.get(message.batchId);
          if (!batch.cachedImages) {
            batch.cachedImages = createCounter();
          }
          batch.cachedImages.add(message.url);
          return r;
        });
		case "getBatchData":
			return Promise.resolve(batches.get(message.batchId));
		case "notifyError":
			return notifyError(message.error);
    case "fetchImage":
      return fetchImage(message.url)
        .then(data => {
          if (IS_CHROME && data.blob) {
            data.blobUrl = URL.createObjectURL(data.blob);
            delete data.blob;
          }
          return data;
        });
    case "revokeURL":
      return URL.revokeObjectURL(message.url);
    case "openDialog":
      return createDialog(message);
    case "getCacheURL":
      return imageCache.get(message.url)
        .then(blob => URL.createObjectURL(blob));
	}
});

browser.browserAction.onClicked.addListener(tab => {
	MENU_ACTIONS[pref.get("browserAction")].handler(tab);
});

pref.ready().then(() => {
	updateBrowserAction();
	pref.on("change", change => {
		if (change.browserAction) {
			updateBrowserAction();
		}
	});
	
	function updateBrowserAction() {
		browser.browserAction.setTitle({
			title: MENU_ACTIONS[pref.get("browserAction")].label
		});
	}
});

const MENU_OPTIONS = [
	...[...Object.entries(MENU_ACTIONS)].map(([key, {label, handler}]) => ({
		title: label,
		onclick(info, tab) {
			handler(tab);
		},
		contexts: ["browser_action"],
		oncontext: () => pref.get("browserAction") !== key
	})),
	{
		type: "separator",
		contexts: ["browser_action"]
	},
	{
		type: "checkbox",
		contexts: ["browser_action"],
		title: browser.i18n.getMessage("optionEnabledLabel"),
		checked: () => pref.get("enabled"),
		onclick(info) {
			pref.set("enabled", info.checked);
		}
	},
	...[...Object.values(MENU_ACTIONS)].map(({label, handler}) => ({
		title: label,
		onclick(info, tab) {
			handler(tab, info.frameId);
		},
		contexts: ["page", "image"],
		oncontext: () => pref.get("contextMenu")
	}))
];

let menus;
try {
  menus = webextMenus(MENU_OPTIONS, IS_CHROME ? false : undefined);
} catch (err) {
  // menus are not available on Firefox Android
  console.error(err);
}
if (menus) {
  // setup dynamic menus
  pref.ready().then(() => {
    // update menus
    const WATCH_PROPS = ["contextMenu", "browserAction", "enabled"];
    menus.update();
    pref.on("change", change => {
      if (WATCH_PROPS.some(p => change[p] != null)) {
        menus.update();
      }
    });
  });
}

// setup dynamic icon
const icon = createDynamicIcon({
	file: "images/icon.svg",
	enabled: () => pref.get("customIcon"),
	onupdate: svg => svg.replace(/context-fill(?!-)/g, pref.get("customIconColor"))
});
pref.ready().then(() => {
	icon.update();
	pref.on("change", change => {
		if (change.customIcon != null || change.customIconColor != null) {
			icon.update();
		}
	});
});

browser.commands.onCommand.addListener(name => {
  browser.tabs.query({active: true, currentWindow: true})
    .then(tabs => MENU_ACTIONS[name].handler(tabs[0]))
    .catch(notifyError);
});

imageCache.clearAll();

function createDynamicIcon({file, enabled, onupdate}) {
	const SIZES = [16, 32, 64];
	let pendingSVG;
	let context;
	let cache;
	
	function getSVG() {
		if (!pendingSVG) {
			pendingSVG = fetch(file).then(r => r.text());
		}
		return pendingSVG;
	}
	
	function getContext() {
		if (!context) {
			const canvas = document.createElement("canvas");
			context = canvas.getContext("2d");
		}
		return context;
	}
	
	function update() {
		if (!enabled()) {
			cache = null;
			browser.browserAction.setIcon({path: file});
			return;
		}
		getSVG().then(svg => {
			svg = onupdate(svg);
			if (svg === cache) {
				return;
			}
			cache = svg;
			loadImage(svg).then(setIcon);
		});
	}
	
	function setIcon(img) {
		const ctx = getContext();
		const imageData = {};
		for (const size of SIZES) {
			ctx.clearRect(0, 0, size, size);
			ctx.drawImage(img, 0, 0, size, size);
			imageData[size] = ctx.getImageData(0, 0, size, size);
		}
		browser.browserAction.setIcon({imageData});
	}
	
	function loadImage(svg) {
		return new Promise((resolve, reject) => {
			const img = new Image;
			img.src = `data:image/svg+xml;charset=utf8;base64,${btoa(svg)}`;
			img.onload = () => {
				resolve(img);
			};
			img.onerror = () => {
				reject();
			};
		});
	}
	
	return {update};
}

function pickImages(tabId, frameId = 0) {
	const result = {
		tabId,
		frames: [],
		env: null
	};
	return Promise.all([
		getImages(),
		getEnv(),
		pref.get("collectFromFrames") && getImagesFromChildFrames()
	]).then(() => {
		// make sure the main frame is the first frame
		const index = result.frames.findIndex(f => f.frameId === frameId);
		if (index !== 0) {
			const mainFrame = result.frames[index];
			result.frames[index] = result.frames[0];
			result.frames[0] = mainFrame;
		}
		return result;
	});
		
	function getImages() {
		return browser.tabs.sendMessage(tabId, {method: "getImages"}, {frameId})
			.then(images => {
				result.frames.push({
					frameId,
					images
				});
			});
	}	
	
	function getEnv() {
		return browser.tabs.sendMessage(tabId, {method: "getEnv"}, {frameId})
			.then(env => {
				result.env = env;
			});
	}
	
	function getImagesFromChildFrames() {
		return getChildFrames()
			.then(frameIds =>
				Promise.all(frameIds.map(frameId =>
					browser.tabs.sendMessage(tabId, {method: "getImages"}, {frameId})
						.then(images => {
							result.frames.push({
								frameId,
								images
							});
						})
						// https://github.com/eight04/image-picka/issues/100
						.catch(console.warn)
				))
			);
	}
	
	function getChildFrames() {
		return browser.webNavigation.getAllFrames({tabId})
			.then(frames => {
				// build relationship
				const tree = new Map;
				for (const frame of frames) {
					if (frame.errorOccurred) {
						continue;
					}
					if (frame.parentFrameId >= 0) {
						if (!tree.has(frame.parentFrameId)) {
							tree.set(frame.parentFrameId, []);
						}
						tree.get(frame.parentFrameId).push(frame.frameId);
					}
				}
				// collect child frames
				const collected = [];
				(function collect(id) {
					collected.push(id);
					const children = tree.get(id);
					if (children) {
						children.forEach(collect);
					}
				})(frameId);
				return collected.slice(1);
			});
	}
}

function pickEnv(tabId, frameId = 0) {
	return browser.tabs.sendMessage(tabId, {method: "getEnv"}, {frameId})
		.then(env => ({tabId, env}));
}

function tryRequestPermission() {
	if (pref.get("collectFromFrames")) {
		return browser.permissions.request({permissions: ["webNavigation"]})
			.then(success => {
				if (!success) {
					throw new Error("webNavigation permission is required for iframe information");
				}
			});
	}
	return Promise.resolve();
}

async function pickImagesFromHighlighted(tab) {
  try {
    await tryRequestPermission();
    const tabs = await browser.tabs.query({currentWindow: true, highlighted: true});
    
    // FIXME: how should we handle errors in multiple tabs?
    const results = await Promise.all(tabs.map(tab => pickImages(tab.id)));
    
    // FIXME: does it make sense to move the current tab to the first result?
    const i = results.findIndex(r => r.tabId === tab.id);
    results.unshift(results[i]);
    results.splice(i + 1, 1);
    await openPicker({
      env: results[0].env,
      tabs: results
    }, tab);
    
  } catch (err) {
    notifyError(err);
  }
}

function pickImagesToRight(tab, excludeCurrent = false) {
	tryRequestPermission()
		.then(() => browser.windows.get(tab.windowId, {populate: true}))
		.then(({tabs}) => {
			const tabsToRight = tabs.filter(
				t => t.index > tab.index && !t.discarded && !t.pinned && !t.hidden
			);
			return Promise.all([
				excludeCurrent ? pickEnv(tab.id) : pickImages(tab.id),
				// can't pickImages from about:, moz-extension:, etc
				...tabsToRight.map(t => pickImages(t.id).catch(console.warn))
			]);
		})
		.then(results => {
			results = results.filter(Boolean);
			return openPicker({
				env: results[0].env,
				tabs: excludeCurrent ? results.slice(1) : results
			}, tab);
		})
		.catch(notifyError);
}

function pickImagesToRightNoCurrent(tab) {
	return pickImagesToRight(tab, true);
}

function notifyError(err) {
	browser.notifications.create({
		type: "basic",
		title: "Image Picka",
		message: err.message || String(err),
		iconUrl: "images/icon.svg"
	});
}

function notifyDownloadError(err) {
	if (err.message === "Download canceled by the user") {
		return;
	}
	if (err.args) {
		notifyError(`${String(err.message || err)}\nurl: ${err.args[0]}\nfilename: ${err.args[1]}`);
	} else {
		notifyError(String(err.message || err));
	}
}

function openPicker(req, openerTab) {
	const hasImages = () => {
		for (const tab of req.tabs) {
			for (const frame of tab.frames) {
				if (frame.images.length) {
					return true;
				}
			}
		}
		return false;
	};
	if (!hasImages()) {
		throw new Error("No images found");
	}
	
	// remove duplicated images in the same tab (in different frames)
	for (const tab of req.tabs) {
		const collected = new Set;
		for (const frame of tab.frames) {
			const newImages = [];
			for (const image of frame.images) {
				if (collected.has(image.url)) {
					continue;
				}
				collected.add(image.url);
				newImages.push(image);
			}
			frame.images = newImages;
		}
	}
	
	const batchId = INC++;
	batches.set(batchId, req);
  
  const createTabOptions = {
    url: `/picker.html?batchId=${batchId}`,
    openerTabId: openerTab.id
  };

  if (IS_CHROME) {
    // Chrome always places tab at the end
    // https://github.com/eight04/image-picka/issues/289
    createTabOptions.index = openerTab.index + 1;
  }
	
	createTab(createTabOptions)
		.then(() => {
			batches.delete(batchId);
      if (req.cachedImages) {
        return imageCache.deleteMany(req.cachedImages.toList());
      }
		})
		.catch(console.error);
}

async function batchDownload({tabs, env, batchId}) {
  const {cachedImages} = batches.get(batchId);
  expandDate(env);
	const renderFilename = compileStringTemplate(pref.get("filePatternBatch"));
	let i = 0;
	const pending = [];
	for (const tab of tabs) {
		if (pref.get("isolateTabs")) {
			Object.assign(env, tab.env);
			i = 0;
		}
		for (const {url, filename, alt} of tab.images) {
      cachedImages.delete(url);
			expandEnv(env, {
        url,
        index: i + 1,
        base: filename,
        alt
      });
      const fullFileName = renderFilename(env);
      const t = batchDownloadLock.read(async () => {
        const blob = await imageCache.get(url);
        let err;
        try {
          await download({
            url,
            blob,
            filename: fullFileName,
            saveAs: false,
            conflictAction: pref.get("filenameConflictAction")
          }, true);
        } catch (_err) {
          err = _err;
        }
        // we have to delete the cache after download complete
        // https://bugzilla.mozilla.org/show_bug.cgi?id=1541864
        await imageCache.delete(url);
        if (err) {
          throw err;
        }
      });
			pending.push(t);
			i++;
		}
	}
	Promise.all(pending).catch(notifyDownloadError);
  if (pref.get("closeTabsAfterSave")) {
    tabs.forEach(t => browser.tabs.remove(t.tabId));
  }
}

function closeTab({tabId, opener}) {
	if (opener) {
		browser.tabs.update(opener, {active: true});
	}
	browser.tabs.remove(tabId);
}

async function singleDownload({url, env, tabId, frameId, referrer, alt}) {
  let data;
  [env, data] = await Promise.all([
    env || browser.tabs.sendMessage(tabId, {method: "getEnv"}),
    pref.get("useCache") && imageCache.fetchImage(url, tabId, frameId, referrer)
      .catch(err => {
        notifyError(err);
        throw err;
      })
  ]);
  expandEnv(env, {
    url,
    base: data && data.filename,
    alt
  });
  const filePattern = pref.get("filePatternStandaloneEnabled") && env.pageContentType.startsWith("image/") ?
    pref.get("filePatternStandalone") : pref.get("filePattern");
  const filename = compileStringTemplate(filePattern)(env);
  await download({
    url,
    blob: data && data.blob,
    filename,
    saveAs: pref.get("saveAs"),
    conflictAction: pref.get("filenameConflictAction"),
    referrer
  }, true);
}

