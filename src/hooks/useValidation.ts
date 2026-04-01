import { useState, useCallback, useMemo } from 'react';
import {
  validateField,
  validateForm,
  validateEmail,
  validatePhone,
  validateProjectNumber,
  validateURL,
  validateChinese,
  validateAlphanumeric,
  validateRequired,
  validateFileName,
  validateFileSize,
  validateFileType,
  validateJSON,
  validateNumberRange,
  validateLengthRange,
  type ValidationRule,
  type ValidationResult,
  type ValidationError,
} from '../services/validationService';

interface FieldConfig {
  [fieldName: string]: ValidationRule;
}

interface UseValidationOptions {
  rules?: FieldConfig;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

export function useValidation<T extends Record<string, unknown>>(
  initialData: T,
  options: UseValidationOptions = {}
) {
  const { rules = {}, validateOnChange = false, validateOnBlur = true } = options;

  const [values, setValues] = useState<T>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isValidating, setIsValidating] = useState(false);

  const validateFieldValue = useCallback(
    (fieldName: string, value: unknown): string | null => {
      const rule = rules[fieldName];
      if (!rule) return null;
      return validateField(value, rule);
    },
    [rules]
  );

  const validateAll = useCallback((): boolean => {
    setIsValidating(true);

    const result = validateForm(values, rules as Record<string, ValidationRule>);
    const newErrors: Record<string, string> = {};

    result.errors.forEach((error: ValidationError) => {
      newErrors[error.field] = error.message;
    });

    setErrors(newErrors);
    setIsValidating(false);

    return result.valid;
  }, [values, rules]);

  const validateFieldAndSetError = useCallback(
    (fieldName: string, value: unknown): boolean => {
      const error = validateFieldValue(fieldName, value);
      setErrors((prev) => {
        const next = { ...prev };
        if (error) {
          next[fieldName] = error;
        } else {
          delete next[fieldName];
        }
        return next;
      });
      return !error;
    },
    [validateFieldValue]
  );

  const handleChange = useCallback(
    (fieldName: string, value: unknown) => {
      setValues((prev) => ({ ...prev, [fieldName]: value }));

      if (validateOnChange) {
        validateFieldAndSetError(fieldName, value);
      }
    },
    [validateOnChange, validateFieldAndSetError]
  );

  const handleBlur = useCallback(
    (fieldName: string) => {
      setTouched((prev) => ({ ...prev, [fieldName]: true }));

      if (validateOnBlur) {
        const value = values[fieldName];
        validateFieldAndSetError(fieldName, value);
      }
    },
    [validateOnBlur, values, validateFieldAndSetError]
  );

  const setFieldValue = useCallback(
    (fieldName: string, value: unknown) => {
      setValues((prev) => ({ ...prev, [fieldName]: value }));
    },
    []
  );

  const setFieldError = useCallback((fieldName: string, error: string | null) => {
    setErrors((prev) => {
      const next = { ...prev };
      if (error) {
        next[fieldName] = error;
      } else {
        delete next[fieldName];
      }
      return next;
    });
  }, []);

  const clearFieldError = useCallback((fieldName: string) => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  const clearAll = useCallback(() => {
    setValues(initialData);
    setErrors({});
    setTouched({});
  }, [initialData]);

  const reset = useCallback(
    (newData?: T) => {
      if (newData) {
        setValues(newData);
      }
      setErrors({});
      setTouched({});
    },
    []
  );

  const getFieldError = useCallback(
    (fieldName: string): string | undefined => {
      return touched[fieldName] ? errors[fieldName] : undefined;
    },
    [touched, errors]
  );

  const isFieldValid = useCallback(
    (fieldName: string): boolean => {
      return touched[fieldName] && !errors[fieldName];
    },
    [touched, errors]
  );

  const isFormValid = useMemo(() => {
    return Object.keys(errors).length === 0 && Object.keys(touched).length > 0;
  }, [errors, touched]);

  const hasErrors = useMemo(() => {
    return Object.keys(errors).length > 0;
  }, [errors]);

  const touchedFields = useMemo(() => {
    return Object.keys(touched).filter((key) => touched[key]);
  }, [touched]);

  const validations = {
    validateEmail,
    validatePhone,
    validateProjectNumber,
    validateURL,
    validateChinese,
    validateAlphanumeric,
    validateRequired,
    validateFileName,
    validateFileSize,
    validateFileType,
    validateJSON,
    validateNumberRange,
    validateLengthRange,
  };

  return {
    values,
    errors,
    touched,
    isValidating,
    isFormValid,
    hasErrors,
    touchedFields,
    handleChange,
    handleBlur,
    setFieldValue,
    setFieldError,
    clearFieldError,
    clearAllErrors,
    clearAll,
    reset,
    validateAll,
    validateField: validateFieldAndSetError,
    getFieldError,
    isFieldValid,
    validations,
  };
}

export type { FieldConfig, UseValidationOptions };

export default useValidation;