import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type {
  GenerationTypeKey,
  GenerationResult,
  SkipReasonDetail,
  GenerationError,
  GenerateParams,
  GenerateResult,
  ForceRegenerateParams,
  RegistryEntry,
  AvailableTypeInfo,
  GenerationStatistics,
  GenerationRecord,
  ValidationIssue,
  ValidationResult,
} from '../types/generation';
import {
  initGenerationSystemWithDefaults,
  getGenerator,
  getRegistry,
  getValidator,
} from '../services/generation';

export function useInterfaceGenerator<T = unknown>() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<GenerationError | null>(null);
  const [skipReason, setSkipReason] = useState<SkipReasonDetail | null>(null);
  const [progress, setProgress] = useState<string>('');
  const isMountedRef = useRef(true);

  useEffect(() => {
    initGenerationSystemWithDefaults();
    return () => { isMountedRef.current = false; };
  }, []);

  const generate = useCallback(async (params: GenerateParams<T>): Promise<GenerateResult<T>> => {
    if (isGenerating) return { result: 'ERROR', error: { code: 'IN_PROGRESS', message: '生成任务正在进行中' } };

    setIsGenerating(true);
    setResult(null);
    setData(null);
    setError(null);
    setSkipReason(null);
    setProgress('正在校验唯一性...');

    try {
      const generator = getGenerator();
      const genResult = await generator.generate(params);

      if (!isMountedRef.current) return genResult;

      setResult(genResult.result);

      if (genResult.data !== undefined) setData(genResult.data as T);
      if (genResult.error) setError(genResult.error);
      if (genResult.skipReason) setSkipReason(genResult.skipReason);

      setProgress('');
      return genResult;
    } catch (err) {
      if (!isMountedRef.current) {
        return { result: 'ERROR', error: { code: 'UNKNOWN', message: String(err) } };
      }

      const errorObj: GenerationError = {
        code: 'HOOK_ERROR',
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      };
      setResult('ERROR');
      setError(errorObj);
      setProgress('');
      return { result: 'ERROR', error: errorObj };
    } finally {
      if (isMountedRef.current) setIsGenerating(false);
    }
  }, [isGenerating]);

  const forceRegenerate = useCallback(async (params: ForceRegenerateParams<T>): Promise<GenerateResult<T>> => {
    if (isGenerating) return { result: 'ERROR', error: { code: 'IN_PROGRESS', message: '生成任务正在进行中' } };

    setIsGenerating(true);
    setResult(null);
    setData(null);
    setError(null);
    setSkipReason(null);
    setProgress('正在执行强制重新生成...');

    try {
      const generator = getGenerator();
      const genResult = await generator.forceRegenerate(params);

      if (!isMountedRef.current) return genResult;

      setResult(genResult.result);
      if (genResult.data !== undefined) setData(genResult.data as T);
      if (genResult.error) setError(genResult.error);
      if (genResult.skipReason) setSkipReason(genResult.skipReason);

      setProgress('');
      return genResult;
    } catch (err) {
      if (!isMountedRef.current) {
        return { result: 'ERROR', error: { code: 'UNKNOWN', message: String(err) } };
      }

      const errorObj: GenerationError = {
        code: 'FORCE_HOOK_ERROR',
        message: err instanceof Error ? err.message : String(err),
      };
      setResult('ERROR');
      setError(errorObj);
      setProgress('');
      return { result: 'ERROR', error: errorObj };
    } finally {
      if (isMountedRef.current) setIsGenerating(false);
    }
  }, [isGenerating]);

  const reset = useCallback(() => {
    setResult(null);
    setData(null);
    setError(null);
    setSkipReason(null);
    setProgress('');
  }, []);

  const validate = useCallback((
    typeKey: GenerationTypeKey,
    config: unknown,
    targetType: 'module' | 'component',
    projectId: string,
    isForced?: boolean
  ): ValidationResult => {
    const validator = getValidator();

    const signature = {
      algorithmVersion: 'v1.0' as const,
      value: `${typeKey}_${Date.now()}`,
      createdAt: new Date().toISOString(),
      typeKey,
    };

    return validator.validate(typeKey, signature, targetType, projectId, isForced ?? false);
  }, []);

  const exists = useCallback((typeKey: GenerationTypeKey, projectId?: string): boolean => {
    const registry = getRegistry();
    return !!registry.findByTypeKey(typeKey, projectId);
  }, []);

  const getConfig = useCallback(() => {
    const generator = getGenerator();
    return generator.getRegisteredGenerators();
  }, []);

  return {
    isGenerating,
    result,
    data,
    error,
    skipReason,
    progress,
    generate,
    forceRegenerate,
    reset,
    validate,
    exists,
    getConfig,
  };
}

