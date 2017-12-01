/* exported pref */

var pref = function(){
	var DEFAULT = {
		closeTabsAfterSave: false,
		contextMenu: true,
		dragndrop: true,
		downloadButton: false,
		downloadButtonDelay: 0,
		downloadButtonDelayHide: 500,
		downloadButtonMinWidth: 64,
		downloadButtonMinHeight: 64,
		saveAs: false,
		singleClick: false,
		singleClickCtrl: false,
		singleClickShift: false,
		singleClickAlt: true,
		urlMap: "",
		filePattern: "Image Picka/${pageTitle}/${name}${ext}",
		filePatternBatch: "Image Picka/${pageTitle}/${index} - ${name}${ext}",
		defaultExt: ".jpg",
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
		set(key, value, historyCount = 0) {
			let map;
			if (typeof key == "string") {
				map = {
					[key]: value
				};
			} else {
				map = key;
			}
			if (historyCount) {
				let history;
				try {
					history = JSON.parse(cache[key + "History"]);
				} catch (err) {
					history = [];
				}
				history = history.filter(t => t != value);
				if (value) {
					history.unshift(value);
				}
				history = history.slice(0, historyCount);
				map[key + "History"] = JSON.stringify(history);
			}
			return browser.storage.local.set(map);
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
	});
	
	function setupHistory(input) {
		input.addEventListener("focusin", onFocusIn);
		input.addEventListener("focusout", onFocusOut);
	}
	
	function onFocusIn(e) {
		const input = e.target;
		const list = document.createElement("div");
		const count = +input.getAttribute("history");
		list.className = "history-list";
		let history;
		try {
			history = JSON.parse(pref.get(input.id + "History"));
		} catch (err) {
			history = [];
		}
		list.append(...history.map(t => {
			const el = document.createElement("div");
			el.className = "history-item";
			el.textContent = t;
			el.addEventListener("click", () => {
				pref.set(input.id, t, count);
				list.remove();
			});
			el.title = t;
			return el;
		}));
		input.parentNode.append(list);
		list.addEventListener("mousedown", () => {
			list.classList.add("pending-click");
			document.addEventListener("click", function onClick() {
				list.remove();
				document.removeEventListener("click", onClick);
			});
		});
	}
	
	function onFocusOut(e) {
		const el = e.target.parentNode.querySelector(".history-list");
		if (el && !el.classList.contains("pending-click")) el.remove();
	}
	
	function onChange(e) {
		var input = e.target,
			history = e.type === "change" && +input.getAttribute("history"),
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
		pref.set(id, value, history);
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
