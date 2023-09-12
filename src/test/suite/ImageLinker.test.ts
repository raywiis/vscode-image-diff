import * as assert from "assert";
import * as vscode from "vscode";
import { ImageLinker } from "../../ImageLinker";
import { PngDocumentDiffView } from "../../PngDocumentDiffView";
import { beforeEach, afterEach, suite, test } from "mocha";

suite("ImageLinker", () => {
  let imageLinker = new ImageLinker();

  beforeEach(() => {
    imageLinker = new ImageLinker();
  });

  const gitParam = encodeURIComponent(JSON.stringify(
    { "path": "/home/user/repo/image.png", "ref": "~" }
  ));

  const matchingUris: [string, string][] = [
    [
      "file:///home/user/repo/image.png",
      `git:/home/user/repo/image.png?${gitParam}`,
    ],
  ];

  for (const pair of matchingUris) {
    const [a, b] = pair;

    test(`Should match\n>> ${a} \n>> ${b}`, async () => {
      const uriA = vscode.Uri.parse(a);
      const uriB = vscode.Uri.parse(b);
      const documentA = new PngDocumentDiffView(uriA, new Uint8Array());
      const documentB = new PngDocumentDiffView(uriB, new Uint8Array());
      const webviewPanel = vscode.window.createWebviewPanel(
        "image-diff",
        "test",
        vscode.ViewColumn.Active,
      );

      imageLinker.addDocumentAndPanel(documentA, webviewPanel);
      const [foundDocument, foundWebview] = await imageLinker.findLink(documentB);

      assert.equal(foundDocument, documentA);
      assert.equal(foundWebview, webviewPanel);
    });
  }
});
