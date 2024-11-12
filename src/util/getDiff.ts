import { JimpClass } from "@jimp/types";
import { Jimp } from "jimp";
import pixelMatch from "pixelmatch";

export function getDiff(aPng: JimpClass, bPng: JimpClass) {
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
  
  const base64 : Promise<string> = diff.getBase64("image/png");
  return base64.then((diffUri) => {
    return {
      diffUri,
      diffPixelCount,
    } as const;
  });
}
