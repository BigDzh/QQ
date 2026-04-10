import MD5 from 'crypto-js/md5';
import type {
  GenerationTypeKey,
  TypeSignature,
  RegistryEntry,
  GenerationRecord,
  GenerationResult,
  SkipReason,
  SkipReasonDetail,
  ValidationIssue,
  ValidationResult,
  GeneratorConfig,
  GeneratorParams,
  GenerateParams,
  GenerateResult,
  ForceRegenerateParams,
  GenerationSystemConfig,
  GenerationLogEntry,
  GenerationEventType,
  GenerationLogLevel,
  GenerationStatistics,
  GenerationError,
} from '../../types/generation';

const DEFAULT_CONFIG: GenerationSystemConfig = {
  cooldownPeriodMs: 5 * 60 * 1000,
  allowForceRegeneration: true,
  requireReasonOnForce: true,
  maxRegistryEntries: 1000,
  maxLogEntries: 2000,
  logRetentionDays: 90,
  enableConsoleLog: true,
  storagePrefix: 'gen_',
};

let systemConfig: GenerationSystemConfig = { ...DEFAULT_CONFIG };
let registryEntries: RegistryEntry[] = [];
let generationRecords: GenerationRecord[] = [];
let logEntries: GenerationLogEntry[] = [];
let generatorMap = new Map<GenerationTypeKey, GeneratorConfig>();
let initialized = false;

