import cjs from "rollup-plugin-cjs-es";
import resolve from "@rollup/plugin-node-resolve";
import {copy} from '@web/rollup-plugin-copy';
import shim from "rollup-plugin-shim";
import iife from "rollup-plugin-iife";
import terser from "@rollup/plugin-terser";
import output from "rollup-plugin-write-output";
import json from "@rollup/plugin-json";
import { babel } from '@rollup/plugin-babel';

import glob from "tiny-glob";

export default async () => ({
  input: await glob("src/*.js"),
  output: {
    format: "es",
    dir: "build",
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
    resolve({
      exportConditions: [
        'node'
      ]
    }),
    json(),
    cjs({
      nested: true
    }),
    babel({
      babelHelpers: 'bundled',
      presets: [
        ['@babel/preset-env', {
          targets: {
            firefox: '68',
          },
          modules: false,
          bugfixes: true,
          // shippedProposals: true
        }]
      ],
    }),
    copy({
      patterns: "**/*",
      rootDir: "src/static"
    }),
    iife(),
    // terser({
    //   module: false
    // }),
    output([
      {
        test: /background\.js$/,
        target: "build/manifest.json",
        handle: (json, {scripts}) => {
          json.background.scripts = scripts;
          return json;
        }
      },
      {
        test: /content\.js$/,
        target: "build/manifest.json",
        handle: (json, {scripts}) => {
          json.content_scripts[0].js = scripts;
          return json;
        }
      },
      {
        test: /(dialog|options|picker)\.js$/,
        target: "build/$1.html",
        handle: (content, {htmlScripts}) => {
          return content.replace("</body>", `${htmlScripts}\n</body>`);
        }
      }
    ])
  ]
});
