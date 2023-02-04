import * as vscode from "vscode";
import * as pixelMatch from "pixelmatch";
import { PNG } from "pngjs";
import { WebviewToHostMessages } from "../webview/shared";
import { dirname } from "node:path";

type GetHtmlArgs = {
  panel: vscode.WebviewPanel;
  document: PngDocumentDiffView;
  diffTarget?: vscode.CustomDocument;
  context: vscode.ExtensionContext;
};

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
  if (diffTarget) {
    try {
      const a = await vscode.workspace.fs.readFile(diffTarget.uri);
      const b = await vscode.workspace.fs.readFile(document.uri);
      const aPng = PNG.sync.read(Buffer.from(a));
      const bPng = PNG.sync.read(Buffer.from(b));

      if (aPng.width === bPng.width && aPng.height === bPng.height) {
        const diff = new PNG({ width: aPng.width, height: bPng.height });
        pixelMatch(aPng.data, bPng.data, diff.data, aPng.width, aPng.height, {
          alpha: 0.1,
        });
        const diffBuff = PNG.sync.write(diff);
        diffUri = `data:image/png;base64, ${diffBuff.toString("base64")}`;
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
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta
          http-equiv="Content-Security-Policy"
          content="default-src 'none'; img-src * ${
            webview.cspSource
          } blob: data:; style-src 'unsafe-inline' ${webview.cspSource}; script-src ${
    webview.cspSource
  }; font-src ${webview.cspSource};"
        >
        <title>Image diff</title>
        <link href="${codiconsUri}" rel="stylesheet"/>
        <link href="${styleWebviewUri}" rel="stylesheet"/>
      </head>
      <body>
        <img id="main-image" src="${documentWebviewUri}" />
        <p>
          ${document.uri.toString()} <br/> ${document.uri.path}
        </p>
        ${
          diffUri
            ? `
        <p>${diffUri}</p>
          <img id="diff-image" src="${diffUri}"/>
        `
            : ""
        }
        <script src="${scriptUri}"></script>
        <div id="controls">
          <vscode-radio-group direction="vertical">
            <vscode-radio id="fit-radio" value="fit">Fit</vscode-radio>
            <vscode-radio id="original-radio" value="original" checked>Original</vscode-radio>
          </vscode-radio-group>
          <vscode-checkbox id="sync-checkbox" checked>Sync</vscode-checkbox>
          <vscode-checkbox id="diff-checkbox">Diff</vscode-checkbox>
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
    return registration;
  }

  openFileDocMap = new Map<string, PngDocumentDiffView>();
  openFileWebviewPanelMap = new Map<string, vscode.WebviewPanel>();

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

  private registerOpenDocument(
    document: PngDocumentDiffView,
    webviewPanel: vscode.WebviewPanel
  ) {
    const roots = vscode.workspace.workspaceFolders?.map((f) => f.uri.path);
    if (!roots) {
      return;
    }
    const path = document.uri.path;
    if (document.uri.scheme === "file") {
      document.onDispose(() => {
        this.openFileDocMap.delete(path);
        this.openFileWebviewPanelMap.delete(path);
      });
      this.openFileDocMap.set(path, document);
      this.openFileWebviewPanelMap.set(path, webviewPanel);
    }
  }

  private async getDiffTarget(document: PngDocumentDiffView) {
    await new Promise<void>((r) =>
      setTimeout(() => {
        r();
      }, 10)
    );
    if (document.uri.scheme === "git") {
      return [
        this.openFileDocMap.get(document.uri.path),
        this.openFileWebviewPanelMap.get(document.uri.path),
      ] as const;
    }
    return [undefined, undefined] as const;
  }

  async resolveCustomEditor(
    document: PngDocumentDiffView,
    webviewPanel: vscode.WebviewPanel,
    token: vscode.CancellationToken
  ): Promise<void> {
    this.registerOpenDocument(document, webviewPanel);
    const [diffTarget, diffWebview] = await this.getDiffTarget(document);

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

class PngDocumentDiffView implements vscode.CustomDocument {
  private disposeEmitter = new vscode.EventEmitter<void>();
  private newWebviewEmitter = new vscode.EventEmitter<vscode.WebviewPanel>();
  public onWebviewOpen = this.newWebviewEmitter.event;
  public onDispose = this.disposeEmitter.event;
  data: Thenable<Uint8Array>;

  constructor(public uri: vscode.Uri, untitledData: Uint8Array | undefined) {
    // https://file%2B.vscode-resource.vscode-cdn.net/home/rejus/image-diff/src/collect-payment-spec-js-invoice-actions-should-open-charge-with-credit-card-dialog-for-draft-invoice-snap.png?version%3D1674999497292
    if (untitledData) {
      this.data = Promise.resolve(untitledData);
    }
    this.data = vscode.workspace.fs.readFile(uri);
  }

  registerNewWebview(webviewPanel: vscode.WebviewPanel) {
    this.newWebviewEmitter.fire(webviewPanel);
  }

  dispose(): void {
    this.newWebviewEmitter.dispose();
    this.disposeEmitter.fire();
    this.disposeEmitter.dispose();
  }
}
