import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Plus, Package, Edit2, Trash2, RefreshCw, Download, Upload, Copy, Search, X, Loader2, Check, FileSearch } from 'lucide-react';
import { useThemeStyles } from '../../../hooks/useThemeStyles';
import { useToast } from '../../../components/Toast';
import type { Module, Software, Component } from '../../../types';

interface SoftwareListProps {
  projectId: string;
  software: Software[];
  modules: Module[];
  canEdit: boolean;
  onAddSoftware: () => void;
  onEditSoftware: (software: Software) => void;
  onSaveSoftware: (software: Software, updates: { name?: string; version?: string; adaptedComponentIds?: string[] }) => void;
  onDeleteSoftware: (softwareId: string) => void;
  onUpdateVersion: (software: Software) => void;
  onSyncSoftware: (software: Software) => void;
  onSyncToComponents?: (software: Software, componentIds: string[]) => void;
  onDownloadSoftware: (software: Software) => void;
  onUploadSoftware: (softwareId: string, file: File) => void;
  onVersionUpdate?: (software: Software, newVersion: string) => void;
}

interface EditModalProps {
  show: boolean;
  software: Software | null;
  modules: Module[];
  onClose: () => void;
  onSave: (software: Software, updates: { name?: string; version?: string; adaptedComponentIds?: string[] }) => void;
}

