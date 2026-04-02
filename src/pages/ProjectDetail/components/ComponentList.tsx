import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, Copy, Trash2, Edit2, Search, X, Plus, CheckSquare, Square, ArrowUp, ArrowDown } from 'lucide-react';
import { useThemeStyles } from '../../../hooks/useThemeStyles';
import { useToast } from '../../../components/Toast';
import { EnhancedComponentStatusModal } from './EnhancedComponentStatusModal';
import { BatchOperationsBar } from '../../../components/BatchOperationsBar';
import { ConfirmModal } from './ConfirmModal';
import type { Component, ComponentStatus } from '../../../types';
import { STAGE_OPTIONS, getDefaultStageForEntity } from '../../../services/stageConfig';

interface ComponentListProps {
  modules: any[];
  canEdit: boolean;
  onAddComponent: () => void;
  onEditComponent: (component: any) => void;
  onDeleteComponent: (moduleId: string, componentId: string) => void;
  onCopyComponent: (component: any) => void;
  onStatusChange?: (component: any) => void;
  onStatusChangeWithReason?: (componentId: string, moduleId: string, newStatus: ComponentStatus, reason: string) => Promise<{ success: boolean; error?: string; errorType?: 'network' | 'permission' | 'validation' | 'unknown' }>;
  onBatchDeleteComponents?: (moduleIdComponentIds: { moduleId: string; componentId: string }[]) => Promise<void>;
  onBatchUpdateStatus?: (moduleIdComponentIds: { moduleId: string; componentId: string }[], newStatus: ComponentStatus) => Promise<void>;
  onBatchUpdateStage?: (moduleIdComponentIds: { moduleId: string; componentId: string }[], newStage: string) => Promise<void>;
  onBatchUpdateVersion?: (moduleIdComponentIds: { moduleId: string; componentId: string }[], newVersion: string) => Promise<void>;
}

const STATUS_LIST = ['未投产', '投产中', '正常', '维修中', '三防中', '测试中', '仿真中', '借用中', '故障'] as const;
type StatusType = typeof STATUS_LIST[number];

