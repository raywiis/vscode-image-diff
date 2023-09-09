/**
 * @type {import('esbuild').BuildOptions}
 */
const buildOptions = {
  entryPoints: ['./src/webview/viewer.ts'],
  bundle: true,
  outfile: './out/webview/viewer.js',
  logLevel: 'info',
  sourcemap: 'inline',
};

export default buildOptions;
