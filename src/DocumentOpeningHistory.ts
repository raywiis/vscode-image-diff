import { WebviewPanel } from "vscode";
import { PngDocumentDiffView } from "./PngDocumentDiffView";

type OpeningHistoryEntry = [PngDocumentDiffView, WebviewPanel];
export class DocumentOpeningHistory {
  private log: OpeningHistoryEntry[] = [];

  get lastTwo():
    | [OpeningHistoryEntry, OpeningHistoryEntry]
    | [OpeningHistoryEntry, undefined]
    | [undefined, undefined] {
    return [this.log[0], this.log[1]];
  }

  panelOpened(document: PngDocumentDiffView, panel: WebviewPanel) {
    this.log.unshift([document, panel]);
    this.log = this.log.slice(0, 10);
    panel.onDidDispose(() => {
      this.log = this.log.filter((entry) => entry[1] !== panel);
    });
  }
}
