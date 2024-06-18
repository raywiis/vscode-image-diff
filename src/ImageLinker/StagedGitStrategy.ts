import { WebviewPanel } from "vscode";
import { PngDocumentDiffView } from "../PngDocumentDiffView";
import { LinkPackage, LinkStrategy } from "./LinkStrategy";

type ParseGitQueryReturn =
  | {
      parsed: true;
      query: { ref: string };
    }
  | {
      parsed: false;
      error: unknown;
    };

const parseGitQuery = (query: string): ParseGitQueryReturn => {
  try {
    const parsedQuery = JSON.parse(query);
    if (typeof parsedQuery !== "object" || !("ref" in parsedQuery)) {
      throw new Error("No ref in git query");
    }
    return { parsed: true, query: parsedQuery };
  } catch (error) {
    return { parsed: false, error };
  }
};

const gitRefForLastVersion = "";

const isStagedGitDocument = (document: PngDocumentDiffView) => {
  if (document.uri.scheme !== "git") {
    return false;
  }
  const parsedQuery = parseGitQuery(document.uri.query);
  if (!parsedQuery.parsed) {
    return false;
  } else {
    return parsedQuery.query.ref === gitRefForLastVersion;
  }
};

export class StagedGitStrategy implements LinkStrategy {
  private linkMap = new Map<
    string,
    { document: PngDocumentDiffView; webview: WebviewPanel }
  >();

  onDocumentOpen(document: PngDocumentDiffView, webview: WebviewPanel): void {
    if (!isStagedGitDocument(document)) {
      return;
    }
    const path = document.uri.path;
    if (!path) {
      return;
    }
    this.linkMap.set(path, { document, webview });
    document.onDispose(() => {
      this.linkMap.delete(path);
    });
  }

  async lookForLink(document: PngDocumentDiffView): Promise<LinkPackage> {
    await new Promise(r => setTimeout(r, 10));
    if (document.uri.scheme !== 'git') {
      return [undefined, undefined];
    }
    const gitQuery = parseGitQuery(document.uri.query);
    if (gitQuery.parsed && gitQuery.query.ref === gitRefForLastVersion) {
      return [undefined, undefined];
    }
    const path = document.uri.path;
    const knownPackage = this.linkMap.get(path);
    if (knownPackage) {
      return [knownPackage.document, knownPackage.webview];
    } else {
      return [undefined, undefined];
    }
  }
}
