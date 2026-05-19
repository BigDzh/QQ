export type ModuleTypeKey =
  | 'module:control'
  | 'module:comm'
  | 'module:power'
  | 'module:sensor'
  | 'module:process'
  | 'module:storage'
  | 'module:display'
  | 'module:interface'
  | string;

export type ComponentTypeKey =
  | 'component:pcb_main'
  | 'component:assembly_core'
  | 'component:power_supply'
  | 'component:signal_process'
  | 'component:connector'
  | 'component:casing'
  | 'component:antenna'
  | 'component:heatsink'
  | string;

export type GenerationTypeKey = ModuleTypeKey | ComponentTypeKey;

export interface TypeSignature {
  algorithmVersion: 'v1.0';
  value: string;
  createdAt: string;
  typeKey: GenerationTypeKey;
}

export type GenerationResult =
  | 'SUCCESS'
  | 'SKIPPED'
  | 'ERROR'
  | 'FORCE_REGENERATE';

export type SkipReason =
  | 'DUPLICATE_SIGNATURE'
  | 'DUPLICATE_TYPEKEY'
  | 'COOLDOWN_ACTIVE'
  | 'LOCKED_ENTRY';

export interface SkipReasonDetail {
  reason: SkipReason;
  message: string;
  existingEntryId?: string;
  cooldownRemainingMs?: number;
}

export type RegistryEntryStatus = 'active' | 'archived' | 'deprecated' | 'deleted';

export interface RegistryEntry {
  id: string;
  typeKey: GenerationTypeKey;
  signature: TypeSignature;
  targetType: 'module' | 'component';
  projectId: string;
  entityId: string;
  firstGeneratedAt: string;
  lastGeneratedAt: string;
  generationCount: number;
  forceRegenerationCount: number;
  status: RegistryEntryStatus;
  isLocked: boolean;
  cooldownUntil?: string;
  metadata?: Record<string, unknown>;
}

export interface GenerationRecord {
  id: string;
  entryId: string;
  typeKey: GenerationTypeKey;
  targetType: 'module' | 'component';
  projectId: string;
  result: GenerationResult;
  triggeredAt: string;
  completedAt?: string;
  durationMs?: number;
  isForced: boolean;
  forceReason?: string;
  skipReason?: SkipReasonDetail;
  error?: GenerationError;
  operatorId?: string;
  operatorName?: string;
  signature: TypeSignature;
}

export interface GenerationError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
}

export type GenerationEventType =
  | 'GENERATION_REQUESTED'
  | 'VALIDATION_COMPLETED'
  | 'DUPLICATE_DETECTED'
  | 'GENERATION_STARTED'
  | 'GENERATION_PROGRESS'
  | 'GENERATION_COMPLETED'
  | 'GENERATION_SKIPPED'
  | 'FORCE_REGEN_REQUESTED'
  | 'FORCE_REGEN_EXECUTED'
  | 'GENERATION_FAILED'
  | 'REGISTRY_UPDATED'
  | 'COOLDOWN_SET'
  | 'ENTRY_LOCKED'
  | 'ENTRY_UNLOCKED'
  | 'SIGNATURE_COMPUTED'
  | 'GENERATOR_REGISTERED'
  | 'GENERATOR_UNREGISTERED';

export type GenerationLogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';

export interface GenerationLogEntry {
  id: string;
  timestamp: string;
  eventType: GenerationEventType;
  level: GenerationLogLevel;
  typeKey?: GenerationTypeKey;
  projectId?: string;
  entryId?: string;
  message: string;
  data?: Record<string, unknown>;
  operatorId?: string;
  operatorName?: string;
  durationMs?: number;
}

export interface ValidationIssue {
  code: SkipReason;
  severity: 'info' | 'warning' | 'error';
  message: string;
  bypassable: boolean;
  entryId?: string;
  cooldownRemainingMs?: number;
}

export interface ValidationResult {
  canProceed: boolean;
  issues: ValidationIssue[];
  severity: 'none' | 'info' | 'warning' | 'error';
  existingEntry?: RegistryEntry;
}

