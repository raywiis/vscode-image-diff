import { nodeResolve } from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import css from "rollup-plugin-css-only";

// TODO: Switch to esbuild bro....
export default {
  input: "src/webview/viewer.js",
  output: {
    dir: "out/webview",
    format: "iife",
  },
  plugins: [
    nodeResolve(),
    css({
      output: "style.css",
    }),
    typescript({ module: "esnext", outDir: "out/webview" }),
  ],
};
