import { Uri, workspace } from "vscode";
import { GITHUB_PR_EXTENSION_STRING } from "./constants";
import { isGithubPRExtensionUri } from "./isGithubPRExtensionUri";

const sep = "/";

export function getRelPath(uri: Uri): string | undefined {
  const workspaceFolder = workspace.getWorkspaceFolder(uri);
  if (uri.scheme === "file" && workspaceFolder) {
    const relativePath = workspace.asRelativePath(uri.path);
    return relativePath;
  }
  if (isGithubPRExtensionUri(uri)) {
    const extensionRootIdx =
      uri.path.indexOf(GITHUB_PR_EXTENSION_STRING) +
      GITHUB_PR_EXTENSION_STRING.length +
      sep.length;
    const extensionTempRoot = uri.path.slice(extensionRootIdx);
    const segments = extensionTempRoot.split(sep);
    /** Assuming that the extension will keep it's files in `temp/<repo-folder>` subpath */
    const relPath = segments.slice(2).join(sep);
    return relPath;
  }
  return;
}
