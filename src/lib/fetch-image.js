import contentDisposition from "content-disposition";
import {createLock} from "@eight04/read-write-lock";
import * as mimelib from "./mime.js";

const lock = createLock({maxActiveReader: 5});

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
    return createImage(url, blob, r.headers.get("Content-Type"), r.headers.get("Content-Disposition"));
  });
}

export function createImage(url, blob, contentType, contentDisposition) {
  let mime, ext, filename;
  if (contentType) {
    mime = mimelib.fromContentType(contentType);
  }
  if (contentDisposition) {
    filename = getFilename(contentDisposition);
    ext = filename?.match(/\.([^.]+)$/)?.[1];
  }
  if (!mime && ext) {
    mime = mimelib.fromExt(ext)
  }
  if (!mime && blob.type) {
    mime = blob.type;
  }
  if (mime && !ext) {
    ext = mimelib.toExt(mime);
  }
  if (mime && !blob.type) {
    // create a new blob with correct mime type
    blob = new Blob([blob], {type: mime});
  }
  return {
    url,
    blob,
    mime,
    ext,
    filename,
    size: blob.size
  };
}

