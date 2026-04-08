const fs = require('fs');
const path = require('path');

const srcDir = __dirname;
const destDir = path.join(srcDir, 'win7-dist');

const filesToCopy = [
  { src: 'Python服务器启动.bat', dest: 'Python服务器启动.bat' },
  { src: 'server.py', dest: 'server.py' },
  { src: 'start.bat', dest: 'start.bat' },
];

const indexHtmlSrc = path.join(srcDir, 'index.win7.html');
const indexHtmlDest = path.join(destDir, 'index.html');

filesToCopy.forEach(({ src, dest }) => {
  const srcPath = path.join(srcDir, src);
  const destPath = path.join(destDir, dest);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`[OK] Copied: ${src} -> win7-dist/${dest}`);
  } else {
    console.log(`[SKIP] Source not found: ${srcPath}`);
  }
});

if (fs.existsSync(indexHtmlSrc)) {
  let content = fs.readFileSync(indexHtmlSrc, 'utf8');
  content = content.replace(/https:\/\/fonts\.googleapis\.com/g, 'http://fonts.googleapis.com');
  content = content.replace(/https:\/\/fonts\.gstatic\.com/g, 'http://fonts.gstatic.com');
  fs.writeFileSync(indexHtmlDest, content, 'utf8');
  console.log(`[OK] Updated: index.html`);
} else {
  console.log(`[SKIP] Source not found: ${indexHtmlSrc}`);
}

console.log('[OK] Post-build processing completed');
