import { formatBytes } from '../utils/formatters';

declare global {
  interface Navigator {
    storage?: {
      persisted: () => Promise<boolean>;
      requestPersistent: () => Promise<boolean>;
      estimate: () => Promise<{
        quota: number;
        usage: number;
      }>;
    };
  }
}

export interface QuotaInfo {
  used: number;
  quota: number;
  usagePercent: number;
  isPersistent: boolean;
  isSupported: boolean;
  error?: string;
}

export interface QuotaRequestResult {
  success: boolean;
  granted: boolean;
  error?: string;
}

const DEFAULT_QUOTA = 500 * 1024 * 1024;
const FALLBACK_QUOTA = 100 * 1024 * 1024;

function isPersistentStorageSupported(): boolean {
  const storage = navigator.storage;
  return 'storage' in navigator &&
         storage !== undefined &&
         'persisted' in storage &&
         'requestPersistent' in storage;
}

function isStorageSupported(): boolean {
  return 'storage' in navigator && 'estimate' in (navigator.storage || {});
}

export { isStorageSupported, isPersistentStorageSupported };

export async function checkPersistentStatus(): Promise<boolean> {
  if (!isPersistentStorageSupported()) {
    return false;
  }
  try {
    return await navigator.storage?.persisted() ?? false;
  } catch {
    return false;
  }
}

export async function requestPersistentStorage(): Promise<QuotaRequestResult> {
  if (!isPersistentStorageSupported()) {
    return {
      success: false,
      granted: false,
      error: 'Persistent storage API is not supported in this browser environment'
    };
  }

  try {
    const granted = await navigator.storage?.requestPersistent() ?? false;
    return {
      success: true,
      granted
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error occurred';
    return {
      success: false,
      granted: false,
      error: `Failed to request persistent storage: ${message}`
    };
  }
}

export async function getQuotaInfo(): Promise<QuotaInfo> {
  if (!isStorageSupported()) {
    return {
      used: 0,
      quota: DEFAULT_QUOTA,
      usagePercent: 0,
      isPersistent: false,
      isSupported: false,
      error: 'Storage API is not supported in this browser'
    };
  }

  try {
    const estimate = await (navigator.storage?.estimate() ?? { quota: DEFAULT_QUOTA, usage: 0 });
    const quota = estimate.quota || DEFAULT_QUOTA;
    const usage = estimate.usage || 0;
    const isPersistent = await checkPersistentStatus();

    return {
      used: usage,
      quota: quota,
      usagePercent: quota > 0 ? Math.round((usage / quota) * 100) : 0,
      isPersistent,
      isSupported: true
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return {
      used: 0,
      quota: FALLBACK_QUOTA,
      usagePercent: 0,
      isPersistent: false,
      isSupported: true,
      error: `Failed to get storage estimate: ${message}`
    };
  }
}

export function formatQuotaInfo(info: QuotaInfo): string {
  if (!info.isSupported) {
    return `存储API不支持，使用默认配额 ${formatBytes(DEFAULT_QUOTA)}`;
  }

  const usedFormatted = formatBytes(info.used);
  const quotaFormatted = formatBytes(info.quota);
  const status = info.isPersistent ? '持久化存储' : '临时存储';

  return `${status} - 已用 ${usedFormatted} / ${quotaFormatted} (${info.usagePercent}%)`;
}

export { formatBytes };

export function getQuotaWarningLevel(info: QuotaInfo): 'normal' | 'warning' | 'critical' {
  if (!info.isSupported) return 'normal';

  const percent = info.usagePercent;
  if (percent >= 95) return 'critical';
  if (percent >= 80) return 'warning';
  return 'normal';
}

export async function initializeStorageWithQuota(): Promise<QuotaInfo> {
  const info = await getQuotaInfo();

  if (info.isSupported && !info.isPersistent && info.quota < DEFAULT_QUOTA) {
    await requestPersistentStorage();
    return getQuotaInfo();
  }

  return info;
}
