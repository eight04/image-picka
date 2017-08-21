/* global pref */

browser.runtime.onMessage.addListener((message, sender) => {
	switch (message.method) {
		case "downloadImage":
			return downloadImage(message);
		case "batchDownload":
			return batchDownload(message);
		case "closeTab":
			return closeTab(sender.tab.id);
		default:
			throw new Error("Unknown method");
	}
});

browser.contextMenus.create({
	title: "Image Picka",
	onclick(info, tab) {
		browser.tabs.executeScript(tab.id, {
			file: "/content/pick-images.js",
			frameId: info.frameId,
			runAt: "document_start"
		}).then(([result]) => {
			if (!result) return;
		
			browser.tabs.create({
				url: "/picker/picker.html",
				// openerTabId: tab.id
			}).then(tab => {
				result.method = "init";
				// FIXME: tab.status is always complete in this callback?
				// if (tab.status == "complete") {
					// browser.tabs.sendMessage(tab.id, result);
					// return;
				// }
				tabReady(tab.id).then(() => {
					browser.tabs.sendMessage(tab.id, result);
				});
			});
		});
	}
});

function batchDownload() {}

function closeTab(tabId) {
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

function downloadImage({url, env}) {
	expandEnv(env);
	var filePattern = pref.get("filePattern"),
		filename = buildFilename(filePattern, env);
		
	return browser.downloads.download({url, filename});
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

function buildFilename(pattern, env) {
	for (var [key, value] of Object.entries(env)) {
		env[key] = escapeFilename(value);
	}
	return pattern.replace(/\${(\w+?)}/g, (m, key) => env[key] ? env[key] : m);
}

function expandEnv(env) {
	// image url
	var url = new URL(env.url);
	env.hostname = url.hostname;
	
	// image filename
	var base = url.pathname.match(/[^/]+$/)[0],
		name, ext;
	try {
		[, name, ext] = base.match(/^(.+)(\.(?:jpg|png|gif|jpeg))\b/i);
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
