import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { X, AlertCircle, Copy, Check, ExternalLink } from 'lucide-react';
import type { ComponentStatus, Component } from '../../../types';
import { useThemeStyles } from '../../../hooks/useThemeStyles';
import { useToast } from '../../../components/Toast';
import { safeGetObject } from '../../../services/storageManager';

const STATUS_OPTIONS: ComponentStatus[] = [
  '正常', '故障', '维修中', '三防中', '测试中', '仿真中', '投产中', '借用中', '未投产'
];

const STATUS_LABELS: Record<ComponentStatus, string> = {
  '投产中': '提交投产',
  '维修中': '提交维修',
  '三防中': '提交三防',
  '测试中': '提交测试',
  '仿真中': '提交仿真',
  '未投产': '提交未投产',
  '正常': '提交正常',
  '借用中': '提交借用',
  '故障': '提交故障',
};

const EXTERNAL_SUBMIT_STATUSES: ComponentStatus[] = ['投产中', '维修中', '三防中', '测试中', '仿真中'];

const JUMP_CONFIG_STORAGE_KEY = 'jump_url_config';

interface JumpUrlConfig {
  status: ComponentStatus;
  url: string;
  enabled: boolean;
}

interface EnhancedComponentStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  component: Component | null;
  currentStatus: ComponentStatus;
  onStatusChange: (
    componentId: string,
    moduleId: string,
    newStatus: ComponentStatus,
    reason: string
  ) => Promise<{ success: boolean; error?: string; errorType?: 'network' | 'permission' | 'validation' | 'unknown' }>;
  canEdit: boolean;
}

