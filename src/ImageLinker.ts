import { WebviewPanel } from "vscode";
import { getRelPath } from "./getRelPath";
import { PngDocumentDiffView } from "./PngDocumentDiffView";

type LinkPackage =
  | readonly [document: PngDocumentDiffView, webviewPanel: WebviewPanel]
  | readonly [undefined, undefined];

const emptyLinkPackage: LinkPackage = [undefined, undefined];

const isFileDocument = (document: PngDocumentDiffView) => {
  return document.uri.scheme === 'file'
}
type ParseGitQueryReturn = {
  parsed: true
  query: { ref: string }
} | {
  parsed: false;
  error: unknown;
}
const parseGitQuery = (query: string): ParseGitQueryReturn => {
  try {
    const parsedQuery = JSON.parse(query);
    if (typeof parsedQuery !== 'object' || !('ref' in parsedQuery)) {
      throw new Error('No ref in git query')
    }
    return { parsed: true, query: parsedQuery };
  } catch (error) {
    return { parsed: false, error };
  }
}
const gitRefForLastVersion = '';
const isStagedGitDocument = (document: PngDocumentDiffView) => {
  if (document.uri.scheme !== 'git') {
    return false;
  }
  const parsedQuery = parseGitQuery(document.uri.query);
  if (!parsedQuery.parsed) {
    return false;
  } else {
    return parsedQuery.query.ref === gitRefForLastVersion;
  }
}

export class ImageLinker {
  private pathLink = new Map<string, LinkPackage>();
  private relativePathLinkMap = new Map<string, LinkPackage>();

  addDocumentAndPanel(
    document: PngDocumentDiffView,
    webviewPanel: WebviewPanel,
  ) {
    const path = document.uri.path;
    const relPath = getRelPath(document.uri);

    if (!isFileDocument(document) && !isStagedGitDocument(document)) {
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
      const gitQuery = parseGitQuery(document.uri.query);
      if (gitQuery.parsed && gitQuery.query.ref === gitRefForLastVersion) {
        return emptyLinkPackage;
      }
      return this.pathLink.get(document.uri.path) ?? emptyLinkPackage;
    }
    const relPath = getRelPath(document.uri);
    if (relPath) {
      return this.relativePathLinkMap.get(relPath) ?? emptyLinkPackage;
    }
    return emptyLinkPackage;
  }
}
