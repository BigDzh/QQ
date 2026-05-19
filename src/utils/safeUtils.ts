export function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (value == null) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function safeArrayAccess<T>(arr: T[] | null | undefined, index: number): T | undefined {
  if (!Array.isArray(arr) || index < 0 || index >= arr.length) {
    return undefined;
  }
  return arr[index];
}

export function safePropertyAccess<T extends object, K extends keyof T>(
  obj: T | null | undefined,
  key: K
): T[K] | undefined {
  if (obj == null || !(key in obj)) {
    return undefined;
  }
  return obj[key];
}

export function safeDivide(numerator: number, denominator: number, fallback: number = 0): number {
  if (denominator === 0 || !Number.isFinite(denominator)) {
    return fallback;
  }
  return numerator / denominator;
}

export function safeLocalStorageGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.warn(`[safeLocalStorage] Failed to read key "${key}":`, e);
    return null;
  }
}

export function safeLocalStorageSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    console.warn(`[safeLocalStorage] Failed to write key "${key}":`, e);
    return false;
  }
}

export function safeLocalStorageRemoveItem(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (e) {
    console.warn(`[safeLocalStorage] Failed to remove key "${key}":`, e);
    return false;
  }
}
