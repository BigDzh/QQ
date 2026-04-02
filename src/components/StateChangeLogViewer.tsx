import { useState, useEffect, useCallback } from 'react';
import { Activity, AlertCircle, AlertTriangle, Info, Clock, ChevronDown, ChevronUp, Download, RefreshCw } from 'lucide-react';
import { useToast } from './Toast';
import { useThemeStyles } from '../hooks/useThemeStyles';
import type { AuditLevel } from '../types/audit';
import type { AuditResourceType, StateChangeLog as StateChangeLogType, StateChangePriority } from '../types/audit';
import {
  getFilteredStateChangeLogs,
  clearStateChangeLogs,
  exportStateChangeLogs,
  addStateChangeListener,
  getStateChangeStats,
} from '../services/stateChangeLogger';

const priorityConfig: Record<StateChangePriority, { label: string; icon: typeof Info; color: string; bgColor: string }> = {
  LOW: { label: '低', icon: Info, color: 'text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-800' },
  NORMAL: { label: '普通', icon: Info, color: 'text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  HIGH: { label: '高', icon: AlertTriangle, color: 'text-yellow-400', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
  CRITICAL: { label: '紧急', icon: AlertCircle, color: 'text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30' },
};

const levelConfig: Record<AuditLevel, { label: string; color: string }> = {
  INFO: { label: '信息', color: 'text-blue-400' },
  WARNING: { label: '警告', color: 'text-yellow-400' },
  CRITICAL: { label: '严重', color: 'text-red-400' },
};

const resourceTypeLabels: Record<AuditResourceType, string> = {
  SYSTEM: '系统',
  MODULE: '模块',
  COMPONENT: '组件',
  PROJECT: '项目',
  USER: '用户',
  DOCUMENT: '文档',
  TASK: '任务',
  FILE: '文件',
  LOAN: '借用',
};

interface StateChangeLogViewerProps {
  maxHeight?: string;
  showFilters?: boolean;
  showHeader?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
  initialResourceType?: AuditResourceType;
  onLogClick?: (log: StateChangeLogType) => void;
}

export default function StateChangeLogViewer({
  maxHeight = '600px',
  showFilters = true,
  showHeader = true,
  autoRefresh = true,
  refreshInterval = 5000,
  initialResourceType,
  onLogClick,
}: StateChangeLogViewerProps) {
  const { showToast } = useToast();
  const t = useThemeStyles();
  const [logs, setLogs] = useState<StateChangeLogType[]>([]);
  const [stats, setStats] = useState<{ total: number; byPriority: Record<string, number>; byLevel: Record<string, number>; recentCount: number } | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [filterResourceType, setFilterResourceType] = useState<AuditResourceType | 'all'>(initialResourceType || 'all');
  const [filterPriority, setFilterPriority] = useState<StateChangePriority | 'all'>('all');
  const [filterLevel, setFilterLevel] = useState<AuditLevel | 'all'>('all');
  const [searchTerm] = useState('');
  const [showOnlyRecent, setShowOnlyRecent] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadLogs = useCallback(() => {
    const now = new Date();
    const startDate = showOnlyRecent
      ? new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
      : undefined;

    const filtered = getFilteredStateChangeLogs({
      resourceType: filterResourceType !== 'all' ? filterResourceType : undefined,
      priority: filterPriority !== 'all' ? filterPriority : undefined,
      minLevel: filterLevel !== 'all' ? filterLevel : undefined,
      searchTerm: searchTerm || undefined,
      startDate,
    });
    setLogs(filtered);
    setStats(getStateChangeStats());
  }, [filterResourceType, filterPriority, filterLevel, searchTerm, showOnlyRecent]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadLogs();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, loadLogs]);

  useEffect(() => {
    const unsubscribe = addStateChangeListener(() => {
      loadLogs();
    });
    return unsubscribe;
  }, [loadLogs]);

  const handleExport = () => {
    const jsonStr = exportStateChangeLogs();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `状态变更日志_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('日志导出成功', 'success');
  };

  const _handleClear = () => {
    if (confirm('确定要清空所有状态变更日志吗？此操作不可恢复。')) {
      clearStateChangeLogs();
      setLogs([]);
      setStats(getStateChangeStats());
      showToast('日志已清空', 'success');
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadLogs();
    setTimeout(() => setIsRefreshing(false), 500);
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
    return date.toLocaleString();
  };

  const toggleExpand = (logId: string) => {
    setExpandedLogId(prev => prev === logId ? null : logId);
  };

  return (
    <div className={`${t.card} rounded-lg border ${t.border} overflow-hidden`}>
      {showHeader && (
        <div className={`px-4 py-3 border-b ${t.border} flex items-center justify-between bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-gray-800 dark:to-gray-900`}>
          <div className="flex items-center gap-2">
            <Activity size={20} className="text-cyan-500" />
            <h3 className={`font-semibold ${t.text}`}>状态变更监控</h3>
            {stats && stats.recentCount > 0 && (
              <span className="px-2 py-0.5 text-xs bg-cyan-500 text-white rounded-full animate-pulse">
                {stats.recentCount} 条新变更
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className={`p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${t.textSecondary}`}
              title="刷新"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={handleExport}
              className={`p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${t.textSecondary}`}
              title="导出"
            >
              <Download size={16} />
            </button>
          </div>
        </div>
      )}

      {showFilters && (
        <div className={`px-4 py-3 border-b ${t.border} bg-gray-50 dark:bg-gray-900/50`}>
          <div className="flex flex-wrap gap-3">
            <select
              value={filterResourceType}
              onChange={(e) => setFilterResourceType(e.target.value as AuditResourceType | 'all')}
              className={`px-2 py-1.5 text-sm border rounded-lg ${t.input}`}
            >
              <option value="all">全部资源</option>
              {Object.entries(resourceTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as StateChangePriority | 'all')}
              className={`px-2 py-1.5 text-sm border rounded-lg ${t.input}`}
            >
              <option value="all">全部优先级</option>
              <option value="CRITICAL">紧急</option>
              <option value="HIGH">高</option>
              <option value="NORMAL">普通</option>
              <option value="LOW">低</option>
            </select>

            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value as AuditLevel | 'all')}
              className={`px-2 py-1.5 text-sm border rounded-lg ${t.input}`}
            >
              <option value="all">全部级别</option>
              <option value="CRITICAL">严重</option>
              <option value="WARNING">警告</option>
              <option value="INFO">信息</option>
            </select>

            <label className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlyRecent}
                onChange={(e) => setShowOnlyRecent(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              仅显示24小时内
            </label>
          </div>
        </div>
      )}

      {stats && (
        <div className={`px-4 py-2 border-b ${t.border} grid grid-cols-2 md:grid-cols-4 gap-2 text-center`}>
          <div>
            <div className={`text-xs ${t.textMuted}`}>总记录</div>
            <div className={`text-lg font-bold ${t.text}`}>{stats.total}</div>
          </div>
          <div>
            <div className={`text-xs ${t.textMuted}`}>紧急</div>
            <div className="text-lg font-bold text-red-500">{stats.byPriority?.CRITICAL || 0}</div>
          </div>
          <div>
            <div className={`text-xs ${t.textMuted}`}>高优先级</div>
            <div className="text-lg font-bold text-yellow-500">{stats.byPriority?.HIGH || 0}</div>
          </div>
          <div>
            <div className={`text-xs ${t.textMuted}`}>今日新增</div>
            <div className="text-lg font-bold text-cyan-500">{stats.recentCount}</div>
          </div>
        </div>
      )}

      <div className="overflow-y-auto" style={{ maxHeight }}>
        {logs.length === 0 ? (
          <div className={`text-center py-12 ${t.textMuted}`}>
            <Activity size={48} className="mx-auto mb-3 opacity-30" />
            <p>暂无状态变更记录</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {logs.map((log) => {
              const priorityConf = priorityConfig[log.priority];
              const PriorityIcon = priorityConf.icon;
              const isExpanded = expandedLogId === log.id;

              return (
                <div
                  key={log.id}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${isExpanded ? 'bg-cyan-50/30 dark:bg-cyan-900/10' : ''}`}
                >
                  <div
                    className="px-4 py-3 cursor-pointer"
                    onClick={() => toggleExpand(log.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 p-1.5 rounded-lg ${priorityConf.bgColor}`}>
                        <PriorityIcon size={16} className={priorityConf.color} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-1.5 py-0.5 text-xs rounded ${priorityConf.bgColor} ${priorityConf.color}`}>
                            {priorityConf.label}
                          </span>
                          <span className={`px-1.5 py-0.5 text-xs rounded bg-gray-100 dark:bg-gray-700 ${levelConfig[log.level].color}`}>
                            {levelConfig[log.level].label}
                          </span>
                          <span className={`text-xs ${t.textSecondary}`}>
                            {resourceTypeLabels[log.resourceType] || log.resourceType}
                          </span>
                          {log.resourceName && (
                            <span className={`text-sm font-medium ${t.text}`}>
                              {log.resourceName}
                            </span>
                          )}
                        </div>

                        <div className="mt-1.5 p-2 bg-white dark:bg-gray-800 rounded-lg border border-cyan-200/50 dark:border-cyan-800/50">
                          <div className="flex items-center gap-2 text-sm">
                            <span className={`px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 ${t.textSecondary}`}>
                              {log.previousState}
                            </span>
                            <span className={`text-cyan-500 ${t.textSecondary}`}>→</span>
                            <span className={`px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-900/30 ${t.text}`}>
                              {log.newState}
                            </span>
                          </div>
                        </div>

                        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <Clock size={12} />
                          <span>{formatTime(log.timestamp)}</span>
                          <span>·</span>
                          <span>{log.username}</span>
                          {log.reason && (
                            <>
                              <span>·</span>
                              <span className={`font-medium text-cyan-600 dark:text-cyan-400 truncate max-w-xs`} title={log.reason}>
                                原因: {log.reason}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <button className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${t.textMuted}`}>
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className={`px-4 pb-3 ml-14`}>
                      <div className={`p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 border ${t.border} text-sm space-y-2`}>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className={`text-xs ${t.textMuted} mb-1`}>资源ID</div>
                            <div className={`${t.text} font-mono text-xs break-all`}>{log.resourceId}</div>
                          </div>
                          <div>
                            <div className={`text-xs ${t.textMuted} mb-1`}>用户ID</div>
                            <div className={`${t.text} font-mono text-xs`}>{log.userId || '系统'}</div>
                          </div>
                        </div>

                        <div>
                          <div className={`text-xs ${t.textMuted} mb-1`}>变更原因</div>
                          <div className={`p-2 rounded bg-white dark:bg-gray-800 border-cyan-200 dark:border-cyan-800 ${t.text} font-medium text-cyan-700 dark:text-cyan-300`}>
                            {log.reason}
                          </div>
                        </div>

                        {log.context.metadata && Object.keys(log.context.metadata).length > 0 && (
                          <div>
                            <div className={`text-xs ${t.textMuted} mb-1`}>附加信息</div>
                            <pre className={`p-2 rounded bg-white dark:bg-gray-800 border ${t.border} ${t.text} text-xs overflow-auto`}>
                              {JSON.stringify(log.context.metadata, null, 2)}
                            </pre>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <span>日志ID: {log.id}</span>
                          <span>{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                      </div>

                      {onLogClick && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onLogClick(log);
                          }}
                          className="mt-2 px-3 py-1.5 text-xs bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
                        >
                          查看详情
                        </button>
                      )}
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