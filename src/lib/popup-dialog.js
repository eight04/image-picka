import browser from "webextension-polyfill";
import {defer} from "./defer.js";
import {waitTab} from "./tab.js";

let INC = 0;

export async function createDialog({type, title, text}) {
  if (type !== "prompt") {
    throw new Error(`Dialog ${type} is not supported`);
  }
  const {resolve, promise} = defer();
  const id = INC++;
  const handleMessage = message => {
    if (message.method === "promptInit" && message.id === id) {
      return Promise.resolve({
        title,
        text
      });
    }
    if (message.method === "promptResolve" && message.id === id) {
      resolve(message.value);
    }
  };
  browser.runtime.onMessage.addListener(handleMessage);
  let w;
  try {
    w = await browser.windows.create({
      type: "popup",
      url: browser.runtime.getURL(`dialog.html?id=${id}`),
      width: 520,
      height: 320
    });
    return await Promise.race([
      promise,
      waitTab(w.tabs[0].id)
    ]);
  } catch (err) {
    console.error(err);
    return null;
  } finally {
    browser.runtime.onMessage.removeListener(handleMessage);
    if (w) {
      try {
        await browser.windows.remove(w.id);
      } catch (err) {
        console.warn(err);
      }
    }
  }
}
