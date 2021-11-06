import browser from "webextension-polyfill";
import versionCompare from 'version-compare';

import {defer} from "./defer.js";
import {getBrowserInfo} from './env.js';

const pBrowserInfo = getBrowserInfo();
const tasks = new Map;
browser.downloads.onChanged.addListener(handleChange);
  
function handleChange(changes) {
  // FIXME: is it possible that the task state changes before the id is set?
  if (!tasks.has(changes.id)) {
    return;
  }
  const state = changes.state && changes.state.current;
  const err = changes.error && changes.error.current;
  if (err) {
    tasks.get(changes.id).q.reject(err);
  } else if (state === "complete") {
    tasks.get(changes.id).q.resolve();
  }
  }
  
// options: {blob, oncomplete, ...apiOptions}
export function download(options, wait = false) {
  const task = {
    q: defer()
  };
  // always delete blob property
  const blob = options.blob;
  delete options.blob;
  const oncomplete = options.oncomplete;
  delete options.oncomplete;
  let starting;
  if (blob) {
    starting = downloadBlob(blob);
  } else if (/^data:/.test(options.url)) {
    // download API in Firefox can't handle cross origin blobs and data urls.
    starting = fetch(options.url)
      .then(r => r.blob())
      .then(downloadBlob);
  } else {
    starting = doDownload().catch(rejectTask);
  }
  task.q.promise
    .catch(() => {})
    .then(cleanup);
  if (wait) {
    return task.q.promise;
  }
  return starting;
    
  function downloadBlob(blob) {
    task.blobUrl = URL.createObjectURL(blob);
    options.url = task.blobUrl;
    return doDownload().catch(rejectTask);
  }
  
  function rejectTask(err) {
    task.q.reject(err);
    throw err;
  }
  
  async function doDownload() {
    const info = await pBrowserInfo;
    if (
      options.url.startsWith('http') &&
      options.referrer &&
      info.name === "Firefox" &&
      versionCompare(info.version, "70") >= 0
    ) {
      if (!options.headers) {
        options.headers = [];
      }
      options.headers.push({
        name: 'Referer',
        value: options.referrer
      });
    }
    delete options.referrer;
    const id = await browser.downloads.download(options);
    task.id = id;
    tasks.set(id, task);
  }
  
  function cleanup() {
    if (task.blobUrl) {
      URL.revokeObjectURL(task.blobUrl);
      task.blobUrl = null;
    }
    if (task.id) {
      tasks.delete(task);
    }
    if (oncomplete) {
      oncomplete();
    }
  }
}
