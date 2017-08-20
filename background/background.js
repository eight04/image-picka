/* global pref */

browser.runtime.onMessage.addListener(message => {
	switch (message.method) {
		case "downloadImage":
			return downloadImage(message);
		default:
			throw new Error("Unknown method");
	}
});

function downloadImage({env}) {
	expandEnv(env);
	var filePattern = pref.get("filePattern"),
		filename = buildFilename(filePattern, env);
		
	return browser.downloads.download({url: env.url, filename});
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

function expandEnv(env) {
	// image url
	var url = new URL(env.url);
	env.hostname = url.hostname;
	
	// image filename
	var base = url.pathname.match(/[^/]+$/)[0],
		name, ext;
	try {
		[, name, ext] = base.match(/^(.+)(\.(?:jpg|png|gif|jpeg))\b/i);
	} catch (err) {
		name = base;
		ext = pref.get("defaultExt");
	}
	env.base = nestDecodeURIComponent(base);
	env.name = nestDecodeURIComponent(name);
	env.ext = nestDecodeURIComponent(ext);
	
	// page url
	url = new URL(env.pageUrl);
	env.pageHostname = url.hostname;
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
