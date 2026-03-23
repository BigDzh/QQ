const QUOTA_WARNING_THRESHOLD = 0.8;
const QUOTA_CRITICAL_THRESHOLD = 0.95;
const MAX_LOCALSTORAGE_SIZE = 5 * 1024 * 1024;

export interface StorageInfo {
  key: string;
  size: number;
  sizeFormatted: string;
}

export interface StorageStatus {
  used: number;
  quota: number;
  usagePercent: number;
  items: StorageInfo[];
  isWarning: boolean;
  isCritical: boolean;
}

export function getStorageInfo(): StorageStatus {
  let used = 0;
  const items: StorageInfo[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const value = localStorage.getItem(key) || '';
      const size = (key.length + value.length) * 2;
      used += size;
      items.push({
        key,
        size,
        sizeFormatted: formatBytes(size),
      });
    }
  }

  items.sort((a, b) => b.size - a.size);

  const usagePercent = Math.round((used / MAX_LOCALSTORAGE_SIZE) * 100);

  return {
    used,
    quota: MAX_LOCALSTORAGE_SIZE,
    usagePercent: Math.min(usagePercent, 100),
    items,
    isWarning: usagePercent >= QUOTA_WARNING_THRESHOLD * 100,
    isCritical: usagePercent >= QUOTA_CRITICAL_THRESHOLD * 100,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function safeSetItem(
  key: string,
  value: string,
  options: {
    maxSize?: number;
    onQuotaExceeded?: () => void;
    compress?: boolean;
  } = {}
): boolean {
  const { maxSize, onQuotaExceeded, compress } = options;

  let processedValue = value;
  if (compress) {
    processedValue = compressData(value);
  }

  const size = (key.length + processedValue.length) * 2;
  const status = getStorageInfo();

  if (maxSize && size > maxSize) {
    if (onQuotaExceeded) {
      onQuotaExceeded();
    }
    return false;
  }

  if (status.usagePercent >= QUOTA_CRITICAL_THRESHOLD * 100) {
    const cleaned = cleanupLargeItems(size);
    if (!cleaned && onQuotaExceeded) {
      onQuotaExceeded();
      return false;
    }
  }

  try {
    localStorage.setItem(key, processedValue);
    return true;
  } catch (e) {
    if (onQuotaExceeded) {
      onQuotaExceeded();
    }
    return false;
  }
}

function compressData(data: string): string {
  try {
    const compressed = btoa(encodeURIComponent(data));
    if (compressed.length < data.length) {
      return compressed;
    }
  } catch (e) {
  }
  return data;
}

export function decompressData(data: string): string {
  try {
    const decoded = decodeURIComponent(atob(data));
    return decoded;
  } catch (e) {
    return data;
  }
}

function cleanupLargeItems(requiredSpace: number): boolean {
  const targetCleanup = requiredSpace + 1024 * 1024;

  let cleaned = 0;
  const lowPriorityKeys = [
    'search_history',
    'theme',
  ];

  for (const key of lowPriorityKeys) {
    if (localStorage.getItem(key)) {
      const value = localStorage.getItem(key) || '';
      cleaned += (key.length + value.length) * 2;
      localStorage.removeItem(key);
      if (cleaned >= targetCleanup) break;
    }
  }

  if (cleaned < targetCleanup) {
    const auditLogs = localStorage.getItem('audit_logs');
    if (auditLogs) {
      try {
        const logs = JSON.parse(auditLogs);
        if (Array.isArray(logs) && logs.length > 100) {
          const reducedLogs = logs.slice(0, 100);
          localStorage.setItem('audit_logs', JSON.stringify(reducedLogs));
          cleaned += (auditLogs.length - JSON.stringify(reducedLogs).length) * 2;
        }
      } catch (e) {
      }
    }
  }

  return cleaned >= requiredSpace;
}

export function safeGetItem<T = string>(
  key: string,
  options: {
    decompress?: boolean;
    defaultValue?: T;
  } = {}
): T | null {
  const { decompress, defaultValue } = options;

  try {
    let value = localStorage.getItem(key);
    if (value === null) return defaultValue ?? null;

    if (decompress) {
      value = decompressData(value);
    }

    if (defaultValue !== undefined) {
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as unknown as T;
      }
    }

    return value as unknown as T;
  } catch (e) {
    return defaultValue ?? null;
  }
}

export function safeSetObject<T extends object | string>(
  key: string,
  value: T,
  options: {
    compress?: boolean;
    onQuotaExceeded?: () => void;
  } = {}
): boolean {
  try {
    const json = JSON.stringify(value);
    return safeSetItem(key, json, {
      compress: options.compress,
      onQuotaExceeded: options.onQuotaExceeded,
    });
  } catch (e) {
    if (options.onQuotaExceeded) {
      options.onQuotaExceeded();
    }
    return false;
  }
}

export function safeGetObject<T extends object>(
  key: string,
  options: {
    decompress?: boolean;
    defaultValue?: T;
  } = {}
): T | null {
  const value = safeGetItem<string>(key, { decompress: options.decompress });
  if (value === null) return options.defaultValue ?? null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return options.defaultValue ?? null;
  }
}

export function cleanupOldData(daysToKeep: number = 30): number {
  let cleanedCount = 0;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  try {
    const searchHistory = localStorage.getItem('search_history');
    if (searchHistory) {
      const history = JSON.parse(searchHistory);
      const filtered = history.filter((item: { timestamp?: string }) => {
        if (!item.timestamp) return true;
        return new Date(item.timestamp) > cutoffDate;
      });
      if (filtered.length < history.length) {
        localStorage.setItem('search_history', JSON.stringify(filtered));
        cleanedCount += history.length - filtered.length;
      }
    }
  } catch (e) {
  }

  try {
    const auditLogs = localStorage.getItem('audit_logs');
    if (auditLogs) {
      const logs = JSON.parse(auditLogs);
      const filtered = logs.filter((log: { timestamp?: string }) => {
        if (!log.timestamp) return true;
        return new Date(log.timestamp) > cutoffDate;
      });
      if (filtered.length < logs.length) {
        localStorage.setItem('audit_logs', JSON.stringify(filtered));
        cleanedCount += logs.length - filtered.length;
      }
    }
  } catch (e) {
  }

  return cleanedCount;
}

export function getStorageWarning(): string | null {
  const status = getStorageInfo();
  if (status.isCritical) {
    return `存储空间已严重不足 (${status.usagePercent}%)，请及时清理或备份数据。`;
  }
  if (status.isWarning) {
    return `存储空间使用率较高 (${status.usagePercent}%)，建议清理不必要的缓存数据。`;
  }
  return null;
}

export function autoCleanupIfNeeded(): number {
  const status = getStorageInfo();
  if (status.isCritical) {
    return cleanupOldData(7);
  }
  if (status.isWarning) {
    return cleanupOldData(14);
  }
  return 0;
}