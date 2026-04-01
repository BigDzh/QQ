import React, { useState, useEffect } from 'react';
import { Plus, Download, Upload, Trash2, RotateCcw, Database } from 'lucide-react';
import { useToast } from '../components/Toast';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { getBackupRecords, createBackup, deleteBackup, exportData, importData, getBackupSettings, saveBackupSettings } from '../services/backup';
import type { BackupRecord, BackupSettings } from '../types/backup';
import { formatFileSize } from '../utils/auth';

export default function BackupManagement() {
  const { showToast } = useToast();
  const t = useThemeStyles();
  const [records, setRecords] = useState<BackupRecord[]>([]);
  const [settings, setSettings] = useState<BackupSettings>({ enabled: false, frequency: 'weekly' });
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    setRecords(getBackupRecords());
    setSettings(getBackupSettings());
  }, []);

  const handleCreateBackup = () => {
    const data = exportData();
    if (!data) {
      showToast('导出数据失败', 'error');
      return;
    }

    createBackup(`备份_${new Date().toLocaleDateString()}`, data);
    setRecords(getBackupRecords());

    const newSettings = { ...settings, lastBackupTime: new Date().toISOString() };
    saveBackupSettings(newSettings);
    setSettings(newSettings);

    showToast('备份创建成功', 'success');
  };

  const handleExport = () => {
    const jsonStr = exportData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `导出数据_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('数据导出成功', 'success');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (importData(content)) {
        showToast('数据导入成功，页面将自动刷新', 'success');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        showToast('数据导入失败', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个备份吗？')) {
      deleteBackup(id);
      setRecords(getBackupRecords());
      showToast('备份删除成功', 'success');
    }
  };

  const handleDownload = (record: BackupRecord) => {
    if (record.fileUrl) {
      const a = document.createElement('a');
      a.href = record.fileUrl;
      a.download = `${record.name}.json`;
      a.click();
    }
  };

  const handleSaveSettings = () => {
    saveBackupSettings(settings);
    showToast('设置保存成功', 'success');
    setShowSettings(false);
  };

  const totalSize = (records || []).reduce((sum, r) => sum + r.size, 0);

  return (
    <div>
      <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 mb-6`}>
        <div className={`${t.card} rounded-lg shadow-sm p-4 border ${t.border}`}>
          <div className={`text-sm ${t.textMuted}`}>备份数量</div>
          <div className={`text-2xl font-bold ${t.text}`}>{records.length}</div>
        </div>
        <div className={`${t.card} rounded-lg shadow-sm p-4 border ${t.border}`}>
          <div className={`text-sm ${t.textMuted}`}>总大小</div>
          <div className={`text-2xl font-bold ${t.text}`}>{formatFileSize(totalSize)}</div>
        </div>
        <div className={`${t.card} rounded-lg shadow-sm p-4 border ${t.border}`}>
          <div className={`text-sm ${t.textMuted}`}>自动备份</div>
          <div className={`text-2xl font-bold ${t.accentText}`}>
            {settings.enabled ? '已启用' : '已禁用'}
          </div>
        </div>
        <div className={`${t.card} rounded-lg shadow-sm p-4 border ${t.border}`}>
          <div className={`text-sm ${t.textMuted}`}>备份频率</div>
          <div className={`text-2xl font-bold text-emerald-400`}>
            {settings.frequency === 'daily' ? '每天' :
             settings.frequency === 'weekly' ? '每周' : '每月'}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={handleCreateBackup}
          className={`flex items-center gap-2 px-4 py-2 ${t.button} text-white rounded-lg`}
        >
          <Plus size={18} />
          创建备份
        </button>
        <button
          onClick={handleExport}
          className={`flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600`}
        >
          <Download size={18} />
          导出数据
        </button>
        <label className={`flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 cursor-pointer`}>
          <Upload size={18} />
          导入数据
          <input type="file" accept=".json" onChange={handleImport} className="hidden" />
        </label>
        <button
          onClick={() => setShowSettings(true)}
          className={`flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600`}
        >
          <RotateCcw size={18} />
          备份设置
        </button>
      </div>

      {records.length === 0 ? (
        <div className={`text-center py-12 ${t.card} rounded-lg border ${t.border}`}>
          <Database className={`mx-auto ${t.textMuted} mb-4`} size={48} />
          <p className={t.textMuted}>暂无备份记录</p>
        </div>
      ) : (
        <div className={`${t.card} rounded-lg shadow-sm overflow-hidden border ${t.border}`}>
          <table className="w-full">
            <thead className={t.tableHeader}>
              <tr>
                <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>备份名称</th>
                <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>创建时间</th>
                <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>大小</th>
                <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>操作</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id} className={`border-t ${t.border} ${t.hoverBg}`}>
                  <td className={`px-4 py-3 font-medium ${t.text}`}>{record.name}</td>
                  <td className={`px-4 py-3 ${t.textSecondary}`}>{new Date(record.timestamp).toLocaleString()}</td>
                  <td className={`px-4 py-3 ${t.textSecondary}`}>{formatFileSize(record.size)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDownload(record)}
                        className={`flex items-center gap-1 ${t.accentText} hover:opacity-80`}
                      >
                        <Download size={16} />
                        下载
                      </button>
                      <button
                        onClick={() => handleDelete(record.id)}
                        className={`flex items-center gap-1 text-red-400 hover:text-red-300`}
                      >
                        <Trash2 size={16} />
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowSettings(false)}>
          <div className={`${t.modalBg} rounded-lg p-6 w-full max-w-md border ${t.modalBorder}`} onClick={(e) => e.stopPropagation()}>
            <h2 className={`text-xl font-semibold mb-4 ${t.text}`}>备份设置</h2>
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.enabled}
                    onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className={`text-sm font-medium ${t.textSecondary}`}>启用自动备份</span>
                </label>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>备份频率</label>
                <select
                  value={settings.frequency}
                  onChange={(e) => setSettings({ ...settings, frequency: e.target.value as 'daily' | 'weekly' | 'monthly' })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                  disabled={!settings.enabled}
                >
                  <option value="daily">每天</option>
                  <option value="weekly">每周</option>
                  <option value="monthly">每月</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowSettings(false)} className={`flex-1 py-2 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}>
                  取消
                </button>
                <button onClick={handleSaveSettings} className={`flex-1 py-2 ${t.button} text-white rounded-lg`}>
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
