/* globals pref */

(function() {
	const EVENT_OPTIONS = {passive: true};	
	let IS_BLACKLISTED = false;
	
	pref.ready().then(() => {
		initBlackList();
		initDragndrop();
		initDownloadButton();
		initSingleClick();
	});
	
	if (window.top == window) {
		browser.runtime.onMessage.addListener(message => {
			if (message.method == "getEnv") {
				return Promise.resolve(getEnv());
			}
		});
	}
	
	function createSwitch(test, on, off) {
		let state = false;
		
		function update() {
			const newState = test();
			if (newState === state) return;
			if (newState) {
				on();
			} else {
				off();
			}
			state = newState;
		}
		
		return {update};
	}
	
	function initBlackList() {
		update();
		pref.onChange(change => {
			if (change.blacklist != null) {
				update();
			}
		});
		
		function update() {
			const blacklist = pref.get("blacklist");
			IS_BLACKLISTED = blacklist.split("\n")
				.some(d => d === location.hostname);
		}
	}
	
	function addListener(name, callback, el = document) {
		el.addEventListener(name, callback, EVENT_OPTIONS);
	}
	
	function removeListener(name, callback, el = document) {
		el.removeEventListener(name, callback, EVENT_OPTIONS);
	}
	
	function initSingleClick() {
		const conf = pref.get();
		const state = createSwitch(
			() => pref.get("singleClick") && !IS_BLACKLISTED,
			init, uninit
		);
		
		state.update();
		pref.onChange(change => {
			Object.assign(conf, change);
			state.update();
		});
		
		function init() {
			document.addEventListener("click", onClick);
		}
		
		function uninit() {
			document.removeEventListener("click", onClick);
		}
		
		function onClick(e) {
			if (e.target.nodeName !== "IMG" || !e.target.src || !testEvent(e)) {
				return;
			}
			downloadImage(e.target.src);
			e.preventDefault();
		}
		
		function testEvent(e) {
			return conf.singleClick &&
				e.ctrlKey === conf.singleClickCtrl &&
				e.altKey === conf.singleClickAlt &&
				e.shiftKey === conf.singleClickShift;
		}
	}
	
	function initDragndrop() {
		const state = createSwitch(
			() => pref.get("dragndrop") && !IS_BLACKLISTED,
			init, uninit
		);
		
		state.update();
		pref.onChange(state.update);
		
		function init() {
			document.addEventListener("dragstart", onDragStart);
			document.addEventListener("dragover", onDragOver);
			document.addEventListener("drop", onDrop);
		}
		
		function uninit() {
			document.removeEventListener("dragstart", onDragStart);
			document.removeEventListener("dragover", onDragOver);
			document.removeEventListener("drop", onDrop);
		}
		
		function onDragStart(e) {
			var img = e.target;
			if (img.nodeName == "A") {
				img = img.querySelector("img");
			}
			if (!img || img.nodeName != "IMG") return;
			e.dataTransfer.setData("imageSrc", img.src);
		}
		
		function onDragOver(e) {
			if (e.dataTransfer.getData("imageSrc")) {
				e.dataTransfer.dropEffect = "copy";
				e.preventDefault();
			}
		}
		
		function onDrop(e) {
			const imageSrc = e.dataTransfer.getData("imageSrc");
			if (imageSrc) {
				downloadImage(imageSrc);
				e.preventDefault();
			}
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
			closeTimer,
			decideHideTimer;
			
		const state = createSwitch(
			() => pref.get("downloadButton") && !IS_BLACKLISTED && !button,
			init, uninit
		);

		state.update();
		pref.onChange(state.update);
		
		function init() {
			addListener("mouseover", decideShowButton);
		}
		
		function uninit() {
			removeListener("mouseover", decideShowButton);
		}
		
		function isImage(el) {
			if (el.nodeName != "IMG") return false;
			var rect = el.getBoundingClientRect();
			if (rect.width < pref.get("downloadButtonMinWidth")) return false;
			if (rect.height < pref.get("downloadButtonMinHeight")) return false;
			return true;
		}
	
		function decideShowButton(e) {
			var el = e.target;
			if (image && image != el) {
				// move out
				clearTimeout(timer);
				timer = image = null;
			}
			if (!isImage(el)) {
				// not an image
				return;
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
		
		function decideHideButtonThrottled(e) {
			if (decideHideTimer) {
				return;
			}
			decideHideTimer = setTimeout(() => {
				decideHideTimer = null;
				decideHideButton(e);
			}, 0);
		}
		
		function decideHideButton(e) {
			var el = e.type == "mouseover" ? e.target : e.relatedTarget,
				_isImage = el && isImage(el);
			if (_isImage || el && el.closest(".image-picka-download-button")) {
				if (closeTimer != null) {
					clearTimeout(closeTimer);
					closeTimer = null;
				}
				if (_isImage && el != image) {
					image = el;
					updateButtonPosition();
				}
				return;
			}
			if (closeTimer == null) {
				closeTimer = setTimeout(() => {
					closeTimer = null;
					hideDownloadButton();
				}, pref.get("downloadButtonDelayHide"));
			}
		}
		
		function hideDownloadButton() {
			removeListener("mouseout", decideHideButtonThrottled);
			removeListener("mouseover", decideHideButtonThrottled);
			
			button.remove();
			image = button = null;
			state.update();
		}
		
		function showDownloadButton() {
			// detect mouse leaving from the image to outside window
			addListener("mouseout", decideHideButtonThrottled);
			// detect mouse entering to the image from outside window
			addListener("mouseover", decideHideButtonThrottled);
			
			createButton();
			document.body.appendChild(button);
			state.update();
		}
		
		function createButton() {
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
			updateButtonPosition();
			button.onclick = () => {
				downloadImage(image.src);
			};
		}
		
		function updateButtonPosition() {
			var rect = image.getBoundingClientRect();
			button.style.top = rect.top - 64 >= 0 ? rect.top - 64 + "px" : "0";
			button.style.left = rect.left ? rect.left + "px" : "0";
		}
	}
	
	function getEnv() {
		return {
			pageTitle: document.title,
			pageUrl: location.href
		};
	}
})();

