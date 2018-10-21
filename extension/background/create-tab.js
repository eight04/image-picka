/* exported createTabAndWait */

const createTabAndWait = (() => {
	const supportOpener = checkSupportOpener();
	return createAndWait;
	
	function createAndWait(options) {
		let tabId;
		let openerTabId;
		const removedTabs = new Set;
		const {promise, resolve, reject} = deferred();
		browser.tabs.onRemoved.addListener(handleRemove);
		create()
			.then(tab => {
				if (removedTabs.has(tab.id)) {
					resolve();
					cleanup();
					return;
				}
				tabId = tab.id;
			})
			.catch(err => {
				reject(err);
				cleanup();
			});
		return promise;
		
		function deferred() {
			const o = {};
			o.promise = new Promise((resolve, reject) => {
				o.resolve = resolve;
				o.reject = reject;
			});
			return o;
		}
		
		function cleanup() {
			browser.tabs.onRemoved.removeListener(handleRemove);
		}
		
		function create() {
			if (options.openerTabId == null) {
				return browser.tabs.create(options);
			}
			return supportOpener.then(ok => {
				if (!ok) {
					openerTabId = options.openerTabId;
					delete options.openerTabId;
				}
				return browser.tabs.create(options);
			});
		}
		
		function handleRemove(removedTabId) {
			if (tabId == null || tabId !== removedTabId) {
				removedTabs.add(removedTabId);
				return;
			}
			resolve();
			cleanup();
			if (openerTabId != null) {
				supportOpener.then(ok => {
					if (!ok) {
						browser.tabs.update(openerTabId, {active: true})
							.catch(console.warn);
					}
				});
			}
		}
	}
	
	function checkSupportOpener() {
		return getBrowserInfo()
			.then(info => {
				if (!info) {
					return false;
				}
				const name = info.name.toLowerCase();
				const version = Number(info.version.split(".")[0]);
				return (
					name === "firefox" && version >= 57 ||
					name === "chrome" && version >= 18
				);
			});
	}

	function getBrowserInfo() {
		if (browser.runtime.getBrowserInfo) {
			return browser.runtime.getBrowserInfo();
		}
		return new Promise(resolve => {
			const match = navigator.userAgent.match(/(firefox|chrome)\/([\d.]+)/i);
			if (match) {
				resolve({
					name: match[1],
					version: match[2]
				});
			} else {
				resolve(null);
			}
		});
	}
})();
