/* exported pref */

var pref = function(){
	var DEFAULT = {
		filePattern: "Image Picka/${pageTitle}/${name}${ext}",
		filePatternBatch: "Image Picka/${pageTitle}/${index}${ext}",
		defaultExt: ".jpg",
		minWidth: 0,
		minHeight: 0,
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
		set(key, value){
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
