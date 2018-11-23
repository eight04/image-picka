/* global initDownloadSingleImage getImageSrc pref fetchXHR urlMap
	contentDisposition */

(() => {
	browser.runtime.onMessage.addListener(message => {
		switch (message.method) {
			case "getEnv":
				return Promise.resolve(getEnv());
			case "getImages":
				return Promise.resolve(getImages());
			case "fetchImage":
				return fetchImage(message.url);
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
		(pref.get("useCache") ? fetchImage(url) : Promise.resolve({url}))
			.then(_image => {
				image = _image;
				return browser.runtime.sendMessage({
					method: "downloadImage",
					image,
					env: window.top == window ? getEnv() : null
				});
			})
			.catch(console.error)
			.then(() => {
				if (image.blobUrl) {
					URL.revokeObjectURL(image.blobUrl);
				}
			});
	}
	
	function fetchImage(url) {
		return fetchXHR(url, "blob")
			.then(r => {
				const image = {
					url,
					mime: getMime(r),
					filename: getFilename(r),
					size: r.response.size
				};
				if (isFirefox()) {
					image.blob = r.response;
				} else {
					image.blobUrl = URL.createObjectURL(r.response);
				}
				return image;
			});
	}

	function getMime(r) {
		const contentType = r.getResponseHeader("Content-Type");
		if (!contentType) {
			return;
		}
		const match = contentType.match(/^\s*([^\s;]+)/);
		return match && match[1].toLowerCase();
	}

	function getFilename(r) {
		try {
			const value = r.getResponseHeader("Content-Disposition");
			return contentDisposition.parse(value).parameters.filename;
		} catch (err) {
			// pass
		}
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
