import browser from "webextension-polyfill";

import initDragndrop from "./lib/dragndrop.js";
import {getAllImages} from "./lib/image-util.js";
import {fetchImage} from "./lib/fetch-image.js";
import {transformURL} from "./lib/url-map.js";
import {IS_CHROME} from "./lib/env.js";

let referrerMeta;

browser.runtime.onMessage.addListener(message => {
  switch (message.method) {
    case "getEnv":
      return Promise.resolve(getEnv());
    case "getImages":
      return Promise.resolve(getImages());
    case "fetchImage":
      return fetchImage(message.url, message.referrer)
        .then(data => {
          if (IS_CHROME) {
            data.blobUrl = URL.createObjectURL(data.blob);
            delete data.blob;
          }
          return data;
        });
    case "revokeURL":
      return URL.revokeObjectURL(message.url);
  }
});

initDragndrop({downloadImage});

function downloadImage({url, referrerPolicy = getDefaultReferrerPolicy(), alt}) {
  url = transformURL(url);
  browser.runtime.sendMessage({
    method: "singleDownload",
    env: window.top === window ? getEnv() : null,
    url,
    referrer: getReferrer(location.href, url, referrerPolicy),
    alt
  })
    .catch(console.error);
}

function getImages() {
  const images = new Map;
  for (const {src, referrerPolicy, alt} of getAllImages()) {
    const url = transformURL(src);
    if (images.has(url)) {
      continue;
    }
    images.set(url, {
      url,
      referrer: getReferrer(location.href, url, referrerPolicy || getDefaultReferrerPolicy()),
      alt
    });
  }
  return [...images.values()];
}

function getEnv() {
  return {
    pageTitle: document.title,
    pageUrl: location.href,
    pageContentType: document.contentType
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
