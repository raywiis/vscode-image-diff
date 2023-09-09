import * as esbuild from 'esbuild';
import buildOptions from './esbuildOptions.webview.mjs';

await esbuild.build(buildOptions);
