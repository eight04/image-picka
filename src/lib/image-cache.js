import {createIDBStorage} from "@eight04/idb-storage";
import browser from "webextension-polyfill";

import {IS_CHROME} from "./env.js";
import {fetchImage} from "./fetch-image.js";
import {fetchXHR} from "./fetch.js";
import {retry} from "./retry.js";
import {fetchDelay} from "./fetch-delay.js";
import {observeRequest} from "./request-observer.js";
import {pref} from "./pref.js";

export const imageCache = createImageCache();

function createImageCache() {
  const cache = createIDBStorage({
    name: "image-cache",
    conflictAction: "stack"
  });
  return {add, get, delete: delete_, deleteMany, clearAll, fetchImage: _fetchImage};
  
  async function _fetchImage(url, tabId, frameId, referrer) {
    if (IS_CHROME) {
      // fetch in content script no longer works in Chome 85+
      return await fetchImage(url, referrer);
    }
    if (pref.get("useWebRequest") && url.startsWith("http")) {
      // NOTE: this won't work for data url, blob url, and file url
      return await fetchImageFromWebRequest(url, tabId, frameId, referrer);
    }
    // support first party isolation in FF
    // https://github.com/eight04/image-picka/issues/129
    return await fetchImageFromTab(url, tabId, frameId, referrer);
  }
  
  function add({url, tabId, frameId, referrer}) {
    return cache.set(url, async () => {
      return await fetchDelay(url, async () => {
        const data = await retry(() => _fetchImage(url, tabId, frameId, referrer), url);
        const resource = data.blob;
        delete data.blob;
        const meta = Object.assign(data, await detectDimension(resource));
        return {resource, meta};
      });
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
  
  async function fetchImageFromTab(url, tabId, frameId, referrer) {
    const data = await browser.tabs.sendMessage(tabId, {
      method: "fetchImage",
      url,
      referrer
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

  async function fetchImageFromWebRequest(url, tabId, frameId, referrer) {
    const data = await observeRequest(url, tabId, () => browser.tabs.sendMessage(tabId, {
      method: "injectImage",
      url,
      referrer
    }, {
      frameId
    }));
    return data;
  }
  
  function detectDimension(blob) {
    return new Promise((resolve, reject) => {
      const i = new Image;
      i.src = URL.createObjectURL(blob);
      i.onerror = () => {
        reject(new Error("Failed to detect image dimension"));
        cleanup();
      };
      i.onload = () => {
        const o = {
          thumbnail: null,
          width: 0,
          height: 0
        };
        if (i.naturalWidth) {
          o.width = i.naturalWidth;
          o.height = i.naturalHeight;
        } else if (i.offsetWidth) {
          // FIXME: default width for svg? Maybe we should remove this since
          // this affects the batch download filter
          o.width = i.offsetWidth;
          o.height = i.offsetHeight;
        }
        if (o.width && o.height) {
          o.thumbnail = createThumbnail(i, o, blob.size);
        } 
        resolve(o);
        cleanup();
      };
      document.body.append(i);
      function cleanup() {
        i.remove();
        URL.revokeObjectURL(i.src);        
      }
    });
  }
}

function createThumbnail(image, {width: imgW, height: imgH}, fileSize) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const maxSize = pref.get("previewMaxHeight");
  let thumbW;
  let thumbH;
  if (imgW <= maxSize && imgH <= maxSize) {
    return null;
  }
  if (imgW > imgH) {
    thumbW = maxSize;
    thumbH = Math.round(imgH * maxSize / imgW);
  } else {
    thumbH = maxSize;
    thumbW = Math.round(imgW * maxSize / imgH);
  }
  canvas.width = thumbW;
  canvas.height = thumbH;
  ctx.drawImage(image, 0, 0, imgW, imgH, 0, 0, thumbW, thumbH);
  const dataurl = canvas.toDataURL("image/jpeg", 0.5);
  // FIXME: what is the best way to check if thumbnail is useful? Does loading dataturl cost more than just loading the original image?
  // SVG?
  if (fileSize < dataurl.length * 0.75) {
    return null;
  }
  return dataurl;
}
