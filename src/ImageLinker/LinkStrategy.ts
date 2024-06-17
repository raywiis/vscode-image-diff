import { WebviewPanel } from "vscode";
import { PngDocumentDiffView } from "../PngDocumentDiffView";

export type LinkPackage =
  | readonly [document: PngDocumentDiffView, webviewPanel: WebviewPanel]
  | readonly [undefined, undefined];

export type LinkStrategy = {
  /**
   * Get notified of an open image
   * @param document
   * @param webview
   */
  onDocumentOpen(document: PngDocumentDiffView, webview: WebviewPanel): void;

  /**
   * Find a pair from already opened docs
   * @param document Pro
   */
  lookForLink(document: PngDocumentDiffView): Promise<LinkPackage>;
};
