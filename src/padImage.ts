import { assert } from "./util/assert";
import { RawImage } from "./util/rawImage";

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
  image: RawImage,
  verticalAlign: VerticalAlign,
  horizontalAlign: HorizontalAlign,
): RawImage {
  const actualWidth = image.width;
  const actualHeight = image.height;
  assert(actualWidth <= desiredWidth && actualHeight <= desiredHeight);

  const paddedImage: RawImage = {
    data: new Uint8Array(desiredHeight * desiredWidth * 4),
    width: desiredWidth,
    height: desiredHeight,
  };

  const topPadding = getTopPadding(verticalAlign, actualHeight, desiredHeight);
  const leftPadding = getLeftPadding(
    horizontalAlign,
    actualWidth,
    desiredWidth,
  );

  const bytesPerPixel = 4;
  const rowBytes = actualWidth * bytesPerPixel;

  for (let i = 0; i < actualHeight; i++) {
    const destinationRow = topPadding + i;
    const paddedRowOffset =
      bytesPerPixel * (desiredWidth * destinationRow + leftPadding);
    const imageRowOffset = rowBytes * i;

    paddedImage.data.set(
      image.data.subarray(imageRowOffset, imageRowOffset + rowBytes),
      paddedRowOffset,
    );
  }

  return paddedImage;
}
