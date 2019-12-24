import {createView} from "webext-pref";
import {pref} from "./pref.js";
import {_, html} from "./"

export default function init() {
  const root = new DocumentFragment;
  createView({
    root,
    body: [
      {
        type: "number",
        key: "minWidth",
        label: _("pickerMinWidthLabel")
      },
      {
        type: "number",
        key: "minHeight",
        label: _("pickerMinHeightLabel")
      },
      {
        type: "number",
        key: "minFileSize",
        label: _("pickerMinFileSizeLabel")
      },
      {
        type: "select",
        key: "matchType",
        label: _("pickerMatchTypeLabel"),
        options: {
          include: _("pickerMatchTypeIncludeLabel"),
					exclude: _("pickerMatchTypeExcludeLabel")
        }
      },
      {
        type: "text",
        key: "matchUrl",
        label: _("pickerMatchUrlLabel"),
        options: {
          include: _("pickerMatchTypeIncludeLabel"),
					exclude: _("pickerMatchTypeExcludeLabel")
        }
      }
    ]
  });
  
  root.querySelector("#pref-minWidth").title = _("pickerMinWidthHelp");
  root.querySelector("#pref-minHeight").title = _("pickerMinHeightHelp");
  root.querySelector("#pref-minFileSize").title = _("pickerMinFileSizeHelp");
  root.querySelector("#pref-matchType label").classList.add("mobile-only");
  
  document.querySelector(".toolbar-top").prepend(root);
}
