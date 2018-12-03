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
	
	const que = throttle();
	function fetchImage(url) {
		return que.add(() =>
			fetchXHR(url, "blob").then(r => {
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
			})
		);
	}
	
	function throttle(size = 100) {
		const waiting = [];
		let running = 0;
		return {add};
		
		function add(fn) {
			const task = deferred();
			task.fn = fn;
			waiting.push(task);
			deque();
			return task.promise;
		}
		
		function deque() {
			if (!waiting.length || running >= size) {
				return;
			}
			const task = waiting.shift();
			running++;
			const pending = task.fn();
			pending.then(task.resolve, task.reject);
			pending
				.catch(() => {})
				.then(() => {
					running--;
					deque();
				});
		}
	}
	
	function deferred() {
		const o = {};
		o.promise = new Promise((resolve, reject) => {
			o.resolve = resolve;
			o.reject = reject;
		});
		return o;
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
