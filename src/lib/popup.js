import browser from "webextension-polyfill";

let ID = 1;

export function createPopup({url, wait=true}) {
  return new Promise((resolve, reject) => {
    console.log("createPopup", url, wait);
    const id = ID++;
    const u = new URL(url, browser.runtime.getURL("/"));
    u.searchParams.set("popup", id);

    const handleConnection = port => {
      console.log("popup connected", port.name);
      if (port.name !== `popup-${id}`) {
        return;
      }
      port.onDisconnect.addListener(() => {
        console.log("popup disconnected", port.name);
        resolve();
        browser.runtime.onConnect.removeListener(handleConnection);
      });
    };
    browser.runtime.onConnect.addListener(handleConnection);
    browser.browserAction.setPopup({
      popup: u.href
    });
    browser.browserAction.openPopup()
      .then(() => {
        console.log("popup opened");
        browser.browserAction.setPopup({
          popup: ""
        });
        if (!wait) {
          resolve();
        }
      })
      .catch(reject);
  });
}
