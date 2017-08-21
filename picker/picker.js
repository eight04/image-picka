/* global pref */

browser.runtime.onMessage.addListener(message => {
	switch (message.method) {
		case "init":
			init(message);
	}
});

function init({images: urls, env}) {
	var container = document.createDocumentFragment(),
		images = [];
	for (var url of urls) {
		var image = createImageCheckbox(url);
		images.push(image);
		container.appendChild(image.el);
	}
	document.querySelector("#image-container").appendChild(container);
	
	var form = document.forms[0],
		inputs = form.querySelectorAll(".toolbar input");
	pref.bindElement(form, inputs, true);
	
	pref.ready().then(() => initFilter(images));
	
	var handler = {
		invert() {
			for (var image of images) {
				image.toggleCheck();
			}
		},
		save() {
			browser.runtime.sendMessage({
				method: "batchDownload",
				images: images.filter(i => i.selected()).map(i => i.imgEl.src),
				env
			});
			window.close();
		},
		cancel() {
			window.close();
		}
	};
	
	for (var [cls, cb] of Object.entries(handler)) {
		document.querySelector(cls).onclick = cb;
	}
}

function initFilter(images) {
	var conf = pref.get(),
		FILTER_OPTIONS = ["minWidth", "minHeight", "matchUrl"];
	if (conf.matchUrl) {
		conf.matchUrl = buildRe(conf.matchUrl);
	}
	
	pref.onChange(changes => {
		if (FILTER_OPTIONS.some(o => changes[o] != null)) {
			Object.assign(conf, changes);
			if (conf.matchUrl && typeof conf.matchUrl == "string") {
				conf.matchUrl = buildRe(conf.matchUrl);
			}
			filter();
		}
	});
	
	filter();
	
	function buildRe(re) {
		try {
			return new RegExp(re, "i");
		} catch (err) {
			console.log(err);
		}
		return null;
	}
	
	function valid({naturalWidth, naturalHeight, src}) {
		console.log(naturalWidth, naturalHeight, src);
		return naturalWidth >= conf.minWidth &&
			naturalHeight >= conf.minHeight && 
			(!conf.matchUrl || conf.matchUrl.test(src));
	}

	function filter() {
		for (var image of images) {
			image.toggleEnable(valid(image.imgEl));
		}
	}
}

function createImageCheckbox(url) {
	var label = document.createElement("label"),
		img = new Image,
		input = document.createElement("input"),
		enable = true;	
	img.src = url;
	img.title = url;
	img.onload = () => {
		img.onload = null;
		if (!img.naturalWidth) {
			img.style.width = "200px";
		}
	};
	input.type = "checkbox";
	input.checked = true;
	input.onchange = () => {
		label.classList.toggle("checked", input.checked);
	};
	label.appendChild(img);
	label.appendChild(input);
	label.className = "image-checkbox checked";
	return {
		el: label,
		imgEl: img,
		toggleEnable(_enable) {
			enable = _enable;
			label.classList.toggle("disable", !enable);
			input.disabled = !enable;
		},
		toggleCheck() {
			input.checked = !input.checked;
		},
		selected() {
			return enable && input.checked;
		}
	};
}
