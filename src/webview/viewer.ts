import {
  HostToWebviewMessages,
  OffsetXYMessage,
  ShowImageMessage,
} from "./shared";
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
import { ImageController, TransformEvent } from "./ImageController";
import { assert } from "./assert";

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

const features = {
  reportTransform: false,
  reportViewportChanges: false,
};

function reportViewportChanges() {
  const width = window.innerWidth;
  sendMessageToHost({
    type: "original_swipe_adjustment",
    data: { height: 0, width: -width },
  });
}

function awaitPageLoad() {
  return new Promise<void>((resolve) => {
    window.addEventListener("load", () => {
      resolve();
    });
  });
}

function showImage({
  minScaleOne,
  showDiffByDefault,
  imageRendering,
}: ShowImageMessage["options"]) {
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
  assert(mainImage instanceof HTMLImageElement);
  if (!mainImage.complete || mainImage.naturalHeight === 0) {
    mainImage.style.display = "none";

    const errorElement = document.getElementById("error");
    const errorMessageElement = document.getElementById("error-message");

    assert(errorElement && errorMessageElement);
    errorElement.style.display = "grid";
    errorMessageElement.innerText = "Image missing or failed to load";
    return;
  }

  const imageController = new ImageController({ minScaleOne, imageRendering });

  imageController.addEventListener("transform", (event) => {
    assert(event instanceof TransformEvent);
    const { x, y, scale } = event;
    scaleIndicator.innerText = `Scale: ${scale.toFixed(4)}`;
    if (features.reportTransform && sync) {
      sendMessageToHost({
        type: "transform",
        data: { x, y, scale },
      });
    }
  });

  let sync = true;

  if (imageController.hasDiff) {
    document.body.classList.add("with-diff");
  }

  if (imageController.hasDiff) {
    const syncCheckbox = document.getElementById("sync-checkbox");
    const diffCheckbox = document.getElementById("diff-checkbox");
    assert(syncCheckbox && diffCheckbox);
    assert(syncCheckbox instanceof Checkbox);

    syncCheckbox.checked = sync;
    sync = true;
    syncCheckbox.addEventListener("click", (event) => {
      assert(event.target instanceof Checkbox);
      sync = event.target.checked;
    });
    diffCheckbox.addEventListener("click", (event) => {
      assert(event.target instanceof Checkbox);
      const showDiff = event.target.checked;
      imageController.setDiffView(showDiff);
    });
  }

  if (imageController.hasDiff && showDiffByDefault) {
    const diffCheckbox = document.getElementById("diff-checkbox");
    assert(diffCheckbox && diffCheckbox instanceof Checkbox);
    diffCheckbox.checked = true;
    imageController.setDiffView(true);
  }

  return {
    setTransform: (x: number, y: number, scale: number) => {
      scaleIndicator.innerText = `Scale: ${scale.toFixed(4)}`;
      imageController.setTransform(x, y, scale, true);
    },
    setDiffView: (show: boolean) => {
      imageController.setDiffView(show);
    },
    offsetXY: (offsets: OffsetXYMessage["data"]) => {
      imageController.setOffsets(offsets);
    },
    setViewportReporting: (enabled: boolean) => {
      if (enabled) {
        reportViewportChanges();
        window.addEventListener("resize", reportViewportChanges);
      } else {
        window.removeEventListener("resize", reportViewportChanges);
      }
    },
  };
}

let imageApi: ReturnType<typeof showImage> | undefined;
let isInSwipe = false;
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
      );
    } else if (message.data.type === "toggle_diff") {
      try {
        const diffCheckbox = document.getElementById("diff-checkbox");
        if (diffCheckbox instanceof Checkbox) {
          const shouldShowDiff = !diffCheckbox.checked;
          diffCheckbox.checked = shouldShowDiff;
          imageApi?.setDiffView(shouldShowDiff);
        }
      } catch (error) {
        console.error(error);
      }
    } else if (message.data.type === "toggle_swipe_original") {
      // TODO: Change default and maybe even allowable zoom levels
      features.reportViewportChanges = !features.reportViewportChanges;
      imageApi?.setViewportReporting(features.reportViewportChanges);
    } else if (message.data.type === "toggle_swipe_changed") {
      isInSwipe = !isInSwipe;
      if (!isInSwipe) {
        imageApi?.offsetXY({ dx: 0, dy: 0 });
      }
      // TODO: Report viewport to correct zoom levels on original
    } else if (message.data.type === "offset_xy") {
      imageApi?.offsetXY(message.data.data);
    } else {
      // @ts-expect-error
      throw new Error("Unsupported message: " + message.data.type);
    }
  },
);

awaitPageLoad().then(() => {
  sendMessageToHost({ type: "ready" });
});
