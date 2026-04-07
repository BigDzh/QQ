import { useState, useEffect, useMemo } from 'react';
import { FileText, RefreshCw, Trash2, Download, Filter, Monitor } from 'lucide-react';
import { useThemeStyles } from '../../../hooks/useThemeStyles';
import { getSystemLogs, addSystemLogListener } from '../../../services/logger/systemLogger';
import type { SystemLogEntry } from '../../../services/logger/systemLogger';
import type { LogFilter, LogLevel } from '../../../services/logger/types';

interface SystemLogsProps {
  systemId?: string;
  title?: string;
}

export function SystemLogs({ systemId, title = '系统日志' }: SystemLogsProps) {
  const t = useThemeStyles();
  const [logs, setLogs] = useState<SystemLogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<LogLevel | 'ALL'>('ALL');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const loadLogs = () => {
      const allLogs = getSystemLogs({ limit: 500 });

      const filteredLogs = systemId
        ? allLogs.filter(log => {
            const affectedModules = log.impactScope?.affectedModules || [];
            return affectedModules.includes(systemId) || affectedModules.includes('*');
          })
        : allLogs;

      setLogs(filteredLogs);
    };

    loadLogs();

    const unsubscribe = addSystemLogListener(() => {
      loadLogs();
    });

    return () => {
      unsubscribe();
    };
  }, [systemId, refreshKey]);

  const filteredLogs = useMemo(() => {
    let result = logs;

    if (levelFilter !== 'ALL') {
      result = result.filter(log => log.level === levelFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(log =>
        log.eventDescription?.toLowerCase().includes(term) ||
        log.user?.username?.toLowerCase().includes(term) ||
        log.eventType?.toLowerCase().includes(term) ||
        log.reason?.toLowerCase().includes(term)
      );
    }

    return result;
  }, [logs, levelFilter, searchTerm]);

  const stats = useMemo(() => ({
    total: logs.length,
    info: logs.filter(l => l.level === 'INFO').length,
    warn: logs.filter(l => l.level === 'WARN').length,
    error: logs.filter(l => l.level === 'ERROR').length,
    critical: logs.filter(l => l.level === 'CRITICAL').length,
  }), [logs]);

  const getLevelBadgeClass = (level: LogLevel) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400';
      case 'ERROR':
        return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400';
      case 'WARN':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400';
      case 'INFO':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700/40 dark:text-gray-400';
    }
  };

  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      case 'CONFIG_CHANGE':
        return '⚙️';
      case 'SERVICE_START':
        return '🚀';
      case 'SERVICE_STOP':
        return '⏹️';
      case 'PERFORMANCE_ANOMALY':
        return '📊';
      case 'SECURITY_EVENT':
        return '🔒';
      case 'CROSS_MODULE_CHANGE':
        return '🔀';
      case 'SYSTEM_INIT':
        return '🔄';
      case 'SYSTEM_SHUTDOWN':
        return '🔴';
      default:
        return '📋';
    }
  };

  const handleExport = () => {
    const data = JSON.stringify(filteredLogs, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system_logs_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (logs.length === 0) {
    return (
      <div className={`${t.card} rounded-lg border ${t.border} p-6`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-emerald-100">
            <Monitor className="text-emerald-600" size={20} />
          </div>
          <div>
            <h3 className={`font-semibold text-lg ${t.text}`}>{title}</h3>
            <p className={`text-xs ${t.textMuted}`}>暂无日志记录</p>
          </div>
        </div>
        <div className={`text-center py-12 ${t.card} rounded-lg border ${t.border}`}>
          <FileText className={`mx-auto ${t.textMuted} mb-4`} size={48} />
          <p className={t.textMuted}>暂无系统日志</p>
          <p className={`text-sm ${t.textMuted} mt-2`}>系统配置变更将被记录在此</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${t.card} rounded-lg border ${t.border} p-6`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-100">
            <Monitor className="text-emerald-600" size={20} />
          </div>
          <div>
            <h3 className={`font-semibold text-lg ${t.text}`}>{title}</h3>
            <p className={`text-xs ${t.textMuted}`}>
              共 {stats.total} 条日志
              {stats.warn > 0 && <span className="text-yellow-500 ml-2">⚠️ {stats.warn} 警告</span>}
              {stats.error > 0 && <span className="text-red-500 ml-2">❌ {stats.error} 错误</span>}
              {stats.critical > 0 && <span className="text-red-600 ml-2">🚨 {stats.critical} 严重</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className={`p-2 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}
            title="刷新日志"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={handleExport}
            className={`p-2 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}
            title="导出日志"
          >
            <Download size={16} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Filter size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${t.textMuted}`} />
          <input
            type="text"
            placeholder="搜索日志..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 border rounded-lg text-sm ${t.input}`}
          />
        </div>
        <div className="flex gap-2">
          {(['ALL', 'INFO', 'WARN', 'ERROR', 'CRITICAL'] as const).map(level => (
            <button
              key={level}
              onClick={() => setLevelFilter(level)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                levelFilter === level
                  ? level === 'ALL' ? `${t.button} text-white` :
                    level === 'INFO' ? 'bg-blue-500 text-white' :
                    level === 'WARN' ? 'bg-yellow-500 text-white' :
                    level === 'ERROR' ? 'bg-red-500 text-white' :
                    'bg-red-600 text-white'
                  : `${t.border} ${t.textSecondary} hover:${t.hoverBg}`
              }`}
            >
              {level === 'ALL' ? '全部' : level}
            </button>
          ))}
        </div>
      </div>

      <div className={`rounded-lg border ${t.border} overflow-hidden`}>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full">
            <thead className={t.tableHeader}>
              <tr>
                <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary} w-8`}>类型</th>
                <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary} w-24`}>时间</th>
                <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary} w-20`}>用户</th>
                <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>事件描述</th>
                <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary} w-16`}>级别</th>
                <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>原因</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log, index) => (
                <tr key={log.id || index} className={`border-t ${t.border} ${t.hoverBg}`}>
                  <td className={`px-4 py-3 text-lg`}>
                    {getEventTypeIcon(log.eventType)}
                  </td>
                  <td className={`px-4 py-3 ${t.textSecondary} text-sm whitespace-nowrap`}>
                    {new Date(log.timestamp).toLocaleString('zh-CN', {
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </td>
                  <td className={`px-4 py-3 ${t.text} text-sm`}>
                    {log.user?.username || '系统'}
                  </td>
                  <td className={`px-4 py-3 ${t.text} text-sm`}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{log.eventType}</span>
                      <span className={t.textMuted}>-</span>
                      <span className="truncate max-w-md" title={log.eventDescription}>
                        {log.eventDescription}
                      </span>
                    </div>
                  </td>
                  <td className={`px-4 py-3`}>
                    <span className={`px-2 py-0.5 rounded text-xs ${getLevelBadgeClass(log.level)}`}>
                      {log.level}
                    </span>
                  </td>
                  <td className={`px-4 py-3 ${t.textSecondary} text-sm max-w-xs truncate`} title={log.reason}>
                    {log.reason || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredLogs.length === 0 && searchTerm && (
        <div className={`text-center py-8 ${t.textMuted}`}>
          <p>未找到匹配的日志记录</p>
        </div>
      )}
    </div>
  );
}

export default SystemLogs;
