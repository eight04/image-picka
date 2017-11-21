(function(){
	var images = [...document.images]
		.map(i => i.src)
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
})();
