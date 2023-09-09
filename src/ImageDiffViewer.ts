import * as vscode from "vscode";
import { HostToWebviewMessages, WebviewToHostMessages } from "./webview/shared";
import { dirname } from "node:path";
import { isGithubPRExtensionUri } from "./isGithubPRExtensionUri";
import { PngDocumentDiffView } from "./PngDocumentDiffView";
import { ImageLinker } from "./ImageLinker";
import { AlignmentOption } from "./padImage";
import { getWebviewHtml } from "./util/getWebviewHtml";
import { getExtensionConfiguration } from "./util/getExtensionConfiguration";

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
      },
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
    token: vscode.CancellationToken,
  ): PngDocumentDiffView {
    return new PngDocumentDiffView(uri, openContext.untitledDocumentData);
  }

  toggleActivePanelDiff() {
    if (this.lastActiveDiffPanel) {
      this.lastActiveDiffPanel.webview.postMessage({
        type: "toggle_diff",
      } as HostToWebviewMessages);
    }
  }

  private registerOpenDocument(
    document: PngDocumentDiffView,
    webviewPanel: vscode.WebviewPanel,
  ) {
    const roots = vscode.workspace.workspaceFolders?.map((f) => f.uri.path);
    if (!roots) {
      return;
    }

    if (document.uri.scheme === "git" || isGithubPRExtensionUri(document.uri)) {
      /** Assuming last resolved panel is the last active one */
      this.lastActiveDiffPanel = webviewPanel;
    }

    this.imageLinker.addDocumentAndPanel(document, webviewPanel);
  }

  async resolveCustomEditor(
    document: PngDocumentDiffView,
    webviewPanel: vscode.WebviewPanel,
    token: vscode.CancellationToken,
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
        "dist",
      ),
      vscode.Uri.joinPath(this.context.extensionUri, "out", "webview"),
    ];

    webviewPanel.onDidChangeViewState((event) => {
      if (!event.webviewPanel.active) {
        return;
      }
      if (
        !(document.uri.scheme === "git" || isGithubPRExtensionUri(document.uri))
      ) {
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
    const { initialSelectedAlignment } = getExtensionConfiguration();
    webviewPanel.webview.html = await getWebviewHtml({
      panel: webviewPanel,
      document,
      diffTarget,
      context: this.context,
      selectedAlignment: initialSelectedAlignment,
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
            options: {
              minScaleOne: getExtensionConfiguration().minScaleOne,
            },
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
        } else if (message.type === "change_align") {
          webviewPanel.webview.html = await getWebviewHtml({
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
      },
    );
  }
}
