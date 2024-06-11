import { assert } from '../util/assert';
import pixelMatch from 'pixelmatch'
import { PNG } from "pngjs/browser";

export function getDiff(aPng: PNG, bPng: PNG) {
  assert(aPng.width === bPng.width && aPng.height === bPng.height);
  const diff = new PNG({ width: aPng.width, height: bPng.height });
  const diffPixelCount = pixelMatch(
    aPng.data,
    bPng.data,
    diff.data,
    aPng.width,
    aPng.height,
    {
      threshold: 0,
      includeAA: true,
      alpha: 0.1,
    },
  );
  const diffBuff = PNG.sync.write(diff);
  const diffUri = `data:image/png;base64, ${diffBuff.toString("base64")}`;
  return {
    diffUri,
    diffPixelCount,
  } as const;
}
