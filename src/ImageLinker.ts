import { WebviewPanel } from "vscode";
import { getRelPath } from "./getRelPath";
import { PngDocumentDiffView } from "./PngDocumentDiffView";

export class ImageLinker {
  private openPathToDocumentMap = new Map<string, PngDocumentDiffView>();
  private openPathToWebviewPanelMap = new Map<string, WebviewPanel>;
  private openRelativePathToDocumentMap = new Map<string, PngDocumentDiffView>();
  private openRelativePathToWebviewPanelMap = new Map<string, WebviewPanel>;

  addDocumentAndPanel(document: PngDocumentDiffView, webviewPanel: WebviewPanel) {
    const path = document.uri.path;
    const relPath = getRelPath(document.uri);
    if (document.uri.scheme === "file") {
      document.onDispose(() => {
        this.openPathToDocumentMap.delete(path);
        this.openPathToWebviewPanelMap.delete(path);
        if (relPath) {
          this.openRelativePathToDocumentMap.delete(relPath);
          this.openRelativePathToWebviewPanelMap.delete(relPath);
        }
      });
      this.openPathToDocumentMap.set(path, document);
      this.openPathToWebviewPanelMap.set(path, webviewPanel);
      if (relPath) {
        this.openRelativePathToDocumentMap.set(relPath, document);
        this.openRelativePathToWebviewPanelMap.set(relPath, webviewPanel);
      }
    }
  }

  async findLink(document: PngDocumentDiffView) {
    await new Promise<void>((r) =>
      setTimeout(() => {
        r();
      }, 10)
    );
    if (document.uri.scheme === "git") {
      return [
        this.openPathToDocumentMap.get(document.uri.path),
        this.openPathToWebviewPanelMap.get(document.uri.path),
      ] as const;
    }
    const relPath = getRelPath(document.uri);
    if (relPath) {
      return [
        this.openRelativePathToDocumentMap.get(relPath),
        this.openRelativePathToWebviewPanelMap.get(relPath),
      ] as const;
    }
    return [undefined, undefined] as const;
  }
}