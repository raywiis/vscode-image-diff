import * as vscode from "vscode";
import { PngDocumentDiffView } from "../PngDocumentDiffView";
import {
  AlignmentOption,
  HorizontalAlign,
  VerticalAlign,
  alignmentOptions,
  padImage,
} from "../padImage";
import { getDiff } from "./getDiff";
import { JimpClass } from "@jimp/types";

function generateDiffData(a: JimpClass, b: JimpClass, alignment: AlignmentOption) {
const mutualWidth = Math.max(a.bitmap.width, b.bitmap.width);
  const mutualHeight = Math.max(a.bitmap.height, b.bitmap.height);

  if (a.bitmap.width === b.bitmap.width && a.bitmap.height === b.bitmap.height) {
    const diff = getDiff(a, b);
    return diff.then((diff) => {
      return {
        diffUri: diff.diffUri,
        diffPixelCount: diff.diffPixelCount,
        paddedBase64Image: null,
      } as const;
    });
  }

  const [verticalAlign, horizontalAlign] = alignment.split("-") as [
    VerticalAlign,
    HorizontalAlign,
  ];
  const paddedA = padImage(
    mutualWidth,
    mutualHeight,
    a,
    verticalAlign,
    horizontalAlign,
  );
  const paddedB = padImage(
    mutualWidth,
    mutualHeight,
    b,
    verticalAlign,
    horizontalAlign,
  );
  const diff = getDiff(paddedA, paddedB);
  return diff.then((diff) => {
    return {
      diffUri: diff.diffUri,
      diffPixelCount: diff.diffPixelCount,
      paddedBase64Image: `data:image/png;base64, ${paddedB.getBase64("image/png")}`,
    } as const;
  });
}

export type GetWebviewHtmlArgs = {
  panel: vscode.WebviewPanel;
  document: PngDocumentDiffView;
  diffTarget?: PngDocumentDiffView;
  context: vscode.ExtensionContext;
  selectedAlignment: AlignmentOption;
};

export async function getWebviewHtml({
  panel,
  document,
  diffTarget,
  context,
  selectedAlignment,
}: GetWebviewHtmlArgs) {
  const webview = panel.webview;
  const codiconsUri = webview.asWebviewUri(
    vscode.Uri.joinPath(
      context.extensionUri,
      "node_modules",
      "@vscode/codicons",
      "dist",
      "codicon.css",
    ),
  );

  let diffResults: ReturnType<typeof generateDiffData> | undefined;
  if (diffTarget) {
    try {
      const [aPng, bPng] = await Promise.all([
        diffTarget.pngPromise,
        document.pngPromise,
      ]);
      if (aPng.ok && bPng.ok) {
        diffResults = generateDiffData(aPng.t, bPng.t, selectedAlignment);
      }
    } catch (err) {
      console.error(err);
    }
  }
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, "out", "webview", "viewer.js"),
  );
  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, "out", "webview", "viewer.css"),
  );
  const documentWebviewUri = panel.webview.asWebviewUri(document.uri);

  const diffResults2 = await diffResults;

  return /* html */ `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta
          http-equiv="Content-Security-Policy"
          content="default-src 'none'; img-src * ${
            webview.cspSource
          } blob: data:; style-src 'unsafe-inline' ${
            webview.cspSource
          }; script-src ${webview.cspSource}; font-src ${webview.cspSource};"
        >
        <title>Image diff</title>
        <link href="${codiconsUri}" rel="stylesheet"/>
        <link href="${styleUri}" rel="stylesheet"/>
      </head>
      <body>
        <div id="error">
          <span id="error-icon" class="codicon codicon-warning"></span>
          <div id="error-message"></div>
        </div>
        <img id="main-image" draggable="false" src="${
          diffResults2?.paddedBase64Image ?? documentWebviewUri
        }" />
        ${
          diffResults2
            ? /* html */ `
          <img id="diff-image" draggable="false" src="${diffResults2.diffUri}"/>
        `
            : ""
        }
        <script src="${scriptUri}"></script>
        <div id="controls">
          <div>
            <vscode-checkbox id="sync-checkbox" checked>Sync</vscode-checkbox>
          </div>
          <div>
            <vscode-checkbox id="diff-checkbox">Diff</vscode-checkbox>
          </div>
          ${
            diffResults2?.paddedBase64Image
              ? /* html */ `
            <div class="dropdown-container">
              <vscode-dropdown id="alignment-dropdown">
              <span slot="indicator" class="codicon codicon-layout"></span>
              ${alignmentOptions
                .map(
                  (option) =>
                    `<vscode-option ${
                      selectedAlignment === option ? "selected" : ""
                    }>
                  ${option}
                </vscode-option>`,
                )
                .join("\n")}
              </vscode-dropdown>
            </div>`
              : ""
          }
          ${
            diffResults2 === undefined
              ? ""
              : /*html*/ `
              <div>${diffResults2.diffPixelCount} different pixels</div>
            `
          }
            <div id="control-spacer"></div>
            <div id="scale-indicator"></div>
        </div>
      </body>
    </html>
  `;
}
