/* global idbStorage ENV fetchImage fetchXHR */
/* exported imageCache */

const imageCache = (() => {
  const cache = idbStorage.createIDBStorage({
    name: "image-cache",
    conflictAction: "stack"
  });
  return {add, get, delete: delete_, deleteMany, clearAll, fetchImage: _fetchImage};
  
  function _fetchImage(url, tabId, frameId, noReferrer) {
    if (noReferrer && ENV.IS_CHROME) {
      return fetchImage(url);
    }
    return fetchImageFromTab(url, tabId, frameId);
  }
  
  function add({url, tabId, frameId, noReferrer}) {
    return cache.set(url, async () => {
      const data = await _fetchImage(url, tabId, frameId, noReferrer);
      const resource = data.blob;
      delete data.blob;
      const meta = Object.assign(data, await detectDimension(resource));
      return {resource, meta};
    });
  }
  
  function get(url) {
    return cache.get(url);
  }
  
  function delete_(url) {
    return cache.delete(url);
  }
  
  function deleteMany(urls) {
    return cache.deleteMany(urls);
  }
  
  function clearAll() {
    return cache.clearAll();
  }
  
  async function fetchImageFromTab(url, tabId, frameId) {
    const data = await browser.tabs.sendMessage(tabId, {
      method: "fetchImage",
      url
    }, {
      frameId
    });
    if (data.blobUrl) {
      // can't use `fetch` to fetch blob url in Chrome
      const r = await fetchXHR(data.blobUrl, "blob");
      data.blob = r.response;
      delete data.blobUrl;
      browser.tabs.sendMessage(tabId, {
        method: "revokeURL",
        url: data.blobUrl
      }, {
        frameId
      })
        .catch(console.error);
    }
    return data;
  }
  
  function detectDimension(blob) {
    return new Promise((resolve, reject) => {
      const i = new Image;
      i.src = URL.createObjectURL(blob);
      i.onerror = err => {
        reject(err);
        cleanup();
      };
      i.onload = () => {
        if (i.naturalWidth) {
          resolve({
            width: i.naturalWidth,
            height: i.naturalHeight
          });
        } else if (i.offsetWidth) {
          // default width for svg?
          i.style.width = "200px";
          resolve({
            width: i.offsetWidth,
            height: i.offsetHeight
          });
        } else {
          resolve({
            width: 0,
            height: 0
          });
        }
        cleanup();
      };
      document.body.append(i);
      function cleanup() {
        i.remove();
        URL.revokeObjectURL(i.src);        
      }
    });
  }
})();
