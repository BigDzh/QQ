import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Monitor, Edit2, Trash2, ChevronRight, Clock, CheckSquare, Square, ArrowUp, ArrowDown } from 'lucide-react';
import { useThemeStyles } from '../../../hooks/useThemeStyles';
import { useToast } from '../../../components/Toast';
import { BatchOperationsBar } from '../../../components/BatchOperationsBar';
import { ConfirmModal } from './ConfirmModal';
import type { ProjectStage } from '../../../types';
import { STAGE_OPTIONS, getDefaultStageForEntity } from '../../../services/stageConfig';

interface System {
  id: string;
  systemNumber: string;
  systemName: string;
  productionOrderNumber: string;
  holder?: string;
  status: string;
  stage: string;
  version?: string;
}

interface SystemListProps {
  projectId: string;
  systems: System[];
  modules: any[];
  canEdit: boolean;
  onAddSystem: () => void;
  onEditSystem: (system: System) => void;
  onDeleteSystem: (systemId: string) => void;
  onBatchDeleteSystems?: (systemIds: string[]) => Promise<void>;
  onBatchUpdateStatus?: (systemIds: string[], newStatus: string) => Promise<void>;
}

export function SystemList({
  projectId: _projectId,
  systems,
  modules,
  canEdit,
  onAddSystem,
  onEditSystem,
  onDeleteSystem,
  onBatchDeleteSystems,
  onBatchUpdateStatus,
}: SystemListProps) {
  const t = useThemeStyles();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [systemSearchTerm, setSystemSearchTerm] = useState('');
  const [systemSearchHistory, setSystemSearchHistory] = useState<string[]>([]);
  const [showSystemSearchDropdown, setShowSystemSearchDropdown] = useState(false);
  const [selectedSystems, setSelectedSystems] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [batchStatus, setBatchStatus] = useState('正常');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof System>('systemNumber');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const filteredSystems = useMemo(() => {
    return systems
      .filter(s =>
        (!selectedStage || s.stage === selectedStage) &&
        (!systemSearchTerm ||
          s.systemName.toLowerCase().includes(systemSearchTerm.toLowerCase()) ||
          s.systemNumber.toLowerCase().includes(systemSearchTerm.toLowerCase()) ||
          s.productionOrderNumber?.toLowerCase().includes(systemSearchTerm.toLowerCase())
        )
      )
      .sort((a, b) => {
        const aVal = a[sortField] || '';
        const bVal = b[sortField] || '';
        if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [systems, selectedStage, systemSearchTerm, sortField, sortOrder]);

  const handleSort = (field: keyof System) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const SortIndicator = ({ field }: { field: keyof System }) => {
    if (sortField !== field) {
      return <ArrowUp size={12} className="inline opacity-30 ml-1" />;
    }
    return sortOrder === 'asc'
      ? <ArrowUp size={12} className="inline text-blue-500 ml-1" />
      : <ArrowDown size={12} className="inline text-blue-500 ml-1" />;
  };

  const stageInfo = STAGE_OPTIONS.map(stage => {
    const stageSystems = systems.filter(s => s.stage === stage);
    const total = stageSystems.length;
    const statusCounts: Record<string, number> = {
      '未投产': 0, '投产中': 0, '正常': 0, '维修中': 0, '三防中': 0, '测试中': 0, '仿真中': 0, '借用中': 0, '故障': 0
    };
    stageSystems.forEach(s => {
      if (s.status in statusCounts) {
        statusCounts[s.status]++;
      }
    });
    return { stage, total, statusCounts };
  });

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

  const selectedCount = selectedSystems.size;
  const isAllSelected = selectedCount === filteredSystems.length && filteredSystems.length > 0;
  const isIndeterminate = selectedCount > 0 && selectedCount < filteredSystems.length;

  const handleToggleAll = () => {
    if (isAllSelected) {
      setSelectedSystems(new Set());
    } else {
      setSelectedSystems(new Set(filteredSystems.map(s => s.id)));
    }
  };

  const handleSelectSystem = (systemId: string) => {
    const newSelected = new Set(selectedSystems);
    if (newSelected.has(systemId)) {
      newSelected.delete(systemId);
    } else {
      newSelected.add(systemId);
    }
    setSelectedSystems(newSelected);
  };

  const handleBatchDelete = async () => {
    if (!onBatchDeleteSystems) return;
    setIsLoading(true);
    try {
      await onBatchDeleteSystems(Array.from(selectedSystems));
      showToast(`成功删除 ${selectedSystems.size} 个系统`, 'success');
      setSelectedSystems(new Set());
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
      await onBatchUpdateStatus(Array.from(selectedSystems), batchStatus);
      showToast(`成功更新 ${selectedSystems.size} 个系统状态为 "${batchStatus}"`, 'success');
      setSelectedSystems(new Set());
      setShowStatusModal(false);
    } catch {
      showToast('批量更新状态失败，请重试', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const getSystemStatusInfo = (system: System) => {
    const systemModules = modules.filter(m => m.systemId === system.id);
    const allComponents = systemModules.flatMap(m => m.components || []);
    const total = allComponents.length;
    const statusCounts: Record<string, number> = {};
    allComponents.forEach(c => {
      statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
    });

    const statusColors: Record<string, string> = {
      '正常': '#10b981',
      '故障': '#ef4444',
      '维修中': '#f97316',
      '三防中': '#a855f7',
      '测试中': '#eab308',
      '仿真中': '#06b6d4',
      '借用中': '#3b82f6',
      '投产中': '#3b82f6',
      '未投产': '#6b7280',
    };

    const statusBg = system.status === '正常' ? 'bg-green-100 dark:bg-green-500/30 text-green-700 dark:text-green-300' :
      system.status === '故障' ? 'bg-red-100 dark:bg-red-500/30 text-red-700 dark:text-red-300' :
      'bg-gray-100 dark:bg-gray-500/30 text-gray-700 dark:text-gray-300';

    return { systemModules, allComponents, total, statusCounts, statusColors, statusBg };
  };

  if (systems.length === 0) {
    return (
      <div className={`text-center py-12 ${t.card} rounded-lg border ${t.border}`}>
        <Monitor className={`mx-auto ${t.textMuted} mb-4`} size={48} />
        <p className={t.textMuted}>暂无系统</p>
        {canEdit && (
          <button
            onClick={onAddSystem}
            className={`mt-4 flex items-center gap-2 px-4 py-2 ${t.button} rounded-lg mx-auto`}
          >
            <Plus size={18} />
            新建系统
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-1 h-20 overflow-x-auto mb-4">
        {stageInfo.map(({ stage, total, statusCounts }) => {
          const info = { stage, total, statusCounts };
          const style = getStageButtonStyle(stage, info);
          const statusColors: Record<string, string> = {
            '正常': 'bg-green-500',
            '故障': 'bg-red-500',
            '维修中': 'bg-orange-500',
            '三防中': 'bg-purple-500',
            '测试中': 'bg-yellow-500',
            '仿真中': 'bg-cyan-500',
            '借用中': 'bg-pink-500',
            '投产中': 'bg-blue-500',
            '未投产': 'bg-gray-400',
          };
          return (
            <button
              key={stage}
              onClick={() => {
                setSelectedStage(selectedStage === stage ? null : stage);
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
                    Object.entries(statusCounts).filter(([, count]) => count > 0).map(([status, count], idx, arr) => {
                      const width = (count / total) * 100;
                      const isFirst = idx === 0;
                      const isLast = idx === arr.length - 1;
                      const nextStatus = arr[idx + 1];
                      return (
                        <div
                          key={status}
                          className="relative h-full"
                          style={{ width: `${width}%`, transition: 'width 500ms ease-out' }}
                          title={`${status}: ${count}`}
                        >
                          <div
                            className={`absolute inset-0 ${statusColors[status] || 'bg-gray-400'} ${isFirst ? 'rounded-l-full' : ''} ${isLast ? 'rounded-r-full' : ''}`}
                          />
                          {!isLast && nextStatus && arr[idx + 1][1] > 0 && (
                            <div
                              className="absolute right-0 top-0 bottom-0"
                              style={{
                                width: '30%',
                                background: `linear-gradient(to right, transparent, ${getTailwindColor(statusColors[nextStatus[0]] || 'bg-gray-400')})`,
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
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-lg font-semibold ${t.text}`}>系统列表</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="flex items-center">
              <input
                type="text"
                placeholder="搜索系统名称、编号或生产指令号..."
                value={systemSearchTerm}
                onChange={(e) => setSystemSearchTerm(e.target.value)}
                onFocus={() => setShowSystemSearchDropdown(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && systemSearchTerm.trim()) {
                    const newHistory = [systemSearchTerm, ...systemSearchHistory.filter(h => h !== systemSearchTerm)].slice(0, 10);
                    setSystemSearchHistory(newHistory);
                    setShowSystemSearchDropdown(false);
                  }
                }}
                className={`h-8 px-3 text-sm rounded-l border ${t.border} ${t.text} ${t.card} w-56`}
              />
              <button
                type="button"
                onClick={() => setShowSystemSearchDropdown(!showSystemSearchDropdown)}
                className={`h-8 px-2 border-t border-b border-r ${t.border} ${t.textSecondary} ${t.card} rounded-r hover:${t.hoverBg}`}
              >
                <ChevronRight size={16} className={`transition-transform ${showSystemSearchDropdown ? 'rotate-90' : ''}`} />
              </button>
            </div>
            {showSystemSearchDropdown && (
              <div className={`absolute top-full right-0 mt-1 ${t.card} border ${t.border} rounded-lg shadow-lg z-50 w-72 max-h-80 overflow-y-auto`}>
                {systemSearchTerm && (
                  <div className={`p-2 border-b ${t.border}`}>
                    <div className={`text-xs ${t.textMuted} mb-1`}>搜索 "{systemSearchTerm}"</div>
                    <div className="flex flex-wrap gap-1">
                      {systems
                        .filter(s => s.productionOrderNumber?.includes(systemSearchTerm))
                        .slice(0, 5)
                        .map(s => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setSystemSearchTerm(s.productionOrderNumber || '');
                              setShowSystemSearchDropdown(false);
                            }}
                            className={`px-2 py-1 text-xs rounded ${t.hoverBg} ${t.textSecondary}`}
                          >
                            {s.productionOrderNumber}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
                {systemSearchHistory.length > 0 && (
                  <div className="p-2">
                    <div className={`text-xs ${t.textMuted} mb-1`}>搜索历史</div>
                    <div className="flex flex-wrap gap-1">
                      {systemSearchHistory.map((history, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setSystemSearchTerm(history);
                            setShowSystemSearchDropdown(false);
                          }}
                          className={`px-2 py-1 text-xs rounded ${t.hoverBg} ${t.textSecondary} flex items-center gap-1`}
                        >
                          <Clock size={10} />
                          {history}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {!systemSearchTerm && systemSearchHistory.length === 0 && (
                  <div className={`p-3 text-xs ${t.textMuted}`}>
                    输入指令号开始搜索，支持模糊匹配
                  </div>
                )}
              </div>
            )}
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={onAddSystem}
              className={`flex items-center gap-2 px-4 py-2 ${t.button} rounded-lg`}
            >
              <Plus size={18} />
              新建系统
            </button>
          )}
        </div>
      </div>

      <div className={`${t.card} rounded-lg shadow-sm overflow-hidden border ${t.border}`}>
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
                <button onClick={() => handleSort('systemName')} className={`flex items-center gap-1 hover:text-blue-500 cursor-pointer transition-colors ${t.textSecondary}`}>系统名称<SortIndicator field='systemName' /></button>
              </th>
              <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>
                <button onClick={() => handleSort('systemNumber')} className={`flex items-center gap-1 hover:text-blue-500 cursor-pointer transition-colors ${t.textSecondary}`}>编号<SortIndicator field='systemNumber' /></button>
              </th>
              <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>
                <button onClick={() => handleSort('productionOrderNumber')} className={`flex items-center gap-1 hover:text-blue-500 cursor-pointer transition-colors ${t.textSecondary}`}>生产指令号<SortIndicator field='productionOrderNumber' /></button>
              </th>
              <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>阶段</th>
              <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>状态</th>
              <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredSystems.map((system) => {
              const { total, statusCounts, statusColors, statusBg } = getSystemStatusInfo(system);
              const isSelected = selectedSystems.has(system.id);
              return (
                <tr
                  key={system.id}
                  className={`border-t ${t.border} ${t.hoverBg} ${isSelected ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleSelectSystem(system.id)}
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
                    onClick={() => navigate(`/systems/${system.id}`)}
                    className={`px-4 py-3 ${t.text} cursor-pointer`}
                  >
                    {system.systemName}
                  </td>
                  <td className={`px-4 py-3 ${t.textSecondary}`}>{system.systemNumber}</td>
                  <td className={`px-4 py-3 ${t.textSecondary}`}>{system.productionOrderNumber}</td>
                  <td className={`px-4 py-3 ${t.textSecondary}`}>{system.stage}</td>
                  <td className="px-4 py-3">
                    <div className="relative inline-block">
                      <span className={`px-2 py-1 rounded text-xs ${statusBg}`}>
                        {system.status}
                      </span>
                      {total > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 flex rounded-b overflow-hidden">
                          {Object.entries(statusCounts).map(([status, count]) => (
                            <div
                              key={status}
                              className="h-full"
                              style={{
                                width: `${(count / total) * 100}%`,
                                backgroundColor: statusColors[status] || '#6b7280'
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditSystem(system);
                        }}
                        className={`p-1.5 rounded border ${t.border} ${t.textMuted} card-btn-interactive`}
                        title="编辑"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSystem(system.id);
                        }}
                        className={`p-1.5 rounded border ${t.border} text-red-500 card-btn-interactive`}
                        title="删除"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {canEdit && onBatchDeleteSystems && onBatchUpdateStatus && (
        <BatchOperationsBar
          selectedCount={selectedCount}
          totalCount={filteredSystems.length}
          isAllSelected={isAllSelected}
          isIndeterminate={isIndeterminate}
          onToggleAll={handleToggleAll}
          onDeselectAll={() => setSelectedSystems(new Set())}
          onBatchDelete={() => setShowDeleteConfirm(true)}
          onBatchUpdateStatus={() => setShowStatusModal(true)}
          itemType="系统"
          deleteLabel="删除"
          updateStatusLabel="批量改状态"
          isDeleting={isLoading}
          isUpdatingStatus={isLoading}
        />
      )}

      <ConfirmModal
        show={showStatusModal}
        title="批量修改状态"
        message={
          <div className="space-y-3">
            <p>请选择目标状态，然后确认修改选中的 {selectedCount} 个系统。</p>
            <select
              value={batchStatus}
              onChange={(e) => setBatchStatus(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
            >
              <option value="正常">正常</option>
              <option value="故障">故障</option>
              <option value="维修中">维修中</option>
              <option value="三防中">三防中</option>
              <option value="测试中">测试中</option>
              <option value="仿真中">仿真中</option>
              <option value="借用中">借用中</option>
              <option value="投产中">投产中</option>
              <option value="未投产">未投产</option>
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
        show={showDeleteConfirm}
        title="确认批量删除"
        message={`确定要删除选中的 ${selectedCount} 个系统吗？此操作不可恢复！`}
        onConfirm={handleBatchDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        type="danger"
        confirmText="删除"
        cancelText="取消"
      />
    </div>
  );
}

export default SystemList;
