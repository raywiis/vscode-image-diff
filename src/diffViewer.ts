import * as vscode from "vscode";
import * as pixelMatch from "pixelmatch";
import { PNG } from "pngjs";
import { HostToWebviewMessages, WebviewToHostMessages } from "../webview/shared";
import { dirname } from "node:path";
import { isGithubPRExtensionUri } from "./isGithubPRExtensionUri";
import { PngDocumentDiffView } from "./PngDocumentDiffView";
import { ImageLinker } from "./ImageLinker";
import assert = require("node:assert");

type GetHtmlArgs = {
  panel: vscode.WebviewPanel;
  document: PngDocumentDiffView;
  diffTarget?: PngDocumentDiffView;
  context: vscode.ExtensionContext;
};

function padOutImage(desiredWidth: number, desiredHeight: number, image: PNG) {
  const actualWidth = image.width;
  const actualHeight = image.height;
  assert(actualWidth <= desiredWidth && actualHeight <= desiredHeight);

  const paddedImage = new PNG({ width: desiredWidth, height: desiredHeight });

  const verticalPadding = desiredHeight - actualHeight;
  const horizontalPadding = desiredWidth - actualWidth;

  const topPadding = Math.floor(verticalPadding / 2);
  const bottomPadding = Math.ceil(verticalPadding / 2);

  const leftPadding = Math.floor(horizontalPadding / 2);
  const rightPadding = Math.ceil(horizontalPadding / 2);

  const topPaddingByteCount = topPadding * desiredWidth * 4;
  paddedImage.data.fill(0x00000000);
  const bytesPerPixel = 4;

  for (let i = 0; i < actualHeight; i++) {
    const paddedRowOffset = bytesPerPixel * desiredWidth * i;
    const imageRowOffset = bytesPerPixel * actualWidth * i;

    for (let j = 0; j < actualWidth; j++) {
      const paddedOffset = paddedRowOffset + (j * bytesPerPixel);
      const imageOffset = imageRowOffset + (j * bytesPerPixel);
      const pixel = image.data.readInt32LE(imageOffset);
      paddedImage.data.writeInt32LE(pixel, paddedOffset);
    }

    for (let j = 0; j < horizontalPadding; j++) {
      paddedImage.data.writeInt32LE(0);
    }
  }

  return paddedImage;
}

function getDiffDataUri(aPng: PNG, bPng: PNG) {
  assert(aPng.width === bPng.width && aPng.height === bPng.height);
  const diff = new PNG({ width: aPng.width, height: bPng.height });
  const diffPixelCount = pixelMatch(aPng.data, bPng.data, diff.data, aPng.width, aPng.height, {
    threshold: 0,
    includeAA: true,
    alpha: 0.1,
  });
  const diffBuff = PNG.sync.write(diff);
  const diffUri = `data:image/png;base64, ${diffBuff.toString("base64")}`;
  return {
    diffUri,
    diffPixelCount
  } as const;
}

async function getHtml({ panel, document, diffTarget, context }: GetHtmlArgs) {
  const webview = panel.webview;
  const codiconsUri = webview.asWebviewUri(
    vscode.Uri.joinPath(
      context.extensionUri,
      "node_modules",
      "@vscode/codicons",
      "dist",
      "codicon.css"
    )
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
        const res = getDiffDataUri(aPng, bPng);
        diffUri = res.diffUri;
        diffPixelCount = res.diffPixelCount;
      } else {
        const paddedA = padOutImage(mutualWidth, mutualHeight, aPng);
        const paddedB = padOutImage(mutualWidth, mutualHeight, bPng);
        const res = getDiffDataUri(paddedA, paddedB);
        diffUri = res.diffUri;
        diffPixelCount = res.diffPixelCount;
        paddedBase64Image = `data:image/png;base64, ${PNG.sync.write(paddedB).toString('base64')}`;
      }
    } catch (err) {
      console.error(err);
    }
  }
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, "out", "webview", "viewer.js")
  );
  const styleUri = vscode.Uri.joinPath(
    context.extensionUri,
    "out",
    "webview",
    "viewer.css"
  );
  const styleWebviewUri = panel.webview.asWebviewUri(styleUri);
  const documentWebviewUri = panel.webview.asWebviewUri(document.uri);
  return /* html */`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta
          http-equiv="Content-Security-Policy"
          content="default-src 'none'; img-src * ${webview.cspSource
    } blob: data:; style-src 'unsafe-inline' ${webview.cspSource}; script-src ${webview.cspSource
    }; font-src ${webview.cspSource};"
        >
        <title>Image diff</title>
        <link href="${codiconsUri}" rel="stylesheet"/>
        <link href="${styleWebviewUri}" rel="stylesheet"/>
      </head>
      <body>
        <img id="main-image" src="${paddedBase64Image ?? documentWebviewUri}" />
        ${diffUri
      ? /* html */`
          <img id="diff-image" src="${diffUri}"/>
        `
      : ""
    }
        <script src="${scriptUri}"></script>
        <div id="controls">
          <vscode-checkbox id="sync-checkbox" checked>Sync</vscode-checkbox>
          <vscode-checkbox id="diff-checkbox">Diff</vscode-checkbox>
          ${diffPixelCount === undefined
      ? ''
      : /*html*/`
              <span>${diffPixelCount} different pixels</span>
            `}
            <span>${paddedBase64Image ? 'padded' : ''}</span>
            <span id="control-spacer"></span>
            <span id="scale-indicator"></span>
        </div>
      </body>
    </html>
  `;
}