export function useGenerationRegistry(projectId?: string) {
  const [entries, setEntries] = useState<RegistryEntry[]>([]);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    initGenerationSystemWithDefaults();
    refresh();
  }, []);

  const refresh = useCallback(() => {
    const registry = getRegistry();
    const allEntries = projectId ? registry.findByProject(projectId) : registry.findAll();
    setEntries(allEntries);
    forceUpdate(n => n + 1);
  }, [projectId]);

  const findByTypeKey = useCallback((typeKey: GenerationTypeKey): RegistryEntry | undefined => {
    const registry = getRegistry();
    return registry.findByTypeKey(typeKey, projectId);
  }, [projectId]);

  const count = useMemo(() => entries.length, [entries]);
  const countByType = useCallback((typeKey: GenerationTypeKey): number => {
    return entries.filter(e => e.typeKey === typeKey).length;
  }, [entries]);

  return {
    entries,
    findByTypeKey,
    count,
    countByType,
    refresh,
  };
}

export function useForceRegeneration<T = unknown>() {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingParams, setPendingParams] = useState<ForceRegenerateParams<T> | null>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const { generate: baseForceRegen } = useInterfaceGenerator<T>();

  const requestForceRegeneration = useCallback((params: ForceRegenerateParams<T>) => {
    setPendingParams(params);
    setReason(params.forceReason || '');
    setReasonError(null);
    setShowConfirmDialog(true);
    setResult(null);
  }, []);

  const updateReason = useCallback((newReason: string) => {
    setReason(newReason);
    if (newReason.trim().length >= 5) {
      setReasonError(null);
    } else {
      setReasonError('原因说明至少需要5个字符');
    }
  }, []);

  const confirm = useCallback(async () => {
    if (!pendingParams) return;

    if (reason.trim().length < 5) {
      setReasonError('原因说明至少需要5个字符');
      return;
    }

    setIsExecuting(true);
    try {
      const genResult = await baseForceRegen({
        ...pendingParams,
        forceReason: reason,
      });
      setResult(genResult.result);
      setShowConfirmDialog(false);
      setPendingParams(null);
      setReason('');
    } catch {
      setResult('ERROR');
    } finally {
      setIsExecuting(false);
    }
  }, [pendingParams, reason, baseForceRegen]);

  const cancel = useCallback(() => {
    setShowConfirmDialog(false);
    setPendingParams(null);
    setReason('');
    setReasonError(null);
  }, []);

  return {
    state: {
      showConfirmDialog,
      pendingParams,
      reason,
      reasonError,
    },
    isExecuting,
    result,
    requestForceRegeneration,
    updateReason,
    confirm,
    cancel,
  };
}

export function useGenerationHistory(filter?: {
  typeKey?: GenerationTypeKey;
  projectId?: string;
  result?: GenerationResult;
  limit?: number;
}) {
  const [records, setRecords] = useState<GenerationRecord[]>([]);

  useEffect(() => {
    initGenerationSystemWithDefaults();
    const generator = getGenerator();
    setRecords(generator.getRecords(filter));
  }, [filter?.typeKey, filter?.projectId, filter?.result, filter?.limit]);

  const exportAsJson = useCallback((): string => {
    const generator = getGenerator();
    const allRecords = generator.getRecords(filter);
    return JSON.stringify(allRecords, null, 2);
  }, [filter?.typeKey, filter?.projectId, filter?.result, filter?.limit]);

  return {
    records,
    query: () => {
      const generator = getGenerator();
      setRecords(generator.getRecords(filter));
    },
    exportAsJson,
  };
}

export function useGenerationStatistics() {
  const [statistics, setStatistics] = useState<GenerationStatistics | null>(null);

  useEffect(() => {
    initGenerationSystemWithDefaults();
    refresh();
  }, []);

  const refresh = useCallback(() => {
    const generator = getGenerator();
    setStatistics(generator.getStatistics());
  }, []);

  return {
    statistics,
    refresh,
  };
}

export function buildAvailableTypesInfo(
  registeredGenerators: Array<{ typeKey: GenerationTypeKey; label: string; description?: string; targetType: 'module' | 'component' }>,
  projectId: string
): AvailableTypeInfo[] {
  const registry = getRegistry();

  return registeredGenerators.map(gen => {
    const entry = registry.findByTypeKey(gen.typeKey, projectId);
    const isInCooldown = entry ? registry.isInCooldown(gen.typeKey, projectId) : false;
    const cooldownRemainingMs = isInCooldown
      ? registry.getCooldownRemainingMs(gen.typeKey, projectId)
      : undefined;

    return {
      typeKey: gen.typeKey,
      label: gen.label,
      description: gen.description,
      targetType: gen.targetType,
      isRegistered: !!entry,
      lastGeneratedAt: entry?.lastGeneratedAt,
      generationCount: entry?.generationCount,
      isLocked: entry?.isLocked,
      isInCooldown,
      cooldownRemainingMs,
    };
  });
}
