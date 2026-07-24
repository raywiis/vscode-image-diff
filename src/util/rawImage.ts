/** Raw decoded RGBA image: the common currency of the diff pipeline. */
export interface RawImage {
  /** RGBA pixels, 4 bytes per pixel, row-major. */
  data: Uint8Array;
  width: number;
  height: number;
}
