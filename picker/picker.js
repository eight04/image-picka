browser.runtime.onMessage.addListener(message => {
	switch (message.method) {
		case "init":
			init(message);
	}
});

function init({images: urls}) {
	var container = document.createDocumentFragment(),
		images = [];
	for (var url of urls) {
		var image = createImageCheckbox(url);
		images.push(image);
		container.appendChild(image.el);
	}
	document.querySelector("#image-container").appendChild(container);
	
	
}

function createImageCheckbox(url) {
	var label = document.createElement("label"),
		img = new Image,
		input = document.createElement("input");	
	img.src = url;
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
		isChecked: () => input.checked
	};
}
