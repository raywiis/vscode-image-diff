import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';


/**
 * @type {import('esbuild').BuildOptions}
 */
const buildOptions = {
  entryPoints: ['./src/extension.ts'],
  bundle: true,
  outfile: './out/extension.js',
  logLevel: 'info',
  sourcemap: 'inline',
  platform: 'browser',
  format: 'cjs',
  external: ['vscode'],
  define: {
    global: 'globalThis'
  },
  plugins: [
    NodeGlobalsPolyfillPlugin({
      process: true,
      buffer: true
    }),
  ]
};

export default buildOptions;
