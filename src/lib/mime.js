// NOTE: the entire mime db is large, just hand pick what we need

export function fromContentType(contentType) {
  const match = contentType.match(/^\s*([^\s;]+)/);
  return match && match[1].toLowerCase();
}

export function fromExt(ext) {
  if (ext == "svg") return "image/svg+xml";
}

export function toExt(mime) {
  // this should be enough most of the time
  const match = mime.match(/^image\/(\w+)/);
  if (match) {
    return match[1]; 
  }
}
