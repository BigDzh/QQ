import JSZip from 'jszip';

export interface FileToCompress {
  name: string;
  dataUrl: string;
  category?: string;
}

export async function compressFolderToZip(
  files: FileToCompress[],
  folderName: string
): Promise<Blob> {
  const zip = new JSZip();

  const folder = zip.folder(folderName);
  if (!folder) {
    throw new Error('Failed to create folder in ZIP archive');
  }

  for (const file of files) {
    const relativePath = file.category
      ? `${file.category}/${file.name}`
      : file.name;

    const dataParts = file.dataUrl.split(',');
    if (dataParts.length < 2) {
      logger.warn(`Invalid data URL for file: ${file.name}`);
      continue;
    }

    const base64Data = dataParts[1];
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    folder.file(relativePath, bytes);
  }

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  return blob;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function generateZipFilename(baseName: string): string {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
  return `${baseName}_${timestamp}.zip`;
}