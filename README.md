Image Picka
===========

[![Build Status](https://travis-ci.com/eight04/image-picka.svg?branch=master)](https://travis-ci.org/eight04/image-picka)
![Github Build](https://github.com/eight04/image-picka/workflows/.github/workflows/build.yml/badge.svg)

An image picker written in webextensions.

Features
--------

* Download an image with drag-n-drop or ctrl/shift/alt + click.
* Show download button on hover.
* Batch download all images from current tab or tabs to the right.
	- Filter images according to
		- min width
		- min height
		- file size
		- image URL
	- Copy URLs of selected images.
* Customized filename.
* Handle invalid characters in filename.
* Download from browser cache.
* Transform URLs with find-and-replace.

Installation
------------

### Firefox

[Install from addons.mozilla.org](https://addons.mozilla.org/firefox/addon/image-picka/).

### Chrome

This extension can be installed on Chrome, but it is not hosted on Chrome Webstore. You have to install the extension manually:

1. Download the latest release from the [release page](https://github.com/eight04/image-picka/releases).
2. Extract the ZIP file to a folder.
3. [Install the folder as an unpacked extension](https://stackoverflow.com/a/49769909/3413125).

Filename pattern
----------------

Filename may contain following `${variable}`s:

* `index`: an increasing number represent the index of the image. Only available in batch download.
* `url`: entire URL of the image.
* `hostname`: hostname extracted from `url`. (e.g. `http://example.com/abc.jpg` -> `example.com`)
* `name`: filename extracted from `url`. (e.g. `http://example.com/abc.jpg` -> `abc`)
* `ext`: file extension extracted from `url`. If the URL doesn't contain the extension, it uses the default extension which can be set in option page.
* `alt`: the `alt` attribute of the image element.
* `pageTitle`: title of the page.
* `pageUrl`: URL of the page.
* `pageHostname`: hostname extracted from `pageUrl`.
* `pageContentType`: content type of the page.
* `pageName`: the filename of the page. Extracted from `pageUrl`.
* `date`: an instance of JavaScript `Date`.
* `dateString`: a date string in format `year-month-day hour minute second` e.g. `2018-01-18 08 28 56`.

Some notes for iframe:

* When downloading with drag-n-drop
	- `pageTitle`, `pageUrl`, etc, are grabbed from the top window.
* When batch downloading
	- `pageTitle`, `pageUrl`, etc, are grabbed from the window of the iframe.

Feel free to open an issue to discuss this behavior if you think this is not right.

### Use expression in filename

Image Picka evaluate the content inside `${}` as simple expressions, by using [espression](https://github.com/ianchi/ESpression).

Here are some examples:

* Fallback to `pageUrl` when `pageTitle` is empty:
	```
	Image Picka/${pageTitle||pageUrl}/${index} - ${name}${ext}
	```
* Make `index` start from `0`:
	```
	Image Picka/${pageTitle}/${index-1} - ${name}${ext}
	```
* Zero-pad `index`:
	```
	Image Picka/${pageTitle}/${String(index).padStart(3,"0")} - ${name}${ext}
	```
* Slice the filename:
	```
	Image Picka/${pageTitle}/${index} - ${name.slice(-6)}${ext}
	```
	
The expression can access variable methods and global object `String`, `Number`, and `Math`.
	
Transform URL with regexp
-------------------------

If the site displays a thumbnail image, you can transform the URL to its full size URL with this feature, by defining multiple replace rules in the code box. For example:

```
# baidu
imgsa\.baidu\.com/.+/(\w+\.\w+)$
imgsrc.baidu.com/forum/pic/item/$1

# discord
[^/]+\.discordapp\.net/external/[^/]+/(https?)/(.+?)\?
${$1}://${decodeURIComponent($2)}

# twitter
pbs\.twimg\.com/media/(.+\.\w+)$
pbs.twimg.com/media/$1:orig
```

* Each replace rule includes:
	- A line of regex.
	- A line of replacement.
* If the replacement contains template string variables (`${...}`), it would be treated as a JavaScript template string.
* Lines starting with `#` are ignored.
* Empty lines are ignored.

Fetch delay
------------

You can set a delay between each download:

```
https://i.imgur.com 5
http://example.com 10
```

* Each line includes
  - The origin of the image.
  - The delay (in seconds).

Retry on failure
----------------

Some sites return an error when getting too much traffic. You can make the extension wait some time and try again by defining retry rules:

```
# example
example\.com/images/.*
3 5 1
```

* Each rule includes:
	- A line of regex matching the URL.
	- A line of numbers, representing `maxRetries`, `delay`, and `exponentialBackoff`.
* `maxRetries` - the extension will retry `maxRetries` times before raising a network error.
* `delay` - after an error occurs, wait `delay` seconds before the next try.
* `exponentialBackoff` - increase the delay gradually. For example, when `delay` is `5` and `exponentialBackoff` is `2`, the first delay will be 5s, the second will be 10s, the third will be 20s, etc.
* Lines starting with `#` are ignored.
* Empty lines are ignored.


Domain blacklist
----------------

There are some sites which we don't need to download images from it. The blacklist allows you to disable "Download Single Image" feature (i.e. drag-n-drop, single-click download, and hover button) in specified domains. For example:

```
example.com
*.example.com
```

*Note that `*.example.com` doesn't match `https://example.com/` but `https://sub.domain.example.com/`.*

Escape special characters
-------------------------

To generate valid filenames, the extension escapes following characters into Unicode glyphs:

|Character|Unicode replacement|
|---|---|
|`/`|`／`|
|`\`|`＼`|
|`?`|`？`|
|`\|`|`｜`|
|`<`|`＜`|
|`>`|`＞`|
|`:`|`：`|
|`"`|`＂`|
|`*`|`＊`|
|`~`|`～`|

This should be fine for most of the time. However, in some very old environments, they may have problems reading unicode filenames. By unchecking "escape into unicode glyphs" option, special charaters would be replaced with a single underscore: `_`.

Similar addons
--------------

* [Image Picker](https://addons.mozilla.org/zh-TW/firefox/addon/image-picker/)
* [Double-click Image Downloader](https://addons.mozilla.org/en-US/firefox/addon/double-click-image-download/?src=ss)
* [Download All Images](https://addons.mozilla.org/zh-TW/firefox/addon/save-all-images-webextension/)

Icon color
----------

If you are using a dark theme and the icon color doesn't fit your theme, or the icon is completely transparent, try:

1. Set `svg.context-properties.content.enabled` to `true` in `about:config`.
2. If the config doesn't exist (e.g. in Firefox ESR 52), you have to specify a proper color manually.

Reference: https://bugzilla.mozilla.org/show_bug.cgi?id=1377302

Collect images from frames in Firefox < 63
-------------------------------------------

The extension needs `webNavigation` permission to collect frames information, and it would try to request it when starting batch download.

In some older versions of Firefox, the browser would generate an unexpected error while requesting the permission. You can try to start a batch download by clicking the icon in the browser toolbar to request the permission manually. The browser won't generate the error anymore after the permission is granted.

See more information about this bug:
https://github.com/eight04/image-picka/issues/138

Zero width joiner
-----------------

"Zero width joiner" is a special character that is used in emoji. In some file systems, using ZWJ character in the filename will result to an error.

If you find that the filename includes an emoji and the browser can't save the image, try enabling the "Remove zero width joiner" option.

See also: [#175](https://github.com/eight04/image-picka/issues/175)

Translation
-----------

You can help translating the extension by joining Image Picka team on [Transifex](https://www.transifex.com/image-picka/image-picka/dashboard/). If you work on GitHub, you can also send a PR containing `messages.json` file, which would be pushed to Transifex after merging.

Changelog
---------

* 0.17.0 (Oct 6, 2023)

  Fix: srcset parsing issue.
  Add: open image via middle click during batch download.
  Add: fetch delay option.

* 0.16.1 (Feb 20, 2023)

  - Locale: update fr translation.
  - Fix: dateString is broken in single download.

* 0.16.0 (Nov 26, 2022)

  - Locale: update es_419, nl, zh_CN translation.
  - Fix: parse more image extensions.
  - Fix: try to find the maximum image in picture element.
  - Fix: button animation is never canceled.
  - Fix: release memory immediately after download.
  - Fix: open tab next to current in Chrome.
  - Add: option to clear download history.
  - Add: show progress on the title, down't hide the progress bar if there is an error.
  - Add: preview filename.

* 0.15.1 (Dec 1, 2021)

  - Fix: recognize webp images.
  - Change: only load 3 images simultaneously in batch download.
  - Locale: update nl translation.

* 0.15.0 (Nov 6, 2021)

  - Add: support referrer when not downloading from cache. (Firefox 70+ only)
  - Add: ability to retry on failure.
  - Change: always use the espression compiler.
  - Locale: update ru, nl translation.

* 0.14.0 (Feb 25, 2021)

  - Fix: unable to execute batch download command in a popup.
  - Add: `pageName` variable.
  - Add: `alt` variable.
  - Add: support referrer when downloading images.
  - **Change: switch expression compiler to espression, support regex.**
  - Locale: add nl translation.

* 0.13.1 (Jul 27, 2020)

  - Fix: use real image URL as thumbnail. Only use blob URL if the browser can't load the real image.
  - Locale: Update es_419, fr, ru translation.

* 0.13.0 (Jul 18, 2020)

  - Fix: ignore invisible images when drag-n-drop.
  - Add: custom CSS option.
  - **Breaking: now the extension may try to fetch from page context.**
  - Locale: update es_419, fr, tr, zh_CN, zh_TW, ru translation.

* 0.12.3 (Feb 18, 2020)

  - Fix: menus API doesn't work on Firefox Android.
  - Fix: don't generate empty menus on Chrome.
  - Add: release to Github.
  - Add: use a different filename pattern for standalone images.

* 0.12.2 (Jan 24, 2020)

  - Fix: click/double click download is broken.
  - Fix: quirks mode.
  - Update FR translation.

* 0.12.1 (Jan 22, 2020)

  - Breaking: enable "download from cache" by default.
  - Breaking: refactor the source tree. Build the extension with rollup.
  - Add: switch to webext-pref, import/export settings.
  - Add: responsive picker. Improve Android compatibility.
  - Add: keyboard shortcuts.
  - Fix: download button location.

* 0.11.2 (Oct 19, 2019)

  - Fix: invalid filename error.
  - Locale: update CN translation.
  - Locale: update FR translation.

* 0.11.1 (Jul 2, 2019)

  - Nothing is changed. Just package the extension again with correct line ends.

* 0.11.0 (Jul 1, 2019)

  - **Breaking: drop support for Firefox < 52.**
  - Change: throttle network connection usage. Only use 5 connections at once.
  - Add: use a IndexedDB cache in batch download to save memory.
  - Add: lazy load preview image in batch download.
  - Add: style broken images in batch download.
  - Add: option to detect image URLs from links.
  - Fix: ignore `about:blank` in batch download.

* 0.10.2 (Feb 19, 2019)

  - Fix: malformed URL error.

* 0.10.1 (Feb 14, 2019)

  - Locale: update es_419 translation.
  - Locale: update fr translation.
  - Add: treat `input[type=image]` as images.

* 0.10.0 (Feb 4, 2019)

  - Breaking: prefer srcset over src.

* 0.9.10 (Feb 4, 2019)

  - Add: option to remove zero width joiner character.
  - Locale: update zh_ZN translation.

* 0.9.9 (Feb 1, 2019)

  - Fix: download error is shown as `[Object object]`.
  - Fix: capture drop event in drag-n-drop.
  - Add: display a progress bar in batch download.
  - Locale: add es_419 translation.

* 0.9.8 (Jan 3, 2019)

  - Fix: download button is broken in Waterfox.
  - Fix: correctly revoke blob URL.
  - Add: use background fetch if the image is loaded with referrer policy in Chrome.
  - Locale: update French translation.

* 0.9.7 (Dec 26, 2018)

  - Add: selectByDefault option.

* 0.9.6 (Dec 22, 2018)

  - Add: fallback to background fetch in Chrome.
  - Add: support JS template transformation in the URL map.
  - Add: animation for the download button.
  - Add: option to overwrite the default drag-n-drop handler.

* 0.9.5 (Dec 3, 2018)

  - Add: cancel drop when other buttons are pressed.
  - Add: validate image URL in batch download UI.
  - Add: fetch filename from headers.

* 0.9.4 (Oct 30, 2018)

	- Add: a cover image that is load from the real URL so you can right-click on the image to copy the real image address when batch download.
	- Fix: URL filter is broken.

* 0.9.3 (Oct 26, 2018)

	- Fix: disable `saveAs` dialog in batch download.
	- Add: document the permission problem for "collect from frames" option.

* 0.9.2 (Oct 25, 2018)

	- Fix: don't use `saveAs` option in batch download.
	- Locale: update French translation.

* 0.9.1 (Oct 24, 2018)

	- Fix: make sure the permission is requested inside a user action.

* 0.9.0 (Oct 23, 2018)

	- **Change: the extension now would try to fetch the cache in the content script so it would still work when enabling `privacy.firstparty.isolate`.**
	- Add: put some batch download options to options page.
	- Add: support `srcset` and `<picture>` element.
	- Add: support cache option in Chrome.
	- Locale: update French translation.

* 0.8.6 (Sep 26, 2018)

	- Add: `previewMaxHeightUpperBound` option.
	- Add: display notifications for download errors.
	- Change: replace `filenameMaxLength` with `variableMaxLength`.

* 0.8.5 (Aug 27, 2018)

	- Fix: remove zero width spaces.
	- Locale: add Turkish translation. By [Gökhan Şimşek](mailto:gokhan_simsek_16@hotmail.com).
	- Locale: update Chinese translation.

* 0.8.4 (Aug 20, 2018)

	- Local: update fr translation.

* 0.8.3 (Aug 13, 2018)

	- Add: option to not escaping special characters into Unicode glyphs.
	- Fix: remove leading/trailing spaces in the filename.
	- Locale: update fr translation.

* 0.8.2 (Aug 10, 2018)

	- Fix: the option page is broken on Chrome.
	- Fix: grab images from frames is broken on Chrome.
	- Add: downloadButtonSize option.

* 0.8.1 (Jun 18, 2018)

	- Fix: unable to use context menu on images inside a button.
	- Locale: update fr.

* 0.8.0 (Jun 17, 2018)

	- Change: use buttons instead of checkboxes in picker UI.
	- Add: "Display image size under the thumbnail" option.

* 0.7.7 (Jun 4, 2018)

	- Fix: escape leading dots in the filename.
	- Fix: convert whitespaces (e.g. tabs, nbsp...) into a single space.
	- Fix: the error message becomes `[object Object]` on download error.

* 0.7.6 (May 24, 2018)

	- Fix: don't pick images from hidden tabs.
	- Update webext-menus.

* 0.7.5 (May 6, 2018)

	- Locale: add French translation.
	- Locale: update zh-CN.

* 0.7.4 (May 4, 2018)

	- Add: download with double click.
	- Add: grab images from frames recursively.

* 0.7.3 (Mar 26, 2018)

	- Fix: filename error: trailing spaces.

* 0.7.2 (Mar 21, 2018)

	- Add: an option to isolate tabs during batch downloads.

* 0.7.1 (Feb 27, 2018)

	- Fix: ignore "The download is canceled by the user" error.
	- Fix: "Close tabs" option shouldn't close current tab when downloading from only right tabs.

* 0.7.0 (Jan 28, 2018)

	- Add: support Chrome. This repository could be loaded as an unpacked extension in Chrome.
	- Add: a checkbox to disable "Download Single Image" feature in the context menu of the toolbar button.
	- Add: variable `date` and `dateString`.
	- Add: a command to pick from *only* right tabs. The original command is renamed to "pick from current tab + right tabs".
	- Add: subdomain syntax in the domain blacklist.

* 0.6.1 (Dec 29, 2017)

	- Add: an option to overwrite old file on filename conflict.
	- Add: ability to avaluate simple expression in filename pattern.
	- Add: customize the position of the download button.
	- Add: an option to blacklist multiple domains so Image Picka won't apply download single image feature on those sites.
	- Fix: use extra HTML attributes when downloading single image.

* 0.6.0 (Dec 14, 2017)

	- Add: zh-TW, zh-CN translation.
	- Add: a counter to show the number of selected/total images in batch download UI.
	- Add: options to change the color of toolbar button.

* 0.5.2 (Dec 11, 2017)

	- Add: a slider to control the height of image preview in batch download UI.
	- Add: an option to use alternative attributes for image URL.
	- Fix: catch download error in batch download.
	- Fix: `index` is not documented.
	- Fix: whitespaces surrounding variable should be trimmed.

* 0.5.1 (Dec 4, 2017)

	- Fix: sometimes the image picker doesn't load.

* 0.5.0 (Dec 4, 2017)

	- Add: copy URLs of selected images in batch download UI.
	- Add: filter images according to its file size.
	- Add: download images from cache.
	- Add: record recently used values for filename pattern and URL match pattern.
	- Add: transform URLs with find and replace (uses regular expressions).
	- Add: an option to customize default action of toolbar button.
	- Add: an option to set max characters in the filename. This limit only applies to variables.
	- Add: an option to set default filename, although it is rarely used.
	- Fix: context menu is not shown when clicking on an image.
	- Fix: permission error is not handled.
	- Fix: downloading data URI images may cause memory leak.

* 0.4.0 (Nov 22, 2017)

	- Add: Download image with ctrl/shift/alt + click.
	- Add: Close tabs after batch download.
	- Add: Display image size when hover on the image in batch download.
	- Add: Pick images from tabs to the right.
	- Fix: Download won't be triggered if the image is dropped outside of the window.
	- Improve option page.

* 0.3.2 (Oct 12, 2017)

	- Add: saveAs option.

* 0.3.1 (Sep 26, 2017)

	- Fix: unable to download dataurl.

* 0.3.0 (Sep 19, 2017)

	- Change: use `mouseover`, `mouseout` events to replace `mousemove`.
	- Add icon.
	- Add toolbar button to pick images.

* 0.2.1 (Sep 10, 2017)

	- Fix: escape trailing dots in the filename.

* 0.2.0 (Aug 26, 2017)

	- Add: option to enable/disable drag-n-drop.
	- Add: show download button on hover.

* 0.1.2 (Aug 25, 2017)

	- Fix: env is unavailable inside an iframe.

* 0.1.1 (Aug 25, 2017)

	- Fix: use window.top when getting document title.

* 0.1.0

    - First release.
