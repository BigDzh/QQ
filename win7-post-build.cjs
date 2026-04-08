const fs = require('fs');
const path = require('path');

const srcDir = __dirname;
const destDir = path.join(srcDir, 'win7-dist');

const startBatContent = `@echo off
cd /d "%~dp0"
python -m http.server 8080
`;

const filesToWrite = [
  { filename: 'start.bat', content: startBatContent },
];

filesToWrite.forEach(({ filename, content }) => {
  const destPath = path.join(destDir, filename);
  fs.writeFileSync(destPath, content, 'utf8');
  console.log(`[OK] Written: ${filename}`);
});

const serverPySrc = path.join(srcDir, 'server.py');
const serverPyDest = path.join(destDir, 'server.py');
if (fs.existsSync(serverPySrc)) {
  fs.copyFileSync(serverPySrc, serverPyDest);
  console.log(`[OK] Copied: server.py`);
}

const builtIndex = path.join(destDir, 'index.html');
if (fs.existsSync(builtIndex)) {
  let content = fs.readFileSync(builtIndex, 'utf8');
  content = content.replace(/https:\/\/fonts\.googleapis\.com[^"]*/g, 'http://fonts.googleapis.com');
  content = content.replace(/https:\/\/fonts\.gstatic\.com[^"]*/g, 'http://fonts.gstatic.com');
  fs.writeFileSync(builtIndex, content, 'utf8');
  console.log(`[OK] Updated: index.html (removed Google Fonts)`);
}

const swSrc = path.join(srcDir, 'public', 'sw.js');
const swDest = path.join(destDir, 'sw.js');
if (fs.existsSync(swSrc)) {
  fs.copyFileSync(swSrc, swDest);
  console.log(`[OK] Copied: sw.js`);
}

console.log('[OK] Post-build processing completed');
