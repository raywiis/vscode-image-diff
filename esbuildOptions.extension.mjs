/**
 * @type {import('esbuild').BuildOptions}
 */
const buildOptions = {
  entryPoints: ['./src/extension.ts'],
  bundle: true,
  outfile: './out/extension.js',
  logLevel: 'info',
  metafile: true,
  minify: false,
  treeShaking: true,
  platform: 'browser',
  format: 'cjs',
  external: ['vscode'],
  loader: {
    ".wasm": 'binary',
  },
  define: {
    global: 'globalThis'
  },
  plugins: []
};

export default buildOptions;
