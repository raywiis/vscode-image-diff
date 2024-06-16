import * as vscode from "vscode";
import {
  EnableTransformReport,
  HostToWebviewMessages,
  OffsetXYMessage,
  ShowImageMessage,
  ToggleSwipeForChangedMessage,
  ToggleSwipeForOriginalMessage,
  TransformWebviewMessage,
  WebviewToHostMessages,
} from "./webview/shared";
import { isGithubPRExtensionUri } from "./isGithubPRExtensionUri";
import { PngDocumentDiffView } from "./PngDocumentDiffView";
import { ImageLinker } from "./ImageLinker";
import { AlignmentOption } from "./padImage";
import { getWebviewHtml } from "./util/getWebviewHtml";
import { getExtensionConfiguration } from "./util/getExtensionConfiguration";
import { DocumentOpeningHistory } from "./DocumentOpeningHistory";

const outputChannel = vscode.window.createOutputChannel("Image diff logs", {
  log: true,
});

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
  documentHistory = new DocumentOpeningHistory();

  lastActiveDiffPanel: vscode.WebviewPanel | undefined;
  lastActiveNonDiffPanel: vscode.WebviewPanel | undefined;

  constructor(private context: vscode.ExtensionContext) {
    context.extensionUri;
  }

  openCustomDocument(
    uri: vscode.Uri,
    openContext: vscode.CustomDocumentOpenContext,
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

  toggleActivePanelsSwipe() {
    if (!this.lastActiveDiffPanel || !this.lastActiveNonDiffPanel) {
      return;
    }

    const originalViewMessage: ToggleSwipeForOriginalMessage = {
      type: "toggle_swipe_original",
    };

    const changedViewMessage: ToggleSwipeForChangedMessage = {
      type: "toggle_swipe_changed",
    };

    this.lastActiveDiffPanel.webview.postMessage(originalViewMessage);
    this.lastActiveNonDiffPanel.webview.postMessage(changedViewMessage);
  }

  private registerOpenDocument(
    document: PngDocumentDiffView,
    webviewPanel: vscode.WebviewPanel,
  ) {
    this.documentHistory.panelOpened(document, webviewPanel);
    const roots = vscode.workspace.workspaceFolders?.map((f) => f.uri.path);
    if (!roots) {
      return;
    }

    if (document.uri.scheme === "git" || isGithubPRExtensionUri(document.uri)) {
      /** Assuming last resolved panel is the last active one */
      this.lastActiveDiffPanel = webviewPanel;
    } else {
      this.lastActiveNonDiffPanel = webviewPanel;
    }

    this.imageLinker.addDocumentAndPanel(document, webviewPanel);
  }

  logLastPanels() {
    const lastPanels = this.documentHistory.lastTwo;
    outputChannel.appendLine("last document uris:");
    for (const panel of lastPanels) {
      if (!panel) {
        continue;
      }
      outputChannel.appendLine(panel?.[0].uri.toString());
    }

    const workspaceFolders = vscode.workspace.workspaceFolders ?? [];
    if (workspaceFolders.length === 0) {
      outputChannel.appendLine("no workspace folders");
    } else {
      outputChannel.appendLine("workspace folder uris:");
    }
    for (const folder of vscode.workspace.workspaceFolders ?? []) {
      outputChannel.appendLine(folder.uri.toString());
    }
  }

  diffLastPanels() {
    const [a, b] = this.documentHistory.lastTwo;
    if (!a || !b) {
      vscode.window.showInformationMessage("Not enough open panels to diff");
      return;
    }

    setupWebview({
      context: this.context,
      diffTarget: b[0],
      diffWebview: b[1],
      document: a[0],
      webviewPanel: a[1],
    });
  }

  async resolveCustomEditor(
    document: PngDocumentDiffView,
    webviewPanel: vscode.WebviewPanel,
    token: vscode.CancellationToken,
  ): Promise<void> {
    this.registerOpenDocument(document, webviewPanel);
    const [diffTarget, diffWebview] = await this.imageLinker.findLink(document);
    if (token.isCancellationRequested) {
      return;
    }

    webviewPanel.title = "This is shown to user?";
    webviewPanel.onDidChangeViewState((event) => {
      if (!event.webviewPanel.active) {
        return;
      }
      if (
        !(document.uri.scheme === "git" || isGithubPRExtensionUri(document.uri))
      ) {
        this.lastActiveNonDiffPanel = webviewPanel;
      } else {
        this.lastActiveDiffPanel = webviewPanel;
      }
    });

    webviewPanel.onDidDispose(() => {
      if (this.lastActiveDiffPanel === webviewPanel) {
        this.lastActiveDiffPanel = undefined;
      }
      if (this.lastActiveNonDiffPanel === webviewPanel) {
        this.lastActiveNonDiffPanel = undefined;
      }
    });

    setupWebview({
      document,
      webviewPanel,
      context: this.context,
      diffTarget,
      diffWebview,
    });
  }
}

