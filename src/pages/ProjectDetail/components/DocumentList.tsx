import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Plus, FileText, Edit2, Upload, Trash2, FileUp, Search, X, Loader2, Download } from 'lucide-react';
import { useThemeStyles } from '../../../hooks/useThemeStyles';
import { useToast } from '../../../components/Toast';
import { generateId } from '../../../utils/auth';
import type { ProjectStage } from '../../../types';
import { readExcelAsBinaryString, excelToJson, generateExcelTemplate } from '../../../utils/lazyImports';

interface Document {
  id: string;
  documentNumber: string;
  name: string;
  type: string;
  stage: ProjectStage;
  version: string;
  status: '已完成' | '未完成';
}

interface DocumentListProps {
  projectId: string;
  documents: Document[];
  canEdit: boolean;
  onAddDocument: () => void;
  onEditDocument: (doc: Document) => void;
  onDeleteDocument: (docId: string) => void;
  onUploadDocument: (docId: string, file: File) => void;
  onDownloadDocument: (doc: Document) => void;
  onCreateDocuments?: (documents: Partial<Document>[]) => void;
  projectStage?: ProjectStage;
}

export function DocumentList({
  documents,
  canEdit,
  onAddDocument,
  onEditDocument,
  onDeleteDocument,
  onUploadDocument,
  onDownloadDocument,
  onCreateDocuments,
  projectStage,
}: DocumentListProps) {
  const t = useThemeStyles();
  const { showToast } = useToast();
  const [selectedDocStageFilter, setSelectedDocStageFilter] = useState<string | null>(null);
  const [docPage, setDocPage] = useState(1);
  const DOC_PAGE_SIZE = 20;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState<'all' | 'number' | 'name'>('all');

  const handleDownloadTemplateClick = useCallback(() => {
    handleDownloadTemplate();
  }, []);

  const handleImportButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const currentStage = projectStage || 'F阶段';

  const filteredDocuments = useMemo(() => {
    let docs = documents.filter(doc => !selectedDocStageFilter || doc.stage === selectedDocStageFilter);

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      docs = docs.filter(doc => {
        if (searchField === 'number') {
          return doc.documentNumber.toLowerCase().includes(query);
        } else if (searchField === 'name') {
          return doc.name.toLowerCase().includes(query);
        } else {
          return doc.documentNumber.toLowerCase().includes(query) || doc.name.toLowerCase().includes(query);
        }
      });
    }

    return docs;
  }, [documents, selectedDocStageFilter, searchQuery, searchField]);

  const handleExcelImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validExtensions = ['.xlsx', '.xls'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!validExtensions.includes(fileExtension)) {
      showToast('请选择 .xlsx 或 .xls 格式的文件', 'error');
      e.target.value = '';
      return;
    }

    setIsImporting(true);
    setImportProgress(0);

    try {
      const binaryResult = await readExcelAsBinaryString(file);
      if (!binaryResult.success || !binaryResult.result) {
        showToast(binaryResult.error || '文件读取失败', 'error');
        setIsImporting(false);
        e.target.value = '';
        return;
      }

      setImportProgress(50);

      const jsonData = await excelToJson(binaryResult.result);

      setImportProgress(75);

      const invalidRows: number[] = [];
      const newDocuments: Partial<Document>[] = jsonData.map((row: any, index: number) => {
        const name = row['文档名称'] || row['name'] || '';
        if (!name || name.trim() === '') {
          invalidRows.push(index + 1);
          return null;
        }
        return {
          id: generateId(),
          documentNumber: row['文档编号'] || row['documentNumber'] || '',
          name: name,
          type: row['类型'] || row['type'] || '设计文档',
          stage: currentStage as ProjectStage,
          version: row['版本'] || row['version'] || 'A',
          status: '未完成' as const,
        };
      }).filter((doc) => doc !== null) as Partial<Document>[];

      if (invalidRows.length > 0 && newDocuments.length === 0) {
        setIsImporting(false);
        setImportProgress(0);
        showToast(`第 ${invalidRows.slice(0, 5).join(', ')}${invalidRows.length > 5 ? '...' : ''} 行缺少文档名称，无法导入`, 'error');
        e.target.value = '';
        return;
      }

      setTimeout(() => {
        setImportProgress(100);
        setTimeout(() => {
          setIsImporting(false);
          setImportProgress(0);
          if (newDocuments.length > 0) {
            if (onCreateDocuments) {
              onCreateDocuments(newDocuments);
            }
            const warningMsg = invalidRows.length > 0
              ? `，已跳过 ${invalidRows.length} 行缺少文档名称的数据`
              : '';
            showToast(`成功导入 ${newDocuments.length} 条文档数据${warningMsg}`, invalidRows.length > 0 ? 'warning' : 'success');
          } else {
            showToast('导入的数据中没有有效的文档名称', 'warning');
          }
          e.target.value = '';
        }, 300);
      }, 300);
    } catch (error) {
      setIsImporting(false);
      setImportProgress(0);
      showToast('导入过程中发生错误', 'error');
      e.target.value = '';
    }
  }, [showToast, currentStage, onCreateDocuments]);

  const handleDownloadTemplate = useCallback(async () => {
    try {
      await generateExcelTemplate(
        ['文档编号', '文档名称', '类型', '版本'],
        '文档导入模板'
      );
      showToast('模板已下载', 'success');
    } catch (error) {
      showToast('模板下载失败', 'error');
    }
  }, [showToast]);

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  };

  const paginatedDocuments = useMemo(() => {
    const startIndex = (docPage - 1) * DOC_PAGE_SIZE;
    return filteredDocuments.slice(startIndex, startIndex + DOC_PAGE_SIZE);
  }, [filteredDocuments, docPage]);

  const totalPages = Math.ceil(filteredDocuments.length / DOC_PAGE_SIZE);

  const stageInfo = useMemo(() => {
    return (['F阶段', 'C阶段', 'S阶段', 'D阶段', 'P阶段'] as const).map(stage => {
      const stageDocs = documents.filter(d => d.stage === stage);
      const completed = stageDocs.filter(d => d.status === '已完成').length;
      const total = stageDocs.length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
      return { stage, completed, total, percentage };
    });
  }, [documents]);

  const getStageButtonStyle = (stage: string, info: typeof stageInfo[0]) => {
    const isSelected = selectedDocStageFilter === stage;
    const isOtherSelected = selectedDocStageFilter !== null && !isSelected;
    const isAllCompleted = info.total > 0 && info.completed === info.total;
    const colors = {
      'F阶段': { active: 'bg-blue-500', light: 'bg-blue-100 border-blue-300', dark: 'text-blue-900', ring: 'ring-blue-400' },
      'C阶段': { active: 'bg-green-500', light: 'bg-green-100 border-green-300', dark: 'text-green-900', ring: 'ring-green-400' },
      'S阶段': { active: 'bg-yellow-500', light: 'bg-yellow-100 border-yellow-300', dark: 'text-yellow-900', ring: 'ring-yellow-400' },
      'D阶段': { active: 'bg-orange-500', light: 'bg-orange-100 border-orange-300', dark: 'text-orange-900', ring: 'ring-orange-400' },
      'P阶段': { active: 'bg-purple-500', light: 'bg-purple-100 border-purple-300', dark: 'text-purple-900', ring: 'ring-purple-400' },
    }[stage] || { active: 'bg-gray-500', light: 'bg-gray-100 border-gray-300', dark: 'text-gray-900', ring: 'ring-gray-400' };

    return {
      flex: isSelected ? '4' : isOtherSelected ? '0 0 5%' : '1',
      minWidth: isOtherSelected ? '0' : '60px',
      opacity: isOtherSelected ? 0.3 : 1,
      colors,
      isSelected,
      isAllCompleted,
    };
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>, docId: string) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadDocument(docId, file);
      e.target.value = '';
    }
  };

  if (documents.length === 0) {
    return (
      <div className="space-y-4">
        <div className={`${t.card} rounded-lg shadow-sm border ${t.border} p-6`}>
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <select
                value={searchField}
                onChange={(e) => setSearchField(e.target.value as 'all' | 'number' | 'name')}
                className={`px-3 py-2 border rounded-lg text-sm ${t.input}`}
              >
                <option value="all">全部</option>
                <option value="number">文档编号</option>
                <option value="name">文档名称</option>
              </select>
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${t.textMuted}`} size={16} />
                <input
                  type="text"
                  placeholder="搜索文档..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setDocPage(1); }}
                  className={`pl-10 pr-10 py-2 border rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary-500 ${t.input}`}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 ${t.textMuted} hover:${t.text}`}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleExcelImport}
              />
              <button
                onClick={handleImportButtonClick}
                disabled={isImporting}
                title="导入Excel文件"
                className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm ${t.border} ${t.textSecondary} hover:${t.hoverBg} disabled:opacity-50`}
              >
                {isImporting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>导入中 {importProgress}%</span>
                  </>
                ) : (
                  <>
                    <FileUp size={16} />
                    Excel导入
                  </>
                )}
              </button>
              <button
                onClick={handleDownloadTemplateClick}
                title="下载导入模板"
                className={`p-2 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}
              >
                <Download size={16} />
              </button>
              {canEdit && (
                <button
                  onClick={onAddDocument}
                  className={`flex items-center gap-2 px-4 py-2 ${t.button} rounded-lg text-sm`}
                >
                  <Plus size={16} />
                  新建文档
                </button>
              )}
            </div>
          </div>
        </div>
        <div className={`text-center py-12 ${t.card} rounded-lg border ${t.border}`}>
          <FileText className={`mx-auto ${t.textMuted} mb-4`} size={48} />
          <p className={t.textMuted}>暂无文档</p>
          {canEdit && (
            <button
              onClick={onAddDocument}
              className={`mt-4 flex items-center gap-2 px-4 py-2 ${t.button} rounded-lg mx-auto`}
            >
              <Plus size={18} />
              新建文档
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 h-20">
        {stageInfo.map(({ stage, completed, total, percentage }) => {
          const style = getStageButtonStyle(stage, { stage, completed, total, percentage });
          return (
            <button
              key={stage}
              onClick={() => {
                setSelectedDocStageFilter(style.isSelected ? null : stage);
                setDocPage(1);
              }}
              style={{
                flex: style.flex,
                minWidth: style.minWidth,
                opacity: style.opacity,
                transition: 'flex 500ms ease-out, opacity 300ms ease-out, min-width 500ms ease-out',
              }}
              className={`
                relative rounded-lg border-2 overflow-hidden
                ${style.isSelected
                  ? `backdrop-blur-sm ${style.colors.light} shadow-lg ring-2 ring-offset-1 ${style.colors.ring}`
                  : style.isAllCompleted
                    ? 'backdrop-blur-sm border-green-400/50 bg-green-50/50 hover:bg-green-100'
                    : 'backdrop-blur-sm border-gray-300/50 bg-white/30 hover:bg-white/50'
                }
              `}
            >
              <div className={`h-full flex flex-col justify-center px-2 ${style.isSelected ? style.colors.light : ''}`}>
                <div className={`text-sm font-bold text-center mb-1 ${style.isSelected ? style.colors.dark : style.isAllCompleted ? 'text-green-800' : 'text-gray-900'}`}>
                  {stage}
                </div>
                <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                  <div
                    className={`h-full ${style.isAllCompleted ? 'bg-green-500' : style.isSelected ? style.colors.active : 'bg-gray-400'} rounded-full`}
                    style={{ width: `${percentage}%`, transition: 'width 500ms ease-out, background-color 300ms ease-out' }}
                  />
                </div>
                <div className={`text-xs text-center mt-0.5 ${style.isSelected ? style.colors.dark : 'text-gray-500'}`}>
                  {percentage}%
                </div>
                {style.isSelected && (
                  <div className={`absolute -top-0.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 ${style.colors.light} border-2 border-r-0 border-b-0 ${style.colors.dark}`} />
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className={`${t.card} rounded-lg shadow-sm border ${t.border} p-4`}>
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <select
              value={searchField}
              onChange={(e) => { setSearchField(e.target.value as 'all' | 'number' | 'name'); setDocPage(1); }}
              className={`px-3 py-2 border rounded-lg text-sm ${t.input}`}
            >
              <option value="all">全部</option>
              <option value="number">文档编号</option>
              <option value="name">文档名称</option>
            </select>
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${t.textMuted}`} size={16} />
              <input
                type="text"
                placeholder="搜索文档..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setDocPage(1); }}
                className={`pl-10 pr-10 py-2 border rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary-500 ${t.input}`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${t.textMuted} hover:${t.text}`}
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {searchQuery && (
              <span className={`text-sm ${t.textMuted}`}>
                找到 {filteredDocuments.length} 个结果
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleExcelImport}
            />
            <button
              onClick={handleImportButtonClick}
              disabled={isImporting}
              title="导入Excel文件"
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm ${t.border} ${t.textSecondary} hover:${t.hoverBg} disabled:opacity-50`}
            >
              {isImporting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>导入中 {importProgress}%</span>
                </>
              ) : (
                <>
                  <FileUp size={16} />
                  Excel导入
                </>
              )}
            </button>
            <button
              onClick={handleDownloadTemplateClick}
              title="下载导入模板"
              className={`p-2 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}
            >
              <Download size={16} />
            </button>
            {canEdit && (
              <button
                onClick={onAddDocument}
                className={`flex items-center gap-2 px-4 py-2 ${t.button} rounded-lg text-sm`}
              >
                <Plus size={16} />
                新建文档
              </button>
            )}
          </div>
        </div>

        {filteredDocuments.length === 0 && searchQuery && (
          <div className={`text-center py-8 ${t.textMuted}`}>
            <Search className={`mx-auto mb-2`} size={32} />
            <p>未找到匹配的文档</p>
            <p className="text-sm mt-1">尝试调整搜索条件或关键词</p>
          </div>
        )}

        {filteredDocuments.length > 0 && (
          <table className="w-full">
          <thead className={t.tableHeader}>
            <tr>
              <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>文档编号</th>
              <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>文档名称</th>
              <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>类型</th>
              <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>阶段</th>
              <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>版本</th>
              <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>大小</th>
              <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>状态</th>
              <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>操作</th>
            </tr>
          </thead>
          <tbody>
            {paginatedDocuments.map((doc) => (
              <tr key={doc.id} className={`border-t ${t.border} ${t.hoverBg}`}>
                <td className={`px-4 py-3 ${t.text}`}>{doc.documentNumber}</td>
                <td className={`px-4 py-3 ${t.text}`}>{doc.name}</td>
                <td className={`px-4 py-3 ${t.textSecondary}`}>{doc.type}</td>
                <td className={`px-4 py-3 ${t.textSecondary}`}>{doc.stage}</td>
                <td className={`px-4 py-3 ${t.textSecondary}`}>{doc.version || '-'}</td>
                <td className={`px-4 py-3 ${t.textSecondary}`}>{formatFileSize(doc.fileSize)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs ${
                    doc.status === '已完成' ? t.success : t.badge
                  }`}>
                    {doc.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEditDocument(doc)}
                      className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${t.textMuted}`}
                      title="编辑"
                    >
                      <Edit2 size={16} />
                    </button>
                    <label className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${t.textMuted} cursor-pointer`} title="上传">
                      <Upload size={16} />
                      <input
                        type="file"
                        accept=".doc,.docx,.pdf"
                        className="hidden"
                        onChange={(e) => handleUpload(e, doc.id)}
                      />
                    </label>
                    {doc.fileUrl && (
                      <button
                        onClick={() => onDownloadDocument(doc)}
                        className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${t.textMuted}`}
                        title="下载"
                      >
                        <Download size={16} />
                      </button>
                    )}
                    {canEdit && (
                      <button
                        onClick={() => {
                          onDeleteDocument(doc.id);
                        }}
                        className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${t.textMuted}`}
                        title="删除"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className={`flex items-center justify-between px-4 py-3 ${t.card} rounded-lg border ${t.border}`}>
          <div className={`text-sm ${t.textSecondary}`}>
            第 {docPage} 页，共 {totalPages} 页
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDocPage(p => Math.max(1, p - 1))}
              disabled={docPage === 1}
              className={`px-3 py-1 border rounded ${t.button} disabled:opacity-50`}
            >
              上一页
            </button>
            <button
              onClick={() => setDocPage(p => Math.min(totalPages, p + 1))}
              disabled={docPage >= totalPages}
              className={`px-3 py-1 border rounded ${t.button} disabled:opacity-50`}
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DocumentList;
