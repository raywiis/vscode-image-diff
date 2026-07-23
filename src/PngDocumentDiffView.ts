import * as vscode from "vscode";
import { Maybe } from "./util/maybe";
import { RawImage } from "./util/rawImage";
import { decodeJpeg, decodePng, decodeWebp, isJpeg, isWebp } from "./wasm";

export class PngDocumentDiffView implements vscode.CustomDocument {
  private disposeEmitter = new vscode.EventEmitter<void>();
  private newWebviewEmitter = new vscode.EventEmitter<vscode.WebviewPanel>();
  private _pngPromise?: Thenable<Maybe<RawImage>>;
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

  get pngPromise(): Thenable<Maybe<RawImage>> {
    if (!this._pngPromise) {
      this._pngPromise = this.data.then(async (buffer) => {
        if (buffer.length === 0) {
          return { ok: false };
        }
        const { data, width, height } = isJpeg(buffer)
          ? await decodeJpeg(buffer)
          : isWebp(buffer)
            ? await decodeWebp(buffer)
            : await decodePng(buffer);

        const t: RawImage = {
          data: new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
          width,
          height,
        };
        return { ok: true, t };
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
