import { HostToWebviewMessages } from "./shared";
import "./viewer.css";
import {
  Checkbox,
  Dropdown,
  provideVSCodeDesignSystem,
  vsCodeButton,
  vsCodeCheckbox,
  vsCodeRadio,
  vsCodeRadioGroup,
  vsCodeDropdown,
  vsCodeOption,
} from "@vscode/webview-ui-toolkit";
import { sendMessageToHost } from "./vsCodeApi";

function assert(condition: any, errorMessage?: string): asserts condition {
  if (!condition) {
    throw new Error(errorMessage || "Assertion error");
  }
}

function bootstrapVSCodeDesignSystem() {
  provideVSCodeDesignSystem().register(
    vsCodeButton(),
    vsCodeCheckbox(),
    vsCodeRadio(),
    vsCodeRadioGroup(),
    vsCodeDropdown(),
    vsCodeOption(),
  );
}

document.body.style.overflow = "hidden";

const features = {
  reportTransform: false,
};

let setDiffView: (show: boolean) => void | undefined;

function showImage({ minScaleOne }: { minScaleOne: boolean }) {
  bootstrapVSCodeDesignSystem();

  const alignmentDropdown = document.getElementById("alignment-dropdown");
  if (alignmentDropdown) {
    assert(alignmentDropdown instanceof Dropdown);
    alignmentDropdown.addEventListener("change", () => {
      sendMessageToHost({
        type: "change_align",
        data: alignmentDropdown.value,
      });
    });
  }

  const scaleIndicator = document.getElementById("scale-indicator");
  assert(scaleIndicator);

  const mainImage = document.getElementById("main-image");
  const diffImage = document.getElementById("diff-image");

  assert(mainImage && mainImage instanceof HTMLImageElement);

  const minWidthScale = window.innerWidth / mainImage.naturalWidth;
  const minHeightScale = window.innerHeight / mainImage.naturalHeight;
  const MIN_SCALE = minScaleOne
    ? Math.min(minWidthScale, minHeightScale, 1)
    : Math.min(minWidthScale, minHeightScale);

  let shownImage = mainImage;

  document.body.appendChild(shownImage);
  shownImage.style.cursor = "grab";

  shownImage.addEventListener("load", () => {
    const width = `${shownImage.naturalWidth}px`;
    const height = `${shownImage.naturalHeight}px`;
    shownImage.style.width = width;
    shownImage.style.height = height;
  });

  let drag = false;
  let initialX = 0;
  let initialY = 0;
  let scale = MIN_SCALE;

  let sync = true;

  let dragStartX = 0;
  let dragStartY = 0;

  const handleWheelEventOnImage = (event: WheelEvent) => {
    const delta = event.deltaY * 0.01;
    const nextScale = Math.max(scale - delta, MIN_SCALE);

    const s = nextScale / scale;
    const cx = event.clientX;
    const cy = event.clientY;
    const lx = -initialX;
    const ly = -initialY;

    const nextX = -((cx + lx) * s - cx);
    const nextY = -((cy + ly) * s - cy);

    setTransform(nextX, nextY, nextScale);
  };

  setDiffView = (show: boolean) => {
    if (!diffImage) {
      return;
    }
    assert(diffImage instanceof HTMLImageElement);
    if (show) {
      shownImage = diffImage;
      diffImage.style.display = "block";
      mainImage.style.display = "none";
    } else {
      shownImage = mainImage;
      mainImage.style.display = "block";
      diffImage.style.display = "none";
    }
    setTransform(initialX, initialY, scale);
  };

  if (diffImage) {
    assert(diffImage instanceof HTMLImageElement);

    diffImage.addEventListener("wheel", handleWheelEventOnImage);

    const syncCheckbox = document.getElementById("sync-checkbox");
    const diffCheckbox = document.getElementById("diff-checkbox");

    assert(syncCheckbox && diffCheckbox);
    assert(syncCheckbox instanceof Checkbox);
    syncCheckbox.checked = true;
    sync = true;
    syncCheckbox.addEventListener("click", (event) => {
      assert(event.target instanceof Checkbox);
      sync = event.target.checked;
    });
    diffCheckbox.addEventListener("click", (event) => {
      assert(event.target instanceof Checkbox);
      const showDiff = event.target.checked;
      setDiffView(showDiff);
    });
    syncCheckbox.style.display = "inline-flex";
    diffCheckbox.style.display = "inline-flex";
  }

  scaleIndicator.innerText = `Scale: ${scale.toFixed(4)}`;
  const setTransform = (
    x: number,
    y: number,
    newScale: number,
    { silent = false } = {},
  ) => {
    newScale = Math.max(MIN_SCALE, newScale);
    const onScreenWidth = shownImage.clientWidth * newScale;
    const onScreenHeight = shownImage.clientHeight * newScale;

    const minX = Math.min(0, window.innerWidth - onScreenWidth);
    const maxX = Math.max(0, window.innerWidth - onScreenWidth);
    const minY = Math.min(0, window.innerHeight - onScreenHeight);
    const maxY = Math.max(0, window.innerHeight - onScreenHeight);

    initialX = clamp(minX, maxX, x);
    initialY = clamp(minY, maxY, y);

    scale = newScale;
    scaleIndicator.innerText = `Scale: ${scale.toFixed(4)}`;

    shownImage.style.transform = `matrix(${scale}, 0, 0, ${scale}, ${initialX}, ${initialY})`;
    if (features.reportTransform && !silent && sync) {
      sendMessageToHost({
        type: "transform",
        data: { x: initialX, y: initialY, scale },
      });
    }
  };

  const clamp = (min: number, max: number, target: number) => {
    return Math.min(Math.max(min, target), max);
  };

  const updateDrag = (dragX: number, dragY: number) => {
    const translateX = initialX + dragX - dragStartX;
    const translateY = initialY + dragY - dragStartY;
    dragStartX = dragX;
    dragStartY = dragY;
    setTransform(translateX, translateY, scale);
  };

  const startDrag = (x: number, y: number) => {
    drag = true;
    shownImage.style.cursor = "grabbing";
    dragStartX = x;
    dragStartY = y;
  };

  const stopDrag = (x: number, y: number) => {
    drag = false;
    shownImage.style.cursor = "grab";
    updateDrag(x, y);
  };

  document.body.addEventListener("mousedown", (event) => {
    startDrag(event.clientX, event.clientY);
  });

  document.body.addEventListener("mousemove", (event) => {
    if (!drag) {
      return;
    }
    event.preventDefault();
    updateDrag(event.clientX, event.clientY);
  });

  document.body.addEventListener("mouseup", (event) => {
    if (!drag) {
      return;
    }
    stopDrag(event.clientX, event.clientY);
  });

  document.body.addEventListener("mouseleave", (event) => {
    if (!drag) {
      return;
    }
    stopDrag(event.clientX, event.clientY);
  });

  mainImage.addEventListener("wheel", handleWheelEventOnImage);
  setTransform(initialX, initialY, scale, { silent: true });

  return { setTransform };
}

let imageApi: ReturnType<typeof showImage> | undefined;
window.addEventListener(
  "message",
  (message: MessageEvent<HostToWebviewMessages>) => {
    if (message.data.type === "show_image") {
      imageApi = showImage(message.data.options);
    } else if (message.data.type === "enable_transform_report") {
      features.reportTransform = true;
    } else if (message.data.type === "transform") {
      if (!imageApi) {
        throw new Error("No setTransform");
      }
      imageApi.setTransform(
        message.data.data.x,
        message.data.data.y,
        message.data.data.scale,
        { silent: true },
      );
    } else if ((message.data.type = "toggle_diff")) {
      try {
        const diffCheckbox = document.getElementById("diff-checkbox");
        if (diffCheckbox instanceof Checkbox) {
          const shouldShowDiff = !diffCheckbox.checked;
          diffCheckbox.checked = shouldShowDiff;
          setDiffView(shouldShowDiff);
        }
      } catch (error) {
        console.error(error);
      }
    } else {
      throw new Error("Unsupported message");
    }
  },
);

sendMessageToHost({ type: "ready" });
