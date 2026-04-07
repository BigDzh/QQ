import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useThemeStyles } from '../../../hooks/useThemeStyles';
import type { ProjectStage } from '../../../types';
import { STAGE_OPTIONS, getDefaultStageForEntity } from '../../../services/stageConfig';
import { Search, X, Check } from 'lucide-react';

interface ComponentEditForm {
  componentName: string[];
  componentNumber: string;
  productionOrderNumber: string;
  stage: ProjectStage;
  version: string;
  moduleId: string;
  holder: string[];
  repairOrderNumber: string;
  protectionOrderNumber: string;
}

interface ComponentEditModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  form: ComponentEditForm;
  onChange: (field: keyof ComponentEditForm, value: string | string[] | ProjectStage) => void;
  editingComponent: any;
  modules: any[];
}

interface FilteredModule extends any {
  matchType?: 'exact' | 'fuzzy';
}

export function ComponentEditModal({ show, onClose, onSubmit, form, onChange, editingComponent, modules }: ComponentEditModalProps) {
  const t = useThemeStyles();
  const [moduleSearchQuery, setModuleSearchQuery] = useState('');
  const [showModuleDropdown, setShowModuleDropdown] = useState(false);
  const [hasUserClearedSearch, setHasUserClearedSearch] = useState(false);
  const moduleInputRef = useRef<HTMLInputElement>(null);
  const moduleDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moduleDropdownRef.current && !moduleDropdownRef.current.contains(event.target as Node)) {
        setShowModuleDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredModules = useMemo((): FilteredModule[] => {
    if (!moduleSearchQuery.trim()) {
      return modules.map((m: any) => ({ ...m, matchType: undefined as undefined }));
    }

    const query = moduleSearchQuery.toLowerCase().trim();

    return modules
      .map((m: any) => {
        const nameLower = m.moduleName.toLowerCase();
        const numberLower = m.moduleNumber.toLowerCase();

        const nameExactMatch = nameLower === query || nameLower.startsWith(query);
        const numberExactMatch = numberLower === query || numberLower.startsWith(query);
        const nameFuzzyMatch = nameLower.includes(query);
        const numberFuzzyMatch = numberLower.includes(query);

        if (nameExactMatch || numberExactMatch) {
          return { ...m, matchType: 'exact' as const };
        } else if (nameFuzzyMatch || numberFuzzyMatch) {
          return { ...m, matchType: 'fuzzy' as const };
        }
        return null;
      })
      .filter((m): m is FilteredModule => m !== null);
  }, [modules, moduleSearchQuery]);

  const currentModule = useMemo(() => {
    return modules.find((m: any) => m.id === form.moduleId);
  }, [modules, form.moduleId]);

  const handleModuleSelect = (moduleId: string) => {
    onChange('moduleId', moduleId);
    setModuleSearchQuery('');
    setShowModuleDropdown(false);
  };

  const handleClearSearch = () => {
    setModuleSearchQuery('');
    setHasUserClearedSearch(true);
    setShowModuleDropdown(false);
  };

  useEffect(() => {
    if (editingComponent && show) {
      setModuleSearchQuery('');
      setHasUserClearedSearch(false);
    }
  }, [editingComponent, show]);

  useEffect(() => {
    if (show && moduleInputRef.current) {
      setTimeout(() => moduleInputRef.current?.focus(), 100);
    }
  }, [show]);

  if (!show || !editingComponent) return null;

  const handleComponentNameChange = (value: string) => {
    const names = value.split(',').map(n => n.trim()).filter(n => n);
    onChange('componentName', names);
  };

  const handleHolderChange = (value: string) => {
    const holders = value.split(',').map(h => h.trim()).filter(h => h);
    onChange('holder', holders);
  };

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase()
        ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-600 rounded px-0.5">{part}</mark>
        : part
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70]" onClick={onClose}>
      <div className={`${t.modalBg} rounded-lg p-6 w-full max-w-md border ${t.modalBorder} max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        <h2 className={`text-xl font-semibold mb-4 ${t.text}`}>编辑组件</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>组件名称（多个用逗号分隔）</label>
            <input
              type="text"
              value={Array.isArray(form.componentName) ? form.componentName.join(', ') : form.componentName}
              onChange={(e) => handleComponentNameChange(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
              required
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>组件编号</label>
            <input
              type="text"
              value={form.componentNumber}
              onChange={(e) => onChange('componentNumber', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
              required
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>生产指令号</label>
            <input
              type="text"
              value={form.productionOrderNumber}
              onChange={(e) => onChange('productionOrderNumber', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>阶段</label>
              <select
                value={form.stage || getDefaultStageForEntity('component')}
                onChange={(e) => onChange('stage', e.target.value as ProjectStage)}
                className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
              >
                {STAGE_OPTIONS.map(stage => (
                  <option key={stage} value={stage}>{stage}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>版本</label>
              <input
                type="text"
                value={form.version}
                onChange={(e) => onChange('version', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                placeholder="如 v1.0"
              />
            </div>
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>所属模块</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <Search size={16} className="text-gray-400" />
              </div>
              <input
                ref={moduleInputRef}
                type="text"
                value={currentModule && !moduleSearchQuery && !hasUserClearedSearch ? '' : moduleSearchQuery}
                onChange={(e) => {
                  setModuleSearchQuery(e.target.value);
                  setHasUserClearedSearch(false);
                  setShowModuleDropdown(true);
                }}
                onFocus={(e) => {
                  if (!moduleSearchQuery && currentModule) {
                    e.target.select();
                  }
                  setShowModuleDropdown(true);
                }}
                className={`w-full pl-9 pr-8 py-2 border rounded-lg ${t.input}`}
                placeholder={currentModule ? `${currentModule.moduleName} - ${currentModule.moduleNumber}` : "搜索模块名称或编号..."}
              />
              {moduleSearchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <X size={14} className="text-gray-400" />
                </button>
              )}
            </div>
            {showModuleDropdown && (
              <div
                ref={moduleDropdownRef}
                className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto"
              >
                {filteredModules.length === 0 ? (
                  <div className="px-3 py-4 text-sm text-gray-500 text-center">
                    <div className="mb-1">未找到匹配的模块</div>
                    <div className="text-xs text-gray-400">尝试输入不同的关键词搜索</div>
                  </div>
                ) : (
                  <>
                    {moduleSearchQuery.trim() && (
                      <div className="px-3 py-1.5 text-xs text-gray-500 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                        找到 {filteredModules.length} 个匹配的模块
                      </div>
                    )}
                    {filteredModules.map((m: any) => (
                      <div
                        key={m.id}
                        onClick={() => handleModuleSelect(m.id)}
                        className={`px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${form.moduleId === m.id ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${form.moduleId === m.id ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                              {form.moduleId === m.id && <Check size={12} className="text-white" />}
                            </div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">
                              {highlightText(m.moduleName, moduleSearchQuery)}
                            </div>
                          </div>
                          {m.matchType === 'exact' && (
                            <span className="text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded">精确</span>
                          )}
                          {m.matchType === 'fuzzy' && (
                            <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">模糊</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 pl-6">
                          编号: {highlightText(m.moduleNumber, moduleSearchQuery)}
                          {m.systemName && ` · 系统: ${m.systemName}`}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
          {currentModule && (
            <div className={`p-3 rounded-lg ${t.emptyBg}`}>
              <div className="text-xs space-y-1">
                <div className={`${t.textSecondary}`}>模块编号: <span className={t.text}>{currentModule.moduleNumber || '-'}</span></div>
                <div className={`${t.textSecondary}`}>模块名称: <span className={t.text}>{currentModule.moduleName || '-'}</span></div>
                {currentModule.systemId ? (
                  <>
                    <div className={`${t.textSecondary}`}>关联系统编号: <span className={t.text}>{currentModule.systemNumber || '-'}</span></div>
                    <div className={`${t.textSecondary}`}>关联系统名称: <span className={t.text}>{currentModule.systemName || '-'}</span></div>
                  </>
                ) : (
                  <div className={`${t.textSecondary}`}>关联系统: <span className={t.text}>无关联系统</span></div>
                )}
              </div>
            </div>
          )}
          <div>
            <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>负责人（多个用逗号分隔）</label>
            <input
              type="text"
              value={Array.isArray(form.holder) ? form.holder.join(', ') : form.holder}
              onChange={(e) => handleHolderChange(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
              placeholder="如: 张三, 李四"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ease-out focus:outline-none ${t.cancelButton}`}
            >
              取消
            </button>
            <button
              type="submit"
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ease-out focus:outline-none ${t.button}`}
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
