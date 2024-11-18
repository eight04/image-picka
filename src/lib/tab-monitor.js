// observee the latest active tab
import browser from "webextension-polyfill";
import EventLite from "event-lite";

class TabMonitor extends EventLite {
  constructor() {
    super();
    this._tab = null;
    this._onActivated = this._onActivated.bind(this);
    // FIXME: make it work with multiple windows
    browser.tabs.onActivated.addListener(this._onActivated.bind(this));
    browser.tabs.onUpdated.addListener(this._onUpdated.bind(this), {properties: ["url"]});
  }

  async _onActivated({tabId}) {
    // FIXME: 
    this._tab = await browser.tabs.get(tabId);
    this.emit("change");
  }

  _onUpdated(tabId, changeInfo, tab) {
    if (!this._tab) {
      return;
    }
    if (tabId === this._tab.id) {
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
