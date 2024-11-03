import { JimpClass } from "@jimp/types";
import { assert } from "./util/assert";
import { Jimp } from "jimp";

export type VerticalAlign = "top" | "middle" | "bottom";

export type HorizontalAlign = "left" | "center" | "right";

export type AlignmentOption = `${VerticalAlign}-${HorizontalAlign}`;

export const alignmentOptions: AlignmentOption[] = [
  "top-left",
  "top-center",
  "top-right",
  "middle-left",
  "middle-center",
  "middle-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
];

function getTopPadding(
  verticalAlign: VerticalAlign,
  actualHeight: number,
  desiredHeight: number,
): number {
  return verticalAlign === "top"
    ? 0
    : verticalAlign === "middle"
      ? Math.floor((desiredHeight - actualHeight) / 2)
      : desiredHeight - actualHeight;
}

function getLeftPadding(
  horizontalAlign: HorizontalAlign,
  actualWidth: number,
  desiredWidth: number,
): number {
  return horizontalAlign === "left"
    ? 0
    : horizontalAlign === "center"
      ? Math.floor((desiredWidth - actualWidth) / 2)
      : desiredWidth - actualWidth;
}

export function padImage(
  desiredWidth: number,
  desiredHeight: number,
  image: JimpClass,
  verticalAlign: VerticalAlign,
  horizontalAlign: HorizontalAlign,
) {
  const actualWidth = image.bitmap.width;
  const actualHeight = image.bitmap.height;
  assert(actualWidth <= desiredWidth && actualHeight <= desiredHeight);

  const paddedImage = Jimp.fromBitmap({
    data: Buffer.alloc(desiredWidth * desiredHeight * 4),
    width: desiredWidth,
    height: desiredHeight,
  });

  const topPadding = getTopPadding(verticalAlign, actualHeight, desiredHeight);
  const leftPadding = getLeftPadding(
    horizontalAlign,
    actualWidth,
    desiredWidth,
  );

  paddedImage.data.fill(0x00000000);
  const bytesPerPixel = 4;

  for (let i = 0; i < actualHeight; i++) {
    const destinationRow = topPadding + i;

    const paddedRowOffset = bytesPerPixel * desiredWidth * destinationRow;
    const imageRowOffset = bytesPerPixel * actualWidth * i;

    for (let j = 0; j < actualWidth; j++) {
      const destinationPixel = j + leftPadding;
      const paddedOffset = paddedRowOffset + destinationPixel * bytesPerPixel;
      const imageOffset = imageRowOffset + j * bytesPerPixel;
      const pixel = image.bitmap.data.readInt32LE(imageOffset);
      paddedImage.data.writeInt32LE(pixel, paddedOffset);
    }
  }

  return paddedImage;
}
