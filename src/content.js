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
    case "viewSourceElement":
      return viewSourceElement(message.pickaId);
    case "injectImage":
      return injectImage(message);
  }
});

initDragndrop({downloadImage});

function injectImage({url, referrer}) {
  return new Promise((resolve, reject) => {
    const img = new Image;
    img.src = `${url}#${Date.now()}`; // trigger webRequest
    if (referrer === "") {
      img.referrerPolicy = "no-referrer";
    }
    img.style.maxWidth = "0";
    img.style.maxHeight = "0";
    img.style.position = "absolute";
    img.style.left = "-9999px";
    img.style.top = "-9999px";
    document.body.appendChild(img);
    img.onload = () => {
      resolve();
      img.remove();
    }
    img.onerror = () => {
      reject(new Error(`Failed to load image: ${url}`));
      img.remove();
    }
  });
}

function viewSourceElement(pickaId) {
  const el = document.querySelector(`[data-picka-id="${pickaId}"]`);
  if (!el) {
    console.error(`Element with pickaId ${pickaId} not found`);
    return;
  }
  el.scrollIntoView({behavior: "smooth"});
}

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
  for (const {src, referrerPolicy, alt, pickaId} of getAllImages()) {
    const url = transformURL(src)
    const image = {
      url,
      referrer: getReferrer(location.href, url, referrerPolicy || getDefaultReferrerPolicy()),
      alt,
      pickaId
    };
    const old = images.get(image.url);
    if (old && cmpInfo(old, image) >= 0) {
      continue;
    }
    images.set(url, image);
  }
  return [...images.values()];
}

function cmpInfo(a, b) {
  return cmpReferrer(a.referrer, b.referrer) ||
    cmp(a.alt, b.alt);

  function cmp(x, y) {
    if (x === y) {
      return 0;
    }
    if (x == null) {
      return -1;
    }
    if (y == null) {
      return 1;
    }
    return x < y ? -1 : x > y ? 1 : 0;
  }

  function cmpReferrer(a, b) {
    if (a === b) {
      return 0;
    }
    if (a === location.href) {
      return -1;
    }
    if (b === location.href) {
      return 1;
    }
    return cmp(a, b);
  }
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
