/* global pref */
/* exported urlMap */
const urlMap = function () {
  let transforms = [];
	
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
		const newTransforms = [];
		for (let i = 0; i < lines.length; i += 2) {
      newTransforms.push(createTransform(lines[i], lines[i + 1]));
		}
		transforms = newTransforms;
	}
  
  function createTransform(search, repl) {
    if (/\$\{[^}]+\}/.test(repl)) {
      const re = new RegExp(search, "i");
      const fn = Function("$0", "$1", "$2", "$3", "$4", "$5", "$6", "$7", "$8",
        "$9", `return \`${repl}\``);
      return url => {
        const match = url.match(re);
        if (!match) {
          return url;
        }
        return fn(...match);
      };
    }
    const re = new RegExp(search, "ig");
    return url => url.replace(re, repl);
  }
	
	function transform(url) {
    return transforms.reduce((url, t) => t(url), url);
	}
	
	return {transform};
}();
