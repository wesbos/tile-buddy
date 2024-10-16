import html2canvas from 'html2canvas-pro';
const dropzone = document.querySelector('.controls');
const variableBinders = document.querySelectorAll<HTMLInputElement>('[data-variable]');
const downloadButton = document.querySelector<HTMLButtonElement>('.download');
const reel = document.querySelector<HTMLDivElement>('.reel');
interface PromiseWithResolvers<T> {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
}

interface PromiseConstructor {
  withResolvers<T>(): PromiseWithResolvers<T>;
}

async function readFile(file: File) {
  const { promise, resolve, reject } = Promise.withResolvers();
  const reader = new FileReader();
  reader.onload = resolve;
  reader.onerror = reject;
  reader.onabort = reject;
  reader.readAsText(file);
  return promise;
}

function getItemAsText(item: DataTransferItem) {
  const { promise, resolve, reject } = Promise.withResolvers();
  item.getAsString(resolve);
  return promise;
}

async function getDataTransferItemURL(items: DataTransferItemList) {
  // Return the first item that is a text/uri-list or a File
  const item = Array.from(items).find((item) => {
    return item.type === 'text/uri-list' || item.type.startsWith('image/');
  });

  if(!item) return null;
  if(item.kind === 'file') {
    const file = item.getAsFile();
    // TODO Save the file to the file system
    return file? URL.createObjectURL(file) : null;
  }
  if(item.kind === 'string') {
    const url =  await getItemAsText(item);
    return url;
  }

}

dropzone?.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.stopPropagation();
  console.log('dragover');
});



dropzone?.addEventListener('drop', async (e) => {
  if(!(e instanceof DragEvent)) return console.error('Not a DragEvent');
  if(!e.dataTransfer) return console.error('No dataTransfer');
  e.preventDefault();
  e.stopPropagation();
  const url = await getDataTransferItemURL(e.dataTransfer.items);
  console.log(url);
  document.documentElement.style.setProperty('--bg', `url(${url})`);
});

// Bind the variables to the input fields
variableBinders.forEach((el) => {
  const variable = el.getAttribute('data-variable') || '';
  el.addEventListener('input', (e) => {
    document.documentElement.style.setProperty(variable, el.value);
  });
});

downloadButton?.addEventListener('click', async () => {
  const canvas: HTMLCanvasElement = await html2canvas(document.body);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png', 1));
  if(!blob) return console.error('No blob');
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'image.png';
  const img = new Image();
  img.src = url;
  link.appendChild(img);
  reel?.appendChild(link);

});
