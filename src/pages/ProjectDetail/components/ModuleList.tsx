import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Package, Copy, Trash2, Edit2, ChevronRight, Search, X, Loader2 } from 'lucide-react';
import { useThemeStyles } from '../../../hooks/useThemeStyles';
import { useToast } from '../../../components/Toast';
import { BatchOperationsBar } from '../../../components/BatchOperationsBar';
import { ConfirmModal } from './ConfirmModal';
import type { Module, ProjectStage } from '../../../types';

interface ModuleListProps {
  projectId: string;
  modules: Module[];
  categories: string[];
  canEdit: boolean;
  onAddModule: () => void;
  onEditModule: (module: Module) => void;
  onDeleteModule: (moduleId: string) => void;
  onCopyModule: (module: Module, newNumber: string) => void;
  onBatchUpdateStage?: (moduleIds: string[], stage: ProjectStage) => Promise<void>;
  onBatchUpdateVersion?: (moduleIds: string[], version: string) => Promise<void>;
  onBatchDelete?: (moduleIds: string[]) => Promise<void>;
}

const STATUS_LIST = ['未投产', '投产中', '正常', '维修中', '三防中', '测试中', '仿真中', '借用中', '故障'] as const;
type StatusType = typeof STATUS_LIST[number];
const STAGE_OPTIONS: ProjectStage[] = ['F阶段', 'C阶段', 'S阶段', 'D阶段', 'P阶段'];

