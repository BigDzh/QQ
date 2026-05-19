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
    let currentChunk = 0;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    let md5Hasher = CryptoJS.algo.MD5.create();

    function readNextChunk() {
      const start = currentChunk * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const blob = file.slice(start, end);
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const wordArray = CryptoJS.lib.WordArray.create(e.target?.result as ArrayBuffer);
        md5Hasher.update(wordArray);
        
        if (onProgress) {
          onProgress({
            loaded: end,
            total: file.size,
            percent: Math.round((end / file.size) * 100),
          });
        }
        
        currentChunk++;
        
        if (currentChunk < totalChunks) {
          readNextChunk();
        } else {
          const hash = md5Hasher.finalize().toString().toUpperCase();
          resolve(hash);
        }
      };
      
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    }

    readNextChunk();
  });
}

export async function calculateFileMD5Async(
  file: File,
  onProgress?: (progress: MD5Progress) => void
): Promise<string> {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const md5Hasher = CryptoJS.algo.MD5.create();

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);
    const arrayBuffer = await chunkToArrayBuffer(chunk);
    const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);
    md5Hasher.update(wordArray);

    if (onProgress) {
      onProgress({
        loaded: end,
        total: file.size,
        percent: Math.round((end / file.size) * 100),
      });
    }
  }

  return md5Hasher.finalize().toString().toUpperCase();
}

function chunkToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
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
