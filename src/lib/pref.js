import {createPref, createWebextStorage} from "webext-pref";
import browser from "webextension-polyfill";

const DEFAULT = {
  browserAction: "PICK_FROM_CURRENT_TAB",
  blacklist: "",
  closeTabsAfterSave: false,
  contextMenu: true,
  collectFromFrames: false,
  customIcon: false,
  customIconColor: "#000000",
  customCSS: "",
  clearDownloadHistory: "never",
  enabled: true,
  dblClick: false,
  dblClickCtrl: false,
  dblClickShift: false,
  dblClickAlt: true,
  detectLink: false,
  displayImageSizeUnderThumbnail: false,
  dragndrop: true,
  dragndropHard: false,
  downloadButton: false,
  downloadButtonSize: 64,
  downloadButtonDelay: 0,
  downloadButtonDelayHide: 500,
  downloadButtonMinWidth: 64,
  downloadButtonMinHeight: 64,
  downloadButtonPositionHorizontal: "LEFT_INSIDE",
  downloadButtonPositionVertical: "TOP_OUTSIDE",
  escapeWithUnicode: true,
  escapeZWJ: false,
  isolateTabs: false,
  filenameConflictAction: "uniquify",
  saveAs: false,
  selectByDefault: true,
  singleClick: false,
  singleClickCtrl: false,
  singleClickShift: false,
  singleClickAlt: true,
  srcAlternative: "data-src, data-gifsrc, gifsrc",
  previewMaxHeight: 200,
  previewMaxHeightUpperBound: 200,
  retryOnFailure: "",
  urlMap: "",
  useCache: true,
  useExpression: false,
  fetchDelay: "",
  variableMaxLength: 128,
  filePattern: "Image Picka/${pageTitle}/${name}${ext}",
  filePatternHistory: [],
  filePatternBatch: "Image Picka/${pageTitle}/${index} - ${name}${ext}",
  filePatternBatchHistory: [],
  filePatternStandalone: "Image Picka/${name}${ext}",
  filePatternStandaloneEnabled: false,
  filePatternStandaloneHistory: [],
  defaultExt: ".jpg",
  defaultName: "unnamed-image",
  minFileSize: 0,
  minWidth: 10,
  minHeight: 10,
  matchType: "include",
  matchUrl: "",
  matchUrlHistory: []
};

export const pref = createPref(DEFAULT);
const initializing = init();
pref.ready = () => initializing;

async function init() {
  await pref.connect(createWebextStorage("sync"));
  
  // migrate from local to sync
  const {prefInSync} = await browser.storage.local.get("prefInSync");
  if (prefInSync) {
    return;
  }
  const result = await browser.storage.local.get(Object.keys(DEFAULT));
  const pending = [];
  for (const key in result) {
    if (key.endsWith("History") && typeof result[key] === "string") {
      result[key] = JSON.parse(result[key]);
    }
    pending.push(pref.set(key, result[key]));
  }
  await Promise.all(pending);
  await browser.storage.local.set({prefInSync: true});
}
