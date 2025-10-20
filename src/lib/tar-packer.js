import {createTarPacker} from "modern-tar";

export function getTarPacker() {
  const tarName = `temp-${Date.now()}-${Math.random().toString(16).slice(2)}.tar`;
  const {readable, controller} = createTarPacker();
  let pendingPipe = null;
  return {
    prepare,
    pack,
    save,
    waitResponse: true,
    singleThread: true,
  }

  async function prepare() {
    const root = await navigator.storage.getDirectory();
    const handle = await root.getFileHandle(tarName, {create: true});
    const writable = await handle.createWritable();
    pendingPipe = readable.pipeTo(writable);
  }

  async function pack({blob, filename}) {
    const fileStream = controller.add({
      name: filename,
      size: blob.size,
      type: 'file',
    })
    // const writer = fileStream.getWriter();
    await blob.stream().pipeTo(fileStream);
  }

  async function save() {
    controller.finalize();
    await pendingPipe;
    return {tarName, downloadName: `image-picka-${new Date().toISOString()}.tar`};
  }
}
