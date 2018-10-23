/* global pref */
/* exported urlMap */
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
