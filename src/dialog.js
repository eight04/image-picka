import browser from "webextension-polyfill";
import {translateDOM} from "./lib/i18n.js";

const id = Number(new URLSearchParams(location.search).get("id"));

browser.runtime.sendMessage({
  method: "promptInit",
  id
})
  .then(init)
  .catch(console.error);

translateDOM(document.body);

function init({title, text = ""}) {
  const input = document.querySelector("#input");
  const label = document.querySelector("label");
  label.textContent = title;
  input.value = text;
  input.addEventListener("focus", () => {
    input.select();
  });
  
  const resolve = value => {
    browser.runtime.sendMessage({
      method: "promptResolve",
      id,
      value
    }).catch(console.error);
  };
  
  const ok = document.querySelector("button[type=submit]");
  const cancel = document.querySelector("button[type=button]");
  ok.onclick = () => resolve(input.value);
  cancel.onclick = () => resolve(null);
}
