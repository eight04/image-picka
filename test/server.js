/* eslint-env node */
/* eslint no-console: 0 */

const http = require("http");
const fs = require("fs");
const {parse: urlParse} = require("url");
const {Throttle} = require("stream-throttle");
const mime = require("mime").default;
let i = 1;
const HANDLES = [
	{
		test: /^throttle\.png/,
		handle(req, res) {
			const image = fs.createReadStream(__dirname + "/test.png");
			image.pipe(new Throttle({rate: 100})).pipe(res);
		}
	},
  {
    test: /503\.png/,
    handle(req, res) {
      res.setHeader("Cache-Control", "no-cache");
      if (i++ % 10) {
        res.writeHead(503);
        res.end('503');
        return;
      }
			const image = fs.createReadStream(__dirname + "/test.png");
			image.pipe(res);
    }
  }
];
const server = http.createServer((req, res) => {
	console.log(`${new Date} ${req.method} ${req.url}`);
	let path = urlParse(req.url).pathname.slice(1);
	const contentType = mime.getType(path);
	if (contentType) {
		res.setHeader("Content-Type", contentType);
	}
	res.setHeader("Cache-Control", "public, max-age=31536000");
	const handle = HANDLES.find(h => h.test.test(path));
	if (handle) {
		handle.handle(req, res);
		return;
	}
	const file = fs.createReadStream(__dirname + "/" + path);
	file.on("error", () => {
		res.writeHead(404);
		res.end("404");
	});
	file.pipe(res);
});
server.listen(8080);
process.on("SIGINT", () => {
	process.exit();
});
require("node-sigint");
