import browser from "webextension-polyfill";
import versionCompare from 'version-compare';

import {defer} from "./defer.js";
import {getBrowserInfo} from './env.js';

const pBrowserInfo = getBrowserInfo();
const tasks = new Map;
browser.downloads.onChanged.addListener(handleChange);
  
function handleChange(changes) {
  // FIXME: is it possible that the task state changes before the id is set?
  const task = tasks.get(changes.id);
  if (!task) {
    return;
  }
  const state = changes.state && changes.state.current;
  const err = changes.error && changes.error.current;
  if (err) {
    task.q.reject(err);
  } else if (state === "complete") {
    task.completed = true;
    task.q.resolve();
  }
}
  
// options: {blob, oncomplete, erase, ...apiOptions}
export function download(options, wait = false) {
  const task = {
    q: defer()
  };
  // extract non-api options
  const {blob, erase, oncomplete} = options;
  delete options.blob;
  delete options.erase;
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
    if (task.completed && erase) {
      browser.downloads.erase({id: task.id})
        .catch(console.error);
    }
    if (oncomplete) {
      oncomplete();
    }
  }
}
