import CryptoJS from 'crypto-js';

const CHUNK_SIZE = 1 * 1024 * 1024;
const HASH_CHUNK_SIZE = 4 * 1024 * 1024;
const MAX_WORKERS = navigator.hardwareConcurrency || 4;
const CACHE_SIZE = 100;
const BYTES_PER_LINE = 16;

export interface DiffProgress {
  phase: 'hashing' | 'comparing' | 'complete';
  processedBytes: number;
  totalBytes: number;
  percent: number;
  currentAction: string;
  isFastMode: boolean;
}

export interface DiffResult {
  type: 'same' | 'diff';
  offset: number;
  v1: string;
  v2: string;
}

export interface TextDiffResult {
  type: 'same' | 'added' | 'removed' | 'changed';
  left: string;
  right: string;
}

export interface FileComparisonResult {
  isIdentical: boolean;
  diffResults: DiffResult[];
  textDiffResults?: TextDiffResult[];
  totalDiffs: number;
  processingTime: number;
  mode: 'fast' | 'full';
  memoryUsage: number;
}

interface CacheEntry {
  hash: string;
  timestamp: number;
}

class DiffCache {
  private cache: Map<string, CacheEntry> = new Map();
  private accessOrder: string[] = [];

  generateKey(fileName: string, fileSize: number, chunkIndex: number): string {
    return `${fileName}_${fileSize}_${chunkIndex}`;
  }

  get(key: string): string | undefined {
    const entry = this.cache.get(key);
    if (entry) {
      entry.timestamp = Date.now();
      this.accessOrder = this.accessOrder.filter(k => k !== key);
      this.accessOrder.push(key);
    }
    return entry?.hash;
  }

  set(key: string, hash: string): void {
    if (this.cache.size >= CACHE_SIZE) {
      const oldestKey = this.accessOrder.shift();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(key, { hash, timestamp: Date.now() });
    this.accessOrder.push(key);
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  getSize(): number {
    return this.cache.size;
  }
}

const diffCache = new DiffCache();

function arrayBufferToHex(buffer: ArrayBuffer, start: number, length: number): string {
  const bytes = new Uint8Array(buffer, start, length);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join(' ');
}

function uint8ArrayToHex(arr: Uint8Array, start: number, length: number): string {
  const end = Math.min(start + length, arr.length);
  const slice = arr.slice(start, end);
  return Array.from(slice)
    .map(b => b.toString(16).padStart(2, '0'))
    .join(' ');
}

export async function computeChunkHash(
  file: File | Uint8Array,
  chunkIndex: number,
  fileName: string,
  fileSize: number,
  chunkSize: number = HASH_CHUNK_SIZE
): Promise<string> {
  const cacheKey = diffCache.generateKey(fileName, fileSize, chunkIndex);
  const cached = diffCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  let data: ArrayBuffer;
  if (file instanceof File) {
    const start = chunkIndex * chunkSize;
    const end = Math.min(start + chunkSize, fileSize);
    data = await file.slice(start, end).arrayBuffer();
  } else {
    const start = chunkIndex * chunkSize;
    const end = Math.min(start + chunkSize, fileSize);
    data = file.buffer.slice(start, end);
  }

  const wordArray = CryptoJS.lib.WordArray.create(data);
  const hash = CryptoJS.MD5(wordArray).toString().toUpperCase();

  diffCache.set(cacheKey, hash);
  return hash;
}

export async function computeFullFileHash(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    let currentChunk = 0;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    let md5Hasher = CryptoJS.algo.MD5.create();

    function readNextChunk() {
      if (currentChunk >= totalChunks) {
        const hash = md5Hasher.finalize().toString().toUpperCase();
        resolve(hash);
        return;
      }

      const start = currentChunk * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const blob = file.slice(start, end);

      const reader = new FileReader();
      reader.onload = (e) => {
        const wordArray = CryptoJS.lib.WordArray.create(e.target?.result as ArrayBuffer);
        md5Hasher.update(wordArray);
        currentChunk++;
        readNextChunk();
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    }

    readNextChunk();
  });
}

export async function computeFileHashWithWorker(
  file: File,
  onProgress?: (progress: DiffProgress) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(URL.createObjectURL(new Blob([`
      importScripts('https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js');

      self.onmessage = async function(e) {
        const { file, chunkSize } = e.data;
        const totalChunks = Math.ceil(file.size / chunkSize);
        let md5Hasher = CryptoJS.algo.MD5.create();
        let currentChunk = 0;

        async function processChunk() {
          if (currentChunk >= totalChunks) {
            const hash = md5Hasher.finalize().toString().toUpperCase();
            self.postMessage({ type: 'complete', hash });
            return;
          }

          const start = currentChunk * chunkSize;
          const end = Math.min(start + chunkSize, file.size);
          const blob = file.slice(start, end);

          const buffer = await blob.arrayBuffer();
          const wordArray = CryptoJS.lib.WordArray.create(buffer);
          md5Hasher.update(wordArray);

          currentChunk++;
          self.postMessage({
            type: 'progress',
            processed: currentChunk * chunkSize,
            total: file.size,
            percent: Math.round((currentChunk / totalChunks) * 100)
          });

          processChunk();
        }

        processChunk();
      };
    `], { type: 'application/javascript' })));

    worker.onmessage = (e) => {
      if (e.data.type === 'complete') {
        resolve(e.data.hash);
        worker.terminate();
      } else if (e.data.type === 'progress' && onProgress) {
        onProgress({
          phase: 'hashing',
          processedBytes: e.data.processed,
          totalBytes: e.data.total,
          percent: e.data.percent,
          currentAction: '正在计算文件哈希...',
          isFastMode: true
        });
      }
    };

    worker.onerror = reject;
    worker.postMessage({ file, chunkSize: CHUNK_SIZE });
  });
}

