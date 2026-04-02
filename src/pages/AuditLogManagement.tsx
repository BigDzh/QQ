import { useState, useEffect } from 'react';
import { FileText, Search, Download, Trash2, Info, AlertTriangle, AlertCircle, Activity, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { getAuditLogs, clearAuditLogs, exportAuditLogs } from '../services/audit';
import { getStateChangeLogs, exportStateChangeLogs, clearStateChangeLogs } from '../services/stateChangeLogger';
import type { AuditLog, AuditAction, AuditLevel } from '../types/audit';
import type { StateChangeLog, StateChangePriority } from '../services/stateChangeLogger';
import { useToast } from '../components/Toast';
import { useThemeStyles } from '../hooks/useThemeStyles';

const actionLabels: Record<AuditAction, string> = {
  LOGIN: '登录',
  LOGOUT: '登出',
  CREATE: '创建',
  UPDATE: '更新',
  DELETE: '删除',
  VIEW: '查看',
  EXPORT: '导出',
  IMPORT: '导入',
  BACKUP: '备份',
  RESTORE: '恢复',
  ENABLE: '启用',
  DISABLE: '禁用',
  STATUS_CHANGE: '状态变更',
  CONFIG_CHANGE: '配置变更',
  LAYOUT_CHANGE: '布局变更',
};

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

type TabType = 'audit' | 'statechange';

export default function AuditLogManagement() {
  const { showToast } = useToast();
  const t = useThemeStyles();
  const [activeTab, setActiveTab] = useState<TabType>('audit');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [stateChangeLogs, setStateChangeLogs] = useState<StateChangeLog[]>([]);
  const [filteredStateChangeLogs, setFilteredStateChangeLogs] = useState<StateChangeLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<AuditAction | 'all'>('all');
  const [levelFilter, setLevelFilter] = useState<AuditLevel | 'all'>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [stateChangeSearchTerm, setStateChangeSearchTerm] = useState('');
  const [stateChangeResourceFilter, setStateChangeResourceFilter] = useState<string>('all');
  const [stateChangePriorityFilter, setStateChangePriorityFilter] = useState<string>('all');

  useEffect(() => {
    const data = getAuditLogs();
    setLogs(data);
    setFilteredLogs(data);

    const scLogs = getStateChangeLogs();
    setStateChangeLogs(scLogs);
    setFilteredStateChangeLogs(scLogs);
  }, []);

  useEffect(() => {
    let filtered = logs;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.username.toLowerCase().includes(term) ||
          log.resourceName?.toLowerCase().includes(term) ||
          log.details?.toLowerCase().includes(term) ||
          log.reason?.toLowerCase().includes(term)
      );
    }

    if (actionFilter !== 'all') {
      filtered = filtered.filter((log) => log.action === actionFilter);
    }

    if (levelFilter !== 'all') {
      filtered = filtered.filter((log) => log.level === levelFilter);
    }

    setFilteredLogs(filtered);
  }, [logs, searchTerm, actionFilter, levelFilter]);

  useEffect(() => {
    let filtered = stateChangeLogs;

    if (stateChangeSearchTerm) {
      const term = stateChangeSearchTerm.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.username.toLowerCase().includes(term) ||
          log.resourceName?.toLowerCase().includes(term) ||
          log.reason.toLowerCase().includes(term) ||
          log.previousState.toLowerCase().includes(term) ||
          log.newState.toLowerCase().includes(term)
      );
    }

    if (stateChangeResourceFilter !== 'all') {
      filtered = filtered.filter((log) => log.resourceType === stateChangeResourceFilter);
    }

    if (stateChangePriorityFilter !== 'all') {
      filtered = filtered.filter((log) => log.priority === stateChangePriorityFilter);
    }

    setFilteredStateChangeLogs(filtered);
  }, [stateChangeLogs, stateChangeSearchTerm, stateChangeResourceFilter, stateChangePriorityFilter]);

  const handleExportAudit = () => {
    const jsonStr = exportAuditLogs();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `审计日志_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('审计日志导出成功', 'success');
  };

  const handleExportStateChange = () => {
    const jsonStr = exportStateChangeLogs();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `状态变更日志_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('状态变更日志导出成功', 'success');
  };

  const handleClearAudit = () => {
    if (confirm('确定要清空所有审计日志吗？此操作不可恢复。')) {
      clearAuditLogs();
      setLogs([]);
      setFilteredLogs([]);
      showToast('审计日志已清空', 'success');
    }
  };

  const handleClearStateChange = () => {
    if (confirm('确定要清空所有状态变更日志吗？此操作不可恢复。')) {
      clearStateChangeLogs();
      setStateChangeLogs([]);
      setFilteredStateChangeLogs([]);
      showToast('状态变更日志已清空', 'success');
    }
  };

  const getLevelIcon = (level: AuditLevel) => {
    switch (level) {
      case 'INFO':
        return <Info size={16} className="text-blue-400" />;
      case 'WARNING':
        return <AlertTriangle size={16} className="text-yellow-400" />;
      case 'CRITICAL':
        return <AlertCircle size={16} className="text-red-400" />;
    }
  };

  const getLevelColors = (level: AuditLevel) => {
    switch (level) {
      case 'INFO':
        return 'bg-blue-500/20 text-blue-400';
      case 'WARNING':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'CRITICAL':
        return 'bg-red-500/20 text-red-400';
    }
  };

  const auditStats = {
    total: logs.length,
    info: logs.filter((l) => l.level === 'INFO').length,
    warning: logs.filter((l) => l.level === 'WARNING').length,
    critical: logs.filter((l) => l.level === 'CRITICAL').length,
  };

  const stateChangeStats = {
    total: stateChangeLogs.length,
    critical: stateChangeLogs.filter((l) => l.priority === 'CRITICAL').length,
    high: stateChangeLogs.filter((l) => l.priority === 'HIGH').length,
    normal: stateChangeLogs.filter((l) => l.priority === 'NORMAL').length,
    low: stateChangeLogs.filter((l) => l.priority === 'LOW').length,
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const formatRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    return date.toLocaleDateString();
  };

  const toggleExpand = (logId: string) => {
    setExpandedLogId(prev => prev === logId ? null : logId);
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'audit'
                ? 'bg-white dark:bg-gray-700 text-cyan-600 dark:text-cyan-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <FileText size={16} />
              审计日志
            </span>
          </button>
          <button
            onClick={() => setActiveTab('statechange')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'statechange'
                ? 'bg-white dark:bg-gray-700 text-cyan-600 dark:text-cyan-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <Activity size={16} />
              状态变更日志
              {stateChangeStats.critical > 0 && (
                <span className="px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full animate-pulse">
                  {stateChangeStats.critical}
                </span>
              )}
            </span>
          </button>
        </div>
      </div>

      {activeTab === 'audit' ? (
        <>
          <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 mb-6`}>
            <div className={`${t.card} rounded-lg shadow-sm p-4 border ${t.border}`}>
              <div className={`text-sm ${t.textMuted}`}>总记录</div>
              <div className={`text-2xl font-bold ${t.text}`}>{auditStats.total}</div>
            </div>
            <div className={`${t.card} rounded-lg shadow-sm p-4 border ${t.border}`}>
              <div className={`text-sm ${t.textMuted}`}>信息</div>
              <div className={`text-2xl font-bold text-blue-400`}>{auditStats.info}</div>
            </div>
            <div className={`${t.card} rounded-lg shadow-sm p-4 border ${t.border}`}>
              <div className={`text-sm ${t.textMuted}`}>警告</div>
              <div className={`text-2xl font-bold text-yellow-400`}>{auditStats.warning}</div>
            </div>
            <div className={`${t.card} rounded-lg shadow-sm p-4 border ${t.border}`}>
              <div className={`text-sm ${t.textMuted}`}>严重</div>
              <div className={`text-2xl font-bold text-red-400`}>{auditStats.critical}</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${t.textMuted}`} size={18} />
              <input
                type="text"
                placeholder="搜索用户名、资源名称、原因..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg ${t.input}`}
              />
            </div>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value as AuditAction | 'all')}
              className={`px-3 py-2 border rounded-lg ${t.input}`}
            >
              <option value="all">全部操作</option>
              {Object.entries(actionLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value as AuditLevel | 'all')}
              className={`px-3 py-2 border rounded-lg ${t.input}`}
            >
              <option value="all">全部级别</option>
              <option value="INFO">信息</option>
              <option value="WARNING">警告</option>
              <option value="CRITICAL">严重</option>
            </select>
            <button
              onClick={handleExportAudit}
              className={`flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600`}
            >
              <Download size={18} />
              导出
            </button>
            <button
              onClick={handleClearAudit}
              className={`flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600`}
            >
              <Trash2 size={18} />
              清空
            </button>
          </div>

          {filteredLogs.length === 0 ? (
            <div className={`text-center py-12 ${t.card} rounded-lg border ${t.border}`}>
              <FileText className={`mx-auto ${t.textMuted} mb-4`} size={48} />
              <p className={t.textMuted}>暂无日志记录</p>
            </div>
          ) : (
            <div className={`${t.card} rounded-lg shadow-sm overflow-hidden border ${t.border}`}>
              <table className="w-full">
                <thead className={t.tableHeader}>
                  <tr>
                    <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>时间</th>
                    <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>用户</th>
                    <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>操作</th>
                    <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>资源类型</th>
                    <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>资源名称</th>
                    <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>级别</th>
                    <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>变更原因</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className={`border-t ${t.border} ${t.hoverBg}`}>
                      <td className={`px-4 py-3 text-sm ${t.textMuted}`}>
                        {formatRelativeTime(log.timestamp)}
                      </td>
                      <td className={`px-4 py-3 ${t.text}`}>{log.username}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 ${t.emptyBg} rounded text-xs ${t.text}`}>
                          {actionLabels[log.action]}
                        </span>
                      </td>
                      <td className={`px-4 py-3 ${t.textSecondary}`}>{log.resourceType}</td>
                      <td className={`px-4 py-3 ${t.textSecondary}`}>{log.resourceName || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${getLevelColors(log.level)}`}>
                          {getLevelIcon(log.level)}
                          {log.level === 'INFO' ? '信息' : log.level === 'WARNING' ? '警告' : '严重'}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-sm ${t.text} font-medium max-w-xs truncate`}>
                        {log.reason || log.details || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <>
          <div className={`grid grid-cols-1 md:grid-cols-5 gap-4 mb-6`}>
            <div className={`${t.card} rounded-lg shadow-sm p-4 border ${t.border}`}>
              <div className={`text-sm ${t.textMuted}`}>总记录</div>
              <div className={`text-2xl font-bold ${t.text}`}>{stateChangeStats.total}</div>
            </div>
            <div className={`${t.card} rounded-lg shadow-sm p-4 border ${t.border}`}>
              <div className={`text-sm ${t.textMuted}`}>紧急</div>
              <div className={`text-2xl font-bold text-red-500`}>{stateChangeStats.critical}</div>
            </div>
            <div className={`${t.card} rounded-lg shadow-sm p-4 border ${t.border}`}>
              <div className={`text-sm ${t.textMuted}`}>高优先级</div>
              <div className={`text-2xl font-bold text-yellow-500`}>{stateChangeStats.high}</div>
            </div>
            <div className={`${t.card} rounded-lg shadow-sm p-4 border ${t.border}`}>
              <div className={`text-sm ${t.textMuted}`}>普通</div>
              <div className={`text-2xl font-bold text-blue-400`}>{stateChangeStats.normal}</div>
            </div>
            <div className={`${t.card} rounded-lg shadow-sm p-4 border ${t.border}`}>
              <div className={`text-sm ${t.textMuted}`}>低</div>
              <div className={`text-2xl font-bold text-gray-400`}>{stateChangeStats.low}</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${t.textMuted}`} size={18} />
              <input
                type="text"
                placeholder="搜索原因、状态、资源名称..."
                value={stateChangeSearchTerm}
                onChange={(e) => setStateChangeSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg ${t.input}`}
              />
            </div>
            <select
              value={stateChangeResourceFilter}
              onChange={(e) => setStateChangeResourceFilter(e.target.value)}
              className={`px-3 py-2 border rounded-lg ${t.input}`}
            >
              <option value="all">全部资源</option>
              <option value="SYSTEM">系统</option>
              <option value="MODULE">模块</option>
              <option value="COMPONENT">组件</option>
              <option value="PROJECT">项目</option>
            </select>
            <select
              value={stateChangePriorityFilter}
              onChange={(e) => setStateChangePriorityFilter(e.target.value)}
              className={`px-3 py-2 border rounded-lg ${t.input}`}
            >
              <option value="all">全部优先级</option>
              <option value="CRITICAL">紧急</option>
              <option value="HIGH">高</option>
              <option value="NORMAL">普通</option>
              <option value="LOW">低</option>
            </select>
            <button
              onClick={handleExportStateChange}
              className={`flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600`}
            >
              <Download size={18} />
              导出
            </button>
            <button
              onClick={handleClearStateChange}
              className={`flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600`}
            >
              <Trash2 size={18} />
              清空
            </button>
          </div>

          {filteredStateChangeLogs.length === 0 ? (
            <div className={`text-center py-12 ${t.card} rounded-lg border ${t.border}`}>
              <Activity className={`mx-auto ${t.textMuted} mb-4`} size={48} />
              <p className={t.textMuted}>暂无状态变更记录</p>
            </div>
          ) : (
            <div className={`${t.card} rounded-lg shadow-sm overflow-hidden border ${t.border}`}>
              <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {filteredStateChangeLogs.map((log) => {
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
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className={`px-1.5 py-0.5 text-xs rounded ${priorityConf.bgColor} ${priorityConf.color} font-medium`}>
                                {priorityConf.label}
                              </span>
                              <span className={`px-1.5 py-0.5 text-xs rounded ${levelConfig[log.level].color} bg-opacity-20`}>
                                {levelConfig[log.level].label}
                              </span>
                              <span className={`text-xs ${t.textSecondary}`}>
                                {log.resourceType}
                              </span>
                              {log.resourceName && (
                                <span className={`text-sm font-medium ${t.text}`}>
                                  {log.resourceName}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-sm mb-2">
                              <span className={`px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 ${t.textSecondary}`}>
                                {log.previousState}
                              </span>
                              <span className={`text-cyan-500`}>→</span>
                              <span className={`px-2 py-1 rounded bg-cyan-100 dark:bg-cyan-900/30 ${t.text} font-medium`}>
                                {log.newState}
                              </span>
                            </div>

                            <div className={`p-2 rounded-lg bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 border border-cyan-200/50 dark:border-cyan-800/50`}>
                              <div className="flex items-center gap-1 text-xs text-cyan-600 dark:text-cyan-400 mb-1">
                                <span className="font-semibold">变更原因:</span>
                              </div>
                              <div className={`text-sm font-medium text-gray-800 dark:text-gray-200`}>
                                {log.reason}
                              </div>
                            </div>

                            <div className={`mt-2 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400`}>
                              <span className="flex items-center gap-1">
                                <Clock size={12} />
                                {formatRelativeTime(log.timestamp)}
                              </span>
                              <span>·</span>
                              <span>{log.username}</span>
                              <span>·</span>
                              <span className="font-mono text-xs">{log.id.slice(0, 8)}</span>
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
                              <div className={`text-xs ${t.textMuted} mb-1`}>完整原因</div>
                              <div className={`p-2 rounded bg-white dark:bg-gray-800 border-cyan-200 dark:border-cyan-800 ${t.text} font-medium text-cyan-700 dark:text-cyan-300`}>
                                {log.reason}
                              </div>
                            </div>

                            {log.context.metadata && Object.keys(log.context.metadata).length > 0 && (
                              <div>
                                <div className={`text-xs ${t.textMuted} mb-1`}>附加信息</div>
                                <pre className={`p-2 rounded bg-white dark:bg-gray-800 border ${t.border} ${t.text} text-xs overflow-auto max-h-32`}>
                                  {JSON.stringify(log.context.metadata, null, 2)}
                                </pre>
                              </div>
                            )}

                            <div className="flex items-center justify-between text-xs text-gray-400">
                              <span>日志ID: {log.id}</span>
                              <span>{formatTime(log.timestamp)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}