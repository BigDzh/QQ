import type {
  GenerationTypeKey,
  GenerationResult,
  SkipReason,
  ValidationResult,
  GenerationEventType,
  RegistryEntry,
  GenerationRecord,
  GenerationStatistics,
} from '../../types/generation';

export const GENERATION_EVENT_DESCRIPTIONS: Record<GenerationEventType, string> = {
  GENERATION_REQUESTED: '用户发起生成请求',
  VALIDATION_COMPLETED: '唯一性校验完成',
  DUPLICATE_DETECTED: '检测到重复类型/签名',
  GENERATION_STARTED: '开始执行生成逻辑',
  GENERATION_PROGRESS: '生成进度更新',
  GENERATION_COMPLETED: '生成执行成功',
  GENERATION_SKIPPED: '因重复检测跳过生成',
  FORCE_REGEN_REQUESTED: '用户请求强制重新生成',
  FORCE_REGEN_EXECUTED: '强制重新生成已执行',
  GENERATION_FAILED: '生成过程发生错误',
  REGISTRY_UPDATED: '唯一性注册表更新',
  COOLDOWN_SET: '冷却期计时器设置',
  ENTRY_LOCKED: '注册条目被锁定',
  ENTRY_UNLOCKED: '注册条目被解锁',
  SIGNATURE_COMPUTED: '内容签名计算完成',
  GENERATOR_REGISTERED: '新生成器注册成功',
  GENERATOR_UNREGISTERED: '生成器已注销',
};

export const SKIP_REASON_MESSAGES: Record<SkipReason, { title: string; description: string; action: string }> = {
  DUPLICATE_SIGNATURE: {
    title: '配置完全相同',
    description: '该类型的模块/组件已存在，且当前配置与已有配置完全一致（MD5签名相同）',
    action: '如需更新，请使用"强制重新生成"功能并说明原因',
  },
  DUPLICATE_TYPEKEY: {
    title: '配置已变更',
    description: '该类型已存在但配置参数发生变化（签名不同），可能需要重新生成以应用新配置',
    action: '建议使用"强制重新生成"功能来更新模块/组件',
  },
  COOLDOWN_ACTIVE: {
    title: '冷却期保护中',
    description: '为防止频繁操作，同一类型在冷却期内不允许重复生成',
    action: `等待冷却期结束，或使用"强制重新生成"跳过冷却限制`,
  },
  LOCKED_ENTRY: {
    title: '条目已锁定',
    description: '该注册条目已被管理员锁定，任何操作均被禁止',
    action: '请联系管理员解锁后重试',
  },
};

export function getValidationSeverityColor(severity: ValidationResult['severity']): string {
  switch (severity) {
    case 'none': return '#22c55e';
    case 'info': return '#3b82f6';
    case 'warning': return '#f59e0b';
    case 'error': return '#ef4444';
  }
}

export function getResultBadgeStyle(result: GenerationResult | null): {
  bg: string;
  text: string;
  label: string;
  icon: string;
} {
  switch (result) {
    case 'SUCCESS':
      return { bg: '#dcfce7', text: '#166534', label: '生成成功', icon: '✓' };
    case 'SKIPPED':
      return { bg: '#dbeafe', text: '#1e40af', label: '已跳过', icon: '⊘' };
    case 'FORCE_REGENERATE':
      return { bg: '#fef3c7', text: '#92400e', label: '强制更新', icon: '↻' };
    case 'ERROR':
      return { bg: '#fee2e2', text: '#991b1b', label: '生成失败', icon: '✕' };
    default:
      return { bg: '#f3f4f6', text: '#6b7280', label: '待执行', icon: '○' };
  }
}

