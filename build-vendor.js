/* eslint-env node */
const shell = require("shelljs");

const files = [
	"content-disposition-bundle/dist/content-disposition.min.js",
	"expression-eval-bundle/dist/expression-eval.min.js",
	"webext-menus/dist/webext-menus.min.js",
	"webextension-polyfill/dist/browser-polyfill.min.js",
  "@drecom/idb-cache/dist/idb-cache.min.js"
];

shell.rm("-rf", "extension/vendor/*");
shell.cp(files.map(f => `node_modules/${f}`), "extension/vendor");
