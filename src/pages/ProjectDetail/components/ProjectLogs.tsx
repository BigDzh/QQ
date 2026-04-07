import { useState, useEffect, useMemo } from 'react';
import { FileText, RefreshCw, Trash2, Download, Filter } from 'lucide-react';
import { useThemeStyles } from '../../../hooks/useThemeStyles';
import { getProjectLogs, addProjectLogListener, projectLogger } from '../../../services/logger/projectLogger';
import { getSystemLogs, addSystemLogListener } from '../../../services/logger/systemLogger';
import { getModuleLogs, addModuleLogListener } from '../../../services/logger/moduleLogger';
import { getComponentLogs, addComponentLogListener } from '../../../services/logger/componentLogger';
import type { HierarchicalLogEntry, LogLayer } from '../../../services/logger/types';

interface ProjectLog {
  id: string;
  timestamp: string;
  username: string;
  action: string;
  details?: string;
  layer?: LogLayer;
  level?: string;
}

interface ProjectLogsProps {
  logs: ProjectLog[];
}

interface UnifiedLogEntry {
  id: string;
  timestamp: string;
  username: string;
  action: string;
  details?: string;
  layer: LogLayer;
  level: string;
}

export function ProjectLogs({ logs: propLogs }: ProjectLogsProps) {
  const t = useThemeStyles();
  const [activeTab, setActiveTab] = useState<'all' | 'project' | 'system' | 'module' | 'component'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [unifiedLogs, setUnifiedLogs] = useState<UnifiedLogEntry[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const loadAllLogs = () => {
      const projectLogs = getProjectLogs({ limit: 500 });
      const systemLogs = getSystemLogs({ limit: 500 });
      const moduleLogs = getModuleLogs({ limit: 500 });
      const componentLogs = getComponentLogs({ limit: 500 });

      const combined: UnifiedLogEntry[] = [
        ...projectLogs.map(log => ({
          id: log.id,
          timestamp: log.timestamp,
          username: log.user?.username || '系统',
          action: `项目${log.changeType}`,
          details: log.reason || log.metadata ? JSON.stringify(log.metadata || {}) : undefined,
          layer: 'PROJECT' as LogLayer,
          level: log.level,
        })),
        ...systemLogs.map(log => ({
          id: log.id,
          timestamp: log.timestamp,
          username: log.user?.username || '系统',
          action: `系统${log.eventType}`,
          details: log.eventDescription,
          layer: 'SYSTEM' as LogLayer,
          level: log.level,
        })),
        ...moduleLogs.map(log => ({
          id: log.id,
          timestamp: log.timestamp,
          username: log.user?.username || '系统',
          action: `模块${log.changeType}: ${log.moduleName}`,
          details: log.changeDetails || log.reason,
          layer: 'MODULE' as LogLayer,
          level: log.level,
        })),
        ...componentLogs.map(log => ({
          id: log.id,
          timestamp: log.timestamp,
          username: log.user?.username || '系统',
          action: `组件${log.changeType}: ${log.componentName}`,
          details: log.reason || (log.changedProperties?.length ? `变更属性: ${log.changedProperties.map(p => p.key).join(', ')}` : undefined),
          layer: 'COMPONENT' as LogLayer,
          level: log.level,
        })),
      ].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

      setUnifiedLogs(combined);
    };

    loadAllLogs();

    const unsubProject = addProjectLogListener(() => loadAllLogs());
    const unsubSystem = addSystemLogListener(() => loadAllLogs());
    const unsubModule = addModuleLogListener(() => loadAllLogs());
    const unsubComponent = addComponentLogListener(() => loadAllLogs());

    return () => {
      unsubProject();
      unsubSystem();
      unsubModule();
      unsubComponent();
    };
  }, [refreshKey]);

  const filteredLogs = useMemo(() => {
    let result = unifiedLogs;

    if (activeTab !== 'all') {
      const layerMap: Record<string, LogLayer> = {
        'project': 'PROJECT',
        'system': 'SYSTEM',
        'module': 'MODULE',
        'component': 'COMPONENT',
      };
      result = result.filter(log => log.layer === layerMap[activeTab]);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(log =>
        log.action.toLowerCase().includes(term) ||
        log.username.toLowerCase().includes(term) ||
        (log.details && log.details.toLowerCase().includes(term))
      );
    }

    return result;
  }, [unifiedLogs, activeTab, searchTerm]);

  const stats = useMemo(() => {
    return {
      all: unifiedLogs.length,
      project: unifiedLogs.filter(l => l.layer === 'PROJECT').length,
      system: unifiedLogs.filter(l => l.layer === 'SYSTEM').length,
      module: unifiedLogs.filter(l => l.layer === 'MODULE').length,
      component: unifiedLogs.filter(l => l.layer === 'COMPONENT').length,
    };
  }, [unifiedLogs]);

  const getLevelBadgeClass = (level: string) => {
    switch (level) {
      case 'CRITICAL':
      case 'ERROR':
        return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400';
      case 'WARN':
      case 'WARNING':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400';
      case 'INFO':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700/40 dark:text-gray-400';
    }
  };

  const getLayerIcon = (layer: LogLayer) => {
    switch (layer) {
      case 'PROJECT':
        return '📋';
      case 'SYSTEM':
        return '🖥️';
      case 'MODULE':
        return '📦';
      case 'COMPONENT':
        return '🧩';
      default:
        return '📄';
    }
  };

  const handleClearLogs = () => {
    projectLogger.clearProjectLogs();
    setRefreshKey(k => k + 1);
  };

  const handleExport = () => {
    const data = JSON.stringify(filteredLogs, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (unifiedLogs.length === 0 && propLogs?.length === 0) {
    return (
      <div className={`text-center py-12 ${t.card} rounded-lg border ${t.border}`}>
        <FileText className={`mx-auto ${t.textMuted} mb-4`} size={48} />
        <p className={t.textMuted}>暂无日志</p>
        <p className={`text-sm ${t.textMuted} mt-2`}>所有项目变更将被记录在此</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={`${t.card} rounded-lg shadow-sm border ${t.border} p-4`}>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Filter size={16} className={t.textMuted} />
            <input
              type="text"
              placeholder="搜索日志..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`px-3 py-1.5 border rounded-lg text-sm ${t.input}`}
            />
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
            <button
              onClick={handleClearLogs}
              className={`p-2 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}
              title="清空日志"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto">
          {(['all', 'project', 'system', 'module', 'component'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? `${t.button} text-white`
                  : `${t.border} ${t.textSecondary} hover:${t.hoverBg}`
              }`}
            >
              {tab === 'all' ? '全部' : tab === 'project' ? '项目' : tab === 'system' ? '系统' : tab === 'module' ? '模块' : '组件'}
              <span className={`ml-1.5 px-1.5 py-0.5 rounded text-xs ${
                activeTab === tab ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-600'
              }`}>
                {stats[tab]}
              </span>
            </button>
          ))}
        </div>

        <div className={`text-sm ${t.textMuted} mb-2`}>
          共 {filteredLogs.length} 条日志
        </div>
      </div>

      <div className={`${t.card} rounded-lg shadow-sm overflow-hidden border ${t.border}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={t.tableHeader}>
              <tr>
                <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>时间</th>
                <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>层级</th>
                <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>用户</th>
                <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>操作</th>
                <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>级别</th>
                <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>详情</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} className={`border-t ${t.border} ${t.hoverBg}`}>
                  <td className={`px-4 py-3 ${t.textSecondary} text-sm whitespace-nowrap`}>
                    {new Date(log.timestamp).toLocaleString('zh-CN')}
                  </td>
                  <td className={`px-4 py-3 ${t.text} text-sm`}>
                    <span className="flex items-center gap-1">
                      <span>{getLayerIcon(log.layer)}</span>
                      <span className="capitalize">{log.layer.toLowerCase()}</span>
                    </span>
                  </td>
                  <td className={`px-4 py-3 ${t.text} text-sm`}>{log.username}</td>
                  <td className={`px-4 py-3 ${t.text} text-sm`}>{log.action}</td>
                  <td className={`px-4 py-3`}>
                    <span className={`px-2 py-0.5 rounded text-xs ${getLevelBadgeClass(log.level)}`}>
                      {log.level}
                    </span>
                  </td>
                  <td className={`px-4 py-3 ${t.textSecondary} text-sm max-w-xs truncate`} title={log.details}>
                    {log.details || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default ProjectLogs;
