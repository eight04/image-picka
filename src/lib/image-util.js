import {parseSrcset} from "srcset";
import {pref} from "./pref.js";
import {parseBackgroundImage} from "./parse-background-image.js";

let SRC_PROP = [];
let PICKA_ID = 1;
update();
pref.on("change", change => {
  if (change.srcAlternative != null) {
    update();
  }
});

const SRC_EXTRACTORS = [
  getSrcFromPicture,
  getSrcFromLink,
  getSrcFromBackground,
  getSrc,
];
  
function update() {
  SRC_PROP = pref.get("srcAlternative")
    .split(",")
    .map(p => p.trim())
    .filter(Boolean);
}

function getSrcFromSrcset(set) {
  const rules = parseSrcset(set);
  if (!rules.length) {
    throw new Error(`No rules in srcset: ${set}`);
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
      console.warn(err);
    }
  }
  if (img.src) {
    return img.src;
  }
}

export function getSrcFromElement(el) {
  for (const extractor of SRC_EXTRACTORS) {
    const src = extractor(el);
    if (src) {
      return src;
    }
  }
}

export function* getSrcFromBackground(el) {
  if (!pref.get("detectBackground")) {
    return;
  }
  const style = getComputedStyle(el);
  const bgImage = style.backgroundImage;
  if (!bgImage || bgImage === "none") {
    return;
  }
  for (const url of parseBackgroundImage(bgImage)) {
    if (isRelativeUrl(url)) {
      yield toAbsoluateUrl(url);
    } else {
      yield url;
    }
  }
}

export function isImage(node) {
  return node.localName === "img" ||
    node.localName === "input" && node.type === "image";
}

export function *getAllImages() {
  let selector;
  if (pref.get("collectFromBackground")) {
    selector = "*";
  } else {
    selector = "img, input[type=\"image\"], a, picture";
  }
  for (const el of document.querySelectorAll(selector)) {
    const src = getSrcFromElement(el);
    if (!src || /^[\w]+-extension/.test(src) || /^about/.test(src)) {
      continue;
    }
    if (!el.dataset.pickaId) {
      el.dataset.pickaId = PICKA_ID++;
    }
    yield {
      src,
      referrerPolicy: el.referrerPolicy,
      alt: el.alt,
      pickaId: el.dataset.pickaId,
    };
  }
}

function getSrcFromLink(el) {
  if (!pref.get("detectLink")) {
    return;
  }
  el = el.closest("a");
  if (!el || !el.href) return;
  const url = el.href;
  //https://github.com/eight04/linkify-plus-plus-core/blob/3d1e4dc1ced4cfc85a7bd96eb5be4fbdcc47bf71/lib/linkifier.js#L225
  return /^[^?#]+\.(?:jpg|png|gif|jpeg|svg|webp)(?:$|[?#])/i.test(url) && url;
}

function getSrcFromPicture(el) {
  el = el.closest("picture");
  if (!el) return;
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
      console.warn(err);
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
        console.warn(err);
      }
    }
  }
}

function toAbsoluateUrl(url) {
  return new URL(url, location.href).href;
}
