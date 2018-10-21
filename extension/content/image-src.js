/* global pref */
/* exported getImageSrc */

const getImageSrc = (() => {
	let SRC_PROP = [];
	
	update();
	pref.onChange(change => {
		if (change.srcAlternative != null) {
			update();
		}
	});
		
	function update() {
		SRC_PROP = pref.get("srcAlternative")
			.split(",")
			.map(p => p.trim())
			.filter(Boolean);
	}
	
	function getSrcFromSrcset(set) {
		const rules = set.split(/\s*,\s*/).map(rule =>
			rule.split(/\s+/).reduce((result, token) => {
				if (token) {
					let match;
					if ((match = token.match(/^(\d+)[wx]$/))) {
						result.scale = +match[1];
					} else {
						result.url = token;
					}
				}
				return result;
			}, {
				scale: 1
			})
		);
		
		let maxRule;
		for (const rule of rules) {
			if (!maxRule || rule.scale > maxRule.scale) {
				maxRule = rule;
			}
		}
		return maxRule.url;
	}
		
	return img => {
		for (const prop of SRC_PROP) {
			const src = img.getAttribute(prop);
			if (src) {
				return new URL(src, location.href).href;
			}
		}
		if (img.src) {
			return img.src;
		}
		let srcset;
		if (img.srcset) {
			srcset = img.srcset;
		} else if (
			img.previousElementSibling && 
			img.previousElementSibling.nodeName === "SOURCE" &&
			img.previousElementSibling.srcset
		) {
			srcset = img.previousElementSibling.srcset;
		}
		if (srcset) {
			return getSrcFromSrcset(srcset);
		}
	};
})();
