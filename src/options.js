import browser from "webextension-polyfill";
import {createUI, createBinding} from "webext-pref-ui";

import {pref} from "./lib/pref";
import {getBrowserInfo} from "./lib/env.js";
import {_, html} from "./lib/i18n.js";
import {setupHistory} from "./lib/input-history.js";
import {createCustomCSS} from "./lib/custom-css.js";

createCustomCSS();

const root = createUI({
  body: [
    {
      type: "section",
      label: _("optionGeneralTitle"),
      children: [
        {
          type: "checkbox",
          key: "customIcon",
          label: _("optionCustomIconLabel"),
          learnMore: "https://github.com/eight04/image-picka#icon-color",
          children: [
            {
              type: "color",
              key: "customIconColor",
              label: _("optionCustomIconColorLabel")
            }
          ]
        },
        {
          type: "select",
          key: "browserAction",
          label: _("optionBrowserActionLabel"),
          options: {
            PICK_FROM_CURRENT_TAB: _("commandPickFromHighlightedTab"),
            PICK_FROM_RIGHT_TABS: _("commandPickFromRightTabs"),
            PICK_FROM_RIGHT_TABS_EXCLUDE_CURRENT: _("commandPickFromRightTabsExcludeCurrent")
          },
          help: _("optionBrowserActionHelp")
        },
        {
          type: "checkbox",
          key: "contextMenu",
          label: _("optionContextMenuLabel")
        },
        {
          type: "checkbox",
          key: "useCache",
          label: _("optionUseCacheLabel"),
          help: _("optionUseCacheHelp"),
          learnMore: 'https://github.com/eight04/image-picka/issues/270',
          children: [
            {
              type: "checkbox",
              key: "useWebRequest",
              label: _("optionUseWebRequestLabel"),
              help: _("optionUseWebRequestHelp"),
            }
          ]
        },
        {
          type: "text",
          key: "defaultName",
          label: _("optionDefaultNameLabel")
        },
        {
          type: "text",
          key: "defaultExt",
          label: _("optionDefaultExtLabel")
        },
        {
          type: "number",
          key: "variableMaxLength",
          label: _("optionVariableMaxLengthLabel")
        },
        {
          type: "select",
          key: "filenameConflictAction",
          label: _("optionFilenameConflictActionLabel"),
          options: {
            uniquify: _("filenameConflictActionUniquify"),
            overwrite: _("filenameConflictActionOverwrite")
          },
          help: _("optionFilenameConflictActionHelp")
        },
        {
          type: "select",
          key: "clearDownloadHistory",
          label: _("optionClearDownloadHistoryLabel"),
          options: {
            never: _("optionClearDownloadHistoryNever"),
            all: _("optionClearDownloadHistoryAll"),
            keepOne: _("optionClearDownloadHistoryKeepOne")
          }
        }
      ]
    },
    {
      type: "section",
      label: _("optionDownloadSingleImageTitle"),
      help: _("optionDownloadSingleImageHelp"),
      children: [
        {
          type: "text",
          key: "filePattern",
          className: 'has-history',
          label: _("optionFilenamePatternLabel"),
          learnMore: "https://github.com/eight04/image-picka#filename-pattern",
          help: html("optionFilenamePatternHelpHTML")
        },
        {
          type: "checkbox",
          key: "filePatternStandaloneEnabled",
          label: _("optionFilenamePatternStandaloneEnabledLabel"),
          children: [
            {
              type: "text",
              key: "filePatternStandalone",
              className: 'has-history',
              label: _("optionFilenamePatternStandaloneLabel")
            }
          ]
        },
        {
          type: "checkbox",
          key: "saveAs",
          label: _("optionSaveAsLabel"),
          help: _("optionSaveAsHelp")
        },
        {
          type: "checkbox",
          key: "dragndrop",
          label: _("optionDragndropLabel"),
          children: [
            {
              type: "checkbox",
              key: "dragndropHard",
              label: _("optionDragndropHardLabel")
            }
          ]
        },
        {
          type: "checkbox",
          key: "singleClick",
          label: _("optionSingleClickLabel"),
          children: [
            {
              type: "checkbox",
              key: "singleClickCtrl",
              label: "Ctrl",
              className: "form-inline"
            },
            {
              type: "checkbox",
              key: "singleClickShift",
              label: "Shift",
              className: "form-inline"
            },
            {
              type: "checkbox",
              key: "singleClickAlt",
              label: "Alt",
              className: "form-inline"
            },
          ]
        },
        {
          type: "checkbox",
          key: "dblClick",
          label: _("optionDblClickLabel"),
          children: [
            {
              type: "checkbox",
              key: "dblClickCtrl",
              label: "Ctrl",
              className: "form-inline"
            },
            {
              type: "checkbox",
              key: "dblClickShift",
              label: "Shift",
              className: "form-inline"
            },
            {
              type: "checkbox",
              key: "dblClickAlt",
              label: "Alt",
              className: "form-inline"
            },
          ]
        },
        {
          type: "checkbox",
          key: "downloadButton",
          label: _("optionDownloadButtonLabel"),
          children: [
            {
              type: "number",
              key: "downloadButtonSize",
              label: _("optionDownloadButtonSizeLabel")
            },
            {
              type: "select",
              key: "downloadButtonPositionHorizontal",
              label: _("optionDownloadButtonPositionHorizontalLabel"),
              options: {
                LEFT_OUTSIDE: _("optionDownloadButtonPositionHorizontalLeftOutside"),
                LEFT_INSIDE: _("optionDownloadButtonPositionHorizontalLeftInside"),
                CENTER: _("optionDownloadButtonPositionHorizontalCenter"),
                RIGHT_INSIDE: _("optionDownloadButtonPositionHorizontalRightInside"),
                RIGHT_OUTSIDE: _("optionDownloadButtonPositionHorizontalRightOutside")
              }
            },
            {
              type: "select",
              key: "downloadButtonPositionVertical",
              label: _("optionDownloadButtonPositionVerticalLabel"),
              options: {
                TOP_OUTSIDE: _("optionDownloadButtonPositionVerticalTopOutside"),
                TOP_INSIDE: _("optionDownloadButtonPositionVerticalTopInside"),
                CENTER: _("optionDownloadButtonPositionVerticalCenter"),
                BOTTOM_INSIDE: _("optionDownloadButtonPositionVerticalBottomInside"),
                BOTTOM_OUTSIDE: _("optionDownloadButtonPositionVerticalBottomOutside")
              }
            },
            {
              type: "number",
              key: "downloadButtonDelay",
              label: _("optionDownloadButtonDelayLabel")
            },
            {
              type: "number",
              key: "downloadButtonDelayHide",
              label: _("optionDownloadButtonDelayHideLabel")
            },
            {
              type: "number",
              key: "downloadButtonMinWidth",
              label: _("optionDownloadButtonMinWidth")
            },
            {
              type: "number",
              key: "downloadButtonMinHeight",
              label: _("optionDownloadButtonMinHeight")
            }
          ]
        }
      ]
    },
    {
      type: "section",
      label: _("optionBatchTitle"),
      children: [
        {
          type: "text",
          key: "filePatternBatch",
          label: _("optionFilenamePatternLabel"),
          learnMore: "https://github.com/eight04/image-picka#filename-pattern",
          className: 'has-history'
        },
        {
          type: "checkbox",
          key: "selectByDefault",
          label: _("optionSelectByDefaultLabel")
        },
        {
          type: "checkbox",
          key: "closeTabsAfterSave",
          label: _("optionCloseTabsAfterSaveLabel")
        },
        {
          type: "checkbox",
          key: "isolateTabs",
          label: _("optionIsolateTabsLabel"),
          help: html("optionIsolateTabsHelpHTML")
        },
        {
          type: "checkbox",
          key: "collectFromFrames",
          label: _("optionCollectFromFramesLabel"),
          learnMore: "https://github.com/eight04/image-picka#collect-images-from-frames-in-firefox--63"
        },
        {
          type: "checkbox",
          key: "detectLink",
          label: _("optionDetectLinkLabel")
        },
        {
          type: "checkbox",
          key: "collectFromBackground",
          label: _("optionCollectFromBackgroundLabel"),
        },
        {
          type: "checkbox",
          key: "lowResPreview",
          label: _("optionLowResPreviewLabel"),
          help: _("optionLowResPreviewHelp")
        },
        {
          type: "checkbox",
          key: "displayImageSizeUnderThumbnail",
          label: _("optionDisplayImageSizeUnderThumbnailLabel")
        },
        {
          type: "number",
          key: "previewMaxHeightUpperBound",
          label: _("optionPreviewMaxHeightUpperBoundLabel")
        }
      ]
    },
    {
      type: "section",
      label: _("optionAdvancedTitle"),
      children: [
        // {
          // type: "checkbox",
          // key: "useExpression",
          // label: _("optionUseExpressionLabel"),
          // learnMore: "https://github.com/eight04/image-picka#use-expression-in-filename"
        // },
        {
          type: "checkbox",
          key: "escapeWithUnicode",
          label: _("optionEscapeWithUnicodeLabel"),
          learnMore: "https://github.com/eight04/image-picka#escape-special-characters"
        },
        {
          type: "checkbox",
          key: "escapeZWJ",
          label: _("optionEscapeZWJLabel"),
          learnMore: "https://github.com/eight04/image-picka#zero-width-joiner"
        },
        {
          type: "checkbox",
          key: "escapeFF127",
          label: _("optionEscapeFF127Label"),
          learnMore: "https://github.com/eight04/image-picka#illegal-filename-bug-in-firefox-127"
        },
        {
          type: "text",
          key: "srcAlternative",
          label: html("optionSrcAlternativeLabelHTML")
        },      
        {
          type: "textarea",
          key: "urlMap",
          label: _("optionUrlMapLabel"),
          learnMore: "https://github.com/eight04/image-picka#transform-url-with-regexp",
          className: "form-monospace"
        },
        {
          type: "textarea",
          key: "fetchDelay",
          label: _("optionFetchDelayLabel"),
          learnMore: "https://github.com/eight04/image-picka#fetch-delay",
          className: "form-monospace"
        },
        {
          type: "textarea",
          key: "retryOnFailure",
          label: _("optionRetryOnFailureLabel"),
          learnMore: "https://github.com/eight04/image-picka#retry-on-failure",
          className: "form-monospace"
        },
        {
          type: "textarea",
          key: "blacklist",
          label: _("optionBlacklistLabel"),
          learnMore: "https://github.com/eight04/image-picka#domain-blacklist"
        },
        {
          type: "textarea",
          key: "customCSS",
          label: _("optionCustomCSS")
        },
        {
          type: "select",
          key: "packer",
          label: _("optionPackerLabel"),
          options: {
            none: _("optionPackerNone"),
            tar: _("optionPackerTar")
          },
          help: _("optionPackerHelp")
        }
      ]
    }
  ],
  getMessage: (key, params) => {
    key = `option${cap(key)}`;
    return _(key, params);
  },
  navbar: false
});

