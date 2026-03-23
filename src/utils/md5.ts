import CryptoJS from 'crypto-js';

export function generateMD5(text: string): string {
  return CryptoJS.MD5(text).toString().toUpperCase();
}

const CHUNK_SIZE = 2 * 1024 * 1024;

export interface MD5Progress {
  loaded: number;
  total: number;
  percent: number;
}

export function calculateFileMD5(
  file: File,
  onProgress?: (progress: MD5Progress) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Blob[] = [];
    let currentChunk = 0;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    function readNextChunk() {
      const start = currentChunk * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const blob = file.slice(start, end);
      chunks.push(blob);

      if (onProgress) {
        onProgress({
          loaded: end,
          total: file.size,
          percent: Math.round((end / file.size) * 100),
        });
      }

      currentChunk++;
    }

    function processChunks() {
      if (currentChunk >= totalChunks) {
        const blob = new Blob(chunks);
        const finalReader = new FileReader();
        finalReader.onload = (e) => {
          const wordArray = CryptoJS.lib.WordArray.create(e.target?.result as ArrayBuffer);
          const hash = CryptoJS.MD5(wordArray).toString().toUpperCase();
          resolve(hash);
        };
        finalReader.onerror = reject;
        finalReader.readAsArrayBuffer(blob);
        return;
      }

      const chunk = chunks[currentChunk];
      const subReader = new FileReader();
      subReader.onload = (e) => {
        const wordArray = CryptoJS.lib.WordArray.create(e.target?.result as ArrayBuffer);
        CryptoJS.MD5(wordArray);
        processChunks();
      };
      subReader.onerror = reject;
      subReader.readAsArrayBuffer(chunk);
    }

    readNextChunk();
    processChunks();
  });
}

export async function calculateFileMD5Async(
  file: File,
  onProgress?: (progress: MD5Progress) => void
): Promise<string> {
  const chunks: ArrayBuffer[] = [];
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);
    const arrayBuffer = await chunkToArrayBuffer(chunk);
    chunks.push(arrayBuffer);

    if (onProgress) {
      onProgress({
        loaded: end,
        total: file.size,
        percent: Math.round((end / file.size) * 100),
      });
    }
  }

  const blob = new Blob(chunks);
  const wordArray = CryptoJS.lib.WordArray.create(await blobToArrayBuffer(blob));
  return CryptoJS.MD5(wordArray).toString().toUpperCase();
}

function chunkToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
}

function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}
