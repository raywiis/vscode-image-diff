import * as esbuild from 'esbuild';
import buildOptions from './esbuildOptions.tests.mjs';

await esbuild.build(buildOptions);