export function EnhancedComponentStatusModal({
  isOpen,
  onClose,
  component,
  currentStatus,
  onStatusChange,
  canEdit,
}: EnhancedComponentStatusModalProps) {
  const t = useThemeStyles();
  const { showToast } = useToast();
  const [selectedStatus, setSelectedStatus] = useState<ComponentStatus | null>(null);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setSelectedStatus(null);
        setReason('');
        setCopiedField(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const jumpConfigs = useMemo(() => {
    return safeGetObject<JumpUrlConfig[]>(JUMP_CONFIG_STORAGE_KEY) || [];
  }, []);

  const getJumpConfig = useCallback((status: ComponentStatus): JumpUrlConfig | undefined => {
    return jumpConfigs.find(c => c.status === status);
  }, [jumpConfigs]);

  const handleCopy = useCallback(async (field: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      showToast('已复制到剪贴板', 'success');
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      showToast('复制失败', 'error');
    }
  }, [showToast]);

  const handleExternalSubmit = useCallback((status: ComponentStatus) => {
    if (!component) return;

    const config = getJumpConfig(status);
    if (!config || !config.enabled || !config.url) {
      showToast('该状态未配置跳转URL，请在工具-跳转技能中配置', 'warning');
      return;
    }

    let url = config.url;
    url = url.replace('{componentNumber}', encodeURIComponent(component.componentNumber || ''));
    url = url.replace('{productionOrderNumber}', encodeURIComponent(component.productionOrderNumber || ''));
    url = url.replace('{componentName}', encodeURIComponent(component.componentName || ''));

    window.open(url, '_blank', 'noopener,noreferrer');
  }, [component, getJumpConfig, showToast]);

  if (!isVisible || !component) {
    return null;
  }

  const handleSubmit = async () => {
    if (!selectedStatus) {
      showToast('请选择要变更的状态', 'warning');
      return;
    }

    if (!reason.trim()) {
      showToast('请输入状态变更原因（必填）', 'warning');
      return;
    }

    const isSameStatus = selectedStatus === currentStatus;
    if (isSameStatus && !confirm('新状态与当前状态相同，确定要继续提交吗？')) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await onStatusChange(component.id, component.moduleId, selectedStatus, reason);

      if (result.success) {
        showToast(isSameStatus
          ? `已重新提交状态变更：${selectedStatus}`
          : `组件状态已从 ${currentStatus}变更为 ${selectedStatus}`, 'success');
        onClose();
      } else {
        showToast(result.error || '状态变更失败', 'error');
      }
    } catch (error) {
      showToast('状态变更失败', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  const renderCopyableField = (field: string, label: string, value: string) => (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0 flex-1">
        <p className={`text-xs ${t.textMuted}`}>{label}</p>
        <p className={`text-sm font-medium mt-0.5 truncate ${t.text}`}>{value || '-'}</p>
      </div>
      <button
        onClick={() => handleCopy(field, value)}
        className={`p-1.5 rounded-lg transition-all duration-200 flex-shrink-0 ${
          copiedField === field
            ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
        }`}
        title={copiedField === field ? '已复制' : '复制'}
      >
        {copiedField === field ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>
  );

  const showExternalButton = EXTERNAL_SUBMIT_STATUSES.includes(selectedStatus || '') && getJumpConfig(selectedStatus!)?.enabled && getJumpConfig(selectedStatus!)?.url;
  const showExternalWarning = EXTERNAL_SUBMIT_STATUSES.includes(selectedStatus || '') && selectedStatus && (!getJumpConfig(selectedStatus!)?.url || !getJumpConfig(selectedStatus!)?.enabled);
  const showWarning = selectedStatus && reason.trim();
  const isSameStatusSelected = selectedStatus === currentStatus;

  return (
    <div
      className={`fixed inset-0 z-[70] flex items-center justify-center p-4 transition-opacity duration-300 ease-in-out ${
        isAnimating ? 'bg-black/50 opacity-100' : 'bg-black/0 opacity-0'
      }`}
      onClick={handleClose}
    >
      <div
        ref={modalRef}
        className={`${t.modalBg} rounded-xl w-full max-w-md border ${t.modalBorder} shadow-xl overflow-hidden transition-all duration-300 ease-in-out ${
          isAnimating
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 translate-y-4'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className={`text-lg font-semibold ${t.text}`}>更改组件状态</h2>
          <button
            onClick={handleClose}
            className={`p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${t.textSecondary} transition-colors duration-200`}
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5">
          <div className={`p-4 rounded-xl mb-4 ${t.emptyBg} transition-all duration-300 ease-in-out`}>
            <div className="grid grid-cols-1 gap-3">
              {renderCopyableField('componentName', '组件名称', component.componentName)}
              {renderCopyableField('componentNumber', '组件编号', component.componentNumber)}
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className={`text-xs ${t.textMuted}`}>当前状态</p>
                  <p className={`text-sm font-medium mt-0.5 ${t.text}`}>{currentStatus}</p>
                </div>
              </div>
              {renderCopyableField('productionOrderNumber', '生产指令号', component.productionOrderNumber || '')}
            </div>
          </div>

          <div className="mb-4">
            <label className={`block text-sm font-medium mb-2 ${t.textSecondary}`}>
              选择新状态
            </label>
            <div className="grid grid-cols-3 gap-2">
              {STATUS_OPTIONS.filter(s => s !== '未投产').map((status) => {
                const isSelected = selectedStatus === status;
                const isCurrent = status === currentStatus;
                return (
                  <button
                    key={status}
                    onClick={() => setSelectedStatus(status)}
                    className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ease-out ${
                      isSelected
                        ? `${t.statusColors[status as keyof typeof t.statusColors]} border-current ring-2 ring-current ring-opacity-30 transform scale-105`
                        : isCurrent
                          ? `${t.border} ${t.textSecondary} cursor-pointer hover:scale-[1.02]`
                          : `${t.border} hover:${t.hoverBg} ${t.textSecondary} cursor-pointer hover:scale-[1.02]`
                    }`}
                  >
                    {status}
                    {isCurrent && ' (当前)'}
                  </button>
                );
              })}
            </div>
            {selectedStatus && selectedStatus !== '未投产' && (
              <div className={`mt-2 text-xs ${t.textMuted} text-center transition-all duration-200 ease-in-out`}>
                提示：状态"未投产"需要通过编辑投产功能更改
              </div>
            )}
          </div>

          <div
            className={`transition-all duration-300 ease-in-out overflow-hidden ${
              showExternalButton ? 'max-h-20 opacity-100 mb-4' : 'max-h-0 opacity-0 mb-0'
            }`}
          >
            {showExternalButton && (
              <button
                type="button"
                onClick={() => handleExternalSubmit(selectedStatus!)}
                className="w-full py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:opacity-90 shadow-lg shadow-purple-500/30 transition-all duration-200 hover:scale-[1.02]"
              >
                <ExternalLink size={16} />
                <span>{STATUS_LABELS[selectedStatus!]}</span>
              </button>
            )}
          </div>

          <div
            className={`transition-all duration-300 ease-in-out overflow-hidden ${
              showExternalWarning ? 'max-h-20 opacity-100 mb-4' : 'max-h-0 opacity-0 mb-0'
            }`}
          >
            {showExternalWarning && (
              <div className="py-2 px-3 bg-amber-500/20 border border-amber-500/40 rounded-lg text-amber-200 text-xs text-center">
                该状态未配置跳转URL，请在"工具-跳转技能"中配置
              </div>
            )}
          </div>

          <div className="mb-4">
            <label className={`block text-sm font-medium mb-2 ${t.textSecondary}`}>
              变更原因 <span className="text-red-500">*必填</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="请详细描述状态变更的原因..."
              className={`w-full px-3 py-2 border rounded-lg ${t.input} focus:ring-2 focus:ring-cyan-500/30 min-h-[80px] resize-none transition-all duration-200`}
            />
            <div className={`text-xs ${t.textMuted} mt-1 transition-all duration-200`}>
              提示：常见原因包括设备故障维修、定期维护检测、安全检查、三防处理、软件升级等
            </div>
          </div>

          <div
            className={`transition-all duration-300 ease-in-out overflow-hidden ${
              showWarning ? 'max-h-24 opacity-100 mb-4' : 'max-h-0 opacity-0 mb-0'
            }`}
          >
            {showWarning && (
              <div className={`p-3 rounded-lg ${isSameStatusSelected ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-500/30' : t.emptyBg} transition-all duration-200`}>
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className={isSameStatusSelected ? 'text-amber-500' : t.textMuted} />
                  <div className={`text-sm ${t.textSecondary}`}>
                    {isSameStatusSelected ? (
                      <span>当前状态：<span className="font-medium text-amber-500">{currentStatus}</span>（重复提交将重新触发变更流程）</span>
                    ) : (
                      <>状态将从 <span className="font-medium text-red-500">{currentStatus}</span> 变更为 <span className="font-medium text-green-500">{selectedStatus}</span></>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className={`flex-1 py-2.5 border rounded-xl ${t.border} ${t.textSecondary} hover:${t.hoverBg} disabled:opacity-50 transition-all duration-200`}
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedStatus || !reason.trim() || isSubmitting}
              className={`flex-1 py-2.5 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                selectedStatus && reason.trim()
                  ? 'bg-cyan-600 hover:bg-cyan-700 text-white hover:scale-[1.02] shadow-lg shadow-cyan-500/30'
                  : `${t.button} opacity-50`
              }`}
            >
              {isSubmitting ? '提交中...' : '确认变更'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EnhancedComponentStatusModal;