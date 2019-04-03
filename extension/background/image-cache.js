/* global idbStorage ENV fetchImage fetchXHR */
/* exported imageCache */

const imageCache = (() => {
  const cache = idbStorage.createIDBStorage({
    name: "image-cache",
    conflictAction: "stack"
  });
  return {add, get, delete: delete_, deleteMany};
  
  function add({url, tabId, frameId, noReferrer}) {
    return cache.set(url, async () => {
      let data;
      if (noReferrer && ENV.IS_CHROME) {
        data = await fetchImage(url);
      } else {
        data = await fetchImageFromTab(url, tabId, frameId);
      }
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
  
  function fetchImageFromTab(url, tabId, frameId) {
    return browser.tabs.sendMessage(tabId, {
      method: "fetchImage",
      url
    }, {
      frameId
    })
      .then(data => {
        if (data.blobUrl) {
          // can't use `fetch` to fetch blob url in Chrome
          return fetchXHR(data.blobUrl, "blob")
            .then(r => {
              data.blob = r.response;
              browser.tabs.sendMessage(tabId, {
                method: "revokeURL",
                url: data.blobUrl
              }).catch(console.error);
              delete data.blobUrl;
              return data;
            });
        }
        return data;
      });
  }
  
  function detectDimension(blob) {
    return new Promise((resolve, reject) => {
      const i = new Image;
      i.src = URL.createObjectURL(blob);
      i.onerror = reject;
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
        i.remove();
        URL.revokeObjectURL(i.src);
      };
      document.body.append(i);
    });
  }
})();
