import * as vscode from 'vscode';

export class PngDocumentDiffView implements vscode.CustomDocument {
  private disposeEmitter = new vscode.EventEmitter<void>();
  private newWebviewEmitter = new vscode.EventEmitter<vscode.WebviewPanel>();
  public onWebviewOpen = this.newWebviewEmitter.event;
  public onDispose = this.disposeEmitter.event;
  data: Thenable<Uint8Array>;

  constructor(public uri: vscode.Uri, untitledData: Uint8Array | undefined) {
    // https://file%2B.vscode-resource.vscode-cdn.net/home/rejus/image-diff/src/collect-payment-spec-js-invoice-actions-should-open-charge-with-credit-card-dialog-for-draft-invoice-snap.png?version%3D1674999497292
    if (untitledData) {
      this.data = Promise.resolve(untitledData);
    } else {
      this.data = vscode.workspace.fs.readFile(uri);
    }
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