import * as esbuild from 'esbuild';
import buildOptions from './esbuildOptions.extension.mjs';

let ctx = await esbuild.context(buildOptions);

await ctx.watch();
