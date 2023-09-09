/**
 * @type {import('esbuild').BuildOptions}
 */
const buildOptions = {
  entryPoints: ['./src/extension.ts'],
  bundle: true,
  outfile: './out/extension.js',
  logLevel: 'info',
  sourcemap: 'inline',
  platform: 'node',
  format: 'cjs',
  external: ['vscode']
};

export default buildOptions;
