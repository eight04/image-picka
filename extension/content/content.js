/* global initDownloadSingleImage getImageSrc pref fetchBlob urlMap */

(() => {
	browser.runtime.onMessage.addListener(message => {
		switch (message.method) {
			case "getEnv":
				return Promise.resolve(getEnv());
			case "getImages":
				return Promise.resolve(getImages());
			case "fetchBlob":
				return fetchBlob(message.url);
		}
	});
	
	initDownloadSingleImage({downloadImage});
	
	function downloadImage(url) {
		url = urlMap.transform(url);
		const getBlob = pref.get("useCache") && isFirefox() ?
			fetchBlob(url) : Promise.resolve();
		getBlob
			.then(blob =>
				browser.runtime.sendMessage({
					method: "downloadImage",
					url,
					blob,
					env: window.top == window ? getEnv() : null
				})
			)
			.catch(console.error);
	}
	
	function isFirefox() {
		return typeof InstallTrigger !== "undefined";
	}

	function getImages() {
		let images = [...document.images]
			.map(getImageSrc)
			.filter(Boolean)
			.filter(u => !u.startsWith("moz-extension://"));
		images = [...new Set(images)];
		return images;
	}
	
	function getEnv() {
		return {
			pageTitle: document.title,
			pageUrl: location.href
		};
	}	
})();
