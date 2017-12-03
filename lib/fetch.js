/* exported fetchBlob */

function fetchBlob(url, timeout = 0) {
	// seems that we can hit the cache with XMLHttpRequest
	return new Promise((resolve, reject) => {
		const r = new XMLHttpRequest;
		r.open("GET", url);
		r.responseType = "blob";
		r.timeout = timeout;
		r.onload = () => {
			resolve(r.response);
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
