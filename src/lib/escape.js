import {IS_ANDROID} from "./env.js";
import {pref} from "./pref.js";

const table = {
  "/": "／",
  "\\": "＼",
  "?": "？",
  "|": "｜",
  "<": "＜",
  ">": "＞",
  ":": "：",
  "\"": "＂",
  "*": "＊",
  "~": "～"
};

if (IS_ANDROID) {
  // https://dxr.mozilla.org/mozilla-central/source/toolkit/components/downloads/DownloadPaths.jsm
  Object.assign(table, {
    ";": "；",
    ",": "，",
    "+": "＋",
    "=": "＝",
    "[": "［",
    "]": "］"
  });
}

const RX_ESCAPE = new RegExp(`[${escapeBracket(Object.keys(table).join(""))}]+`, "g");
// eslint-disable-next-line no-control-regex
const RX_UNPRINTABLE = /[\x00-\x1f\x7f-\x9f\u200e\u200f\u202a-\u202e]/g;

function escapeBracket(s) {
  return s.replace(/\[|\]/g, "\\$&");
}

export function escapeVariable(name) {
  if (pref.get("escapeZWJ")) {
    name = name.replace(/\u200d/g, "");
  }
  
  name = trimString(
    name.replace(RX_UNPRINTABLE, "")
      .replace(RX_ESCAPE, m => {
        if (!pref.get("escapeWithUnicode")) {
          return "_";
        }
        return Array.from(m).map(c => table[c]).join("");
      })
      .replace(/\s+/g, " ")
  );
    
  const maxLength = pref.get("variableMaxLength");
  if (name.length > maxLength) {
    name = trimString(name.slice(0, maxLength));
  }
  return name;
}

function trimString(s) {
  return s.replace(/^[\s\u180e]+|[\s\u180e]+$/g, "");
}

export function escapePath(path) {
  const parts = path.split(/\\|\//g);
  return parts.map((component, i) => {
    component = trimString(component).replace(/^\.+|\.+$/g, m => "．".repeat(m.length))
    if (pref.get("escapeFF127")) {
      component = component.replace(/%/g, "％");
      if (i < parts.length - 1) {
        component = component.replace(/\./g, "．");
      }
    }
    return component;
  }
  ).join("/");
}