export interface CompareOptions {
  isHexView: boolean;
  onProgress?: (progress: DiffProgress) => void;
  signal?: AbortSignal;
}

export async function compareFilesOptimized(
  file1: File,
  file2: File,
  options: CompareOptions
): Promise<FileComparisonResult> {
  const startTime = performance.now();
  const { isHexView, onProgress, signal } = options;

  const abortIfNeeded = () => {
    if (signal?.aborted) {
      throw new Error('操作已被用户取消');
    }
  };

  const totalMemory = (performance as any).memory?.jsHeapSizeLimit || 100 * 1024 * 1024;
  const maxMemoryUsage = totalMemory * 0.3;

  onProgress?.({
    phase: 'hashing',
    processedBytes: 0,
    totalBytes: file1.size + file2.size,
    percent: 0,
    currentAction: '正在计算文件哈希值...',
    isFastMode: true
  });

  abortIfNeeded();

  const [hash1, hash2] = await Promise.all([
    computeFileHashWithWorker(file1, onProgress),
    computeFileHashWithWorker(file2, onProgress)
  ]);

  abortIfNeeded();

  if (hash1 === hash2) {
    const processingTime = performance.now() - startTime;
    return {
      isIdentical: true,
      diffResults: [],
      totalDiffs: 0,
      processingTime,
      mode: 'fast',
      memoryUsage: 0
    };
  }

  onProgress?.({
    phase: 'comparing',
    processedBytes: 0,
    totalBytes: file1.size + file2.size,
    percent: 50,
    currentAction: '文件哈希不一致，开始逐字节比较...',
    isFastMode: false
  });

  if (!isHexView) {
    return compareTextFiles(file1, file2, startTime, abortIfNeeded, onProgress);
  }

  return compareBinaryFiles(file1, file2, startTime, abortIfNeeded, onProgress, maxMemoryUsage);
}

