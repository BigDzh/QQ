import React, { useState, useCallback, useMemo } from 'react';
import { X, Upload, FileSpreadsheet, Check, AlertCircle, Download, ChevronLeft, Loader2, Eye, EyeOff } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useThemeStyles } from '../../hooks/useThemeStyles';
import { useToast } from '../Toast';
import { parseExcelFile, generateTemplate, type ImportRow } from '../../services/importService';

export interface ValidationError {
  row: number;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  rowStatuses: Map<number, 'valid' | 'error' | 'warning'>;
}

export interface ImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: ImportRow[], selectedRows: number[]) => void;
  requiredFields?: string[];
  templateHeaders?: string[];
  importTitle?: string;
  maxFileSize?: number;
  customValidators?: Array<{
    field: string;
    validate: (value: unknown, row: ImportRow) => string | null;
  }>;
}

type WizardStep = 'upload' | 'preview' | 'complete';

export function ImportWizard({
  isOpen,
  onClose,
  onImport,
  requiredFields = [],
  templateHeaders = [],
  importTitle = '导入数据',
  maxFileSize = 10 * 1024 * 1024,
  customValidators = [],
}: ImportWizardProps) {
  const { isCyberpunk } = useTheme();
  const t = useThemeStyles();
  const { showToast } = useToast();

  const [step, setStep] = useState<WizardStep>('upload');
  const [fileName, setFileName] = useState<string>('');
  const [importData, setImportData] = useState<ImportRow[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [errors, setErrors] = useState<string[]>([]);
  const [, setIsLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showErrorsOnly, setShowErrorsOnly] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  const validateData = useCallback((data: ImportRow[]): ValidationResult => {
    const validationErrors: ValidationError[] = [];
    const validationWarnings: ValidationError[] = [];
    const rowStatuses = new Map<number, 'valid' | 'error' | 'warning'>();

    data.forEach((row, index) => {
      let hasError = false;
      let hasWarning = false;

      requiredFields.forEach((field) => {
        if (!row[field] && row[field] !== 0) {
          validationErrors.push({
            row: index,
            field,
            message: `缺少必填字段: ${field}`,
            severity: 'error',
          });
          hasError = true;
        }
      });

      customValidators.forEach((validator) => {
        const value = row[validator.field];
        const errorMessage = validator.validate(value, row);
        if (errorMessage) {
          validationWarnings.push({
            row: index,
            field: validator.field,
            message: errorMessage,
            severity: 'warning',
          });
          hasWarning = true;
        }
      });

      if (hasError) {
        rowStatuses.set(index, 'error');
      } else if (hasWarning) {
        rowStatuses.set(index, 'warning');
      } else {
        rowStatuses.set(index, 'valid');
      }
    });

    return {
      isValid: validationErrors.length === 0,
      errors: validationErrors,
      warnings: validationWarnings,
      rowStatuses,
    };
  }, [requiredFields, customValidators]);

  const filteredData = useMemo(() => {
    if (!validationResult) return importData;
    if (!showErrorsOnly) return importData;

    const errorRows = new Set<number>();
    validationResult.errors.forEach((e) => errorRows.add(e.row));
    validationResult.warnings.forEach((w) => errorRows.add(w.row));

    return importData.filter((_, index) => errorRows.has(index));
  }, [importData, validationResult, showErrorsOnly]);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      showToast('请上传 Excel 文件 (.xlsx, .xls)', 'error');
      return;
    }

    if (file.size > maxFileSize) {
      showToast(`文件大小超过限制 (最大 ${Math.round(maxFileSize / 1024 / 1024)}MB)`, 'error');
      return;
    }

    setIsLoading(true);
    setFileName(file.name);

    try {
      const result = await parseExcelFile(file);

      if (!result.success) {
        setErrors(result.errors);
        showToast('文件解析失败', 'error');
      } else if (result.data.length === 0) {
        setErrors(['导入数据不能为空']);
        showToast('导入数据不能为空', 'error');
      } else {
        setImportData(result.data);
        setSelectedRows(new Set(result.data.map((_, index) => index)));
        setErrors([]);
        setValidationResult(validateData(result.data));
        setStep('preview');
        showToast(`成功解析 ${result.totalRows} 条数据`, 'success');
      }
    } catch (error) {
      showToast('文件读取失败', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast, maxFileSize, validateData]);

  const handleDownloadTemplate = useCallback(() => {
    if (templateHeaders.length > 0) {
      generateTemplate(templateHeaders, '导入模板');
      showToast('模板下载成功', 'success');
    } else {
      const defaultHeaders = ['名称', '编号', '状态', '备注'];
      generateTemplate(defaultHeaders, '导入模板');
      showToast('默认模板下载成功', 'success');
    }
  }, [templateHeaders, showToast]);

  const toggleRow = useCallback((index: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const toggleAllRows = useCallback(() => {
    if (selectedRows.size === importData.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(importData.map((_, index) => index)));
    }
  }, [importData, selectedRows]);

  const handleImport = useCallback(() => {
    const selectedData = importData.filter((_, index) => selectedRows.has(index));
    setImportProgress(0);

    const totalSteps = selectedData.length;
    let currentStep = 0;

    const progressInterval = setInterval(() => {
      currentStep += Math.ceil(totalSteps / 10);
      if (currentStep >= totalSteps) {
        clearInterval(progressInterval);
        setImportProgress(100);
        onImport(selectedData, Array.from(selectedRows));
        showToast(`成功导入 ${selectedData.length} 条数据`, 'success');
        handleClose();
      } else {
        setImportProgress(Math.min(Math.round((currentStep / totalSteps) * 100), 99));
      }
    }, 50);
  }, [importData, selectedRows, onImport, showToast, handleClose]);

  const handleClose = useCallback(() => {
    setStep('upload');
    setFileName('');
    setImportData([]);
    setSelectedRows(new Set());
    setErrors([]);
    setValidationResult(null);
    setShowErrorsOnly(false);
    setImportProgress(0);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[var(--z-top-layer)]"
      onClick={handleClose}
    >
      <div
        className={`${t.card} border ${t.border} rounded-2xl w-[640px] max-h-[85vh] overflow-hidden flex flex-col shadow-xl backdrop-blur-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className={`p-2 ${isCyberpunk ? 'bg-cyan-500/10' : 'bg-blue-50 dark:bg-blue-900/30'} rounded-xl`}>
              <FileSpreadsheet className={isCyberpunk ? 'text-cyan-400' : 'text-blue-500'} size={20} />
            </div>
            <h2 className={`text-lg font-semibold ${t.text}`}>{importTitle}</h2>
          </div>
          <button
            onClick={handleClose}
            className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors ${
              isCyberpunk ? 'text-cyan-400' : 'text-gray-400'
            }`}
            aria-label="关闭"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {step === 'upload' && (
            <div className="space-y-6">
              <div
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
                  isCyberpunk
                    ? 'border-cyan-400/30 hover:border-cyan-400/50 bg-cyan-500/5'
                    : 'border-gray-300 hover:border-blue-400 bg-gray-50 dark:bg-white/5'
                }`}
              >
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload
                    size={40}
                    className={`mx-auto mb-4 ${
                      isCyberpunk ? 'text-cyan-400' : 'text-gray-400'
                    }`}
                  />
                  <p className={`text-sm ${t.text}`}>
                    点击或拖拽文件到此处上传
                  </p>
                  <p className={`text-xs mt-2 ${t.textSecondary}`}>
                    支持 .xlsx, .xls 格式
                  </p>
                </label>
              </div>

              {errors.length > 0 && (
                <div className={`p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800`}>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle size={16} className="text-red-500" />
                    <span className="text-sm font-medium text-red-600 dark:text-red-400">解析错误</span>
                  </div>
                  <ul className="text-xs text-red-600 dark:text-red-400 space-y-1">
                    {errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className={`p-4 rounded-xl ${isCyberpunk ? 'bg-white/5' : 'bg-gray-50 dark:bg-white/5'}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-sm font-medium ${t.text}`}>下载模板</span>
                  <button
                    onClick={handleDownloadTemplate}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isCyberpunk
                        ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
                        : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                    }`}
                  >
                    <Download size={16} />
                    下载Excel模板
                  </button>
                </div>
                <p className={`text-xs ${t.textSecondary}`}>
                  {templateHeaders.length > 0
                    ? `模板包含列: ${templateHeaders.join(', ')}`
                    : '使用默认模板列：名称, 编号, 状态, 备注'}
                </p>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet size={16} className={isCyberpunk ? 'text-cyan-400' : 'text-blue-500'} />
                  <span className={`text-sm font-medium ${t.text}`}>{fileName}</span>
                  <span className={`text-xs ${t.textSecondary}`}>
                    (共 {importData.length} 条)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {validationResult && validationResult.errors.length > 0 && (
                    <button
                      onClick={() => setShowErrorsOnly(!showErrorsOnly)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        showErrorsOnly
                          ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                      }`}
                    >
                      {showErrorsOnly ? <Eye size={14} /> : <EyeOff size={14} />}
                      {showErrorsOnly ? '显示全部' : `仅显示问题 (${validationResult.errors.length})`}
                    </button>
                  )}
                  <input
                    type="checkbox"
                    checked={selectedRows.size === importData.length}
                    ref={(el) => {
                      if (el) el.indeterminate = selectedRows.size > 0 && selectedRows.size < importData.length;
                    }}
                    onChange={toggleAllRows}
                    className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500 checkbox-interactive"
                  />
                  <span className={`text-xs ${t.textSecondary}`}>全选</span>
                </div>
              </div>

              {validationResult && validationResult.errors.length > 0 && !showErrorsOnly && (
                <div className={`p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800`}>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle size={14} className="text-red-500" />
                    <span className="text-xs font-medium text-red-600 dark:text-red-400">
                      发现 {validationResult.errors.length} 个错误
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                    {validationResult.errors.slice(0, 5).map((error, index) => (
                      <span key={index} className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded">
                        第{error.row + 1}行: {error.message}
                      </span>
                    ))}
                    {validationResult.errors.length > 5 && (
                      <span className="text-xs px-2 py-1 text-red-500">
                        ...还有 {validationResult.errors.length - 5} 个错误
                      </span>
                    )}
                  </div>
                </div>
              )}

              {validationResult && validationResult.warnings.length > 0 && !showErrorsOnly && (
                <div className={`p-3 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800`}>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle size={14} className="text-yellow-500" />
                    <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
                      发现 {validationResult.warnings.length} 个警告
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                    {validationResult.warnings.slice(0, 3).map((warning, index) => (
                      <span key={index} className="text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600 dark:text-yellow-400 rounded">
                        第{warning.row + 1}行: {warning.message}
                      </span>
                    ))}
                    {validationResult.warnings.length > 3 && (
                      <span className="text-xs px-2 py-1 text-yellow-500">
                        ...还有 {validationResult.warnings.length - 3} 个警告
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className={`rounded-xl border ${t.border} overflow-hidden max-h-[300px] overflow-y-auto`}>
                <table className="w-full text-sm">
                  <thead className={`${t.tableHeader}`}>
                    <tr>
                      <th className="w-12 px-4 py-3 text-left"></th>
                      <th className="w-8 px-2 py-3 text-left"></th>
                      {filteredData[0] &&
                        Object.keys(filteredData[0]).map((key) => (
                          <th key={key} className={`px-4 py-3 text-left font-medium ${t.text}`}>
                            {key}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {filteredData.map((row, index) => {
                      const originalIndex = importData.indexOf(row);
                      const rowStatus = validationResult?.rowStatuses.get(originalIndex);
                      return (
                        <tr
                          key={index}
                          className={`transition-colors ${
                            rowStatus === 'error'
                              ? 'bg-red-50/50 dark:bg-red-900/10'
                              : rowStatus === 'warning'
                                ? 'bg-yellow-50/50 dark:bg-yellow-900/10'
                                : isCyberpunk
                                  ? selectedRows.has(originalIndex)
                                    ? 'bg-cyan-500/10'
                                    : 'hover:bg-white/5'
                                  : selectedRows.has(originalIndex)
                                    ? 'bg-blue-50 dark:bg-blue-900/20'
                                    : 'hover:bg-gray-50 dark:hover:bg-white/5'
                          }`}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedRows.has(originalIndex)}
                              onChange={() => toggleRow(originalIndex)}
                              disabled={rowStatus === 'error'}
                              className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500 checkbox-interactive disabled:opacity-50"
                            />
                          </td>
                          <td className="px-2 py-3">
                            {rowStatus === 'error' && (
                              <AlertCircle size={14} className="text-red-500" />
                            )}
                            {rowStatus === 'warning' && (
                              <AlertCircle size={14} className="text-yellow-500" />
                            )}
                            {rowStatus === 'valid' && (
                              <Check size={14} className="text-green-500" />
                            )}
                          </td>
                          {Object.values(row).map((value, colIndex) => (
                            <td key={colIndex} className={`px-4 py-3 ${t.textSecondary}`}>
                              {String(value ?? '-')}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className={t.textSecondary}>
                  已选择 <span className={`font-medium ${t.text}`}>{selectedRows.size}</span> 条数据
                </span>
                {requiredFields.length > 0 && (
                  <span className={t.textSecondary}>
                    必填字段: {requiredFields.join(', ')}
                  </span>
                )}
              </div>
            </div>
          )}

          {step === 'complete' && (
            <div className="text-center py-8">
              <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                isCyberpunk ? 'bg-cyan-500/20' : 'bg-green-100'
              }`}>
                <Check size={32} className={isCyberpunk ? 'text-cyan-400' : 'text-green-500'} />
              </div>
              <h3 className={`text-lg font-semibold ${t.text} mb-2`}>导入完成</h3>
              <p className={`text-sm ${t.textSecondary}`}>成功导入 {selectedRows.size} 条数据</p>
            </div>
          )}
        </div>

        <div className={`flex items-center justify-between px-6 py-4 border-t ${t.border}`}>
          <div className="flex items-center gap-2">
            {step !== 'upload' && (
              <button
                onClick={() => setStep(step === 'complete' ? 'preview' : 'upload')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isCyberpunk
                    ? 'text-cyan-400 hover:bg-cyan-500/10'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                }`}
              >
                <ChevronLeft size={16} />
                上一步
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isCyberpunk
                  ? 'text-gray-400 hover:bg-white/5'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
              }`}
            >
              取消
            </button>
            {step === 'preview' && (
              <button
                onClick={handleImport}
                disabled={selectedRows.size === 0 || importProgress > 0}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 min-w-[140px] justify-center ${
                  isCyberpunk
                    ? 'bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white hover:opacity-90'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                {importProgress > 0 ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    导入中 {importProgress}%
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    确认导入 ({selectedRows.size})
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ImportWizard;