export function ComponentList({
  modules,
  canEdit,
  onAddComponent,
  onEditComponent,
  onDeleteComponent,
  onCopyComponent,
  onStatusChange,
  onStatusChangeWithReason,
  onBatchDeleteComponents,
  onBatchUpdateStatus,
  onBatchUpdateStage,
  onBatchUpdateVersion,
}: ComponentListProps) {
  const t = useThemeStyles();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [componentSearchTerm, setComponentSearchTerm] = useState('');
  const [debouncedComponentSearchTerm, setDebouncedComponentSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedComponentName, setSelectedComponentName] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [componentPage, setComponentPage] = useState(1);
  const COMPONENT_PAGE_SIZE = 15;
  const [enhancedStatusModal, setEnhancedStatusModal] = useState<{
    isOpen: boolean;
    component: Component | null;
    currentStatus: ComponentStatus;
  }>({ isOpen: false, component: null, currentStatus: '正常' as ComponentStatus });
  const [selectedComponents, setSelectedComponents] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showStageModal, setShowStageModal] = useState(false);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [batchStatus, setBatchStatus] = useState<ComponentStatus>('正常');
  const [batchStage, setBatchStage] = useState<ProjectStage>(getDefaultStageForEntity('component') as ProjectStage);
  const [batchVersion, setBatchVersion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sortField, setSortField] = useState<string>('componentName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedComponentSearchTerm(componentSearchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [componentSearchTerm]);

  useEffect(() => {
    setComponentPage(1);
    setSelectedComponents(new Set());
  }, [selectedStage, selectedStatus, selectedComponentName]);

  const allComponents = useMemo(() => {
    return modules.flatMap(m => m.components.map((c: any) => ({ ...c, moduleName: m.moduleName, moduleId: m.id })));
  }, [modules]);

  const filteredComponents = useMemo(() => {
    return allComponents
      .filter(c =>
        (!selectedStatus || c.status === selectedStatus) &&
        (!selectedComponentName || c.componentName === selectedComponentName) &&
        (!selectedStage || c.stage === selectedStage) &&
        (!debouncedComponentSearchTerm ||
          c.componentNumber.toLowerCase().includes(debouncedComponentSearchTerm.toLowerCase()) ||
          c.componentName.toLowerCase().includes(debouncedComponentSearchTerm.toLowerCase())
        )
      )
      .sort((a: any, b: any) => {
        const aVal = String(a[sortField] || '');
        const bVal = String(b[sortField] || '');
        if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [allComponents, selectedStatus, selectedComponentName, selectedStage, debouncedComponentSearchTerm, sortField, sortOrder]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setComponentPage(1);
  };

  const SortIndicator = ({ field }: { field: string }) => {
    if (sortField !== field) {
      return <ArrowUp size={12} className="inline opacity-30 ml-1" />;
    }
    return sortOrder === 'asc'
      ? <ArrowUp size={12} className="inline text-blue-500 ml-1" />
      : <ArrowDown size={12} className="inline text-blue-500 ml-1" />;
  };

  const paginatedComponents = useMemo(() => {
    const startIndex = (componentPage - 1) * COMPONENT_PAGE_SIZE;
    return filteredComponents.slice(startIndex, startIndex + COMPONENT_PAGE_SIZE);
  }, [filteredComponents, componentPage]);

  const totalPages = Math.ceil(filteredComponents.length / COMPONENT_PAGE_SIZE);

  const selectedCount = selectedComponents.size;
  const isAllSelected = selectedCount === filteredComponents.length && filteredComponents.length > 0;
  const isIndeterminate = selectedCount > 0 && selectedCount < filteredComponents.length;

  const handleToggleAll = () => {
    if (selectedComponents.size === filteredComponents.length && filteredComponents.length > 0) {
      setSelectedComponents(new Set());
    } else {
      setSelectedComponents(new Set(filteredComponents.map(c => c.id)));
    }
  };

  const handleSelectComponent = useCallback((componentId: string) => {
    setSelectedComponents(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(componentId)) {
        newSelected.delete(componentId);
      } else {
        newSelected.add(componentId);
      }
      return newSelected;
    });
  }, []);

  const handleBatchDelete = async () => {
    if (!onBatchDeleteComponents) return;
    setIsLoading(true);
    try {
      const items = Array.from(selectedComponents).map(id => {
        const comp = filteredComponents.find(c => c.id === id);
        return { moduleId: comp?.moduleId || '', componentId: id };
      });
      await onBatchDeleteComponents(items);
      showToast(`成功删除 ${selectedComponents.size} 个组件`, 'success');
      setSelectedComponents(new Set());
      setShowDeleteConfirm(false);
    } catch {
      showToast('批量删除失败，请重试', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBatchStatusUpdate = async () => {
    if (!onBatchUpdateStatus) return;
    setIsLoading(true);
    try {
      const items = Array.from(selectedComponents).map(id => {
        const comp = filteredComponents.find(c => c.id === id);
        return { moduleId: comp?.moduleId || '', componentId: id };
      });
      await onBatchUpdateStatus(items, batchStatus);
      showToast(`成功更新 ${selectedComponents.size} 个组件状态为 "${batchStatus}"`, 'success');
      setSelectedComponents(new Set());
      setShowStatusModal(false);
    } catch {
      showToast('批量更新状态失败，请重试', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBatchStageUpdate = async () => {
    if (!onBatchUpdateStage) return;
    setIsLoading(true);
    try {
      const items = Array.from(selectedComponents).map(id => {
        const comp = filteredComponents.find(c => c.id === id);
        return { moduleId: comp?.moduleId || '', componentId: id };
      });
      await onBatchUpdateStage(items, batchStage);
      showToast(`成功更新 ${selectedComponents.size} 个组件阶段为 "${batchStage}"`, 'success');
      setSelectedComponents(new Set());
      setShowStageModal(false);
    } catch {
      showToast('批量更新阶段失败，请重试', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBatchVersionUpdate = async () => {
    if (!onBatchUpdateVersion) return;
    setIsLoading(true);
    try {
      const items = Array.from(selectedComponents).map(id => {
        const comp = filteredComponents.find(c => c.id === id);
        return { moduleId: comp?.moduleId || '', componentId: id };
      });
      await onBatchUpdateVersion(items, batchVersion);
      showToast(`成功更新 ${selectedComponents.size} 个组件版本为 "${batchVersion}"`, 'success');
      setSelectedComponents(new Set());
      setShowVersionModal(false);
    } catch {
      showToast('批量更新版本失败，请重试', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const componentNames = [...new Set(allComponents.map(c => c.componentName))];

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
      const stageComponents = allComponents.filter((c: any) => c.stage === stage);
      const total = stageComponents.length;
      const statusCounts: Record<StatusType, number> = {} as Record<StatusType, number>;
      STATUS_LIST.forEach(s => { statusCounts[s] = 0; });
      stageComponents.forEach((c: any) => {
        if (STATUS_LIST.includes(c.status as StatusType)) {
          statusCounts[c.status as StatusType]++;
        }
      });
      return { stage, total, statusCounts };
    });
  }, [allComponents]);

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

  if (allComponents.length === 0) {
    return (
      <div className="space-y-4">
        <div className={`${t.card} rounded-lg shadow-sm border ${t.border} p-6`}>
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <select
                value={selectedStatus || ''}
                onChange={(e) => { setSelectedStatus(e.target.value || null); setComponentPage(1); }}
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
                  placeholder="搜索组件..."
                  value={componentSearchTerm}
                  onChange={(e) => { setComponentSearchTerm(e.target.value); setComponentPage(1); }}
                  className={`pl-10 pr-10 py-2 border rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary-500 ${t.input}`}
                />
                {componentSearchTerm && (
                  <button
                    onClick={() => setComponentSearchTerm('')}
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
                  onClick={onAddComponent}
                  className={`flex items-center gap-2 px-4 py-2 ${t.button} rounded-lg text-sm`}
                >
                  <Plus size={16} />
                  新建组件
                </button>
              )}
            </div>
          </div>
        </div>
        <div className={`text-center py-12 ${t.card} rounded-lg border ${t.border}`}>
          <Package className={`mx-auto ${t.textMuted} mb-4`} size={48} />
          <p className={t.textMuted}>暂无组件</p>
          {canEdit && (
            <button
              onClick={onAddComponent}
              className={`mt-4 flex items-center gap-2 px-4 py-2 ${t.button} rounded-lg mx-auto`}
            >
              <Plus size={18} />
              新建组件
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 h-20">
        {stageInfo.map(({ stage, total, statusCounts }) => {
          const style = getStageButtonStyle(stage, { stage, total, statusCounts });
          return (
            <button
              key={stage}
              onClick={() => {
                setSelectedStage(selectedStage === stage ? null : stage);
                setComponentPage(1);
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
              onChange={(e) => { setSelectedStatus(e.target.value || null); setComponentPage(1); }}
              className={`px-3 py-2 border rounded-lg text-sm ${t.input}`}
            >
              <option value="">所有状态</option>
              {STATUS_LIST.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              value={selectedComponentName || ''}
              onChange={(e) => { setSelectedComponentName(e.target.value || null); setComponentPage(1); }}
              className={`px-3 py-2 border rounded-lg text-sm ${t.input}`}
            >
              <option value="">所有组件名</option>
              {componentNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${t.textMuted}`} size={16} />
              <input
                type="text"
                placeholder="搜索组件..."
                value={componentSearchTerm}
                onChange={(e) => { setComponentSearchTerm(e.target.value); setComponentPage(1); }}
                className={`pl-10 pr-10 py-2 border rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary-500 ${t.input}`}
              />
              {componentSearchTerm && (
                <button
                  onClick={() => setComponentSearchTerm('')}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${t.textMuted} hover:${t.text}`}
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {componentSearchTerm && (
              <span className={`text-sm ${t.textMuted}`}>
                找到 {filteredComponents.length} 个结果
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            {canEdit && (
              <button
                onClick={onAddComponent}
                className={`flex items-center gap-2 px-4 py-2 ${t.button} rounded-lg text-sm`}
              >
                <Plus size={16} />
                新建组件
              </button>
            )}
          </div>
        </div>

        {filteredComponents.length === 0 && componentSearchTerm && (
          <div className={`text-center py-8 ${t.textMuted}`}>
            <Search className={`mx-auto mb-2`} size={32} />
            <p>未找到匹配的组件</p>
            <p className="text-sm mt-1">尝试调整搜索条件或关键词</p>
          </div>
        )}

        {filteredComponents.length > 0 && (
          <table className="w-full">
            <thead className={t.tableHeader}>
              <tr>
                <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary} w-10`}>
                  <button
                    onClick={handleToggleAll}
                    className={`p-1 rounded transition-colors ${
                      isAllSelected || isIndeterminate
                        ? 'text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900'
                        : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    aria-label={isAllSelected ? '取消全选' : '全选'}
                  >
                    {isAllSelected || isIndeterminate ? (
                      <CheckSquare size={18} className={isIndeterminate ? 'opacity-50' : ''} />
                    ) : (
                      <Square size={18} className="opacity-50" />
                    )}
                  </button>
                </th>
                <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>
                  <button onClick={() => handleSort('componentNumber')} className={`flex items-center gap-1 hover:text-blue-500 cursor-pointer transition-colors ${t.textSecondary}`}>组件编号<SortIndicator field='componentNumber' /></button>
                </th>
                <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>
                  <button onClick={() => handleSort('componentName')} className={`flex items-center gap-1 hover:text-blue-500 cursor-pointer transition-colors ${t.textSecondary}`}>组件名称<SortIndicator field='componentName' /></button>
                </th>
                <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>
                  <button onClick={() => handleSort('moduleName')} className={`flex items-center gap-1 hover:text-blue-500 cursor-pointer transition-colors ${t.textSecondary}`}>所属模块<SortIndicator field='moduleName' /></button>
                </th>
                <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>阶段</th>
                <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>版本</th>
                <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>状态</th>
                <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>操作</th>
              </tr>
            </thead>
            <tbody>
              {paginatedComponents.map((comp) => {
                const isSelected = selectedComponents.has(comp.id);
                return (
                  <tr
                    key={comp.id}
                    className={`border-t ${t.border} ${isSelected ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''} ${t.hoverBg}`}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleSelectComponent(comp.id)}
                        className={`p-1 rounded transition-colors ${
                          isSelected
                            ? 'text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900'
                            : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                        aria-label={isSelected ? '取消选择' : '选择'}
                      >
                        {isSelected ? (
                          <CheckSquare size={18} />
                        ) : (
                          <Square size={18} className="opacity-50" />
                        )}
                      </button>
                    </td>
                    <td
                      onClick={() => navigate(`/components/${comp.id}`)}
                      className={`px-4 py-3 ${t.text} cursor-pointer`}
                    >{comp.componentNumber}</td>
                  <td className={`px-4 py-3`}>
                    <Link to={`/components/${comp.id}`} className={`${t.text} hover:underline font-medium`}>
                      {comp.componentName}
                    </Link>
                  </td>
                  <td className={`px-4 py-3 ${t.textSecondary}`}>{comp.moduleName || '-'}</td>
                  <td className={`px-4 py-3 ${t.textSecondary}`}>{comp.stage || '-'}</td>
                  <td className={`px-4 py-3 ${t.textSecondary}`}>{comp.version || '-'}</td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        if (onStatusChangeWithReason && canEdit) {
                          setEnhancedStatusModal({
                            isOpen: true,
                            component: comp as Component,
                            currentStatus: comp.status as ComponentStatus,
                          });
                        } else if (onStatusChange) {
                          onStatusChange(comp);
                        }
                      }}
                      className={`px-2 py-1 rounded text-xs transition-colors cursor-pointer ${
                        t.statusColors[comp.status as keyof typeof t.statusColors] || t.statusColors['故障']
                      } hover:opacity-80`}
                    >
                      {comp.status}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 sm:gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => { e.stopPropagation(); onEditComponent(comp); }}
                        className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${t.textMuted}`}
                        title="编辑"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onCopyComponent(comp); }}
                        className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${t.textMuted}`}
                        title="复制组件"
                      >
                        <Copy size={16} />
                      </button>
                      {canEdit && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('确定要删除该组件吗？')) {
                              onDeleteComponent(comp.moduleId, comp.id);
                              showToast('组件已删除', 'success');
                            }
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
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className={`flex items-center justify-between px-4 py-3 ${t.card} rounded-lg border ${t.border}`}>
          <div className={`text-sm ${t.textSecondary}`}>
            第 {componentPage} 页，共 {totalPages} 页
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setComponentPage(p => Math.max(1, p - 1))}
              disabled={componentPage === 1}
              className={`px-3 py-1 border rounded ${t.button} disabled:opacity-50`}
            >
              上一页
            </button>
            <button
              onClick={() => setComponentPage(p => Math.min(totalPages, p + 1))}
              disabled={componentPage >= totalPages}
              className={`px-3 py-1 border rounded ${t.button} disabled:opacity-50`}
            >
              下一页
            </button>
          </div>
        </div>
      )}
      {enhancedStatusModal.isOpen && enhancedStatusModal.component && (
        <EnhancedComponentStatusModal
          isOpen={enhancedStatusModal.isOpen}
          onClose={() => setEnhancedStatusModal(prev => ({ ...prev, isOpen: false }))}
          component={enhancedStatusModal.component}
          currentStatus={enhancedStatusModal.currentStatus}
          onStatusChange={async (componentId, moduleId, newStatus, reason) => {
            if (onStatusChangeWithReason) {
              return onStatusChangeWithReason(componentId, moduleId, newStatus, reason);
            }
            return { success: false, error: '状态变更功能未配置' };
          }}
          canEdit={canEdit}
        />
      )}

      {canEdit && (onBatchDeleteComponents || onBatchUpdateStage || onBatchUpdateVersion) && (
        <BatchOperationsBar
          selectedCount={selectedCount}
          totalCount={filteredComponents.length}
          isAllSelected={isAllSelected}
          isIndeterminate={isIndeterminate}
          onToggleAll={handleToggleAll}
          onDeselectAll={() => setSelectedComponents(new Set())}
          onBatchDelete={onBatchDeleteComponents ? () => setShowDeleteConfirm(true) : undefined}
          onBatchUpdateStage={onBatchUpdateStage ? () => setShowStageModal(true) : undefined}
          onBatchUpdateVersion={onBatchUpdateVersion ? () => setShowVersionModal(true) : undefined}
          itemType="组件"
          deleteLabel="删除"
          isDeleting={isLoading}
          isUpdatingStage={isLoading}
          isUpdatingVersion={isLoading}
        />
      )}

      <ConfirmModal
        show={showStatusModal}
        title="批量修改状态"
        message={
          <div className="space-y-3">
            <p>请选择目标状态，然后确认修改选中的 {selectedCount} 个组件。</p>
            <select
              value={batchStatus}
              onChange={(e) => setBatchStatus(e.target.value as ComponentStatus)}
              className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
            >
              {STATUS_LIST.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        }
        onConfirm={handleBatchStatusUpdate}
        onCancel={() => setShowStatusModal(false)}
        type="info"
        confirmText="确认修改"
        cancelText="取消"
      />

      <ConfirmModal
        show={showStageModal}
        title="批量修改阶段"
        message={
          <div className="space-y-3">
            <p>请选择目标阶段，然后确认修改选中的 {selectedCount} 个组件。</p>
            <select
              value={batchStage}
              onChange={(e) => setBatchStage(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
            >
              <option value="F阶段">F阶段</option>
              <option value="C阶段">C阶段</option>
              <option value="S阶段">S阶段</option>
              <option value="D阶段">D阶段</option>
              <option value="P阶段">P阶段</option>
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
            <p>请输入目标版本，然后确认修改选中的 {selectedCount} 个组件。</p>
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
        message={`确定要删除选中的 ${selectedCount} 个组件吗？此操作不可恢复！`}
        onConfirm={handleBatchDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        type="danger"
        confirmText="删除"
        cancelText="取消"
      />
    </div>
  );
}

export default ComponentList;