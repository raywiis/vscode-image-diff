import * as esbuild from 'esbuild';
import buildOptions from './esbuildOptions.extension.mjs';

await esbuild.build(buildOptions);
