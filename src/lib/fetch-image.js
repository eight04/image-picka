import contentDisposition from "content-disposition";
import {createLock} from "@eight04/read-write-lock";
// import {fetchXHR} from "./fetch.js";

const lock = createLock({maxActiveReader: 5});

function getMime(contentType) {
  if (!contentType) {
    return;
  }
  const match = contentType.match(/^\s*([^\s;]+)/);
  return match && match[1].toLowerCase();
}

function getFilename(value) {
  try {
    return contentDisposition.parse(value).parameters.filename;
  } catch {
    // pass
  }
}

export function fetchImage(url, referrer) {
  return lock.read(async () => {
    const r = await fetch(url, {referrer});
    if (!r.ok) {
      throw new Error(`failed to fetch: ${r.status}`);
    }
    const blob = await r.blob();
    return {
      url,
      mime: getMime(r.headers.get("Content-Type")),
      filename: getFilename(r.headers.get("Content-Disposition")),
      blob,
      size: blob.size
    };
  });
}
