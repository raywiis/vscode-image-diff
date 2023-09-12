import path from 'path';
import fs from 'node:fs';

const testSuiteRoot = './src/test/suite';
const testSuiteFiles = fs.readdirSync(testSuiteRoot).map(filename => {
  return path.join(testSuiteRoot, filename);
});

/**
 * @type {import('esbuild').BuildOptions}
 */
const buildOptions = {
  entryPoints: ['./src/test/runTest.ts', ...testSuiteFiles],
  bundle: true,
  outdir: "./out/test/",
  logLevel: 'info',
  sourcemap: 'inline',
  platform: 'node',
  format: 'cjs',
  external: ['vscode', 'mocha']
};

export default buildOptions;
