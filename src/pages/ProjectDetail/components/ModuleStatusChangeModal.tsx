import { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { useThemeStyles } from '../../../hooks/useThemeStyles';

const STATUS_LIST = ['未投产', '投产中', '正常', '维修中', '三防中', '测试中', '仿真中', '借用中', '故障'] as const;
type StatusType = typeof STATUS_LIST[number];

interface ModuleStatusChangeModalProps {
  show: boolean;
  moduleName: string;
  currentStatus: string;
  onConfirm: (newStatus: StatusType, reason: string) => void;
  onCancel: () => void;
}

export function ModuleStatusChangeModal({
  show,
  moduleName,
  currentStatus,
  onConfirm,
  onCancel,
}: ModuleStatusChangeModalProps) {
  const t = useThemeStyles();
  const [selectedStatus, setSelectedStatus] = useState<StatusType>(currentStatus as StatusType);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (show) {
      setSelectedStatus(currentStatus as StatusType);
      setReason('');
      setError('');
    }
  }, [show, currentStatus]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      setError('变更理由为必填项，请输入变更原因');
      return;
    }

    if (reason.trim().length < 5) {
      setError('变更理由至少需要5个字符');
      return;
    }

    onConfirm(selectedStatus, reason.trim());
  };

  if (!show) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
        <div className={`${t.card} rounded-xl shadow-2xl w-full max-w-md border-2 ${t.border}`}>
          <div className={`px-6 py-4 border-b ${t.border}`}>
            <h3 className={`text-lg font-semibold ${t.text}`}>模块状态变更</h3>
            <p className={`text-sm ${t.textMuted} mt-1`}>{moduleName}</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className={`block text-sm font-medium ${t.textSecondary} mb-2`}>
                当前状态
              </label>
              <div className={`px-4 py-2 rounded-lg ${t.input} bg-gray-50 dark:bg-gray-800`}>
                <span className={`px-2 py-0.5 rounded text-xs ${
                  currentStatus === '正常' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' :
                  currentStatus === '故障' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' :
                  currentStatus === '维修中' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' :
                  'bg-gray-100 text-gray-700 dark:bg-gray-700/40 dark:text-gray-400'
                }`}>
                  {currentStatus}
                </span>
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium ${t.textSecondary} mb-2`}>
                新状态 <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as StatusType)}
                className={`w-full px-4 py-2 border rounded-lg ${t.input}`}
              >
                {STATUS_LIST.map(status => (
                  <option key={status} value={status} disabled={status === currentStatus}>
                    {status}{status === currentStatus ? ' (当前)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium ${t.textSecondary} mb-2`}>
                变更理由 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (error) setError('');
                }}
                placeholder="请输入变更原因（至少5个字符）..."
                className={`w-full px-4 py-2 border rounded-lg ${t.input} resize-none`}
                rows={3}
              />
              {error && (
                <div className={`flex items-center gap-1 mt-2 text-sm text-red-500`}>
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </div>
              )}
              <p className={`text-xs ${t.textMuted} mt-1`}>
                请详细描述变更原因，这将记录到系统日志中
              </p>
            </div>

            <div className={`flex justify-end gap-3 pt-4 border-t ${t.border}`}>
              <button
                type="button"
                onClick={onCancel}
                className={`px-4 py-2 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg} transition-colors`}
              >
                取消
              </button>
              <button
                type="submit"
                className={`px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                disabled={!reason.trim() || reason.trim().length < 5}
              >
                确认变更
              </button>
            </div>
          </form>
        </div>
      </div>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onCancel} />
    </>
  );
}

export default ModuleStatusChangeModal;
