import type {
  Project,
  Task,
  BorrowRecord,
} from '../types';

export interface DataRelation {
  sourceType: string;
  sourceId: string;
  targetType: string;
  targetId: string;
  relationType: 'owns' | 'contains' | 'references' | 'depends_on' | 'borrowed_from' | 'belongs_to';
  metadata?: Record<string, unknown>;
}

export interface DataIntegrityResult {
  isValid: boolean;
  errors: DataIntegrityError[];
  warnings: DataIntegrityWarning[];
}

export interface DataIntegrityError {
  type: 'orphan' | 'duplicate' | 'invalid_reference' | 'circular_dependency';
  entityType: string;
  entityId: string;
  message: string;
  relatedEntities?: { type: string; id: string }[];
}

export interface DataIntegrityWarning {
  type: 'missing_field' | 'deprecated_field' | 'unlinked_data';
  entityType: string;
  entityId: string;
  message: string;
}

export interface UnifiedDataItem {
  id: string;
  type: string;
  projectId?: string;
  projectName?: string;
  name: string;
  category?: string;
  status?: string;
  createdAt: string;
  updatedAt?: string;
  relations?: DataRelation[];
  metadata?: Record<string, unknown>;
}

export interface CrossReferenceResult {
  item: UnifiedDataItem;
  references: {
    itemId: string;
    itemType: string;
    itemName: string;
    relationType: string;
  }[];
  referencedBy: {
    itemId: string;
    itemType: string;
    itemName: string;
    relationType: string;
  }[];
}

