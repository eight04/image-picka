/* globals pref */

(function() {
	initDragndrop();
	initDownloadButton();
	
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
			
			browser.runtime.sendMessage({
				method: "downloadImage",
				url: img.src,
				env: window.top == window ? getEnv() : null
			});
		}
	}
	
	function initDownloadButton() {
		var timer,
			cache,
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
			var img = e.target;
			if (img.nodeName != "IMG") {
				if (timer != null) {
					clearTimeout(timer);
				}
				timer = null;
				cache = null;
				return;
			}
			if (timer != null) {
				if (img == cache) return;
				clearTimeout(timer);
			}
			timer = setTimeout(
				showDownloadButton,
				pref.get("downloadButtonDelay")
			);
			cache = img;
		}
		
		function decideHideButton(e) {
			var el = e.target;
			if (el == cache || el.closest(".image-picka-download-button")) {
				if (closeTimer != null) {
					clearTimeout(closeTimer);
					closeTimer = null;
				}
				return;
			}
			if (closeTimer != null) {
				return;
			}
			closeTimer = setTimeout(hideDownloadButton, pref.get("downloadButtonDelayHide"));
		}
		
		function hideDownloadButton() {
			document.removeEventListener("mousemove", decideHideButton);
			button.remove();
			init();
		}
		
		function showDownloadButton() {
			uninit();
			document.addEventListener("mousemove", decideHideButton);
			var rect = cache.getBoundingClientRect();
			button = new Image;
			button.className = "image-picka-download-button";
			button.style = "width:64px;height:64px;cursor:pointer;position:fixed;z-index:2147483647";
			button.style.top = rect.top - 64 >= 0 ? rect.top - 64 + "px" : "0";
			button.style.left = rect.left ? rect.left + "px" : "0";
			button.src = browser.runtime.getURL("/public/download-button.svg");
			cache.after(button);
		}
	}
	
	function getEnv() {
		return {
			pageTitle: document.title,
			pageUrl: location.href
		};
	}
})();

