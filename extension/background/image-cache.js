const imageCache = (() => {
  const cache = new IDBCache("image-cache", {
    size: Math.pow(1024, 3),
    count: 10000
  });
  return {add, get, delete: delete_};
  
  async function add({url, tabId, noReferrer}) {
    try {
      return await cache.getMeta(url, true);
    } catch (err) {}
    
    let data;
    if (noReferrer && ENV.IS_CHROME) {
      data = await fetchImage(url);
    } else {
      data = await fetchImageFromTab(url, tabId);
    }
    const resource = data.blob;
    delete data.blob;
    const meta = Object.assign(data, await detectDimension(resource))
    await cache.set(url, resource, meta);
    return meta;
  }
  
  function get(url) {
    return cache.get(url);
  }
  
  function delete_(url) {
    return cache.delete(url);
  }
})();
