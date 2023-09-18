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
import { PNG } from "pngjs";

function generateDiffData(a: PNG, b: PNG, alignment: AlignmentOption) {
  const mutualWidth = Math.max(a.width, b.width);
  const mutualHeight = Math.max(a.height, b.height);

  if (a.width === b.width && a.height === b.height) {
    const diff = getDiff(a, b);

    return {
      diffUri: diff.diffUri,
      diffPixelCount: diff.diffPixelCount,
    } as const;
  }

  const [verticalAlign, horizontalAlign] = alignment.split(
    "-",
  ) as [VerticalAlign, HorizontalAlign];
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
  return {
    diffUri: diff.diffUri,
    diffPixelCount: diff.diffPixelCount,
    paddedBase64Image: `data:image/png;base64, ${PNG.sync
      .write(paddedB)
      .toString("base64")}`,
  } as const;
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
      const aPng = await diffTarget.pngPromise;
      const bPng = await document.pngPromise;

      diffResults = generateDiffData(aPng, bPng, selectedAlignment);
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

        <img id="main-image" src="${diffResults?.paddedBase64Image ?? documentWebviewUri}" />
        ${
          diffResults
            ? /* html */ `
          <img id="diff-image" src="${diffResults.diffUri}"/>
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
            diffResults?.paddedBase64Image
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
            diffResults === undefined
              ? ""
              : /*html*/ `
              <div>${diffResults.diffPixelCount} different pixels</div>
            `
          }
            <div id="control-spacer"></div>
            <div id="scale-indicator"></div>
        </div>
      </body>
    </html>
  `;
}
