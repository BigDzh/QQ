import * as XLSX from 'xlsx';

export interface ImportRow {
  [key: string]: string | number | boolean | null;
}

export interface ImportResult {
  success: boolean;
  data: ImportRow[];
  errors: string[];
  totalRows: number;
  selectedRows: number;
}

export async function parseExcelFile(file: File): Promise<ImportResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<ImportRow>(sheet);

        resolve({
          success: true,
          data: jsonData,
          errors: [],
          totalRows: jsonData.length,
          selectedRows: jsonData.length,
        });
      } catch (error) {
        resolve({
          success: false,
          data: [],
          errors: [`解析Excel文件失败: ${error}`],
          totalRows: 0,
          selectedRows: 0,
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        data: [],
        errors: ['读取文件失败'],
        totalRows: 0,
        selectedRows: 0,
      });
    };

    reader.readAsBinaryString(file);
  });
}

export function generateTemplate(headers: string[], fileName: string): void {
  const data = headers.map((header) => ({ [header]: '' }));
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '模板');
  XLSX.writeFile(workbook, `${fileName}_模板.xlsx`);
}

export function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  fileName: string,
  sheetName: string = '数据'
): void {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

export function validateData(
  data: ImportRow[],
  requiredFields: string[]
): string[] {
  const errors: string[] = [];

  data.forEach((row, index) => {
    requiredFields.forEach((field) => {
      if (!row[field] && row[field] !== 0) {
        errors.push(`第${index + 1}行缺少必填字段: ${field}`);
      }
    });
  });

  return errors;
}
