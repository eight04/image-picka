/* global idbStorage ENV fetchImage */
/* exported imageCache */

const imageCache = (() => {
  const cache = idbStorage.createIDBStorage({
    name: "image-cache",
    conflictAction: "stack"
  });
  return {add, get, delete: delete_};
  
  function add({url, tabId, frameId, noReferrer}) {
    return cache.setAsync(url, async () => {
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
  
  function fetchImageFromTab(url, tabId, frameId) {
    return browser.tabs.sendMessage(tabId, {
      method: "fetchImage",
      url
    }, {
      frameId
    })
      .then(data => {
        if (data.blobUrl) {
          return fetch(data.blobUrl)
            .then(r => r.blob())
            .then(b => {
              data.blob = b;
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
        resolve({
          width: i.naturalWidth,
          height: i.naturalHeight
        });
        i.remove();
        URL.revokeObjectURL(i.src);
      };
      document.body.append(i);
    });
  }
})();
