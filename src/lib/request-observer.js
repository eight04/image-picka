import browser from 'webextension-polyfill';

import {createImage} from './fetch-image.js';

export function observeRequest({url, tabId, callback, maxRetries = 2}) {
  return new Promise((resolve, reject) => {
    url = removeFragment(url);
    let streamFilter;
    let requestId;

    // FIXME: is it better to use a specific URL pattern instead of "<all_urls>"?
    const requestFilter = { tabId, urls: ["<all_urls>"], types: ["image"] };
    browser.webRequest.onHeadersReceived.addListener(onHeadersReceived, requestFilter, ["blocking", "responseHeaders"]);
    browser.webRequest.onErrorOccurred.addListener(onError, requestFilter);

    doCallback();

    async function doCallback() {
      // NOTE: in some cases onHeadersReceived may not be called 
      // e.g., when the image is already loading, the connection is reused, and doesn't trigger webRequest
      for (let i = 0; i < maxRetries; i++) {
        try {
          await callback();
        } catch (err) {
          console.warn(err);
        }
        if (requestId) {
          return;
        }
      }
      reject(new Error(`Failed to observe request for ${url}`));
      cleanup();
    }

    function removeFragment(u) {
      const i = u.indexOf("#");
      return i === -1 ? u : u.slice(0, i);
    }

    function onHeadersReceived(details) {
      if (requestId) return;
      if (removeFragment(details.url) !== url) return;

      requestId = details.requestId;
      streamFilter = browser.webRequest.filterResponseData(details.requestId);
      const datas = [];
      const contentType = details.responseHeaders.find(h => h.name.toLowerCase() === "content-type");
      const contentDisposition = details.responseHeaders.find(h => h.name.toLowerCase() === "content-disposition");

      streamFilter.ondata = event => {
        datas.push(event.data);
        streamFilter.write(event.data);
      }
      streamFilter.onstop = () => {
        const blob = new Blob(datas);
        resolve(createImage(url, blob, contentType && contentType.value, contentDisposition && contentDisposition.value));
        cleanup();
      }
      streamFilter.onerror = () => {
        reject(new Error(streamFilter.error));
        cleanup();
      }
    }

    function onError(details) {
      if (requestId && details.requestId !== requestId) return;
      if (removeFragment(details.url) !== url) return;

      reject(new Error(details.error));
      cleanup();
    }

    function cleanup() {
      if (streamFilter) {
        streamFilter.disconnect();
        streamFilter = null;
      }
      browser.webRequest.onHeadersReceived.removeListener(onHeadersReceived);
      browser.webRequest.onErrorOccurred.removeListener(onError);
    }
  });
}
