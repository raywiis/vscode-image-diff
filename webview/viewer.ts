import "./viewer.css";
import {
  provideVSCodeDesignSystem,
  vsCodeButton,
  vsCodeCheckbox,
  vsCodeRadio,
  vsCodeRadioGroup,
} from "@vscode/webview-ui-toolkit";

provideVSCodeDesignSystem().register(
  vsCodeButton(),
  vsCodeCheckbox(),
  vsCodeRadio(),
  vsCodeRadioGroup()
);

function assert(condition: any, errorMessage?: string): asserts condition {
  if (!condition) {
    throw new Error(errorMessage || 'Assertion error');
  }
};

// @ts-expect-error
const vscode = acquireVsCodeApi();

document.body.style.overflow = "hidden";

const features = {
  reportTransform: false,
};

function showImage() {
  // TODO: Use the shared types...

  const scaleIndicator = document.createElement("div");
  scaleIndicator.style.position = "absolute";
  scaleIndicator.style.right = "0";
  scaleIndicator.style.bottom = "0";
  scaleIndicator.style.zIndex = "10";
  scaleIndicator.style.mixBlendMode = "difference";

  document.body.append(scaleIndicator);

  const mainImage = document.getElementById("main-image");
  const diffImage = document.getElementById('diff-image');

  assert(mainImage && mainImage instanceof HTMLImageElement);

  let MIN_SCALE = window.innerWidth / mainImage.naturalWidth;

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

  const radioGroup = document.querySelector("vscode-radio-group");
  if (!radioGroup) {
    throw new Error('No fit selection radio group');
  }
  radioGroup.addEventListener("click", (event) => {
    if (!(event.target && 'value' in event.target)) {
      throw new Error('Can\'t set fit');
    }
    const fitValue = event.target.value;
    if (fitValue === 'fit') {
      MIN_SCALE = window.innerWidth / mainImage.naturalWidth;
      if (scale === 1) {
        scale = MIN_SCALE;
      }
      setTransform(initialX, initialY, scale);
    } else if (fitValue === 'original') {
      MIN_SCALE = 1;
      setTransform(initialX, initialY, scale);
    }
  });

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


  if (diffImage) {
    assert(diffImage instanceof HTMLImageElement);

    diffImage.addEventListener('wheel', handleWheelEventOnImage);

    const syncCheckbox = document.getElementById('sync-checkbox');
    const diffCheckbox = document.getElementById('diff-checkbox');

    assert(syncCheckbox && diffCheckbox);
    assert('checked' in syncCheckbox && typeof syncCheckbox.checked === 'boolean');
    syncCheckbox.checked = true;
    sync = true;
    syncCheckbox.addEventListener('click', (event) => {
      assert(event.target && 'checked'in event.target && typeof event.target.checked === 'boolean');
      sync = event.target.checked;
    });
    diffCheckbox.addEventListener('click', (event) => {
      assert(event.target && 'checked'in event.target && typeof event.target.checked === 'boolean');
      const showDiff = event.target.checked;
      if (showDiff) {
        shownImage = diffImage;
        diffImage.style.display = 'block';
        mainImage.style.display = 'none';
      } else {
        shownImage= mainImage;
        mainImage.style.display = 'block';
        diffImage.style.display = 'none';
      }
      setTransform(initialX, initialY, scale);
    });
    syncCheckbox.style.display = 'inline-flex';
    diffCheckbox.style.display = 'inline-flex';
  }

  scaleIndicator.innerText = `Scale: ${scale.toFixed(4)}`;
  const setTransform = (
    x: number,
    y: number,
    newScale: number,
    { silent = false } = {}
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
      vscode.postMessage({
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

let imageApi;
window.addEventListener("message", (message) => {
  if (message.data.type === "show_image") {
    imageApi = showImage();
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
      { silent: true }
    );
  } else {
    throw new Error("Unsupported message");
  }
});

vscode.postMessage({ type: "ready" });
