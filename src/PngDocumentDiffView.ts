import * as vscode from "vscode";
import { Maybe } from "./util/maybe";
import { Jimp } from "jimp";
import { JimpClass } from "@jimp/types";

export class PngDocumentDiffView implements vscode.CustomDocument {
  private disposeEmitter = new vscode.EventEmitter<void>();
  private newWebviewEmitter = new vscode.EventEmitter<vscode.WebviewPanel>();
  private _pngPromise?: Thenable<Maybe<JimpClass>>;
  public onWebviewOpen = this.newWebviewEmitter.event;
  public onDispose = this.disposeEmitter.event;
  private data: Thenable<Uint8Array>;

  constructor(
    public uri: vscode.Uri,
    untitledData: Uint8Array | undefined,
  ) {
    // https://file%2B.vscode-resource.vscode-cdn.net/home/rejus/image-diff/src/collect-payment-spec-js-invoice-actions-should-open-charge-with-credit-card-dialog-for-draft-invoice-snap.png?version%3D1674999497292
    if (untitledData) {
      this.data = Promise.resolve(untitledData);
    } else {
      this.data = vscode.workspace.fs.readFile(uri);
    }
  }

  get pngPromise(): Thenable<Maybe<JimpClass>> {
      if (!this._pngPromise) {
      this._pngPromise = this.data.then(async (buffer) =>{
        return buffer.length === 0
          ? { ok: false }
          : Jimp.fromBuffer(Buffer.from(buffer)).then((t) =>{
            return({ ok: true, t : t }) })
        });
    }
    return this._pngPromise;
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
