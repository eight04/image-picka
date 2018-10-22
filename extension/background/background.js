/* global pref fetchBlob webextMenus expressionEval createTabAndWait */

const MENU_ACTIONS = {
	PICK_FROM_CURRENT_TAB: {
		label: browser.i18n.getMessage("commandPickFromCurrentTab"),
		handler: pickImagesFromCurrent
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
		case "getBatchData":
			return Promise.resolve(batches.get(message.batchId));
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
		if (delta.error) {
			notifyError(delta.error.current);
		}
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
		const options = {
			url, filename, saveAs, conflictAction: pref.get("filenameConflictAction")
		};
		return tryFetchCache().then(blob => {
			if (!blob) {
				return browser.downloads.download(options);
			}
			const objUrl = URL.createObjectURL(blob);
			options.url = objUrl;
			return browser.downloads.download(options)
				.catch(err => {
					URL.revokeObjectURL(objUrl);
					throw err;
				})
				.then(id => {
					objUrls.set(id, objUrl);
					return id;
				});
		});
		
		function tryFetchCache() {
			if (url.startsWith("data:") || pref.get("useCache")) {
				return fetchBlob(url);
			}
			return Promise.resolve();
		}
	}
	
	function wrapError(fn) {
		return (...args) => {
			return fn(...args).catch(err => {
				err.args = args;
				throw err;
			});
		};
	}
	
	return wrapError(download);
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
]);

// setup dynamic menus
pref.ready().then(() => {
	// update menus
	const WATCH_PROPS = ["contextMenu", "browserAction", "enabled"];
	menus.update();
	pref.onChange(change => {
		if (WATCH_PROPS.some(p => change[p] != null)) {
			menus.update();
		}
	});
});

// setup dynamic icon
const icon = createDynamicIcon({
	file: "/icon.svg",
	enabled: () => pref.get("customIcon"),
	onupdate: svg => svg.replace(/context-fill(?!-)/g, pref.get("customIconColor"))
});
pref.ready().then(() => {
	icon.update();
	pref.onChange(change => {
		if (change.customIcon != null || change.customIconColor != null) {
			icon.update();
		}
	});
});

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
		mainFrameId: frameId,
		frames: [],
		env: null
	};
	return Promise.all([
		getImages(),
		getEnv(),
		pref.get("collectFromFrames") && getImagesFromChildFrames()
	]).then(() => result);
		
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
		return browser.permissions.request({permissions: ["webNavigation"]})
			.then(success => {
				if (!success) {
					throw new Error("webNavigation permission is required for iframe information");
				}
			})
			.then(() => browser.webNavigation.getAllFrames({tabId}))
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

function pickImagesFromCurrent(tab, frameId) {
	pickImages(tab.id, frameId)
		.then(result => {
			return openPicker({tabs: [result]}, tab.id);
		})
		.catch(notifyError);
}

function pickImagesToRight(tab, excludeCurrent = false) {
	browser.windows.get(tab.windowId, {populate: true})
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
			return openPicker({
				tabs: results
			}, tab.id);
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
		iconUrl: "/icon.svg"
	});
}

function notifyDownloadError(err) {
	if (err.message === "Download canceled by the user") {
		return;
	}
	if (err.args) {
		notifyError(`${String(err.message || err)}\nurl: ${err.args[0]}\nfilename: ${err.args[1]}`);
	} else {
		notifyError(String(err));
	}
}

function openPicker(req, openerTabId) {
	const hasImages = () => {
		for (const tab of req.tabs) {
			for (const frame of tab.frames) {
				if (frame.images && frame.images.length) {
					return true;
				}
			}
		}
		return false;
	};
	if (!hasImages()) {
		throw new Error("No images found");
	}
	
	// remap URLs, remove tab duplicated
	for (const tab of req.tabs) {
		if (tab.images) {
			tab.images = [...new Set(tab.images.map(urlMap.transform))];
		}
	}
	
	const batchId = INC++;
	batches.set(batchId, req);
	
	createTabAndWait({
		url: `/picker/picker.html?batchId=${batchId}`,
		openerTabId
	})
		.then(() => {
			batches.delete(batchId);
		})
		.catch(console.error);
}

