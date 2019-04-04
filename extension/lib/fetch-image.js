/* global fetchXHR contentDisposition throttle */
/* exported fetchImage */

const fetchImage = (() => {
	const que = throttle();
  return fetchImage;
  
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
