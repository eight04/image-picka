import {pref} from "./pref.js";

export function createCustomCSS() {
  const style = document.createElement("style");
  pref.on("change", change => {
    if (change.customCSS !== undefined) {
      style.innerHTML = change.customCSS;
    }
  });
  document.head.append(style);
}
