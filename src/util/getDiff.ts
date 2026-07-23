import pixelMatch from "pixelmatch";
import { RawImage } from "./rawImage";
import { encodePngDataUri } from "../wasm";

export async function getDiff(aPng: RawImage, bPng: RawImage) {
  // pixelmatch writes every output pixel, so the buffer only needs allocating.
  const diff: RawImage = {
    data: Buffer.alloc(aPng.width * aPng.height * 4),
    width: aPng.width,
    height: aPng.height,
  };

  const diffPixelCount = pixelMatch(
    aPng.data,
    bPng.data,
    diff.data,
    diff.width,
    diff.height,
    {
      threshold: 0,
      includeAA: true,
      alpha: 0.1,
    },
  );

  const diffUri = await encodePngDataUri(diff);
  return {
    diffUri,
    diffPixelCount,
  } as const;
}
