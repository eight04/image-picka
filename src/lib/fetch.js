import {IS_CHROME} from "./env.js";

export function fetchXHR(url, type) {
	return new Promise((resolve, reject) => {
		const r = new (typeof content !== "undefined" && content.XMLHttpRequest || XMLHttpRequest);
		r.open("GET", url);
		r.responseType = type;
		r.onload = () => {
      if (r.status === 200) {
        resolve(r);
      } else {
        reject(new Error(`Bad status ${r.status}: ${url}`));
      }
		};
		r.onerror = () => {
      reject(new Error(`Failed to load: ${url}`));
		};
		r.ontimeout = () => {
			reject(new Error(`Connection timeout: ${url}`));
		};
		r.send();
	})
    .catch(err => {
      if (IS_CHROME) {
        return fetchFallback();
      }
      throw err;
    });
  
  function fetchFallback() {
    // https://github.com/eight04/image-picka/issues/163
    // can't extract deposition header with this method?
    return fetch(url, {mode: "cors", cache: "force-cache"})
      // FIXME: this only works with blob type
      .then(r => {
        if (!r.ok) {
          throw new Error(`Bad status ${r.status}: ${url}`);
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
}
