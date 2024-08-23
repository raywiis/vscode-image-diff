/**
 * Strategy for working with github PR extension
 *
 * Example URIs
 *
 * for workspaces
 * file:///home/uname/unshared_dirname/shared_dirname/filename.png
 * vscode-userdata:/home/uname/.config/Code/User/globalStorage/github.vscode-pull-request-github/temp/unshared_dirname/shared_dirname/filename.png
 */

import { WebviewPanel } from "vscode";
import { PngDocumentDiffView } from "../PngDocumentDiffView";
import { LinkPackage, LinkStrategy } from "./LinkStrategy";

export class GithubPRExtensionStrategy implements LinkStrategy {
  private pendingLinks = new Map<
    string,
    { document: PngDocumentDiffView; webview: WebviewPanel }
  >();

  constructor() {}
  onDocumentOpen(document: PngDocumentDiffView, webview: WebviewPanel): void {
    if (document.uri.scheme !== "file") {
      return;
    }

    const filename = document.uri.path.split("/").at(-1);
    if (!filename) {
      return;
    }

    this.pendingLinks.set(filename, { document, webview });
    document.onDispose(() => {
      this.pendingLinks.delete(filename);
    });
    webview.onDidDispose(() => {
      this.pendingLinks.delete(filename);
    });
  }

  async lookForLink(document: PngDocumentDiffView): Promise<LinkPackage> {
    await new Promise((resolve) => setTimeout(resolve, 10));
    if (document.uri.scheme !== "vscode-userdata") {
      return [undefined, undefined];
    }
    const pathInRepo = document.uri.path.split("/").at(-1);
    if (!pathInRepo) {
      return [undefined, undefined];
    }
    const knownLink = this.pendingLinks.get(pathInRepo);
    if (knownLink) {
      return [knownLink.document, knownLink.webview];
    } else {
      return [undefined, undefined];
    }
  }
}
