import * as esbuild from 'esbuild';
import buildOptions from './buildOptions.mjs';

let ctx = await esbuild.context(buildOptions);

await ctx.watch();