function EditSoftwareModal({ show, software, modules, onClose, onSave }: EditModalProps) {
  const t = useThemeStyles();
  const { showToast } = useToast();
  const [editForm, setEditForm] = useState({
    name: software?.name || '',
    version: software?.version || '',
    adaptedComponentIds: software?.adaptedComponentIds ? [...new Set(software.adaptedComponentIds)] : [],
  });
  const [isSaving, setIsSaving] = useState(false);

  const allComponents = useMemo(() => {
    const seen = new Set<string>();
    const comps: Component[] = [];
    modules.forEach(mod => {
      (mod.components || []).forEach(comp => {
        if (!seen.has(comp.componentName)) {
          seen.add(comp.componentName);
          comps.push(comp);
        }
      });
    });
    return comps;
  }, [modules]);

  React.useEffect(() => {
    if (software) {
      const uniqueIds = [...new Set(software.adaptedComponentIds || [])];
      setEditForm({
        name: software.name,
        version: software.version,
        adaptedComponentIds: uniqueIds,
      });
    }
  }, [software]);

  const handleSave = useCallback(async () => {
    if (!editForm.name.trim()) {
      showToast('软件名称不能为空', 'error');
      return;
    }
    if (!editForm.version.trim()) {
      showToast('版本号不能为空', 'error');
      return;
    }

    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      const uniqueAdaptedIds = [...new Set(editForm.adaptedComponentIds)];
      onSave(software!, {
        name: editForm.name.trim(),
        version: editForm.version.trim(),
        adaptedComponentIds: uniqueAdaptedIds,
      });
      showToast('软件信息已更新', 'success');
      onClose();
    } catch {
      showToast('保存失败，请重试', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [editForm, software, onSave, onClose, showToast]);

  if (!show || !software) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className={`${t.modalBg} rounded-lg p-6 w-full max-w-lg border ${t.modalBorder} max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        <h2 className={`text-xl font-semibold mb-4 ${t.text}`}>编辑软件</h2>
        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>软件名称 *</label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
              placeholder="请输入软件名称"
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>版本号 *</label>
            <input
              type="text"
              value={editForm.version}
              onChange={(e) => setEditForm(prev => ({ ...prev, version: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
              placeholder="如: v1.0"
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${t.textSecondary}`}>
              适配组件（可多选）
            </label>
            <div className={`max-h-48 overflow-y-auto border rounded-lg p-3 ${t.border}`}>
              {allComponents.length === 0 ? (
                <p className={`text-sm ${t.textMuted}`}>暂无可选组件</p>
              ) : (
                allComponents.map((comp) => (
                  <div key={comp.id} className="flex items-center gap-2 py-1">
                    <input
                      type="checkbox"
                      id={`comp-${comp.id}`}
                      checked={editForm.adaptedComponentIds.includes(comp.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEditForm(prev => ({
                            ...prev,
                            adaptedComponentIds: [...prev.adaptedComponentIds, comp.id]
                          }));
                        } else {
                          setEditForm(prev => ({
                            ...prev,
                            adaptedComponentIds: prev.adaptedComponentIds.filter(id => id !== comp.id)
                          }));
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-cyan-500 focus:ring-cyan-500"
                    />
                    <label htmlFor={`comp-${comp.id}`} className={`text-sm cursor-pointer hover:${t.accentText} ${t.text}`}>
                      {comp.componentName}
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-3 pt-4 mt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className={`flex-1 py-2 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg} disabled:opacity-50`}
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`flex-1 py-2 ${t.button} rounded-lg disabled:opacity-50 flex items-center justify-center gap-2`}
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                保存中...
              </>
            ) : (
              '保存'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

interface SyncModalProps {
  show: boolean;
  software: Software | null;
  modules: Module[];
  onClose: () => void;
  onSync: (software: Software, componentIds: string[]) => void;
}

function SyncSoftwareModal({ show, software, modules, onClose, onSync }: SyncModalProps) {
  const t = useThemeStyles();
  const { showToast } = useToast();
  const [selectedComponentIds, setSelectedComponentIds] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  React.useEffect(() => {
    if (software) {
      const uniqueIds = [...new Set(software.adaptedComponentIds || [])];
      setSelectedComponentIds(uniqueIds);
    }
  }, [software]);

  const adaptedComponentIds = software?.adaptedComponentIds || [];

  const adaptedComponentsByModule = useMemo(() => {
    if (!software || adaptedComponentIds.length === 0) return {};

    const seenIds = new Set<string>();
    const groups: Record<string, Component[]> = {};
    modules.forEach(module => {
      const adaptedInModule = (module.components || []).filter(c => {
        if (seenIds.has(c.id)) return false;
        if (adaptedComponentIds.includes(c.id)) {
          seenIds.add(c.id);
          return true;
        }
        return false;
      });
      if (adaptedInModule.length > 0) {
        groups[module.moduleName] = adaptedInModule;
      }
    });
    return groups;
  }, [modules, software, adaptedComponentIds]);

  const handleToggleComponent = useCallback((componentId: string) => {
    setSelectedComponentIds(prev => {
      if (prev.includes(componentId)) {
        return prev.filter(id => id !== componentId);
      } else {
        return [...prev, componentId];
      }
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    const allAdaptedIds = Object.values(adaptedComponentsByModule).flat().map(c => c.id);
    if (selectedComponentIds.length === allAdaptedIds.length && allAdaptedIds.length > 0) {
      setSelectedComponentIds([]);
    } else {
      setSelectedComponentIds(allAdaptedIds);
    }
  }, [selectedComponentIds, adaptedComponentsByModule]);

  const handleSync = useCallback(async () => {
    if (!software) return;

    setIsSyncing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      onSync(software, selectedComponentIds);
      showToast(`成功同步到 ${selectedComponentIds.length} 个组件`, 'success');
      onClose();
    } catch {
      showToast('同步失败，请重试', 'error');
    } finally {
      setIsSyncing(false);
    }
  }, [software, selectedComponentIds, onSync, onClose, showToast]);

  if (!show || !software) return null;

  const allAdaptedComponents = Object.values(adaptedComponentsByModule).flat();
  const allAdaptedIds = allAdaptedComponents.map(c => c.id);
  const isAllSelected = selectedComponentIds.length === allAdaptedIds.length && allAdaptedIds.length > 0;
  const isIndeterminate = selectedComponentIds.length > 0 && selectedComponentIds.length < allAdaptedIds.length;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className={`${t.modalBg} rounded-lg p-6 w-full max-w-2xl border ${t.modalBorder} max-h-[90vh] overflow-y-auto shadow-xl`} onClick={(e) => e.stopPropagation()}>
        <h2 className={`text-xl font-bold mb-3 ${t.text}`}>同步软件到组件</h2>
        <div className={`text-sm mb-4 ${t.textSecondary}`}>
          <span className="mr-2">软件:</span>
          <span className={`font-semibold ${t.text}`}>{software.name}</span>
          <span className="mx-2">|</span>
          <span>版本: {software.version}</span>
        </div>

        {allAdaptedComponents.length === 0 ? (
          <div className={`text-center py-12 rounded-lg ${t.hoverBg}`}>
            <div className="mb-4">
              <RefreshCw size={48} className="mx-auto opacity-40" />
            </div>
            <p className={`text-base font-medium mb-2 ${t.text}`}>该软件尚未配置适配组件</p>
            <p className={`text-sm ${t.textMuted}`}>请先编辑软件，添加需要适配的组件后再进行同步</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(el) => { if (el) el.indeterminate = isIndeterminate; }}
                  onChange={handleSelectAll}
                  className="checkbox-interactive rounded w-5 h-5"
                />
                <span className={`text-base font-medium ${t.text}`}>全选</span>
              </label>
              <div className={`text-sm ${t.textMuted}`}>
                已选择 <span className={`font-semibold ${t.accentText}`}>{selectedComponentIds.length}</span> / {allAdaptedIds.length} 个组件
              </div>
            </div>

            <div className={`border rounded-lg ${t.border} max-h-80 overflow-y-auto`}>
              {Object.entries(adaptedComponentsByModule).map(([moduleName, moduleComponents]) => (
                <div key={moduleName} className={`border-b last:border-b-0 ${t.border}`}>
                  <div className={`px-4 py-2.5 text-sm font-semibold border-b ${t.border} bg-gray-100 dark:bg-gray-800 ${t.text}`}>
                    {moduleName}
                  </div>
                  <div className="p-2">
                    {moduleComponents.map(comp => {
                      const isSelected = selectedComponentIds.includes(comp.id);
                      return (
                        <label
                          key={comp.id}
                          className={`flex items-center gap-3 py-2.5 px-3 rounded-lg cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-blue-100 dark:bg-blue-900/30'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleComponent(comp.id)}
                            className="checkbox-interactive rounded w-4 h-4"
                          />
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-medium truncate ${t.text}`}>{comp.componentName}</div>
                            <div className={`text-xs truncate ${t.textSecondary}`}>
                              编号: <span className="font-mono">{comp.componentNumber}</span>
                            </div>
                          </div>
                          {isSelected && (
                            <Check size={16} className={`${t.accentText} flex-shrink-0`} />
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-4 mt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                disabled={isSyncing}
                className={`flex-1 py-2.5 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg} disabled:opacity-50 transition-opacity`}
              >
                取消
              </button>
              <button
                onClick={handleSync}
                disabled={isSyncing || selectedComponentIds.length === 0}
                className={`flex-1 py-2.5 ${t.button} rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-opacity`}
              >
                {isSyncing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>同步中...</span>
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    <span>确认同步</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function SoftwareList({
  software,
  modules,
  canEdit,
  onAddSoftware,
  onEditSoftware,
  onSaveSoftware,
  onDeleteSoftware,
  onSyncSoftware,
  onSyncToComponents,
  onDownloadSoftware,
  onUploadSoftware,
  onVersionUpdate,
}: SoftwareListProps) {
  const t = useThemeStyles();
  const { showToast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSoftware, setEditingSoftware] = useState<Software | null>(null);
  const [syncingSoftware, setSyncingSoftware] = useState<Software | null>(null);
  const [versionUpdateSoftware, setVersionUpdateSoftware] = useState<Software | null>(null);
  const [versionInput, setVersionInput] = useState('');
  const [isUpdatingVersion, setIsUpdatingVersion] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const incrementVersion = useCallback((version: string): string => {
    const parts = version.split('.');
    if (parts.length >= 3) {
      const patch = parseInt(parts[2]) || 0;
      parts[2] = (patch + 1).toString();
      return parts.join('.');
    }
    return version + '.1';
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>, softwareId: string) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadSoftware(softwareId, file);
      showToast(`正在上传文件: ${file.name}`, 'info');
      e.target.value = '';
    }
  }, [onUploadSoftware, showToast]);

  const handleVersionIncrement = useCallback(() => {
    if (versionUpdateSoftware) {
      setVersionInput(incrementVersion(versionUpdateSoftware.version));
    }
  }, [versionUpdateSoftware, incrementVersion]);

  const handleVersionUpdate = useCallback(async () => {
    if (!versionUpdateSoftware || !versionInput.trim()) {
      showToast('请输入有效的版本号', 'error');
      return;
    }

    setIsUpdatingVersion(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      if (onVersionUpdate) {
        onVersionUpdate(versionUpdateSoftware, versionInput.trim());
      }
      showToast(`版本已更新为 ${versionInput}`, 'success');
      setVersionUpdateSoftware(null);
      setVersionInput('');
    } catch {
      showToast('版本更新失败', 'error');
    } finally {
      setIsUpdatingVersion(false);
    }
  }, [versionUpdateSoftware, versionInput, onVersionUpdate, showToast]);

  const handleEditSave = useCallback((software: Software, updates: { name?: string; version?: string; adaptedComponentIds?: string[] }) => {
    const allComps = modules.flatMap(m => m.components || []);
    const adaptedComponents = allComps
      .filter(c => updates.adaptedComponentIds?.includes(c.id))
      .map(c => ({ id: c.id, name: c.componentName }));

    const updatedSoftware: Software = {
      ...software,
      name: updates.name || software.name,
      version: updates.version || software.version,
      adaptedComponentIds: updates.adaptedComponentIds || software.adaptedComponentIds,
      adaptedComponents: adaptedComponents.length > 0 ? adaptedComponents : software.adaptedComponents,
    };
    onSaveSoftware(updatedSoftware, updates);
  }, [modules, onSaveSoftware]);

  const handleSync = useCallback((software: Software, componentIds: string[]) => {
    if (onSyncToComponents) {
      onSyncToComponents(software, componentIds);
    } else {
      onSyncSoftware(software);
    }
  }, [onSyncToComponents, onSyncSoftware]);

  const categoryInfo = useMemo(() => {
    const categories = [...new Set(modules.map(m => m.category).filter(Boolean))];
    return categories.map(category => {
      const categoryModules = modules.filter(m => m.category === category);
      const moduleIds = categoryModules.map(m => m.id);
      const categorySoftware = software.filter(s => {
        const adaptedIds = s.adaptedComponentIds || [];
        return categoryModules.some(cm => 
          cm.components?.some(c => adaptedIds.includes(c.id)) ||
          adaptedIds.some(id => {
            const comp = categoryModules.flatMap(cm => cm.components || []).find(c => c.id === id);
            return comp;
          })
        );
      });
      const completed = categorySoftware.filter(s => s.status === '已完成').length;
      const total = categorySoftware.length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
      return { category, completed, total, percentage, moduleIds };
    });
  }, [modules, software]);

  const getCategoryButtonStyle = (category: string, info: { category: string; completed: number; total: number; percentage: number }) => {
    const isSelected = selectedCategory === category;
    const isOtherSelected = selectedCategory !== null && !isSelected;
    const isAllCompleted = info.total > 0 && info.completed === info.total;
    
    const colors = {
      primary: { active: 'bg-blue-500', light: 'bg-blue-100 border-blue-300', dark: 'text-blue-900', ring: 'ring-blue-400' },
      green: { active: 'bg-green-500', light: 'bg-green-100 border-green-300', dark: 'text-green-900', ring: 'ring-green-400' },
      yellow: { active: 'bg-yellow-500', light: 'bg-yellow-100 border-yellow-300', dark: 'text-yellow-900', ring: 'ring-yellow-400' },
      orange: { active: 'bg-orange-500', light: 'bg-orange-100 border-orange-300', dark: 'text-orange-900', ring: 'ring-orange-400' },
      purple: { active: 'bg-purple-500', light: 'bg-purple-100 border-purple-300', dark: 'text-purple-900', ring: 'ring-purple-400' },
      pink: { active: 'bg-pink-500', light: 'bg-pink-100 border-pink-300', dark: 'text-pink-900', ring: 'ring-pink-400' },
      indigo: { active: 'bg-indigo-500', light: 'bg-indigo-100 border-indigo-300', dark: 'text-indigo-900', ring: 'ring-indigo-400' },
      red: { active: 'bg-red-500', light: 'bg-red-100 border-red-300', dark: 'text-red-900', ring: 'ring-red-400' },
    };
    
    const colorKeys = Object.keys(colors) as (keyof typeof colors)[];
    const colorIndex = categoryInfo.findIndex(c => c.category === category) % colorKeys.length;
    const colorScheme = colors[colorKeys[colorIndex]];

    return {
      flex: isSelected ? '4' : isOtherSelected ? '0 0 5%' : '1',
      minWidth: isOtherSelected ? '0' : '60px',
      opacity: isOtherSelected ? 0.3 : 1,
      colors: colorScheme,
      isSelected,
      isAllCompleted,
    };
  };

  const filteredSoftware = useMemo(() => {
    let result = software;

    if (selectedCategory) {
      const info = categoryInfo.find(c => c.category === selectedCategory);
      if (info) {
        result = result.filter(s => {
          const adaptedIds = s.adaptedComponentIds || [];
          return info.moduleIds.some(moduleId => {
            const module = modules.find(m => m.id === moduleId);
            return module?.components?.some(c => adaptedIds.includes(c.id));
          });
        });
      }
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(s => s.name.toLowerCase().includes(query));
    }

    return result.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
  }, [software, selectedCategory, categoryInfo, modules, searchQuery]);

  if (software.length === 0) {
    return (
      <div className="space-y-4">
        <div className={`${t.card} rounded-lg shadow-sm border ${t.border} p-6`}>
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${t.textMuted}`} size={16} />
                <input
                  type="text"
                  placeholder="搜索软件..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className={`pl-10 pr-10 py-2 border rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary-500 ${t.input}`}
                />
                {searchQuery && (
                  <button
                    onClick={handleClearSearch}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 ${t.textMuted} hover:${t.text}`}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              {canEdit && (
                <button
                  onClick={onAddSoftware}
                  className={`flex items-center gap-2 px-4 py-2 ${t.button} rounded-lg text-sm`}
                >
                  <Plus size={16} />
                  新建
                </button>
              )}
            </div>
          </div>
        </div>
        <div className={`text-center py-12 ${t.card} rounded-lg border ${t.border}`}>
          <Package className={`mx-auto ${t.textMuted} mb-4`} size={48} />
          <p className={t.textMuted}>暂无软件</p>
          {canEdit && (
            <button
              onClick={onAddSoftware}
              className={`mt-4 flex items-center gap-2 px-4 py-2 ${t.button} rounded-lg mx-auto`}
            >
              <Plus size={18} />
              新建
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {categoryInfo.length > 0 && (
        <div className="flex gap-1 h-20">
          {categoryInfo.map(({ category, completed, total, percentage }) => {
            const style = getCategoryButtonStyle(category, { category, completed, total, percentage });
            return (
              <button
                key={category}
                onClick={() => {
                  setSelectedCategory(style.isSelected ? null : category);
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
                    {category}
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
      )}

      <div className={`${t.card} rounded-lg shadow-sm border ${t.border} p-4`}>
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${t.textMuted}`} size={16} />
              <input
                type="text"
                placeholder="搜索软件..."
                value={searchQuery}
                onChange={handleSearchChange}
                className={`pl-10 pr-10 py-2 border rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary-500 ${t.input}`}
              />
              {searchQuery && (
                <button
                  onClick={handleClearSearch}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${t.textMuted} hover:${t.text}`}
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {searchQuery && (
              <span className={`text-sm ${t.textMuted}`}>
                找到 {filteredSoftware.length} 个结果
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            {canEdit && (
              <button
                onClick={onAddSoftware}
                className={`flex items-center gap-2 px-4 py-2 ${t.button} rounded-lg text-sm`}
              >
                <Plus size={16} />
                新建
              </button>
            )}
          </div>
        </div>

        {filteredSoftware.length === 0 && searchQuery && (
          <div className={`text-center py-8 ${t.textMuted}`}>
            <Search className={`mx-auto mb-2`} size={32} />
            <p>未找到匹配的软件</p>
            <p className="text-sm mt-1">尝试调整搜索关键词</p>
          </div>
        )}

        {filteredSoftware.length > 0 && (
          <table className="w-full">
            <thead className={t.tableHeader}>
              <tr>
                <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>软件名称</th>
                <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>版本</th>
                <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>大小</th>
                <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>MD5码</th>
                <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>状态</th>
                <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredSoftware.map((soft) => (
                <tr key={soft.id} className={`border-t ${t.border} ${t.hoverBg}`}>
                  <td className={`px-4 py-3 ${t.text}`}>{soft.name}</td>
                  <td className={`px-4 py-3 ${t.textSecondary}`}>{soft.version}</td>
                  <td className={`px-4 py-3 ${t.textSecondary}`}>
                    {soft.fileSize ? `${(soft.fileSize / 1024 / 1024).toFixed(2)} MB` : '-'}
                  </td>
                  <td className={`px-4 py-3 ${t.textSecondary}`}>
                    {soft.md5 ? (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(soft.md5 || '');
                          showToast('MD5已复制到剪贴板', 'success');
                        }}
                        className={`flex items-center gap-1 text-xs ${t.textMuted} hover:${t.accentText} font-mono`}
                      >
                        <Copy size={12} />
                        {soft.md5.substring(0, 12)}...
                      </button>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      soft.status === '已完成' ? t.success : t.badge
                    }`}>
                      {soft.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setVersionUpdateSoftware(soft);
                          setVersionInput(incrementVersion(soft.version));
                        }}
                        className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${t.textMuted}`}
                        title="更新版本"
                      >
                        <FileSearch size={14} />
                      </button>
                      <button
                        onClick={() => setEditingSoftware(soft)}
                        className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${t.textMuted}`}
                        title="编辑"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => setSyncingSoftware(soft)}
                        className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${t.textMuted}`}
                        title="同步到组件"
                      >
                        <RefreshCw size={14} />
                      </button>
                      <label className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${t.textMuted} cursor-pointer`} title="上传">
                        <Upload size={14} />
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          onChange={(e) => handleUpload(e, soft.id)}
                        />
                      </label>
                      <button
                        onClick={() => onDownloadSoftware(soft)}
                        className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${t.textMuted}`}
                        title="下载"
                      >
                        <Download size={14} />
                      </button>
                      {canEdit && (
                        <button
                          onClick={() => {
                            if (confirm('确定要删除该软件吗？')) {
                              onDeleteSoftware(soft.id);
                              showToast('软件已删除', 'success');
                            }
                          }}
                          className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${t.textMuted}`}
                          title="删除"
                        >
                          <Trash2 size={14} />
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

      <EditSoftwareModal
        key={editingSoftware?.id || 'new'}
        show={editingSoftware !== null}
        software={editingSoftware}
        modules={modules}
        onClose={() => setEditingSoftware(null)}
        onSave={handleEditSave}
      />

      <SyncSoftwareModal
        key={syncingSoftware?.id || 'new'}
        show={syncingSoftware !== null}
        software={syncingSoftware}
        modules={modules}
        onClose={() => setSyncingSoftware(null)}
        onSync={handleSync}
      />

      {versionUpdateSoftware && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setVersionUpdateSoftware(null)}>
          <div className={`${t.modalBg} rounded-lg p-6 w-full max-w-md border ${t.modalBorder}`} onClick={(e) => e.stopPropagation()}>
            <h2 className={`text-xl font-semibold mb-4 ${t.text}`}>更新软件版本</h2>
            <div className="space-y-4">
              <div>
                <div className={`text-sm ${t.textSecondary} mb-1`}>当前版本</div>
                <div className={`text-lg font-medium ${t.text}`}>{versionUpdateSoftware.version}</div>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>新版本号</label>
                <input
                  type="text"
                  value={versionInput}
                  onChange={(e) => setVersionInput(e.target.value)}
                  placeholder="如: 1.0.1"
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleVersionIncrement}
                  className={`px-3 py-2 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg} text-sm flex items-center gap-1`}
                >
                  <Plus size={14} /> 自动+1
                </button>
              </div>
              <div className={`text-xs ${t.textMuted}`}>
                格式说明：主版本号.次版本号.修订号（如 1.0.1）
              </div>
            </div>
            <div className="flex gap-3 pt-4 mt-4 border-t">
              <button
                type="button"
                onClick={() => setVersionUpdateSoftware(null)}
                disabled={isUpdatingVersion}
                className={`flex-1 py-2 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg} disabled:opacity-50`}
              >
                取消
              </button>
              <button
                onClick={handleVersionUpdate}
                disabled={isUpdatingVersion}
                className={`flex-1 py-2 ${t.button} rounded-lg disabled:opacity-50 flex items-center justify-center gap-2`}
              >
                {isUpdatingVersion ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    更新中...
                  </>
                ) : (
                  '确认更新'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SoftwareList;