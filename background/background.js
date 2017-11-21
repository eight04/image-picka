/* global pref */

browser.runtime.onMessage.addListener((message, sender) => {
	switch (message.method) {
		case "downloadImage":
			message.tabId = sender.tab.id;
			return downloadImage(message);
		case "batchDownload":
			return batchDownload(message);
		case "closeTab":
			if (!message.tabId) {
				message.tabId = sender.tab.id;
			}
			return closeTab(message);
		default:
			throw new Error("Unknown method");
	}
});

browser.browserAction.onClicked.addListener(tab => {
	pickImagesFromCurrent(tab);
});

initContextMenu();

function initContextMenu() {
	var menuIds,
		isInit = false,
		pending;
		
	// create contextmenu on browser action
	createContextMenu({
		title: "From Tabs to The Right",
		onclick(info, tab) {
			pickImagesToRight(tab);
		},
		contexts: ["browser_action"]
	});
	
	if (pref.get("contextMenu")) {
		pending = init().catch(console.error);
	} else {
		pending = Promise.resolve();
	}

	pref.onChange(change => {
		if (change.contextMenu == null) return;
		pending = pending.then(() => {
			if (isInit != change.contextMenu) {
				return isInit ? uninit() : init();
			}
		}).catch(console.error);
	});
	
	function init() {
		return Promise.all([
			createContextMenu({
				title: "From Current Tab",
				onclick(info, tab) {
					pickImagesFromCurrent(tab, info.frameId);
				},
				contexts: ["page"]
			}),
			createContextMenu({
				title: "From Tabs to The Right",
				onclick(info, tab) {
					pickImagesToRight(tab);
				},
				contexts: ["page"]
			})
		]).then(ids => {
			menuIds = ids;
			isInit = true;
		});
	}
	
	function uninit() {
		return Promise.all(menuIds.map(i => browser.contextMenus.remove(i)))
			.then(() => {
				isInit = false;
			});
	}
}

function createContextMenu(options) {
	return new Promise((resolve, reject) => {
		const menuId = browser.contextMenus.create(options, () => {
			if (browser.runtime.lastError) {
				reject(browser.runtime.lastError);
			} else {
				resolve(menuId);
			}
		});
	});
}

// inject content/pick-images.js to the page
function pickImages(tabId, frameId = 0) {
	return browser.tabs.executeScript(tabId, {
		file: "/content/pick-images.js",
		frameId: frameId,
		runAt: "document_start"
	}).then(([result]) => result);
}

function pickImagesFromCurrent(tab, frameId) {
	pickImages(tab.id, frameId)
		.then(result => openPicker(result, tab.id));
}

function pickImagesToRight(tab) {
	browser.windows.getCurrent({populate: true})
		.then(({tabs}) => {
			const tabsToRight = tabs.filter(
				t => t.index > tab.index && !t.discarded && !t.pinned
			);
			return Promise.all([
				pickImages(tab.id),
				...tabsToRight.map(t => pickImages(t.id).catch(err => {
					// can't inject to about:, moz-extension:, etc
					console.error(err, t);
					return {images: []};
				}))
			]);
		})
		.then(results => {
			const result = results.reduce((output, curr) => {
				output.images = output.images.concat(curr.images);
				return output;
			});
			result.images = [...new Set(result.images)];
			openPicker(result, tab.id);
		});
}

function openPicker(req, openerTabId) {
	if (!req.images.length) {
		browser.notifications.create({
			type: "basic",
			title: "Image Picka",
			message: "No images found"
		});
		return;
	}
	browser.tabs.create({
		url: "/picker/picker.html",
		openerTabId
	}).then(tab => {
		req.method = "init";
		tabReady(tab.id).then(() => {
			browser.tabs.sendMessage(tab.id, req);
		});
	});
}

function batchDownload({urls, env}) {
	var i = 1,
		filePattern = pref.get("filePatternBatch");
	for (var url of urls) {
		env.url = url;
		env.index = String(i++);
		expandEnv(env);
		var filename = buildFilename(filePattern, env);
		download(url, filename);
	}
}

function download(url, filename, saveAs = false) {
	if (url.startsWith("data:")) {
		return fetch(url)
			.then(r => r.blob())
			.then(URL.createObjectURL)
			.then(url => download(url, filename, saveAs));
	}
	return browser.downloads.download({url, filename, saveAs});
}

function closeTab({tabId, opener}) {
	if (opener) {
		browser.tabs.update(opener, {active: true});
	}
	browser.tabs.remove(tabId);
}

function tabReady(tabId) {
	return new Promise((resolve, reject) => {
		browser.tabs.onUpdated.addListener(onUpdate);
		browser.tabs.onRemoved.addListener(onRemove);
		
		function unbind() {
			browser.tabs.onUpdated.removeListener(onUpdate);
			browser.tabs.onRemoved.removeListener(onRemove);
		}
	
		function onUpdate(_tabId, changes) {
			if (_tabId != tabId) return;
			if (changes.status != "complete") return;		
			resolve();
			unbind();
		}
		
		function onRemove(_tabId) {
			if (_tabId != tabId) return;
			reject();
			unbind();
		}
	});
}

function downloadImage({url, env, tabId}) {
	if (!env) {
		return browser.tabs.sendMessage(tabId, {method: "getEnv"})
			.then(env => downloadImage({url, env}));
	}
	env.url = url;
	expandEnv(env);
	var filePattern = pref.get("filePattern"),
		filename = buildFilename(filePattern, env);
	download(url, filename, pref.get("saveAs"));
}

var escapeTable = {
	"/": "／",
	"\\": "＼",
	"?": "？",
	"|": "｜",
	"<": "＜",
	">": "＞",
	":": "：",
	"\"": "＂",
	"*": "＊"
};

function escapeFilename(name) {
	return name.replace(/[/\\?|<>:"*]/g, m => escapeTable[m]);
}

function escapeTrailingDots(path) {
	return path.replace(/\.+(\/|\\|$)/g, m => m.replace(/\./g, "．"));
}

function buildFilename(pattern, env) {
	return escapeTrailingDots(
		pattern.replace(
			/\${(\w+?)}/g,
			(m, key) => env[key] ? escapeFilename(env[key]) : m
		)
	);
}

function expandEnv(env) {
	// image url
	var url = new URL(env.url);
	env.hostname = url.hostname;
	
	// image filename
	var base = url.pathname.match(/[^/]+$/)[0],
		name, ext;
	try {
		[, name, ext] = base.match(/^(.+)(\.(?:jpg|png|gif|jpeg|svg))\b/i);
	} catch (err) {
		name = base;
		ext = pref.get("defaultExt");
	}
	env.base = nestDecodeURIComponent(base);
	env.name = nestDecodeURIComponent(name);
	env.ext = nestDecodeURIComponent(ext);
	
	// page url
	url = new URL(env.pageUrl);
	env.pageHostname = url.hostname;
}

function nestDecodeURIComponent(s) {
	while (/%[0-9a-f]{2}/i.test(s)) {
		try {
			s = decodeURIComponent(s);
		} catch (err) {
			break;
		}
	}
	return s;
}
