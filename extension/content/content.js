/* global initDownloadSingleImage imageUtil pref fetchImage urlMap ENV */

(() => {
  let referrerMeta;
  const IS_FIREFOX = typeof InstallTrigger !== "undefined";
  
	browser.runtime.onMessage.addListener(message => {
		switch (message.method) {
			case "getEnv":
				return Promise.resolve(getEnv());
			case "getImages":
				return Promise.resolve(getImages());
			case "fetchImage":
				return fetchImage(message.url)
          .then(data => {
            if (ENV.IS_CHROME) {
              data.blobUrl = URL.createObjectURL(data.blob);
              delete data.blob;
            }
            return data;
          });
			case "revokeURL":
				return URL.revokeObjectURL(message.url);
		}
	});
	
	initDownloadSingleImage({downloadImage});
  
	function downloadImage(url, referrerPolicy = getDefaultReferrerPolicy()) {
		url = urlMap.transform(url);
		let image;
		(pref.get("useCache") ? fetchImageData(url, referrerPolicy) : Promise.resolve({url}))
			.then(_image => {
				image = _image;
				return browser.runtime.sendMessage({
					method: "downloadImage",
					image,
					env: window.top == window ? getEnv() : null
				});
			})
			.catch(err => {
				browser.runtime.sendMessage({
					method: "notifyError",
					error: err.message || String(err)
				});
				console.error(err);
			})
			.then(() => {
				if (image && image.blobUrl) {
          if (image.fromBackground) {
            browser.runtime.sendMessage({
              method: "revokeURL",
              url: image.blobUrl
            });
          } else {
            URL.revokeObjectURL(image.blobUrl);
          }
				}
			});
	}
  
  function fetchImageData(url, referrerPolicy) {
    return doFetch().then(data => {
      if (!IS_FIREFOX && data.blob) {
        data.blobUrl = URL.createObjectURL(data.blob);
        delete data.blob;
      }
      return data;
    });
    
    function doFetch() {
      // use background fetch in Chrome
      if (!IS_FIREFOX && getReferrer(location.href, url, referrerPolicy) != location.href) {
        return fetchImageFromBackground();
      }
      return fetchImage(url)
        .catch(err => {
          if (!IS_FIREFOX) {
            // fallback to background fetch if mixed content error occurred
            // https://github.com/eight04/image-picka/issues/158
            return fetchImageFromBackground();
          }
          throw err;
        });
    }
      
    function fetchImageFromBackground() {
      return browser.runtime.sendMessage({method: "fetchImage", url})
        .then(data => {
          data.fromBackground = true;
          return data;
        });
    }
  }
	
	function getImages() {
    const images = new Map;
    for (const img of imageUtil.getAllImages()) {
      const src = imageUtil.getSrc(img);
      if (!src || /^[\w]+-extension/.test(src) || /^about/.test(src)) {
        continue;
      }
      const url = urlMap.transform(src);
      images.set(url, {
        url,
        noReferrer: getReferrer(location.href, url, img.referrerPolicy || getDefaultReferrerPolicy()) !== location.href
      });
    }
		return [...images.values()];
	}
	
	function getEnv() {
		return {
			pageTitle: document.title,
			pageUrl: location.href
		};
	}
  
  function getDefaultReferrerPolicy() {
    if (referrerMeta === undefined) {
      referrerMeta = document.querySelector('meta[name="referrer"]') || null;
    }
    return referrerMeta && referrerMeta.content || "";
  }
  
  function getReferrer(documentUrl, target, policy) {
    if (policy === "no-referrer") {
      return "";
    }
    if (policy === "no-referrer-when-downgrade") {
      return documentUrl.startsWith("https:") && target.startsWith("http:") ?
        "" : documentUrl;
    }
    // FIXME: add more cases
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy
    return documentUrl;
  }
})();