async function compareBinaryFiles(
  file1: File,
  file2: File,
  startTime: number,
  abortIfNeeded: () => void,
  onProgress?: (progress: DiffProgress) => void,
  maxMemoryUsage?: number
): Promise<FileComparisonResult> {
  const len1 = file1.size;
  const len2 = file2.size;
  const maxLen = Math.max(len1, len2);

  const diffResults: DiffResult[] = [];
  let processedBytes = 0;
  let lastProgressUpdate = 0;

  const updateProgress = (current: number) => {
    const now = Date.now();
    if (now - lastProgressUpdate >= 50 || current >= maxLen) {
      const percent = Math.round((current / maxLen) * 100);
      onProgress?.({
        phase: 'comparing',
        processedBytes: current,
        totalBytes: maxLen,
        percent,
        currentAction: `正在比较第 ${formatBytes(current)} / ${formatBytes(maxLen)}`,
        isFastMode: false
      });
      lastProgressUpdate = now;
    }
  };

  const batchSize = 64 * 1024;
  const numBatches = Math.ceil(maxLen / batchSize);

  for (let batch = 0; batch < numBatches; batch++) {
    abortIfNeeded();

    const batchStart = batch * batchSize;
    const batchEnd = Math.min(batchStart + batchSize, maxLen);

    const reads = await Promise.all([
      file1.slice(batchStart, batchEnd).arrayBuffer(),
      file2.slice(batchStart, batchEnd).arrayBuffer()
    ]);

    const data1 = new Uint8Array(reads[0]);
    const data2 = new Uint8Array(reads[1]);

    for (let i = 0; i < batchEnd - batchStart; i += BYTES_PER_LINE) {
      const offset = batchStart + i;
      const lineEnd = Math.min(i + BYTES_PER_LINE, batchEnd - batchStart);

      let lineSame = true;
      for (let j = i; j < lineEnd; j++) {
        const b1 = j < data1.length ? data1[j] : -1;
        const b2 = j < data2.length ? data2[j] : -1;
        if (b1 !== b2) {
          lineSame = false;
          break;
        }
      }

      if (!lineSame) {
        diffResults.push({
          offset,
          type: 'diff',
          v1: uint8ArrayToHex(data1, i, BYTES_PER_LINE),
          v2: uint8ArrayToHex(data2, i, BYTES_PER_LINE)
        });
      }

      processedBytes = offset + BYTES_PER_LINE;
      updateProgress(processedBytes);
    }
  }

  const processingTime = performance.now() - startTime;

  const memoryUsage = (performance as any).memory?.usedJSHeapSize || 0;

  return {
    isIdentical: diffResults.length === 0,
    diffResults,
    totalDiffs: diffResults.length,
    processingTime,
    mode: 'full',
    memoryUsage
  };
}

async function compareTextFiles(
  file1: File,
  file2: File,
  startTime: number,
  abortIfNeeded: () => void,
  onProgress?: (progress: DiffProgress) => void
): Promise<FileComparisonResult> {
  const text1 = await file1.text();
  abortIfNeeded();

  const text2 = await file2.text();
  abortIfNeeded();

  const lines1 = text1.split('\n');
  const lines2 = text2.split('\n');

  const textDiffResults: TextDiffResult[] = [];
  const maxLen = Math.max(lines1.length, lines2.length);
  let lastProgressUpdate = 0;

  for (let i = 0; i < maxLen; i++) {
    abortIfNeeded();

    const l1 = lines1[i] || '';
    const l2 = lines2[i] || '';

    if (l1 === l2) {
      textDiffResults.push({ type: 'same', left: l1, right: l2 });
    } else if (!l1 && l2) {
      textDiffResults.push({ type: 'added', left: '', right: l2 });
    } else if (l1 && !l2) {
      textDiffResults.push({ type: 'removed', left: l1, right: '' });
    } else {
      textDiffResults.push({ type: 'changed', left: l1, right: l2 });
    }

    if (i % 1000 === 0 || i === maxLen - 1) {
      const percent = Math.round((i / maxLen) * 100);
      onProgress?.({
        phase: 'comparing',
        processedBytes: i,
        totalBytes: maxLen,
        percent,
        currentAction: `正在比较第 ${i + 1} / ${maxLen} 行`,
        isFastMode: false
      });
    }
  }

  const processingTime = performance.now() - startTime;
  const memoryUsage = (performance as any).memory?.usedJSHeapSize || 0;

  return {
    isIdentical: textDiffResults.every(r => r.type === 'same'),
    diffResults: [],
    textDiffResults,
    totalDiffs: textDiffResults.filter(r => r.type !== 'same').length,
    processingTime,
    mode: 'full',
    memoryUsage
  };
}

