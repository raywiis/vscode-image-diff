#! /usr/bin/env node
import * as esbuild from 'esbuild';
import testBuildOptions from './esbuildOptions.tests.mjs';
import webviewBuildOptions from './esbuildOptions.webview.mjs';
import extensionBuildOptions from './esbuildOptions.extension.mjs';

/**
 * @typedef {import('esbuild').BuildOptions} EsbuildOptions
 */

/**
 * @type {Map<string, EsbuildOptions>}
 */
const configs = new Map([
  ['test', testBuildOptions],
  ['webview', webviewBuildOptions],
  ['extension', extensionBuildOptions],
])

const requestedConfig = process.argv[2];
const isWatchMode = process.argv.some(item => item === '--watch' || item === '-w');

if (!requestedConfig) {
  throw new Error("No config requested");
}

const config = configs.get(requestedConfig);

if (!config) {
  throw new Error(`No config named ${requestedConfig}`);
}

if (isWatchMode) {
  const ctx = await esbuild.context(config);
  await ctx.watch();
} else {
  const result = await esbuild.build(config);
  if (result.metafile) {
    const fs = await import('fs/promises')
    fs.writeFile(`./${requestedConfig}.metafile.json`, JSON.stringify(result.metafile))
  }
}
