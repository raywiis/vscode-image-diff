/**
 * @type {import('esbuild').BuildOptions}
 */
const buildOptions = {
  entryPoints: ['./src/webview/viewer.ts'],
  bundle: true,
  metafile: true,
  outfile: './out/webview/viewer.js',
  logLevel: 'info',
  minify: true,
  treeShaking: true,
};

export default buildOptions;
