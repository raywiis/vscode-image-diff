import * as esbuild from 'esbuild';
import buildOptions from './buildOptions.mjs';

await esbuild.build(buildOptions);
