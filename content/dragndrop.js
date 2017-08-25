/* globals pref */

(function() {
	pref.ready().then(() => {
		initDragndrop();
		initDownloadButton();
	});
	
	if (window.top == window) {
		browser.runtime.onMessage.addListener(message => {
			if (message.method == "getEnv") {
				return Promise.resolve(getEnv());
			}
		});
	}
	
	function initDragndrop() {
		pref.onChange(change => {
			if (change.dragndrop == null) return;
			if (change.dragndrop) {
				init();
			} else {
				uninit();
			}
		});
		if (pref.get("dragndrop")) {
			init();
		}
		
		function init() {
			document.addEventListener("dragend", download, true);
		}
		
		function uninit() {
			document.removeEventListener("dragend", download, true);
		}
		
		function download(e) {
			var img = e.target;
			if (img.nodeName == "A") {
				img = img.querySelector("img");
			}
			if (!img || img.nodeName != "IMG") return;
			
			downloadImage(img.src);
		}
	}
	
	function downloadImage(url) {
		browser.runtime.sendMessage({
			method: "downloadImage",
			url: url,
			env: window.top == window ? getEnv() : null
		});
	}
	
	function initDownloadButton() {
		var timer,
			image,
			button,
			closeTimer;
			
		init();
		pref.onChange(change => {
			if (change.downloadButton == null) return;
			if (change.downloadButton) {
				init();
			} else {
				uninit();
			}
		});
		
		function init() {
			if (!pref.get("downloadButton")) return;
			document.addEventListener("mousemove", decideShowButton);
		}
		
		function uninit() {
			document.removeEventListener("mousemove", decideShowButton);
		}
	
		function decideShowButton(e) {
			var el = e.target;
			if (el.nodeName != "IMG") {
				// not an image
				clearTimeout(timer);
				timer = image = null;
				return;
			}
			if (image && image != el) {
				// jump to a new image
				clearTimeout(timer);
				timer = image = null;
			}
			if (timer == null) {
				// start countdown
				timer = setTimeout(() => {
					timer = null;
					showDownloadButton();
				}, pref.get("downloadButtonDelay"));
				image = el;
				return;
			}
		}
		
		function decideHideButton(e) {
			var el = e.target;
			if (e.type == "mousemove") {
				if (el == image || el.closest(".image-picka-download-button")) {
					if (closeTimer != null) {
						clearTimeout(closeTimer);
						closeTimer = null;
					}
					return;
				}
				if (el.nodeName == "IMG") {
					// directly move to new image
					hideDownloadButton();
					image = el;
					showDownloadButton();
					return;
				}
			}
			if (closeTimer == null) {
				closeTimer = setTimeout(() => {
					closeTimer = null;
					hideDownloadButton();
				}, pref.get("downloadButtonDelayHide"));
			}
		}
		
		function hideDownloadButton() {
			document.removeEventListener("mousemove", decideHideButton);
			image.removeEventListener("mouseout", decideHideButton);
			button.remove();
			image = button = null;
			init();
		}
		
		function showDownloadButton() {
			uninit();
			document.addEventListener("mousemove", decideHideButton);
			image.addEventListener("mouseout", decideHideButton);
			var rect = image.getBoundingClientRect();
			button = document.createElement("div");
			button.className = "image-picka-download-button";
			button.style = `
				width: 64px;
				height: 64px;
				cursor: pointer;
				position: fixed;
				z-index: 2147483647;
				background-image: url(${browser.runtime.getURL("/public/download-button.svg")});
				background-size: cover;
			`;
			button.style.top = rect.top - 64 >= 0 ? rect.top - 64 + "px" : "0";
			button.style.left = rect.left ? rect.left + "px" : "0";
			button.onclick = () => {
				downloadImage(image.src);
			};
			button.onmouseout = decideHideButton;
			document.body.appendChild(button);
		}
	}
	
	function getEnv() {
		return {
			pageTitle: document.title,
			pageUrl: location.href
		};
	}
})();

