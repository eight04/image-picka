import {parseSrcset} from "srcset";
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
  const rules = parseSrcset(set);
  if (!rules.length) {
    return null;
  }
  let maxRule;
  for (const rule of rules) {
    // FIXME: what if the rules have both density and width?
    if (!maxRule || (rule.density || rule.width || 0) > (maxRule.density || maxRule.width || 0)) {
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
    try {
      return getSrcFromSrcset(img.srcset);
    } catch (err) {
      console.warn("Error parsing srcset", img.srcset);
    }
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
  if (source && source.srcset) {
    try {
      return getSrcFromSrcset(source.srcset);
    } catch (err) {
      console.warn("Error parsing srcset", source.srcset);
    }
  }
  const img = el.querySelector("img");
  if (img) return getSrc(img);
  if (allSources.length) {
    const srcset = allSources[allSources.length - 1].srcset
    if (srcset) {
      try {
        return getSrcFromSrcset(srcset);
      } catch (err) {
        console.warn("Error parsing srcset", srcset);
      }
    }
  }
}

function toAbsoluateUrl(url) {
  return new URL(url, location.href).href;
}
