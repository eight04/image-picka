browser.runtime.onMessage.addListener(message => {
	switch (message.method) {
		case "downloadImage":
			return downloadImage(message);
		default:
			throw new Error("Unknown method");
	}
});

function downloadImage({url, pageTitle}) {
	var env = parsePath(url);
	env.pageTitle = pageTitle;
	var filePattern = "Image Picker/${pageTitle}/${name}${ext}",
		filename = buildFilename(filePattern, env);
		
	return browser.downloads.download({url, filename});
}

var escapeTable = {
	"/": "／",
	"\\": "＼",
	"?": "？",
	"|": "｜",
	"<": "＜",
	">": "＞",
	":": "：",
	"\"": "＂",
	"*": "＊"
};

function escapeFilename(name) {
	return name.replace(/[/\\?|<>:"*]/g, m => escapeTable[m]);
}

function buildFilename(pattern, env) {
	for (var [key, value] of Object.entries(env)) {
		env[key] = escapeFilename(value);
	}
	return pattern.replace(/\${(\w+?)}/g, (m, key) => env[key] ? env[key] : m);
}

var DEFAULT_EXT = ".jpg";

function parsePath(url) {
	url = new URL(url);
	var base = url.pathname.match(/[^/]+$/)[0];
	
	// split name, ext
	var name, ext;
	try {
		[, name, ext] = base.match(/^(.+)(\.(?:jpg|png|gif|jpeg))\b/i);
	} catch (err) {
		name = base;
		ext = DEFAULT_EXT;
	}
	
	return {
		base,
		name: nestDecodeURIComponent(name),
		ext: ext.toLowerCase()
	};
}

function nestDecodeURIComponent(s) {
	while (/%[0-9a-f]{2}/i.test(s)) {
		try {
			s = decodeURIComponent(s);
		} catch (err) {
			break;
		}
	}
	return s;
}