export class ImageDiffViewer
  implements vscode.CustomReadonlyEditorProvider<PngDocumentDiffView>
{
  public static viewType = "image-diff.image-with-diff";
  public static register(context: vscode.ExtensionContext) {
    const provider = new ImageDiffViewer(context);
    const registration = vscode.window.registerCustomEditorProvider(
      this.viewType,
      provider,
      {
        supportsMultipleEditorsPerDocument: false,
      }
    );
    return { registration, provider };
  }

  imageLinker = new ImageLinker();

  lastActiveDiffPanel: vscode.WebviewPanel | undefined;

  constructor(private context: vscode.ExtensionContext) {
    context.extensionUri;
  }

  openCustomDocument(
    uri: vscode.Uri,
    openContext: vscode.CustomDocumentOpenContext,
    token: vscode.CancellationToken
  ): PngDocumentDiffView {
    return new PngDocumentDiffView(uri, openContext.untitledDocumentData);
  }

  toggleActivePanelDiff() {
    if (this.lastActiveDiffPanel) {
      this.lastActiveDiffPanel.webview.postMessage({ type: 'toggle_diff' } as HostToWebviewMessages);
    }
  }

  private registerOpenDocument(
    document: PngDocumentDiffView,
    webviewPanel: vscode.WebviewPanel
  ) {
    const roots = vscode.workspace.workspaceFolders?.map((f) => f.uri.path);
    if (!roots) {
      return;
    }

    if (document.uri.scheme === 'git' || isGithubPRExtensionUri(document.uri)) {
      /** Assuming last resolved panel is the last active one */
      this.lastActiveDiffPanel = webviewPanel;
    }

    this.imageLinker.addDocumentAndPanel(document, webviewPanel);
  }

  async resolveCustomEditor(
    document: PngDocumentDiffView,
    webviewPanel: vscode.WebviewPanel,
    token: vscode.CancellationToken
  ): Promise<void> {
    this.registerOpenDocument(document, webviewPanel);
    const [diffTarget, diffWebview] = await this.imageLinker.findLink(document);

    console.log({ from: document.uri, to: diffTarget?.uri });

    const getRootUri = (uri: vscode.Uri) => {
      const dirPath = dirname(uri.path);
      const rootUri = uri.with({ path: dirPath });
      return rootUri;
    };

    webviewPanel.title = "This is shown to user?";
    const localResourceRoots = [
      getRootUri(document.uri),
      vscode.Uri.joinPath(
        this.context.extensionUri,
        "node_modules",
        "@vscode/codicons",
        "dist"
      ),
      vscode.Uri.joinPath(this.context.extensionUri, "out", "webview"),
    ];

    webviewPanel.onDidChangeViewState((event) => {
      if (!event.webviewPanel.active) {
        return;
      }
      if (!(document.uri.scheme === 'git' || isGithubPRExtensionUri(document.uri))) {
        return;
      }
      this.lastActiveDiffPanel = webviewPanel;
    });


    webviewPanel.onDidDispose(() => {
      if (this.lastActiveDiffPanel === webviewPanel) {
        this.lastActiveDiffPanel = undefined;
      }
    });

    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots,
    };
    webviewPanel.webview.html = await getHtml({
      panel: webviewPanel,
      document,
      diffTarget,
      context: this.context,
    });
    let otherView = diffWebview;
    document.onWebviewOpen((newPanel) => {
      otherView = newPanel;
    });
    webviewPanel.webview.onDidReceiveMessage(
      async (message: WebviewToHostMessages) => {
        if (message.type === "ready") {
          webviewPanel.webview.postMessage({
            type: "show_image",
          });
          webviewPanel.webview.postMessage({ type: "enable_transform_report" });
          diffTarget?.registerNewWebview(webviewPanel);
          if (diffWebview) {
            diffWebview.webview.postMessage({
              type: "enable_transform_report",
            });
          }
        } else if (message.type === "transform") {
          if (otherView) {
            otherView.webview.postMessage({
              type: "transform",
              data: message.data,
            });
          }
        } else {
          throw new Error("Unsupported message");
        }
      }
    );
  }
}