export async function compareFilesParallel(
  file1: File,
  file2: File,
  options: CompareOptions
): Promise<FileComparisonResult> {
  const startTime = performance.now();
  const { isHexView, onProgress, signal } = options;

  const abortIfNeeded = () => {
    if (signal?.aborted) {
      throw new Error('操作已被用户取消');
    }
  };

  const totalSize = file1.size + file2.size;

  onProgress?.({
    phase: 'hashing',
    processedBytes: 0,
    totalBytes: totalSize,
    percent: 0,
    currentAction: '正在并行计算文件哈希...',
    isFastMode: true
  });

  abortIfNeeded();

  const [hash1, hash2] = await Promise.all([
    computeFullFileHash(file1),
    computeFullFileHash(file2)
  ]);

  abortIfNeeded();

  if (hash1 === hash2) {
    return {
      isIdentical: true,
      diffResults: [],
      totalDiffs: 0,
      processingTime: performance.now() - startTime,
      mode: 'fast',
      memoryUsage: 0
    };
  }

  onProgress?.({
    phase: 'comparing',
    processedBytes: 0,
    totalBytes: totalSize,
    percent: 30,
    currentAction: '文件哈希不一致，开始分片并行比较...',
    isFastMode: false
  });

  if (!isHexView) {
    return compareTextFiles(file1, file2, startTime, abortIfNeeded, onProgress);
  }

  const chunkSize = Math.ceil(Math.max(file1.size, file2.size) / MAX_WORKERS);
  const chunks: Array<{ start: number; end: number }> = [];
  const maxLen = Math.max(file1.size, file2.size);

  for (let i = 0; i < MAX_WORKERS; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, maxLen);
    if (start < maxLen) {
      chunks.push({ start, end });
    }
  }

  abortIfNeeded();

  const chunkResults = await Promise.all(
    chunks.map(async (chunk, index) => {
      const reads = await Promise.all([
        file1.slice(chunk.start, chunk.end).arrayBuffer(),
        file2.slice(chunk.start, chunk.end).arrayBuffer()
      ]);

      abortIfNeeded();

      const data1 = new Uint8Array(reads[0]);
      const data2 = new Uint8Array(reads[1]);
      const chunkDiffs: DiffResult[] = [];

      const chunkMaxLen = Math.max(data1.length, data2.length);

      for (let i = 0; i < chunkMaxLen; i += BYTES_PER_LINE) {
        const offset = chunk.start + i;
        const lineEnd = Math.min(i + BYTES_PER_LINE, chunkMaxLen);

        let lineSame = true;
        for (let j = i; j < lineEnd; j++) {
          const b1 = j < data1.length ? data1[j] : -1;
          const b2 = j < data2.length ? data2[j] : -1;
          if (b1 !== b2) {
            lineSame = false;
            break;
          }
        }

        if (!lineSame) {
          chunkDiffs.push({
            offset,
            type: 'diff',
            v1: uint8ArrayToHex(data1, i, BYTES_PER_LINE),
            v2: uint8ArrayToHex(data2, i, BYTES_PER_LINE)
          });
        }
      }

      onProgress?.({
        phase: 'comparing',
        processedBytes: chunk.end,
        totalBytes: maxLen,
        percent: Math.round(30 + (index + 1) * 70 / chunks.length),
        currentAction: `正在比较第 ${index + 1} / ${chunks.length} 个分片...`,
        isFastMode: false
      });

      return chunkDiffs;
    })
  );

  const diffResults = chunkResults.flat().sort((a, b) => a.offset - b.offset);

  return {
    isIdentical: diffResults.length === 0,
    diffResults,
    totalDiffs: diffResults.length,
    processingTime: performance.now() - startTime,
    mode: 'full',
    memoryUsage: (performance as any).memory?.usedJSHeapSize || 0
  };
}

export function clearDiffCache(): void {
  diffCache.clear();
}

export function getCacheSize(): number {
  return diffCache.getSize();
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

export function cancelComparison(): void {
}
