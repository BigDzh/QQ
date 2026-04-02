import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { useThemeStyles } from '../../../hooks/useThemeStyles';
import { Search, X } from 'lucide-react';
import type { ProjectStage } from '../../../types';
import { STAGE_OPTIONS, getDefaultStageForEntity, getEntityStageConfig } from '../../../services/stageConfig';

interface ModuleFormData {
  moduleNumber: string;
  moduleName: string;
  category?: string;
  productionOrderNumber: string;
  holder: string;
  status: '未投产' | '投产中' | '正常' | '维修中' | '三防中' | '测试中' | '仿真中' | '借用中' | '故障';
  stage: ProjectStage;
  version: string;
  instructionNumber?: string;
  systemId?: string;
  systemNumber?: string;
  systemName?: string;
}

interface ModuleModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  form: ModuleFormData;
  onChange: (field: string, value: any) => void;
  categories?: string[];
  mode: 'create' | 'edit';
  systems?: any[];
  allModuleNames?: string[];
  allHolders?: string[];
}

export function ModuleModal({
  show,
  onClose,
  onSubmit,
  form,
  onChange,
  categories = [],
  mode,
  systems = [],
  allModuleNames = [],
  allHolders = [],
}: ModuleModalProps) {
  const t = useThemeStyles();
  const { isDark } = useTheme();

  const [moduleNameSearch, setModuleNameSearch] = useState('');
  const [holderSearch, setHolderSearch] = useState('');
  const [showModuleNameDropdown, setShowModuleNameDropdown] = useState(false);
  const [showHolderDropdown, setShowHolderDropdown] = useState(false);
  const moduleNameRef = useRef<HTMLDivElement>(null);
  const holderRef = useRef<HTMLDivElement>(null);

  const filteredModuleNames = allModuleNames.filter(name =>
    name.toLowerCase().includes(moduleNameSearch.toLowerCase())
  );
  const filteredHolders = allHolders.filter(holder =>
    holder.toLowerCase().includes(holderSearch.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moduleNameRef.current && !moduleNameRef.current.contains(event.target as Node)) {
        setShowModuleNameDropdown(false);
      }
      if (holderRef.current && !holderRef.current.contains(event.target as Node)) {
        setShowHolderDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!show) return null;

  const handleInstructionNumberChange = (value: string) => {
    const formatted = value.replace(/[^a-zA-Z0-9-]/g, '');
    onChange('instructionNumber', formatted);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className={`${t.modalBg} rounded-lg p-6 w-full max-w-lg border ${t.modalBorder} max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        <h2 className={`text-xl font-semibold mb-4 ${t.text}`}>
          {mode === 'create' ? '新建模块' : '编辑模块'}
        </h2>
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${t.text}`}>模块编号 *</label>
              <input
                type="text"
                value={form.moduleNumber}
                onChange={(e) => onChange('moduleNumber', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                placeholder="如: M-001"
                required
              />
            </div>

            {allModuleNames.length > 0 && mode === 'edit' ? (
              <div ref={moduleNameRef} className="relative">
                <label className={`block text-sm font-medium mb-1 ${t.text}`}>模块名称 *</label>
                <div
                  className={`w-full px-3 py-2 border rounded-lg ${t.input} cursor-pointer min-h-[42px] flex flex-wrap gap-1 items-center`}
                  onClick={() => setShowModuleNameDropdown(!showModuleNameDropdown)}
                >
                  {form.moduleName ? (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-sm ${isDark ? 'bg-cyan-500/20 text-cyan-300' : 'bg-cyan-100 text-cyan-700'}`}>
                      {form.moduleName}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onChange('moduleName', '');
                        }}
                        className="hover:text-red-400"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ) : (
                    <span className={`${t.text} opacity-60`}>点击选择或输入模块名称</span>
                  )}
                </div>
                {showModuleNameDropdown && (
                  <div className={`absolute z-10 w-full mt-1 border rounded-lg shadow-lg ${t.card} ${t.border} max-h-60 overflow-hidden`}>
                    <div className={`p-2 border-b ${t.border}`}>
                      <div className="relative">
                        <Search size={14} className={`absolute left-2 top-1/2 -translate-y-1/2 ${t.text}`} />
                        <input
                          type="text"
                          value={moduleNameSearch}
                          onChange={e => setModuleNameSearch(e.target.value)}
                          className={`w-full pl-7 pr-3 py-1.5 text-sm border rounded ${t.border} ${t.text} ${t.card}`}
                          placeholder="搜索模块名称..."
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="max-h-40 overflow-y-auto">
                      {filteredModuleNames.length === 0 ? (
                        <div className={`px-3 py-2 text-sm ${t.text}`}>无匹配结果，请手动输入</div>
                      ) : (
                        filteredModuleNames.map(name => (
                          <div
                            key={name}
                            onClick={() => {
                              onChange('moduleName', name);
                              setShowModuleNameDropdown(false);
                              setModuleNameSearch('');
                            }}
                            className={`px-3 py-2 cursor-pointer text-sm ${t.hoverBg} ${form.moduleName === name ? (isDark ? 'bg-cyan-500/20' : 'bg-cyan-50') : ''} ${t.text}`}
                          >
                            {name}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.text}`}>模块名称 *</label>
                <input
                  type="text"
                  value={form.moduleName}
                  onChange={(e) => onChange('moduleName', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                  placeholder="请输入模块名称"
                  required
                />
              </div>
            )}
          </div>

          {mode === 'create' && (
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.text}`}>模块种类</label>
                <select
                  value={form.category || ''}
                  onChange={(e) => onChange('category', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                  required
                >
                  <option value="">选择种类</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.text}`}>生产指令号</label>
                <input
                  type="text"
                  value={form.productionOrderNumber}
                  onChange={(e) => onChange('productionOrderNumber', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                  placeholder="可选"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${t.text}`}>阶段</label>
                  <select
                    value={form.stage || getDefaultStageForEntity('module')}
                    onChange={(e) => onChange('stage', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                  >
                    {STAGE_OPTIONS.map(stage => (
                      <option key={stage} value={stage}>{stage}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${t.text}`}>版本</label>
                  <input
                    type="text"
                    value={form.version}
                    onChange={(e) => onChange('version', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                    placeholder="如: v1.0"
                  />
                </div>
              </div>
            </div>
          )}

          {mode === 'edit' && (
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.text}`}>指令号</label>
                <input
                  type="text"
                  value={form.instructionNumber || ''}
                  onChange={(e) => handleInstructionNumberChange(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                  placeholder="字母、数字或字母数字组合，如: INS-001 或 ABC123"
                />
              </div>

              {systems.length > 0 && (
                <div>
                  <label className={`block text-sm font-medium mb-1 ${t.text}`}>关联系统</label>
                  <select
                    value={form.systemId || ''}
                    onChange={(e) => {
                      const sys = systems.find((s: any) => s.id === e.target.value);
                      onChange('systemId', e.target.value);
                      onChange('systemNumber', sys?.systemNumber || '');
                      onChange('systemName', sys?.systemName || '');
                    }}
                    className={`w-full px-3 py-2 border rounded-lg ${isDark ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  >
                    <option value="">选择系统（可选）</option>
                    {systems.map((sys: any) => (
                      <option key={sys.id} value={sys.id}>
                        {sys.systemName} ({sys.systemNumber})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className={`block text-sm font-medium mb-1 ${t.text}`}>生产指令号</label>
                <input
                  type="text"
                  value={form.productionOrderNumber}
                  onChange={(e) => onChange('productionOrderNumber', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                  placeholder="可选"
                />
              </div>

              {allHolders.length > 0 ? (
                <div ref={holderRef} className="relative">
                  <label className={`block text-sm font-medium mb-1 ${t.text}`}>负责人</label>
                  <div
                    className={`w-full px-3 py-2 border rounded-lg ${t.input} cursor-pointer min-h-[42px] flex flex-wrap gap-1 items-center`}
                    onClick={() => setShowHolderDropdown(!showHolderDropdown)}
                  >
                    {form.holder ? (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-sm ${isDark ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-700'}`}>
                        {form.holder}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onChange('holder', '');
                          }}
                          className="hover:text-red-400"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ) : (
                      <span className={`${t.text} opacity-60`}>点击选择或输入负责人</span>
                    )}
                  </div>
                  {showHolderDropdown && (
                    <div className={`absolute z-10 w-full mt-1 border rounded-lg shadow-lg ${t.card} ${t.border} max-h-60 overflow-hidden`}>
                      <div className={`p-2 border-b ${t.border}`}>
                        <div className="relative">
                          <Search size={14} className={`absolute left-2 top-1/2 -translate-y-1/2 ${t.text}`} />
                          <input
                            type="text"
                            value={holderSearch}
                            onChange={e => setHolderSearch(e.target.value)}
                            className={`w-full pl-7 pr-3 py-1.5 text-sm border rounded ${t.border} ${t.text} ${t.card}`}
                            placeholder="搜索负责人..."
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="max-h-40 overflow-y-auto">
                        {filteredHolders.length === 0 ? (
                          <div className={`px-3 py-2 text-sm ${t.text}`}>无匹配结果，请手动输入</div>
                        ) : (
                          filteredHolders.map(holder => (
                            <div
                              key={holder}
                              onClick={() => {
                                onChange('holder', holder);
                                setShowHolderDropdown(false);
                                setHolderSearch('');
                              }}
                              className={`px-3 py-2 cursor-pointer text-sm ${t.hoverBg} ${form.holder === holder ? (isDark ? 'bg-purple-500/20' : 'bg-purple-50') : ''} ${t.text}`}
                            >
                              {holder}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className={`block text-sm font-medium mb-1 ${t.text}`}>负责人</label>
                  <input
                    type="text"
                    value={form.holder}
                    onChange={(e) => onChange('holder', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                    placeholder="可选"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${t.text}`}>阶段</label>
                  <select
                    value={form.stage || getDefaultStageForEntity('module')}
                    onChange={(e) => onChange('stage', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                  >
                    {STAGE_OPTIONS.map(stage => (
                      <option key={stage} value={stage}>{stage}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${t.text}`}>版本</label>
                  <input
                    type="text"
                    value={form.version}
                    onChange={(e) => onChange('version', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                    placeholder="如: v1.0"
                  />
                </div>
              </div>
            </div>
          )}
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ease-out focus:outline-none ${t.cancelButton}`}>
              取消
            </button>
            <button type="submit" className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ease-out focus:outline-none ${t.button}`}>
              {mode === 'create' ? '创建' : '确认'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}