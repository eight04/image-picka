/* exported fetcher */

const fetcher = (() => {
	return {fetchImage, fetchBlob, fetchXHR};
	
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
	
	function fetchBlob(url) {
		// if (isFirefox()) {
			return fetchXHR(url, "blob").then(r => r.response);
		// }
		// return fetch(url, {mode: "cors", cache: "force-cache"})
			// .then(r => r.blob());
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
	
	function fetchXHR(url, type) {
		return new Promise((resolve, reject) => {
			const r = new XMLHttpRequest;
			r.open("GET", url);
			r.responseType = type;
			r.onload = () => {
				resolve(r);
			};
			r.onerror = () => {
				reject(new Error(`Failed to load: ${url}`));
			};
			r.ontimeout = () => {
				reject(new Error(`Connection timeout: ${url}`));
			};
			r.send();
		});
	}
	
	function isFirefox() {
		return typeof InstallTrigger !== "undefined";
	}
})();
