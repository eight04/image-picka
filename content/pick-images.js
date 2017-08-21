(function(){
	var images = [...document.images].map(i => i.src).filter(Boolean);
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
