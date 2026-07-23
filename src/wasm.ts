import { init as initJpeg } from "@jsquash/jpeg/decode";
import decodeJpegData from "@jsquash/jpeg/decode";
import jpegDecWasm from "@jsquash/jpeg/codec/dec/mozjpeg_dec.wasm";

let ready = false;

/**
 * The emscripten glue misdetects the VS Code extension host as a web
 * environment: esbuild's node-globals polyfill installs a `process` shim
 * without `process.versions.node` / `process.release`, so both
 * `ENVIRONMENT_IS_NODE` and the glue's own `isRunningInNode` check are false.
 * That has two consequences we work around here:
 *
 *  1. During module construction the glue evaluates
 *     `new URL("mozjpeg_dec.wasm", import.meta.url)` in its non-node branch,
 *     which throws "Invalid URL" because `import.meta.url` is empty in the CJS
 *     bundle. Passing `locateFile` routes it down the other branch instead.
 *  2. The glue only installs its `ImageData` polyfill for node/cloudflare, so
 *     the decoder has no `ImageData` constructor to build its result with. The
 *     extension host is Node (no DOM), so we install the same minimal polyfill.
 */
function polyfillImageData() {
  const g = globalThis as unknown as { ImageData?: unknown };
  if (typeof g.ImageData === "undefined") {
    g.ImageData = class ImageData {
      data: Uint8ClampedArray;
      width: number;
      height: number;
      constructor(data: Uint8ClampedArray, width: number, height: number) {
        this.data = data;
        this.width = width;
        this.height = height;
      }
    };
  }
}

async function initWasm(): Promise<void> {
  polyfillImageData();

  console.time("wasm jpeg compile");
  const jpegDecModule = await WebAssembly.compile(jpegDecWasm);
  console.timeEnd("wasm jpeg compile");

  await initJpeg(
    jpegDecModule,
    // @ts-expect-error The module needs this override because emscripten confuses the runtime due to polyfill
    { locateFile: (path) => path }
  );

  ready = true;
}

/** Resolves once the wasm decoders are initialised. Rejects if init failed. */
export const wasmReady: Promise<void> = initWasm();

/** Synchronous flag for whether the wasm decoders are ready to use. */
export function isWasmReady(): boolean {
  return ready;
}

/** Detects a JPEG by its `FF D8 FF` magic bytes. */
export function isJpeg(buffer: Uint8Array): boolean {
  return (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  );
}

/** Decodes a JPEG buffer to raw RGBA pixels using the wasm decoder. */
export async function decodeJpeg(buffer: Uint8Array): Promise<ImageData> {
  await wasmReady;
  // Copy out an exact ArrayBuffer: `buffer` may be a view onto a larger pool.
  const bytes = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  );
  return decodeJpegData(bytes as ArrayBuffer);
}
