import { useState, useMemo } from 'react';
import type {
  GenerationTypeKey,
  GenerationResult,
  SkipReasonDetail,
  GenerationError,
  AvailableTypeInfo,
  GenerationRecord,
  GenerationStatistics,
} from '../../types/generation';
import {
  getResultBadgeStyle,
  formatDuration,
  formatTimestamp,
  getCooldownDisplay,
  SKIP_REASON_MESSAGES,
  assessGenerationHealth,
} from '../../services/generation';

function GenerationStatusIndicator({
  result,
  isGenerating,
  skipReason,
  error,
  className = '',
}: {
  result: GenerationResult | null;
  isGenerating: boolean;
  skipReason?: SkipReasonDetail | null;
  error?: GenerationError | null;
  className?: string;
}) {
  const style = getResultBadgeStyle(result);

  if (isGenerating) {
    return (
      <div className={`flex items-center gap-2 px-4 py-3 rounded-lg bg-blue-50 border border-blue-200 ${className}`}>
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium text-blue-700">正在执行生成...</span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-all ${className}`}
      style={{ backgroundColor: style.bg, color: style.text, borderColor: `${style.text}30` }}
    >
      <span className="text-lg font-bold">{style.icon}</span>
      <span className="text-sm font-medium">{style.label}</span>

      {skipReason && (
        <div className="ml-auto text-xs opacity-80 max-w-xs truncate">
          {SKIP_REASON_MESSAGES[skipReason.reason]?.title || skipReason.message}
        </div>
      )}

      {error && (
        <div className="ml-auto text-xs opacity-80 max-w-xs truncate" title={error.message}>
          {error.code}: {error.message}
        </div>
      )}
    </div>
  );
}

function RegenerationConfirmDialog({
  show,
  typeInfo,
  onConfirm,
  onCancel,
  isExecuting,
  className = '',
}: {
  show: boolean;
  typeInfo: AvailableTypeInfo | null;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  isExecuting: boolean;
  className?: string;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!show) return null;

  const handleConfirm = () => {
    if (reason.trim().length < 5) {
      setError('请输入至少5个字符的原因说明');
      return;
    }
    onConfirm(reason);
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm ${className}`}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
          <h3 className="text-lg font-bold text-white">强制重新生成确认</h3>
          <p className="text-sm text-amber-100 mt-1">此操作将覆盖已有的模块/组件数据</p>
        </div>

        <div className="p-6 space-y-4">
          {typeInfo && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <div className="font-medium text-gray-900">{typeInfo.label}</div>
              <div className="text-gray-500 mt-1">{typeInfo.typeKey}</div>
              {typeInfo.isRegistered && (
                <div className="mt-2 text-amber-600 text-xs">
                  ⚠ 该类型已存在，已有 {typeInfo.generationCount || 0} 次生成记录
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              原因说明 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (e.target.value.trim().length >= 5) setError(null);
              }}
              placeholder="请详细说明需要强制重新生成的理由（至少5个字符）..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
              rows={3}
              disabled={isExecuting}
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
            <strong>风险提示：</strong>强制重新生成将替换现有数据，此操作不可撤销。请确保已备份重要信息。
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isExecuting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={isExecuting || reason.trim().length < 5}
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isExecuting ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                执行中...
              </span>
            ) : (
              '确认强制重新生成'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function UniqueTypeBadge({
  typeInfo,
  size = 'md',
  onClick,
  className = '',
}: {
  typeInfo: AvailableTypeInfo;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
}) {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  let statusStyle: { bg: string; text: string; label: string };
  if (typeInfo.isLocked) {
    statusStyle = { bg: '#fee2e2', text: '#991b1b', label: '🔒 已锁定' };
  } else if (typeInfo.isInCooldown) {
    statusStyle = { bg: '#fef3c7', text: '#92400e', label: `⏳ 冷却中 ${getCooldownDisplay(typeInfo.cooldownRemainingMs || 0)}` };
  } else if (typeInfo.isRegistered) {
    statusStyle = { bg: '#dcfce7', text: '#166534', label: '✓ 已生成' };
  } else {
    statusStyle = { bg: '#f3f4f6', text: '#6b7280', label: '○ 待生成' };
  }

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium transition-all cursor-pointer ${
        onClick ? 'hover:shadow-md active:scale-95' : 'default-pointer'
      } ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: statusStyle.bg, color: statusStyle.text, borderColor: `${statusStyle.text}40` }}
    >
      <span>{statusStyle.label}</span>
      {typeInfo.generationCount != null && typeInfo.generationCount > 0 && (
        <span className="opacity-60">({typeInfo.generationCount})</span>
      )}
    </button>
  );
}

function GenerationHistoryViewer({
  records,
  isLoading = false,
  onExport,
  onClear,
  onViewDetail,
  className = '',
}: {
  records: GenerationRecord[];
  isLoading?: boolean;
  onExport?: () => void;
  onClear?: () => void;
  onViewDetail?: (record: GenerationRecord) => void;
  className?: string;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-gray-500">加载中...</span>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className={`text-center py-12 text-gray-400 ${className}`}>
        <div className="text-4xl mb-3">📋</div>
        <p>暂无生成记录</p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-800">生成历史记录 ({records.length})</h3>
        <div className="flex gap-2">
          {onExport && (
            <button
              onClick={onExport}
              className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
            >
              导出JSON
            </button>
          )}
          {onClear && (
            <button
              onClick={onClear}
              className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
            >
              清除记录
            </button>
          )}
        </div>
      </div>

      {records.map(record => {
        const badgeStyle = getResultBadgeStyle(record.result);
        const isExpanded = expandedId === record.id;

        return (
          <div
            key={record.id}
            className="border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-colors"
          >
            <div
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50"
              onClick={() => setExpandedId(isExpanded ? null : record.id)}
            >
              <span
                className="px-2 py-0.5 rounded text-xs font-semibold"
                style={{ backgroundColor: badgeStyle.bg, color: badgeStyle.text }}
              >
                {badgeStyle.icon} {badgeStyle.label}
              </span>

              <span className="text-sm font-medium text-gray-800 flex-1 truncate">{record.typeKey}</span>

              <span className="text-xs text-gray-400">{formatTimestamp(record.triggeredAt)}</span>

              {record.durationMs != null && (
                <span className="text-xs text-gray-500 tabular-nums">{formatDuration(record.durationMs)}</span>
              )}

              {record.isForced && (
                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs rounded font-medium">强制</span>
              )}
            </div>

            {isExpanded && (
              <div className="px-4 pb-4 pt-0 bg-gray-50 text-xs space-y-2 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-2 pt-3">
                  <div><span className="text-gray-500">记录ID:</span> <code className="text-gray-700">{record.id.substring(0, 16)}...</code></div>
                  <div><span className="text-gray-500">条目ID:</span> <code className="text-gray-700">{record.entryId || '-'}</code></div>
                  <div><span className="text-gray-500">项目:</span> <span>{record.projectId}</span></div>
                  <div><span className="text-gray-500">目标:</span> <span>{record.targetType}</span></div>
                  <div><span className="text-gray-500">操作人:</span> <span>{record.operatorName || '-'}</span></div>
                  <div><span className="text-gray-500">签名:</span> <code className="text-gray-600">{record.signature.value.substring(0, 12)}...</code></div>
                </div>

                {record.skipReason && (
                  <div className="bg-blue-50 p-2 rounded">
                    <span className="text-blue-600 font-medium">跳过原因:</span>{' '}
                    <span className="text-blue-800">{record.skipReason.message}</span>
                  </div>
                )}

                {record.error && (
                  <div className="bg-red-50 p-2 rounded">
                    <span className="text-red-600 font-medium">错误:</span>{' '}
                    <span className="text-red-800">[{record.error.code}] {record.error.message}</span>
                  </div>
                )}

                {record.forceReason && (
                  <div className="bg-amber-50 p-2 rounded">
                    <span className="text-amber-600 font-medium">强制原因:</span>{' '}
                    <span className="text-amber-800">{record.forceReason}</span>
                  </div>
                )}

                {onViewDetail && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onViewDetail(record); }}
                    className="mt-2 w-full py-1.5 text-center text-blue-600 hover:bg-blue-100 rounded transition-colors"
                  >
                    查看完整详情 →
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function GenerationStatsDashboard({
  statistics,
  isLoading = false,
  className = '',
}: {
  statistics: GenerationStatistics | null;
  isLoading?: boolean;
  className?: string;
}) {
  const health = statistics ? assessGenerationHealth(statistics) : null;

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-gray-500">加载统计数据...</span>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className={`text-center py-12 text-gray-400 ${className}`}>
        <div className="text-4xl mb-3">📊</div>
        <p>暂无统计数据</p>
      </div>
    );
  }

  const healthColors = {
    healthy: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
    warning: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
    critical: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
  };

  const healthStyle = health ? healthColors[health.status] : healthColors.healthy;

  const statCards = [
    { label: '总尝试次数', value: statistics.totalAttempts, color: '#3b82f6' },
    { label: '成功', value: statistics.successCount, color: '#22c55e' },
    { label: '跳过（重复检测生效）', value: statistics.skippedCount, color: '#3b82f6' },
    { label: '强制重新生成', value: statistics.forceCount, color: '#f59e0b' },
    { label: '失败', value: statistics.errorCount, color: '#ef4444' },
    { label: '唯一类型数', value: statistics.uniqueTypes, color: '#8b5cf6' },
    { label: '成功率', value: `${(statistics.successRate * 100).toFixed(1)}%`, color: '#22c55e' },
    { label: '平均耗时', value: formatDuration(statistics.avgDurationMs), color: '#06b6d4' },
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className="font-semibold text-gray-800">生成统计仪表盘</h3>

      {health && (
        <div
          className="rounded-lg p-4 border"
          style={{ backgroundColor: healthStyle.bg, borderColor: healthStyle.border, color: healthStyle.text }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg font-bold">
              {health.status === 'healthy' ? '✅' : health.status === 'warning' ? '⚠️' : '🔴'}
            </span>
            <span className="font-semibold">{health.message}</span>
          </div>
          {health.suggestions.length > 0 && (
            <ul className="text-sm space-y-1 mt-2 opacity-90">
              {health.suggestions.map((s, i) => (
                <li key={i}>• {s}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map(card => (
          <div
            key={card.label}
            className="rounded-lg p-3 border border-gray-200 hover:shadow-sm transition-shadow"
          >
            <div className="text-xs text-gray-500 mb-1">{card.label}</div>
            <div className="text-xl font-bold" style={{ color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      {Object.keys(statistics.byType).length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 border-b">按类型统计</div>
          <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
            {Object.entries(statistics.byType).map(([typeKey, stats]) => (
              <div key={typeKey} className="px-4 py-2.5 flex items-center justify-between text-sm hover:bg-gray-50">
                <code className="text-gray-700 font-mono text-xs">{typeKey}</code>
                <div className="flex gap-3 text-xs">
                  <span className="text-gray-500">尝试:{stats.attempts}</span>
                  <span className="text-green-600">成功:{stats.successes}</span>
                  <span className="text-blue-500">跳过:{stats.skips}</span>
                  <span className="text-amber-500">强制:{stats.forces}</span>
                  <span className="text-red-500">错误:{stats.errors}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function GenerationControlPanel({
  projectId: _projectId,
  moduleId: _moduleId,
  availableTypes,
  selectedType,
  onSelectType,
  onGenerate,
  onForceRegeneration,
  isGenerating,
  generationResult,
  allowForceRegeneration = true,
  className = '',
}: {
  projectId: string;
  moduleId?: string;
  availableTypes: AvailableTypeInfo[];
  selectedType: GenerationTypeKey | null;
  onSelectType: (type: GenerationTypeKey) => void;
  onGenerate: () => void;
  onForceRegeneration: (reason: string) => void;
  isGenerating: boolean;
  generationResult: GenerationResult | null;
  allowForceRegeneration?: boolean;
  className?: string;
}) {
  const [showForceDialog, setShowForceDialog] = useState(false);

  const selectedTypeInfo = useMemo(
    () => availableTypes.find(t => t.typeKey === selectedType) || null,
    [availableTypes, selectedType]
  );

  const canGenerate = selectedType !== null && !isGenerating;
  const canForceRegenerate = allowForceRegeneration && selectedType !== null && !isGenerating && selectedTypeInfo?.isRegistered;

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-4">
        <h2 className="text-lg font-bold text-white">管理界面自动生成控制台</h2>
        <p className="text-sm text-indigo-100 mt-0.5">唯一性保障 · 重复检测 · 强制更新</p>
      </div>

      <div className="p-6 space-y-5">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">选择要生成的类型</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {availableTypes.map(type => (
              <button
                key={type.typeKey}
                onClick={() => onSelectType(type.typeKey)}
                disabled={isGenerating}
                className={`flex items-center justify-between px-4 py-3 rounded-lg border-2 text-left transition-all ${
                  selectedType === type.typeKey
                    ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                } ${isGenerating ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 text-sm">{type.label}</div>
                  <div className="text-xs text-gray-500 font-mono mt-0.5 truncate">{type.typeKey}</div>
                  {type.description && (
                    <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{type.description}</div>
                  )}
                </div>
                <UniqueTypeBadge typeInfo={type} size="sm" />
              </button>
            ))}
          </div>
        </div>

        <GenerationStatusIndicator
          result={generationResult}
          isGenerating={isGenerating}
        />

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={onGenerate}
            disabled={!canGenerate}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg hover:from-indigo-600 hover:to-purple-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
          >
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                生成中...
              </span>
            ) : (
              '✨ 执行生成'
            )}
          </button>

          {canForceRegenerate && (
            <button
              onClick={() => setShowForceDialog(true)}
              className="px-6 py-2.5 text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-all"
            >
              ↻ 强制重新生成
            </button>
          )}
        </div>

        {selectedTypeInfo && generationResult === 'SKIPPED' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
            <div className="font-medium text-blue-800 mb-1">
              ⏭️ 生成已被跳过 - 唯一性检测生效
            </div>
            <div className="text-blue-600 text-xs space-y-1">
              <p>该类型的模块/组件已经存在，系统自动跳过重复生成以保持唯一性。</p>
              <p>如需更新，请使用「强制重新生成」功能。</p>
            </div>
          </div>
        )}
      </div>

      <RegenerationConfirmDialog
        show={showForceDialog}
        typeInfo={selectedTypeInfo}
        onConfirm={(reason) => {
          onForceRegeneration(reason);
          setShowForceDialog(false);
        }}
        onCancel={() => {
          setShowForceDialog(false);
        }}
        isExecuting={false}
      />
    </div>
  );
}

export {
  GenerationControlPanel,
  GenerationStatusIndicator,
  RegenerationConfirmDialog,
  UniqueTypeBadge,
  GenerationHistoryViewer,
  GenerationStatsDashboard,
};
