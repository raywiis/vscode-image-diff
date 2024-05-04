import { WebviewToHostMessages } from "./shared";

// @ts-expect-error This api is untyped
const vscode = acquireVsCodeApi();

export function sendMessageToHost(message: WebviewToHostMessages) {
  vscode.postMessage(message);
}
