/* global pref */

(function(){
	const SRC_PROP = pref.get("srcAlternative")
		.split(",")
		.map(p => p.trim())
		.filter(Boolean);
	var images = [...document.images]
		.map(getSrc)
		.filter(Boolean)
		.filter(u => !u.startsWith("moz-extension://"));
	images = [...new Set(images)];
	
	return {
		images,
		env: {
			pageUrl: location.href,
			pageTitle: document.title
		}
	};
	
	function getSrc(img) {
		for (const prop of SRC_PROP) {
			const src = img.getAttribute(prop);
			if (src) {
				return new URL(src, location.href).href;
			}
		}
		return img.src;
	}
})();
