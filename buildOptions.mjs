/**
 * @type {import('esbuild').BuildOptions}
 */
const buildOptions = {
  entryPoints: ['./webview/viewer.ts'],
  bundle: true,
  outfile: './out/webview/viewer.js',
  logLevel: 'info',
};

export default buildOptions;
