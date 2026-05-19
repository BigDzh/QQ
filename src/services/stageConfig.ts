import type { ProjectStage } from '../types';

export const STAGE_OPTIONS: ProjectStage[] = ['F阶段', 'C阶段', 'S阶段', 'D阶段', 'P阶段'];

export interface StageDefinition {
  key: ProjectStage;
  name: string;
  fullName: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  order: number;
}

export const STAGE_DEFINITIONS: Record<ProjectStage, StageDefinition> = {
  'F阶段': {
    key: 'F阶段',
    name: 'F',
    fullName: '功能定义阶段 (Function)',
    description: '需求分析、功能定义、方案论证阶段',
    color: '#ec4899',
    bgColor: 'bg-rose-100',
    borderColor: 'border-rose-300',
    textColor: 'text-rose-900',
    order: 1,
  },
  'C阶段': {
    key: 'C阶段',
    name: 'C',
    fullName: '概念设计阶段 (Concept)',
    description: '方案设计、原理样机、关键技术攻关阶段',
    color: '#3b82f6',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300',
    textColor: 'text-blue-900',
    order: 2,
  },
  'S阶段': {
    key: 'S阶段',
    name: 'S',
    fullName: '工程研制阶段 (System)',
    description: '系统设计、详细设计、试制生产阶段',
    color: '#eab308',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-300',
    textColor: 'text-yellow-900',
    order: 3,
  },
  'D阶段': {
    key: 'D阶段',
    name: 'D',
    fullName: '设计定型阶段 (Design)',
    description: '设计评审、状态鉴定、定型试验阶段',
    color: '#f97316',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-300',
    textColor: 'text-orange-900',
    order: 4,
  },
  'P阶段': {
    key: 'P阶段',
    name: 'P',
    fullName: '生产交付阶段 (Production)',
    description: '批量生产、质量验收、产品交付阶段',
    color: '#22c55e',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-300',
    textColor: 'text-green-900',
    order: 5,
  },
};

export type EntityType = 'project' | 'system' | 'module' | 'component' | 'document' | 'software' | 'designFile';

export interface EntityStageConfig {
  entityType: EntityType;
  defaultStage: ProjectStage;
  allowedStages: ProjectStage[];
  recommendedStages: ProjectStage[];
  stageDescription: string;
}

export const ENTITY_STAGE_CONFIGS: Record<EntityType, EntityStageConfig> = {
  project: {
    entityType: 'project',
    defaultStage: 'F阶段',
    allowedStages: STAGE_OPTIONS,
    recommendedStages: STAGE_OPTIONS,
    stageDescription: '项目整体所处生命周期阶段，决定各子实体的默认阶段',
  },
  system: {
    entityType: 'system',
    defaultStage: 'F阶段',
    allowedStages: STAGE_OPTIONS,
    recommendedStages: STAGE_OPTIONS,
    stageDescription: '系统级产品的研发阶段，通常与项目阶段保持一致或略超前',
  },
  module: {
    entityType: 'module',
    defaultStage: 'C阶段',
    allowedStages: STAGE_OPTIONS,
    recommendedStages: ['C阶段', 'S阶段', 'D阶段'],
    stageDescription: '模块/单机级别产品的研发阶段，从C阶段开始进入实质性开发',
  },
  component: {
    entityType: 'component',
    defaultStage: 'C阶段',
    allowedStages: STAGE_OPTIONS,
    recommendedStages: ['C阶段', 'S阶段', 'D阶段', 'P阶段'],
    stageDescription: '组件/元器件级别的生产阶段，跟随模块阶段推进',
  },
  document: {
    entityType: 'document',
    defaultStage: 'F阶段',
    allowedStages: STAGE_OPTIONS,
    recommendedStages: ['F阶段', 'C阶段', 'S阶段'],
    stageDescription: '技术文档的编制阶段，不同类型文档对应不同阶段产出',
  },
  software: {
    entityType: 'software',
    defaultStage: 'C阶段',
    allowedStages: STAGE_OPTIONS,
    recommendedStages: ['C阶段', 'S阶段', 'D阶段'],
    stageDescription: '软件/固件的研发阶段，通常在C阶段开始编码',
  },
  designFile: {
    entityType: 'designFile',
    defaultStage: 'C阶段',
    allowedStages: STAGE_OPTIONS,
    recommendedStages: ['C阶段', 'S阶段', 'D阶段'],
    stageDescription: '设计文件(配套表/装配图)的阶段归属，主要在C/S/D阶段产生',
  },
};

export function getStageDefinition(stage: ProjectStage): StageDefinition {
  return STAGE_DEFINITIONS[stage];
}

export function getEntityStageConfig(entityType: EntityType): EntityStageConfig {
  return ENTITY_STAGE_CONFIGS[entityType];
}

export function getDefaultStageForEntity(entityType: EntityType): ProjectStage {
  return ENTITY_STAGE_CONFIGS[entityType].defaultStage;
}

export function getRecommendedStagesForEntity(entityType: EntityType): ProjectStage[] {
  return ENTITY_STAGE_CONFIGS[entityType].recommendedStages;
}

export function isValidStageForEntity(stage: string, entityType: EntityType): boolean {
  return ENTITY_STAGE_CONFIGS[entityType].allowedStages.includes(stage as ProjectStage);
}

export function getStageOrder(stage: ProjectStage): number {
  return STAGE_DEFINITIONS[stage].order;
}

export function getNextStage(currentStage: ProjectStage): ProjectStage | null {
  const currentOrder = STAGE_DEFINITIONS[currentStage].order;
  if (currentOrder >= 5) return null;
  const nextStage = STAGE_OPTIONS.find(s => STAGE_DEFINITIONS[s].order === currentOrder + 1);
  return nextStage || null;
}

export function getPreviousStage(currentStage: ProjectStage): ProjectStage | null {
  const currentOrder = STAGE_DEFINITIONS[currentStage].order;
  if (currentOrder <= 1) return null;
  const prevStage = STAGE_OPTIONS.find(s => STAGE_DEFINITIONS[s].order === currentOrder - 1);
  return prevStage || null;
}

export function canTransitionTo(fromStage: ProjectStage, toStage: ProjectStage): boolean {
  const fromOrder = STAGE_DEFINITIONS[fromStage].order;
  const toOrder = STAGE_DEFINITIONS[toStage].order;
  return Math.abs(toOrder - fromOrder) === 1;
}

export function getAllStageDefinitions(): StageDefinition[] {
  return STAGE_OPTIONS.map(s => STAGE_DEFINITIONS[s]).sort((a, b) => a.order - b.order);
}
