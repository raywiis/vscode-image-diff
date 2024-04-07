import { assert } from "./assert";

export class TransformEvent extends Event {
  x: number;
  y: number;
  scale: number;

  constructor(x: number, y: number, scale: number) {
    super("transform");
    this.x = x;
    this.y = y;
    this.scale = scale;
  }
}

export class ImageController extends EventTarget {
  private mainImage: HTMLImageElement;
  private diffImage?: HTMLImageElement;

  private shownImage: HTMLImageElement;

  private minScale: number;
  private scale: number;
  private dragging = false;
  private initialX = 0;
  private initialY = 0;
  private dragStartX = 0;
  private dragStartY = 0;
  private offsets: { dx: number; dy: number } = { dx: 0, dy: 0 };
  private boundConfig: BoundConfig = { type: "contain-image" };

  hasDiff = false;
  inDiff = false;

  constructor(options: {
    minScaleOne: boolean;
    imageRendering: "auto" | "pixelated";
  }) {
    super();
    const mainImage = document.getElementById("main-image");
    const diffImage = document.getElementById("diff-image");

    assert(mainImage instanceof HTMLImageElement && mainImage.complete);
    this.mainImage = mainImage;

    if (diffImage) {
      assert(diffImage instanceof HTMLImageElement);
      this.diffImage = diffImage;
    }

    this.mainImage.style.imageRendering = options.imageRendering;
    if (this.diffImage) {
      this.diffImage.style.imageRendering = options.imageRendering;
    }

    const minWidthScale = window.innerWidth / mainImage.naturalWidth;
    const minHeightScale = window.innerHeight / mainImage.naturalHeight;
    this.minScale = options.minScaleOne
      ? Math.min(minWidthScale, minHeightScale, 1)
      : Math.min(minWidthScale, minHeightScale);

    this.shownImage = mainImage;

    document.body.append(this.shownImage);

    this.shownImage.addEventListener("load", () => {
      const width = `${this.shownImage.naturalWidth}px`;
      const height = `${this.shownImage.naturalHeight}px`;
      this.shownImage.style.width = width;
      this.shownImage.style.height = height;
    });

    this.scale = this.minScale;
    this.hasDiff = !!this.diffImage;

    mainImage.addEventListener("wheel", this.handleWheelEvent.bind(this));
    diffImage?.addEventListener("wheel", this.handleWheelEvent.bind(this));

    document.addEventListener("mousedown", this.startDrag.bind(this));
    document.addEventListener("mousemove", this.updateDrag.bind(this));
    document.addEventListener("mouseup", this.stopDrag.bind(this));
    document.addEventListener("mouseleave", this.stopDrag.bind(this));

    this.setTransform(this.initialX, this.initialY, this.scale);
  }

  private startDrag(event: MouseEvent) {
    this.dragging = true;
    this.shownImage.style.cursor = "grabbing";
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
  }

  private updateDrag(event: MouseEvent) {
    if (!this.dragging) {
      return;
    }
    event.preventDefault();
    const translateX = this.initialX + event.clientX - this.dragStartX;
    const translateY = this.initialY + event.clientY - this.dragStartY;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.setTransform(translateX, translateY, this.scale);
  }

  private stopDrag(event: MouseEvent) {
    if (!this.dragging) {
      return;
    }
    this.dragging = false;
    this.shownImage.style.cursor = "grab";
    const translateX = this.initialX + event.clientX - this.dragStartX;
    const translateY = this.initialY + event.clientY - this.dragStartY;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.setTransform(translateX, translateY, this.scale);
  }

  private handleWheelEvent(event: WheelEvent) {
    const delta = event.deltaY * 0.01;
    const nextScale = Math.max(this.scale - delta, this.minScale);

    const s = nextScale / this.scale;
    const cx = event.clientX;
    const cy = event.clientY;
    const lx = -this.initialX;
    const ly = -this.initialY;

    const nextX = -((cx + lx) * s - cx);
    const nextY = -((cy + ly) * s - cy);

    this.setTransform(nextX, nextY, nextScale);
  }

  setDiffView(show: boolean) {
    if (!this.diffImage) {
      return;
    }
    this.inDiff = show;
    if (show) {
      this.shownImage = this.diffImage;
      this.diffImage.style.display = "block";
      this.mainImage.style.display = "none";
    } else {
      this.shownImage = this.mainImage;
      this.mainImage.style.display = "block";
      this.diffImage.style.display = "none";
    }
    this.setTransform(this.initialX, this.initialY, this.scale);
  }

  setTransform(x: number, y: number, newScale: number, silent = false) {
    newScale = Math.max(this.minScale, newScale);
    const onScreenWidth = this.shownImage.clientWidth * newScale;
    const onScreenHeight = this.shownImage.clientHeight * newScale;

    const [minX, maxX, minY, maxY] = getBounds(this.boundConfig, [
      onScreenWidth,
      onScreenHeight,
    ]);

    this.initialX = clamp(minX, maxX, x);
    this.initialY = clamp(minY, maxY, y);

    this.scale = newScale;
    this.shownImage.style.transform = `matrix(${this.scale}, 0, 0, ${this.scale}, ${this.initialX + this.offsets.dx}, ${this.initialY + this.offsets.dy})`;

    if (!silent) {
      this.dispatchEvent(
        new TransformEvent(this.initialX, this.initialY, this.scale),
      );
    }
  }

  resizeBounds(bounds: BoundConfig) {
    this.boundConfig = bounds;
    this.setTransform(this.initialX, this.initialY, this.scale, true);
  }

  setOffsets(offsets: { dx: number; dy: number }) {
    this.offsets = offsets;
    this.setTransform(this.initialX, this.initialY, this.scale, true);
  }
}

type Bound = [minX: number, maxX: number, minY: number, maxY: number];
export type BoundConfig = { type: "contain-image" } | { type: "none" };

const noneBounds: Bound = [-Infinity, Infinity, -Infinity, Infinity];

function getBounds(
  config: BoundConfig,
  imageSize: [width: number, height: number],
): Bound {
  if (config.type === "contain-image") {
    const minX = Math.min(0, window.innerWidth - imageSize[0]);
    const maxX = Math.max(0, window.innerWidth - imageSize[0]);
    const minY = Math.min(0, window.innerHeight - imageSize[1]);
    const maxY = Math.max(0, window.innerHeight - imageSize[1]);
    return [minX, maxX, minY, maxY];
  } else if (config.type === "none") {
    return noneBounds;
  } else {
    // @ts-expect-error
    throw new Error("unknown bound config: " + config.type);
  }
}

function clamp(min: number, max: number, target: number) {
  return Math.min(Math.max(min, target), max);
}
