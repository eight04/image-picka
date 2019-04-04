/* global throttle defer */
/* exported download */

const download = (() => {
  const tasks = new Map;
  const que = throttle();
  browser.downloads.onChanged.addListener(handleChange);
  return download;
  
  function handleChange(changes) {
    // FIXME: is it possible that the task state changes before the id is set?
		if (!changes.state || !tasks.has(changes.id)) {
			return;
		}
		const state = changes.state.current;
		if (state === "interrupted") {
      tasks.get(changes.id).q.reject(changes.error);
		} else if (state === "complete") {
      tasks.get(changes.id).q.resolve();
		}
  }
  
  function download(options, wait = false) {
    const task = {
      qStart: defer(),
      q: defer()
    };
    que.addCallback(done => {
      // always delete blob property
      const blob = options.blob;
      delete options.blob;
      if (/^data:/.test(options.url)) {
        // download API in Firefox can't handle cross origin blobs and data urls.
        fetch(options.url)
          .then(r => r.blob())
          .then(downloadBlob)
          .then(task.qStart.resolve, task.qStart.reject);
      } else if (blob) {
        downloadBlob(blob)
          .then(task.qStart.resolve, task.qStart.reject);
      } else {
        doDownload()
          .then(task.qStart.resolve, task.qStart.reject);
      }
      task.q.promise
        .catch(() => {})
        .then(cleanup);
        
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
        done();
      }
    });
    if (wait) {
      return task.q.promise;
    }
    return task.qStart.promise;
  }
})();
