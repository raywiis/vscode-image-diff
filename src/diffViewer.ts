import * as vscode from "vscode";
import * as pixelMatch from "pixelmatch";
import { PNG } from "pngjs";
import { HostToWebviewMessages, WebviewToHostMessages } from "../webview/shared";
import { dirname } from "node:path";
import { isGithubPRExtensionUri } from "./isGithubPRExtensionUri";
import { PngDocumentDiffView } from "./PngDocumentDiffView";
import { ImageLinker } from "./ImageLinker";
import assert = require("node:assert");
import { AlignmentOption, HorizontalAlign, VerticalAlign, alignmentOptions, padImage } from "./padImage";

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

type GetHtmlArgs = {
  panel: vscode.WebviewPanel;
  document: PngDocumentDiffView;
  diffTarget?: PngDocumentDiffView;
  context: vscode.ExtensionContext;
  selectedAlignment: AlignmentOption;
};

async function getHtml({ panel, document, diffTarget, context, selectedAlignment }: GetHtmlArgs) {
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

  console.log({selectedAlignment})
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
        const [verticalAlign, horizontalAlign] = selectedAlignment.split('-') as [VerticalAlign, HorizontalAlign];
        const paddedA = padImage(mutualWidth, mutualHeight, aPng, verticalAlign, horizontalAlign);
        const paddedB = padImage(mutualWidth, mutualHeight, bPng, verticalAlign, horizontalAlign);
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
          <div>
            <vscode-checkbox id="sync-checkbox" checked>Sync</vscode-checkbox>
          </div>
          <div>
            <vscode-checkbox id="diff-checkbox">Diff</vscode-checkbox>
          </div>
          ${paddedBase64Image ? /* html */`
            <div class="dropdown-container">
              <vscode-dropdown id="alignment-dropdown">
              <span slot="indicator" class="codicon codicon-layout"></span>
              ${alignmentOptions.map(option => (
                `<vscode-option ${selectedAlignment === option ? 'selected' : ''}>
                  ${option}
                </vscode-option>`
              )).join('\n')}
              </vscode-dropdown>
            </div>`
      : ''
    }
          ${diffPixelCount === undefined
      ? ''
      : /*html*/`
              <div>${diffPixelCount} different pixels</div>
            `}
            <div id="control-spacer"></div>
            <div id="scale-indicator"></div>

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
      selectedAlignment: 'top-left',
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
        } else if (message.type === 'change_align') {
          webviewPanel.webview.html = await getHtml({
            panel: webviewPanel,
            document,
            diffTarget,
            context: this.context,
            selectedAlignment: message.data as AlignmentOption,
          });
        } else {
          // @ts-expect-error
          message.type;
          throw new Error("Unsupported message");
        }
      }
    );
  }
}
