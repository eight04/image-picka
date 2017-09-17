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
	pickImages(tab.id);
});

initContextMenu();

function initContextMenu() {
	var menuId,
		isInit = false,
		pending;
	
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
		return new Promise((resolve, reject) => {
			menuId = browser.contextMenus.create({
				title: "Pick Images",
				onclick(info, tab) {
					pickImages(tab.id, info.frameId);
				}
			}, () => {
				if (browser.runtime.lastError) {
					reject(browser.runtime.lastError);
				} else {
					isInit = true;
					resolve();
				}
			});
		});
	}
	
	function uninit() {
		return browser.contextMenus.remove(menuId)
			.then(() => {
				isInit = false;
			});
	}
}

// inject content/pick-images.js to the page
function pickImages(tabId, frameId = 0) {
	browser.tabs.executeScript(tabId, {
		file: "/content/pick-images.js",
		frameId: frameId,
		runAt: "document_start"
	}).then(([result]) => {
		if (result) {
			result.opener = tabId;
			openPicker(result);
		}
	});
}

function openPicker(req) {
	browser.tabs.create({
		url: "/picker/picker.html",
		// FIXME: still can't use opener yet
		// openerTabId: tab.id
	}).then(tab => {
		req.method = "init";
		// FIXME: tab.status is always complete in this callback?
		// if (tab.status == "complete") {
			// browser.tabs.sendMessage(tab.id, result);
			// return;
		// }
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

function download(url, filename) {
	if (url.startsWith("data:")) {
		return fetch(url).then(r => r.blob()).then(b => {
			browser.downloads({
				url: URL.createObjectURL(b),
				filename
			});
		});
	}
	return browser.downloads.download({url, filename});
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
	download(url, filename);
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
