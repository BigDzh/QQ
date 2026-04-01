import React, { useState } from 'react';
import { Trash2, RotateCcw, X, AlertTriangle, Clock, History, Search, Settings, Bell, BellOff } from 'lucide-react';
import type { TrashTask, DeletionHistory } from '../types/duplicateTask';

interface TrashManagementPanelProps {
  isOpen: boolean;
  onClose: () => void;
  trashItems: TrashTask[];
  historyItems: DeletionHistory[];
  onRestore: (taskId: string) => boolean;
  onPermanentDelete: (taskId: string) => void;
  onEmptyTrash: () => number;
  onCleanupExpired: () => number;
  autoCleanupEnabled?: boolean;
  autoCleanupRetentionHours?: number;
  autoCleanupIntervalHours?: number;
  onToggleAutoCleanup?: () => void;
  onUpdateRetentionHours?: (hours: number) => void;
  onUpdateIntervalHours?: (hours: number) => void;
}

type TabType = 'trash' | 'history';

export const TrashManagementPanel: React.FC<TrashManagementPanelProps> = ({
  isOpen,
  onClose,
  trashItems,
  historyItems,
  onRestore,
  onPermanentDelete,
  onEmptyTrash,
  onCleanupExpired,
  autoCleanupEnabled = false,
  autoCleanupRetentionHours = 168,
  autoCleanupIntervalHours = 24,
  onToggleAutoCleanup,
  onUpdateRetentionHours,
  onUpdateIntervalHours,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('trash');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  if (!isOpen) return null;

  const filteredTrash = trashItems.filter(item =>
    item.originalTask.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredHistory = historyItems.filter(item =>
    item.taskTitle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isRecoverable = (item: TrashTask) => {
    return new Date(item.recoveryDeadline) > new Date();
  };

  const getRemainingHours = (deadline: string) => {
    const remaining = new Date(deadline).getTime() - new Date().getTime();
    const hours = Math.max(0, Math.floor(remaining / (1000 * 60 * 60)));
    return hours;
  };

  const formatHours = (hours: number) => {
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `${days}天${hours % 24 > 0 ? `${hours % 24}小时` : ''}`;
    }
    return `${hours}小时`;
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 w-full max-w-3xl shadow-xl max-h-[80vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/10 text-red-500">
              <Trash2 size={20} />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">回收站与删除历史</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-xl">
            <button
              onClick={() => setActiveTab('trash')}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'trash'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              回收站 ({trashItems.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'history'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              删除历史 ({historyItems.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg transition-colors ${
                showSettings
                  ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-500'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title="自动清理设置"
            >
              <Settings size={16} />
            </button>

            {activeTab === 'trash' && trashItems.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (confirm(`确定要清空回收站吗？这将永久删除 ${trashItems.length} 个任务。`)) {
                      onEmptyTrash();
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  清空回收站
                </button>
                <button
                  onClick={() => {
                    const cleaned = onCleanupExpired();
                    if (cleaned > 0) {
                      alert(`已清理 ${cleaned} 个过期任务`);
                    } else {
                      alert('没有过期的任务');
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  清理过期
                </button>
              </div>
            )}
          </div>
        </div>

        {showSettings && (
          <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <Settings size={14} />
              自动清理设置
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">启用自动清理</span>
                <button
                  onClick={onToggleAutoCleanup}
                  className={`w-10 h-5 rounded-full transition-colors ${
                    autoCleanupEnabled ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                    autoCleanupEnabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">保留期限</span>
                <select
                  value={autoCleanupRetentionHours}
                  onChange={e => onUpdateRetentionHours?.(parseInt(e.target.value))}
                  className="px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  <option value="24">24小时 (1天)</option>
                  <option value="48">48小时 (2天)</option>
                  <option value="72">72小时 (3天)</option>
                  <option value="168">168小时 (7天)</option>
                  <option value="336">336小时 (14天)</option>
                  <option value="720">720小时 (30天)</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">清理间隔</span>
                <select
                  value={autoCleanupIntervalHours}
                  onChange={e => onUpdateIntervalHours?.(parseInt(e.target.value))}
                  className="px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  <option value="1">1小时</option>
                  <option value="6">6小时</option>
                  <option value="12">12小时</option>
                  <option value="24">24小时 (1天)</option>
                  <option value="48">48小时 (2天)</option>
                </select>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>当前保留期限:</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {formatHours(autoCleanupRetentionHours)}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="搜索任务名称..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'trash' ? (
            filteredTrash.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Trash2 size={40} className="mx-auto mb-3 opacity-30" />
                <p>{searchTerm ? '没有找到匹配的任务' : '回收站为空'}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTrash.map(item => {
                  const recoverable = isRecoverable(item);
                  const remainingHours = getRemainingHours(item.recoveryDeadline);

                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                            {item.originalTask.title}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                            <span className={`px-2 py-0.5 rounded ${
                              item.originalTask.priority === '紧急' ? 'bg-red-100 text-red-600' :
                              item.originalTask.priority === '高' ? 'bg-orange-100 text-orange-600' :
                              item.originalTask.priority === '中' ? 'bg-blue-100 text-blue-600' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {item.originalTask.priority}
                            </span>
                            {item.ruleName && (
                              <span className="text-gray-400">
                                规则: {item.ruleName}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock size={10} />
                              删除于 {new Date(item.deletedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          {recoverable ? (
                            <>
                              <div className="text-right mr-2">
                                <span className="text-xs text-orange-500 font-medium">
                                  剩余 {remainingHours}h
                                </span>
                              </div>
                              <button
                                onClick={() => {
                                  if (confirm(`确定要恢复任务"${item.originalTask.title}"吗？`)) {
                                    const success = onRestore(item.id);
                                    if (!success) {
                                      alert('恢复失败，任务可能已过期');
                                    }
                                  }
                                }}
                                className="flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-lg transition-colors"
                              >
                                <RotateCcw size={12} />
                                恢复
                              </button>
                            </>
                          ) : (
                            <span className="px-2 py-1 text-xs text-gray-400 bg-gray-200 dark:bg-gray-600 rounded">
                              已过期
                            </span>
                          )}
                          <button
                            onClick={() => {
                              if (confirm(`确定要永久删除任务"${item.originalTask.title}"吗？此操作不可恢复！`)) {
                                onPermanentDelete(item.id);
                              }
                            }}
                            className="p-1.5 text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                            title="永久删除"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {!recoverable && (
                        <div className="flex items-center gap-2 mt-2 p-2 bg-red-50 dark:bg-red-500/10 rounded-lg">
                          <AlertTriangle size={14} className="text-red-500" />
                          <span className="text-xs text-red-600 dark:text-red-400">
                            恢复期限已过，无法恢复
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            filteredHistory.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <History size={40} className="mx-auto mb-3 opacity-30" />
                <p>{searchTerm ? '没有找到匹配的历史记录' : '暂无删除历史'}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredHistory.map(item => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                          {item.taskTitle}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                          <span className={`px-2 py-0.5 rounded ${
                            item.status === 'restored' ? 'bg-green-100 text-green-600' :
                            item.status === 'completed' ? 'bg-blue-100 text-blue-600' :
                            'bg-red-100 text-red-600'
                          }`}>
                            {item.status === 'restored' ? '已恢复' :
                             item.status === 'completed' ? '已删除' : '已失败'}
                          </span>
                          {item.ruleName && (
                            <span>规则: {item.ruleName}</span>
                          )}
                          <span>{new Date(item.deletedAt).toLocaleString()}</span>
                          <span>操作者: {item.deletedBy}</span>
                        </div>
                      </div>
                      {item.recoveryAvailable && (
                        <span className="text-xs text-green-500">可恢复</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
