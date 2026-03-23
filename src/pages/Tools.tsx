import React, { useState, useRef } from 'react';
import { Hash, Copy, Upload, Loader2, GitCompare, Crop, Binary } from 'lucide-react';
import { useToast } from '../components/Toast';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { generateMD5, calculateFileMD5, copyToClipboard } from '../utils/md5';
import { deleteFile } from '../services/database';

export default function Tools() {
  const { showToast } = useToast();
  const t = useThemeStyles();
  const [activeTab, setActiveTab] = useState<'md5' | 'ocr' | 'diff'>('md5');
  
  const [md5Input, setMd5Input] = useState('');
  const [md5Result, setMd5Result] = useState('');
  const [fileMD5, setFileMD5] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [currentFileId, setCurrentFileId] = useState<string | null>(null);
  const [deleteCountdown, setDeleteCountdown] = useState<number>(0);
  const deleteTimerRef = useRef<number | null>(null);

  const [ocrImage, setOcrImage] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState('');
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrLang, setOcrLang] = useState<'chi_sim+eng' | 'eng' | 'chi_sim'>('chi_sim+eng');
  const [ocrDragging, setOcrDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ocrFileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const mockEvent = {
        target: {
          files: files
        }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      await handleFileSelect(mockEvent);
    }
  };

  const [diffText1, setDiffText1] = useState('');
  const [diffText2, setDiffText2] = useState('');
  const [diffResult, setDiffResult] = useState<Array<{ type: 'same' | 'added' | 'removed' | 'changed'; left: string; right: string }>>([]);
  const [diffFileMode, setDiffFileMode] = useState<'text' | 'binary'>('text');
  const [diffHexView, setDiffHexView] = useState(false);
  const [diffFile1, setDiffFile1] = useState<{ name: string; data: Uint8Array; hex: string; text: string } | null>(null);
  const [diffFile2, setDiffFile2] = useState<{ name: string; data: Uint8Array; hex: string; text: string } | null>(null);
  const [diffDrag1, setDiffDrag1] = useState(false);
  const [diffDrag2, setDiffDrag2] = useState(false);
  const diffFileInput1Ref = useRef<HTMLInputElement>(null);
  const diffFileInput2Ref = useRef<HTMLInputElement>(null);

  const handleStringMD5 = () => {
    if (!md5Input.trim()) {
      showToast('请输入要加密的字符串', 'error');
      return;
    }
    const result = generateMD5(md5Input);
    setMd5Result(result);
  };

  const computeDiff = () => {
    if (!diffText1.trim() && !diffText2.trim()) {
      showToast('请输入要比较的内容', 'error');
      return;
    }

    const lines1 = diffText1.split('\n');
    const lines2 = diffText2.split('\n');
    const result: Array<{ type: 'same' | 'added' | 'removed' | 'changed'; left: string; right: string }> = [];

    const maxLen = Math.max(lines1.length, lines2.length);

    for (let i = 0; i < maxLen; i++) {
      const l1 = lines1[i] || '';
      const l2 = lines2[i] || '';

      if (l1 === l2) {
        result.push({ type: 'same', left: l1, right: l2 });
      } else if (!l1 && l2) {
        result.push({ type: 'added', left: '', right: l2 });
      } else if (l1 && !l2) {
        result.push({ type: 'removed', left: l1, right: '' });
      } else {
        result.push({ type: 'changed', left: l1, right: l2 });
      }
    }

    setDiffResult(result);
  };

  const arrayBufferToHex = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let hex = '';
    for (let i = 0; i < bytes.length; i++) {
      hex += bytes[i].toString(16).padStart(2, '0');
    }
    return hex;
  };

  const parseFileContent = async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    if (['txt', 'mcs', 'bit'].includes(ext)) {
      return await file.text();
    }

    if (ext === 'docx') {
      try {
        const mammoth = await import('mammoth');
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value;
      } catch (e) {
        console.error('Word parsing error:', e);
        return await file.text();
      }
    }

    if (ext === 'pdf') {
      try {
        const blobUrl = URL.createObjectURL(file);
        const response = await fetch(blobUrl);
        const arrayBuffer = await response.arrayBuffer();
        URL.revokeObjectURL(blobUrl);
        const pdfParseModule = await import('pdf-parse');
        const pdfParse = (pdfParseModule as any).default || pdfParseModule;
        const data = await pdfParse(arrayBuffer);
        return data.text;
      } catch (e) {
        console.error('PDF parsing error:', e);
        return await file.text();
      }
    }

    if (['bin', 'hex'].includes(ext)) {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let content = '';
      const bytesPerLine = 16;
      for (let i = 0; i < bytes.length; i += bytesPerLine) {
        const lineBytes = bytes.slice(i, Math.min(i + bytesPerLine, bytes.length));
        const hexPart = Array.from(lineBytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
        const asciiPart = Array.from(lineBytes).map(b => (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.').join('');
        content += `${i.toString(16).padStart(8, '0')}  ${hexPart.padEnd(48, ' ')}  |${asciiPart}|\n`;
      }
      return content;
    }

    return await file.text();
  };

  const handleDiffFileSelect1 = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const hex = arrayBufferToHex(buffer);
      const text = await parseFileContent(file);
      setDiffFile1({ name: file.name, data: new Uint8Array(buffer), hex, text });
      showToast(`已加载: ${file.name}`, 'success');
    } catch (error) {
      showToast('文件读取失败', 'error');
    }
  };

  const handleDiffFileSelect2 = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const hex = arrayBufferToHex(buffer);
      const text = await parseFileContent(file);
      setDiffFile2({ name: file.name, data: new Uint8Array(buffer), hex, text });
      showToast(`已加载: ${file.name}`, 'success');
    } catch (error) {
      showToast('文件读取失败', 'error');
    }
  };

  const handleDiffDragOver1 = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDiffDrag1(true);
  };

  const handleDiffDragLeave1 = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDiffDrag1(false);
  };

  const handleDiffDrop1 = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDiffDrag1(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const mockEvent = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleDiffFileSelect1(mockEvent);
    }
  };

  const handleDiffDragOver2 = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDiffDrag2(true);
  };

  const handleDiffDragLeave2 = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDiffDrag2(false);
  };

  const handleDiffDrop2 = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDiffDrag2(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const mockEvent = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleDiffFileSelect2(mockEvent);
    }
  };

  const computeBinaryDiff = () => {
    if (!diffFile1 || !diffFile2) {
      showToast('请先选择两个文件进行比较', 'error');
      return;
    }

    const len1 = diffFile1.data.length;
    const len2 = diffFile2.data.length;
    const maxLen = Math.max(len1, len2);
    const result: Array<{ offset: number; type: 'same' | 'diff'; v1: string; v2: string }> = [];

    const bytesPerLine = 16;

    for (let i = 0; i < maxLen; i += bytesPerLine) {
      let lineSame = true;
      for (let j = 0; j < bytesPerLine; j++) {
        const idx = i + j;
        const b1 = idx < len1 ? diffFile1.data[idx] : -1;
        const b2 = idx < len2 ? diffFile2.data[idx] : -1;
        if (b1 !== b2) {
          lineSame = false;
          break;
        }
      }

      const v1 = diffFile1.data.slice(i, Math.min(i + bytesPerLine, len1));
      const v2 = diffFile2.data.slice(i, Math.min(i + bytesPerLine, len2));

      result.push({
        offset: i,
        type: lineSame ? 'same' : 'diff',
        v1: Array.from(v1).map(b => b === undefined ? '  ' : b.toString(16).padStart(2, '0')).join(' '),
        v2: Array.from(v2).map(b => b === undefined ? '  ' : b.toString(16).padStart(2, '0')).join(' ')
      });
    }

    setDiffResult(result as any);
  };

  const computeFileTextDiff = () => {
    if (!diffFile1 || !diffFile2) {
      showToast('请先选择两个文件进行比较', 'error');
      return;
    }

    const lines1 = diffFile1.text.split('\n');
    const lines2 = diffFile2.text.split('\n');
    const result: Array<{ type: 'same' | 'added' | 'removed' | 'changed'; left: string; right: string }> = [];

    const maxLen = Math.max(lines1.length, lines2.length);

    for (let i = 0; i < maxLen; i++) {
      const l1 = lines1[i] || '';
      const l2 = lines2[i] || '';

      if (l1 === l2) {
        result.push({ type: 'same', left: l1, right: l2 });
      } else if (!l1 && l2) {
        result.push({ type: 'added', left: '', right: l2 });
      } else if (l1 && !l2) {
        result.push({ type: 'removed', left: l1, right: '' });
      } else {
        result.push({ type: 'changed', left: l1, right: l2 });
      }
    }

    setDiffResult(result);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (deleteTimerRef.current) {
      clearInterval(deleteTimerRef.current);
      deleteTimerRef.current = null;
    }
    if (currentFileId) {
      try {
        await deleteFile(currentFileId);
      } catch (e) {}
      setCurrentFileId(null);
    }

    setSelectedFile(file);
    setCalculating(true);
    setFileMD5('');
    setDeleteCountdown(10);

    try {
      const fileId = `md5_${Date.now()}`;
      const { saveFileInChunks } = await import('../services/database');
      await saveFileInChunks(file, fileId, '', 'document', () => {});

      setCurrentFileId(fileId);

      const tick = () => {
        setDeleteCountdown((prev) => {
          if (prev <= 1) {
            deleteFile(fileId).then(() => {
              if (currentFileId === fileId) {
                setCurrentFileId(null);
              }
            }).catch(() => {});
            if (deleteTimerRef.current) {
              clearInterval(deleteTimerRef.current);
              deleteTimerRef.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      };

      tick();
      deleteTimerRef.current = setInterval(tick, 1000) as unknown as number;

      const hash = await calculateFileMD5(file);
      setFileMD5(hash);
    } catch (error) {
      showToast('文件MD5计算失败', 'error');
    }
    setCalculating(false);
  };

  const handleCopy = async (text: string) => {
    await copyToClipboard(text);
    showToast('已复制到剪贴板', 'success');
  };

  const handleOcrImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setOcrImage(event.target?.result as string);
      setOcrResult('');
      setOcrProgress(0);
    };
    reader.readAsDataURL(file);
  };

  const handleOcrDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOcrDragging(true);
  };

  const handleOcrDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOcrDragging(false);
  };

  const handleOcrDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOcrDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setOcrImage(event.target?.result as string);
          setOcrResult('');
          setOcrProgress(0);
        };
        reader.readAsDataURL(file);
      } else {
        showToast('请选择图片文件', 'error');
      }
    }
  };

  const handleOcrRecognize = async () => {
    if (!ocrImage) {
      showToast('请先选择图片', 'error');
      return;
    }

    setOcrLoading(true);
    setOcrResult('');
    setOcrProgress(0);

    try {
      const Tesseract = await import('tesseract.js');
      const worker = await Tesseract.createWorker(ocrLang, 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100));
          }
        }
      });

      const { data: { text } } = await worker.recognize(ocrImage);
      setOcrResult(text);
      await worker.terminate();
    } catch (error) {
      showToast('OCR识别失败', 'error');
      console.error(error);
    }
    setOcrLoading(false);
    setOcrProgress(0);
  };

  const handleScreenCapture = async () => {
    try {
      const html2canvas = (await import('html2canvas')).default;
      showToast('正在截取屏幕...', 'info');

      const canvas = await html2canvas(document.body, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        scale: 2,
      });

      const dataUrl = canvas.toDataURL('image/png');
      setOcrImage(dataUrl);
      setOcrResult('');
      setOcrProgress(0);
      showToast('截图完成，请点击识别', 'success');
    } catch (error) {
      showToast('截图失败', 'error');
      console.error(error);
    }
  };

  return (
    <div>
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('md5')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'md5'
              ? `${t.button} text-white`
              : `${t.border} ${t.textSecondary} hover:${t.hoverBg}`
          }`}
        >
          <Hash size={18} className="inline mr-2" />
          MD5加密
        </button>
        <button
          onClick={() => setActiveTab('ocr')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'ocr'
              ? `${t.button} text-white`
              : `${t.border} ${t.textSecondary} hover:${t.hoverBg}`
          }`}
        >
          <Upload size={18} className="inline mr-2" />
          OCR文字识别
        </button>
        <button
          onClick={() => setActiveTab('diff')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'diff'
              ? `${t.button} text-white`
              : `${t.border} ${t.textSecondary} hover:${t.hoverBg}`
          }`}
        >
          <GitCompare size={18} className="inline mr-2" />
          文件比较
        </button>
      </div>

      {activeTab === 'md5' && (
        <div className="space-y-8">
          <div className={`${t.card} rounded-lg shadow-sm p-6 border ${t.border}`}>
            <h3 className={`text-lg font-semibold mb-4 ${t.text}`}>字符串MD5加密</h3>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>输入字符串</label>
                <textarea
                  value={md5Input}
                  onChange={(e) => setMd5Input(e.target.value)}
                  placeholder="请输入要加密的字符串..."
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                  rows={3}
                />
              </div>
              <button
                onClick={handleStringMD5}
                className={`px-4 py-2 ${t.button} text-white rounded-lg`}
              >
                生成MD5
              </button>
              {md5Result && (
                <div className={`${t.emptyBg} rounded-lg p-4`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={`text-sm ${t.textMuted} mb-1`}>MD5值</div>
                      <div className={`font-mono text-sm ${t.text}`}>{md5Result}</div>
                    </div>
                    <button
                      onClick={() => handleCopy(md5Result)}
                      className={`p-2 ${t.textMuted} hover:${t.accentText}`}
                    >
                      <Copy size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className={`${t.card} rounded-lg shadow-sm p-6 border ${t.border}`}>
            <h3 className={`text-lg font-semibold mb-4 ${t.text}`}>文件MD5计算</h3>
            <div className="space-y-4">
              <div>
                <input
                  type="file"
                  onChange={handleFileSelect}
                  ref={fileInputRef}
                  className="hidden"
                />
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
                      : `${t.border} hover:${t.hoverBg}`
                  }`}
                >
                  <Upload size={32} className={`mx-auto mb-2 ${isDragging ? 'text-blue-500' : t.textMuted}`} />
                  <p className={`text-sm ${t.textSecondary}`}>
                    {isDragging ? '松开鼠标开始计算' : '拖拽文件到此处或点击选择文件'}
                  </p>
                </div>
                {selectedFile && (
                  <div className={`mt-2 text-sm ${t.textSecondary}`}>
                    已选择: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                  </div>
                )}
              </div>
              {calculating && (
                <div className={`flex items-center gap-2 ${t.textMuted}`}>
                  <Loader2 size={18} className="animate-spin" />
                  计算中...
                </div>
              )}
              {fileMD5 && deleteCountdown > 0 && (
                <div className={`${t.emptyBg} rounded-lg p-4`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={`text-sm ${t.textMuted} mb-1`}>文件MD5</div>
                      <div className={`font-mono text-sm ${t.text}`}>{fileMD5}</div>
                    </div>
                    <button
                      onClick={() => handleCopy(fileMD5)}
                      className={`p-2 ${t.textMuted} hover:${t.accentText}`}
                    >
                      <Copy size={18} />
                    </button>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-orange-500">文件将在 {deleteCountdown} 秒后自动清理</span>
                      <button
                        onClick={async () => {
                          if (deleteTimerRef.current) {
                            clearInterval(deleteTimerRef.current);
                            deleteTimerRef.current = null;
                          }
                          if (currentFileId) {
                            try {
                              await deleteFile(currentFileId);
                            } catch (e) {}
                            setCurrentFileId(null);
                          }
                          setDeleteCountdown(0);
                          showToast('已取消自动清理', 'info');
                        }}
                        className="text-red-500 hover:text-red-600"
                      >
                        取消清理
                      </button>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500 transition-all duration-1000"
                        style={{ width: `${(deleteCountdown / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ocr' && (
        <div className={`${t.card} rounded-lg shadow-sm p-6 border ${t.border}`}>
          <h3 className={`text-lg font-semibold mb-4 ${t.text}`}>OCR文字识别</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>识别语言</label>
                <select
                  value={ocrLang}
                  onChange={(e) => setOcrLang(e.target.value as typeof ocrLang)}
                  className={`px-3 py-2 border rounded-lg ${t.input}`}
                >
                  <option value="chi_sim+eng">简体中文+英文</option>
                  <option value="chi_sim">简体中文</option>
                  <option value="eng">英文</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleScreenCapture}
                  className={`px-4 py-2 border rounded-lg ${t.border} hover:${t.hoverBg} flex items-center gap-2`}
                >
                  <Crop size={18} />
                  截图识别
                </button>
              </div>
            </div>

            <div>
              <input
                type="file"
                accept="image/*"
                onChange={handleOcrImageSelect}
                ref={ocrFileInputRef}
                className="hidden"
              />
              <div
                onDragOver={handleOcrDragOver}
                onDragLeave={handleOcrDragLeave}
                onDrop={handleOcrDrop}
                onClick={() => ocrFileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                  ocrDragging
                    ? 'border-green-500 bg-green-50 dark:bg-green-500/10'
                    : `${t.border} hover:${t.hoverBg}`
                }`}
              >
                <Upload size={32} className={`mx-auto mb-2 ${ocrDragging ? 'text-green-500' : t.textMuted}`} />
                <p className={`text-sm ${t.textSecondary}`}>
                  {ocrDragging ? '松开鼠标上传图片' : '拖拽图片到此处或点击选择'}
                </p>
                <p className={`text-xs ${t.textMuted} mt-1`}>支持 JPG、PNG、GIF、BMP 等格式</p>
              </div>
            </div>

            {ocrImage && (
              <div className="relative">
                <img src={ocrImage} alt="OCR" className="w-full max-h-64 rounded-lg object-contain" />
                <button
                  onClick={() => {
                    setOcrImage(null);
                    setOcrResult('');
                    if (ocrFileInputRef.current) ocrFileInputRef.current.value = '';
                  }}
                  className={`absolute top-2 right-2 p-1.5 rounded-lg ${t.card} border ${t.border} hover:${t.hoverBg}`}
                >
                  <Copy size={16} className={t.textMuted} />
                </button>
              </div>
            )}

            {ocrLoading && (
              <div className={`${t.emptyBg} rounded-lg p-4`}>
                <div className="flex items-center gap-3 mb-2">
                  <Loader2 size={18} className={`animate-spin ${t.textMuted}`} />
                  <span className={`text-sm ${t.textSecondary}`}>识别中... {ocrProgress}%</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-300"
                    style={{ width: `${ocrProgress}%` }}
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleOcrRecognize}
              disabled={!ocrImage || ocrLoading}
              className={`px-4 py-2 ${t.button} text-white rounded-lg disabled:opacity-50`}
            >
              {ocrLoading ? (
                <>
                  <Loader2 size={18} className="inline mr-2 animate-spin" />
                  识别中...
                </>
              ) : (
                <>
                  <Upload size={18} className="inline mr-2" />
                  开始识别
                </>
              )}
            </button>

            {ocrResult && (
              <div className={`${t.emptyBg} rounded-lg p-4`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium ${t.textSecondary}`}>识别结果</span>
                  <button
                    onClick={() => handleCopy(ocrResult)}
                    className={`p-2 ${t.textMuted} hover:${t.accentText}`}
                  >
                    <Copy size={16} />
                  </button>
                </div>
                <pre className={`whitespace-pre-wrap text-sm ${t.text}`}>{ocrResult}</pre>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'diff' && (
        <div className={`${t.card} rounded-lg shadow-sm p-6 border ${t.border}`}>
          <h3 className={`text-lg font-semibold mb-4 ${t.text}`}>文件比较</h3>
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setDiffFileMode('text')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                diffFileMode === 'text'
                  ? `${t.button} text-white`
                  : `${t.border} ${t.textSecondary} hover:${t.hoverBg}`
              }`}
            >
              文本模式
            </button>
            <button
              onClick={() => setDiffFileMode('binary')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                diffFileMode === 'binary'
                  ? `${t.button} text-white`
                  : `${t.border} ${t.textSecondary} hover:${t.hoverBg}`
              }`}
            >
              <Binary size={16} className="inline mr-1" />
              二进制模式
            </button>
            {diffFileMode === 'binary' && diffFile1 && diffFile2 && (
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={() => {
                    setDiffHexView(false);
                    computeFileTextDiff();
                  }}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    !diffHexView
                      ? `${t.button} text-white`
                      : `${t.border} ${t.textSecondary} hover:${t.hoverBg}`
                  }`}
                >
                  文本视图
                </button>
                <button
                  onClick={() => {
                    setDiffHexView(true);
                    computeBinaryDiff();
                  }}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    diffHexView
                      ? `${t.button} text-white`
                      : `${t.border} ${t.textSecondary} hover:${t.hoverBg}`
                  }`}
                >
                  十六进制视图
                </button>
              </div>
            )}
          </div>

          {diffFileMode === 'text' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>原始内容</label>
                  <textarea
                    value={diffText1}
                    onChange={(e) => setDiffText1(e.target.value)}
                    placeholder="输入或粘贴第一个文件内容..."
                    className={`w-full h-48 px-3 py-2 border rounded-lg ${t.input} font-mono text-sm`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>新内容</label>
                  <textarea
                    value={diffText2}
                    onChange={(e) => setDiffText2(e.target.value)}
                    placeholder="输入或粘贴第二个文件内容..."
                    className={`w-full h-48 px-3 py-2 border rounded-lg ${t.input} font-mono text-sm`}
                  />
                </div>
              </div>
              <button
                onClick={computeDiff}
                className={`px-4 py-2 ${t.button} text-white rounded-lg`}
              >
                <GitCompare size={18} className="inline mr-2" />
                开始比较
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <input
                    type="file"
                    onChange={handleDiffFileSelect1}
                    ref={diffFileInput1Ref}
                    className="hidden"
                  />
                  <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>文件1 (原始)</label>
                  <div
                    onDragOver={handleDiffDragOver1}
                    onDragLeave={handleDiffDragLeave1}
                    onDrop={handleDiffDrop1}
                    onClick={() => diffFileInput1Ref.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${
                      diffDrag1
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
                        : `${t.border} hover:${t.hoverBg}`
                    }`}
                  >
                    {diffFile1 ? (
                      <div>
                        <div className={`text-sm font-medium ${t.text}`}>{diffFile1.name}</div>
                        <div className={`text-xs ${t.textMuted} mt-1`}>大小: {formatFileSize(diffFile1.data.length)}</div>
                      </div>
                    ) : (
                      <>
                        <Upload size={24} className={`mx-auto mb-2 ${diffDrag1 ? 'text-blue-500' : t.textMuted}`} />
                        <p className={`text-sm ${diffDrag1 ? 'text-blue-500' : t.textSecondary}`}>
                          {diffDrag1 ? '松开鼠标加载文件' : '拖拽文件到此处或点击选择'}
                        </p>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <input
                    type="file"
                    onChange={handleDiffFileSelect2}
                    ref={diffFileInput2Ref}
                    className="hidden"
                  />
                  <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>文件2 (新)</label>
                  <div
                    onDragOver={handleDiffDragOver2}
                    onDragLeave={handleDiffDragLeave2}
                    onDrop={handleDiffDrop2}
                    onClick={() => diffFileInput2Ref.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${
                      diffDrag2
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
                        : `${t.border} hover:${t.hoverBg}`
                    }`}
                  >
                    {diffFile2 ? (
                      <div>
                        <div className={`text-sm font-medium ${t.text}`}>{diffFile2.name}</div>
                        <div className={`text-xs ${t.textMuted} mt-1`}>大小: {formatFileSize(diffFile2.data.length)}</div>
                      </div>
                    ) : (
                      <>
                        <Upload size={24} className={`mx-auto mb-2 ${diffDrag2 ? 'text-blue-500' : t.textMuted}`} />
                        <p className={`text-sm ${diffDrag2 ? 'text-blue-500' : t.textSecondary}`}>
                          {diffDrag2 ? '松开鼠标加载文件' : '拖拽文件到此处或点击选择'}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  if (diffHexView) {
                    computeBinaryDiff();
                  } else {
                    computeFileTextDiff();
                  }
                }}
                disabled={!diffFile1 || !diffFile2}
                className={`px-4 py-2 ${t.button} text-white rounded-lg disabled:opacity-50`}
              >
                <GitCompare size={18} className="inline mr-2" />
                开始比较
              </button>
            </div>
          )}

          {diffResult.length > 0 && (
            <div className={`${t.emptyBg} rounded-lg p-4 mt-4`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-sm font-medium ${t.textSecondary}`}>比较结果</span>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-green-500/20 border border-green-500/50"></span>
                    <span className={t.textMuted}>相同</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-red-500/20 border border-red-500/50"></span>
                    <span className={t.textMuted}>不同</span>
                  </span>
                </div>
              </div>

              {diffFileMode === 'text' ? (
                <div className="space-y-1 font-mono text-sm">
                  {diffResult.map((line: any, index: number) => (
                    <div
                      key={index}
                      className={`px-3 py-1 rounded ${
                        line.type === 'same'
                          ? 'bg-green-500/10 text-green-400'
                          : line.type === 'removed'
                          ? 'bg-red-500/10 text-red-400'
                          : line.type === 'added'
                          ? 'bg-blue-500/10 text-blue-400'
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}
                    >
                      <span className="inline-block w-6 text-xs opacity-50">
                        {line.type === 'same' ? ' ' : line.type === 'removed' ? '-' : line.type === 'added' ? '+' : '~'}
                      </span>
                      {line.type === 'changed' ? `${line.left} → ${line.right}` : line.type === 'same' ? line.left : line.type === 'removed' ? line.left : line.right}
                    </div>
                  ))}
                </div>
              ) : diffHexView ? (
                <div className="font-mono text-sm overflow-auto max-h-96">
                  <table className="w-full">
                    <thead>
                      <tr className={`text-xs ${t.textMuted} border-b ${t.border}`}>
                        <th className="py-1 px-2 text-left w-20">偏移</th>
                        <th className="py-1 px-2 text-left">文件1 {diffFile1?.name}</th>
                        <th className="py-1 px-2 text-left">文件2 {diffFile2?.name}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diffResult.map((item: any, index: number) => (
                        <tr
                          key={index}
                          className={`${
                            item.type === 'diff' ? 'bg-red-500/10' : ''
                          } border-b ${t.border}`}
                        >
                          <td className={`py-1 px-2 text-xs ${t.textMuted}`}>
                            {item.offset.toString(16).padStart(8, '0')}
                          </td>
                          <td className={`py-1 px-2 ${item.type === 'diff' ? 'text-red-400' : t.text}`}>
                            {diffHexView ? item.v1 : diffFile1?.hex.slice(item.offset * 2, (item.offset + 16) * 2) || ''}
                          </td>
                          <td className={`py-1 px-2 ${item.type === 'diff' ? 'text-red-400' : t.text}`}>
                            {diffHexView ? item.v2 : diffFile2?.hex.slice(item.offset * 2, (item.offset + 16) * 2) || ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="space-y-1 font-mono text-sm">
                  {diffResult.map((line: any, index: number) => (
                    <div
                      key={index}
                      className={`px-3 py-1 rounded ${
                        line.type === 'same'
                          ? 'bg-green-500/10 text-green-400'
                          : line.type === 'removed'
                          ? 'bg-red-500/10 text-red-400'
                          : line.type === 'added'
                          ? 'bg-blue-500/10 text-blue-400'
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}
                    >
                      <span className="inline-block w-6 text-xs opacity-50">
                        {line.type === 'same' ? ' ' : line.type === 'removed' ? '-' : line.type === 'added' ? '+' : '~'}
                      </span>
                      {line.type === 'changed' ? `${line.left} → ${line.right}` : line.type === 'same' ? line.left : line.type === 'removed' ? line.left : line.right}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}