const setupWebview = async ({
  context,
  diffTarget,
  diffWebview,
  document,
  webviewPanel,
}: {
  document: PngDocumentDiffView;
  webviewPanel: vscode.WebviewPanel;
  context: vscode.ExtensionContext;
  diffTarget: PngDocumentDiffView | undefined;
  diffWebview: vscode.WebviewPanel | undefined;
}) => {
  const dirname = (path: string) => {
    const sep = "/";
    const parts = path.split(sep);
    parts.pop();
    return parts.join(sep);
  };

  const getRootUri = (uri: vscode.Uri) => {
    const dirPath = dirname(uri.path);
    const rootUri = uri.with({ path: dirPath });
    return rootUri;
  };

  const localResourceRoots = [
    getRootUri(document.uri),
    vscode.Uri.joinPath(
      context.extensionUri,
      "node_modules",
      "@vscode/codicons",
      "dist",
    ),
    vscode.Uri.joinPath(context.extensionUri, "out", "webview"),
  ];
  webviewPanel.webview.options = {
    enableScripts: true,
    localResourceRoots,
  };
  const { initialSelectedAlignment } = getExtensionConfiguration();
  webviewPanel.webview.html = await getWebviewHtml({
    panel: webviewPanel,
    document,
    diffTarget,
    context,
    selectedAlignment: initialSelectedAlignment,
  });
  let otherView = diffWebview;
  document.onWebviewOpen((newPanel) => {
    otherView = newPanel;
  });
  webviewPanel.webview.onDidReceiveMessage(
    async (message: WebviewToHostMessages) => {
      if (message.type === "ready") {
        const config = getExtensionConfiguration();
        webviewPanel.webview.postMessage({
          type: "show_image",
          options: {
            minScaleOne: config.minScaleOne,
            showDiffByDefault: config.showDiffByDefault,
            imageRendering: config.imageRendering,
          },
        } as ShowImageMessage);
        webviewPanel.webview.postMessage({
          type: "enable_transform_report",
        } as EnableTransformReport);
        diffTarget?.registerNewWebview(webviewPanel);
        if (diffWebview) {
          diffWebview.webview.postMessage({
            type: "enable_transform_report",
          } as EnableTransformReport);
        }
      } else if (message.type === "transform") {
        if (otherView) {
          otherView.webview.postMessage({
            type: "transform",
            data: message.data,
          } as TransformWebviewMessage);
        }
      } else if (message.type === "change_align") {
        webviewPanel.webview.html = await getWebviewHtml({
          panel: webviewPanel,
          document,
          diffTarget,
          context,
          selectedAlignment: message.data as AlignmentOption,
        });
      } else if (message.type === "original_swipe_adjustment") {
        if (otherView) {
          const otherMessage: OffsetXYMessage = {
            type: "offset_xy",
            data: { dx: message.data.width, dy: message.data.height },
          };
          otherView.webview.postMessage(otherMessage);
        }
      } else {
        // @ts-expect-error Makes sure we always handle messages
        throw new Error("Unsupported message: " + message.type);
      }
    },
  );
};
