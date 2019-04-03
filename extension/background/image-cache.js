/* global idbStorage */

const imageCache = (() => {
  const cache = idbStorage.createIDBStorage({
    name: "image-cache",
    conflictAction: "stack"
  });
  return {add, get, delete: delete_};
  
  function add({url, tabId, noReferrer}) {
    return cache.setAsync(url, async () => {
      let data;
      if (noReferrer && ENV.IS_CHROME) {
        data = await fetchImage(url);
      } else {
        data = await fetchImageFromTab(url, tabId);
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
})();
