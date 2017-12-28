Image Picka
===========

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

Filename pattern
----------------

Filename may contain following `${variable}`s:

* `index`: an increasing number represent the index of the image. Only available in batch download.
* `url`: entire URL of the image.
* `hostname`: hostname extracted from `url`. (e.g. `http://example.com/abc.jpg` -> `example.com`)
* `name`: filename extracted from `url`. (e.g. `http://example.com/abc.jpg` -> `abc`)
* `ext`: file extension extracted from `url`. If the URL doesn't contain the extension, it uses the default extension which can be set in option page.
* `pageTitle`: title of the page.
* `pageUrl`: URL of the page.
* `pageHostname`: hostname extracted from `pageUrl`.

Some notes for iframe:

* When downloading with drag-n-drop
	- `pageTitle`, `pageUrl`, etc, are grabbed from the top window.
* When batch downloading
	- `pageTitle`, `pageUrl`, etc, are grabbed from the window of the iframe.

Feel free to open an issue to discuss this behavior if you think this is not right.

Use expression in filename
--------------------------

If this option is checked, the extension would evaluate the content inside `${}` as simple expressions, by using [expression-eval](https://github.com/donmccurdy/expression-eval).

Here are some examples:

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

# twitter
pbs\.twimg\.com/media/(.+\.\w+)$
pbs.twimg.com/media/$1:orig
```

* Each replace rule includes:
	- A line of regex.
	- A line of replacement.
* Lines starting with `#` are ignored.
* Empty lines are ignored.

Similar addons
--------------

* [Image Picker](https://addons.mozilla.org/zh-TW/firefox/addon/image-picker/)
* [Double-click Image Downloader](https://addons.mozilla.org/en-US/firefox/addon/double-click-image-download/?src=ss)

Icon color
----------

If you are using a dark theme and the icon color doesn't fit your theme, or the icon is completely transparent, try:

1. Set `svg.context-properties.content.enabled` to `true` in `about:config`.
2. If the config doesn't exist (e.g. in Firefox ESR 52), you have to specify a proper color manually.

Reference: https://bugzilla.mozilla.org/show_bug.cgi?id=1377302

Translation
-----------

You can help translating the extension by joining Image Picka team on [Transifex](https://www.transifex.com/image-picka/image-picka/dashboard/). If you work on GitHub, you can also send a PR containing `messages.json` file, which would be pushed to Transifex after merging.

Changelog
---------

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
