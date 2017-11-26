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
		- image URL
* Customized filename.
* Handle invalid characters in filename.

Filename pattern
----------------

Filename may contain following `${variable}`s:

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

If you are using a dark theme and the icon color doesn't fit your theme, try setting `svg.context-properties.content.enabled` to true in `about:config`.

Reference: https://bugzilla.mozilla.org/show_bug.cgi?id=1377302

Changelog
---------

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
