import { init as initJpeg } from "@jsquash/jpeg/decode";
import decodeJpegData from "@jsquash/jpeg/decode";
import jpegDecWasm from "@jsquash/jpeg/codec/dec/mozjpeg_dec.wasm";
import { init as initPng } from "@jsquash/png/decode";
import decodePngData from "@jsquash/png/decode";
import encodePngData from "@jsquash/png/encode";
import pngDecWasm from "@jsquash/png/codec/pkg/squoosh_png_bg.wasm";
import { RawImage } from "./util/rawImage";

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
 *
 * The PNG codec is wasm-bindgen rather than emscripten. It only builds a
 * `new URL(...)` when `init()` is called with no argument, so handing it the
 * precompiled module sidesteps that; it shares the `ImageData` polyfill above.
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

  const [jpegDecModule, pngDecModule] = await Promise.all([
    WebAssembly.compile(jpegDecWasm),
    // `@jsquash/png` ships its own `squoosh_png_bg.wasm.d.ts`, which shadows our
    // ambient `*.wasm` byte declaration, so this import is mistyped as the
    // wasm-bindgen module. esbuild's binary loader still yields bytes at runtime.
    WebAssembly.compile(pngDecWasm as unknown as Uint8Array),
  ]);

  await Promise.all([
    initJpeg(
      jpegDecModule,
      // @ts-expect-error The module needs this override because emscripten confuses the runtime due to polyfill
      { locateFile: (path) => path },
    ),
    // wasm-bindgen's `init` accepts a precompiled `WebAssembly.Module` directly.
    initPng(pngDecModule),
  ]);

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

function toArrayBuffer(buffer: Uint8Array): ArrayBuffer {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
}

export async function decodeJpeg(buffer: Uint8Array): Promise<ImageData> {
  await wasmReady;
  return decodeJpegData(toArrayBuffer(buffer));
}

export async function decodePng(buffer: Uint8Array): Promise<ImageData> {
  await wasmReady;
  return decodePngData(toArrayBuffer(buffer));
}

export async function encodePngDataUri(image: RawImage): Promise<string> {
  await wasmReady;
  const output = await encodePngData(image as unknown as ImageData);
  return `data:image/png;base64,${Buffer.from(output).toString("base64")}`;
}
