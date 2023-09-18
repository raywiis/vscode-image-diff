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
};

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

  const imageController = new ImageController({ minScaleOne });

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
    document.body.classList.add('with-diff');
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

  return {
    setTransform: (x: number, y: number, scale: number) => {
      scaleIndicator.innerText = `Scale: ${scale.toFixed(4)}`;
      imageController.setTransform(x, y, scale, true);
    },
    setDiffView: (show: boolean) => {
      imageController.setDiffView(show);
    },
  };
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
      );
    } else if ((message.data.type = "toggle_diff")) {
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
    } else {
      throw new Error("Unsupported message");
    }
  },
);

sendMessageToHost({ type: "ready" });
