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

  let diffUri: string | undefined = undefined;
  let diffPixelCount: number | undefined = undefined;
  let paddedBase64Image: string | undefined = undefined;
  if (diffTarget) {
    try {
      const aPng = await diffTarget.pngPromise;
      const bPng = await document.pngPromise;

      const mutualWidth = Math.max(aPng.width, bPng.width);
      const mutualHeight = Math.max(aPng.height, bPng.height);

      if (aPng.width === bPng.width && aPng.height === bPng.height) {
        const res = getDiff(aPng, bPng);
        diffUri = res.diffUri;
        diffPixelCount = res.diffPixelCount;
      } else {
        const [verticalAlign, horizontalAlign] = selectedAlignment.split(
          "-",
        ) as [VerticalAlign, HorizontalAlign];
        const paddedA = padImage(
          mutualWidth,
          mutualHeight,
          aPng,
          verticalAlign,
          horizontalAlign,
        );
        const paddedB = padImage(
          mutualWidth,
          mutualHeight,
          bPng,
          verticalAlign,
          horizontalAlign,
        );
        const res = getDiff(paddedA, paddedB);
        diffUri = res.diffUri;
        diffPixelCount = res.diffPixelCount;
        paddedBase64Image = `data:image/png;base64, ${PNG.sync
          .write(paddedB)
          .toString("base64")}`;
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

        <div>${document.uri.toString()}</div>
        <img id="main-image" src="${paddedBase64Image ?? documentWebviewUri}" />
        ${
          diffUri
            ? /* html */ `
          <img id="diff-image" src="${diffUri}"/>
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
            paddedBase64Image
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
            diffPixelCount === undefined
              ? ""
              : /*html*/ `
              <div>${diffPixelCount} different pixels</div>
            `
          }
            <div id="control-spacer"></div>
            <div id="scale-indicator"></div>
        </div>
      </body>
    </html>
  `;
}
