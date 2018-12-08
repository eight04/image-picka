/* global initDownloadSingleImage getImageSrc pref fetchImage urlMap */

(() => {
	browser.runtime.onMessage.addListener(message => {
		switch (message.method) {
			case "getEnv":
				return Promise.resolve(getEnv());
			case "getImages":
				return Promise.resolve(getImages());
			case "fetchImage":
				return fetchImageData(message.url);
			case "revokeURL":
				return URL.revokeObjectURL(message.url);
		}
	});
	
	initDownloadSingleImage({downloadImage});
	
	function isFirefox() {
		return typeof InstallTrigger !== "undefined";
	}

	function downloadImage(url) {
		url = urlMap.transform(url);
		let image;
		(pref.get("useCache") ? fetchImageData(url) : Promise.resolve({url}))
			.then(_image => {
				image = _image;
				return browser.runtime.sendMessage({
					method: "downloadImage",
					image,
					env: window.top == window ? getEnv() : null
				});
			})
			.catch(err => {
				browser.runtime.sendMessage({
					method: "notifyError",
					error: err.message || String(err)
				});
				console.error(err);
			})
			.then(() => {
				if (image && image.blobUrl) {
					URL.revokeObjectURL(image.blobUrl);
				}
			});
	}
  
  function fetchImageData(url) {
    return fetchImage(url).then(data => {
      if (!isFirefox()) {
        data.blobUrl = URL.createObjectURL(data.blob);
        delete data.blob;
      }
    });
  }
	
	function getImages() {
		let images = [...document.images]
			.map(getImageSrc)
			.filter(Boolean)
			.filter(u => !u.startsWith("moz-extension://"))
			.map(urlMap.transform);
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
