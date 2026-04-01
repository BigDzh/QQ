const DB_NAME = 'LifecycleManagementDB';
const DB_VERSION = 1;

export interface DBSchema {
  projects: {
    key: string;
    value: unknown;
    indexes: {
      'by-created': number;
      'by-name': string;
    };
  };
  tasks: {
    key: string;
    value: unknown;
    indexes: {
      'by-status': string;
      'by-project': string;
      'by-created': number;
    };
  };
  auditLogs: {
    key: string;
    value: unknown;
    indexes: {
      'by-timestamp': number;
      'by-action': string;
      'by-resource': string;
    };
  };
  searchCache: {
    key: string;
    value: {
      query: string;
      results: unknown[];
      timestamp: number;
    };
  };
}

type StoreNames = keyof DBSchema;

class IndexedDBService {
  private db: IDBDatabase | null = null;
  private dbPromise: Promise<IDBDatabase> | null = null;

  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[IndexedDB] Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.info('[IndexedDB] Database opened successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        console.info('[IndexedDB] Upgrading database schema...');

        if (!db.objectStoreNames.contains('projects')) {
          const projectsStore = db.createObjectStore('projects', { keyPath: 'id' });
          projectsStore.createIndex('by-created', 'createdAt');
          projectsStore.createIndex('by-name', 'name');
        }

        if (!db.objectStoreNames.contains('tasks')) {
          const tasksStore = db.createObjectStore('tasks', { keyPath: 'id' });
          tasksStore.createIndex('by-status', 'status');
          tasksStore.createIndex('by-project', 'projectId');
          tasksStore.createIndex('by-created', 'createdAt');
        }

        if (!db.objectStoreNames.contains('auditLogs')) {
          const auditStore = db.createObjectStore('auditLogs', { keyPath: 'id' });
          auditStore.createIndex('by-timestamp', 'timestamp');
          auditStore.createIndex('by-action', 'action');
          auditStore.createIndex('by-resource', 'resourceType');
        }

        if (!db.objectStoreNames.contains('searchCache')) {
          db.createObjectStore('searchCache', { keyPath: 'query' });
        }

        console.info('[IndexedDB] Database schema upgraded');
      };
    });

    return this.dbPromise;
  }

  private async getStore(storeName: StoreNames, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    const db = await this.init();
    const transaction = db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  async get<T>(storeName: StoreNames, key: string): Promise<T | null> {
    try {
      const store = await this.getStore(storeName);
      return new Promise((resolve, reject) => {
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result as T | null);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error(`[IndexedDB] Error getting ${storeName}/${key}:`, error);
      return null;
    }
  }

  async getAll<T>(storeName: StoreNames): Promise<T[]> {
    try {
      const store = await this.getStore(storeName);
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result as T[]);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error(`[IndexedDB] Error getting all from ${storeName}:`, error);
      return [];
    }
  }

  async put<T extends object>(storeName: StoreNames, value: T, key?: string): Promise<string | null> {
    try {
      const store = await this.getStore(storeName, 'readwrite');
      return new Promise((resolve, reject) => {
        const request = key ? store.put(value, key) : store.add(value);
        request.onsuccess = () => resolve(request.result as string);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error(`[IndexedDB] Error putting ${storeName}:`, error);
      return null;
    }
  }

  async delete(storeName: StoreNames, key: string): Promise<boolean> {
    try {
      const store = await this.getStore(storeName, 'readwrite');
      return new Promise((resolve, reject) => {
        const request = store.delete(key);
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error(`[IndexedDB] Error deleting ${storeName}/${key}:`, error);
      return false;
    }
  }

  async clear(storeName: StoreNames): Promise<boolean> {
    try {
      const store = await this.getStore(storeName, 'readwrite');
      return new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error(`[IndexedDB] Error clearing ${storeName}:`, error);
      return false;
    }
  }

  async count(storeName: StoreNames): Promise<number> {
    try {
      const store = await this.getStore(storeName);
      return new Promise((resolve, reject) => {
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error(`[IndexedDB] Error counting ${storeName}:`, error);
      return 0;
    }
  }

  async getByIndex<T>(
    storeName: StoreNames,
    indexName: string,
    query: IDBValidKey | IDBKeyRange
  ): Promise<T[]> {
    try {
      const store = await this.getStore(storeName);
      const index = store.index(indexName);
      return new Promise((resolve, reject) => {
        const request = index.getAll(query);
        request.onsuccess = () => resolve(request.result as T[]);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error(`[IndexedDB] Error querying ${storeName} by ${indexName}:`, error);
      return [];
    }
  }

  async bulkPut<T extends object>(storeName: StoreNames, items: T[]): Promise<number> {
    try {
      const store = await this.getStore(storeName, 'readwrite');
      let successCount = 0;

      return new Promise((resolve, reject) => {
        const transaction = store.transaction;
        transaction.oncomplete = () => resolve(successCount);
        transaction.onerror = () => reject(transaction.error);

        items.forEach((item) => {
          const request = store.put(item);
          request.onsuccess = () => successCount++;
        });
      });
    } catch (error) {
      console.error(`[IndexedDB] Error bulk putting ${storeName}:`, error);
      return 0;
    }
  }

  async deleteByIndex(
    storeName: StoreNames,
    indexName: string,
    query: IDBValidKey | IDBKeyRange
  ): Promise<number> {
    try {
      const db = await this.init();
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      let deleteCount = 0;

      return new Promise((resolve, reject) => {
        const request = index.openCursor(query);
        request.onsuccess = () => {
          const cursor = request.result;
          if (cursor) {
            cursor.delete();
            deleteCount++;
            cursor.continue();
          }
        };
        request.onerror = () => reject(request.error);
        transaction.oncomplete = () => resolve(deleteCount);
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.error(`[IndexedDB] Error deleting by index ${storeName}/${indexName}:`, error);
      return 0;
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.dbPromise = null;
      console.info('[IndexedDB] Database closed');
    }
  }

  async deleteDatabase(): Promise<boolean> {
    try {
      await this.close();
      return new Promise((resolve) => {
        const request = indexedDB.deleteDatabase(DB_NAME);
        request.onsuccess = () => {
          console.info('[IndexedDB] Database deleted');
          resolve(true);
        };
        request.onerror = () => {
          console.error('[IndexedDB] Failed to delete database');
          resolve(false);
        };
      });
    } catch (error) {
      console.error('[IndexedDB] Error deleting database:', error);
      return false;
    }
  }

  isSupported(): boolean {
    return typeof indexedDB !== 'undefined';
  }
}

export const indexedDBService = new IndexedDBService();

export default indexedDBService;
