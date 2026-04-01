export interface PDFExportOptions {
  element: HTMLElement;
  filename: string;
  scale?: number;
}

export async function exportToPDF(options: PDFExportOptions): Promise<void> {
  const { element, filename, scale = 2 } = options;

  const html2canvas = (await import('html2canvas')).default;
  const { jsPDF } = await import('jspdf');

  const canvas = await html2canvas(element, { scale, useCORS: true });
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
  let heightLeft = pdfHeight;
  let position = 0;

  pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
  heightLeft -= pdf.internal.pageSize.getHeight();

  while (heightLeft > 0) {
    position = heightLeft - pdfHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pdf.internal.pageSize.getHeight();
  }

  pdf.save(`${filename}.pdf`);
}

export async function parsePDF(file: File): Promise<string> {
  const pdfParseModule = await import('pdf-parse');
  const pdfParse = (pdfParseModule as any).default || pdfParseModule;
  const arrayBuffer = await file.arrayBuffer();
  const data = await pdfParse(arrayBuffer);
  return data.text;
}

export interface OCRResult {
  text: string;
  confidence: number;
}

export interface OCRProgressCallback {
  (progress: number): void;
}

export async function recognizeOCR(
  imageSource: string,
  language: 'chi_sim+eng' | 'eng' | 'chi_sim' = 'chi_sim+eng',
  onProgress?: OCRProgressCallback
): Promise<OCRResult> {
  const Tesseract = await import('tesseract.js');

  const worker = await Tesseract.createWorker(language, 1, {
    logger: (m: { status: string; progress?: number }) => {
      if (m.status === 'recognizing text' && m.progress !== undefined && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    }
  });

  try {
    const result = await worker.recognize(imageSource);
    return {
      text: result.data.text,
      confidence: result.data.confidence
    };
  } finally {
    await worker.terminate();
  }
}

export interface WorkerMessage {
  type: 'parsePDF' | 'computeHash' | 'processImage';
  payload: any;
  id: string;
}

export interface WorkerResponse {
  type: 'result' | 'error' | 'progress';
  payload: any;
  id: string;
}

let pdfWorker: Worker | null = null;
let hashWorker: Worker | null = null;

export function getPDFWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null;

  if (!pdfWorker) {
    const workerCode = `
      self.onmessage = async function(e) {
        const { type, payload, id } = e.data;

        try {
          if (type === 'parsePDF') {
            const pdfParseModule = await import('pdf-parse');
            const pdfParse = pdfParseModule.default || pdfParseModule;
            const data = await pdfParse(payload.arrayBuffer);
            self.postMessage({ type: 'result', payload: { text: data.text }, id });
          } else {
            self.postMessage({ type: 'error', payload: { message: 'Unknown message type' }, id });
          }
        } catch (error) {
          self.postMessage({ type: 'error', payload: { message: error.message }, id });
        }
      };
    `;
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    pdfWorker = new Worker(URL.createObjectURL(blob));
  }

  return pdfWorker;
}

export function getHashWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null;

  if (!hashWorker) {
    const workerCode = `
      self.onmessage = async function(e) {
        const { type, payload, id } = e.data;

        try {
          if (type === 'computeHash') {
            const encoder = new TextEncoder();
            const data = encoder.encode(payload.content);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            self.postMessage({ type: 'result', payload: { hash: hashHex }, id });
          } else {
            self.postMessage({ type: 'error', payload: { message: 'Unknown message type' }, id });
          }
        } catch (error) {
          self.postMessage({ type: 'error', payload: { message: error.message }, id });
        }
      };
    `;
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    hashWorker = new Worker(URL.createObjectURL(blob));
  }

  return hashWorker;
}

export function terminateWorkers(): void {
  if (pdfWorker) {
    pdfWorker.terminate();
    pdfWorker = null;
  }
  if (hashWorker) {
    hashWorker.terminate();
    hashWorker = null;
  }
}

export interface ExcelParseResult {
  success: boolean;
  data: any[];
  errors: string[];
  totalRows: number;
  selectedRows: number;
}

export async function parseExcelFile(file: File): Promise<ExcelParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const XLSX = (await import('xlsx')).default;
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        resolve({
          success: true,
          data: jsonData,
          errors: [],
          totalRows: jsonData.length,
          selectedRows: jsonData.length
        });
      } catch (error) {
        resolve({
          success: false,
          data: [],
          errors: [`解析Excel文件失败: ${error}`],
          totalRows: 0,
          selectedRows: 0
        });
      }
    };
    reader.onerror = () => {
      resolve({
        success: false,
        data: [],
        errors: ['读取文件失败'],
        totalRows: 0,
        selectedRows: 0
      });
    };
    reader.readAsArrayBuffer(file);
  });
}

export async function generateExcelTemplate(
  headers: string[],
  filename: string
): Promise<void> {
  const XLSX = (await import('xlsx')).default;
  const data = headers.map(h => ({ [h]: '' }));
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '模板');
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export async function exportToExcel<T extends Record<string, any>>(
  data: T[],
  filename: string,
  sheetName: string = '数据'
): Promise<void> {
  const XLSX = (await import('xlsx')).default;
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export async function readExcelAsBinaryString(
  file: File
): Promise<{ success: boolean; result?: string; error?: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result;
        if (typeof result === 'string') {
          resolve({ success: true, result });
        } else {
          const view = new DataView(result as ArrayBuffer);
          let binary = '';
          for (let i = 0; i < view.byteLength; i++) {
            binary += String.fromCharCode(view.getUint8(i));
          }
          resolve({ success: true, result: binary });
        }
      } catch (error) {
        resolve({ success: false, error: `读取文件失败: ${error}` });
      }
    };
    reader.onerror = () => {
      resolve({ success: false, error: 'FileReader error' });
    };
    reader.readAsBinaryString(file);
  });
}

export async function excelToJson<T = any>(
  binaryString: string
): Promise<T[]> {
  const XLSX = (await import('xlsx')).default;
  const workbook = XLSX.read(binaryString, { type: 'binary' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json(worksheet);
}