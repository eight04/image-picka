/* global pref fetchBlob webextMenus */

const MENU_ACTIONS = {
	PICK_FROM_CURRENT_TAB: {
		label: "Pick Images from Current Tab",
		handler: pickImagesFromCurrent
	},
	PICK_FROM_RIGHT_TABS: {
		label: "Pick Images from Tabs to the Right",
		handler: pickImagesToRight
	}
};

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
	}
});

browser.browserAction.onClicked.addListener(tab => {
	MENU_ACTIONS[pref.get("browserAction")].handler(tab);
});

pref.ready().then(() => {
	updateBrowserAction();
	pref.onChange(change => {
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

const download = function() {
	const objUrls = new Map;
	
	browser.downloads.onChanged.addListener(onChanged);
	browser.downloads.onErased.addListener(onErased);
	
	function onChanged(delta) {
		if (!objUrls.has(delta.id)) return;
		if (delta.canResume && !delta.canResume.current ||
			delta.state && delta.state.current === "complete"
		) {
			cleanUp(delta.id);
		}
	}
	
	function onErased(id) {
		if (!objUrls.has(id)) return;
		cleanUp(id);
	}
	
	function cleanUp(id) {
		const objUrl = objUrls.get(id);
		URL.revokeObjectURL(objUrl);
		objUrls.delete(id);
	}
	
	function download(url, filename, saveAs = false) {
		return tryFetchCache().then(blob => {
			if (blob) {
				const objUrl = URL.createObjectURL(blob);
				return browser.downloads.download({url: objUrl, filename, saveAs})
					.catch(err => {
						URL.revokeObjectURL(objUrl);
						throw err;
					})
					.then(id => {
						objUrls.set(id, objUrl);
						return id;
					});
			}
			return browser.downloads.download({url, filename, saveAs});
		});
		
		function tryFetchCache() {
			if (url.startsWith("data:") || pref.get("useCache")) {
				return fetchBlob(url);
			}
			return Promise.resolve();
		}
	}
	
	return download;
}();

const urlMap = function () {
	let map = [];
	
	pref.ready().then(() => {
		update();
		pref.onChange(change => {
			if (change.urlMap != null) {
				update();
			}
		});
	});
	
	function update() {
		const lines = pref.get("urlMap").split(/\r?\n/g).filter(line =>
			line && /\S/.test(line) && !line.startsWith("#"));
		const newMap = [];
		for (let i = 0; i < lines.length; i += 2) {
			newMap.push({
				search: new RegExp(lines[i], "ig"),
				repl: lines[i + 1]
			});
		}
		map = newMap;
	}
	
	function transform(url) {
		for (const t of map) {
			url = url.replace(t.search, t.repl);
		}
		return url;
	}
	
	return {transform};
}();

const menus = webextMenus([
	...[...Object.entries(MENU_ACTIONS)].map(([key, {label, handler}]) => ({
		title: label,
		onclick(info, tab) {
			handler(tab);
		},
		contexts: ["browser_action"],
		oncontext: () => pref.get("browserAction") !== key
	})),
	...[...Object.values(MENU_ACTIONS)].map(({label, handler}) => ({
		title: label,
		onclick(info, tab) {
			handler(tab, info.frameId);
		},
		contexts: ["page", "image"],
		oncontext: () => pref.get("contextMenu")
	}))
]);

// setup dynamic menus
pref.ready().then(() => {
	menus.update();
	pref.onChange(change => {
		if (change.contextMenu != null || change.browserAction != null) {
			menus.update();
		}
	});
});

// inject content/pick-images.js to the page
function pickImages(tabId, frameId = 0) {
	return browser.tabs.executeScript(tabId, {
		file: "/content/pick-images.js",
		frameId: frameId,
		runAt: "document_start"
	}).then(([result]) => {
		result.tabId = tabId;
		return result;
	});
}

function pickImagesFromCurrent(tab, frameId) {
	pickImages(tab.id, frameId)
		.then(result => {
			result.tabIds = [result.tabId];
			return openPicker(result, tab.id);
		})
		.catch(notifyError);
}

function pickImagesToRight(tab) {
	browser.windows.getCurrent({populate: true})
		.then(({tabs}) => {
			const tabsToRight = tabs.filter(
				t => t.index > tab.index && !t.discarded && !t.pinned
			);
			return Promise.all([
				pickImages(tab.id),
				// can't pickImages from about:, moz-extension:, etc
				...tabsToRight.map(t => pickImages(t.id).catch(console.error))
			]);
		})
		.then(results => {
			results[0].tabIds = [results[0].tabId];
			const result = results.reduce((output, curr) => {
				if (curr) {
					output.tabIds.push(curr.tabId);
					output.images = output.images.concat(curr.images);
				}
				return output;
			});
			return openPicker(result, tab.id);
		})
		.catch(notifyError);
}

function notifyError(message) {
	browser.notifications.create({
		type: "basic",
		title: "Image Picka",
		message: String(message)
	});
}

function openPicker(req, openerTabId) {
	if (!req.images.length) {
		throw new Error("No images found");
	}
	req.method = "init";
	req.images = [...new Set(req.images.map(urlMap.transform))];
	const options = {
		url: "/picker/picker.html",
		openerTabId
	};
	return browser.runtime.getBrowserInfo()
		.then(({version}) => {
			if (+version.split(".")[0] < 57) {
				delete options.openerTabId;
				req.opener = openerTabId;
			}
			return loadTab(options);
		})
		.then(tabId => browser.tabs.sendMessage(tabId, req));
}

function batchDownload({urls, env, tabIds}) {
	var i = 1,
		filePattern = pref.get("filePatternBatch");
	for (var url of urls) {
		env.url = url;
		env.index = String(i++);
		expandEnv(env);
		var filename = buildFilename(filePattern, env);
		download(url, filename);
	}
	if (pref.get("closeTabsAfterSave")) {
		tabIds.forEach(i => browser.tabs.remove(i));
	}
}

function closeTab({tabId, opener}) {
	if (opener) {
		browser.tabs.update(opener, {active: true});
	}
	browser.tabs.remove(tabId);
}

function loadTab(options) {
	const cond = condition();
	const pings = new Set;
	
	browser.runtime.onMessage.addListener(onMessage);
	return browser.tabs.create(options)
		.then(tab => cond.once(() => pings.has(tab.id)).then(() => {
			browser.runtime.onMessage.removeListener(onMessage);
			return tab.id;
		}));
		
	function onMessage(message, sender) {
		if (message.method === "ping") {
			pings.add(sender.tab.id);
			cond.check();
		}
	}
}

function condition() {
	const pendings = new Set;
	
	function check() {
		for (const cond of pendings) {
			if (cond.success()) {
				cond.resolve();
			} else if (cond.error && cond.error()) {
				cond.reject();
			} else {
				continue;
			}
			pendings.delete(cond);
		}
	}
	
	function once(success, error) {
		return new Promise((resolve, reject) => {
			if (success()) {
				resolve();
			} else if (error && error()) {
				reject();
			} else {
				pendings.add({success, error, resolve, reject});
			}
		});
	}
	
	return {check, once};
}

function downloadImage({url, env, tabId}) {
	url = urlMap.transform(url);
	if (!env) {
		return browser.tabs.sendMessage(tabId, {method: "getEnv"})
			.then(env => downloadImage({url, env}));
	}
	env.url = url;
	expandEnv(env);
	var filePattern = pref.get("filePattern"),
		filename = buildFilename(filePattern, env);
	download(url, filename, pref.get("saveAs"))
		.catch(err => {
			notifyError([String(err), `url: ${url}`, `filename: ${filename}`].join("\n"));
		});
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
	return name.replace(/[/\\?|<>:"*]/g, m => escapeTable[m]).slice(0, pref.get("filenameMaxLength"));
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
	var base, name, ext;
	try {
		base = url.href.match(/([^/]+)\/?$/)[1];
	} catch (err) {
		base = pref.get("defaultName");
	}
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
