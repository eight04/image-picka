import {pref} from "./pref.js";

let SRC_PROP = [];
update();
pref.on("change", change => {
  if (change.srcAlternative != null) {
    update();
  }
});
  // return {getSrc, isImage, getAllImages};
  
function update() {
  SRC_PROP = pref.get("srcAlternative")
    .split(",")
    .map(p => p.trim())
    .filter(Boolean);
}

function getSrcFromSrcset(set) {
  const rules = set.split(/\s*,\s*/).map(rule =>
    rule.split(/\s+/).reduce((result, token) => {
      if (token) {
        let match;
        if ((match = token.match(/^(\d+)[wx]$/))) {
          result.scale = +match[1];
        } else {
          result.url = token;
        }
      }
      return result;
    }, {
      scale: 1
    })
  );
  
  let maxRule;
  for (const rule of rules) {
    if (!maxRule || rule.scale > maxRule.scale) {
      maxRule = rule;
    }
  }
  return toAbsoluateUrl(maxRule.url);
}
  
export function getSrc(img) {
  for (const prop of SRC_PROP) {
    const src = img.getAttribute(prop);
    if (src) {
      return toAbsoluateUrl(src);
    }
  }
  // prefer srcset first
  // https://www.harakis.com/hara-elite/large-2br-apartment-gallery/
  if (img.srcset) {
    return (getSrcFromSrcset(img.srcset));
  }
  if (img.src) {
    return img.src;
  }
}

export function getSrcFromElement(el) {
  const picture = el.closest("picture");
  if (picture) {
    return getSrcFromPicture(picture);
  }
  return el.localName === "a" ? getSrcFromLink(el) :
    getSrc(el);
}

export function isImage(node) {
  return node.localName === "img" ||
    node.localName === "input" && node.type === "image";
}

export function *getAllImages() {
  for (const el of document.querySelectorAll('img, input[type="image"], a, picture')) {
    const src = getSrcFromElement(el);
    if (!src || /^[\w]+-extension/.test(src) || /^about/.test(src)) {
      continue;
    }
    yield {
      src,
      referrerPolicy: el.referrerPolicy,
      alt: el.alt
    };
  }
}

function getSrcFromLink(el) {
  const url = el.href;
  //https://github.com/eight04/linkify-plus-plus-core/blob/3d1e4dc1ced4cfc85a7bd96eb5be4fbdcc47bf71/lib/linkifier.js#L225
  return pref.get("detectLink") &&
    /^[^?#]+\.(?:jpg|png|gif|jpeg|svg|webp)(?:$|[?#])/i.test(url) &&
    url;
}

function getSrcFromPicture(el) {
  const allSources = el.querySelectorAll("source");
  let source;
  for (const s of allSources) {
    // FIXME: should we get a full media query matcher?
    if (s.media && /max-width/.test(s.media)) {
      continue;
    }
    if (s.media && /min-width/.test(s.media)) {
      source = s;
      break;
    }
    source = s;
    break;
  }
  if (source) return getSrcFromSrcset(source.srcset);
  const img = el.querySelector("img");
  if (img) return getSrc(img);
  if (allSources.length) {
    return getSrcFromSrcset(allSources[allSources.length - 1].srcset);
  }
}

function toAbsoluateUrl(url) {
  return new URL(url, location.href).href;
}
