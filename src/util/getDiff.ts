import { assert } from "../util/assert";
import { JimpClass } from "@jimp/types";
import { Jimp } from "jimp";
import { methods } from "@jimp/plugin-resize";
import { clone } from "@jimp/utils";
import pixelMatch from "pixelmatch";

export function diff<I extends JimpClass>(img1: I, img2: I) {
  let bmp1 = img1.bitmap;
  let bmp2 = img2.bitmap;

  if (bmp1.width !== bmp2.width || bmp1.height !== bmp2.height) {
    if (bmp1.width * bmp1.height > bmp2.width * bmp2.height) {
      // img1 is bigger
      bmp1 = methods.resize(clone(img1), {
        w: bmp2.width,
        h: bmp2.height,
      }).bitmap;
    } else {
      // img2 is bigger (or they are the same in area)
      bmp2 = methods.resize(clone(img2), {
        w: bmp1.width,
        h: bmp1.height,
      }).bitmap;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const diff = new (img1 as any).constructor({
    width: bmp1.width,
    height: bmp1.height,
    color: 0xffffffff,
  });

  const numDiffPixels = pixelMatch(
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

  return {
    percent: numDiffPixels / (diff.bitmap.width * diff.bitmap.height),
    image: diff,
  };
}

export function getDiff(aPng: JimpClass, bPng: JimpClass) {
  assert(aPng.bitmap.width === bPng.bitmap.width && aPng.bitmap.height === bPng.bitmap.height);

  const diff0 = diff(aPng, bPng);
  const diffPixelCount = Math.round(diff0.percent * aPng.bitmap.width * aPng.bitmap.height);
  const base64 : Promise<string> = Jimp.fromBitmap(diff0.image.bitmap).getBase64("image/png", {
    quality: 50,
  });
  return base64.then((diffUri) => {
    return {
      diffUri,
      diffPixelCount,
    } as const;
  });
}
