import { Uri } from "vscode";
import { GITHUB_PR_EXTENSION_STRING } from "./constants";

export function isGithubPRExtensionUri(uri: Uri) {
  return uri.scheme === 'vscode-userdata' && uri.path.includes(GITHUB_PR_EXTENSION_STRING);
}