function batchDownload({tabs, isolateTabs}) {
	const date = new Date;
	const env = Object.assign({}, tabs[0].env, {
		date,
		dateString: createDateString(date)
	});
	const renderFilename = compileStringTemplate(pref.get("filePatternBatch"));
	let i = 0;
	const pending = [];
	for (const tab of tabs) {
		if (isolateTabs) {
			Object.assign(env, tab.env);
			i = 0;
		}
		for (const url of tab.images) {
			env.url = url;
			env.index = i + 1;
			expandEnv(env);
			pending.push(download(url, renderFilename(env)));
			i++;
		}
	}
	Promise.all(pending).then(() => {
		if (pref.get("closeTabsAfterSave")) {
			tabs.filter(t => !t.ignoreImages).forEach(t => browser.tabs.remove(t.tabId));
		}
	}, notifyDownloadError);
}

function createDateString(date) {
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())} ${pad(date.getMinutes())} ${pad(date.getSeconds())}`;
	function pad(n) {
		return String(n).padStart(2, "0");
	}
}

function closeTab({tabId, opener}) {
	if (opener) {
		browser.tabs.update(opener, {active: true});
	}
	browser.tabs.remove(tabId);
}

function downloadImage({url, env, tabId}) {
	url = urlMap.transform(url);
	if (!env) {
		return browser.tabs.sendMessage(tabId, {method: "getEnv"})
			.then(env => downloadImage({url, env}));
	}
	env.date = new Date;
	env.dateString = createDateString(env.date);
	env.url = url;
	expandEnv(env);
	var filePattern = pref.get("filePattern"),
		filename = compileStringTemplate(filePattern)(env);
	download(url, filename, pref.get("saveAs"))
		.catch(notifyDownloadError);
}

const escapeVariable = (() => {
	const table = {
		"/": "／",
		"\\": "＼",
		"?": "？",
		"|": "｜",
		"<": "＜",
		">": "＞",
		":": "：",
		"\"": "＂",
		"*": "＊",
		"~": "～"
	};
	const rx = new RegExp(`[${Object.keys(table).join("")}]+`, "g");
	const escape = m => {
		if (!pref.get("escapeWithUnicode")) {
			return "_";
		}
		return Array.from(m).map(c => table[c]).join("");
	};
	
	return name => {
		name = name.trim().replace(rx, escape).replace(/\s+/g, " ").replace(/\u200b/g, "");
		const maxLength = pref.get("variableMaxLength");
		if (name.length > maxLength) {
			name = name.slice(0, maxLength).trim();
		}
		return name;
	};
})();

function escapePath(path) {
	// trailing dots
	path = path.replace(/\.+(\/|\\|$)/g, m => m.replace(/\./g, "．"));
	// leading dots
	// https://github.com/eight04/image-picka/issues/90
	path = path.replace(/(^|\\|\/)\.+/g, m => m.replace(/\./g, "．"));
	// spaces
	// https://github.com/eight04/image-picka/issues/106
	path = path.replace(/\s*[\\/]\s*/g, "/").trim();
	return path;
}

function propGetter(prop) {
	return ctx => ctx[prop];
}

function exprGetter(expr) {
	const render = expressionEval.compile(expr);
	const defaultCtx = {String, Number, Math};
	return ctx => render(Object.assign({}, defaultCtx, ctx));
}

function compileStringTemplate(template) {
	const USE_EXPRESSION = pref.get("useExpression");
	const re = /\${(.+?)}/g;
	let match, lastIndex = 0;
	const output = [];
	while ((match = re.exec(template))) {
		if (match.index !== lastIndex) {
			output.push(template.slice(lastIndex, match.index));
		}
		if (USE_EXPRESSION) {
			output.push(exprGetter(match[1]));
		} else {
			output.push(propGetter(match[1]));
		}
		lastIndex = re.lastIndex;
	}
	if (lastIndex !== template.length) {
		const text = template.slice(lastIndex);
		output.push(text);
	}
	return context => escapePath(
		output.map(text => {
			if (typeof text === "string") {
				return text;
			}
			return escapeVariable(String(text(context)));
		}).join("")
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
