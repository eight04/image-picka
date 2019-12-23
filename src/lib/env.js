export const IS_CHROME = Boolean(chrome && chrome.app);

export function getBrowserInfo() {
  if (typeof browser !== "undefined" && browser.runtime.getBrowserInfo) {
    return browser.runtime.getBrowserInfo();
  }
  return new Promise(resolve => {
    const match = navigator.userAgent.match(/(firefox|chrome)\/([\d.]+)/i);
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
