import CryptoJS from 'crypto-js';

export function generateMD5(text: string): string {
  return CryptoJS.MD5(text).toString().toUpperCase();
}

export async function calculateFileMD5(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const wordArray = CryptoJS.lib.WordArray.create(e.target?.result as ArrayBuffer);
      const hash = CryptoJS.MD5(wordArray).toString().toUpperCase();
      resolve(hash);
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}
