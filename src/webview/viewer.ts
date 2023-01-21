// @ts-expect-error
const vscode = acquireVsCodeApi();

const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');

if  (!ctx) {
  throw new Error('No context');
}

document.body.style.overflow = 'hidden';

window.addEventListener("message", (message) => {
  console.log('got', {message});
  if (message.data.type !== 'show_image') {
    throw new Error('Unsupported message');
  }
  const d = message.data.image.data;
  const content = new Uint8Array(d);
  const blob = new Blob([content]);
  const objectUrl = URL.createObjectURL(blob);
  const image = document.createElement('img');
  document.body.appendChild(image);
  image.src = objectUrl;
  image.style.cursor = 'grab';

  let drag = false;
  let initialX = 0;
  let initialY = 0;

  let dragStartX = 0;
  let dragStartY = 0;

  let scale = 1;

  image.style.transformOrigin = 'top left';
  const setTransform = (x: number, y: number) => {
    image.style.transform = `matrix(${scale}, 0, 0, ${scale}, ${x}, ${y})`;
  };

  const updateDrag = (dragX: number, dragY: number) => {
    const translateX = (initialX + dragX - dragStartX);
    const translateY = (initialY + dragY - dragStartY);
    setTransform(translateX, translateY);
  };

  const startDrag = (x: number, y: number) => {
    drag = true;
    image.style.cursor = 'grabbing';
    dragStartX = x;
    dragStartY = y;
  };

  const stopDrag = (x: number, y: number) => {
    drag = false;
    image.style.cursor = 'grab';
    updateDrag(x, y);
    initialX += x - dragStartX;
    initialY += y - dragStartY;
  };

  document.body.addEventListener('mousedown', (event) => {
    startDrag(event.clientX, event.clientY);
  });

  document.body.addEventListener('mousemove', (event) => {
    if (!drag) {
      return;
    }
    event.preventDefault();
    updateDrag(event.clientX, event.clientY);
  });

  document.body.addEventListener('mouseup', (event) => {
    if (!drag) {
      return;
    }
    stopDrag(event.clientX, event.clientY);
  });

  document.body.addEventListener('mouseleave', (event) => {
    if (!drag) {
      return;
    }
    stopDrag(event.clientX, event.clientY);
  });

  document.body.addEventListener('wheel', (event) => {
    const delta = event.deltaY * 0.01;

    const s = (scale - delta) / scale;
    const cx = event.clientX;
    const cy = event.clientY;
    const lx = -initialX;
    const ly = -initialY;
    initialX = -((cx + lx) * s - cx);
    initialY = -((cy + ly) * s - cy);

    scale -= delta;

    console.log({ scale, cx, cy, initialX, initialY });

    setTransform(initialX, initialY);
  });


});

vscode.postMessage({ type: "ready" });
