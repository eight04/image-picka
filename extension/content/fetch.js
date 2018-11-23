/* exported fetchXHR */

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
