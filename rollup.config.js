import fs from "fs";

import cjs from "rollup-plugin-cjs-es";
import resolve from "rollup-plugin-node-resolve";
import copy from 'rollup-plugin-copy-glob';
import shim from "rollup-plugin-shim";
import iife from "rollup-plugin-iife";
import {terser} from "rollup-plugin-terser";

import fg from "fast-glob";

export default {
  input: fg.sync(["src/*.js"]),
  output: {
    format: "es",
    dir: "build/js",
    sourcemap: true
  },
  plugins: [
    shim({
      path: `
        export function basename(s) {
          const parts = s.split(/[\\/]/);
          return parts[parts.length - 1];
        }
      `,
      "safe-buffer": `
        export class Buffer {
          constructor(s) {
            this.s = s;
          }
          static from(binary) {
            return new Buffer(binary);
          }
          toString() {
            const bytes = new Uint8Array(this.s.length);
            for (let i = 0; i < this.s.length; i++) {
              bytes[i] = this.s.charCodeAt(i);
            }
            return new TextDecoder("utf-8").decode(bytes);
          }
        }
      `
    }),
    resolve(),
    cjs({
      nested: true
    }),
    copy([
      {
        files: "src/static/**/*",
        dest: "build"
      }
    ]),
    false && terser(),
    iife(),
    {
      writeBundle(bundle) {
        const manifest = JSON.parse(fs.readFileSync("build/manifest.json", "utf8"));
        manifest.background.scripts = [
          ...bundle["background.js"].imports.map(f => `js/${f}`),
          "js/background.js"
        ];
        manifest.content_scripts[0].js = [
          ...bundle["content.js"].imports.map(f => `js/${f}`),
          "js/content.js"
        ];
        fs.writeFileSync("build/manifest.json", JSON.stringify(manifest, null, 2));
        for (const js of Object.keys(bundle)) {
          const file = js.split(".")[0];
          let text;
          try {
            text = fs.readFileSync(`build/${file}.html`, "utf8");
          } catch (err) {
            continue;
          }
          const scripts = [
            ...bundle[`${file}.js`].imports.map(f => `js/${f}`),
            `js/${file}.js`
          ];
          const html = scripts.map(s => `<script src="${s}"></script>`).join("\n");
          fs.writeFileSync(`build/${file}.html`, text.replace("</body>", `${html}\n</body>`));
        }
      }
    }
  ]
};
