/* global pref getImageSrc */
/* exported initDownloadSingleImage */

function initDownloadSingleImage({downloadImage}) {
	const EVENT_OPTIONS = {passive: true};	
	let IS_BLACKLISTED = false;
	
	pref.ready().then(() => {
		initBlackList();
		initDragndrop();
		initDownloadButton();
		initClick();
	});
	
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
				.some(pattern => {
					if (pattern.startsWith("*.")) {
						return location.hostname.endsWith(pattern.slice(1));
					}
					return pattern === location.hostname;
				});
		}
	}
	
	function addListener(name, callback, el = document) {
		el.addEventListener(name, callback, EVENT_OPTIONS);
	}
	
	function removeListener(name, callback, el = document) {
		el.removeEventListener(name, callback, EVENT_OPTIONS);
	}
	
	function initClick() {
		const conf = pref.get();
		const contexts = [{
			prefix: "single",
			eventName: "click"
		}, {
			prefix: "dbl",
			eventName: "dblclick"
		}];
		
		// initialize context
		for (const context of contexts) {
			context.state = createSwitch(
				() => pref.get(`${context.prefix}Click`) && !IS_BLACKLISTED && pref.get("enabled"),
				() => init(context),
				() => uninit(context)
			);
			context.handleEvent = e => onClick(e, context);
		}
		
		contexts.forEach(c => c.state.update());
		pref.onChange(change => {
			Object.assign(conf, change);
			contexts.forEach(c => c.state.update());
		});
		
		function init(context) {
			document.addEventListener(context.eventName, context.handleEvent);
		}
		
		function uninit(context) {
			document.removeEventListener(context.eventName, context.handleEvent);
		}
		
		function onClick(e, context) {
			if (e.target.nodeName !== "IMG" || !testEvent(e, context)) {
				return;
			}
			const imageSrc = getImageSrc(e.target);
			if (!imageSrc) {
				return;
			}
			downloadImage(imageSrc);
			e.preventDefault();
		}
		
		function testEvent(e, context) {
			return e.ctrlKey === conf[`${context.prefix}ClickCtrl`] &&
				e.altKey === conf[`${context.prefix}ClickAlt`] &&
				e.shiftKey === conf[`${context.prefix}ClickShift`];
		}
	}
	
	function initDragndrop() {
		const state = createSwitch(
			() => pref.get("dragndrop") && !IS_BLACKLISTED && pref.get("enabled"),
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
			e.dataTransfer.setData("imageSrc", getImageSrc(img));
		}
		
		function onDragOver(e) {
			// https://stackoverflow.com/questions/9534677/html5-drag-and-drop-getdata-only-works-on-drop-event-in-chrome
			if (e.dataTransfer.getData("imageSrc") || isChrome()) {
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
	
	function initDownloadButton() {
		var timer,
			image,
			button,
			closeTimer,
			decideHideTimer;
			
		const state = createSwitch(
			() => pref.get("downloadButton") && !IS_BLACKLISTED && !button && pref.get("enabled"),
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
				width: ${pref.get("downloadButtonSize")}px;
				height: ${pref.get("downloadButtonSize")}px;
				cursor: pointer;
				position: fixed;
				z-index: 2147483647;
				background-image: url(${browser.runtime.getURL("/public/download-button.svg")});
				background-size: cover;
				opacity: 0.85;
			`;
			updateButtonPosition();
			button.onclick = () => {
				downloadImage(getImageSrc(image));
			};
		}
		
		function calcPos(base, size, tag, low, high) {
			if (tag.startsWith(low)) {
				if (tag.endsWith("OUTSIDE")) {
					return base - pref.get("downloadButtonSize");
				} else {
					return base;
				}
			} else if (tag.startsWith(high)) {
				if (tag.endsWith("INSIDE")) {
					return base + size - pref.get("downloadButtonSize");
				} else {
					return base + size;
				}
			} else {
				return base + (size - pref.get("downloadButtonSize")) / 2;
			}
		}
		
		function updateButtonPosition() {
			const rect = image.getBoundingClientRect();
			const left = calcPos(rect.left, rect.width, pref.get("downloadButtonPositionHorizontal"), "LEFT", "RIGHT");
			const top = calcPos(rect.top, rect.height, pref.get("downloadButtonPositionVertical"), "TOP", "BOTTOM");
			button.style.left = Math.max(Math.min(left, document.documentElement.clientWidth - pref.get("downloadButtonSize")), 0) + "px";
			button.style.top = Math.max(Math.min(top, document.documentElement.clientHeight - pref.get("downloadButtonSize")), 0) + "px";
		}
	}
	
	function isChrome() {
		return chrome.app;
	}
}
