import browser from "webextension-polyfill";

import * as imageUtil from "./image-util.js";
import {IS_CHROME} from "./env.js";
import {pref} from "./pref.js";

export default function init({downloadImage}) {
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
    
    function current() {
      return state;
    }
		
		return {update, current};
	}
	
	function initBlackList() {
		update();
		pref.on("change", change => {
			if (change.blacklist != null) {
				update();
			}
		});
		
		function update() {
			IS_BLACKLISTED = pref.get("blacklist").split("\n")
				.some(pattern => {
          if (!pattern) return false;
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
		pref.on("change", () => {
			contexts.forEach(c => c.state.update());
		});
		
		function init(context) {
			document.addEventListener(context.eventName, context.handleEvent);
		}
		
		function uninit(context) {
			document.removeEventListener(context.eventName, context.handleEvent);
		}
		
		function onClick(e, context) {
			if (!imageUtil.isImage(e.target) || !testEvent(e, context)) {
				return;
			}
			const imageSrc = imageUtil.getSrcFromElement(e.target);
			if (!imageSrc) {
				return;
			}
			downloadImage({
        url: imageSrc,
        referrerPolicy: e.target.referrerPolicy || undefined,
        alt: e.target.alt
      });
			e.preventDefault();
		}
		
		function testEvent(e, context) {
			return e.ctrlKey === pref.get(`${context.prefix}ClickCtrl`) &&
				e.altKey === pref.get(`${context.prefix}ClickAlt`) &&
				e.shiftKey === pref.get(`${context.prefix}ClickShift`);
		}
	}
	
	function initDragndrop() {
		const state = createSwitch(
			() => pref.get("dragndrop") && !IS_BLACKLISTED && pref.get("enabled"),
			init, uninit
		);
		
		state.update();
		pref.on("change", state.update);
		
		function init() {
      document.addEventListener("dragstart", onDragStart);
    }
    
    function uninit() {
      document.removeEventListener("dragstart", onDragStart);
    }
		
		function onDragStart(e) {
			var img = e.target;
			if (img.nodeName == "A") {
				img = [...img.querySelectorAll("img")].find(i => i.offsetParent);
			}
			if (!img || !imageUtil.isImage(img)) return;
      
      const events = [
        ["dragover", dragOver, pref.get("dragndropHard")],
        ["drop", drop, pref.get("dragndropHard")],
        ["dragend", dragEnd]
      ];
      for (const args of events) {
        document.addEventListener(...args);
      }
      
      function dragOver(e) {
				e.dataTransfer.dropEffect = "copy";
				e.preventDefault();
        if (pref.get("dragndropHard")) {
          e.stopPropagation();
        }
      }
      
      function drop(e) {
        if (!IS_CHROME && e.buttons) {
          // cancel download when clicking other buttons
          e.preventDefault();
          return;
        }
        downloadImage({
          url: imageUtil.getSrcFromElement(img),
          referrerPolicy: img.referrerPolicy || undefined,
          alt: img.alt
        });
        e.preventDefault();
      }
      
      function dragEnd() {
        for (const args of events) {
          document.removeEventListener(...args);
        }
      }
		}
	}
	
	function initDownloadButton() {
		var timer,
			image,
			button,
			closeTimer,
			decideHideTimer;
    let buttonAni;
			
		const state = createSwitch(
			() => pref.get("downloadButton") && !IS_BLACKLISTED && !button && pref.get("enabled"),
			init, uninit
		);

		state.update();
		pref.on("change", state.update);
		
		function init() {
			addListener("mouseover", decideShowButton);
		}
		
		function uninit() {
			removeListener("mouseover", decideShowButton);
		}
		
		function isImage(el) {
			if (!imageUtil.isImage(el)) return false;
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
      const url = browser.runtime.getURL("/images/download-button.svg");
			button.style = `
				width: ${pref.get("downloadButtonSize")}px;
				height: ${pref.get("downloadButtonSize")}px;
				cursor: pointer;
				position: fixed;
				z-index: 2147483647;
				background-image: url(${url});
				background-size: cover;
				opacity: 0.85;
			`;
			updateButtonPosition();
			button.onclick = () => {
        buttonAni = fadeOut(button);
				downloadImage({
          url: imageUtil.getSrcFromElement(image),
          referrerPolicy: image.referrerPolicy || undefined,
          alt: image.alt
        });
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
			const maxLeft = document.documentElement.clientWidth - pref.get("downloadButtonSize");
      // https://bugzilla.mozilla.org/show_bug.cgi?id=1610734
      const maxTop = (document.documentElement.clientHeight || document.body.clientHeight) - pref.get("downloadButtonSize");
      
      button.style.left = Math.max(Math.min(left, maxLeft), 0) + "px";
			button.style.top = Math.max(Math.min(top, maxTop), 0) + "px";
      if (buttonAni) {
        buttonAni.cancel();
      }
		}
	}
	
  function fadeOut(el) {
    try {
      // security error in waterfox
      // https://github.com/eight04/image-picka/issues/170
      return el.animate([
        {
          opacity: 1,
          transform: "scale(1.1)"
        },
        {
          opacity: 0,
          transform: "none"
        }
      ], {
        duration: 600,
        fill: "forwards"
      });
    } catch {
      el.style.opacity = 0;
      return {
        cancel: () => {
          el.style.opacity = 1;
        }
      };
    }
  }
}
