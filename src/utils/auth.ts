import CryptoJS from 'crypto-js';
import type { User, UserRole } from '../types/auth';
import { ROLE_PERMISSIONS, type Permission } from '../types/auth';

const getSecretKey = (): string => {
  if (typeof import.meta !== 'undefined' && (import.meta as { env?: { VITE_SECRET_KEY?: string } }).env?.VITE_SECRET_KEY) {
    return (import.meta as { env: { VITE_SECRET_KEY: string } }).env.VITE_SECRET_KEY;
  }
  const stored = sessionStorage.getItem('session_secret');
  if (stored) return stored;
  const newSecret = CryptoJS.lib.WordArray.random(32).toString();
  sessionStorage.setItem('session_secret', newSecret);
  return newSecret;
};

let SECRET_KEY: string | null = null;

const getSecretKeyCached = (): string => {
  if (!SECRET_KEY) {
    SECRET_KEY = getSecretKey();
  }
  return SECRET_KEY;
};

export function encryptToken(data: string): string {
  return CryptoJS.AES.encrypt(data, getSecretKeyCached()).toString();
}

export function decryptToken(encrypted: string): string {
  const bytes = CryptoJS.AES.decrypt(encrypted, getSecretKeyCached());
  return bytes.toString(CryptoJS.enc.Utf8);
}

export function generateToken(user: User): string {
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role,
    exp: Date.now() + 24 * 60 * 60 * 1000,
  };
  return encryptToken(JSON.stringify(payload));
}

export function verifyToken(token: string): { id: string; username: string; role: UserRole; exp: number } | null {
  try {
    const decrypted = decryptToken(token);
    const payload = JSON.parse(decrypted);
    if (payload.exp < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function getUserPermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function hashPassword(password: string, salt?: string): string {
  const usedSalt = salt || CryptoJS.lib.WordArray.random(16).toString();
  const hash = CryptoJS.PBKDF2(password, usedSalt, {
    keySize: 256 / 32,
    iterations: 10000
  });
  return `${usedSalt}:${hash.toString()}`;
}

export function verifyPassword(password: string, hashedPassword: string): boolean {
  if (!hashedPassword.includes(':')) {
    return CryptoJS.SHA256(password).toString() === hashedPassword;
  }
  const [salt, hash] = hashedPassword.split(':');
  const computedHash = CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32,
    iterations: 10000
  });
  return computedHash.toString() === hash;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

export function sanitizeInput(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<script\b[^>]*>/gi, '')
    .replace(/<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
}

export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validatePasswordStrength(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (!password || typeof password !== 'string') {
    return { isValid: false, errors: ['密码不能为空'] };
  }

  if (password.length < 8) {
    errors.push('密码长度至少为 8 个字符');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('密码应包含至少一个大写字母');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('密码应包含至少一个小写字母');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('密码应包含至少一个数字');
  }

  if (!/[!@#$%^&*()_+\-={}[\];':"\\|,.<>\/?`~]/.test(password)) {
    errors.push('密码应包含至少一个特殊字符');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

const CSRF_TOKEN_KEY = 'csrf_token';
const CSRF_HEADER_NAME = 'X-CSRF-Token';

export function generateCSRFToken(): string {
  const token = CryptoJS.lib.WordArray.random(32).toString();
  sessionStorage.setItem(CSRF_TOKEN_KEY, token);
  return token;
}

export function getCSRFToken(): string | null {
  return sessionStorage.getItem(CSRF_TOKEN_KEY);
}

export function validateCSRFToken(token: string): boolean {
  const storedToken = getCSRFToken();
  if (!storedToken || !token) return false;
  return CryptoJS.SHA256(storedToken).toString() === CryptoJS.SHA256(token).toString();
}

export function clearCSRFToken(): void {
  sessionStorage.removeItem(CSRF_TOKEN_KEY);
}

export function getCSRFHeader(): { name: string; value: string } | null {
  const token = getCSRFToken();
  if (!token) return null;
  return { name: CSRF_HEADER_NAME, value: token };
}

export function initCSRFForRequest(): string {
  let token = getCSRFToken();
  if (!token) {
    token = generateCSRFToken();
  }
  return token;
}