export function formatDuration(ms: number | undefined): string {
  if (!ms || ms === 0) return '-';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

export function formatTimestamp(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export function getCooldownDisplay(remainingMs: number): string {
  if (remainingMs <= 0) return '';
  const seconds = Math.ceil(remainingMs / 1000);
  if (seconds < 60) return `${seconds}秒`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}分${secs > 0 ? secs + '秒' : ''}`;
}

export function assessGenerationHealth(stats: GenerationStatistics): {
  status: 'healthy' | 'warning' | 'critical';
  message: string;
  suggestions: string[];
} {
  const suggestions: string[] = [];

  if (stats.totalAttempts < 5) {
    return { status: 'healthy', message: '数据不足，暂无评估', suggestions: ['积累更多生成数据后再评估'] };
  }

  if (stats.errorRate > 0.25) {
    suggestions.push('错误率超过25%，请检查生成器实现');
  }
  if (stats.forceCount / stats.totalAttempts > 0.3) {
    suggestions.push('强制重新生成比例过高，可能存在设计问题');
  }
  if (stats.avgDurationMs > 20000) {
    suggestions.push('平均生成耗时过长，考虑优化生成器性能');
  }

  if (suggestions.length === 0) {
    return { status: 'healthy', message: '系统运行正常', suggestions: [] };
  } else if (suggestions.length <= 2) {
    return { status: 'warning', message: '发现一些需要注意的问题', suggestions };
  } else {
    return { status: 'critical', message: '系统存在多个问题需要处理', suggestions };
  }
}

export function buildTypeKey(category: 'module' | 'component', subType: string): GenerationTypeKey {
  return `${category}:${subType}` as GenerationTypeKey;
}

export function parseTypeKey(typeKey: GenerationTypeKey): {
  category: 'module' | 'component';
  subType: string;
} | null {
  const parts = typeKey.split(':');
  if (parts.length !== 2) return null;

  const [category, subType] = parts;
  if (category !== 'module' && category !== 'component') return null;

  return { category: category as 'module' | 'component', subType };
}

export function isModuleTypeKey(typeKey: GenerationTypeKey): boolean {
  return typeKey.startsWith('module:');
}

export function isComponentTypeKey(typeKey: GenerationTypeKey): boolean {
  return typeKey.startsWith('component:');
}

export function getEntryHealthStatus(entry: RegistryEntry): 'healthy' | 'warning' | 'locked' | 'deprecated' {
  if (entry.isLocked) return 'locked';
  if (entry.status === 'deprecated' || entry.status === 'deleted') return 'deprecated';
  if (entry.forceRegenerationCount > 5) return 'warning';
  return 'healthy';
}

export interface GenerationAuditReport {
  generatedAt: string;
  totalEntries: number;
  activeEntries: number;
  lockedEntries: number;
  totalRecords: number;
  successRate: number;
  forceRegenerationRate: number;
  topTypes: Array<{
    typeKey: GenerationTypeKey;
    count: number;
    lastGeneratedAt: string;
  }>;
  recentIssues: Array<{
    typeKey: GenerationTypeKey;
    issue: string;
    timestamp: string;
  }>;
}

export function generateAuditReport(
  entries: RegistryEntry[],
  records: GenerationRecord[]
): GenerationAuditReport {
  const activeEntries = entries.filter(e => e.status === 'active').length;
  const lockedEntries = entries.filter(e => e.isLocked).length;
  const successCount = records.filter(r => r.result === 'SUCCESS').length;
  const forceCount = records.filter(r => r.result === 'FORCE_REGENERATE').length;

  const typeCounts = new Map<GenerationTypeKey, { count: number; lastGeneratedAt: string }>();
  for (const entry of entries) {
    const existing = typeCounts.get(entry.typeKey) || { count: 0, lastGeneratedAt: entry.firstGeneratedAt };
    existing.count++;
    if (entry.lastGeneratedAt > existing.lastGeneratedAt) existing.lastGeneratedAt = entry.lastGeneratedAt;
    typeCounts.set(entry.typeKey, existing);
  }

  const topTypes: Array<{ typeKey: GenerationTypeKey; count: number; lastGeneratedAt: string }> = Array.from(typeCounts.entries())
    .map(([typeKey, data]) => ({ typeKey, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const recentIssues = records
    .filter(r => r.result === 'ERROR' || r.skipReason)
    .slice(0, 10)
    .map(r => ({
      typeKey: r.typeKey,
      issue: r.error?.message || r.skipReason?.message || '未知问题',
      timestamp: r.triggeredAt,
    }));

  return {
    generatedAt: new Date().toISOString(),
    totalEntries: entries.length,
    activeEntries,
    lockedEntries,
    totalRecords: records.length,
    successRate: records.length > 0 ? successCount / records.length : 0,
    forceRegenerationRate: records.length > 0 ? forceCount / records.length : 0,
    topTypes,
    recentIssues,
  };
}
