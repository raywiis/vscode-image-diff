import * as assert from "assert";
import * as vscode from "vscode";
import { ImageLinker } from "../../ImageLinker";
import { PngDocumentDiffView } from "../../PngDocumentDiffView";
import { beforeEach, suite, test } from "mocha";
import fc from "fast-check";

suite("ImageLinker", () => {
  // TODO: Get various OS path and filename restrictions to filter arbitraries
  let imageLinker = new ImageLinker();

  beforeEach(() => {
    imageLinker = new ImageLinker();
  });

  const getUnixFilePath = (username: string, filename: string) =>
    `/home/${username}/repo/${filename}.png`;
  const getWindowsFilePath = (username: string, filename: string) =>
    `/c%3A/Users/${username}/repo/${filename}.png`;
  const getGitQueryString = (path: string, ref: string) =>
    encodeURIComponent(
      JSON.stringify({
        path,
        ref,
      }),
    );

  test(`Should match a file and git uri`, async () => {
    const property = fc.asyncProperty(
      fc
        .record({
          username: fc.string({ minLength: 1 }),
          filename: fc.string({ minLength: 1 }),
        })
        .map(({ filename, username }) => {
          const filepath = getUnixFilePath(username, filename);
          const gitParam = getGitQueryString(filepath, "~");
          const a = `file://${filepath}`;
          const b = `git:${filepath}?${gitParam}`;
          return { a, b, filename };
        }),
      async ({ a, b, filename }) => {
        const uriA = vscode.Uri.parse(a);
        const uriB = vscode.Uri.parse(b);
        const documentA = new PngDocumentDiffView(uriA, new Uint8Array());
        const documentB = new PngDocumentDiffView(uriB, new Uint8Array());
        const webviewPanel = vscode.window.createWebviewPanel(
          "image-diff",
          filename,
          vscode.ViewColumn.Active,
        );

        imageLinker.addDocumentAndPanel(documentA, webviewPanel);
        const [foundDocument, foundWebview] =
          await imageLinker.findLink(documentB);

        assert.equal(foundDocument, documentA);
        assert.equal(foundWebview, webviewPanel);
      },
    );

    await fc.assert(property);
  });

  test(`Should match two git uris when one has a HEAD ref (staged)`, async () => {
    const forbiddenSymbolRegex = /(#|\?)/;
    const property = fc.asyncProperty(
      fc
        .record({
          username: fc
            .string({ minLength: 1 })
            .filter((s) => !forbiddenSymbolRegex.test(s)),
          filename: fc
            .string({ minLength: 1 })
            .filter((s) => !forbiddenSymbolRegex.test(s)),
        })
        .map(({ username, filename }) => {
          const filepath = getWindowsFilePath(username, filename);
          const gitQueryA = getGitQueryString(filepath, "");
          const gitQueryB = getGitQueryString(filepath, "HEAD");
          const a = `git:${filepath}?${gitQueryA}`;
          const b = `git:${filepath}?${gitQueryB}`;
          return { a, b, filename };
        }),
      async ({ a, b, filename }) => {
        const uriA = vscode.Uri.parse(a);
        const uriB = vscode.Uri.parse(b);
        const documentA = new PngDocumentDiffView(uriA, new Uint8Array());
        const documentB = new PngDocumentDiffView(uriB, new Uint8Array());
        const webviewPanel = vscode.window.createWebviewPanel(
          "image-diff",
          filename,
          vscode.ViewColumn.Active,
        );

        imageLinker.addDocumentAndPanel(documentA, webviewPanel);
        const [foundDocument, foundWebview] =
          await imageLinker.findLink(documentB);

        assert.equal(foundDocument, documentA);
        assert.equal(foundWebview, webviewPanel);
      },
    );

    await fc.assert(property);
  });
});
