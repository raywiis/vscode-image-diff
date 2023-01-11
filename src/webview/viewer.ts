const d = document.createElement("div");
d.style.color = "white";
// document.appendChild(d);
document.getElementsByTagName("body").item(0)?.appendChild(d);
// @ts-expect-error
const vscode = acquireVsCodeApi();

window.addEventListener("message", (message) => {
  d.innerText = "message gotted: " + JSON.stringify(message.data);
});
vscode.postMessage({ type: "ready" });
