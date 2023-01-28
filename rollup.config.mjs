import {nodeResolve} from '@rollup/plugin-node-resolve';

export default {
  input: 'src/webview/viewer.js',
  output: {
    dir: 'out/webview',
    format: 'iife'
  },
  plugins: [nodeResolve()]
};