export function ModuleList({
  modules,
  categories,
  canEdit,
  onAddModule,
  onEditModule,
  onDeleteModule,
  onCopyModule,
  onBatchUpdateStage,
  onBatchUpdateVersion,
  onBatchDelete,
}: ModuleListProps) {
  const t = useThemeStyles();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [modulePage, setModulePage] = useState(1);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [selectedModuleIds, setSelectedModuleIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [showStageModal, setShowStageModal] = useState(false);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [batchStage, setBatchStage] = useState<ProjectStage>('C阶段');
  const [batchVersion, setBatchVersion] = useState('');
  const MODULE_PAGE_SIZE = 15;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setSelectedModuleIds(new Set());
    setModulePage(1);
  }, [modules]);

  const filteredModules = useMemo(() => {
    return modules.filter(m =>
      (!selectedStatus || m.status === selectedStatus) &&
      (!selectedCategory || m.category === selectedCategory) &&
      (!selectedStage || m.stage === selectedStage) &&
      (!debouncedSearchTerm ||
        m.moduleNumber.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        m.moduleName.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      )
    );
  }, [modules, selectedStatus, selectedCategory, selectedStage, debouncedSearchTerm]);

  const paginatedModules = useMemo(() => {
    const startIndex = (modulePage - 1) * MODULE_PAGE_SIZE;
    return filteredModules.slice(startIndex, startIndex + MODULE_PAGE_SIZE);
  }, [filteredModules, modulePage]);

  const totalPages = Math.ceil(filteredModules.length / MODULE_PAGE_SIZE);

  const selectedCount = selectedModuleIds.size;
  const isAllSelected = paginatedModules.length > 0 && paginatedModules.every(m => selectedModuleIds.has(m.id));
  const isIndeterminate = selectedCount > 0 && !isAllSelected;

  const handleToggleModule = useCallback((moduleId: string) => {
    setSelectedModuleIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
      } else {
        newSet.add(moduleId);
      }
      return newSet;
    });
  }, []);

  const handleToggleAll = useCallback(() => {
    if (isAllSelected) {
      setSelectedModuleIds(new Set());
    } else {
      setSelectedModuleIds(new Set(paginatedModules.map(m => m.id)));
    }
  }, [isAllSelected, paginatedModules]);

  const handleDeselectAll = useCallback(() => {
    setSelectedModuleIds(new Set());
  }, []);

  const handleBatchStageUpdate = async () => {
    if (!onBatchUpdateStage || selectedCount === 0) return;
    setShowStageModal(false);
    setIsLoading(true);
    try {
      await onBatchUpdateStage(Array.from(selectedModuleIds), batchStage);
      showToast(`已成功更新 ${selectedCount} 个模块的阶段`, 'success');
      setSelectedModuleIds(new Set());
    } catch (error) {
      showToast('批量更新阶段失败', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBatchVersionUpdate = async () => {
    if (!onBatchUpdateVersion || selectedCount === 0 || !batchVersion.trim()) return;
    setShowVersionModal(false);
    setIsLoading(true);
    try {
      await onBatchUpdateVersion(Array.from(selectedModuleIds), batchVersion.trim());
      showToast(`已成功更新 ${selectedCount} 个模块的版本`, 'success');
      setSelectedModuleIds(new Set());
    } catch (error) {
      showToast('批量更新版本失败', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBatchDeleteAction = async () => {
    if (!onBatchDelete || selectedCount === 0) return;
    setShowDeleteConfirm(false);
    setIsLoading(true);
    try {
      await onBatchDelete(Array.from(selectedModuleIds));
      showToast(`已成功删除 ${selectedCount} 个模块`, 'success');
      setSelectedModuleIds(new Set());
    } catch (error) {
      showToast('批量删除失败', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const categoryColors: Record<string, string> = {
    '控制类': 'bg-cyan-500',
    '通信类': 'bg-violet-500',
    '电源类': 'bg-amber-500',
    '传感类': 'bg-pink-500',
    '处理类': 'bg-emerald-500',
    '存储类': 'bg-indigo-500',
    '其他': 'bg-gray-500',
  };

  const statusColors: Record<StatusType, string> = {
    '未投产': 'bg-gray-400',
    '投产中': 'bg-blue-500',
    '正常': 'bg-green-500',
    '维修中': 'bg-orange-500',
    '三防中': 'bg-purple-500',
    '测试中': 'bg-yellow-500',
    '仿真中': 'bg-cyan-500',
    '借用中': 'bg-pink-500',
    '故障': 'bg-red-500',
  };

  const tailwindColorMap: Record<string, string> = {
    'bg-gray-400': '#9ca3af',
    'bg-blue-500': '#3b82f6',
    'bg-green-500': '#22c55e',
    'bg-orange-500': '#f97316',
    'bg-purple-500': '#a855f7',
    'bg-yellow-500': '#eab308',
    'bg-cyan-500': '#06b6d4',
    'bg-pink-500': '#ec4899',
    'bg-red-500': '#ef4444',
  };

  const getTailwindColor = (className: string): string => {
    return tailwindColorMap[className] || '#9ca3af';
  };

  const stageInfo = useMemo(() => {
    return (['F阶段', 'C阶段', 'S阶段', 'D阶段', 'P阶段'] as const).map(stage => {
      const stageModules = modules.filter(m => m.stage === stage);
      const total = stageModules.length;
      const statusCounts: Record<StatusType, number> = {} as Record<StatusType, number>;
      STATUS_LIST.forEach(s => { statusCounts[s] = 0; });
      stageModules.forEach(m => {
        if (STATUS_LIST.includes(m.status as StatusType)) {
          statusCounts[m.status as StatusType]++;
        }
      });
      return { stage, total, statusCounts };
    });
  }, [modules]);

  const getStageButtonStyle = (stage: string, info: typeof stageInfo[0]) => {
    const isSelected = selectedStage === stage;
    const isOtherSelected = selectedStage !== null && !isSelected;
    const isAllCompleted = info.total > 0 && info.statusCounts['正常'] === info.total;
    const colors = {
      'F阶段': { active: 'bg-rose-500', light: 'bg-rose-100 border-rose-300', dark: 'text-rose-900', ring: 'ring-rose-400' },
      'C阶段': { active: 'bg-blue-500', light: 'bg-blue-100 border-blue-300', dark: 'text-blue-900', ring: 'ring-blue-400' },
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

  const handleCopyModule = (module: Module) => {
    const numMatch = module.moduleNumber.match(/\d+/);
    const num = numMatch ? parseInt(numMatch[0]) + 1 : 1;
    const prefix = numMatch ? module.moduleNumber.slice(0, numMatch.index) : module.moduleNumber;
    const suffix = numMatch ? module.moduleNumber.slice(numMatch.index! + numMatch[0].length) : '';
    const newNumber = prefix + num + suffix;
    onCopyModule(module, newNumber);
  };

  const handleRowClick = (e: React.MouseEvent, moduleId: string) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('input') || target.closest('[data-no-navigate]')) {
      return;
    }
    navigate(`/modules/${moduleId}`);
  };

  const handleDeleteModule = (moduleId: string) => {
    if (confirm('确定要删除该模块吗？')) {
      onDeleteModule(moduleId);
      showToast('模块已删除', 'success');
    }
  };

  const handleEditModule = (module: Module) => {
    onEditModule(module);
  };

  if (modules.length === 0) {
    return (
      <div className="space-y-4">
        <div className={`${t.card} rounded-lg shadow-sm border ${t.border} p-6`}>
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <select
                value={selectedStatus || ''}
                onChange={(e) => { setSelectedStatus(e.target.value || null); setModulePage(1); }}
                className={`px-3 py-2 border rounded-lg text-sm ${t.input}`}
              >
                <option value="">所有状态</option>
                {STATUS_LIST.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${t.textMuted}`} size={16} />
                <input
                  type="text"
                  placeholder="搜索模块..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setModulePage(1); }}
                  className={`pl-10 pr-10 py-2 border rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary-500 ${t.input}`}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
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
                  onClick={onAddModule}
                  className={`flex items-center gap-2 px-4 py-2 ${t.button} rounded-lg text-sm`}
                >
                  <Plus size={16} />
                  <span className="hidden sm:inline">新建模块</span>
                </button>
              )}
            </div>
          </div>
        </div>
        <div className={`text-center py-12 ${t.card} rounded-lg border ${t.border}`}>
          <Package className={`mx-auto ${t.textMuted} mb-4`} size={48} />
          <p className={t.textMuted}>暂无模块</p>
          {canEdit && (
            <button
              onClick={onAddModule}
              className={`mt-4 flex items-center gap-2 px-4 py-2 ${t.button} rounded-lg mx-auto`}
            >
              <Plus size={18} />
              新建模块
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 h-20 overflow-x-auto">
        {stageInfo.map(({ stage, total, statusCounts }) => {
          const style = getStageButtonStyle(stage, { stage, total, statusCounts });
          return (
            <button
              key={stage}
              onClick={() => {
                setSelectedStage(style.isSelected ? null : stage);
                setModulePage(1);
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
                <div className="w-full h-3 bg-white/40 rounded-full overflow-hidden shadow-inner border border-gray-200/30 flex">
                  {total > 0 ? (
                    STATUS_LIST.filter(s => statusCounts[s] > 0).map((s, idx, arr) => {
                      const width = (statusCounts[s] / total) * 100;
                      const isFirst = idx === 0;
                      const isLast = idx === arr.length - 1;
                      const nextStatus = arr[idx + 1];
                      return (
                        <div
                          key={s}
                          className="relative h-full"
                          style={{ width: `${width}%`, transition: 'width 500ms ease-out' }}
                          title={`${s}: ${statusCounts[s]}`}
                        >
                          <div
                            className={`absolute inset-0 ${statusColors[s]} ${isFirst ? 'rounded-l-full' : ''} ${isLast ? 'rounded-r-full' : ''}`}
                          />
                          {!isLast && nextStatus && statusCounts[nextStatus] > 0 && (
                            <div
                              className="absolute right-0 top-0 bottom-0"
                              style={{
                                width: '30%',
                                background: `linear-gradient(to right, transparent, ${getTailwindColor(statusColors[nextStatus])})`,
                              }}
                            />
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="w-full h-full bg-gray-300 rounded-full" />
                  )}
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
              value={selectedStatus || ''}
              onChange={(e) => { setSelectedStatus(e.target.value || null); setModulePage(1); }}
              className={`px-3 py-2 border rounded-lg text-sm ${t.input}`}
            >
              <option value="">所有状态</option>
              {STATUS_LIST.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              value={selectedCategory || ''}
              onChange={(e) => { setSelectedCategory(e.target.value || null); setModulePage(1); }}
              className={`px-3 py-2 border rounded-lg text-sm ${t.input}`}
            >
              <option value="">所有种类</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${t.textMuted}`} size={16} />
              <input
                type="text"
                placeholder="搜索模块..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setModulePage(1); }}
                className={`pl-10 pr-10 py-2 border rounded-lg text-sm w-40 sm:w-64 focus:outline-none focus:ring-2 focus:ring-primary-500 ${t.input}`}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${t.textMuted} hover:${t.text}`}
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {searchTerm && (
              <span className={`text-sm ${t.textMuted}`}>
                找到 {filteredModules.length} 个结果
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            {canEdit && (
              <button
                onClick={onAddModule}
                className={`flex items-center gap-2 px-4 py-2 ${t.button} rounded-lg text-sm`}
              >
                <Plus size={16} />
                <span className="hidden sm:inline">新建模块</span>
              </button>
            )}
          </div>
        </div>

        {filteredModules.length === 0 && searchTerm && (
          <div className={`text-center py-8 ${t.textMuted}`}>
            <Search className={`mx-auto mb-2`} size={32} />
            <p>未找到匹配的模块</p>
            <p className="text-sm mt-1">尝试调整搜索条件或关键词</p>
          </div>
        )}

        {filteredModules.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className={t.tableHeader}>
                <tr>
                  {canEdit && (
                    <th className="px-4 py-3 text-left text-sm font-medium w-12">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        ref={(el) => { if (el) el.indeterminate = isIndeterminate; }}
                        onChange={handleToggleAll}
                        className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                      />
                    </th>
                  )}
                  <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>模块编号</th>
                  <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>模块名称</th>
                  <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>种类</th>
                  <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>阶段</th>
                  <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>版本</th>
                  <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>状态</th>
                  <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>组件数</th>
                  <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>操作</th>
                </tr>
              </thead>
              <tbody>
                {paginatedModules.map((module) => (
                  <tr
                    key={module.id}
                    onClick={(e) => handleRowClick(e, module.id)}
                    className={`border-t ${t.border} ${t.hoverBg} cursor-pointer ${selectedModuleIds.has(module.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                  >
                    {canEdit && (
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedModuleIds.has(module.id)}
                          onChange={() => handleToggleModule(module.id)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                        />
                      </td>
                    )}
                    <td className={`px-4 py-3 ${t.text}`}>{module.moduleNumber}</td>
                    <td className={`px-4 py-3`}>
                      <Link
                        to={`/modules/${module.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className={`${t.text} hover:underline font-medium`}
                      >
                        {module.moduleName}
                      </Link>
                    </td>
                    <td className={`px-4 py-3`}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${categoryColors[module.category] || 'bg-gray-500'}`} />
                        <span className={`${t.textSecondary}`}>{module.category || '-'}</span>
                      </div>
                    </td>
                    <td className={`px-4 py-3 ${t.textSecondary}`}>{module.stage || '-'}</td>
                    <td className={`px-4 py-3 ${t.textSecondary}`}>{module.version || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        t.statusColors[module.status as keyof typeof t.statusColors] || t.statusColors['故障']
                      }`}>
                        {module.status}
                      </span>
                    </td>
                    <td className={`px-4 py-3 ${t.textSecondary}`}>{module.components?.length || 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 sm:gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => navigate(`/modules/${module.id}`)}
                          className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${t.textMuted}`}
                          title="查看详情"
                        >
                          <ChevronRight size={16} />
                        </button>
                        <button
                          onClick={() => handleCopyModule(module)}
                          className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${t.textMuted}`}
                          title="复制模块"
                        >
                          <Copy size={16} />
                        </button>
                        <button
                          onClick={() => handleEditModule(module)}
                          className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${t.textMuted}`}
                          title="编辑"
                        >
                          <Edit2 size={16} />
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => handleDeleteModule(module.id)}
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
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className={`flex items-center justify-between px-4 py-3 ${t.card} rounded-lg border ${t.border}`}>
          <div className={`text-sm ${t.textSecondary}`}>
            第 {modulePage} 页，共 {totalPages} 页
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setModulePage(p => Math.max(1, p - 1))}
              disabled={modulePage === 1}
              className={`px-3 py-1 border rounded ${t.button} disabled:opacity-50`}
            >
              上一页
            </button>
            <button
              onClick={() => setModulePage(p => Math.min(totalPages, p + 1))}
              disabled={modulePage >= totalPages}
              className={`px-3 py-1 border rounded ${t.button} disabled:opacity-50`}
            >
              下一页
            </button>
          </div>
        </div>
      )}

      {canEdit && onBatchUpdateStage && onBatchUpdateVersion && onBatchDelete && (
        <BatchOperationsBar
          selectedCount={selectedCount}
          totalCount={filteredModules.length}
          isAllSelected={isAllSelected}
          isIndeterminate={isIndeterminate}
          onToggleAll={handleToggleAll}
          onDeselectAll={handleDeselectAll}
          onBatchDelete={() => setShowDeleteConfirm(true)}
          onBatchUpdateStage={() => setShowStageModal(true)}
          onBatchUpdateVersion={() => setShowVersionModal(true)}
          itemType="模块"
          deleteLabel="删除"
          isUpdatingStage={isLoading}
          isUpdatingVersion={isLoading}
        />
      )}

      {canEdit && (
        <>
          <ConfirmModal
            show={showStageModal}
            title="批量修改阶段"
            message={
              <div className="space-y-3">
                <p>请选择目标阶段，然后确认修改选中的 {selectedCount} 个模块。</p>
                <select
                  value={batchStage}
                  onChange={(e) => setBatchStage(e.target.value as ProjectStage)}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                >
                  {STAGE_OPTIONS.map(stage => (
                    <option key={stage} value={stage}>{stage}</option>
                  ))}
                </select>
              </div>
            }
            onConfirm={handleBatchStageUpdate}
            onCancel={() => setShowStageModal(false)}
            type="info"
            confirmText="确认修改"
            cancelText="取消"
          />

          <ConfirmModal
            show={showVersionModal}
            title="批量修改版本"
            message={
              <div className="space-y-3">
                <p>请输入目标版本，然后确认修改选中的 {selectedCount} 个模块。</p>
                <input
                  type="text"
                  value={batchVersion}
                  onChange={(e) => setBatchVersion(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                  placeholder="如: v1.0"
                />
              </div>
            }
            onConfirm={handleBatchVersionUpdate}
            onCancel={() => setShowVersionModal(false)}
            type="info"
            confirmText="确认修改"
            cancelText="取消"
          />

          <ConfirmModal
            show={showDeleteConfirm}
            title="确认批量删除"
            message={`确定要删除选中的 ${selectedCount} 个模块吗？此操作不可恢复！`}
            onConfirm={handleBatchDeleteAction}
            onCancel={() => setShowDeleteConfirm(false)}
            type="danger"
            confirmText="删除"
            cancelText="取消"
          />
        </>
      )}

      <div
        className={`fixed inset-0 z-40 bg-black/30 ${showStageModal || showVersionModal || showDeleteConfirm ? 'block' : 'hidden'}`}
        onClick={() => {
          if (!isLoading) {
            setShowStageModal(false);
            setShowVersionModal(false);
            setShowDeleteConfirm(false);
          }
        }}
      />
    </div>
  );
}

export default ModuleList;