import * as vscode from "vscode";
import * as pixelMatch from "pixelmatch";
import { PNG } from "pngjs";
import { WebviewToHostMessages } from "./webview/shared";

function uint8ToDataUri(data: Uint8Array) {
  const buffer = Buffer.from(data);
  const b64 = buffer.toString("base64");
  return `data:image/png;base64, ${b64}`;
}

type GetHtmlArgs = {
  panel: vscode.WebviewPanel;
  document?: vscode.CustomDocument;
  diffTarget?: vscode.CustomDocument;
  context: vscode.ExtensionContext;
};

async function getHtml({ panel, document, diffTarget, context }: GetHtmlArgs) {
  const webview = panel.webview;
  let diffUri = null;
  if (document) {
    if (diffTarget) {
      try {
        const a = await vscode.workspace.fs.readFile(diffTarget.uri);
        const b = await vscode.workspace.fs.readFile(document.uri);
        const aPng = PNG.sync.read(Buffer.from(a));
        const bPng = PNG.sync.read(Buffer.from(b));

        if (aPng.width === bPng.width && aPng.height === bPng.height) {
          const diff = new PNG({ width: aPng.width, height: bPng.height });
          pixelMatch(aPng.data, bPng.data, diff.data, aPng.width, aPng.height, {
            alpha: 0,
          });
          const diffBuff = PNG.sync.write(diff);
          diffUri = `data:image/png;base64, ${diffBuff.toString("base64")}`;
        }
      } catch (err) {
        console.error(err);
      }
    }
  }
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, "out", "webview", "viewer.js")
  );
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta
          http-equiv="Content-Security-Policy"
          content="default-src 'none'; img-src ${
            webview.cspSource
          } blob: data:; style-src ${webview.cspSource}; script-src ${
    webview.cspSource
  }"
        >
        <title>Image diff</title>
      </head>
      <body>
        ${
          document
            ? `
          <p>
          ${document.uri.toString()} | 
          ${document.uri.path}
          </p>
        `
            : ""
        }
        ${
          diffUri
            ? `
        <p>${diffUri}</p>
          <img src="${diffUri}"/>
        `
            : ""
        }
        <script src="${scriptUri}"></script>
      </body>
    </html>
  `;
}

export async function initWebview(
  panel: vscode.WebviewPanel,
  context: vscode.ExtensionContext
) {
  panel.title = "This is shown to user?";
  panel.webview.html = await getHtml({ panel, context });
}

export class ImageDiffViewer implements vscode.CustomReadonlyEditorProvider {
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

  openFileDocMap = new Map<string, vscode.CustomDocument>();
  constructor(private context: vscode.ExtensionContext) {
    context.extensionUri;
  }

  openCustomDocument(
    uri: vscode.Uri,
    openContext: vscode.CustomDocumentOpenContext,
    token: vscode.CancellationToken
  ): vscode.CustomDocument | Thenable<vscode.CustomDocument> {
    return new PngDocumentDiffView(uri);
  }

  private registerOpenDocument(document: vscode.CustomDocument) {
    const roots = vscode.workspace.workspaceFolders?.map((f) => f.uri.path);
    console.log(roots);
    if (!roots) {
      return;
    }
    const path = document.uri.path;
    console.log({ roots, path, s: document.uri.scheme });
    if (document.uri.scheme === "file") {
      // TODO: What on dispose?
      this.openFileDocMap.set(path, document);
    }
    // TODO: Event system to prevent race conditions when opening diff
  }

  private async getDiffTarget(
    document: vscode.CustomDocument
  ): Promise<vscode.CustomDocument | undefined> {
    console.log("diff target", { document });
    await new Promise<void>((r) =>
      setTimeout(() => {
        r();
      }, 10)
    );
    if (document.uri.scheme === "git") {
      return this.openFileDocMap.get(document.uri.path);
    }
  }

  async resolveCustomEditor(
    document: vscode.CustomDocument,
    webviewPanel: vscode.WebviewPanel,
    token: vscode.CancellationToken
  ): Promise<void> {
    this.registerOpenDocument(document);
    const diffTarget = await this.getDiffTarget(document);
    webviewPanel.title = "This is shown to user?";
    webviewPanel.webview.options = {
      enableScripts: true,
    };
    webviewPanel.webview.html = await getHtml({
      panel: webviewPanel,
      document,
      diffTarget,
      context: this.context,
    });

    webviewPanel.onDidChangeViewState(async () => {
      webviewPanel.title = "This is shown to user?";
      webviewPanel.webview.html = await getHtml({
        panel: webviewPanel,
        document,
        diffTarget,
        context: this.context,
      });
    });

    webviewPanel.webview.onDidReceiveMessage(async (message: WebviewToHostMessages) => {
      if (message.type !== 'ready') {
        throw new Error('Unsupported message');
      }
      const image = await vscode.workspace.fs.readFile(document.uri);
      webviewPanel.webview.postMessage({ type: 'show_image', image });
    });
  }
}

class PngDocumentDiffView implements vscode.CustomDocument {
  constructor(public uri: vscode.Uri) {}
  dispose(): void {
    throw new Error("Method not implemented.");
  }
}
