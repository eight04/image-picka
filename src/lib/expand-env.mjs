import imageExtensions from "image-extensions";
import {pref} from "./pref.js";

const IMG_RE = new RegExp("^(.+)(\\.(?:" + imageExtensions.join("|") + "))\\b", "i");

export function expandEnv(env) {
	// image url
	var url = new URL(env.url);
	env.hostname = url.hostname;
	
	// image filename
	var base, name, ext;
	if (env.base) {
		base = env.base;
	} else {
		try {
			base = url.href.match(/([^/]+)\/?$/)[1];
		} catch (err) {
			base = pref.get("defaultName");
		}
	}
	try {
		[, name, ext] = base.match(IMG_RE);
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
  env.pageName = pathToName(url.pathname);
}

function pathToName(path) {
  const base = path.match(/\/([^/]*)\/?$/)[1];
  const i = base.lastIndexOf(".");
  if (i < 0) return base;
  return base.slice(0, i);
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

