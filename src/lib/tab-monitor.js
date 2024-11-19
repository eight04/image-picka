// observee the latest active tab
import browser from "webextension-polyfill";
import EventLite from "event-lite";

class TabMonitor extends EventLite {
  constructor() {
    super();
    this._tabId = null;
    this._tab = null;
    this._onActivated = this._onActivated.bind(this);
    this._onUpdated = this._onUpdated.bind(this);
    // FIXME: make it work with multiple windows
    // NOTE: in Chrome MV2, these requires the "tabs" permission
    browser.tabs.onActivated.addListener(this._onActivated);
    try {
      browser.tabs.onUpdated.addListener(this._onUpdated, {properties: ["url"]});
    } catch (err) {
      if (/filters/.test(err.message)) {
        // Chrome doesn't support filters
        browser.tabs.onUpdated.addListener(this._onUpdated);
      }
    }
  }

  _onActivated({tabId}) {
    this._tabId = tabId;
    browser.tabs.get(tabId)
      .then(tab => {
        this._onUpdated(tabId, null, tab);
      });
  }

  _onUpdated(tabId, changeInfo, tab) {
    if (!this._tabId) {
      return;
    }
    if (!tab.url) {
      if (tab.finalUrl) {
        tab.url = tab.finalUrl;
      } else {
        console.warn(`Tab ${tabId} has no url`);
        return;
      }
    }
    if (tabId === this._tabId) {
      this._tab = tab;
      this.emit("change");
    }
  }

  getTab() {
    // if (!this._tab) {
    //   const tabs = await browser.tabs.query({active: true, currentWindow: true});
    //   this._tab = tabs[0];
    // }
    return this._tab;
  }

  destroy() {
    browser.tabs.onActivated.removeListener(this._onActivated);
    browser.tabs.onUpdated.removeListener(this._onUpdated);
  }

  isExtensionPage() {
    if (!this._tab) {
      return false;
    }
    return this._tab.url.startsWith(browser.runtime.getURL(""));
  }

}

export const tabMonitor = new TabMonitor();
