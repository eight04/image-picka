import imageExtensions from "image-extensions";
import {pref} from "./pref.js";

// FIXME: https://github.com/arthurvr/image-extensions/issues/37
imageExtensions.push("jpe", "jif", "jfi");

const IMG_RE = new RegExp("^(.+)(\\.(?:" + imageExtensions.join("|") + "))\\b", "i");

function createDateString(date) {
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())} ${pad(date.getMinutes())} ${pad(date.getSeconds())}`;
	function pad(n) {
		return String(n).padStart(2, "0");
	}
}

export function expandDate(env) {
  const date = new Date;
  env.date = date;
  env.dateString = createDateString(date);
}

/*
const props = {
  index,
  url,
  base,
  alt
}
*/
export function expandEnv(env) {
	// image url
	var url = new URL(env.url);
	env.hostname = url.hostname;
	
	// image filename
  let {base, ext, name} = env;

  if (!base) {
		try {
			base = url.href.match(/([^/]+)\/?$/)[1];
		} catch {
			base = pref.get("defaultName");
		}
	}
  if (!name) {
    const match = base.match(IMG_RE);
    if (match) {
      name = match[1];
      ext = ext || match[2];
    } else {
      // base is not like an image filename?
      name = base;
      ext = ext || pref.get("defaultExt");
    }
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
		} catch {
			break;
		}
	}
	return s;
}

