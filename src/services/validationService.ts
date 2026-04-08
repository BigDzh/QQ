export interface ValidationRule {
  required?: boolean;
  pattern?: RegExp;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  custom?: (value: unknown) => string | null;
  sanitize?: boolean;
  noInjection?: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^1[3-9]\d{9}$/;
const PROJECT_NUMBER_PATTERN = /^[A-Z0-9-]+$/;
const URL_PATTERN = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
const CHINESE_PATTERN = /^[\u4e00-\u9fa5]+$/;
const ALPHANUMERIC_PATTERN = /^[a-zA-Z0-9]+$/;

const DANGEROUS_PATTERNS = [
  /<script/i,
  /javascript:/i,
  /on\w+=/i,
  /<iframe/i,
  /<embed/i,
  /<object/i,
  /<link/i,
  /<meta/i,
  /expression\s*\(/i,
  /url\s*\(/i,
  /import\s+/i,
  /include\s+/i,
  /require\s+/i,
  /\.\.\//i,
  /union\s+select/i,
  /union\s+all/i,
  /select\s+from/i,
  /insert\s+into/i,
  /delete\s+from/i,
  /drop\s+table/i,
  /update\s+.+\s+set/i,
  /exec\s*\(/i,
  /execute\s*\(/i,
  /eval\s*\(/i,
  /'\s+or\s+'/i,
  /'\s+and\s+'/i,
  /--\s*$/,
  /\/\*[\s\S]*?\*\//,
];

const SQL_KEYWORDS = [
  'select', 'insert', 'update', 'delete', 'drop', 'create', 'alter', 'exec',
  'execute', 'union', 'where', 'from', 'table', 'database', 'schema',
];

const DANGEROUS_CHARS = /[<>'"();\\]/;

export function validateField(value: unknown, rules: ValidationRule): string | null {
  if (rules.required) {
    if (value === null || value === undefined || value === '' || (typeof value === 'string' && value.trim() === '')) {
      return '此字段为必填项';
    }
  }

  if (value === null || value === undefined || value === '') {
    return null;
  }

  const strValue = String(value);

  if (rules.minLength && strValue.length < rules.minLength) {
    return `最少需要 ${rules.minLength} 个字符`;
  }

  if (rules.maxLength && strValue.length > rules.maxLength) {
    return `最多允许 ${rules.maxLength} 个字符`;
  }

  if (rules.min !== undefined && Number(value) < rules.min) {
    return `最小值为 ${rules.min}`;
  }

  if (rules.max !== undefined && Number(value) > rules.max) {
    return `最大值为 ${rules.max}`;
  }

  if (rules.pattern && !rules.pattern.test(strValue)) {
    return '格式不正确';
  }

  if (rules.noInjection && containsInjectionPatterns(strValue)) {
    return '输入包含非法字符或模式';
  }

  if (rules.custom) {
    const error = rules.custom(value);
    if (error) return error;
  }

  return null;
}

export function validateEmail(email: string): string | null {
  if (!email) return null;
  if (!EMAIL_PATTERN.test(email)) {
    return '邮箱格式不正确';
  }
  return null;
}

export function validatePhone(phone: string): string | null {
  if (!phone) return null;
  if (!PHONE_PATTERN.test(phone)) {
    return '手机号格式不正确';
  }
  return null;
}

export function validateProjectNumber(number: string): string | null {
  if (!number) return null;
  if (!PROJECT_NUMBER_PATTERN.test(number)) {
    return '项目编号只能包含大写字母、数字和连字符';
  }
  return null;
}

export function validateURL(url: string): string | null {
  if (!url) return null;
  if (!URL_PATTERN.test(url)) {
    return 'URL 格式不正确';
  }
  return null;
}

export function validateChinese(text: string): string | null {
  if (!text) return null;
  if (!CHINESE_PATTERN.test(text)) {
    return '只允许输入中文字符';
  }
  return null;
}

export function validateAlphanumeric(text: string): string | null {
  if (!text) return null;
  if (!ALPHANUMERIC_PATTERN.test(text)) {
    return '只允许输入字母和数字';
  }
  return null;
}

export function validateForm(
  data: Record<string, unknown>,
  rules: Record<string, ValidationRule>
): ValidationResult {
  const errors: ValidationError[] = [];

  for (const [field, fieldRules] of Object.entries(rules)) {
    const error = validateField(data[field], fieldRules);
    if (error) {
      errors.push({ field, message: error, code: 'VALIDATION_ERROR' });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function checkDuplicate<T>(
  items: T[],
  newItem: T,
  key: keyof T
): boolean {
  return items.some((item) => item[key] === newItem[key]);
}

export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';

  let sanitized = input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();

  return sanitized;
}

export function containsInjectionPatterns(value: string): boolean {
  const lowerValue = value.toLowerCase();

  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(value)) {
      return true;
    }
  }

  if (DANGEROUS_CHARS.test(value)) {
    return true;
  }

  const words = lowerValue.split(/\s+/);
  for (const word of words) {
    if (SQL_KEYWORDS.includes(word)) {
      return true;
    }
  }

  return false;
}

export function validateAgainstInjection(value: string): ValidationResult {
  const errors: ValidationError[] = [];

  if (containsInjectionPatterns(value)) {
    errors.push({
      field: 'input',
      message: '输入包含潜在的恶意内容',
      code: 'INJECTION_DETECTED',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateFileName(fileName: string): string | null {
  if (!fileName) return '文件名不能为空';

  // eslint-disable-next-line no-control-regex
  const invalidChars = /[<>:"|?*\x00-\x1f]/;
  if (invalidChars.test(fileName)) {
    return '文件名包含非法字符';
  }

  if (fileName.length > 255) {
    return '文件名过长';
  }

  return null;
}

export function validateFileSize(size: number, maxSize: number = 100 * 1024 * 1024): string | null {
  if (size <= 0) {
    return '文件大小无效';
  }

  if (size > maxSize) {
    const maxSizeMB = Math.round(maxSize / 1024 / 1024);
    return `文件大小不能超过 ${maxSizeMB}MB`;
  }

  return null;
}

export function validateFileType(fileName: string, allowedTypes: string[]): string | null {
  if (!fileName) return '文件名不能为空';

  const extension = fileName.split('.').pop()?.toLowerCase();
  if (!extension) {
    return '无法识别文件类型';
  }

  if (!allowedTypes.includes(extension)) {
    return `不支持的文件类型。允许的类型: ${allowedTypes.join(', ')}`;
  }

  return null;
}

export function validateJSON(jsonString: string): string | null {
  try {
    JSON.parse(jsonString);
    return null;
  } catch {
    return 'JSON 格式不正确';
  }
}

export function validateNumberRange(
  value: number,
  min: number,
  max: number
): string | null {
  if (isNaN(value)) {
    return '无效的数字';
  }

  if (value < min || value > max) {
    return `数字必须在 ${min} 和 ${max} 之间`;
  }

  return null;
}

export function validateLengthRange(
  value: string,
  minLength: number,
  maxLength: number
): string | null {
  if (value.length < minLength) {
    return `长度不能少于 ${minLength} 个字符`;
  }

  if (value.length > maxLength) {
    return `长度不能超过 ${maxLength} 个字符`;
  }

  return null;
}

export function validateRequired(value: unknown, fieldName: string = '此字段'): string | null {
  if (value === null || value === undefined) {
    return `${fieldName}不能为空`;
  }

  if (typeof value === 'string' && value.trim() === '') {
    return `${fieldName}不能为空`;
  }

  if (Array.isArray(value) && value.length === 0) {
    return `${fieldName}不能为空`;
  }

  return null;
}

export function isSafeInput(input: string): boolean {
  return !containsInjectionPatterns(input);
}

export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