function generateId(): string {
  return `gen_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

function computeSignature(typeKey: GenerationTypeKey, config: unknown): TypeSignature {
  const sortedConfig = JSON.stringify(config, Object.keys(config || {}).sort());
  const rawString = `${typeKey}:${sortedConfig}:${Date.now()}`;
  const hashValue = MD5(rawString).toString();

  const signature: TypeSignature = {
    algorithmVersion: 'v1.0',
    value: hashValue,
    createdAt: new Date().toISOString(),
    typeKey,
  };

  logEvent('SIGNATURE_COMPUTED', 'INFO', `签名计算完成: ${typeKey}`, {
    typeKey,
    signaturePreview: hashValue.substring(0, 8),
    configKeys: config ? Object.keys(config) : [],
  });

  return signature;
}

export function initGenerationSystem(partialConfig?: Partial<GenerationSystemConfig>): void {
  if (initialized) return;

  systemConfig = { ...DEFAULT_CONFIG, ...partialConfig };

  try {
    const registryData = localStorage.getItem(`${systemConfig.storagePrefix}registry`);
    if (registryData) {
      registryEntries = JSON.parse(registryData);
    }
  } catch { registryEntries = []; }

  try {
    const recordsData = localStorage.getItem(`${systemConfig.storagePrefix}records`);
    if (recordsData) {
      generationRecords = JSON.parse(recordsData);
    }
  } catch { generationRecords = []; }

  try {
    const logsData = localStorage.getItem(`${systemConfig.storagePrefix}logs`);
    if (logsData) {
      logEntries = JSON.parse(logsData);
    }
  } catch { logEntries = []; }

  initialized = true;
  logEvent('GENERATOR_REGISTERED', 'INFO', '生成系统初始化完�?, { config: systemConfig });
}

export function getConfig(): GenerationSystemConfig {
  return { ...systemConfig };
}

export function updateConfig(partial: Partial<GenerationSystemConfig>): void {
  systemConfig = { ...systemConfig, ...partial };
}

class GenerationRegistryClass {
  register(entry: Omit<RegistryEntry, 'id' | 'firstGeneratedAt' | 'lastGeneratedAt' | 'generationCount' | 'forceRegenerationCount'>): RegistryEntry {
    const now = new Date().toISOString();
    const newEntry: RegistryEntry = {
      ...entry,
      id: generateId(),
      firstGeneratedAt: now,
      lastGeneratedAt: now,
      generationCount: 1,
      forceRegenerationCount: 0,
    };

    const existingIndex = registryEntries.findIndex(
      e => e.typeKey === entry.typeKey && e.projectId === entry.projectId
    );

    if (existingIndex >= 0) {
      const existing = registryEntries[existingIndex];
      newEntry.id = existing.id;
      newEntry.firstGeneratedAt = existing.firstGeneratedAt;
      newEntry.generationCount = existing.generationCount + 1;
      registryEntries[existingIndex] = newEntry;
    } else {
      registryEntries.push(newEntry);
    }

    this.persist();
    logEvent('REGISTRY_UPDATED', 'INFO', `注册表更�? ${entry.typeKey}`, { entryId: newEntry.id, typeKey: entry.typeKey });
    return newEntry;
  }

  findByTypeKey(typeKey: GenerationTypeKey, projectId?: string): RegistryEntry | undefined {
    return registryEntries.find(e =>
      e.typeKey === typeKey && (!projectId || e.projectId === projectId)
    );
  }

  findBySignature(signature: TypeSignature): RegistryEntry | undefined {
    return registryEntries.find(e => e.signature.value === signature.value);
  }

  findAll(): RegistryEntry[] {
    return [...registryEntries];
  }

  findByProject(projectId: string): RegistryEntry[] {
    return registryEntries.filter(e => e.projectId === projectId);
  }

  isInCooldown(typeKey: GenerationTypeKey, projectId: string): boolean {
    const entry = this.findByTypeKey(typeKey, projectId);
    if (!entry?.cooldownUntil) return false;
    return new Date(entry.cooldownUntil).getTime() > Date.now();
  }

  getCooldownRemainingMs(typeKey: GenerationTypeKey, projectId: string): number {
    const entry = this.findByTypeKey(typeKey, projectId);
    if (!entry?.cooldownUntil) return 0;
    const remaining = new Date(entry.cooldownUntil).getTime() - Date.now();
    return remaining > 0 ? remaining : 0;
  }

  setCooldown(typeKey: GenerationTypeKey, projectId: string, durationMs?: number): void {
    const entry = this.findByTypeKey(typeKey, projectId);
    if (!entry) return;

    const cooldownDuration = durationMs ?? systemConfig.cooldownPeriodMs;
    entry.cooldownUntil = new Date(Date.now() + cooldownDuration).toISOString();

    this.persist();
    logEvent('COOLDOWN_SET', 'INFO', `冷却期设�? ${typeKey}`, { typeKey, durationMs: cooldownDuration });
  }

  lockEntry(entryId: string): boolean {
    const entry = registryEntries.find(e => e.id === entryId);
    if (!entry) return false;

    entry.isLocked = true;
    this.persist();
    logEvent('ENTRY_LOCKED', 'WARN', `条目锁定: ${entry.typeKey}`, { entryId });
    return true;
  }

  unlockEntry(entryId: string): boolean {
    const entry = registryEntries.find(e => e.id === entryId);
    if (!entry) return false;

    entry.isLocked = false;
    this.persist();
    logEvent('ENTRY_UNLOCKED', 'INFO', `条目解锁: ${entry.typeKey}`, { entryId });
    return true;
  }

  isLocked(entryId: string): boolean {
    const entry = registryEntries.find(e => e.id === entryId);
    return entry?.isLocked ?? false;
  }

  incrementForceCount(entryId: string): void {
    const entry = registryEntries.find(e => e.id === entryId);
    if (entry) {
      entry.forceRegenerationCount = (entry.forceRegenerationCount || 0) + 1;
      this.persist();
    }
  }

  count(): number {
    return registryEntries.length;
  }

  countByType(typeKey: GenerationTypeKey): number {
    return registryEntries.filter(e => e.typeKey === typeKey).length;
  }

  removeEntry(entryId: string): boolean {
    const index = registryEntries.findIndex(e => e.id === entryId);
    if (index < 0) return false;

    registryEntries.splice(index, 1);
    this.persist();
    return true;
  }

  clear(): void {
    registryEntries = [];
    this.persist();
  }

  private persist(): void {
    try {
      localStorage.setItem(
        `${systemConfig.storagePrefix}registry`,
        JSON.stringify(registryEntries.slice(0, systemConfig.maxRegistryEntries))
      );
    } catch (e) {
      logEvent('REGISTRY_UPDATED', 'ERROR', '注册表持久化失败', { error: String(e) });
    }
  }
}

export const GenerationRegistry = new GenerationRegistryClass();

class GenerationValidatorClass {
  validate(
    typeKey: GenerationTypeKey,
    signature: TypeSignature,
    _targetType: 'module' | 'component',
    projectId: string,
    isForced: boolean = false
  ): ValidationResult {
    const issues: ValidationIssue[] = [];

    const existing = GenerationRegistry.findByTypeKey(typeKey, projectId);

    if (existing) {
      if (existing.signature.value === signature.value) {
        issues.push({
          code: 'DUPLICATE_SIGNATURE',
          severity: 'info',
          message: `类型 "${typeKey}" 已存在且配置完全相同`,
          bypassable: true,
          entryId: existing.id,
        });

        logEvent('DUPLICATE_DETECTED', 'WARN', `检测到重复签名: ${typeKey}`, {
          typeKey,
          entryId: existing.id,
          signature: signature.value,
        });
      } else {
        issues.push({
          code: 'DUPLICATE_TYPEKEY',
          severity: 'warning',
          message: `类型 "${typeKey}" 已存在但配置已变更`,
          bypassable: true,
          entryId: existing.id,
        });

        logEvent('DUPLICATE_DETECTED', 'WARN', `检测到类型键重复但签名不同: ${typeKey}`, {
          typeKey,
          entryId: existing.id,
          oldSignature: existing.signature.value.substring(0, 8),
          newSignature: signature.value.substring(0, 8),
        });
      }
    }

    if (!isForced && GenerationRegistry.isInCooldown(typeKey, projectId)) {
      const remaining = GenerationRegistry.getCooldownRemainingMs(typeKey, projectId);
      issues.push({
        code: 'COOLDOWN_ACTIVE',
        severity: 'warning',
        message: `类型 "${typeKey}" 处于冷却期内，剩�?${Math.ceil(remaining / 1000)} 秒`,
        bypassable: true,
        cooldownRemainingMs: remaining,
      });
    }

    if (existing && GenerationRegistry.isLocked(existing.id)) {
      issues.push({
        code: 'LOCKED_ENTRY',
        severity: 'error',
        message: `类型 "${typeKey}" 的条目已锁定，无法操作`,
        bypassable: false,
        entryId: existing.id,
      });
    }

    if (!generatorMap.has(typeKey)) {
      issues.push({
        code: 'DUPLICATE_TYPEKEY' as SkipReason,
        severity: 'error',
        message: `未找到类�?"${typeKey}" 对应的生成器`,
        bypassable: false,
      });
    }

    let severity: ValidationResult['severity'] = 'none';
    if (issues.some(i => i.severity === 'error')) severity = 'error';
    else if (issues.some(i => i.severity === 'warning')) severity = 'warning';
    else if (issues.some(i => i.severity === 'info')) severity = 'info';

    const canProceed = issues.length === 0 ||
      (isForced && issues.every(i => i.bypassable));

    const result: ValidationResult = {
      canProceed,
      issues,
      severity,
      existingEntry: existing || undefined,
    };

    logEvent('VALIDATION_COMPLETED', severity === 'none' ? 'INFO' : severity === 'error' ? 'ERROR' : 'WARN',
      `校验完成: ${typeKey} - ${canProceed ? '通过' : '未通过'}`,
      { canProceed, issueCount: issues.length, severity, isForced }
    );

    return result;
  }
}

export const GenerationValidator = new GenerationValidatorClass();

class GenerationLoggerClass {
  private listeners: Array<(entry: GenerationLogEntry) => void> = [];

  logEvent(
    eventType: GenerationEventType,
    level: GenerationLogLevel,
    message: string,
    data?: Record<string, unknown>,
    operator?: { id: string | null; username: string }
  ): GenerationLogEntry {
    const entry: GenerationLogEntry = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      eventType,
      level,
      typeKey: data?.typeKey as GenerationTypeKey,
      projectId: data?.projectId as string,
      entryId: data?.entryId as string,
      message,
      data,
      operatorId: operator?.id ?? undefined,
      operatorName: operator?.username,
      durationMs: data?.durationMs as number,
    };

    logEntries.unshift(entry);

    if (logEntries.length > systemConfig.maxLogEntries) {
      logEntries = logEntries.slice(0, systemConfig.maxLogEntries);
    }

    try {
      localStorage.setItem(
        `${systemConfig.storagePrefix}logs`,
        JSON.stringify(logEntries)
      );
    } catch { /* ignore */ }

    if (systemConfig.enableConsoleLog) {
      const consoleMethod = level === 'ERROR' || level === 'CRITICAL'
        ? logger.error
        : level === 'WARN'
        ? logger.warn
        : logger.log;
      consoleMethod(`[GenLog:${eventType}] ${message}`, data || '');
    }

    this.listeners.forEach(listener => listener(entry));

    return entry;
  }

  getLogs(filter?: {
    eventType?: GenerationEventType;
    level?: GenerationLogLevel;
    typeKey?: GenerationTypeKey;
    projectId?: string;
    limit?: number;
    since?: string;
  }): GenerationLogEntry[] {
    let filtered = [...logEntries];

    if (filter?.eventType) {
      filtered = filtered.filter(e => e.eventType === filter.eventType);
    }
    if (filter?.level) {
      filtered = filtered.filter(e => e.level === filter.level);
    }
    if (filter?.typeKey) {
      filtered = filtered.filter(e => e.typeKey === filter.typeKey);
    }
    if (filter?.projectId) {
      filtered = filtered.filter(e => e.projectId === filter.projectId);
    }
    if (filter?.since) {
      filtered = filtered.filter(e => e.timestamp >= filter.since!);
    }
    if (filter?.limit) {
      filtered = filtered.slice(0, filter.limit);
    }

    return filtered;
  }

  clearLogs(): void {
    logEntries = [];
    try {
      localStorage.removeItem(`${systemConfig.storagePrefix}logs`);
    } catch { /* ignore */ }
  }

  exportLogsAsJson(): string {
    return JSON.stringify(logEntries, null, 2);
  }

  addListener(listener: (entry: GenerationLogEntry) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index >= 0) this.listeners.splice(index, 1);
    };
  }
}

export const GenerationLogger = new GenerationLoggerClass();

export function logEvent(
  eventType: GenerationEventType,
  level: GenerationLogLevel,
  message: string,
  data?: Record<string, unknown>
): GenerationLogEntry {
  return GenerationLogger.logEvent(eventType, level, message, data);
}

class InterfaceGeneratorClass {
  async generate<T>(params: GenerateParams<T>): Promise<GenerateResult<T>> {
    const startTime = Date.now();
    const { typeKey, config, projectId, moduleId, componentId, operator, isForced, forceReason } = params;

    logEvent('GENERATION_REQUESTED', 'INFO', `收到生成请求: ${typeKey}`, {
      typeKey, projectId, isForced: !!isForced, operatorId: operator?.id, operatorName: operator?.username,
    });

    const signature = computeSignature(typeKey, config);
    const generatorConfig = generatorMap.get(typeKey);

    if (!generatorConfig) {
      const error = { code: 'GENERATOR_NOT_FOUND', message: `未找到类�?${typeKey} 的生成器` };
      logEvent('GENERATION_FAILED', 'ERROR', error.message, { typeKey, ...error, operatorId: operator?.id, operatorName: operator?.username });

      const record = this.createRecord({
        typeKey, targetType: generatorConfig?.targetType || 'module', projectId,
        result: 'ERROR', triggeredAt: new Date().toISOString(), isForced: !!isForced,
        forceReason, error, signature, operator,
      });

      return { result: 'ERROR', record, error };
    }

    const validation = GenerationValidator.validate(
      typeKey, signature, generatorConfig.targetType, projectId, !!isForced
    );

    if (!validation.canProceed) {
      const skipIssue = validation.issues.find(i => !i.bypassable) || validation.issues[0];
      const skipReason: SkipReasonDetail = {
        reason: skipIssue?.code as SkipReasonDetail['reason'] || 'DUPLICATE_SIGNATURE',
        message: skipIssue?.message || '校验未通过',
        existingEntryId: validation.existingEntry?.id,
        cooldownRemainingMs: skipIssue?.cooldownRemainingMs,
      };

      logEvent('GENERATION_SKIPPED', 'INFO', `生成跳过: ${typeKey} - ${skipReason.reason}`, {
        typeKey, projectId, skipReason, operatorName: operator?.username,
      });

      const record = this.createRecord({
        typeKey, targetType: generatorConfig.targetType, projectId,
        result: 'SKIPPED', triggeredAt: new Date().toISOString(), isForced: !!isForced,
        forceReason, skipReason, signature, operator,
      });

      return { result: 'SKIPPED', record, skipReason };
    }

    logEvent('GENERATION_STARTED', 'INFO', `开始执行生�? ${typeKey}`, { typeKey, projectId });

    try {
      const genParams: GeneratorParams<T> = {
        config,
        projectId,
        moduleId,
        componentId,
        operator: operator || { id: null, username: 'system' },
        isForced: !!isForced,
        forceReason,
        registry: GenerationRegistry,
      };

      const data = await generatorConfig.generatorFn(genParams);
      const endTime = Date.now();
      const durationMs = endTime - startTime;

      const entityId = (data as Record<string, unknown>)?.id as string || generateId();

      const registryEntry = GenerationRegistry.register({
        typeKey,
        signature,
        targetType: generatorConfig.targetType,
        projectId,
        entityId,
        status: 'active',
        isLocked: false,
        metadata: generatorConfig.metadata,
      });

      GenerationRegistry.setCooldown(typeKey, projectId, generatorConfig.cooldownPeriodMs);

      if (isForced) {
        GenerationRegistry.incrementForceCount(registryEntry.id);
      }

      logEvent('GENERATION_COMPLETED', 'INFO', `生成成功: ${typeKey} (${durationMs}ms)`, {
        typeKey, projectId, entryId: registryEntry.id, durationMs, entityId,
      });

      const record = this.createRecord({
        entryId: registryEntry.id,
        typeKey, targetType: generatorConfig.targetType, projectId,
        result: isForced ? 'FORCE_REGENERATE' : 'SUCCESS',
        triggeredAt: new Date(startTime).toISOString(),
        completedAt: new Date(endTime).toISOString(),
        durationMs, isForced: !!isForced, forceReason, signature, data: data as unknown as Record<string, unknown>,
        operator,
      });

      return { result: isForced ? 'FORCE_REGENERATE' : 'SUCCESS', record, data };
    } catch (err) {
      const endTime = Date.now();
      const durationMs = endTime - startTime;
      const errorObj: GenerationError = {
        code: 'GENERATION_ERROR',
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      };

      logEvent('GENERATION_FAILED', 'ERROR', `生成失败: ${typeKey} - ${errorObj.message}`, {
        typeKey, projectId, durationMs, error: errorObj,
      });

      const record = this.createRecord({
        typeKey, targetType: generatorConfig.targetType, projectId,
        result: 'ERROR', triggeredAt: new Date(startTime).toISOString(),
        completedAt: new Date(endTime).toISOString(),
        durationMs, isForced: !!isForced, forceReason, error: errorObj, signature, operator,
      });

      return { result: 'ERROR', record, error: errorObj };
    }
  }

  async forceRegenerate<T>(params: ForceRegenerateParams<T>): Promise<GenerateResult<T>> {
    if (systemConfig.requireReasonOnForce && (!params.forceReason || params.forceReason.trim().length < 5)) {
      return {
        result: 'ERROR',
        error: {
          code: 'INVALID_FORCE_REASON',
          message: '强制重新生成需要填写原因（至少5个字符）',
        },
      };
    }

    logEvent('FORCE_REGEN_REQUESTED', 'WARN', `强制重新生成请求: ${params.typeKey}`, {
      typeKey: params.typeKey,
      projectId: params.projectId,
      reason: params.forceReason,
    }, params.operator);

    return this.generate({ ...params, isForced: true });
  }

  registerGenerator<T>(config: GeneratorConfig<T>): void {
    generatorMap.set(config.typeKey, config as GeneratorConfig);
    logEvent('GENERATOR_REGISTERED', 'INFO', `生成器已注册: ${config.typeKey}`, {
      typeKey: config.typeKey,
      label: config.label,
      targetType: config.targetType,
    });
  }

  unregisterGenerator(typeKey: GenerationTypeKey): boolean {
    const removed = generatorMap.delete(typeKey);
    if (removed) {
      logEvent('GENERATOR_UNREGISTERED', 'INFO', `生成器已注销: ${typeKey}`, { typeKey });
    }
    return removed;
  }

  getRegisteredGenerators(): GeneratorConfig[] {
    return Array.from(generatorMap.values());
  }

  hasGenerator(typeKey: GenerationTypeKey): boolean {
    return generatorMap.has(typeKey);
  }

  getStatistics(): GenerationStatistics {
    const totalAttempts = generationRecords.length;
    const successCount = generationRecords.filter(r => r.result === 'SUCCESS').length;
    const skippedCount = generationRecords.filter(r => r.result === 'SKIPPED').length;
    const forceCount = generationRecords.filter(r => r.result === 'FORCE_REGENERATE').length;
    const errorCount = generationRecords.filter(r => r.result === 'ERROR').length;
    const uniqueTypes = new Set(generationRecords.map(r => r.typeKey)).size;

    const totalDuration = generationRecords.reduce((sum, r) => sum + (r.durationMs || 0), 0);
    const successfulDurations = generationRecords
      .filter(r => r.durationMs && (r.result === 'SUCCESS' || r.result === 'FORCE_REGENERATE'))
      .map(r => r.durationMs!);
    const avgDuration = successfulDurations.length > 0
      ? totalDuration / successfulDurations.length
      : 0;

    const byType: GenerationStatistics['byType'] = {};
    for (const record of generationRecords) {
      if (!byType[record.typeKey]) {
        byType[record.typeKey] = { attempts: 0, successes: 0, skips: 0, forces: 0, errors: 0 };
      }
      byType[record.typeKey].attempts++;
      if (record.result === 'SUCCESS') byType[record.typeKey].successes++;
      else if (record.result === 'SKIPPED') byType[record.typeKey].skips++;
      else if (record.result === 'FORCE_REGENERATE') byType[record.typeKey].forces++;
      else if (record.result === 'ERROR') byType[record.typeKey].errors++;
    }

    const byProject: GenerationStatistics['byProject'] = {};
    for (const record of generationRecords) {
      if (!byProject[record.projectId]) {
        byProject[record.projectId] = { attempts: 0, successes: 0, skips: 0, forces: 0, errors: 0 };
      }
      byProject[record.projectId].attempts++;
      if (record.result === 'SUCCESS') byProject[record.projectId].successes++;
      else if (record.result === 'SKIPPED') byProject[record.projectId].skips++;
      else if (record.result === 'FORCE_REGENERATE') byProject[record.projectId].forces++;
      else if (record.result === 'ERROR') byProject[record.projectId].errors++;
    }

    const recentTrend: GenerationStatistics['recentTrend'] = [];
    const dateMap = new Map<string, { count: number; successes: number; errors: number }>();
    for (const record of generationRecords) {
      const date = record.triggeredAt.split('T')[0];
      if (!dateMap.has(date)) dateMap.set(date, { count: 0, successes: 0, errors: 0 });
      const entry = dateMap.get(date)!;
      entry.count++;
      if (record.result === 'SUCCESS' || record.result === 'FORCE_REGENERATE') entry.successes++;
      if (record.result === 'ERROR') entry.errors++;
    }
    for (const [date, stats] of dateMap) {
      recentTrend.push({ date, ...stats });
    }
    recentTrend.sort((a, b) => a.date.localeCompare(b.date));
    recentTrend.splice(30);

    return {
      totalAttempts,
      successCount,
      skippedCount,
      forceCount,
      errorCount,
      uniqueTypes,
      successRate: totalAttempts > 0 ? successCount / totalAttempts : 0,
      errorRate: totalAttempts > 0 ? errorCount / totalAttempts : 0,
      avgDurationMs: Math.round(avgDuration),
      totalDurationMs: totalDuration,
      byType,
      byProject,
      recentTrend,
    };
  }

  getRecords(filter?: {
    typeKey?: GenerationTypeKey;
    projectId?: string;
    result?: GenerationResult;
    limit?: number;
  }): GenerationRecord[] {
    let filtered = [...generationRecords];

    if (filter?.typeKey) filtered = filtered.filter(r => r.typeKey === filter.typeKey);
    if (filter?.projectId) filtered = filtered.filter(r => r.projectId === filter.projectId);
    if (filter?.result) filtered = filtered.filter(r => r.result === filter.result);
    if (filter?.limit) filtered = filtered.slice(0, filter.limit);

    return filtered;
  }

  clearRecords(): void {
    generationRecords = [];
    try {
      localStorage.removeItem(`${systemConfig.storagePrefix}records`);
    } catch { /* ignore */ }
  }

  private createRecord(base: {
    typeKey: GenerationTypeKey;
    targetType: 'module' | 'component';
    projectId: string;
    result: GenerationResult;
    triggeredAt: string;
    isForced: boolean;
    forceReason?: string;
    signature: TypeSignature;
    operator?: { id: string | null; username: string };
    entryId?: string;
    completedAt?: string;
    durationMs?: number;
    skipReason?: SkipReasonDetail;
    error?: GenerationError;
    data?: Record<string, unknown>;
  }): GenerationRecord {
    const record: GenerationRecord = {
      id: generateId(),
      entryId: base.entryId || '',
      typeKey: base.typeKey,
      targetType: base.targetType,
      projectId: base.projectId,
      result: base.result,
      triggeredAt: base.triggeredAt,
      completedAt: base.completedAt,
      durationMs: base.durationMs,
      isForced: base.isForced,
      forceReason: base.forceReason,
      skipReason: base.skipReason,
      error: base.error,
      operatorId: base.operator?.id ?? undefined,
      operatorName: base.operator?.username,
      signature: base.signature,
    };

    generationRecords.unshift(record);

    if (generationRecords.length > systemConfig.maxLogEntries) {
      generationRecords = generationRecords.slice(0, systemConfig.maxLogEntries);
    }

    try {
      localStorage.setItem(
        `${systemConfig.storagePrefix}records`,
        JSON.stringify(generationRecords)
      );
    } catch { /* ignore */ }

    return record;
  }
}

export const InterfaceGenerator = new InterfaceGeneratorClass();

export function initGenerationSystemWithDefaults(): void {
  initGenerationSystem();
}

export function getGenerator(): InterfaceGeneratorClass {
  if (!initialized) initGenerationSystem();
  return InterfaceGenerator;
}

export function getRegistry(): GenerationRegistryClass {
  if (!initialized) initGenerationSystem();
  return GenerationRegistry;
}

export function getValidator(): GenerationValidatorClass {
  if (!initialized) initGenerationSystem();
  return GenerationValidator;
}

export function getLoggerInstance(): GenerationLoggerClass {
  if (!initialized) initGenerationSystem();
  return GenerationLogger;
}
