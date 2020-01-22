import contentDisposition from "content-disposition";
import {createLock} from "@eight04/read-write-lock";
import {fetchXHR} from "./fetch.js";

const lock = createLock({maxActiveReader: 5});

function getMime(r) {
  const contentType = r.getResponseHeader("Content-Type");
  if (!contentType) {
    return;
  }
  const match = contentType.match(/^\s*([^\s;]+)/);
  return match && match[1].toLowerCase();
}

function getFilename(r) {
  try {
    const value = r.getResponseHeader("Content-Disposition");
    return contentDisposition.parse(value).parameters.filename;
  } catch (err) {
    // pass
  }
}

export function fetchImage(url) {
  return lock.read(() =>
    fetchXHR(url, "blob").then(r =>
      ({
        url,
        mime: getMime(r),
        filename: getFilename(r),
        size: r.response.size,
        blob: r.response
      })
    )
  );
}
