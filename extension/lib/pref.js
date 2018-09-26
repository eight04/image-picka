/* exported pref */

var pref = function(){
	var DEFAULT = {
		browserAction: "PICK_FROM_CURRENT_TAB",
		blacklist: "",
		closeTabsAfterSave: false,
		contextMenu: true,
		collectFromFrames: false,
		customIcon: false,
		customIconColor: "#000000",
		enabled: true,
		dblClick: false,
		dblClickCtrl: false,
		dblClickShift: false,
		dblClickAlt: true,
		displayImageSizeUnderThumbnail: false,
		dragndrop: true,
		downloadButton: false,
		downloadButtonSize: 64,
		downloadButtonDelay: 0,
		downloadButtonDelayHide: 500,
		downloadButtonMinWidth: 64,
		downloadButtonMinHeight: 64,
		downloadButtonPositionHorizontal: "LEFT_INSIDE",
		downloadButtonPositionVertical: "TOP_OUTSIDE",
		escapeWithUnicode: true,
		isolateTabs: false,
		filenameConflictAction: "uniquify",
		saveAs: false,
		singleClick: false,
		singleClickCtrl: false,
		singleClickShift: false,
		singleClickAlt: true,
		srcAlternative: "data-src, data-gifsrc, gifsrc",
		previewMaxHeight: 200,
		urlMap: "",
		useCache: false,
		useExpression: false,
		variableMaxLength: 128,
		filePattern: "Image Picka/${pageTitle}/${name}${ext}",
		filePatternBatch: "Image Picka/${pageTitle}/${index} - ${name}${ext}",
		defaultExt: ".jpg",
		defaultName: "unnamed-image",
		minFileSize: 0,
		minWidth: 10,
		minHeight: 10,
		matchType: "include",
		matchUrl: ""
	};
	
	var cache = {},
		onChanges = [],
		initializing;
		
	initializing = browser.storage.local.get()
		.then(update)
		.then(() => initializing = null);
		
	browser.storage.onChanged.addListener((changes, areaName) => {
		if (areaName != "local") return;
		
		var result = {};
		for (var [key, {newValue}] of Object.entries(changes)) {
			result[key] = newValue;
		}
		
		update(result);
	});
	
	function update(changes) {
		Object.assign(cache, changes);
		for (var key of Object.keys(changes)) {
			if (changes[key] == null) {
				changes[key] = DEFAULT[key];
			}
		}
		for (var onChange of onChanges) {
			onChange(changes);
		}
	}
	
	return {
		ready() {
			if (initializing) return initializing;
			return Promise.resolve();
		},
		get(key){
			if (typeof key == "string") {
				return cache[key] != null ? cache[key] : DEFAULT[key];
			}
			return Object.assign({}, DEFAULT, cache);
		},
		set(key, value) {
			if (typeof key == "string") {
				key = {
					[key]: value
				};
			}
			return browser.storage.local.set(key);
		},
		reset(keys) {
			if (keys == null) {
				keys = Object.keys(DEFAULT);
			}
			browser.storage.local.remove(keys);
		},
		onChange(callback) {
			onChanges.push(callback);
		}
	};
}();

// bindElement util
pref.bindElement = (form, els, realtime) => {
	var inputs = new Map([...els].map(e => [e.id, e]));
	
	pref.ready().then(() => {
		update(pref.get());
		pref.onChange(update);
		form.addEventListener("change", onChange);
		if (realtime) {
			form.addEventListener("input", onChange);
		}
		[...inputs.values()].filter(e => e.hasAttribute("history"))
			.forEach(setupHistory);
		[...inputs.values()].filter(e => e.hasAttribute("css-variable"))
			.forEach(i => pref.bindCSSVariable(i.id));
	});
	
	function setupHistory(input) {
		let initiated = false;
		let history;
		let list;
		let activeIndex;
		
		input.addEventListener("focus", init);
		input.addEventListener("keydown", e => {
			if (e.key === "ArrowDown") {
				e.preventDefault();
				init();
			}
		});
		input.addEventListener("change", () => {
			addHistory(input.value);
		});
		
		function getHistory() {
			try {
				return JSON.parse(pref.get(input.id + "History"));
			} catch (err) {
				return [];
			}
		}
		
		function addHistory(value) {
			if (!value) return;
			const data = [
				value,
				...getHistory().filter(t => t != value)
			].slice(0, +input.getAttribute("history"));
			pref.set(input.id + "History", JSON.stringify(data));
		}
		
		function init() {
			if (initiated) return;
			
			history = getHistory();
			if (!history.length) return;
			
			list = document.createElement("div");
			list.dataset.label = browser.i18n.getMessage("formHistoryRecentlyUsedLabel");
			list.className = "history-list";
			list.tabIndex = 0;
			list.append(...history.map((t, i) => {
				const el = document.createElement("div");
				el.className = "history-item";
				el.textContent = t;
				el.addEventListener("click", () => {
					setInputValue(t);
				});
				el.addEventListener("mouseenter", () => {
					setActiveIndex(i);
				});
				el.title = t;
				return el;
			}));
			
			input.parentNode.append(list);
			
			input.addEventListener("blur", onBlur);
			input.addEventListener("keydown", onKeyDown);
			list.addEventListener("blur", onBlur);
			
			initiated = true;
		}
		
		function setActiveIndex(i) {
			if (activeIndex != null) {
				list.childNodes[activeIndex].classList.remove("active");
			}
			activeIndex = i;
			list.childNodes[i].classList.add("active");
		}
		
		function onBlur(e) {
			// can't access activeElement while handling event
			// https://developer.mozilla.org/en-US/docs/Web/Events/blur
			setTimeout(() => {
				if (document.activeElement !== input &&
					document.activeElement !== list ||
					document.activeElement === e.target // the window lost focus
				) {
					uninit();
				}
			});
		}
		
		function onKeyDown(e) {
			if (e.key === "ArrowDown") {
				e.preventDefault();
				if (activeIndex == null) {
					setActiveIndex(0);
				} else {
					setActiveIndex(Math.min(activeIndex + 1, history.length - 1));
				}
			} else if (e.key === "ArrowUp") {
				e.preventDefault();
				setActiveIndex(Math.max(activeIndex - 1, 0));
			} else if (e.key === "Enter") {
				if (activeIndex != null) {
					setInputValue(history[activeIndex]);
				}
			} else if (e.key === "Escape") {
				uninit();
			}
		}
		
		function setInputValue(value) {
			pref.set(input.id, value);
			addHistory(value);
			uninit();
		}
		
		function uninit() {
			input.removeEventListener("blur", onBlur);
			input.removeEventListener("keydown", onKeyDown);
			list.removeEventListener("blur", onBlur);
			list.remove();
			initiated = false;
			list = history = activeIndex = null;
		}
	}
	
	function onChange(e) {
		var input = e.target,
			id = input.id,
			value;
		if (!inputs.has(id)) return;
		if (input.type == "checkbox") {
			value = input.checked;
		} else if (input.type == "number") {
			value = +input.value;
		} else {
			value = input.value;
		}
		pref.set(id, value);
	}
	
	function update(prefs) {
		for (var [id, input] of inputs.entries()) {
			if (prefs[id] != null) {
				if (input.type == "checkbox") {
					input.checked = prefs[id];
				} else {
					input.value = prefs[id];
				}
				input.dispatchEvent(new CustomEvent("prefUpdate"));
			}
		}
	}
};

pref.bindCSSVariable = id => {
	update();
	pref.onChange(change => {
		if (change[id] != null) update();
	});
	function update() {
		document.documentElement.style.setProperty(`--${id}`, pref.get(id));
	}
};
