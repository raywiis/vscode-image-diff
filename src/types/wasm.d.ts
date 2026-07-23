/**
 * Type for `.wasm` imports.
 *
 * esbuild's `binary` loader (configured in the esbuild option files) turns a
 * `.wasm` import into the file's raw bytes as a `Uint8Array`. This declaration
 * makes TypeScript agree.
 */
declare module "*.wasm" {
  // `Uint8Array<ArrayBuffer>` (not the default `ArrayBufferLike`) so the bytes
  // satisfy `BufferSource` where an `ArrayBuffer`-backed view is required, e.g.
  // `new WebAssembly.Module(bytes)`.
  const wasmBytes: Uint8Array<ArrayBuffer>;
  export default wasmBytes;
}
