/**
 * Strategy for working in github.dev environments
 *
 * Example URIs:
 * vscode-vfs://github%2B7b2276223a312c22726566223a7b2274797065223a332c226964223a2231227d7d/uname/repo/image.png
 * vscode-userdata:/User/globalStorage/github.vscode-pull-request-github/temp/repo/image.png
 */

import { WebviewPanel } from "vscode";
import { PngDocumentDiffView } from "../PngDocumentDiffView";
import { LinkPackage, LinkStrategy } from "./LinkStrategy";

export class GithubDotDevStrategy implements LinkStrategy {
  private pendingLinks = new Map<
    string,
    { document: PngDocumentDiffView; webview: WebviewPanel }
  >();

  constructor() {}
  onDocumentOpen(document: PngDocumentDiffView, webview: WebviewPanel): void {
    if (document.uri.scheme !== "vscode-vfs") {
      return;
    }

    const [, , ...rest] = document.uri.path.split("/");
    const pathInRepo = rest.join("/");

    // TODO: Look into double registration
    // Like opening a file regularly and then again in diff
    this.pendingLinks.set(pathInRepo, { document, webview });
    document.onDispose(() => {
      this.pendingLinks.delete(pathInRepo);
    });
    webview.onDidDispose(() => {
      this.pendingLinks.delete(pathInRepo);
    });
  }

  async lookForLink(document: PngDocumentDiffView): Promise<LinkPackage> {
    await new Promise((resolve) => setTimeout(resolve, 10));
    if (document.uri.scheme !== "vscode-userdata") {
      return [undefined, undefined];
    }
    const [, , , , , ...rest] = document.uri.path.split("/");
    const pathInRepo = rest.join("/");
    const knownLink = this.pendingLinks.get(pathInRepo);
    if (knownLink) {
      return [knownLink.document, knownLink.webview];
    } else {
      return [undefined, undefined];
    }
  }
}
