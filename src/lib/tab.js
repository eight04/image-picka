import browser from "webextension-polyfill";

import {defer} from "./defer.js";

const currentTab = browser.tabs.getCurrent();
// import {getBrowserInfo} from "./env.js";

// const supportOpener = checkSupportOpener();

export function waitTab(id) {
  const {resolve, promise} = defer();
  const handleRemove = removedId => {
    if (removedId === id) {
      browser.tabs.onRemoved.removeListener(handleRemove);
      resolve();
    }
  };
  browser.tabs.onRemoved.addListener(handleRemove);
  return promise;
}

export async function createTab(options) {
  let tab;
  let openerTabId;
  if (options.openerTabId === "CURRENT_TAB") {
    options.openerTabId = (await currentTab).id;
  }
  try {
    tab = await browser.tabs.create(options);
  } catch (err) {
    if (!options.openerTabId) {
      throw err;
    }
    openerTabId = options.openerTabId;
    delete options.openerTabId;
    tab = await browser.tabs.create(options);
  }
  await waitTab(tab.id); // FIXME: is it possible that the tab is closed before waitTab?
  if (openerTabId) {
    // focus parent tab if it doesn't support opener
    browser.tabs.update(openerTabId, {active: true})
      .catch(console.warn);
  }
}

// function checkSupportOpener() {
  // return getBrowserInfo()
    // .then(info => {
      // if (!info) {
        // return false;
      // }
      // const name = info.name.toLowerCase();
      // const version = Number(info.version.split(".")[0]);
      // return (
        // name === "firefox" && version >= 57 ||
        // name === "chrome" && version >= 18
      // );
    // });
// }
