import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validatePhone,
  validateProjectNumber,
  validateURL,
  validateChinese,
  validateAlphanumeric,
  validateFileName,
  validateFileSize,
  validateFileType,
  validateJSON,
  validateNumberRange,
  validateLengthRange,
  validateRequired,
  sanitizeInput,
  containsInjectionPatterns,
  escapeHtml,
  isSafeInput,
} from '../services/validationService';

describe('validationService', () => {
  describe('validateEmail', () => {
    it('should return null for valid email', () => {
      expect(validateEmail('test@example.com')).toBeNull();
      expect(validateEmail('user.name@domain.co.uk')).toBeNull();
    });

    it('should return error message for invalid email', () => {
      expect(validateEmail('invalid')).toBe('邮箱格式不正确');
      expect(validateEmail('test@')).toBe('邮箱格式不正确');
      expect(validateEmail('@domain.com')).toBe('邮箱格式不正确');
    });

    it('should return null for empty email', () => {
      expect(validateEmail('')).toBeNull();
    });
  });

  describe('validatePhone', () => {
    it('should return null for valid Chinese phone numbers', () => {
      expect(validatePhone('13812345678')).toBeNull();
      expect(validatePhone('19912345678')).toBeNull();
    });

    it('should return error message for invalid phone numbers', () => {
      expect(validatePhone('12345')).toBe('手机号格式不正确');
      expect(validatePhone('abc12345678')).toBe('手机号格式不正确');
    });

    it('should return null for empty phone', () => {
      expect(validatePhone('')).toBeNull();
    });
  });

  describe('validateProjectNumber', () => {
    it('should return null for valid project numbers', () => {
      expect(validateProjectNumber('ABC-123')).toBeNull();
      expect(validateProjectNumber('PROJECT-001')).toBeNull();
    });

    it('should return error message for invalid project numbers', () => {
      expect(validateProjectNumber('abc123')).toBe('项目编号只能包含大写字母、数字和连字符');
      expect(validateProjectNumber('abc-123')).toBe('项目编号只能包含大写字母、数字和连字符');
    });
  });

  describe('validateURL', () => {
    it('should return null for valid URLs', () => {
      expect(validateURL('https://example.com')).toBeNull();
      expect(validateURL('http://test.org/path')).toBeNull();
    });

    it('should return error message for invalid URLs', () => {
      expect(validateURL('not a url')).toBe('URL 格式不正确');
    });
  });

  describe('validateChinese', () => {
    it('should return null for Chinese text', () => {
      expect(validateChinese('中文文本')).toBeNull();
    });

    it('should return error for non-Chinese text', () => {
      expect(validateChinese('abc123')).toBe('只允许输入中文字符');
    });
  });

  describe('validateAlphanumeric', () => {
    it('should return null for alphanumeric text', () => {
      expect(validateAlphanumeric('abc123')).toBeNull();
      expect(validateAlphanumeric('ABC')).toBeNull();
    });

    it('should return error for non-alphanumeric text', () => {
      expect(validateAlphanumeric('abc-123')).toBe('只允许输入字母和数字');
    });
  });

  describe('validateFileName', () => {
    it('should return null for valid file names', () => {
      expect(validateFileName('document.pdf')).toBeNull();
      expect(validateFileName('my_file.txt')).toBeNull();
    });

    it('should return error for empty file name', () => {
      expect(validateFileName('')).toBe('文件名不能为空');
    });

    it('should return error for file names with invalid characters', () => {
      expect(validateFileName('file<name>.txt')).toBe('文件名包含非法字符');
      expect(validateFileName('file:name.txt')).toBe('文件名包含非法字符');
    });

    it('should return error for file names that are too long', () => {
      const longName = 'a'.repeat(256);
      expect(validateFileName(longName)).toBe('文件名过长');
    });
  });

  describe('validateFileSize', () => {
    it('should return null for valid file sizes', () => {
      expect(validateFileSize(1024 * 1024)).toBeNull();
      expect(validateFileSize(100 * 1024 * 1024)).toBeNull();
    });

    it('should return error for invalid file sizes', () => {
      expect(validateFileSize(0)).toBe('文件大小无效');
      expect(validateFileSize(-1)).toBe('文件大小无效');
    });

    it('should return error for files exceeding max size', () => {
      const maxSize = 100 * 1024 * 1024;
      expect(validateFileSize(maxSize + 1, maxSize)).toBe('文件大小不能超过 100MB');
    });
  });

  describe('validateFileType', () => {
    it('should return null for valid file types', () => {
      expect(validateFileType('document.pdf', ['pdf', 'doc'])).toBeNull();
      expect(validateFileType('image.PNG', ['png', 'jpg'])).toBeNull();
    });

    it('should return error for invalid file types', () => {
      expect(validateFileType('script.exe', ['pdf', 'doc'])).toBe('不支持的文件类型。允许的类型: pdf, doc');
    });

    it('should return error for empty file name', () => {
      expect(validateFileType('', ['pdf'])).toBe('文件名不能为空');
    });
  });

  describe('validateJSON', () => {
    it('should return null for valid JSON', () => {
      expect(validateJSON('{"key": "value"}')).toBeNull();
      expect(validateJSON('[]')).toBeNull();
    });

    it('should return error for invalid JSON', () => {
      expect(validateJSON('{invalid}')).toBe('JSON 格式不正确');
      expect(validateJSON('not json')).toBe('JSON 格式不正确');
    });
  });

  describe('validateNumberRange', () => {
    it('should return null for values within range', () => {
      expect(validateNumberRange(5, 0, 10)).toBeNull();
      expect(validateNumberRange(0, 0, 10)).toBeNull();
      expect(validateNumberRange(10, 0, 10)).toBeNull();
    });

    it('should return error for values outside range', () => {
      expect(validateNumberRange(-1, 0, 10)).toBe('数字必须在 0 和 10 之间');
      expect(validateNumberRange(11, 0, 10)).toBe('数字必须在 0 和 10 之间');
    });

    it('should return error for NaN', () => {
      expect(validateNumberRange(NaN, 0, 10)).toBe('无效的数字');
    });
  });

  describe('validateLengthRange', () => {
    it('should return null for values within range', () => {
      expect(validateLengthRange('hello', 3, 10)).toBeNull();
    });

    it('should return error for values outside range', () => {
      expect(validateLengthRange('ab', 3, 10)).toBe('长度不能少于 3 个字符');
      expect(validateLengthRange('a'.repeat(11), 3, 10)).toBe('长度不能超过 10 个字符');
    });
  });

  describe('validateRequired', () => {
    it('should return null for valid values', () => {
      expect(validateRequired('value', '字段')).toBeNull();
      expect(validateRequired(123, '字段')).toBeNull();
      expect(validateRequired(['item'], '字段')).toBeNull();
    });

    it('should return error for empty values', () => {
      expect(validateRequired(null, '字段')).toBe('字段不能为空');
      expect(validateRequired(undefined, '字段')).toBe('字段不能为空');
      expect(validateRequired('', '字段')).toBe('字段不能为空');
      expect(validateRequired('  ', '字段')).toBe('字段不能为空');
      expect(validateRequired([], '字段')).toBe('字段不能为空');
    });
  });

  describe('sanitizeInput', () => {
    it('should remove dangerous patterns', () => {
      const result1 = sanitizeInput('<script>alert(1)</script>');
      expect(result1).toBeDefined();
      expect(result1).not.toContain('<script>');
    });

    it('should remove javascript: protocol', () => {
      const result = sanitizeInput('javascript:void(0)');
      expect(result).not.toContain('javascript:');
    });

    it('should escape HTML entities', () => {
      const result = sanitizeInput('&<>');
      expect(result).toContain('&amp;');
    });

    it('should return empty string for non-string input', () => {
      expect(sanitizeInput(null as any)).toBe('');
      expect(sanitizeInput(undefined as any)).toBe('');
    });
  });

  describe('containsInjectionPatterns', () => {
    it('should detect SQL injection patterns', () => {
      expect(containsInjectionPatterns("'; DROP TABLE users; --")).toBe(true);
      expect(containsInjectionPatterns('SELECT * FROM users')).toBe(true);
    });

    it('should detect XSS patterns', () => {
      expect(containsInjectionPatterns('<script>alert(1)</script>')).toBe(true);
      expect(containsInjectionPatterns('javascript:void(0)')).toBe(true);
    });

    it('should return false for safe input', () => {
      expect(containsInjectionPatterns('Hello World')).toBe(false);
      expect(containsInjectionPatterns('正常的中文文本')).toBe(false);
    });
  });

  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      expect(escapeHtml('<>&"\'')).toBe('&lt;&gt;&amp;&quot;&#039;');
    });
  });

  describe('isSafeInput', () => {
    it('should return true for safe input', () => {
      expect(isSafeInput('Hello World')).toBe(true);
      expect(isSafeInput('正常中文')).toBe(true);
    });

    it('should return false for unsafe input', () => {
      expect(isSafeInput('<script>')).toBe(false);
      expect(isSafeInput('SELECT * FROM')).toBe(false);
    });
  });
});