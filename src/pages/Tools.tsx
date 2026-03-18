import React, { useState, useRef } from 'react';
import { Hash, Copy, Upload, Loader2 } from 'lucide-react';
import { useToast } from '../components/Toast';
import { generateMD5, calculateFileMD5, copyToClipboard } from '../utils/md5';

export default function Tools() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'md5' | 'ocr'>('md5');
  
  const [md5Input, setMd5Input] = useState('');
  const [md5Result, setMd5Result] = useState('');
  const [fileMD5, setFileMD5] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [calculating, setCalculating] = useState(false);

  const [ocrImage, setOcrImage] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState('');
  const [ocrLoading, setOcrLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleStringMD5 = () => {
    if (!md5Input.trim()) {
      showToast('请输入要加密的字符串', 'error');
      return;
    }
    const result = generateMD5(md5Input);
    setMd5Result(result);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setCalculating(true);
    setFileMD5('');

    try {
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
    };
    reader.readAsDataURL(file);
  };

  const handleOcrRecognize = async () => {
    if (!ocrImage) {
      showToast('请先选择图片', 'error');
      return;
    }

    setOcrLoading(true);
    setOcrResult('');

    try {
      const Tesseract = await import('tesseract.js');
      const result = await Tesseract.recognize(ocrImage, 'chi_sim+eng');
      setOcrResult(result.data.text);
    } catch (error) {
      showToast('OCR识别失败', 'error');
      console.error(error);
    }
    setOcrLoading(false);
  };

  return (
    <div>
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('md5')}
          className={`px-4 py-2 rounded-lg ${
            activeTab === 'md5'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Hash size={18} className="inline mr-2" />
          MD5加密
        </button>
        <button
          onClick={() => setActiveTab('ocr')}
          className={`px-4 py-2 rounded-lg ${
            activeTab === 'ocr'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Upload size={18} className="inline mr-2" />
          OCR文字识别
        </button>
      </div>

      {activeTab === 'md5' && (
        <div className="space-y-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">字符串MD5加密</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">输入字符串</label>
                <textarea
                  value={md5Input}
                  onChange={(e) => setMd5Input(e.target.value)}
                  placeholder="请输入要加密的字符串..."
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={3}
                />
              </div>
              <button
                onClick={handleStringMD5}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                生成MD5
              </button>
              {md5Result && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-500 mb-1">MD5值</div>
                      <div className="font-mono text-sm">{md5Result}</div>
                    </div>
                    <button
                      onClick={() => handleCopy(md5Result)}
                      className="p-2 text-gray-500 hover:text-primary-600"
                    >
                      <Copy size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">文件MD5计算</h3>
            <div className="space-y-4">
              <div>
                <input
                  type="file"
                  onChange={handleFileSelect}
                  ref={fileInputRef}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  <Upload size={18} />
                  选择文件
                </button>
                {selectedFile && (
                  <div className="mt-2 text-sm text-gray-600">
                    已选择: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                  </div>
                )}
              </div>
              {calculating && (
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 size={18} className="animate-spin" />
                  计算中...
                </div>
              )}
              {fileMD5 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-500 mb-1">文件MD5</div>
                      <div className="font-mono text-sm">{fileMD5}</div>
                    </div>
                    <button
                      onClick={() => handleCopy(fileMD5)}
                      className="p-2 text-gray-500 hover:text-primary-600"
                    >
                      <Copy size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ocr' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">OCR文字识别</h3>
          <div className="space-y-4">
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={handleOcrImageSelect}
                className="hidden"
                id="ocr-file-input"
              />
              <label
                htmlFor="ocr-file-input"
                className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 cursor-pointer inline-block"
              >
                <Upload size={18} />
                选择图片
              </label>
            </div>

            {ocrImage && (
              <div className="max-w-md">
                <img src={ocrImage} alt="OCR" className="w-full rounded-lg" />
              </div>
            )}

            <button
              onClick={handleOcrRecognize}
              disabled={!ocrImage || ocrLoading}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {ocrLoading ? (
                <>
                  <Loader2 size={18} className="inline mr-2 animate-spin" />
                  识别中...
                </>
              ) : (
                '开始识别'
              )}
            </button>

            {ocrResult && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">识别结果</span>
                  <button
                    onClick={() => handleCopy(ocrResult)}
                    className="p-2 text-gray-500 hover:text-primary-600"
                  >
                    <Copy size={16} />
                  </button>
                </div>
                <pre className="whitespace-pre-wrap text-sm">{ocrResult}</pre>
              </div>
            )}
          </div>
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
