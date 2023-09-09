import { WebviewToHostMessages } from "./shared";

// @ts-expect-error
const vscode = acquireVsCodeApi();

export function sendMessageToHost(message: WebviewToHostMessages) {
  vscode.postMessage(message);
}
