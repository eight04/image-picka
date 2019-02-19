/* global pref */
/* exported imageUtil */

const imageUtil = (() => {
	let SRC_PROP = [];
	update();
	pref.onChange(change => {
		if (change.srcAlternative != null) {
			update();
		}
	});
  return {getSrc, isImage, getAllImages};
  
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
		
	function getSrc(img) {
		for (const prop of SRC_PROP) {
			const src = img.getAttribute(prop);
			if (src) {
        return toAbsoluateUrl(src);
			}
		}
    // prefer srcset first
    // https://www.harakis.com/hara-elite/large-2br-apartment-gallery/
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
			return toAbsoluateUrl(getSrcFromSrcset(srcset));
		}
		if (img.src) {
			return img.src;
		}
	}
  
  function isImage(node) {
    return node.localName === "img" ||
      node.localName === "input" && node.type === "image";
  }
  
  function getAllImages() {
    return document.querySelectorAll('img, input[type="image"]');
  }
  
  function toAbsoluateUrl(url) {
    return new URL(url, location.href).href;
  }
})();
