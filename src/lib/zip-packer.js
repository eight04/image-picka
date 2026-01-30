import {makeZip} from "client-zip"
import {defer} from "./defer.js";

const EXT = "zip";

export function getZipPacker() {
  if (typeof navigator.storage?.getDirectory !== 'function') {
    throw new Error('File System Access API is not supported in this browser.');
  }
  const tempName = `temp-${Date.now()}-${Math.random().toString(16).slice(2)}.${EXT}`;
  let pendingPipe = null;
  let itemReady = defer();
  let zipReady = defer();
  return {
    prepare,
    pack,
    save,
    waitResponse: true,
    singleThread: true,
  }

  async function prepare() {
    const root = await navigator.storage.getDirectory();
    const handle = await root.getFileHandle(tempName, {create: true});
    const writable = await handle.createWritable();
    const zipStream = makeZip(async function*() {
      let item;
      while ((item = await itemReady.promise)) {
        yield item;
        zipReady.resolve();
        zipReady = defer();
      }
    }());
    pendingPipe = zipStream.pipeTo(writable);
  }

  async function pack({blob, filename}) {
    itemReady.resolve({
      name: filename,
      input: blob,
    });
    itemReady = defer();
    await zipReady.promise;
  }

  async function save() {
    itemReady.resolve(null); // signal end of items
    await pendingPipe;
    return {tempName, downloadName: `image-picka-${new Date().toISOString()}.${EXT}`};
  }
}
