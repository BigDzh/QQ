// Security utilities for XSS prevention, CSRF protection, and data validation
import React from 'react';

/**
 * Sanitize HTML to prevent XSS attacks
 */
export function sanitizeHTML(str: string): string {
  if (!str) return '';
  
  return str
    // Remove script tags and content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove event handlers (onclick, onerror, etc.)
    .replace(/\s*on\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\s*on\w+\s*=\s*'[^']*'/gi, '')
    // Remove javascript: protocol
    .replace(/javascript:/gi, '')
    // Remove vbscript: protocol
    .replace(/vbscript:/gi, '')
    // Remove data: URLs that could execute scripts
    .replace(/data:\s*text\/html/gi, '')
    // Remove expression() (IE)
    .replace(/expression\s*\(([^)]*)\)/gi, '')
    // Remove url() with javascript
    .replace(/url\s*\(\s*['"]?\s*javascript:[^'"]*['"]?\s*\)/gi, 'url()')
    // Remove iframe/object/embed tags
    .replace(/<(iframe|object|embed|applet|form)[^>]*>[\s\S]*?<\/\1>/gi, '')
    // Remove meta refresh redirects
    .replace(/<meta[^>]+http-equiv=["']?refresh["']?[^>]*>/gi, '')
    // Escape remaining HTML entities
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&#34;')
    .replace(/'/g, '&#39;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Escape string for safe insertion into HTML attributes
 */
export function escapeAttribute(str: string): string {
  if (!str) return '';
  
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Escape string for safe insertion into JavaScript context
 */
export function escapeJS(str: string): string {
  if (!str) return '';
  
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

/**
 * Validate and sanitize URL to prevent XSS via javascript: protocol
 */
export function sanitizeURL(url: string): string | null {
  if (!url) return null;
  
  const trimmed = url.trim().toLowerCase();
  
  // Block dangerous protocols
  const dangerousProtocols = [
    'javascript:',
    'vbscript:',
    'data:text/html',
    'data:application/javascript',
  ];
  
  for (const proto of dangerousProtocols) {
    if (trimmed.startsWith(proto)) {
      return null;
    }
  }
  
  // Only allow http:, https:, mailto:, tel: protocols
  const allowedProtocols = ['http://', 'https://', 'mailto:', 'tel:', '/', '#', './', '../'];
  const hasAllowedProtocol = allowedProtocols.some(p => trimmed.startsWith(p));
  
  if (!hasAllowedProtocol && !trimmed.startsWith('/')) {
    // If no protocol, assume it's a relative URL or path
    return url;
  }
  
  try {
    new URL(url);
    return url;
  } catch {
    return null;
  }
}

/**
 * Generate CSRF token
 */
export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate CSRF token
 */
export function validateCSRFToken(token: string, sessionToken: string): boolean {
  if (!token || !sessionToken) return false;
  
  // Use timing-safe comparison to prevent timing attacks
  if (token.length !== sessionToken.length) return false;
  
  let result = 0;
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ sessionToken.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Data validation utilities
 */
interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
  message?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: Array<{ field: string; message: string }>;
  sanitized: Record<string, any>;
}

/**
 * Validate data against rules
 */
export function validateData(
  data: Record<string, any>,
  rules: Record<string, ValidationRule>
): ValidationResult {
  const errors: Array<{ field: string; message: string }> = [];
  const sanitized: Record<string, any> = {};

  for (const [field, value] of Object.entries(data)) {
    const rule = rules[field];
    
    // Apply sanitization based on field name/type
    sanitized[field] = sanitizeValue(value, field);

    // Skip validation if no rule defined
    if (!rule) continue;

    // Required check
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push({
        field,
        message: rule.message || `${field} is required`,
      });
      continue;
    }

    // Skip further validation if empty and not required
    if ((value === undefined || value === null || value === '') && !rule.required) {
      continue;
    }

    // Min length check
    if (rule.minLength !== undefined && String(value).length < rule.minLength) {
      errors.push({
        field,
        message: rule.message || `${field} must be at least ${rule.minLength} characters long`,
      });
    }

    // Max length check
    if (rule.maxLength !== undefined && String(value).length > rule.maxLength) {
      errors.push({
        field,
        message: rule.message || `${field} must be no more than ${rule.maxLength} characters long`,
      });
    }

    // Pattern check
    if (rule.pattern && !rule.pattern.test(String(value))) {
      errors.push({
        field,
        message: rule.message || `${field} format is invalid`,
      });
    }

    // Custom validation
    if (rule.custom) {
      const result = rule.custom(sanitized[field]);
      if (result !== true) {
        errors.push({
          field,
          message: typeof result === 'string' ? result : (rule.message || `${field} validation failed`),
        });
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized,
  };
}

/**
 * Auto-sanitize value based on field type
 */
function sanitizeValue(value: any, fieldName: string): any {
  if (value === null || value === undefined) return value;

  // If it looks like HTML, sanitize it
  if (typeof value === 'string' && /<[a-z][^>]*>/i.test(value)) {
    return sanitizeHTML(value);
  }

  // If field name suggests it's HTML content
  if (/html|content|description|body/i.test(fieldName)) {
    return typeof value === 'string' ? sanitizeHTML(value) : value;
  }

  // If field name suggests it's a URL
  if (/url|link|href|src/i.test(fieldName)) {
    return typeof value === 'string' ? sanitizeURL(value) : value;
  }

  return value;
}

/**
 * Predefined validation rules for common use cases
 */
export const ValidationRules = {
  email: {
    required: true as const,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address',
  } as ValidationRule,

  password: {
    required: true as const,
    minLength: 8,
    maxLength: 128,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    message: 'Password must contain at least one lowercase letter, one uppercase letter, and one number',
  } as ValidationRule,

  username: {
    required: true as const,
    minLength: 3,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9_]+$/,
    message: 'Username can only contain letters, numbers, and underscores',
  } as ValidationRule,

  phone: {
    pattern: /^[\d\s\-+]{7,15}$/,
    message: 'Please enter a valid phone number',
  } as ValidationRule,

  url: {
    pattern: /^https?:\/\/.+/,
    message: 'Please enter a valid URL starting with http:// or https://',
  } as ValidationRule,

  id: {
    pattern: /^[a-zA-Z0-9_-]+$/,
    message: 'ID can only contain letters, numbers, hyphens, and underscores',
  } as ValidationRule,

  projectName: {
    required: true as const,
    minLength: 2,
    maxLength: 100,
    message: 'Project name must be between 2 and 100 characters',
  } as ValidationRule,

  nonEmptyString: {
    required: true as const,
    minLength: 1,
    maxLength: 1000,
    message: 'This field cannot be empty',
  } as ValidationRule,

  positiveNumber: {
    custom: (value: any) => {
      const num = Number(value);
      return !isNaN(num) && num > 0 || 'Must be a positive number';
    },
  } as ValidationRule,

  date: {
    custom: (value: any) => {
      const date = new Date(value);
      return !isNaN(date.getTime()) || 'Please enter a valid date';
    },
  } as ValidationRule,
};

/**
 * Content Security Policy helper
 */
export class CSPHelper {
  private static nonce: string | null = null;

  static getNonce(): string {
    if (!CSPHelper.nonce) {
      CSPHelper.nonce = generateCSRFToken();
    }
    return CSPHelper.nonce;
  }

  static resetNonce(): void {
    CSPHelper.nonce = null;
  }

  static getScriptTag(nonce?: string): string {
    const n = nonce || CSPHelper.getNonce();
    return `<script nonce="${n}">`;
  }

  static getStyleTag(nonce?: string): string {
    const n = nonce || CSPHelper.getNonce();
    return `<style nonce="${n}">`;
  }
}

/**
 * Rate limiter for API protection against brute force attacks
 */
class RateLimiter {
  private attempts: Map<string, { count: number; lastAttempt: number }> = new Map();

  constructor(
    private maxAttempts: number = 5,
    private windowMs: number = 60000 // 1 minute
  ) {}

  check(key: string): { allowed: boolean; remainingAttempts: number; retryAfterMs: number } {
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record) {
      this.attempts.set(key, { count: 1, lastAttempt: now });
      return { allowed: true, remainingAttempts: this.maxAttempts - 1, retryAfterMs: 0 };
    }

    // Reset if window has passed
    if (now - record.lastAttempt > this.windowMs) {
      this.attempts.set(key, { count: 1, lastAttempt: now });
      return { allowed: true, remainingAttempts: this.maxAttempts - 1, retryAfterMs: 0 };
    }

    // Check if max attempts exceeded
    if (record.count >= this.maxAttempts) {
      const retryAfterMs = this.windowMs - (now - record.lastAttempt);
      return { allowed: false, remainingAttempts: 0, retryAfterMs };
    }

    // Increment counter
    record.count++;
    record.lastAttempt = now;
    this.attempts.set(key, record);

    return {
      allowed: true,
      remainingAttempts: this.maxAttempts - record.count,
      retryAfterMs: 0,
    };
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }

  clearAll(): void {
    this.attempts.clear();
  }
}

export const rateLimiter = new RateLimiter();

/**
 * Input guard for React forms - HOC wrapper
 */
export function withInputSanitization<T extends object>(WrappedComponent: React.ComponentType<T>) {
  const WithSanitization: React.FC<T> = (props) => {
    const sanitizedProps = { ...props } as Record<string, unknown>;

    // Sanitize all string props
    for (const [key, value] of Object.entries(props)) {
      if (typeof value === 'string') {
        sanitizedProps[key] = sanitizeHTML(value);
      }
    }

    return React.createElement(WrappedComponent, sanitizedProps as unknown as T);
  };

  WithSanitization.displayName = `withInputSanitization(${WrappedComponent.displayName || WrappedComponent.name})`;
  return WithSanitization;
}
