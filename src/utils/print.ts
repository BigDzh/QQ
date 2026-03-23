export function printElement(elementId: string): void {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error('Print element not found');
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('无法打开打印窗口，请检查浏览器设置');
    return;
  }

  const printStyles = `
    <style>
      @page {
        size: A4;
        margin: 20mm;
      }
      body {
        font-family: 'SimSun', '宋体', serif;
        font-size: 12pt;
        line-height: 1.6;
        color: #333;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 16px 0;
      }
      th, td {
        border: 1px solid #333;
        padding: 8px 12px;
        text-align: left;
      }
      th {
        background-color: #f0f0f0;
        font-weight: bold;
      }
      h1 { font-size: 18pt; margin: 16px 0; }
      h2 { font-size: 14pt; margin: 12px 0; }
      .no-print { display: none; }
      @media print {
        body { -webkit-print-color-adjust: exact; }
      }
    </style>
  `;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>打印</title>
      ${printStyles}
    </head>
    <body>
      ${element.innerHTML}
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}

export function openPrintPreview(content: string, title: string = '打印预览'): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('无法打开打印窗口');
    return;
  }

  const printStyles = `
    <style>
      @page { size: A4; margin: 20mm; }
      body { font-family: 'SimSun', '宋体', serif; font-size: 12pt; line-height: 1.6; color: #333; }
      table { width: 100%; border-collapse: collapse; margin: 16px 0; }
      th, td { border: 1px solid #333; padding: 8px 12px; text-align: left; }
      th { background-color: #f0f0f0; font-weight: bold; }
      h1 { font-size: 18pt; margin: 16px 0; }
      h2 { font-size: 14pt; margin: 12px 0; }
      .print-btn { 
        position: fixed; top: 20px; right: 20px; 
        padding: 10px 20px; background: #0ea5e9; color: white; 
        border: none; border-radius: 4px; cursor: pointer;
      }
    </style>
  `;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      ${printStyles}
    </head>
    <body>
      <button class="print-btn" onclick="window.print()">打印</button>
      ${content}
    </body>
    </html>
  `);
  printWindow.document.close();
}
