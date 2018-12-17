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
      if (isChrome()) {
        fetchFallback().then(resolve, reject);
      } else {
        reject(new Error(`Failed to load: ${url}`));
      }
		};
		r.ontimeout = () => {
			reject(new Error(`Connection timeout: ${url}`));
		};
		r.send();
	});
  
  function fetchFallback() {
    // https://github.com/eight04/image-picka/issues/163
    // can't extract deposition header with this method?
    return fetch(url, {mode: "cors", cache: "force-cache"})
      // FIXME: this only works with blob type
      .then(r => {
        if (!r.ok) {
          throw new Error(`Error ${r.status}: ${url}`);
        }
        return r[type]();
      })
      .then(b => 
        ({
          response: b,
          getResponseHeader: () => {}
        })
      );
  }
  
  function isChrome() {
    return typeof InstallTrigger === "undefined";
  }
}
