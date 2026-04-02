import React, { useState, useRef } from 'react';
import { Hash, Copy, Upload, Loader2, GitCompare, Crop, Binary, X, Trash2, Settings, CheckCircle, ExternalLink, Download, History, Sliders, Link2, AlertTriangle } from 'lucide-react';
import { useToast } from '../components/Toast';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { generateMD5, calculateFileMD5, copyToClipboard } from '../utils/md5';
import { deleteFile } from '../services/database';
import JumpSkillConfig from './Tools/JumpSkillConfig';
import {
  compareFilesOptimized,
  compareFilesParallel,
  clearDiffCache,
  getCacheSize,
  type DiffProgress,
  type FileComparisonResult
} from '../services/fileDiffService';

export default function Tools() {
  const { showToast } = useToast();
  const t = useThemeStyles();
  const [activeTab, setActiveTab] = useState<'md5' | 'ocr' | 'diff' | 'jump'>('md5');
  
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
  const [ocrHistory, setOcrHistory] = useState<Array<{ id: string; text: string; timestamp: number; lang: string; preview?: string }>>([]);
  const [showOcrHistory, setShowOcrHistory] = useState(false);
  const [ocrPreprocess, setOcrPreprocess] = useState<{ grayscale: boolean; contrast: number; denoise: boolean }>({ grayscale: false, contrast: 1, denoise: false });
  const [showPreprocess, setShowPreprocess] = useState(false);
  const [preprocessedImage, setPreprocessedImage] = useState<string | null>(null);
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

  const [diffResult, setDiffResult] = useState<Array<{ type: 'same' | 'added' | 'removed' | 'changed'; left: string; right: string }>>([]);
  const [diffHexView, setDiffHexView] = useState(false);
  const [diffFile1, setDiffFile1] = useState<{ name: string; data: Uint8Array; hex: string; text: string } | null>(null);
  const [diffFile2, setDiffFile2] = useState<{ name: string; data: Uint8Array; hex: string; text: string } | null>(null);
  const [diffDrag1, setDiffDrag1] = useState(false);
  const [diffDrag2, setDiffDrag2] = useState(false);
  const diffFileInput1Ref = useRef<HTMLInputElement>(null);
  const diffFileInput2Ref = useRef<HTMLInputElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const selectionRef = useRef<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [diffProgress, setDiffProgress] = useState<DiffProgress | null>(null);
  const [comparisonResult, setComparisonResult] = useState<FileComparisonResult | null>(null);
  const [useParallelMode, setUseParallelMode] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleStringMD5 = () => {
    if (!md5Input.trim()) {
      showToast('请输入要加密的字符串', 'error');
      return;
    }
    const result = generateMD5(md5Input);
    setMd5Result(result);
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

  const handleOptimizedCompare = async () => {
    if (!diffFile1 || !diffFile2) {
      showToast('请先选择两个文件进行比较', 'error');
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsComparing(true);
    setDiffProgress(null);
    setComparisonResult(null);
    setDiffResult([]);

    const file1 = new File([], diffFile1.name, { type: 'application/octet-stream' });
    const file2 = new File([], diffFile2.name, { type: 'application/octet-stream' });

    try {
      const result = await compareFilesOptimized(
        file1 as any,
        file2 as any,
        {
          isHexView: diffHexView,
          onProgress: (progress) => {
            setDiffProgress(progress);
          },
          signal: abortControllerRef.current.signal
        }
      );

      setComparisonResult(result);

      if (diffHexView) {
        setDiffResult(result.diffResults as any);
      } else if (result.textDiffResults) {
        setDiffResult(result.textDiffResults);
      }

      if (result.isIdentical) {
        showToast('文件完全相同', 'success');
      } else {
        showToast(`发现 ${result.totalDiffs} 处不同`, 'info');
      }
    } catch (error: any) {
      if (error.message === '操作已被用户取消') {
        showToast('比较已取消', 'info');
      } else {
        showToast(`比较失败: ${error.message}`, 'error');
      }
    } finally {
      setIsComparing(false);
    }
  };

  const handleCancelCompare = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      showToast('正在取消比较...', 'info');
    }
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

  const handleScreenCapture = async () => {
    try {
      setIsCapturing(true);
      showToast('按下鼠标并拖动选择截图区域，按 ESC 取消', 'info');

      const html2canvas = (await import('html2canvas')).default;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Cannot create canvas context');

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = window.innerWidth;
      tempCanvas.height = window.innerHeight;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) throw new Error('Cannot create temp canvas context');

      const dataUrl = await new Promise<string>((resolve) => {
        html2canvas(document.body, {
          useCORS: true,
          allowTaint: true,
          backgroundColor: null,
          scale: 1,
        }).then((capturedCanvas) => {
          tempCtx.drawImage(capturedCanvas, 0, 0);
          resolve(tempCanvas.toDataURL('image/png'));
        });
      });

      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
      };
      img.src = dataUrl;

      const overlay = document.createElement('div');
      overlay.id = 'capture-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.3);
        z-index: 99999;
        cursor: crosshair;
      `;
      document.body.appendChild(overlay);

      const selectionDiv = document.createElement('div');
      selectionDiv.id = 'selection-box';
      selectionDiv.style.cssText = `
        position: fixed;
        border: 2px solid #3b82f6;
        background: transparent;
        z-index: 100000;
        display: none;
        pointer-events: none;
      `;
      document.body.appendChild(selectionDiv);

      const sizeInfo = document.createElement('div');
      sizeInfo.id = 'size-info';
      sizeInfo.style.cssText = `
        position: fixed;
        background: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        z-index: 100001;
        display: none;
        pointer-events: none;
      `;
      document.body.appendChild(sizeInfo);

      const handleMouseDown = (e: MouseEvent) => {
        selectionRef.current = { startX: e.clientX, startY: e.clientY, endX: e.clientX, endY: e.clientY };
        selectionDiv.style.display = 'block';
        sizeInfo.style.display = 'block';
      };

      const handleMouseMove = (e: MouseEvent) => {
        if (!selectionRef.current) return;
        selectionRef.current.endX = e.clientX;
        selectionRef.current.endY = e.clientY;

        const { startX, startY, endX, endY } = selectionRef.current;
        const left = Math.min(startX, endX);
        const top = Math.min(startY, endY);
        const width = Math.abs(endX - startX);
        const height = Math.abs(endY - startY);

        selectionDiv.style.left = `${left}px`;
        selectionDiv.style.top = `${top}px`;
        selectionDiv.style.width = `${width}px`;
        selectionDiv.style.height = `${height}px`;

        sizeInfo.style.left = `${left}px`;
        sizeInfo.style.top = `${top - 25}px`;
        sizeInfo.textContent = `${width} × ${height}`;
      };

      const handleMouseUp = async (e: MouseEvent) => {
        e.preventDefault();
        if (!selectionRef.current) return;

        const { startX, startY, endX, endY } = selectionRef.current;
        const left = Math.min(startX, endX);
        const top = Math.min(startY, endY);
        const width = Math.abs(endX - startX);
        const height = Math.abs(endY - startY);

        if (width < 5 || height < 5) {
          showToast('选择区域太小，请重新选择', 'error');
          cleanup();
          return;
        }

        cleanup();

        try {
          const captureCanvas = document.createElement('canvas');
          captureCanvas.width = width;
          captureCanvas.height = height;
          const captureCtx = captureCanvas.getContext('2d');
          if (!captureCtx) throw new Error('Cannot create capture context');

          const fullImg = new Image();
          fullImg.src = dataUrl;

          await new Promise<void>((resolve) => {
            fullImg.onload = () => {
              captureCtx.drawImage(fullImg, left, top, width, height, 0, 0, width, height);
              resolve();
            };
          });

          const finalDataUrl = captureCanvas.toDataURL('image/png');
          setOcrImage(finalDataUrl);
          setOcrResult('');
          setOcrProgress(0);
          showToast('截图完成，正在识别...', 'success');

          setIsCapturing(false);

          setTimeout(() => {
            handleOcrRecognize(finalDataUrl);
          }, 100);
        } catch (err) {
          console.error('Capture error:', err);
          showToast('截图失败', 'error');
          setIsCapturing(false);
        }
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          cleanup();
          setIsCapturing(false);
          showToast('已取消截图', 'info');
        }
      };

      const cleanup = () => {
        document.removeEventListener('mousedown', handleMouseDown);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('keydown', handleKeyDown);
        document.body.removeChild(overlay);
        document.body.removeChild(selectionDiv);
        document.body.removeChild(sizeInfo);
        selectionRef.current = null;
      };

      document.addEventListener('mousedown', handleMouseDown);
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('keydown', handleKeyDown);

    } catch (error) {
      showToast('截图失败', 'error');
      console.error(error);
      setIsCapturing(false);
    }
  };

  const preprocessImage = (imageSrc: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageSrc);
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;

        if (ocrPreprocess.grayscale || ocrPreprocess.contrast !== 1 || ocrPreprocess.denoise) {
          ctx.drawImage(img, 0, 0);

          let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          let data = imageData.data;

          for (let i = 0; i < data.length; i += 4) {
            if (ocrPreprocess.grayscale) {
              const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
              data[i] = avg;
              data[i + 1] = avg;
              data[i + 2] = avg;
            }

            if (ocrPreprocess.contrast !== 1) {
              const factor = (259 * (ocrPreprocess.contrast * 255 + 255)) / (255 * (259 - ocrPreprocess.contrast * 255));
              data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));
              data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128));
              data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128));
            }

            if (ocrPreprocess.denoise) {
              const noiseReduce = 0.2;
              data[i] = data[i] * (1 - noiseReduce) + 128 * noiseReduce;
              data[i + 1] = data[i + 1] * (1 - noiseReduce) + 128 * noiseReduce;
              data[i + 2] = data[i + 2] * (1 - noiseReduce) + 128 * noiseReduce;
            }
          }

          ctx.putImageData(imageData, 0, 0);
        } else {
          ctx.drawImage(img, 0, 0);
        }

        resolve(canvas.toDataURL('image/png'));
      };
      img.src = imageSrc;
    });
  };

  const addToOcrHistory = (text: string, lang: string, preview?: string) => {
    const newEntry = {
      id: Date.now().toString(),
      text,
      timestamp: Date.now(),
      lang,
      preview
    };
    setOcrHistory(prev => [newEntry, ...prev].slice(0, 50));
  };

  const exportOcrResult = (text: string, format: 'txt' | 'md') => {
    const blob = new Blob([text], { type: format === 'md' ? 'text/markdown' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OCR识别结果_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`已导出为${format === 'md' ? 'Markdown' : '文本'}文件`, 'success');
  };

  const handleOcrRecognize = async (imageData?: string) => {
    const imageSrc = imageData || ocrImage;
    if (!imageSrc) {
      showToast('请先选择图片', 'error');
      return;
    }

    setOcrLoading(true);
    setOcrResult('');
    setOcrProgress(0);

    try {
      const processedImage = await preprocessImage(imageSrc);
      setPreprocessedImage(processedImage);

      const Tesseract = await import('tesseract.js');
      const worker = await Tesseract.createWorker(ocrLang, 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100));
          }
        }
      });

      const { data: { text } } = await worker.recognize(processedImage);
      setOcrResult(text);
      addToOcrHistory(text, ocrLang, ocrImage || undefined);
      await worker.terminate();

      if (imageData && imageData === ocrImage) {
        setTimeout(() => {
          setOcrImage(null);
          showToast('截图已自动清理', 'info');
        }, 2000);
      }
    } catch (error) {
      showToast('OCR识别失败', 'error');
      console.error(error);
    }
    setOcrLoading(false);
    setOcrProgress(0);
  };

  const handlePreciseScreenshotCapture = async () => {
    setIsCapturing(true);
    showToast('拖动选择截图区域，ESC取消，Enter确认识别', 'info');

    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#000',
        scale: 1,
      });

      const dataUrl = canvas.toDataURL('image/png');

      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 99998;
        cursor: crosshair;
      `;
      document.body.appendChild(overlay);

      const selectionBox = document.createElement('div');
      selectionBox.style.cssText = `
        position: fixed;
        border: 2px dashed #3b82f6;
        background: rgba(59, 130, 246, 0.1);
        z-index: 99999;
        display: none;
      `;
      document.body.appendChild(selectionBox);

      const dimInfo = document.createElement('div');
      dimInfo.style.cssText = `
        position: fixed;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 6px 10px;
        border-radius: 6px;
        font-size: 13px;
        font-family: monospace;
        z-index: 100000;
        display: none;
        pointer-events: none;
      `;
      document.body.appendChild(dimInfo);

      let startX = 0, startY = 0, isSelecting = false;

      const handleMouseDown = (e: MouseEvent) => {
        startX = e.clientX;
        startY = e.clientY;
        isSelecting = true;
        selectionBox.style.display = 'block';
        selectionBox.style.left = `${startX}px`;
        selectionBox.style.top = `${startY}px`;
        selectionBox.style.width = '0px';
        selectionBox.style.height = '0px';
        dimInfo.style.display = 'block';
      };

      const handleMouseMove = (e: MouseEvent) => {
        if (!isSelecting) return;
        const currentX = e.clientX;
        const currentY = e.clientY;
        const left = Math.min(startX, currentX);
        const top = Math.min(startY, currentY);
        const width = Math.abs(currentX - startX);
        const height = Math.abs(currentY - startY);

        selectionBox.style.left = `${left}px`;
        selectionBox.style.top = `${top}px`;
        selectionBox.style.width = `${width}px`;
        selectionBox.style.height = `${height}px`;
        dimInfo.style.left = `${left}px`;
        dimInfo.style.top = `${top - 30}px`;
        dimInfo.textContent = `${width} × ${height} @ (${left}, ${top})`;
      };

      const handleMouseUp = async (e: MouseEvent) => {
        if (!isSelecting) return;
        isSelecting = false;

        const currentX = e.clientX;
        const currentY = e.clientY;
        const left = Math.min(startX, currentX);
        const top = Math.min(startY, currentY);
        const width = Math.abs(currentX - startX);
        const height = Math.abs(currentY - startY);

        if (width < 10 || height < 10) {
          showToast('选择区域太小', 'error');
          cleanup();
          return;
        }

        cleanup();

        const captureCanvas = document.createElement('canvas');
        captureCanvas.width = width;
        captureCanvas.height = height;
        const ctx = captureCanvas.getContext('2d');
        if (!ctx) throw new Error('Cannot get context');

        const img = new Image();
        img.src = dataUrl;
        await new Promise<void>((resolve) => {
          img.onload = () => {
            ctx.drawImage(img, left, top, width, height, 0, 0, width, height);
            resolve();
          };
        });

        const finalDataUrl = captureCanvas.toDataURL('image/png');
        setOcrImage(finalDataUrl);
        setOcrResult('');
        setOcrProgress(0);
        setIsCapturing(false);
        showToast('截图完成，正在识别...', 'success');

        setTimeout(() => {
          handleOcrRecognize(finalDataUrl);
        }, 100);
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          cleanup();
          setIsCapturing(false);
          showToast('已取消截图', 'info');
        }
      };

      const cleanup = () => {
        document.removeEventListener('mousedown', handleMouseDown);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('keydown', handleKeyDown);
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        if (selectionBox.parentNode) selectionBox.parentNode.removeChild(selectionBox);
        if (dimInfo.parentNode) dimInfo.parentNode.removeChild(dimInfo);
      };

      document.addEventListener('mousedown', handleMouseDown);
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('keydown', handleKeyDown);

    } catch (error) {
      showToast('截图失败', 'error');
      console.error(error);
      setIsCapturing(false);
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
        <button
          onClick={() => setActiveTab('jump')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'jump'
              ? `${t.button} text-white`
              : `${t.border} ${t.textSecondary} hover:${t.hoverBg}`
          }`}
        >
          <Link2 size={18} className="inline mr-2" />
          跳转技能
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
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-semibold ${t.text}`}>OCR文字识别</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPreprocess(!showPreprocess)}
                className={`px-3 py-1.5 text-xs border rounded-lg ${t.border} hover:${t.hoverBg} flex items-center gap-1 ${showPreprocess ? 'bg-blue-500/10 border-blue-500/50' : ''}`}
              >
                <Sliders size={14} />
                图像预处理
              </button>
              <button
                onClick={() => setShowOcrHistory(!showOcrHistory)}
                className={`px-3 py-1.5 text-xs border rounded-lg ${t.border} hover:${t.hoverBg} flex items-center gap-1 ${showOcrHistory ? 'bg-blue-500/10 border-blue-500/50' : ''}`}
              >
                <History size={14} />
                识别历史
              </button>
            </div>
          </div>
          <div className="space-y-4">
            {showPreprocess && (
              <div className={`${t.emptyBg} rounded-lg p-4 border border-blue-500/20`}>
                <div className="flex items-center gap-6 flex-wrap">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ocrPreprocess.grayscale}
                      onChange={(e) => setOcrPreprocess(prev => ({ ...prev, grayscale: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className={`text-sm ${t.textSecondary}`}>灰度化</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${t.textSecondary}`}>对比度:</span>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={ocrPreprocess.contrast}
                      onChange={(e) => setOcrPreprocess(prev => ({ ...prev, contrast: parseFloat(e.target.value) }))}
                      className="w-24"
                    />
                    <span className={`text-xs ${t.textMuted}`}>{ocrPreprocess.contrast.toFixed(1)}</span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ocrPreprocess.denoise}
                      onChange={(e) => setOcrPreprocess(prev => ({ ...prev, denoise: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className={`text-sm ${t.textSecondary}`}>去噪声</span>
                  </label>
                </div>
                <p className={`text-xs ${t.textMuted} mt-2`}>预处理可提高复杂背景或低质量图片的识别准确率</p>
              </div>
            )}

            {showOcrHistory && (
              <div className={`${t.emptyBg} rounded-lg p-4 border border-blue-500/20`}>
                {ocrHistory.length === 0 ? (
                  <p className={`text-sm ${t.textMuted} text-center py-4`}>暂无识别历史</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {ocrHistory.map((item) => (
                      <div
                        key={item.id}
                        className={`p-3 rounded-lg border ${t.border} hover:${t.hoverBg} cursor-pointer transition-colors`}
                        onClick={() => {
                          setOcrResult(item.text);
                          if (item.preview) {
                            setOcrImage(item.preview);
                          }
                        }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs ${t.textMuted}`}>
                              {new Date(item.timestamp).toLocaleString('zh-CN')}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded ${t.badge}`}>
                              {item.lang === 'chi_sim+eng' ? '中英' : item.lang === 'chi_sim' ? '中文' : '英文'}
                            </span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOcrHistory(prev => prev.filter(h => h.id !== item.id));
                            }}
                            className={`p-1 ${t.textMuted} hover:text-red-500`}
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <p className={`text-sm ${t.text} line-clamp-2`}>{item.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-4 flex-wrap">
              <div>
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
              <div className="flex items-end gap-2">
                <button
                  onClick={handleScreenCapture}
                  disabled={isCapturing}
                  className={`px-4 py-2 border rounded-lg ${t.border} hover:${t.hoverBg} flex items-center gap-2 disabled:opacity-50`}
                >
                  <Crop size={18} />
                  智能截图
                </button>
                <button
                  onClick={handlePreciseScreenshotCapture}
                  disabled={isCapturing}
                  className={`px-4 py-2 border rounded-lg ${t.border} hover:${t.hoverBg} flex items-center gap-2 disabled:opacity-50`}
                >
                  <Settings size={18} />
                  精确截图
                </button>
              </div>
            </div>

            <div className={`text-xs ${t.textMuted} bg-blue-500/10 border border-blue-500/30 rounded-lg p-3`}>
              <div className="font-medium text-blue-500 mb-1">截图功能说明</div>
              <ul className="space-y-0.5 ml-2">
                <li>• <strong>智能截图</strong>：拖动选择区域，自动识别后删除截图</li>
                <li>• <strong>精确截图</strong>：显示坐标和尺寸信息，适合精准定位</li>
                <li>• <strong>图片上传</strong>：支持拖拽或点击选择图片文件</li>
              </ul>
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
                <img src={ocrImage} alt="OCR" className="w-full max-h-80 rounded-lg object-contain border border-gray-200" />
                <button
                  onClick={() => {
                    setOcrImage(null);
                    setOcrResult('');
                    if (ocrFileInputRef.current) ocrFileInputRef.current.value = '';
                  }}
                  className={`absolute top-2 right-2 p-1.5 rounded-lg ${t.card} border ${t.border} hover:${t.hoverBg} flex items-center gap-1`}
                >
                  <Trash2 size={16} className={t.textMuted} />
                  <span className={`text-xs ${t.textMuted}`}>删除</span>
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
              onClick={() => handleOcrRecognize()}
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
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-500" />
                    <span className={`text-sm font-medium ${t.textSecondary}`}>识别结果</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => exportOcrResult(ocrResult, 'txt')}
                      className={`p-2 ${t.textMuted} hover:text-blue-500`}
                      title="导出为TXT"
                    >
                      <Download size={16} />
                    </button>
                    <button
                      onClick={() => exportOcrResult(ocrResult, 'md')}
                      className={`p-2 ${t.textMuted} hover:text-blue-500`}
                      title="导出为Markdown"
                    >
                      <ExternalLink size={16} />
                    </button>
                    <button
                      onClick={() => handleCopy(ocrResult)}
                      className={`p-2 ${t.textMuted} hover:${t.accentText}`}
                      title="复制结果"
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      onClick={() => {
                        setOcrResult('');
                      }}
                      className={`p-2 ${t.textMuted} hover:text-red-500`}
                      title="清空结果"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <pre className={`whitespace-pre-wrap text-sm ${t.text} leading-relaxed`}>{ocrResult}</pre>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'diff' && (
        <div className={`${t.card} rounded-lg shadow-sm p-6 border ${t.border}`}>

          <div className={`text-xs ${t.textMuted} bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4`}>
            <div className="font-medium text-blue-500 mb-1">二进制比较说明</div>
            <ul className="space-y-0.5 ml-2">
              <li>• 支持任意类型文件的字节级比较</li>
              <li>• 点击文件卡片右上角的删除按钮可移除文件后重新上传</li>
              <li>• 支持拖拽上传，点击区域或直接拖拽文件到对应位置</li>
            </ul>
          </div>

          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setDiffHexView(false)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                !diffHexView
                  ? `${t.button} text-white`
                  : `${t.border} ${t.textSecondary} hover:${t.hoverBg}`
              }`}
            >
              文本视图
            </button>
            <button
              onClick={() => setDiffHexView(true)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                diffHexView
                  ? `${t.button} text-white`
                  : `${t.border} ${t.textSecondary} hover:${t.hoverBg}`
              }`}
            >
              <Binary size={16} className="inline mr-1" />
              十六进制视图
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <input
                  type="file"
                  onChange={handleDiffFileSelect1}
                  ref={diffFileInput1Ref}
                  className="hidden"
                />
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>
                  文件1 (原始)
                </label>
                <div
                  onDragOver={handleDiffDragOver1}
                  onDragLeave={handleDiffDragLeave1}
                  onDrop={handleDiffDrop1}
                  className="relative"
                >
                  <div
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
                  {diffFile1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDiffFile1(null);
                        setDiffResult([]);
                        showToast('已删除文件1', 'info');
                      }}
                      className={`absolute top-2 right-2 p-1.5 rounded-lg ${t.card} border ${t.border} hover:bg-red-500/20 hover:border-red-500/50 transition-colors`}
                      title="删除并重新上传"
                    >
                      <Trash2 size={14} className="text-red-500" />
                    </button>
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
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>
                  文件2 (新)
                </label>
                <div
                  onDragOver={handleDiffDragOver2}
                  onDragLeave={handleDiffDragLeave2}
                  onDrop={handleDiffDrop2}
                  className="relative"
                >
                  <div
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
                  {diffFile2 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDiffFile2(null);
                        setDiffResult([]);
                        showToast('已删除文件2', 'info');
                      }}
                      className={`absolute top-2 right-2 p-1.5 rounded-lg ${t.card} border ${t.border} hover:bg-red-500/20 hover:border-red-500/50 transition-colors`}
                      title="删除并重新上传"
                    >
                      <Trash2 size={14} className="text-red-500" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useParallelMode}
                  onChange={(e) => setUseParallelMode(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300"
                  disabled={isComparing}
                />
                <span className={`text-sm ${t.textSecondary}`}>启用并行比较模式</span>
              </label>
              <span className={`text-xs ${t.textMuted}`}>
                缓存: {getCacheSize()} 条记录
                <button
                  onClick={() => {
                    clearDiffCache();
                    showToast('缓存已清除', 'success');
                  }}
                  className={`ml-2 text-cyan-500 hover:text-cyan-600`}
                  disabled={isComparing}
                >
                  清除
                </button>
              </span>
            </div>

            {isComparing && diffProgress && (
              <div className={`${t.emptyBg} rounded-lg p-4 mb-4 border border-cyan-500/30`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Loader2 size={16} className={`animate-spin ${t.textMuted}`} />
                    <span className={`text-sm ${t.textSecondary}`}>{diffProgress.currentAction}</span>
                  </div>
                  <span className={`text-xs ${t.textMuted}`}>{diffProgress.percent}%</span>
                </div>
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      diffProgress.isFastMode
                        ? 'bg-gradient-to-r from-green-500 to-blue-500'
                        : 'bg-gradient-to-r from-cyan-500 to-purple-500'
                    }`}
                    style={{ width: `${diffProgress.percent}%` }}
                  />
                </div>
                {diffProgress.isFastMode && (
                  <div className="flex items-center gap-1 mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded bg-green-500/10 text-green-600`}>
                      快速模式
                    </span>
                    <span className={`text-xs ${t.textMuted}`}>（哈希预比较，仅在不一致时逐字节比对）</span>
                  </div>
                )}
                <button
                  onClick={handleCancelCompare}
                  className={`mt-3 px-3 py-1.5 text-xs border rounded-lg ${t.border} hover:bg-red-500/10 hover:border-red-500/50 flex items-center gap-1`}
                >
                  <AlertTriangle size={12} className="text-red-500" />
                  取消比较
                </button>
              </div>
            )}

            {comparisonResult && !isComparing && (
              <div className={`${t.emptyBg} rounded-lg p-4 mb-4 border border-green-500/30`}>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle size={16} className="text-green-500" />
                  <span className={`text-sm font-medium ${t.text}`}>比较完成</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className={`${t.textMuted}`}>处理模式：</span>
                    <span className={`font-medium ${comparisonResult.mode === 'fast' ? 'text-green-500' : 'text-cyan-500'}`}>
                      {comparisonResult.mode === 'fast' ? '快速模式' : '完整模式'}
                    </span>
                  </div>
                  <div>
                    <span className={`${t.textMuted}`}>处理时间：</span>
                    <span className={`font-medium ${t.text}`}>{comparisonResult.processingTime.toFixed(2)}ms</span>
                  </div>
                  <div>
                    <span className={`${t.textMuted}`}>差异数量：</span>
                    <span className={`font-medium ${comparisonResult.totalDiffs > 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {comparisonResult.totalDiffs} 处
                    </span>
                  </div>
                  <div>
                    <span className={`${t.textMuted}`}>文件状态：</span>
                    <span className={`font-medium ${comparisonResult.isIdentical ? 'text-green-500' : 'text-orange-500'}`}>
                      {comparisonResult.isIdentical ? '完全相同' : '存在差异'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleOptimizedCompare}
              disabled={!diffFile1 || !diffFile2 || isComparing}
              className={`px-4 py-2 ${t.button} text-white rounded-lg disabled:opacity-50 flex items-center gap-2`}
            >
              {isComparing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  比较中...
                </>
              ) : (
                <>
                  <GitCompare size={18} />
                  开始优化比较
                </>
              )}
            </button>
          </div>

          {diffResult.length > 0 && (
            <div className={`${t.emptyBg} rounded-lg p-4 mt-4`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${t.textSecondary}`}>比较结果</span>
                  <span className={`text-xs ${t.textMuted}`}>
                    ({diffResult.filter((r: any) => r.type === 'diff').length} 处不同)
                  </span>
                </div>
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

              {diffHexView ? (
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
                            {item.v1}
                          </td>
                          <td className={`py-1 px-2 ${item.type === 'diff' ? 'text-red-400' : t.text}`}>
                            {item.v2}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="space-y-1 font-mono text-sm max-h-96 overflow-auto">
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

      {activeTab === 'jump' && (
        <div className={`${t.card} rounded-lg shadow-sm p-6 border ${t.border}`}>
          <JumpSkillConfig />
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
