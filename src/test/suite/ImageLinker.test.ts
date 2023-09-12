import * as assert from "assert";
import * as vscode from "vscode";
import { ImageLinker } from "../../ImageLinker";
import { PngDocumentDiffView } from "../../PngDocumentDiffView";
import { beforeEach, suite, test } from "mocha";
import fc from "fast-check";

suite("ImageLinker", () => {
  let imageLinker = new ImageLinker();

  beforeEach(() => {
    imageLinker = new ImageLinker();
  });

  test(`Should match basic git uris`, async () => {
    const property = fc.asyncProperty(
      fc.string({ minLength: 1 }),
      fc.string({ minLength: 1 }),
      async (filename, username) => {
        const gitParam = encodeURIComponent(
          JSON.stringify({
            path: `/home/${username}/repo/${filename}.png`,
            ref: "~",
          }),
        );
        const matchingUris = [
          `file:///home/${username}/repo/${filename}.png`,
          `git:/home/${username}/repo/${filename}.png?${gitParam}`,
        ];

        const [a, b] = matchingUris;
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
