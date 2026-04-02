import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Activity,
  Box,
  Monitor,
  Filter,
  Download,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Search,
  AlertCircle,
  AlertTriangle,
  Info,
  Zap,
  Shield,
  Layers,
} from 'lucide-react';
import { useToast } from './Toast';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { useHierarchicalLogger } from '../hooks/useHierarchicalLogger';
import type {
  HierarchicalLogEntry,
  LogLayer,
  LogLevel,
  LogStatistics,
} from '../services/logger/types';

interface HierarchicalLogViewerProps {
  maxHeight?: string;
  showFilters?: boolean;
  showHeader?: boolean;
  showStatistics?: boolean;
  defaultLayer?: LogLayer | 'ALL';
  defaultLevel?: LogLevel | 'ALL';
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const LAYER_CONFIG: Record<LogLayer | 'ALL', { label: string; icon: typeof Box; color: string; bgColor: string }> = {
  ALL: { label: '全部', icon: Layers, color: 'text-gray-500', bgColor: 'bg-gray-100 dark:bg-gray-800' },
  COMPONENT: { label: '组件', icon: Box, color: 'text-blue-500', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  MODULE: { label: '模块', icon: Activity, color: 'text-purple-500', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  SYSTEM: { label: '系统', icon: Monitor, color: 'text-orange-500', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
};

const LEVEL_CONFIG: Record<LogLevel | 'ALL', { label: string; icon: typeof Info; color: string; bgColor: string }> = {
  ALL: { label: '全部级别', icon: Info, color: 'text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-800' },
  INFO: { label: '信息', icon: Info, color: 'text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-900/20' },
  WARN: { label: '警告', icon: AlertTriangle, color: 'text-yellow-400', bgColor: 'bg-yellow-50 dark:bg-yellow-900/20' },
  ERROR: { label: '错误', icon: AlertCircle, color: 'text-red-400', bgColor: 'bg-red-50 dark:bg-red-900/20' },
  CRITICAL: { label: '严重', icon: Shield, color: 'text-purple-400', bgColor: 'bg-purple-50 dark:bg-purple-900/20' },
};

function getChangeTypeLabel(entry: HierarchicalLogEntry): string {
  if (entry.layer === 'COMPONENT') {
    const labels: Record<string, string> = {
      CREATE: '创建',
      UPDATE: '更新',
      DESTROY: '销毁',
      STATE_CHANGE: '状态变更',
      PROPERTY_CHANGE: '属性变更',
      MOUNT: '挂载',
      UNMOUNT: '卸载',
      RENDER: '渲染',
      EVENT_TRIGGER: '事件触发',
    };
    return labels[(entry as { changeType?: string }).changeType ?? ''] || (entry as { changeType?: string }).changeType || '未知';
  }
  if (entry.layer === 'MODULE') {
    const labels: Record<string, string> = {
      INTERFACE_CHANGE: '接口变更',
      CONFIG_MODIFY: '配置修改',
      DEPENDENCY_ADJUST: '依赖调整',
      CORE_FUNCTION_CHANGE: '核心功能变化',
      ENABLE: '启用',
      DISABLE: '禁用',
      INIT: '初始化',
      DESTROY: '销毁',
    };
    return labels[(entry as { changeType?: string }).changeType ?? ''] || (entry as { changeType?: string }).changeType || '未知';
  }
  const labels: Record<string, string> = {
    CONFIG_CHANGE: '配置变更',
    SERVICE_START: '服务启动',
    SERVICE_STOP: '服务停止',
    PERFORMANCE_ANOMALY: '性能异常',
    SECURITY_EVENT: '安全事件',
    CROSS_MODULE_CHANGE: '跨模块变更',
    SYSTEM_INIT: '系统初始化',
    SYSTEM_SHUTDOWN: '系统关闭',
  };
  return labels[(entry as { eventType?: string }).eventType ?? ''] || (entry as { eventType?: string }).eventType || '未知';
}

export default function HierarchicalLogViewer({
  maxHeight = '700px',
  showFilters = true,
  showHeader = true,
  showStatistics = true,
  defaultLayer = 'ALL',
  defaultLevel = 'ALL',
  autoRefresh = true,
  refreshInterval = 5000,
}: HierarchicalLogViewerProps) {
  const { showToast } = useToast();
  const t = useThemeStyles();
  const { logs, stats, actions } = useHierarchicalLogger({ autoRefresh, refreshInterval });

  const [activeLayer, setActiveLayer] = useState<LogLayer | 'ALL'>(defaultLayer);
  const [activeLevel, setActiveLevel] = useState<LogLevel | 'ALL'>(defaultLevel);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [logData, setLogData] = useState<HierarchicalLogEntry[]>([]);
  const [statistics, setStatistics] = useState<LogStatistics | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadLogs = useCallback(() => {
    const filtered = logs.filter(activeLayer, activeLevel, searchTerm);
    setLogData(filtered);
    setStatistics(stats());
  }, [logs, stats, activeLayer, activeLevel, searchTerm]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    const unsubscribe = actions.subscribe(() => {
      loadLogs();
    });
    return unsubscribe;
  }, [actions.subscribe, loadLogs]);

  const handleExport = () => {
    const jsonStr = actions.export(activeLayer === 'ALL' ? undefined : activeLayer);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `分层日志_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('日志导出成功', 'success');
  };

  const handleClear = () => {
    if (confirm('确定要清空所有分层日志吗？此操作不可恢复。')) {
      actions.clearAll();
      setLogData([]);
      setStatistics(stats());
      showToast('日志已清空', 'success');
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadLogs();
    setTimeout(() => setIsRefreshing(false), 300);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const layerStats = useMemo(() => {
    if (!statistics) return null;
    return [
      { key: 'COMPONENT' as LogLayer, count: statistics.byLayer.COMPONENT, ...LAYER_CONFIG.COMPONENT },
      { key: 'MODULE' as LogLayer, count: statistics.byLayer.MODULE, ...LAYER_CONFIG.MODULE },
      { key: 'SYSTEM' as LogLayer, count: statistics.byLayer.SYSTEM, ...LAYER_CONFIG.SYSTEM },
    ];
  }, [statistics]);

  return (
    <div className={`${t.card} rounded-xl border ${t.border} overflow-hidden shadow-sm`}>
      {showHeader && (
        <div className={`px-5 py-4 border-b ${t.border} flex items-center justify-between bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-200 dark:shadow-cyan-900/20">
              <Layers size={20} />
            </div>
            <div>
              <h3 className={`font-bold ${t.text}`}>分层级日志系统</h3>
              <p className={`text-xs ${t.textMuted}`}>组件 · 模块 · 系统</p>
            </div>
            {statistics && statistics.recentCount > 0 && (
              <span className="px-2.5 py-1 text-xs font-medium bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-full animate-pulse shadow-md">
                +{statistics.recentCount} 新记录
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleRefresh}
              className={`p-2 rounded-lg hover:bg-white/60 dark:hover:bg-gray-700/60 transition-all ${t.textSecondary}`}
              title="刷新"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={handleExport}
              className={`p-2 rounded-lg hover:bg-white/60 dark:hover:bg-gray-700/60 transition-all ${t.textSecondary}`}
              title="导出"
            >
              <Download size={16} />
            </button>
            <button
              onClick={handleClear}
              className={`p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all text-red-400`}
              title="清空"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      )}

      {showFilters && (
        <div className={`px-5 py-3 border-b ${t.border} bg-gray-50/80 dark:bg-gray-900/50`}>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Filter size={14} className={`${t.textMuted}`} />
              {(Object.entries(LAYER_CONFIG) as [LogLayer | 'ALL', typeof LAYER_CONFIG[LogLayer]][]).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setActiveLayer(key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    activeLayer === key
                      ? `${config.bgColor} ${config.color} ring-2 ring-offset-1 ring-current opacity-100`
                      : `${t.textMuted} hover:bg-gray-100 dark:hover:bg-gray-800`
                  }`}
                >
                  <config.icon size={12} className="inline mr-1" />
                  {config.label}
                </button>
              ))}
            </div>

            <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />

            {(Object.entries(LEVEL_CONFIG) as [LogLevel | 'ALL', typeof LEVEL_CONFIG[LogLevel]][]).map(([key, config]) => (
              <button
                key={key}
                onClick={() => setActiveLevel(key)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  activeLevel === key
                    ? `${config.bgColor} ${config.color}`
                    : `${t.textMuted} hover:bg-gray-100 dark:hover:bg-gray-800`
                }`}
              >
                <config.icon size={12} className="inline mr-1" />
                {config.label}
              </button>
            ))}

            <div className="flex items-center gap-1.5 ml-auto">
              <Search size={14} className={`${t.textMuted}`} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索日志内容..."
                className={`px-3 py-1.5 text-xs border rounded-lg w-48 focus:w-64 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-300 dark:focus:ring-cyan-700 ${t.input}`}
              />
            </div>
          </div>
        </div>
      )}

