Image Picka
===========

An image picker written in webextensions.

Features
--------

* Drag-n-drop to download an image.
* Show download button on hover.
* Batch download all images on a page.
	- Filter images according to
		- min width
		- min height
		- image URL
* Customized filename.
* Handle invalid characters in filename.

Filename pattern
----------------

Filename may contains following `${variable}`s:

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

Similar addons
--------------

* [Image Picker](https://addons.mozilla.org/zh-TW/firefox/addon/image-picker/)
* [Double-click Image Downloader](https://addons.mozilla.org/en-US/firefox/addon/double-click-image-download/?src=ss)

Changelog
---------

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
