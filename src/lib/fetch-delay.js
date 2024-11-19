import {createLockPool} from "@eight04/read-write-lock";

import {pref} from "./pref.js";
import {parseText} from "./readline.js";

pref.ready().then(() => {
  update();
  pref.on("change", change => {
    if (change.fetchDelay != null) {
      update();
    }
  });
});

const lock = createLockPool({maxActiveReader: 3});
let rules = [];

function update() {
  const newRules = [];
  for (const lines of parseText(pref.get('fetchDelay'))) {
    const [origin, delay] = lines[0].trim().split(/\s+/);
    const delayMs = Number(delay) * 1000;
    const oldRule = rules.find(rule => rule.origin === origin);
    newRules.push({
      ...oldRule,
      origin,
      delayMs
    });
  }
  rules = newRules;
}

function matchGlob(pattern, string) {
  if (!pattern.includes("*")) {
    return pattern === string;
  }
  return new RegExp(`^${pattern.replace(/\*/g, ".*")}$`).test(string);
}

export async function fetchDelay(url, cb) {
  const origin = new URL(url).origin;
  const rule = rules.find(rule => matchGlob(rule.origin, origin));
  // calculate the delay if there is a matching rule
  if (rule) {
    return await lock.write([rule.origin], async () => {
      const t = (rule.lastFetch || 0) + rule.delayMs - Date.now();
      await delay(t > 0 ? t : 0);
      try {
        return await cb();
      } finally {
        rule.lastFetch = Date.now();
      }
    });
  }
  // no matching rule, just fetch, still restricted by the maxActiveReader
  return await lock.read([origin], cb);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
