import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'lifecycle-management-db';
const DB_VERSION = 3;

interface FileRecord {
  id: string;
  projectId?: string;
  type: 'document' | 'software' | 'designFile' | 'image';
  name: string;
  data: Blob;
  size: number;
  mimeType: string;
  createdAt: string;
}

interface CoreDataRecord {
  id: string;
  data: string;
  createdAt: string;
  updatedAt: string;
}

export interface StorageStats {
  fileCount: number;
  usedSpace: number;
  quota: number;
  byType: Record<string, { count: number; size: number }>;
}

interface PaginationResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SaveFileProgress {
  loaded: number;
  total: number;
  percent: number;
  stage: 'hashing' | 'saving' | 'complete';
}

let db: IDBPDatabase | null = null;

export async function initDB(): Promise<IDBPDatabase> {
  if (db) return db;

  db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(database, oldVersion) {
      if (oldVersion < 1) {
        if (!database.objectStoreNames.contains('files')) {
          const fileStore = database.createObjectStore('files', { keyPath: 'id' });
          fileStore.createIndex('projectId', 'projectId');
          fileStore.createIndex('type', 'type');
          fileStore.createIndex('createdAt', 'createdAt');
        }
        if (!database.objectStoreNames.contains('coreData')) {
          database.createObjectStore('coreData', { keyPath: 'id' });
        }
      }
      if (oldVersion < 2) {
        if (!database.objectStoreNames.contains('coreData')) {
          database.createObjectStore('coreData', { keyPath: 'id' });
        }
      }
      if (oldVersion < 3) {
        if (!database.objectStoreNames.contains('files')) {
          const fileStore = database.createObjectStore('files', { keyPath: 'id' });
          fileStore.createIndex('projectId', 'projectId');
          fileStore.createIndex('type', 'type');
          fileStore.createIndex('createdAt', 'createdAt');
        }
      }
    },
  });

  return db;
}

