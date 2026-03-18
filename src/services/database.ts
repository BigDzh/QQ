import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'lifecycle-management-db';
const DB_VERSION = 1;

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

let db: IDBPDatabase | null = null;

export async function initDB(): Promise<IDBPDatabase> {
  if (db) return db;

  db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains('files')) {
        const fileStore = database.createObjectStore('files', { keyPath: 'id' });
        fileStore.createIndex('projectId', 'projectId');
        fileStore.createIndex('type', 'type');
      }
      if (!database.objectStoreNames.contains('coreData')) {
        database.createObjectStore('coreData', { keyPath: 'id' });
      }
    },
  });

  return db;
}

export async function saveFile(file: FileRecord): Promise<void> {
  const database = await initDB();
  await database.put('files', file);
}

export async function getFile(id: string): Promise<FileRecord | undefined> {
  const database = await initDB();
  return database.get('files', id);
}

export async function getFilesByProject(projectId: string): Promise<FileRecord[]> {
  const database = await initDB();
  return database.getAllFromIndex('files', 'projectId', projectId);
}

export async function getFilesByType(type: string): Promise<FileRecord[]> {
  const database = await initDB();
  return database.getAllFromIndex('files', 'type', type);
}

export async function getAllFiles(): Promise<FileRecord[]> {
  const database = await initDB();
  return database.getAll('files');
}

export async function deleteFile(id: string): Promise<void> {
  const database = await initDB();
  await database.delete('files', id);
}

export async function deleteFiles(ids: string[]): Promise<void> {
  const database = await initDB();
  const tx = database.transaction('files', 'readwrite');
  await Promise.all(ids.map((id) => tx.store.delete(id)));
  await tx.done;
}

export async function clearAllFiles(): Promise<void> {
  const database = await initDB();
  await database.clear('files');
}

export async function saveCoreData(key: string, data: string): Promise<void> {
  const database = await initDB();
  await database.put('coreData', { id: key, data });
}

export async function getCoreData(key: string): Promise<string | undefined> {
  const database = await initDB();
  const result = await database.get('coreData', key);
  return result?.data;
}

export async function getStorageStats(): Promise<{ fileCount: number; usedSpace: number; quota: number }> {
  const files = await getAllFiles();
  const usedSpace = files.reduce((sum, f) => sum + f.size, 0);
  
  let quota = 0;
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    quota = estimate.quota || 0;
  }

  return {
    fileCount: files.length,
    usedSpace,
    quota,
  };
}
