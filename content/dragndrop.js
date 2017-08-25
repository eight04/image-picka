document.addEventListener("dragend", e => {
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
}, true);

if (window.top == window) {
	browser.runtime.onMessage.addListener(message => {
		if (message.method == "getEnv") {
			return Promise.resolve(getEnv());
		}
	});
}

function getEnv() {
	return {
		pageTitle: document.title,
		pageUrl: location.href
	};
}