createBinding({
  pref,
  root,
  prompt: (title, text) => browser.runtime.sendMessage({
    method: "openDialog",
    type: "prompt",
    title,
    text
  }),
  alert: text => browser.runtime.sendMessage({
    method: "notifyError",
    error: text
  })
});

document.body.append(root);

getBrowserInfo().then(info => {
  if (!info) {
    return;
  }
  document.body.dataset.browser = info.name;
  if (info && Number(info.version.split(".")[0]) < 57) {
    document.body.classList.add("version-lt-57");
  }
});

for (const input of document.querySelectorAll(".has-history input")) {
  input.dataset.history = 5;
  
  const container = document.createElement("div");
  container.className = "history-container";
  input.parentNode.insertBefore(container, input);
  container.appendChild(input);
  
  setupHistory(input, input.id.slice(5));
}

function cap(s) {
  return s[0].toUpperCase() + s.slice(1);
}

document.querySelector("#pref-useWebRequest").addEventListener("change", async e => {
  const checked = e.target.checked;
  if (checked) {
    let success = false;
    try {
      success = await browser.permissions.request({
        permissions: ["webRequest", "webRequestBlocking"]
      });
    } catch (err) {
      // I wonder when this happens, this always success silently in my tests
      browser.runtime.sendMessage({
        method: "notifyError",
        error: err.message
      });
    } finally {
      if (!success) {
        await pref.set("useWebRequest", false);
      }
    }
  }
});
