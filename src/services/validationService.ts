export interface ValidationRule {
  required?: boolean;
  pattern?: RegExp;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  custom?: (value: unknown) => string | null;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^1[3-9]\d{9}$/;
const PROJECT_NUMBER_PATTERN = /^[A-Z0-9-]+$/;

export function validateField(value: unknown, rules: ValidationRule): string | null {
  if (rules.required) {
    if (value === null || value === undefined || value === '') {
      return '此字段为必填项';
    }
  }

  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (rules.minLength && String(value).length < rules.minLength) {
    return `最少需要 ${rules.minLength} 个字符`;
  }

  if (rules.maxLength && String(value).length > rules.maxLength) {
    return `最多允许 ${rules.maxLength} 个字符`;
  }

  if (rules.min !== undefined && Number(value) < rules.min) {
    return `最小值为 ${rules.min}`;
  }

  if (rules.max !== undefined && Number(value) > rules.max) {
    return `最大值为 ${rules.max}`;
  }

  if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
    return '格式不正确';
  }

  if (rules.custom) {
    return rules.custom(value);
  }

  return null;
}

export function validateEmail(email: string): string | null {
  if (!email) return null;
  return EMAIL_PATTERN.test(email) ? null : '邮箱格式不正确';
}

export function validatePhone(phone: string): string | null {
  if (!phone) return null;
  return PHONE_PATTERN.test(phone) ? null : '手机号格式不正确';
}

export function validateProjectNumber(number: string): string | null {
  if (!number) return null;
  return PROJECT_NUMBER_PATTERN.test(number) ? null : '项目编号只能包含大写字母、数字和连字符';
}

export function validateForm(
  data: Record<string, unknown>,
  rules: Record<string, ValidationRule>
): ValidationResult {
  const errors: ValidationError[] = [];

  Object.keys(rules).forEach((field) => {
    const error = validateField(data[field], rules[field]);
    if (error) {
      errors.push({ field, message: error });
    }
  });

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
  return input.trim().replace(/[<>]/g, '');
}
