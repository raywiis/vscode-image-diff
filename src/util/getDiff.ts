import { Jimp, JimpInstance } from "jimp";
import pixelMatch from "pixelmatch";

export async function getDiff(aPng: JimpInstance, bPng: JimpInstance) {
  const bmp1 = aPng.bitmap;
  const bmp2 = bPng.bitmap;

  const diff = new Jimp({
    width: bmp1.width,
    height: bmp1.height,
    color: 0xffffffff,
  });

  const diffPixelCount = pixelMatch(
    bmp1.data,
    bmp2.data,
    diff.bitmap.data,
    diff.bitmap.width,
    diff.bitmap.height,
    {
      threshold: 0,
      includeAA: true,
      alpha: 0.1,
    },
  );

  const diffUri: string = await diff.getBase64("image/png");
  return {
    diffUri,
    diffPixelCount,
  } as const;
}