      {showStatistics && statistics && (
        <div className={`px-5 py-3 border-b ${t.border} grid grid-cols-2 md:grid-cols-6 gap-3`}>
          <div className="text-center p-2 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20">
            <div className={`text-[10px] uppercase tracking-wider ${t.textMuted}`}>总记录</div>
            <div className={`text-lg font-bold ${t.text}`}>{statistics.totalLogs}</div>
          </div>
          {layerStats?.map(({ key, count, icon: LayerIcon, color }) => (
            <div key={key} className="text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-900/30">
              <div className={`text-[10px] uppercase tracking-wider ${t.textMuted}`}>
                <LayerIcon size={10} className="inline mr-0.5" />
                {LAYER_CONFIG[key].label}
              </div>
              <div className={`text-base font-bold ${color}`}>{count}</div>
            </div>
          ))}
          <div className="text-center p-2 rounded-lg bg-red-50 dark:bg-red-900/20">
            <div className={`text-[10px] uppercase tracking-wider ${t.textMuted}`}>异常</div>
            <div className="text-base font-bold text-red-500">{statistics.errorCount}</div>
          </div>
        </div>
      )}

      <div className="overflow-y-auto" style={{ maxHeight }}>
        {logData.length === 0 ? (
          <div className={`text-center py-16 ${t.textMuted}`}>
            <Activity size={48} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">暂无日志记录</p>
            <p className="text-xs mt-1">组件、模块和系统的所有变更将在此显示</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700/40">
            {logData.map((entry) => {
              const layerConf = LAYER_CONFIG[entry.layer];
              const levelConf = LEVEL_CONFIG[entry.level];
              const LayerIcon = layerConf.icon;
              const LevelIcon = levelConf.icon;
              const isExpanded = expandedId === entry.id;

              return (
                <div
                  key={entry.id}
                  className={`transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/40 ${
                    isExpanded ? 'bg-cyan-50/40 dark:bg-cyan-900/10' : ''
                  }`}
                >
                  <div
                    className="px-5 py-3 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 p-1.5 rounded-lg ${layerConf.bgColor}`}>
                        <LayerIcon size={14} className={layerConf.color} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-md ${layerConf.bgColor} ${layerConf.color}`}>
                            <LayerIcon size={10} />
                            {layerConf.label}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md ${levelConf.bgColor} ${levelConf.color}`}>
                            <LevelIcon size={10} />
                            {levelConf.label}
                          </span>
                          <span className={`text-[11px] font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 ${t.textMuted}`}>
                            {getChangeTypeLabel(entry)}
                          </span>
                        </div>

                        <div className={`text-sm font-medium ${t.text} truncate`}>
                          {entry.layer === 'COMPONENT'
                            ? (entry as { componentName?: string }).componentName
                            : entry.layer === 'MODULE'
                            ? (entry as { moduleName?: string }).moduleName
                            : (entry as { eventDescription?: string }).eventDescription}
                        </div>

                        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-400 dark:text-gray-500">
                          <Zap size={10} />
                          <span>{formatTime(entry.timestamp)}</span>
                          <span>·</span>
                          <span>{entry.user.username || '系统'}</span>
                          {entry.layer === 'COMPONENT' && (entry as { changedProperties?: Array<{ key: string }> }).changedProperties && (
                            <>
                              <span>·</span>
                              <span className="text-cyan-500 font-medium">
                                {(entry as { changedProperties: Array<{ key: string }> }).changedProperties.length} 个属性变更
                              </span>
                            </>
                          )}
                          {(entry as { reason?: string }).reason && (
                            <>
                              <span>·</span>
                              <span className={`font-medium truncate max-w-[200px] ${(entry as { reason: string }).reason.length > 30 ? 'text-amber-500 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`} title={(entry as { reason: string }).reason}>
                                原因: {(entry as { reason: string }).reason}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <button className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${t.textMuted}`}>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-5 pb-4 ml-10">
                      <div className={`p-4 rounded-xl bg-gray-50/80 dark:bg-gray-900/60 border ${t.border} space-y-3`}>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className={`text-[10px] uppercase tracking-wider font-semibold ${t.textMuted} mb-1`}>日志ID</div>
                            <div className={`font-mono text-xs break-all ${t.text}`}>{entry.id}</div>
                          </div>
                          <div>
                            <div className={`text-[10px] uppercase tracking-wider font-semibold ${t.textMuted} mb-1`}>时间戳</div>
                            <div className={`text-xs ${t.text}`}>{new Date(entry.timestamp).toLocaleString('zh-CN')}</div>
                          </div>
                          <div>
                            <div className={`text-[10px] uppercase tracking-wider font-semibold ${t.textMuted} mb-1`}>操作用户</div>
                            <div className={`text-xs ${t.text}`}>{entry.user.username || '系统'} ({entry.user.id || '-'})</div>
                          </div>
                          <div>
                            <div className={`text-[10px] uppercase tracking-wider font-semibold ${t.textMuted} mb-1`}>事件级别</div>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded ${levelConf.bgColor} ${levelConf.color}`}>
                              <LevelIcon size={12} />
                              {levelConf.label}
                            </span>
                          </div>
                        </div>

                        {(entry as { reason?: string }).reason && (
                          <div>
                            <div className={`text-[10px] uppercase tracking-wider font-semibold ${t.textMuted} mb-1.5 flex items-center gap-1`}>
                              <AlertTriangle size={10} />
                              变更原因
                            </div>
                            <div className={`p-3 rounded-lg bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-800/40 text-xs font-medium text-amber-700 dark:text-amber-300 leading-relaxed`}>
                              {(entry as { reason: string }).reason}
                            </div>
                          </div>
                        )}

                        {entry.layer === 'COMPONENT' && (
                          <>
                            {(entry as { previousState?: Record<string, unknown> }).previousState && (
                              <div>
                                <div className={`text-[10px] uppercase tracking-wider font-semibold ${t.textMuted} mb-1.5`}>变更前状态</div>
                                <pre className={`p-3 rounded-lg bg-white dark:bg-gray-800 border border-dashed border-gray-200 dark:border-gray-700 text-xs overflow-auto max-h-32 ${t.text}`}>
                                  {JSON.stringify((entry as { previousState: Record<string, unknown> }).previousState, null, 2)}
                                </pre>
                              </div>
                            )}
                            {(entry as { currentState?: Record<string, unknown> }).currentState && (
                              <div>
                                <div className={`text-[10px] uppercase tracking-wider font-semibold ${t.textMuted} mb-1.5`}>变更后状态</div>
                                <pre className={`p-3 rounded-lg bg-cyan-50 dark:bg-cyan-900/20 border border-dashed border-cyan-200 dark:border-cyan-800 text-xs overflow-auto max-h-32 ${t.text}`}>
                                  {JSON.stringify((entry as { currentState: Record<string, unknown> }).currentState, null, 2)}
                                </pre>
                              </div>
                            )}
                            {(entry as { changedProperties?: Array<{ key: string; previousValue: unknown; newValue: unknown }> }).changedProperties &&
                              (entry as { changedProperties: Array<{ key: string; previousValue: unknown; newValue: unknown }> }).changedProperties.length > 0 && (
                                <div>
                                  <div className={`text-[10px] uppercase tracking-wider font-semibold ${t.textMuted} mb-1.5`}>属性变更明细</div>
                                  <div className="space-y-1">
                                    {(entry as { changedProperties: Array<{ key: string; previousValue: unknown; newValue: unknown }> }).changedProperties.map((prop, idx) => (
                                      <div key={idx} className={`flex items-center gap-2 text-xs p-2 rounded bg-white dark:bg-gray-800 border ${t.border}`}>
                                        <span className={`font-mono font-medium ${t.text}`}>{prop.key}</span>
                                        <span className={`${t.textMuted}`}>:</span>
                                        <span className="line-through text-red-400 dark:text-red-300 max-w-[120px] truncate">{JSON.stringify(prop.previousValue)}</span>
                                        <span className="text-cyan-500">→</span>
                                        <span className="text-green-500 dark:text-green-400 font-medium max-w-[120px] truncate">{JSON.stringify(prop.newValue)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                          </>
                        )}

                        {entry.layer === 'MODULE' && (
                          <>
                            <div>
                              <div className={`text-[10px] uppercase tracking-wider font-semibold ${t.textMuted} mb-1.5`}>影响范围</div>
                              <div className={`p-3 rounded-lg ${((entry as { impactScope: { severity: string } }).impactScope.severity === 'CRITICAL' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : (entry as { impactScope: { severity: string } }).impactScope.severity === 'HIGH' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' : 'bg-gray-100 dark:bg-gray-800 border')} border`}>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`text-xs font-bold ${(entry as { impactScope: { severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' } }).impactScope.severity === 'CRITICAL' ? 'text-red-500' : (entry as { impactScope: { severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' } }).impactScope.severity === 'HIGH' ? 'text-yellow-500' : 'text-blue-500'}`}>
                                    [{(entry as { impactScope: { severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' } }).impactScope.severity}]
                                  </span>
                                  <span className={`text-xs ${t.text}`}>{(entry as { impactScope: { description: string } }).impactScope.description}</span>
                                </div>
                                {(entry as { impactScope: { affectedComponents: string[] } }).impactScope.affectedComponents.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {(entry as { impactScope: { affectedComponents: string[] } }).impactScope.affectedComponents.slice(0, 8).map((comp, i) => (
                                      <span key={i} className="px-1.5 py-0.5 text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded">{comp}</span>
                                    ))}
                                    {(entry as { impactScope: { affectedComponents: string[] } }).impactScope.affectedComponents.length > 8 && (
                                      <span className="px-1.5 py-0.5 text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 rounded">
                                        +{(entry as { impactScope: { affectedComponents: string[] } }).impactScope.affectedComponents.length - 8} 更多
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div>
                              <div className={`text-[10px] uppercase tracking-wider font-semibold ${t.textMuted} mb-1.5`}>变更详情</div>
                              <div className={`p-3 rounded-lg bg-white dark:bg-gray-800 border ${t.border} text-xs ${t.text}`}>
                                {(entry as { changeDetails: string }).changeDetails}
                              </div>
                            </div>
                          </>
                        )}

                        {entry.layer === 'SYSTEM' && (
                          <>
                            <div>
                              <div className={`text-[10px] uppercase tracking-wider font-semibold ${t.textMuted} mb-1.5`}>影响范围</div>
                              <div className={`p-3 rounded-lg ${(entry as { impactScope: { severity: string } }).impactScope.severity === 'CRITICAL' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-gray-100 dark:bg-gray-800 border'} border`}>
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs font-bold ${(entry as { impactScope: { severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' } }).impactScope.severity === 'CRITICAL' ? 'text-red-500' : (entry as { impactScope: { severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' } }).impactScope.severity === 'HIGH' ? 'text-yellow-500' : 'text-orange-500'}`}>
                                    [{(entry as { impactScope: { severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' } }).impactScope.severity}]
                                  </span>
                                  <span className={`text-xs ${t.text}`}>{(entry as { impactScope: { description: string } }).impactScope.description}</span>
                                </div>
                              </div>
                            </div>
                            {(entry as { performanceMetrics?: object }).performanceMetrics && (
                              <div>
                                <div className={`text-[10px] uppercase tracking-wider font-semibold ${t.textMuted} mb-1.5`}>性能指标</div>
                                <pre className={`p-3 rounded-lg bg-white dark:bg-gray-800 border ${t.border} text-xs overflow-auto ${t.text}`}>
                                  {JSON.stringify((entry as { performanceMetrics: object }).performanceMetrics, null, 2)}
                                </pre>
                              </div>
                            )}
                            {(entry as { stackTrace?: string }).stackTrace && (
                              <div>
                                <div className={`text-[10px] uppercase tracking-wider font-semibold ${t.textMuted} mb-1.5`}>堆栈信息</div>
                                <pre className={`p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-[10px] overflow-auto max-h-32 text-red-600 dark:text-red-300`}>
                                  {(entry as { stackTrace: string }).stackTrace}
                                </pre>
                              </div>
                            )}
                          </>
                        )}

                        {(entry as { metadata?: Record<string, unknown> }).metadata && Object.keys((entry as { metadata: Record<string, unknown> }).metadata).length > 0 && (
                          <div>
                            <div className={`text-[10px] uppercase tracking-wider font-semibold ${t.textMuted} mb-1.5`}>附加元数据</div>
                            <pre className={`p-3 rounded-lg bg-gray-100 dark:bg-gray-800 border border-dashed border-gray-200 dark:border-gray-700 text-xs overflow-auto max-h-40 ${t.text}`}>
                              {JSON.stringify((entry as { metadata: Record<string, unknown> }).metadata, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
