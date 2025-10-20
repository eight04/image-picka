/* global chrome */
import browser from "webextension-polyfill";

export const IS_CHROME = typeof chrome !== "undefined" && Boolean(chrome.app);

export const IS_ANDROID = /Android/.test(navigator.userAgent);

export function getBrowserInfo() {
  if (browser.runtime.getBrowserInfo) {
    return browser.runtime.getBrowserInfo();
  }
  return new Promise(resolve => {
    const rxs = [
      /(firefox|edg)\/([\d.]+)/i,
      /(chrome)\/([\d.]+)/i
    ]
    let match;
    for (const rx of rxs) {
      match = navigator.userAgent.match(rx);
      if (match) {
        break;
      }
    }
    if (match) {
      resolve({
        name: match[1],
        version: match[2]
      });
    } else {
      resolve(null);
    }
  });
}
