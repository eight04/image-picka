import cjs from "rollup-plugin-cjs-es";
import resolve from "rollup-plugin-node-resolve";
import copy from 'rollup-plugin-copy-glob';
import shim from "rollup-plugin-shim";

export default {
  input: "src/background.js",
  output: {
    format: "es",
    dir: "build/js"
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
    ])
  ]
};
