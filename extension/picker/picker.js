/* global pref fetchBlob */

browser.runtime.onMessage.addListener(message => {
	switch (message.method) {
		case "init":
			init(message);
			return false;
	}
});

// tell background that the tab is ready
browser.runtime.sendMessage({method: "ping"});

function init(req) {
	var container = document.querySelector(".main-container"),
		frag = document.createDocumentFragment();
		
	for (const tab of req.tabs) {
		tab.images = tab.images.map(createImageCheckbox);
	}
	if (!req.isolateTabs) {
		const container = document.createElement("div");
		container.className = "image-container";
		req.tabs.forEach(t => t.images.forEach(i => container.appendChild(i.el)));
		frag.appendChild(container);
	} else {
		const ul = document.createElement("ul");
		ul.className = "tab-container";
		for (const tab of req.tabs) {
			if (!tab.images.length) {
				continue;
			}
			const li = document.createElement("li");
			li.className = "image-container";
			tab.images.forEach(i => li.appendChild(i.el));
			const counter = document.createElement("div");
			counter.className = "tab-image-counter";
			li.appendChild(counter);
			ul.appendChild(li);
		}
		frag.appendChild(ul);
	}
	
	container.appendChild(frag);
	
	var form = document.forms[0],
		inputs = form.querySelectorAll(".toolbar input, .toolbar select");
	pref.bindElement(form, inputs, true);
	
	pref.ready().then(() => initFilter(container, getImages()));
	
	var handler = {
		invert() {
			getImages().forEach(i => i.toggleCheck());
		},
		save() {
			const newReq = Object.assign({}, req, {
				method: "batchDownload",
				tabs: req.tabs.map(t => {
					return Object.assign({}, t, {images: getUrls(t.images)});
				})
			});
			browser.runtime.sendMessage(newReq);
			browser.runtime.sendMessage({method: "closeTab", opener: req.opener});
		},
		copyUrl() {
			const input = document.createElement("textarea");
			input.value = getUrls(getImages()).join("\n");
			document.body.appendChild(input);
			input.select();
			document.execCommand("copy");
			input.remove();
			if (!this.originalTextContent) {
				this.originalTextContent = this.textContent;
			}
			this.style.minWidth = this.offsetWidth + "px";
			this.textContent = browser.i18n.getMessage("pickerActionCopyUrlCopied");
			if (this.timer != null) {
				clearTimeout(this.timer);
			}
			this.timer = setTimeout(() => {
				this.textContent = this.originalTextContent;
				this.style.minWidth = "";
				this.timer = null;
			}, 1000);
		},
		cancel() {
			browser.runtime.sendMessage({method: "closeTab", opener});
		}
	};
	
	var actions = document.querySelector(".actions");
	for (var [cls, cb] of Object.entries(handler)) {
		actions.querySelector(`.${cls}`).onclick = cb;
	}
	
	function getUrls(images) {
		return images.filter(i => i.selected()).map(i => i.imgEl.src);
	}
	
	function getImages() {
		return [].concat(...req.tabs.map(t => t.images));
	}
}

function initFilter(container, images) {
	var conf = pref.get(),
		FILTER_OPTIONS = ["minFileSize", "minWidth", "minHeight", "matchUrl", "matchType"];
	if (conf.matchUrl) {
		conf.matchUrl = buildRe(conf.matchUrl);
	}
	
	pref.onChange(changes => {
		if (FILTER_OPTIONS.some(o => changes[o] != null)) {
			Object.assign(conf, changes);
			if (conf.matchUrl && typeof conf.matchUrl == "string") {
				conf.matchUrl = buildRe(conf.matchUrl);
			}
			filterAll();
		}
	});
	
	// some images are still loading
	container.addEventListener("imageLoad", e => {
		var {image} = e.detail;
		filter(image);
	});
	
	// some images are already loaded
	filterAll();
	
	function buildRe(re) {
		try {
			return new RegExp(re, "i");
		} catch (err) {
			console.error(err);
		}
		return null;
	}
	
	function valid({naturalWidth, naturalHeight, src, error, fileSize}) {
		return !error && 
			(!naturalWidth || naturalWidth >= conf.minWidth) &&
			(!naturalHeight || naturalHeight >= conf.minHeight) && 
			(!conf.matchUrl || 
				(conf.matchUrl.test(src) == (conf.matchType == "include"))) &&
			fileSize >= conf.minFileSize * 1024;
	}
	
	function filter(image) {
		image.toggleEnable(valid(image.imgEl));
	}

	function filterAll() {
		for (var image of images) {
			filter(image);
		}
	}
}

function createImageCheckbox(url) {
	// const button = document.createElement("button");
	const label = document.createElement("label");
	const input = document.createElement("input");
	const img = new Image;
	let ctrl;
	
	label.className = "image-checkbox checked";
	label.onclick = e => {
		if (e.target == input) {
			return;
		}
		const checked = input.checked;
		console.log(e);
		setTimeout(() => {
			if (input.checked == checked) {
				ctrl.toggleCheck();
			}
		});
	};
	
	input.type = "checkbox";
	input.checked = true;
	input.onchange = () => {
		label.classList.toggle("checked", input.checked);
	};
	
	// button.type = "button";
	img.title = url;
	img.src = url;
	// img.draggable = false; // for chrome
	img.ondragstart = () => false;
	// button.appendChild(img);
	label.append(input, img);
	
	load();
	
	return ctrl = {
		el: label,
		imgEl: img,
		toggleEnable(enable) {
			label.classList.toggle("disabled", !enable);
			input.disabled = !enable;
		},
		toggleCheck() {
			label.classList.toggle("checked");
			input.checked = !input.checked;
		},
		selected() {
			return !input.disabled && input.checked;
		}
	};
	
	function load() {
		Promise.all([loadImage(), loadFileSize(), pref.ready()])
			.then(() => {
				if (pref.get("displayImageSizeUnderThumbnail")) {
					const info = document.createElement("span");
					info.className = "image-checkbox-info";
					info.textContent = `${img.naturalWidth} x ${img.naturalHeight}`;
					img.parentNode.insertBefore(info, img.nextSibling);
				} else {
					if (img.naturalWidth) {
						img.title += ` (${img.naturalWidth} x ${img.naturalHeight})`;
					}
				}
				img.title += ` [${formatFileSize(img.fileSize)}]`;
				
				// default width for svg
				if (!img.naturalHeight) {
					img.style.width = "200px";
				}
			})
			.catch(err => {
				console.error(err);
				img.error = true;
			})
			.then(() => {
				// https://bugzilla.mozilla.org/show_bug.cgi?id=329509
				img.dispatchEvent(new CustomEvent("imageLoad", {
					bubbles: true,
					detail: {image: ctrl}
				}));
			});
	}
		
	function loadImage() {
		return new Promise((resolve, reject) => {
			img.onload = () => {
				img.onload = img.onerror = null;
				resolve();
			};
			img.onerror = err => {
				img.onload = img.onerror = null;
				reject(err);
			};
		});
	}
	
	function loadFileSize() {
		return fetchBlob(url).then(b => img.fileSize = b.size);
	}
}

function formatFileSize(size) {
	return `${(size / 1024).toFixed(2)} KB`;
}
