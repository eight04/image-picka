/* global defer */
/* exported download */

const download = (() => {
  const tasks = new Map;
  browser.downloads.onChanged.addListener(handleChange);
  return download;
  
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
  function download(options, wait = false) {
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
      starting = doDownload();
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
      return doDownload();
    }
    
    function doDownload() {
      return browser.downloads.download(options)
        .then(id => {
          task.id = id;
          tasks.set(id, task);
        })
        .catch(err => {
          cleanup();
          throw err;
        });
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
})();
