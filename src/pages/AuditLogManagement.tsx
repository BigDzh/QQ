import { useState, useEffect } from 'react';
import { FileText, Search, Download, Trash2, Info, AlertTriangle, AlertCircle } from 'lucide-react';
import { getAuditLogs, clearAuditLogs, exportAuditLogs } from '../services/audit';
import type { AuditLog, AuditAction, AuditLevel } from '../types/audit';
import { useToast } from '../components/Toast';

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

const levelColors: Record<AuditLevel, string> = {
  INFO: 'bg-blue-100 text-blue-700',
  WARNING: 'bg-yellow-100 text-yellow-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

export default function AuditLogManagement() {
  const { showToast } = useToast();
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
        return <Info size={16} className="text-blue-500" />;
      case 'WARNING':
        return <AlertTriangle size={16} className="text-yellow-500" />;
      case 'CRITICAL':
        return <AlertCircle size={16} className="text-red-500" />;
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-sm text-gray-500">总记录</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-sm text-gray-500">信息</div>
          <div className="text-2xl font-bold text-blue-600">{stats.info}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-sm text-gray-500">警告</div>
          <div className="text-2xl font-bold text-yellow-600">{stats.warning}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-sm text-gray-500">严重</div>
          <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="搜索用户名、资源名称..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value as AuditAction | 'all')}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="all">全部操作</option>
          {Object.entries(actionLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value as AuditLevel | 'all')}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="all">全部级别</option>
          <option value="INFO">信息</option>
          <option value="WARNING">警告</option>
          <option value="CRITICAL">严重</option>
        </select>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Download size={18} />
          导出
        </button>
        <button
          onClick={handleClear}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          <Trash2 size={18} />
          清空
        </button>
      </div>

      {filteredLogs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg">
          <FileText className="mx-auto text-gray-300 mb-4" size={48} />
          <p className="text-gray-500">暂无日志记录</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">时间</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">用户</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">操作</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">资源类型</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">资源名称</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">级别</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">详情</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">{log.username}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                      {actionLabels[log.action]}
                    </span>
                  </td>
                  <td className="px-4 py-3">{log.resourceType}</td>
                  <td className="px-4 py-3">{log.resourceName || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${levelColors[log.level]}`}>
                      {getLevelIcon(log.level)}
                      {log.level === 'INFO' ? '信息' : log.level === 'WARNING' ? '警告' : '严重'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
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