export interface GeneratorConfig<T = unknown> {
  typeKey: GenerationTypeKey;
  targetType: 'module' | 'component';
  label: string;
  description?: string;
  generatorFn: (params: GeneratorParams<T>) => Promise<T> | T;
  signatureFields?: (keyof T)[];
  cooldownPeriodMs?: number;
  allowForceRegeneration?: boolean;
  requireReasonOnForce?: boolean;
  maxGenerationCount?: number;
  metadata?: Record<string, unknown>;
}

export interface GeneratorParams<T = unknown> {
  config: T;
  projectId: string;
  moduleId?: string;
  componentId?: string;
  operator: { id: string | null; username: string };
  isForced: boolean;
  forceReason?: string;
  registry: {
    findByTypeKey: (typeKey: GenerationTypeKey, projectId?: string) => RegistryEntry | undefined;
    register: (entry: Omit<RegistryEntry, 'id' | 'firstGeneratedAt' | 'lastGeneratedAt' | 'generationCount' | 'forceRegenerationCount'>) => RegistryEntry;
    isInCooldown: (typeKey: GenerationTypeKey, projectId: string) => boolean;
    setCooldown: (typeKey: GenerationTypeKey, projectId: string, durationMs?: number) => void;
    incrementForceCount: (entryId: string) => void;
  };
}

export interface GenerationSystemConfig {
  cooldownPeriodMs: number;
  allowForceRegeneration: boolean;
  requireReasonOnForce: boolean;
  maxRegistryEntries: number;
  maxLogEntries: number;
  logRetentionDays: number;
  enableConsoleLog: boolean;
  storagePrefix: string;
}

export interface GenerateParams<T = unknown> {
  typeKey: GenerationTypeKey;
  config: T;
  projectId: string;
  moduleId?: string;
  componentId?: string;
  operator: { id: string | null; username: string };
  isForced?: boolean;
  forceReason?: string;
}

export interface GenerateResult<T = unknown> {
  result: GenerationResult;
  record?: GenerationRecord;
  data?: T;
  skipReason?: SkipReasonDetail;
  error?: GenerationError;
}

export interface ForceRegenerateParams<T = unknown> extends GenerateParams<T> {
  forceReason: string;
}

export interface AvailableTypeInfo {
  typeKey: GenerationTypeKey;
  label: string;
  description?: string;
  targetType: 'module' | 'component';
  isRegistered: boolean;
  lastGeneratedAt?: string;
  generationCount?: number;
  isLocked?: boolean;
  isInCooldown?: boolean;
  cooldownRemainingMs?: number;
}

export interface GenerationStatistics {
  totalAttempts: number;
  successCount: number;
  skippedCount: number;
  forceCount: number;
  errorCount: number;
  uniqueTypes: number;
  successRate: number;
  errorRate: number;
  avgDurationMs: number;
  totalDurationMs: number;
  byType: Record<GenerationTypeKey, {
    attempts: number;
    successes: number;
    skips: number;
    forces: number;
    errors: number;
  }>;
  byProject: Record<string, {
    attempts: number;
    successes: number;
    skips: number;
    forces: number;
    errors: number;
  }>;
  recentTrend: Array<{
    date: string;
    count: number;
    successes: number;
    errors: number;
  }>;
}

export interface GenerationControlPanelProps {
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
}

export interface GenerationStatusIndicatorProps {
  result: GenerationResult | null;
  isGenerating: boolean;
  skipReason?: SkipReasonDetail;
  error?: GenerationError;
  className?: string;
}

export interface RegenerationConfirmDialogProps {
  show: boolean;
  typeInfo: AvailableTypeInfo | null;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  isExecuting: boolean;
  className?: string;
}

export interface UniqueTypeBadgeProps {
  typeInfo: AvailableTypeInfo;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
}

export interface GenerationHistoryViewerProps {
  records: GenerationRecord[];
  isLoading?: boolean;
  onExport?: () => void;
  onClear?: () => void;
  onViewDetail?: (record: GenerationRecord) => void;
  className?: string;
}

export interface GenerationStatsDashboardProps {
  statistics: GenerationStatistics | null;
  isLoading?: boolean;
  className?: string;
}
