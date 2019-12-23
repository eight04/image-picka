import {pref} from "./pref.js";

let transforms = [];

pref.ready().then(() => {
  update();
  pref.onChange(change => {
    if (change.urlMap != null) {
      update();
    }
  });
});

function update() {
  const lines = pref.get("urlMap").split(/\r?\n/g).filter(line =>
    line && /\S/.test(line) && !line.startsWith("#"));
  const newTransforms = [];
  for (let i = 0; i < lines.length; i += 2) {
    newTransforms.push(createTransform(lines[i], lines[i + 1]));
  }
  transforms = newTransforms;
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
