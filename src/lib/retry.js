import {pref} from "./pref.js";
import {parseText} from "./readline.js";
import {timeout} from './timeout.js';

let rules = [];

pref.ready().then(() => {
  update();
  pref.on("change", change => {
    if (change.retryOnFailure != null) {
      update();
    }
  });
});

function update() {
  rules = [...parseText(pref.get('retryOnFailure'), 2)]
    .map(createRule);
}

function createRule(lines) {
  const rx = new RegExp(lines[0], 'i');
  const args = lines[1].split(/\s+/).map(Number);
  return {
    rx,
    max: args[0],
    delay: args[1],
    exp: args[2]
  };
}

export async function retry(fn, key) {
  const c = rules.find(r => r.rx.test(key));
  if (c) {
    let delay = c.delay;
    for (let i = 0; i < c.max; i++) {
      try {
        return await fn();
      } catch (err) {
        console.warn(err);
        console.warn(`try again after ${delay}s`);
      }
      await timeout(delay * 1000);
      delay *= c.exp;
    }
  }
  return await fn();
}
