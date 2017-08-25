document.addEventListener("dragend", e => {
	var img = e.target;
	if (img.nodeName == "A") {
		img = img.querySelector("img");
	}
	if (!img || img.nodeName != "IMG") return;
	
	browser.runtime.sendMessage({
		method: "downloadImage",
		url: img.src,
		env: {
			url: img.src,
			pageTitle: window.top.document.title,
			pageUrl: window.top.location.href
		}
	});
}, true);
