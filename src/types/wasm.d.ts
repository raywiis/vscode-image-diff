/**
 * Type for `.wasm` imports.
 * Esbuild should be configured to load wasm as the type specified here
 */
declare module "*.wasm" {
  // `Uint8Array<ArrayBuffer>` (not the default `ArrayBufferLike`) so the bytes
  // satisfy `BufferSource` where an `ArrayBuffer`-backed view is required, e.g.
  // `new WebAssembly.Module(bytes)`.
  const wasmBytes: Uint8Array<ArrayBuffer>;
  export default wasmBytes;
}
