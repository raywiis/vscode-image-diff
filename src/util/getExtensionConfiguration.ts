import { workspace } from "vscode";
import { AlignmentOption } from "../padImage";

export function getExtensionConfiguration() {
  const configuration = workspace.getConfiguration("image-diff");
  const initialSelectedAlignment: AlignmentOption = configuration.get(
    "diff.defaultAlignment",
    "top-left",
  );
  const showDiffByDefault = configuration.get('viewer.showDiffByDefault', false);
  const minScaleOne = configuration.get("viewer.minScaleOne", false);
  return {
    initialSelectedAlignment,
    showDiffByDefault,
    minScaleOne,
  };
}
