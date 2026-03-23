import { useState, useEffect } from 'react';
import { FileText, Search, Download, Trash2, Info, AlertTriangle, AlertCircle } from 'lucide-react';
import { getAuditLogs, clearAuditLogs, exportAuditLogs } from '../services/audit';
import type { AuditLog, AuditAction, AuditLevel } from '../types/audit';
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
};

export default function AuditLogManagement() {
  const { showToast } = useToast();
  const t = useThemeStyles();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<AuditAction | 'all'>('all');
  const [levelFilter, setLevelFilter] = useState<AuditLevel | 'all'>('all');

  useEffect(() => {
    const data = getAuditLogs();
    setLogs(data);
    setFilteredLogs(data);
  }, []);

  useEffect(() => {
    let filtered = logs;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.username.toLowerCase().includes(term) ||
          log.resourceName?.toLowerCase().includes(term) ||
          log.details?.toLowerCase().includes(term)
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

  const handleExport = () => {
    const jsonStr = exportAuditLogs();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `审计日志_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('日志导出成功', 'success');
  };

  const handleClear = () => {
    if (confirm('确定要清空所有审计日志吗？此操作不可恢复。')) {
      clearAuditLogs();
      setLogs([]);
      setFilteredLogs([]);
      showToast('日志已清空', 'success');
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

  const stats = {
    total: logs.length,
    info: logs.filter((l) => l.level === 'INFO').length,
    warning: logs.filter((l) => l.level === 'WARNING').length,
    critical: logs.filter((l) => l.level === 'CRITICAL').length,
  };

  return (
    <div>
      <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 mb-6`}>
        <div className={`${t.card} rounded-lg shadow-sm p-4 border ${t.border}`}>
          <div className={`text-sm ${t.textMuted}`}>总记录</div>
          <div className={`text-2xl font-bold ${t.text}`}>{stats.total}</div>
        </div>
        <div className={`${t.card} rounded-lg shadow-sm p-4 border ${t.border}`}>
          <div className={`text-sm ${t.textMuted}`}>信息</div>
          <div className={`text-2xl font-bold text-blue-400`}>{stats.info}</div>
        </div>
        <div className={`${t.card} rounded-lg shadow-sm p-4 border ${t.border}`}>
          <div className={`text-sm ${t.textMuted}`}>警告</div>
          <div className={`text-2xl font-bold text-yellow-400`}>{stats.warning}</div>
        </div>
        <div className={`${t.card} rounded-lg shadow-sm p-4 border ${t.border}`}>
          <div className={`text-sm ${t.textMuted}`}>严重</div>
          <div className={`text-2xl font-bold text-red-400`}>{stats.critical}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${t.textMuted}`} size={18} />
          <input
            type="text"
            placeholder="搜索用户名、资源名称..."
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
          onClick={handleExport}
          className={`flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600`}
        >
          <Download size={18} />
          导出
        </button>
        <button
          onClick={handleClear}
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
                <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>详情</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} className={`border-t ${t.border} ${t.hoverBg}`}>
                  <td className={`px-4 py-3 text-sm ${t.textMuted}`}>
                    {new Date(log.timestamp).toLocaleString()}
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
                  <td className={`px-4 py-3 text-sm ${t.textMuted} max-w-xs truncate`}>
                    {log.details || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
