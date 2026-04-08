import React, { useState, useEffect, useCallback } from 'react';
import { Save, RotateCcw, History, Trash2, Check, X, ExternalLink, Shield, AlertCircle, Loader2, Eye, EyeOff, Link2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../components/Toast';
import { useThemeStyles } from '../../hooks/useThemeStyles';
import { safeGetObject, safeSetObject } from '../../services/storageManager';
import { addAuditLog } from '../../services/audit';
import type { ComponentStatus } from '../../types';

interface JumpUrlConfig {
  status: ComponentStatus;
  url: string;
  enabled: boolean;
}

interface JumpConfigLog {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  action: 'create' | 'update' | 'delete';
  status: ComponentStatus;
  oldUrl?: string;
  newUrl?: string;
}

const STORAGE_KEY = 'jump_url_config';
const LOG_STORAGE_KEY = 'jump_url_config_logs';

const STATUS_LABELS: Record<ComponentStatus, string> = {
  '投产中': '提交投产',
  '维修中': '提交维修',
  '三防中': '提交三防',
  '测试中': '提交测试',
  '仿真中': '提交仿真',
};

const DEFAULT_CONFIG: JumpUrlConfig[] = [
  { status: '投产中', url: '', enabled: true },
  { status: '维修中', url: '', enabled: true },
  { status: '三防中', url: '', enabled: true },
  { status: '测试中', url: '', enabled: true },
  { status: '仿真中', url: '', enabled: true },
];

const isValidUrl = (url: string): boolean => {
  if (!url.trim()) return true;
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
};

const getUrlValidationMessage = (url: string): string | null => {
  if (!url.trim()) return null;
  if (!isValidUrl(url)) return '请输入有效的URL地址（以 http:// 或 https:// 开头）';
  return null;
};

export default function JumpSkillConfig() {
  const { currentUser } = useApp();
  const { showToast } = useToast();
  const t = useThemeStyles();

  const [configs, setConfigs] = useState<JumpUrlConfig[]>(() => {
    const saved = safeGetObject<JumpUrlConfig[]>(STORAGE_KEY);
    return saved && saved.length === 5 ? saved : DEFAULT_CONFIG;
  });

  const [editedConfigs, setEditedConfigs] = useState<JumpUrlConfig[]>(configs);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [logs, setLogs] = useState<JumpConfigLog[]>(() => {
    return safeGetObject<JumpConfigLog[]>(LOG_STORAGE_KEY) || [];
  });
  const [showUrls, setShowUrls] = useState<Record<ComponentStatus, boolean>>({
    '投产中': false,
    '维修中': false,
    '三防中': false,
    '测试中': false,
    '仿真中': false,
  });

  const isAdmin = currentUser?.role === 'admin';
  const canEdit = isAdmin;

  useEffect(() => {
    const hasDiff = configs.some((c, i) =>
      c.url !== editedConfigs[i].url || c.enabled !== editedConfigs[i].enabled
    );
    setHasChanges(hasDiff);
  }, [configs, editedConfigs]);

  const handleConfigChange = useCallback((status: ComponentStatus, field: 'url' | 'enabled', value: string | boolean) => {
    setEditedConfigs(prev => prev.map(c =>
      c.status === status ? { ...c, [field]: value } : c
    ));
  }, []);

  const handleReset = useCallback(() => {
    setEditedConfigs(configs);
    showToast('已重置更改', 'info');
  }, [configs, showToast]);

  const handleSave = useCallback(async () => {
    if (!currentUser) return;

    const invalidConfig = editedConfigs.find(c => getUrlValidationMessage(c.url));
    if (invalidConfig) {
      showToast(`"${STATUS_LABELS[invalidConfig.status]}" 的URL格式无效`, 'error');
      return;
    }

    setIsSaving(true);

    try {
      const changesLog: JumpConfigLog[] = [];
      editedConfigs.forEach((newConfig, index) => {
        const oldConfig = configs[index];
        if (oldConfig.url !== newConfig.url || oldConfig.enabled !== newConfig.enabled) {
          changesLog.push({
            id: `${Date.now()}_${index}`,
            timestamp: new Date().toISOString(),
            userId: currentUser.id,
            username: currentUser.username,
            action: oldConfig.url === newConfig.url && oldConfig.enabled !== newConfig.enabled ? 'update' : oldConfig.url && !newConfig.url ? 'delete' : newConfig.url ? 'create' : 'update',
            status: newConfig.status,
            oldUrl: oldConfig.url || undefined,
            newUrl: newConfig.url || undefined,
          });
        }
      });

      safeSetObject(STORAGE_KEY, editedConfigs);
      setConfigs(editedConfigs);

      if (changesLog.length > 0) {
        const newLogs = [...changesLog, ...logs].slice(0, 100);
        safeSetObject(LOG_STORAGE_KEY, newLogs);
        setLogs(newLogs);

        changesLog.forEach(log => {
          addAuditLog(
            currentUser.id,
            currentUser.username,
            'UPDATE',
            'INFO',
            'JumpUrlConfig',
            log.id,
            STATUS_LABELS[log.status],
            `${log.action}: ${log.oldUrl || '(empty)'} → ${log.newUrl || '(empty)'}`
          );
        });
      }

      showToast('配置已保存', 'success');
    } catch (error) {
      showToast('保存失败', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [editedConfigs, configs, currentUser, logs, showToast]);

  const toggleShowUrl = useCallback((status: ComponentStatus) => {
    setShowUrls(prev => ({ ...prev, [status]: !prev[status] }));
  }, []);

  const renderUrlInput = (config: JumpUrlConfig) => {
    const validationMsg = getUrlValidationMessage(config.url);
    const isInvalid = validationMsg !== null;

    return (
      <div key={config.status} className={`p-4 rounded-xl border ${isInvalid ? 'border-red-500/50 bg-red-50/50 dark:bg-red-900/10' : t.border} transition-colors`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${t.text}`}>{STATUS_LABELS[config.status]}</span>
            <span className={`text-xs px-2 py-0.5 rounded ${config.enabled && config.url ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-gray-500/10 text-gray-500'}`}>
              {config.enabled && config.url ? '已启用' : '未配置'}
            </span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className={`text-xs ${t.textSecondary}`}>启用</span>
            <button
              type="button"
              onClick={() => canEdit && handleConfigChange(config.status, 'enabled', !config.enabled)}
              disabled={!canEdit}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                config.enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
              } ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  config.enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </label>
        </div>

        {canEdit ? (
          <div className="space-y-2">
            <div className="relative">
              <div className="flex items-center gap-2">
                <Link2 size={16} className={`absolute left-3 ${t.textMuted}`} />
                <input
                  type={showUrls[config.status] ? 'text' : 'password'}
                  value={config.url}
                  onChange={(e) => handleConfigChange(config.status, 'url', e.target.value)}
                  placeholder="https://example.com/submit?component={componentNumber}"
                  className={`w-full pl-10 pr-10 py-2.5 rounded-lg border text-sm ${
                    isInvalid
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                      : `${t.input} focus:border-cyan-500 focus:ring-cyan-500/20`
                  }`}
                />
                <button
                  type="button"
                  onClick={() => toggleShowUrl(config.status)}
                  className={`absolute right-3 p-1 ${t.textMuted} hover:${t.textSecondary}`}
                  title={showUrls[config.status] ? '隐藏URL' : '显示URL'}
                >
                  {showUrls[config.status] ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {isInvalid && (
              <div className="flex items-center gap-1 text-red-500 text-xs">
                <AlertCircle size={12} />
                <span>{validationMsg}</span>
              </div>
            )}
            <p className={`text-xs ${t.textMuted}`}>
              支持变量：{'{componentNumber}'}、{'{productionOrderNumber}'}、{'{componentName}'}
            </p>
          </div>
        ) : (
          <div className={`px-3 py-2.5 rounded-lg ${t.emptyBg} text-sm ${t.textMuted}`}>
            {config.url ? (
              <div className="flex items-center gap-2">
                <span className="font-mono truncate">{showUrls[config.status] ? config.url : '••••••••'}</span>
                <button
                  onClick={() => toggleShowUrl(config.status)}
                  className={`p-1 hover:${t.textSecondary}`}
                >
                  {showUrls[config.status] ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            ) : (
              <span>未配置</span>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderHistory = () => (
    <div className={`${t.card} rounded-lg border ${t.border} p-4`}>
      <div className="flex items-center justify-between mb-4">
        <h4 className={`text-sm font-medium ${t.text}`}>配置变更历史</h4>
        <button
          onClick={() => setShowHistory(false)}
          className={`p-1.5 rounded-lg hover:${t.hoverBg} ${t.textMuted}`}
        >
          <X size={16} />
        </button>
      </div>

      {logs.length === 0 ? (
        <p className={`text-sm ${t.textMuted} text-center py-8`}>暂无配置变更记录</p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {logs.map((log) => (
            <div
              key={log.id}
              className={`p-3 rounded-lg ${t.emptyBg} border ${t.border}`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                    log.action === 'create' ? 'bg-green-500/10 text-green-600' :
                    log.action === 'delete' ? 'bg-red-500/10 text-red-600' :
                    'bg-blue-500/10 text-blue-600'
                  }`}>
                    {log.action === 'create' ? '创建' : log.action === 'delete' ? '删除' : '更新'}
                  </span>
                  <span className={`text-xs ${t.textSecondary}`}>{STATUS_LABELS[log.status]}</span>
                </div>
                <span className={`text-xs ${t.textMuted}`}>
                  {new Date(log.timestamp).toLocaleString('zh-CN')}
                </span>
              </div>
              <div className={`text-xs ${t.textMuted}`}>
                <span>{log.username}</span>
                {log.oldUrl && log.newUrl && (
                  <span className="mx-1">修改URL：</span>
                )}
                {log.oldUrl && (
                  <span className="font-mono text-red-500 line-through">{log.oldUrl}</span>
                )}
                {log.oldUrl && log.newUrl && <span className="mx-1">→</span>}
                {log.newUrl && (
                  <span className="font-mono text-green-500">{log.newUrl}</span>
                )}
                {((log.action === 'delete' && !log.newUrl) || (log.action === 'create' && log.newUrl)) && (
                  <span className="font-mono">{log.newUrl || '(empty)'}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`text-lg font-semibold ${t.text}`}>智能跳转技能配置</h3>
          <p className={`text-sm ${t.textSecondary} mt-1`}>
            配置组件状态变更时的外部系统跳转URL
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!canEdit && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 ${t.textMuted}`}>
              <Shield size={14} className="text-amber-500" />
              <span className="text-xs">仅管理员可编辑</span>
            </div>
          )}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`px-3 py-1.5 text-xs border rounded-lg ${t.border} ${t.text} hover:${t.hoverBg} flex items-center gap-1.5`}
          >
            <History size={14} />
            变更历史
          </button>
        </div>
      </div>

      {showHistory && renderHistory()}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {editedConfigs.map(renderUrlInput)}
      </div>

      {canEdit && (
        <div className="flex items-center justify-end gap-3 pt-4 border-t ${t.border}">
          <button
            onClick={handleReset}
            disabled={!hasChanges || isSaving}
            className={`px-4 py-2 text-sm border rounded-lg ${t.border} hover:${t.hoverBg} flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <RotateCcw size={14} />
            重置
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className={`px-4 py-2 text-sm rounded-lg ${t.button} text-white flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSaving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save size={14} />
                保存配置
              </>
            )}
          </button>
        </div>
      )}

      {!canEdit && (
        <div className={`p-4 rounded-lg ${t.emptyBg} border ${t.border}`}>
          <div className="flex items-start gap-3">
            <Shield className={`flex-shrink-0 mt-0.5 ${t.textMuted}`} size={18} />
            <div>
              <p className={`text-sm font-medium ${t.text}`}>只读模式</p>
              <p className={`text-xs ${t.textMuted} mt-1`}>
                当前用户权限不足，无法修改跳转URL配置。如需修改，请联系系统管理员。
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}