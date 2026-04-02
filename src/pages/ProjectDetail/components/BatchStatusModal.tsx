import React from 'react';
import { Copy, CheckCircle } from 'lucide-react';
import { useThemeStyles } from '../../../hooks/useThemeStyles';
import type { Component, ComponentStatus } from '../../../types';

interface BatchStatusForm {
  status: string;
  reason: string;
}

interface BatchStatusModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: () => void;
  form: BatchStatusForm;
  onChange: (field: keyof BatchStatusForm, value: string) => void;
  selectedComponents: Component[];
  statusOptions?: string[];
}

export function BatchStatusModal({ show, onClose, onSubmit, form, onChange, selectedComponents, statusOptions = ['未投产', '投产中', '正常', '维修中', '三防中', '测试中', '仿真中', '借用中', '故障'] }: BatchStatusModalProps) {
  const t = useThemeStyles();
  const [copiedField, setCopiedField] = React.useState<string | null>(null);

  if (!show || selectedComponents.length === 0) return null;

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  const uniqueNumbers = [...new Set(selectedComponents.map(c => c.componentNumber))];
  const uniqueProductionOrders = [...new Set(selectedComponents.map(c => c.productionOrderNumber).filter(Boolean))];
  const uniqueStages = [...new Set(selectedComponents.map(c => c.stage).filter(Boolean))];
  const uniqueVersions = [...new Set(selectedComponents.map(c => c.version).filter(Boolean))];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className={`${t.modalBg} rounded-lg p-6 w-full max-w-lg border ${t.modalBorder} max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        <h2 className={`text-xl font-semibold mb-4 ${t.text}`}>批量状态变更</h2>

        <div className={`p-4 rounded-lg mb-4 ${t.emptyBg}`}>
          <div className={`text-sm font-medium ${t.text} mb-2`}>已选择 {selectedComponents.length} 个组件</div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className={`p-3 rounded border ${t.border}`}>
              <div className={`text-xs ${t.textMuted} mb-1`}>编号</div>
              <div className="flex items-center gap-1">
                <span className={`text-sm ${t.text} flex-1 truncate`}>
                  {uniqueNumbers.length > 5 ? `${uniqueNumbers.slice(0, 5).join(', ')}...等${uniqueNumbers.length}个` : uniqueNumbers.join(', ')}
                </span>
                <button
                  onClick={() => handleCopy(uniqueNumbers.join(', '), 'numbers')}
                  className={`p-1 rounded hover:${t.hoverBg} flex-shrink-0`}
                  title="复制"
                >
                  {copiedField === 'numbers' ? <CheckCircle size={14} className="text-green-500" /> : <Copy size={14} className={t.textMuted} />}
                </button>
              </div>
            </div>

            <div className={`p-3 rounded border ${t.border}`}>
              <div className={`text-xs ${t.textMuted} mb-1`}>指令号</div>
              <div className="flex items-center gap-1">
                <span className={`text-sm ${t.text} flex-1 truncate`}>
                  {uniqueProductionOrders.length > 5 ? `${uniqueProductionOrders.slice(0, 5).join(', ')}...等${uniqueProductionOrders.length}个` : uniqueProductionOrders.join(', ') || '-'}
                </span>
                {uniqueProductionOrders.length > 0 && (
                  <button
                    onClick={() => handleCopy(uniqueProductionOrders.join(', '), 'orders')}
                    className={`p-1 rounded hover:${t.hoverBg} flex-shrink-0`}
                    title="复制"
                  >
                    {copiedField === 'orders' ? <CheckCircle size={14} className="text-green-500" /> : <Copy size={14} className={t.textMuted} />}
                  </button>
                )}
              </div>
            </div>

            <div className={`p-3 rounded border ${t.border}`}>
              <div className={`text-xs ${t.textMuted} mb-1`}>阶段</div>
              <div className="flex items-center gap-1">
                <span className={`text-sm ${t.text} flex-1 truncate`}>
                  {uniqueStages.length > 5 ? `${uniqueStages.slice(0, 5).join(', ')}...等${uniqueStages.length}个` : uniqueStages.join(', ') || '-'}
                </span>
                {uniqueStages.length > 0 && (
                  <button
                    onClick={() => handleCopy(uniqueStages.join(', '), 'stages')}
                    className={`p-1 rounded hover:${t.hoverBg} flex-shrink-0`}
                    title="复制"
                  >
                    {copiedField === 'stages' ? <CheckCircle size={14} className="text-green-500" /> : <Copy size={14} className={t.textMuted} />}
                  </button>
                )}
              </div>
            </div>

            <div className={`p-3 rounded border ${t.border}`}>
              <div className={`text-xs ${t.textMuted} mb-1`}>版本</div>
              <div className="flex items-center gap-1">
                <span className={`text-sm ${t.text} flex-1 truncate`}>
                  {uniqueVersions.length > 5 ? `${uniqueVersions.slice(0, 5).join(', ')}...等${uniqueVersions.length}个` : uniqueVersions.join(', ') || '-'}
                </span>
                {uniqueVersions.length > 0 && (
                  <button
                    onClick={() => handleCopy(uniqueVersions.join(', '), 'versions')}
                    className={`p-1 rounded hover:${t.hoverBg} flex-shrink-0`}
                    title="复制"
                  >
                    {copiedField === 'versions' ? <CheckCircle size={14} className="text-green-500" /> : <Copy size={14} className={t.textMuted} />}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <label className={`block text-sm font-medium mb-2 ${t.textSecondary}`}>选择新状态</label>
          <div className="grid grid-cols-3 gap-2">
            {statusOptions.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => onChange('status', status)}
                className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                  form.status === status
                    ? `${t.button} text-white`
                    : `${t.border} ${t.textSecondary} hover:${t.hoverBg}`
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className={`block text-sm font-medium mb-2 ${t.textSecondary}`}>变更原因（必填）</label>
          <textarea
            value={form.reason}
            onChange={(e) => onChange('reason', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
            rows={3}
            placeholder="请输入状态变更原因..."
          />
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className={`flex-1 py-2 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}
          >
            取消
          </button>
          <button
            type="button"
            onClick={onSubmit}
            className={`flex-1 py-2 ${t.button} rounded-lg`}
          >
            确认更新 ({selectedComponents.length})
          </button>
        </div>
      </div>
    </div>
  );
}