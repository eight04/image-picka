/* global pref */

browser.runtime.onMessage.addListener(message => {
	switch (message.method) {
		case "init":
			init(message);
	}
});

function init({images: urls, env, opener}) {
	var container = document.querySelector("#image-container"),
		frag = document.createDocumentFragment(),
		images = [];
	for (var url of urls) {
		var image = createImageCheckbox(url);
		images.push(image);
		frag.appendChild(image.el);
	}
	container.appendChild(frag);
	
	var form = document.forms[0],
		inputs = form.querySelectorAll(".toolbar input, .toolbar select");
	pref.bindElement(form, inputs, true);
	
	pref.ready().then(() => initFilter(container, images));
	
	var handler = {
		invert() {
			for (var image of images) {
				image.toggleCheck();
			}
		},
		save() {
			browser.runtime.sendMessage({
				method: "batchDownload",
				urls: images.filter(i => i.selected()).map(i => i.imgEl.src),
				env
			});
			browser.runtime.sendMessage({method: "closeTab", opener});
		},
		cancel() {
			browser.runtime.sendMessage({method: "closeTab", opener});
		}
	};
	
	var actions = document.querySelector(".actions");
	for (var [cls, cb] of Object.entries(handler)) {
		actions.querySelector(`.${cls}`).onclick = cb;
	}
}

function initFilter(container, images) {
	var conf = pref.get(),
		FILTER_OPTIONS = ["minWidth", "minHeight", "matchUrl", "matchType"];
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
	
	function valid({naturalWidth, naturalHeight, src}) {
		return (!naturalWidth || naturalWidth >= conf.minWidth) &&
			(!naturalHeight || naturalHeight >= conf.minHeight) && 
			(!conf.matchUrl || 
				(conf.matchUrl.test(src) == (conf.matchType == "include")));
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
	var label = document.createElement("label"),
		img = new Image,
		input = document.createElement("input"),
		enable = true,
		ctrl;	
	img.src = url;
	img.title = url;
	img.onload = () => {
		img.onload = null;
		if (img.naturalWidth) {
			img.title += ` (${img.naturalWidth} x ${img.naturalHeight})`;
		} else {
			img.style.width = "200px";
		}
		img.dispatchEvent(new CustomEvent("imageLoad", {
			bubbles: true,
			detail: {image: ctrl}
		}));
	};
	input.type = "checkbox";
	input.checked = true;
	input.onchange = () => {
		label.classList.toggle("checked", input.checked);
	};
	label.appendChild(img);
	label.appendChild(input);
	label.className = "image-checkbox checked";
	return ctrl = {
		el: label,
		imgEl: img,
		toggleEnable(_enable) {
			enable = _enable;
			label.classList.toggle("disable", !enable);
			input.disabled = !enable;
		},
		toggleCheck() {
			label.classList.toggle("checked");
			input.checked = !input.checked;
		},
		selected() {
			return enable && input.checked;
		}
	};
}