const CACHE_TTL = 30000;
const PROJECT_CACHE_TTL = 60000;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class DataRelationService {
  private projects: Project[] = [];
  private tasks: Task[] = [];
  private borrowRecords: BorrowRecord[] = [];
  private projectsHash: string = '';

  private relationsCache: CacheEntry<DataRelation[]> | null = null;
  private unifiedDataCache: CacheEntry<UnifiedDataItem[]> | null = null;
  private indexCache: CacheEntry<Map<string, UnifiedDataItem>> | null = null;
  private relationsIndexCache: CacheEntry<Map<string, DataRelation[]>> | null = null;

  async initialize(
    projects: Project[],
    tasks: Task[],
    borrowRecords: BorrowRecord[]
  ): Promise<void> {
    this.projects = projects;
    this.tasks = tasks || [];
    this.borrowRecords = borrowRecords || [];
    this.projectsHash = this.computeDataHash();
    this.invalidateAllCaches();
    console.log('[DataRelationService] Initialized with:', {
      projects: this.projects.length,
      tasks: this.tasks.length,
      borrowRecords: this.borrowRecords.length,
    });
  }

  private computeDataHash(): string {
    const data = {
      projects: this.projects.map(p => ({ id: p.id, updatedAt: p.createdAt })),
      tasks: this.tasks.map(t => t.id),
    };
    return JSON.stringify(data);
  }

  private invalidateAllCaches(): void {
    this.relationsCache = null;
    this.unifiedDataCache = null;
    this.indexCache = null;
    this.relationsIndexCache = null;
  }

  private isCacheValid<T>(cache: CacheEntry<T> | null, ttl: number = CACHE_TTL): boolean {
    if (!cache) return false;
    return Date.now() - cache.timestamp < ttl;
  }

  getAllRelations(): DataRelation[] {
    if (this.isCacheValid(this.relationsCache)) {
      return this.relationsCache!.data;
    }

    const relations: DataRelation[] = [];

    for (const project of this.projects) {
      relations.push({
        sourceType: 'project',
        sourceId: project.id,
        targetType: 'project',
        targetId: project.id,
        relationType: 'owns',
        metadata: { name: project.name },
      });

      for (const system of project.systems || []) {
        relations.push({
          sourceType: 'project',
          sourceId: project.id,
          targetType: 'system',
          targetId: system.id,
          relationType: 'contains',
          metadata: { name: system.systemName },
        });

        for (const module of project.modules || []) {
          if (module.systemId === system.id) {
            relations.push({
              sourceType: 'system',
              sourceId: system.id,
              targetType: 'module',
              targetId: module.id,
              relationType: 'contains',
              metadata: { name: module.moduleName },
            });
          }
        }
      }

      for (const module of project.modules || []) {
        if (!module.systemId) {
          relations.push({
            sourceType: 'project',
            sourceId: project.id,
            targetType: 'module',
            targetId: module.id,
            relationType: 'contains',
            metadata: { name: module.moduleName },
          });
        }

        for (const component of module.components || []) {
          relations.push({
            sourceType: 'module',
            sourceId: module.id,
            targetType: 'component',
            targetId: component.id,
            relationType: 'contains',
            metadata: { name: component.componentName },
          });

          for (const sw of component.burnedSoftware || []) {
            relations.push({
              sourceType: 'component',
              sourceId: component.id,
              targetType: 'software',
              targetId: sw.softwareId,
              relationType: 'depends_on',
              metadata: { name: sw.softwareName, version: sw.softwareVersion },
            });
          }

          for (const dfId of component.designFiles || []) {
            relations.push({
              sourceType: 'component',
              sourceId: component.id,
              targetType: 'designFile',
              targetId: dfId,
              relationType: 'references',
            });
          }
        }

        for (const dfId of module.designFiles || []) {
          relations.push({
            sourceType: 'module',
            sourceId: module.id,
            targetType: 'designFile',
            targetId: dfId,
            relationType: 'references',
          });
        }
      }

      for (const doc of project.documents || []) {
        relations.push({
          sourceType: 'project',
          sourceId: project.id,
          targetType: 'document',
          targetId: doc.id,
          relationType: 'contains',
          metadata: { name: doc.name, stage: doc.stage },
        });
      }

      for (const software of project.software || []) {
        relations.push({
          sourceType: 'project',
          sourceId: project.id,
          targetType: 'software',
          targetId: software.id,
          relationType: 'contains',
          metadata: { name: software.name, version: software.version },
        });

        for (const compId of software.adaptedComponentIds || []) {
          relations.push({
            sourceType: 'software',
            sourceId: software.id,
            targetType: 'component',
            targetId: compId,
            relationType: 'borrowed_from',
            metadata: { name: software.name },
          });
        }
      }

      for (const df of project.designFiles || []) {
        relations.push({
          sourceType: 'project',
          sourceId: project.id,
          targetType: 'designFile',
          targetId: df.id,
          relationType: 'contains',
          metadata: { name: df.name },
        });

        if (df.moduleId) {
          relations.push({
            sourceType: 'designFile',
            sourceId: df.id,
            targetType: 'module',
            targetId: df.moduleId,
            relationType: 'belongs_to',
          });
        }

        if (df.componentId) {
          relations.push({
            sourceType: 'designFile',
            sourceId: df.id,
            targetType: 'component',
            targetId: df.componentId,
            relationType: 'belongs_to',
          });
        }
      }
    }

    this.relationsCache = { data: relations, timestamp: Date.now() };
    return relations;
  }

  getUnifiedData(): UnifiedDataItem[] {
    if (this.isCacheValid(this.unifiedDataCache)) {
      return this.unifiedDataCache!.data;
    }

    const items: UnifiedDataItem[] = [];

    for (const project of this.projects) {
      items.push({
        id: project.id,
        type: 'project',
        projectId: project.id,
        projectName: project.name,
        name: project.name,
        category: (project as any).category,
        status: (project as any).status,
        createdAt: (project as any).createdAt,
        metadata: { projectNumber: project.projectNumber },
      });

      for (const system of project.systems || []) {
        items.push({
          id: system.id,
          type: 'system',
          projectId: project.id,
          projectName: project.name,
          name: system.systemName,
          status: system.status,
          createdAt: system.createdAt,
          metadata: { systemNumber: system.systemNumber },
        });
      }

      for (const module of project.modules || []) {
        items.push({
          id: module.id,
          type: 'module',
          projectId: project.id,
          projectName: project.name,
          name: module.moduleName,
          category: (module as any).category,
          status: module.status,
          createdAt: (module as any).createdAt,
          metadata: { moduleNumber: module.moduleNumber, systemId: module.systemId },
        });

        for (const component of module.components || []) {
          items.push({
            id: component.id,
            type: 'component',
            projectId: project.id,
            projectName: project.name,
            name: component.componentName,
            status: component.status,
            createdAt: (component as any).createdAt,
            metadata: { componentNumber: component.componentNumber },
          });
        }
      }

      for (const doc of project.documents || []) {
        items.push({
          id: doc.id,
          type: 'document',
          projectId: project.id,
          projectName: project.name,
          name: doc.name,
          category: doc.type,
          status: doc.status,
          createdAt: doc.uploadDate || new Date().toISOString(),
          metadata: { documentNumber: doc.documentNumber, stage: doc.stage },
        });
      }

      for (const software of project.software || []) {
        items.push({
          id: software.id,
          type: 'software',
          projectId: project.id,
          projectName: project.name,
          name: software.name,
          category: software.stage,
          status: software.status,
          createdAt: software.uploadDate || new Date().toISOString(),
          metadata: { version: software.version, md5: software.md5 },
        });
      }

      for (const df of project.designFiles || []) {
        items.push({
          id: df.id,
          type: 'designFile',
          projectId: project.id,
          projectName: project.name,
          name: df.name,
          category: df.type,
          status: df.isAutoGenerated ? '自动生成' : '手动上传',
          createdAt: df.uploadDate,
          metadata: { format: df.format, moduleId: df.moduleId },
        });
      }
    }

    this.unifiedDataCache = { data: items, timestamp: Date.now() };
    return items;
  }

  private getIndexMap(): Map<string, UnifiedDataItem> {
    if (this.isCacheValid(this.indexCache)) {
      return this.indexCache!.data;
    }

    const indexMap = new Map<string, UnifiedDataItem>();
    const items = this.getUnifiedData();

    for (const item of items) {
      indexMap.set(`${item.type}-${item.id}`, item);
    }

    this.indexCache = { data: indexMap, timestamp: Date.now() };
    return indexMap;
  }

  private getRelationsIndex(): Map<string, DataRelation[]> {
    if (this.isCacheValid(this.relationsIndexCache)) {
      return this.relationsIndexCache!.data;
    }

    const relationsIndex = new Map<string, DataRelation[]>();
    const relations = this.getAllRelations();

    for (const rel of relations) {
      const key = `${rel.sourceType}-${rel.sourceId}`;
      const existing = relationsIndex.get(key) || [];
      existing.push(rel);
      relationsIndex.set(key, existing);
    }

    this.relationsIndexCache = { data: relationsIndex, timestamp: Date.now() };
    return relationsIndex;
  }

  getCrossReferences(itemId: string, itemType: string): CrossReferenceResult | null {
    const indexMap = this.getIndexMap();
    const item = indexMap.get(`${itemType}-${itemId}`);

    if (!item) return null;

    const relationsIndex = this.getRelationsIndex();
    const references: CrossReferenceResult['references'] = [];
    const referencedBy: CrossReferenceResult['referencedBy'] = [];

    const outgoing = relationsIndex.get(`${itemType}-${itemId}`) || [];
    for (const rel of outgoing) {
      const target = indexMap.get(`${rel.targetType}-${rel.targetId}`);
      if (target) {
        references.push({
          itemId: rel.targetId,
          itemType: rel.targetType,
          itemName: target.name,
          relationType: rel.relationType,
        });
      }
    }

    for (const [key, rels] of relationsIndex) {
      for (const rel of rels) {
        if (rel.targetType === itemType && rel.targetId === itemId) {
          const source = indexMap.get(key);
          if (source) {
            referencedBy.push({
              itemId: source.id,
              itemType: source.type,
              itemName: source.name,
              relationType: rel.relationType,
            });
          }
        }
      }
    }

    return { item, references, referencedBy };
  }

  validateDataIntegrity(): DataIntegrityResult {
    const errors: DataIntegrityError[] = [];
    const warnings: DataIntegrityWarning[] = [];
    const indexMap = this.getIndexMap();
    const relations = this.getAllRelations();
    const seenIds = new Set<string>();

    for (const project of this.projects) {
      const key = `project-${project.id}`;
      if (seenIds.has(key)) {
        errors.push({
          type: 'duplicate',
          entityType: 'project',
          entityId: project.id,
          message: `项目 ${project.name} 存在重复 ID`,
        });
      }
      seenIds.add(key);

      if (!project.name?.trim()) {
        errors.push({
          type: 'invalid_reference' as any,
          entityType: 'project',
          entityId: project.id,
          message: '项目名称不能为空',
        });
      }
    }

    for (const relation of relations) {
      const sourceKey = `${relation.sourceType}-${relation.sourceId}`;
      const targetKey = `${relation.targetType}-${relation.targetId}`;

      if (!indexMap.has(sourceKey) && relation.sourceType !== 'designFile') {
        errors.push({
          type: 'invalid_reference',
          entityType: relation.targetType,
          entityId: relation.targetId,
          message: `关系引用了不存在的源实体: ${sourceKey}`,
          relatedEntities: [{ type: relation.sourceType, id: relation.sourceId }],
        });
      }
    }

    const circularDeps = this.findCircularDependencies();
    for (const dep of circularDeps) {
      errors.push({
        type: 'circular_dependency',
        entityType: 'module',
        entityId: dep.moduleId,
        message: `模块 ${dep.moduleName} 存在循环依赖: ${dep.path.join(' -> ')}`,
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  findCircularDependencies(): Array<{ moduleId: string; moduleName: string; path: string[] }> {
    const circularDeps: Array<{ moduleId: string; moduleName: string; path: string[] }> = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const moduleMap = new Map<string, { name: string; dependencies: string[] }>();

    for (const project of this.projects) {
      for (const module of project.modules || []) {
        moduleMap.set(module.id, {
          name: module.moduleName,
          dependencies: (module as any).dependencies || [],
        });
      }
    }

    function dfs(moduleId: string, path: string[]): boolean {
      visited.add(moduleId);
      recursionStack.add(moduleId);

      const module = moduleMap.get(moduleId);
      if (!module) return false;

      for (const depId of module.dependencies) {
        if (!visited.has(depId)) {
          if (dfs(depId, [...path, module.name])) {
            return true;
          }
        } else if (recursionStack.has(depId)) {
          circularDeps.push({
            moduleId,
            moduleName: module.name,
            path: [...path, module.name],
          });
          return true;
        }
      }

      recursionStack.delete(moduleId);
      return false;
    }

    for (const moduleId of moduleMap.keys()) {
      if (!visited.has(moduleId)) {
        dfs(moduleId, []);
      }
    }

    return circularDeps;
  }

  getRelationsBySource(sourceType: string, sourceId: string): DataRelation[] {
    const relationsIndex = this.getRelationsIndex();
    return relationsIndex.get(`${sourceType}-${sourceId}`) || [];
  }

  getRelationsByTarget(targetType: string, targetId: string): DataRelation[] {
    const relations = this.getAllRelations();
    return relations.filter(r => r.targetType === targetType && r.targetId === targetId);
  }

  getStats(): {
    totalProjects: number;
    totalModules: number;
    totalComponents: number;
    totalRelations: number;
    totalDocuments: number;
    totalSoftware: number;
  } {
    let totalModules = 0;
    let totalComponents = 0;

    for (const project of this.projects) {
      totalModules += project.modules?.length || 0;
      for (const module of project.modules || []) {
        totalComponents += module.components?.length || 0;
      }
    }

    return {
      totalProjects: this.projects.length,
      totalModules,
      totalComponents,
      totalRelations: this.getAllRelations().length,
      totalDocuments: this.projects.reduce((sum, p) => sum + (p.documents?.length || 0), 0),
      totalSoftware: this.projects.reduce((sum, p) => sum + (p.software?.length || 0), 0),
    };
  }

  dispose(): void {
    this.projects = [];
    this.tasks = [];
    this.borrowRecords = [];
    this.invalidateAllCaches();
  }
}

export const dataRelationService = new DataRelationService();
export default dataRelationService;
