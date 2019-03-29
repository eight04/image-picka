/* global fetchXHR contentDisposition */
/* exported fetchImage */

const fetchImage = (() => {
	const que = throttle();
  return fetchImage;
  
	function throttle(size = 5) {
		const waiting = [];
		let running = 0;
		return {add};
		
		function add(fn) {
			const task = deferred();
			task.fn = fn;
			waiting.push(task);
			deque();
			return task.promise;
		}
		
		function deque() {
			if (!waiting.length || running >= size) {
				return;
			}
			const task = waiting.shift();
			running++;
			const pending = task.fn();
			pending.then(task.resolve, task.reject);
			pending
				.catch(() => {})
				.then(() => {
					running--;
					deque();
				});
		}
	}
	
	function deferred() {
		const o = {};
		o.promise = new Promise((resolve, reject) => {
			o.resolve = resolve;
			o.reject = reject;
		});
		return o;
	}

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
	
  function fetchImage(url) {
		return que.add(() =>
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
})();
