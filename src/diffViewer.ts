import * as vscode from 'vscode';
import * as pixelMatch from 'pixelmatch';
import { PNG } from 'pngjs';

function uint8ToDataUri(data: Uint8Array) {
  const buffer = Buffer.from(data);
  const b64 = buffer.toString('base64');
  return `data:image/png;base64, ${b64}`;
}

async function getHtml(panel: vscode.WebviewPanel, document?: vscode.CustomDocument, diffTarget?: vscode.CustomDocument) {
  const webview = panel.webview;
  let dataUri = null;
  let diffUri = null;
  if (document) {
    const data = await vscode.workspace.fs.readFile(document.uri);
    dataUri = uint8ToDataUri(data);

    if (diffTarget) {
      try {
        const a = await vscode.workspace.fs.readFile(diffTarget.uri);
        const b = await vscode.workspace.fs.readFile(document.uri);
        const aPng = PNG.sync.read(Buffer.from(a));
        const bPng = PNG.sync.read(Buffer.from(b));

        if (aPng.width === bPng.width && aPng.height === bPng.height) {
          const diff = new PNG({ width: aPng.width, height: bPng.height });
          pixelMatch(aPng.data, bPng.data, diff.data, aPng.width, aPng.height, {alpha: 0});
          const diffBuff = PNG.sync.write(diff);
          diffUri = `data:image/png;base64, ${diffBuff.toString('base64')}`;
        }
      } catch(err) {
        console.error(err);
      }
    }
  }
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} blob: data:; style-src ${webview.cspSource};">
        <title>Image diff</title>
      </head>
      <body>
        ${document ? (`
          <p>
          ${document.uri.toString()} | 
          ${document.uri.path}
          </p>
        `) : ''}
        ${dataUri ? (
          `
          <img src="${dataUri}"/>
          `
        ) : ''}
        ${diffUri ? (`
        <p>${diffUri}</p>
          <img src="${diffUri}"/>
        `) : ''}
      </body>
    </html>
  `;
}

export async function initWebview(panel: vscode.WebviewPanel) {
  panel.title = 'This is shown to user?';
  panel.webview.html = await getHtml(panel);
}

export class ImageDiffViewer implements vscode.CustomReadonlyEditorProvider {
  openFileDocMap = new Map<string, vscode.CustomDocument>();

  public static viewType = 'image-diff.image-with-diff';
  public static register() {
    const provider = new ImageDiffViewer();
    const registration = vscode.window.registerCustomEditorProvider(this.viewType, provider, {
      supportsMultipleEditorsPerDocument: true,
    });
    return registration;
  }

  openCustomDocument(uri: vscode.Uri, openContext: vscode.CustomDocumentOpenContext, token: vscode.CancellationToken): vscode.CustomDocument | Thenable<vscode.CustomDocument> {
    return new PngDocumentDiffView(uri);
  }

  private registerOpenDocument(document: vscode.CustomDocument) {
    const roots = vscode.workspace.workspaceFolders?.map(f => (f.uri.path));
    console.log(roots);
    if (!roots) {
      return;
    }
    const path = document.uri.path;
    console.log({ roots, path, s: document.uri.scheme });
    if (document.uri.scheme === 'file') {
      // TODO: What on dispose?
      this.openFileDocMap.set(path, document);
    }
    // TODO: Event system to prevent race conditions when opening diff
  }

  private async getDiffTarget(document: vscode.CustomDocument): Promise<vscode.CustomDocument | undefined> {
    console.log('diff target', { document });
    await new Promise<void>(r => setTimeout(() => {
      r();
    }, 10));
    if (document.uri.scheme === 'git') {
      return this.openFileDocMap.get(document.uri.path);
    }
  }

  async resolveCustomEditor(document: vscode.CustomDocument, webviewPanel: vscode.WebviewPanel, token: vscode.CancellationToken): Promise<void> {
    this.registerOpenDocument(document);
    const diffTarget = await this.getDiffTarget(document);
    webviewPanel.title = 'This is shown to user?';
    webviewPanel.webview.html = await getHtml(webviewPanel, document, diffTarget);

    webviewPanel.onDidChangeViewState(async () => {
      webviewPanel.title = 'This is shown to user?';
      webviewPanel.webview.html = await getHtml(webviewPanel, document, diffTarget);
    });

    webviewPanel.webview.onDidReceiveMessage((message) => {
      console.log('message', { message });
    });
    webviewPanel.webview.postMessage('ech');
  }
}

class PngDocumentDiffView implements vscode.CustomDocument {
  constructor(public uri: vscode.Uri) { }
  dispose(): void {
    throw new Error('Method not implemented.');
  }
}
