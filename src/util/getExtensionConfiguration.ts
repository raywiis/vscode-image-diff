import { workspace } from 'vscode';
import { AlignmentOption } from '../padImage';

export function getExtensionConfiguration() {
  const configuration = workspace.getConfiguration('image-diff');
  const initialSelectedAlignment: AlignmentOption = configuration.get('diff.defaultAlignment', 'top-left');
  return {
    initialSelectedAlignment
  };
}
