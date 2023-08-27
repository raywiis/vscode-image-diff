import { WebviewPanel } from "vscode";
import { getRelPath } from "./getRelPath";
import { PngDocumentDiffView } from "./PngDocumentDiffView";

type LinkPackage =
  | readonly [document: PngDocumentDiffView, webviewPanel: WebviewPanel]
  | readonly [undefined, undefined];

const emptyLinkPackage: LinkPackage = [undefined, undefined];

export class ImageLinker {
  private pathLink = new Map<string, LinkPackage>();
  private relativePathLinkMap = new Map<string, LinkPackage>();

  addDocumentAndPanel(
    document: PngDocumentDiffView,
    webviewPanel: WebviewPanel,
  ) {
    const path = document.uri.path;
    const relPath = getRelPath(document.uri);

    if (document.uri.scheme !== "file") {
      return;
    }

    const linkPackage: LinkPackage = [document, webviewPanel];

    document.onDispose(() => {
      this.pathLink.delete(path);
      if (relPath) {
        this.relativePathLinkMap.delete(relPath);
      }
    });
    this.pathLink.set(path, linkPackage);
    if (relPath) {
      this.relativePathLinkMap.set(relPath, linkPackage);
    }
  }

  async findLink(document: PngDocumentDiffView): Promise<LinkPackage> {
    await new Promise<void>((r) =>
      setTimeout(() => {
        r();
      }, 10),
    );
    if (document.uri.scheme === "file") {
      return emptyLinkPackage;
    }
    if (document.uri.scheme === "git") {
      return this.pathLink.get(document.uri.path) ?? emptyLinkPackage;
    }
    const relPath = getRelPath(document.uri);
    if (relPath) {
      return this.relativePathLinkMap.get(relPath) ?? emptyLinkPackage;
    }
    return emptyLinkPackage;
  }
}
