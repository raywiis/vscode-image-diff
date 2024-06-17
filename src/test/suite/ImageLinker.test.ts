import * as assert from "assert";
import * as vscode from "vscode";
import { ImageLinker } from "../../ImageLinker/ImageLinker";
import { PngDocumentDiffView } from "../../PngDocumentDiffView";
import { beforeEach, suite, test } from "mocha";
import fc from "fast-check";

suite("ImageLinker", () => {
  // TODO: Get various OS path and filename restrictions to filter arbitraries
  let imageLinker = new ImageLinker();

  beforeEach(() => {
    imageLinker = new ImageLinker();
  });

  const getDocumentFromUriString = (input: string): PngDocumentDiffView => {
    const uri = vscode.Uri.parse(input);
    const file = new PngDocumentDiffView(uri, new Uint8Array());
    return file;
  };
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
        const documentA = getDocumentFromUriString(a);
        const documentB = getDocumentFromUriString(b);
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

  test.skip("Should match URIs when looking at a PR with github.dev", async () => {
    const arbitrary = fc
      .record({
        username: fc.string(),
        filename: fc.string(),
      })
      .map(({ username, filename }) => {
        // vscode-vfs://github%2B7b2276223a312c22726566223a7b2274797065223a332c226964223a2231227d7d/raywiis/png-image-diff-sample-repo/png-clipart-eiffel-tower-graphy-paris-world-tower.png
        // vscode-userdata:/User/globalStorage/github.vscode-pull-request-github/temp/png-image-diff-sample-repo/png-clipart-eiffel-tower-graphy-paris-world-tower.png
        const githubData = { v: 1, ref: { type: 3, id: "1" } };
        const githubDataHex = [...JSON.stringify(githubData)]
          .map((c) => {
            return c.charCodeAt(0).toString(16).padStart(2, "00").slice(-2);
          })
          .join("");
        const githubDataUri = encodeURIComponent(`github+${githubDataHex}`);
        const a = `vscode-vfs://${githubDataUri}/${username}/repo/${filename}.png`;
        const b = `vscode-userdata:/User/globalStorage/github.vscode-pull-request-github/temp/repo${filename}.png`;
        return { a, b, filename };
      });

    const property = fc.asyncProperty(arbitrary, async ({ a, b, filename }) => {
      const documentA = getDocumentFromUriString(a);
      const documentB = getDocumentFromUriString(b);
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
    });

    fc.assert(property);
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
        const documentA = getDocumentFromUriString(a);
        const documentB = getDocumentFromUriString(b);
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
