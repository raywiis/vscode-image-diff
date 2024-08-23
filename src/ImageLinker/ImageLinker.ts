import { WebviewPanel } from "vscode";
import { getRelPath } from "../getRelPath";
import { PngDocumentDiffView } from "../PngDocumentDiffView";
import { GithubDotDevStrategy } from "./GithubDotDevStrategy";
import { LinkPackage, LinkStrategy } from "./LinkStrategy";
import { StagedGitStrategy } from "./StagedGitStrategy";
import { GithubPRExtensionStrategy } from "./GithubPRExtensionStrategy";

const emptyLinkPackage: LinkPackage = [undefined, undefined];

const isFileDocument = (document: PngDocumentDiffView) => {
  return document.uri.scheme === "file";
};

export class ImageLinker {
  private pathLink = new Map<string, LinkPackage>();
  private relativePathLinkMap = new Map<string, LinkPackage>();

  private strategies: LinkStrategy[] = [
    new GithubDotDevStrategy(),
    new StagedGitStrategy(),
    new GithubPRExtensionStrategy(),
  ];

  private notifyStrategies(
    document: PngDocumentDiffView,
    webview: WebviewPanel,
  ) {
    for (const s of this.strategies) {
      s.onDocumentOpen(document, webview);
    }
  }

  addDocumentAndPanel(
    document: PngDocumentDiffView,
    webviewPanel: WebviewPanel,
  ) {
    this.notifyStrategies(document, webviewPanel);
    const path = document.uri.path;
    const relPath = getRelPath(document.uri);

    if (!isFileDocument(document)) {
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
    const linkFromStrategies = await Promise.all(
      this.strategies.map((s) => s.lookForLink(document)),
    ).then((res) => res.find((linkPackage) => linkPackage[0] !== undefined));
    if (linkFromStrategies) {
      return linkFromStrategies;
    }
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