export async function saveFile(
  fileRecord: FileRecord,
  onProgress?: (progress: SaveFileProgress) => void
): Promise<void> {
  try {
    const database = await initDB();

    if (onProgress) {
      onProgress({ loaded: 0, total: fileRecord.size, percent: 0, stage: 'saving' });
    }

    await database.put('files', fileRecord);

    if (onProgress) {
      onProgress({ loaded: fileRecord.size, total: fileRecord.size, percent: 100, stage: 'complete' });
    }
  } catch (error) {
    console.error('Failed to save file:', error);
    throw new Error(`文件保存失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

export async function saveFileInChunks(
  file: File,
  fileId: string,
  projectId: string,
  type: 'document' | 'software' | 'designFile' | 'image',
  onProgress?: (progress: SaveFileProgress) => void
): Promise<string> {
  try {
    const database = await initDB();

    const tx = database.transaction('files', 'readwrite');
    const store = tx.objectStore('files');

    const fileRecord: FileRecord = {
      id: fileId,
      projectId,
      type,
      name: file.name,
      data: file,
      size: file.size,
      mimeType: file.type || 'application/octet-stream',
      createdAt: new Date().toISOString(),
    };

    if (onProgress) {
      onProgress({ loaded: 0, total: file.size, percent: 0, stage: 'saving' });
    }

    await store.put(fileRecord);

    if (onProgress) {
      onProgress({ loaded: file.size, total: file.size, percent: 100, stage: 'complete' });
    }

    await tx.done;
    return fileId;
  } catch (error) {
    console.error('Failed to save file in chunks:', error);
    throw new Error(`分块文件保存失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

export async function getFile(id: string): Promise<FileRecord | undefined> {
  try {
    const database = await initDB();
    return database.get('files', id);
  } catch (error) {
    console.error('Failed to get file:', error);
    return undefined;
  }
}

export async function getFileBlob(id: string): Promise<Blob | null> {
  try {
    const file = await getFile(id);
    return file?.data || null;
  } catch (error) {
    console.error('Failed to get file blob:', error);
    return null;
  }
}

export async function downloadFile(id: string, fileName?: string): Promise<{ blob: Blob | null; name: string; isValid: boolean; error?: string }> {
  try {
    const file = await getFile(id);
    if (!file) {
      return { blob: null, name: fileName || 'unknown', isValid: false, error: '文件不存在' };
    }
    return { blob: file.data, name: file.name, isValid: true };
  } catch (error) {
    console.error('Failed to download file:', error);
    return {
      blob: null,
      name: fileName || 'unknown',
      isValid: false,
      error: `文件下载失败: ${error instanceof Error ? error.message : '未知错误'}`
    };
  }
}

export async function getFilesByProject(projectId: string): Promise<FileRecord[]> {
  try {
    const database = await initDB();
    return database.getAllFromIndex('files', 'projectId', projectId);
  } catch (error) {
    console.error('Failed to get files by project:', error);
    return [];
  }
}

export async function getFilesByType(type: string): Promise<FileRecord[]> {
  try {
    const database = await initDB();
    return database.getAllFromIndex('files', 'type', type);
  } catch (error) {
    console.error('Failed to get files by type:', error);
    return [];
  }
}

export async function getAllFiles(): Promise<FileRecord[]> {
  try {
    const database = await initDB();
    return database.getAll('files');
  } catch (error) {
    console.error('Failed to get all files:', error);
    return [];
  }
}

export async function searchFiles(
  keyword: string,
  options: {
    type?: string;
    projectId?: string;
    page?: number;
    pageSize?: number;
  } = {}
): Promise<PaginationResult<FileRecord>> {
  try {
    const database = await initDB();

    let results: FileRecord[] = [];

    if (options.projectId && options.projectId !== 'all') {
      results = await database.getAllFromIndex('files', 'projectId', options.projectId);
    } else if (options.type && options.type !== 'all') {
      results = await database.getAllFromIndex('files', 'type', options.type);
    } else {
      results = await database.getAll('files');
    }

    if (keyword) {
      const lowerKeyword = keyword.toLowerCase();
      results = results.filter((f) => f.name.toLowerCase().includes(lowerKeyword));
    }

    if (options.type && options.type !== 'all') {
      results = results.filter((f) => f.type === options.type);
    }
    if (options.projectId && options.projectId !== 'all') {
      results = results.filter((f) => f.projectId === options.projectId);
    }

    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const page = options.page || 1;
    const pageSize = options.pageSize || 50;
    const total = results.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const items = results.slice(start, start + pageSize);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
    };
  } catch (error) {
    console.error('Failed to search files:', error);
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize: options.pageSize || 50,
      totalPages: 0,
    };
  }
}

export async function deleteFile(id: string): Promise<void> {
  try {
    const database = await initDB();
    await database.delete('files', id);
  } catch (error) {
    console.error('Failed to delete file:', error);
    throw new Error(`文件删除失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

export async function deleteFiles(ids: string[]): Promise<void> {
  try {
    const database = await initDB();
    const tx = database.transaction('files', 'readwrite');
    await Promise.all(ids.map((id) => tx.store.delete(id)));
    await tx.done;
  } catch (error) {
    console.error('Failed to delete files:', error);
    throw new Error(`批量文件删除失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

export async function clearAllFiles(): Promise<void> {
  try {
    const database = await initDB();
    await database.clear('files');
  } catch (error) {
    console.error('Failed to clear all files:', error);
    throw new Error(`清空文件失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

export async function saveCoreData(key: string, data: string): Promise<void> {
  const database = await initDB();
  const tx = database.transaction('coreData', 'readwrite');
  const record: CoreDataRecord = {
    id: key,
    data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await tx.store.put(record);
  await tx.done;
}

export async function getCoreData(key: string): Promise<string | undefined> {
  const database = await initDB();
  const result = await database.get('coreData', key);
  return result?.data;
}

export async function getAllCoreDataKeys(): Promise<string[]> {
  const database = await initDB();
  const all = await database.getAll('coreData');
  const sorted = all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return sorted.map((item) => item.id);
}

export async function deleteCoreData(key: string): Promise<void> {
  const database = await initDB();
  await database.delete('coreData', key);
}

export async function exportDatabase(): Promise<{
  files: FileRecord[];
  coreData: CoreDataRecord[];
  exportedAt: string;
  version: string;
}> {
  const database = await initDB();
  const [files, coreData] = await Promise.all([
    database.getAll('files'),
    database.getAll('coreData'),
  ]);
  
  return {
    files,
    coreData,
    exportedAt: new Date().toISOString(),
    version: DB_VERSION.toString(),
  };
}

export async function importDatabase(data: {
  files?: FileRecord[];
  coreData?: CoreDataRecord[];
  clearFirst?: boolean;
}): Promise<{ filesImported: number; coreDataImported: number }> {
  const database = await initDB();
  let filesImported = 0;
  let coreDataImported = 0;

  if (data.clearFirst) {
    const clearTx = database.transaction(['files', 'coreData'], 'readwrite');
    await clearTx.objectStore('files').clear();
    await clearTx.objectStore('coreData').clear();
    await clearTx.done;
  }

  if (data.files && data.files.length > 0) {
    const tx = database.transaction('files', 'readwrite');
    await Promise.all(data.files.map((f) => tx.store.put(f)));
    await tx.done;
    filesImported = data.files.length;
  }

  if (data.coreData && data.coreData.length > 0) {
    const tx = database.transaction('coreData', 'readwrite');
    await Promise.all(data.coreData.map((c) => tx.store.put(c)));
    await tx.done;
    coreDataImported = data.coreData.length;
  }

  return { filesImported, coreDataImported };
}

export async function getStorageStats(): Promise<StorageStats> {
  const database = await initDB();
  const files = await database.getAll('files');
  
  const byType: Record<string, { count: number; size: number }> = {};
  let usedSpace = 0;
  
  for (const file of files) {
    usedSpace += file.size;
    if (!byType[file.type]) {
      byType[file.type] = { count: 0, size: 0 };
    }
    byType[file.type].count++;
    byType[file.type].size += file.size;
  }
  
  let quota = 0;
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    quota = estimate.quota || 0;
  }
  
  return {
    fileCount: files.length,
    usedSpace,
    quota,
    byType,
  };
}

export async function vacuumDatabase(): Promise<{ reclaimedSpace: number }> {
  return { reclaimedSpace: 0 };
}
