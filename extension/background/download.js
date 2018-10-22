/* exported downloadAndWait */

function downloadAndWait(options) {
	const {resolve, reject, promise} = deferred();
	browser.downloads.onChanged.addListener(handleChange);
	let blobUrl;
	const getDownloadId = fetchBlob().then(() => browser.downloads.download(options));
	getDownloadId.catch(err => {
		reject(err);
		cleanup();
	});
	return promise;
	
	function fetchBlob() {
		const blob = options.blob;
		delete options.blob;
		let doFetch;
		// download API in Firefox can't handle cross origin blobs and data urls.
		if (/^data/.test(options.url) || blob === true) {
			doFetch = fetchBlob(options.url);
		} else if (blob) {
			doFetch = Promise.resolve(blob);
		} else {
			return Promise.resolve();
		}
		return doFetch.then(blob => {
			blobUrl = URL.createObjectURL(blob);
			options.url = blobUrl;
		});
	}
	
	function handleChange(changes) {
		if (!changes.state) {
			return;
		}
		const state = changes.state.current;
		if (state === "interrupted") {
			getDownloadId.then(id => {
				if (id === changes.id) {
					reject(changes.error);
					cleanup();
				}
			});
		} else if (state === "complete") {
			getDownloadId.then(id => {
				if (id === changes.id) {
					resolve();
					cleanup();
				}
			});
		}
	}
	
	function cleanup() {
		browser.downloads.onChanged.removeListener(handleChange);
		if (blobUrl) {
			URL.revokeObjectURL(blobUrl);
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
}
