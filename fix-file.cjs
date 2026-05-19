const fs = require('fs');
const ts = require('typescript');

const sourceCode = fs.readFileSync('src/pages/FileManagement.tsx', 'utf8');

// 创建源文件
const sourceFile = ts.createSourceFile(
  'FileManagement.tsx',
  sourceCode,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX
);

// 打印语法错误
const diagnostics = ts.getPreEmitDiagnostics(sourceFile);
console.log('Total syntax errors:', diagnostics.length);

if (diagnostics.length > 0) {
  console.log('\nFirst 10 errors:');
  diagnostics.slice(0, 10).forEach(d => {
    if (d.start !== undefined) {
      const pos = d.file.getLineAndCharacterOfPosition(d.start);
      console.log(`  Line ${pos.line + 1}: ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`);
    }
  });
}

// 尝试用printer重新格式化
const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
const printed = printer.printFile(sourceFile);

// 如果打印成功且没有严重错误，保存新版本
if (diagnostics.length < 100) {
  fs.writeFileSync('src/pages/FileManagement.tsx.fixed', printed, 'utf8');
  console.log('\nFixed version saved to FileManagement.tsx.fixed');
  console.log('Fixed lines:', printed.split('\n').length);
}
