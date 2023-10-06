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
let meta = new Map;

function update() {
  const newMeta = new Map;
  for (const lines of parseText(pref.get('fetchDelay'))) {
    const [origin, delay] = lines[0].trim().split(/\s+/);
    const delayMs = Number(delay) * 1000;
    newMeta.set(origin, {
      ...meta.get(origin),
      delayMs
    });
  }
  meta = newMeta;
}

export async function fetchDelay(url, cb) {
  const origin = new URL(url).origin;
  if (meta.has(origin)) {
    return await lock.write([origin], async () => {
      const t = (meta.get(origin).lastFetch || 0) + meta.get(origin).delayMs - Date.now();
      await delay(t > 0 ? t : 0);
      try {
        return await cb();
      } finally {
        meta.get(origin).lastFetch = Date.now();
      }
    });
  }
  return await lock.read([origin], cb);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
