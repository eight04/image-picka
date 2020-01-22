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
    iife(),
    terser({
      module: false
    }),
    injectEntries({
      prefix: "js/",
      transforms: [
        {
          test: /background\.js/,
          file: "build/manifest.json",
          transform: (entries, obj) => {
            obj.background.scripts = entries;
            return obj;
          }
        },
        {
          test: /content\.js/,
          file: "build/manifest.json",
          transform: (entries, obj) => {
            obj.content_scripts[0].js = entries;
            return obj;
          }
        },
        {
          test: /(dialog|options|picker)\.js/,
          file: "build/$1.html",
          transform: (entries, text) => {
            const html = entries.map(s => `<script src="${s}"></script>`).join("\n");
            return text.replace("</body>", `${html}\n</body>`);
          }
        }
      ]
    })
  ]
};

function injectEntries({prefix = "", transforms}) {
  return {
    name: "rollup-plugin-inject-entries",
    writeBundle
  };
  
  function writeBundle(bundle) {
    for (const key in bundle) {
      let match, transform;
      for (const trans of transforms) {
        match = key.match(trans.test);
        if (match) {
          transform = trans;
          break;
        }
      }
      if (!match) continue;
      const entries = [
        ...bundle[key].imports.map(f => prefix + f),
        prefix + key
      ];
      const file = transform.file.replace(/\$(\d+)/, (m, n) => match[Number(n)]);
      let content = fs.readFileSync(file, "utf8");
      if (file.endsWith(".json")) {
        content = JSON.parse(content);
      }
      let output = transform.transform(entries, content);
      if (typeof output !== "string") {
        output = JSON.stringify(output, null, 2);
      }
      fs.writeFileSync(file, output);
    }
  }
}
