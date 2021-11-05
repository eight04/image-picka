import {pref} from "./pref.js";
import {parseText} from "./readline.js";

let transforms = [];

pref.ready().then(() => {
  update();
  pref.on("change", change => {
    if (change.urlMap != null) {
      update();
    }
  });
});

function update() {
  transforms = [...parseText(pref.get("urlMap"), 2)]
    .map(lines => createTransform(...lines));
}

function createTransform(search, repl) {
  if (/\$\{[^}]+\}/.test(repl)) {
    const re = new RegExp(search, "i");
    const fn = Function(...fnArgs(), `return \`${repl}\``);
    return url => {
      const match = url.match(re);
      if (!match) {
        return url;
      }
      return fn(...match);
    };
  }
  const re = new RegExp(search, "ig");
  return url => url.replace(re, repl);
}

function* fnArgs() {
  for (let i = 0; i < 10; i++) {
    yield `$${i}=""`;
  }
}

export function transformURL(url) {
  return transforms.reduce((url, t) => t(url), url);
}
