(function(){
	var images = [...document.images]
		.map(i => i.src)
		.filter(Boolean)
		.filter(u => !u.startsWith("moz-extension://"));
	images = [...new Set(images)];
	
	if (!images.length) {
		alert("No images found");
		return;
	}

	return {
		images,
		env: {
			pageUrl: location.href,
			pageTitle: document.title
		}
	};
})();
