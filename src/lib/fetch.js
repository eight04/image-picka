import {IS_CHROME} from "./env.js";

// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_scripts#XHR_and_Fetch
const CONTENT_XHR = typeof content !== "undefined" && content.XMLHttpRequest; // eslint-disable-line no-undef
  
function _fetchXHR(url, type, XHR = XMLHttpRequest) {
  return new Promise((resolve, reject) => {
		const r = new XHR;
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
	});
}

export function fetchXHR(url, type) {
	return _fetchXHR(url, type)
    .catch(err => {
      if (IS_CHROME) {
        return fetchFallback();
      }
      if (CONTENT_XHR) {
        return _fetchXHR(url, type, CONTENT_XHR);
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
