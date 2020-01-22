/* global chrome browser */

export const _ = typeof browser === "undefined" ? 
  chrome.i18n.getMessage.bind(chrome.i18n) :
  browser.i18n.getMessage.bind(browser.i18n);

export function translateDOM(root) {
  for (const node of root.querySelectorAll('[data-i18n]')) {
    const [key, attr] = node.dataset.i18n.split('|');
    if (attr) {
      node[attr] = _(key);
    } else {
      node.append(_(key));
    }
  }
}

export function html(key) {
  const tmpl = document.createElement("template");
  tmpl.innerHTML = _(key);
  return tmpl.content;
}
