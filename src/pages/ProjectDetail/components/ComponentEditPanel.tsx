import React, { useState, useEffect, useRef } from 'react';
import { useThemeStyles } from '../../../hooks/useThemeStyles';
import { Search, X, Check, AlertTriangle } from 'lucide-react';
import type { ProjectStage } from '../../../types';
import { getDefaultStageForEntity } from '../../../services/stageConfig';

interface ComponentEditForm {
  componentName: string;
  componentNumber: string;
  productionOrderNumber: string;
  holder: string;
  version: string;
  stage: ProjectStage;
  status: string;
  moduleId: string;
}

interface ComponentEditPanelProps {
  show: boolean;
  onClose: () => void;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
  component: any;
  module: any;
  modules: any[];
  project: any;
  form: ComponentEditForm;
  onChange: (field: keyof ComponentEditForm, value: string) => void;
  errors: Record<string, string>;
}

export function ComponentEditPanel({
  show,
  onClose,
  onCancel,
  onSubmit,
  component,
  module,
  modules,
  project,
  form,
  onChange,
  errors,
}: ComponentEditPanelProps) {
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

  useEffect(() => {
    if (show) {
      setModuleSearchQuery('');
      setHasUserClearedSearch(false);
    }
  }, [show]);

  const filteredModules = moduleSearchQuery.trim()
    ? modules.filter((m: any) => {
        const nameLower = m.moduleName.toLowerCase();
        const numberLower = m.moduleNumber.toLowerCase();
        const query = moduleSearchQuery.toLowerCase().trim();
        return nameLower.includes(query) || numberLower.includes(query);
      })
    : modules;

  const currentModule = modules.find((m: any) => m.id === form.moduleId);

  const handleModuleSelect = (moduleId: string) => {
    onChange('moduleId', moduleId);
    setModuleSearchQuery('');
    setHasUserClearedSearch(false);
    setShowModuleDropdown(false);
  };

  const handleClearSearch = () => {
    setModuleSearchQuery('');
    setHasUserClearedSearch(true);
    setShowModuleDropdown(false);
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

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div className={`${t.modalBg} rounded-2xl p-6 w-full max-w-2xl border ${t.modalBorder} max-h-[90vh] overflow-y-auto shadow-2xl`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-amber-200/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-200/50">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
            </div>
            <div>
              <h2 className={`text-xl font-bold ${t.text}`}>编辑组件</h2>
              <p className={`text-xs ${t.textMuted} mt-0.5`}>{component.componentNumber}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className={`p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 ${t.textSecondary} transition-colors`}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-900/10 dark:to-orange-900/10 rounded-xl p-5 border border-amber-200/40">
            <h3 className={`text-sm font-semibold ${t.text} mb-4 flex items-center gap-2`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-package text-amber-600"><path d="m7.5 4.27 9 5.15"></path><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path><path d="m3.3 7 8.7 5 8.7-5"></path><path d="M12 22V12"></path></svg>
              基本信息
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${t.text}`}>组件名称 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.componentName}
                  onChange={(e) => onChange('componentName', e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-xl focus:border-amber-400 focus:ring-2 focus:ring-amber-200 ${t.input} transition-all`}
                  placeholder="请输入组件名称"
                />
                {errors.componentName && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertTriangle size={12} />{errors.componentName}
                  </p>
                )}
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${t.text}`}>组件编号 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.componentNumber}
                  onChange={(e) => onChange('componentNumber', e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-xl focus:border-amber-400 focus:ring-2 focus:ring-amber-200 ${t.input} transition-all`}
                  placeholder="如: MEM-001"
                />
                {errors.componentNumber && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertTriangle size={12} />{errors.componentNumber}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className={`${t.cardBg} rounded-xl p-5 border ${t.border}`}>
            <h3 className={`text-sm font-semibold ${t.text} mb-4 flex items-center gap-2`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-hash text-gray-500"><line x1="4" x2="20" y1="9" y2="9"></line><line x1="4" x2="20" y1="15" y2="15"></line><line x1="10" x2="8" y1="3" y2="21"></line><line x1="16" x2="14" y1="3" y2="21"></line></svg>
              生产信息
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${t.text}`}>生产指令号</label>
                <input
                  type="text"
                  value={form.productionOrderNumber}
                  onChange={(e) => onChange('productionOrderNumber', e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-xl focus:border-amber-400 focus:ring-2 focus:ring-amber-200 ${t.input} transition-all`}
                  placeholder="请输入生产指令号"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${t.text}`}>版本</label>
                <input
                  type="text"
                  value={form.version}
                  onChange={(e) => onChange('version', e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-xl focus:border-amber-400 focus:ring-2 focus:ring-amber-200 ${t.input} transition-all`}
                  placeholder="如: v1.0"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${t.text}`}>持有人</label>
                <input
                  type="text"
                  value={form.holder}
                  onChange={(e) => onChange('holder', e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-xl focus:border-amber-400 focus:ring-2 focus:ring-amber-200 ${t.input} transition-all`}
                  placeholder="请输入持有人姓名"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${t.text}`}>阶段</label>
                <select
                  value={form.stage}
                  onChange={(e) => onChange('stage', e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-xl focus:border-amber-400 focus:ring-2 focus:ring-amber-200 ${t.input} transition-all`}
                >
                  <option value="">请选择阶段</option>
                  <option value="F阶段">F阶段</option>
                  <option value="C阶段">C阶段</option>
                  <option value="S阶段">S阶段</option>
                  <option value="D阶段">D阶段</option>
                  <option value="P阶段">P阶段</option>
                </select>
              </div>
            </div>
          </div>

          <div className={`${t.cardBg} rounded-xl p-5 border ${t.border}`}>
            <h3 className={`text-sm font-semibold ${t.text} mb-4 flex items-center gap-2`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-settings text-gray-500"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              模块归属
            </h3>
            <div className="relative">
              <label className={`block text-sm font-medium mb-1.5 ${t.text}`}>所属模块 <span className="text-red-500">*</span></label>
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
                  className={`w-full pl-9 pr-8 py-2 border rounded-xl focus:border-amber-400 focus:ring-2 focus:ring-amber-200 ${t.input} transition-all`}
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
                  className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl max-h-60 overflow-y-auto"
                >
                  {filteredModules.length === 0 ? (
                    <div className="px-4 py-4 text-sm text-gray-500 text-center">
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
                      {filteredModules.map((m: any) => {
                        const nameLower = m.moduleName.toLowerCase();
                        const numberLower = m.moduleNumber.toLowerCase();
                        const query = moduleSearchQuery.toLowerCase().trim();
                        const nameExactMatch = nameLower === query || nameLower.startsWith(query);
                        const numberExactMatch = numberLower === query || numberLower.startsWith(query);
                        const matchType = nameExactMatch || numberExactMatch ? 'exact' : 'fuzzy';

                        return (
                          <div
                            key={m.id}
                            onClick={() => handleModuleSelect(m.id)}
                            className={`px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${form.moduleId === m.id ? 'bg-amber-50 dark:bg-amber-900/30' : ''}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${form.moduleId === m.id ? 'bg-amber-500 border-amber-500' : 'border-gray-300'}`}>
                                  {form.moduleId === m.id && <Check size={12} className="text-white" />}
                                </div>
                                <div className="font-medium text-gray-900 dark:text-gray-100">
                                  {highlightText(m.moduleName, moduleSearchQuery)}
                                </div>
                              </div>
                              {matchType === 'exact' && (
                                <span className="text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded">精确</span>
                              )}
                              {matchType === 'fuzzy' && (
                                <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">模糊</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 pl-6">
                              编号: {highlightText(m.moduleNumber, moduleSearchQuery)}
                              {m.systemName && ` · 系统: ${m.systemName}`}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              )}
              {errors.moduleId && (
                <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                  <AlertTriangle size={12} />{errors.moduleId}
                </p>
              )}
            </div>

            {currentModule && (
              <div className={`mt-4 p-4 rounded-xl ${t.emptyBg}`}>
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
          </div>

          <div className={`${t.cardBg} rounded-xl p-5 border ${t.border}`}>
            <label className={`block text-sm font-medium mb-1.5 ${t.text}`}>状态</label>
            <select
              value={form.status}
              onChange={(e) => onChange('status', e.target.value)}
              className={`w-full px-4 py-2.5 border rounded-xl focus:border-amber-400 focus:ring-2 focus:ring-amber-200 ${t.input} transition-all`}
            >
              <option value="未投产">未投产</option>
              <option value="投产中">投产中</option>
              <option value="测试中">测试中</option>
              <option value="正常">正常</option>
              <option value="故障">故障</option>
              <option value="维修中">维修中</option>
              <option value="三防中">三防中</option>
              <option value="仿真中">仿真中</option>
            </select>
            <div className={`mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800`}>
              <p className={`text-xs ${t.textSecondary} flex items-start gap-1.5`}>
                <AlertTriangle size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <span>⚠️ 注意：通过此处更改状态不会记录变更原因，建议使用状态变更功能</span>
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className={`flex-1 py-3 border-2 rounded-xl ${t.border} ${t.textSecondary} hover:${t.hoverBg} transition-all flex items-center justify-center gap-2 font-medium`}
            >
              <X size={18} />
              取消
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl font-semibold transition-all hover:shadow-lg cursor-pointer bg-gradient-to-r from-amber-600 via-orange-500 to-red-500 hover:from-amber-500 hover:via-orange-400 hover:to-red-400 text-white shadow-lg shadow-amber-200/50 hover:shadow-amber-300/50 flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-save"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
              保存修改
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
