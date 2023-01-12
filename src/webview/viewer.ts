const d = document.createElement("div");
d.style.color = "white";
document.getElementsByTagName("body").item(0)?.appendChild(d);
// @ts-expect-error
const vscode = acquireVsCodeApi();

type ShowImageMessage = {
  image: Uint8Array;
};

const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');

if  (!ctx) {
  console.error('Wow');
  throw new Error('No context');
}


window.addEventListener("message", (message) => {
  // d.innerText = "message gotted: " + JSON.stringify(message.data);
  const d = message.data.image.data as number[];
  const content = new Uint8Array(d);
  console.log(message.data.image.data);

  console.log({content});


  const blob = new Blob([content]);
  const objectUrl = URL.createObjectURL(blob);

  const image = document.createElement('img');
  document.body.appendChild(image);
  image.src = objectUrl;

  console.log({ message });
});
vscode.postMessage({ type: "ready" });
