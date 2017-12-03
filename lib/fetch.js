/* exported fetchBlob */

function fetchBlob(url) {
	// seems that we can hit the cache with XMLHttpRequest
	return new Promise((resolve, reject) => {
		const r = new XMLHttpRequest;
		r.open("GET", url);
		r.responseType = "blob";
		r.onload = () => {
			r.onload = r.onerror = null;
			resolve(r.response);
		};
		r.onerror = err => {
			r.onload = r.onerror = null;
			reject(err);
		};
		r.send();
	});
}
