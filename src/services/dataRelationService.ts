import type {
  Project,
  Task,
  BorrowRecord,
} from '../types';
import { logger } from '../utils/logger';

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

class LRUCache<K, V> {
  private cache: Map<K, V>;
  private readonly maxSize: number;

  constructor(maxSize: number = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined;

    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }

  keys(): IterableIterator<K> {
    return this.cache.keys();
  }

  values(): IterableIterator<V> {
    return this.cache.values();
  }
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  version: number;
}

const CACHE_TTL_MS = 300000; // 5 minutes (increased from 30s)
const MAX_CACHE_SIZE = 50;

type EntityType = 'project' | 'module' | 'component' | 'system' | 'document' | 'software' | 'designFile';

export class DataRelationService {
  private projects: Project[] = [];
  private tasks: Task[] = [];
  private borrowRecords: BorrowRecord[] = [];

  // Caches with LRU eviction
  private relationsCache: CacheEntry<DataRelation[]> | null = null;
  private unifiedDataCache: CacheEntry<UnifiedDataItem[]> | null = null;

  // Index caches with LRU
  private indexCache: LRUCache<string, CacheEntry<Map<string, UnifiedDataItem>>> = new LRUCache(MAX_CACHE_SIZE);
  private relationsIndexCache: LRUCache<string, CacheEntry<Map<string, DataRelation[]>>> = new LRUCache(MAX_CACHE_SIZE);
  private reverseRelationsIndexCache: LRUCache<string, CacheEntry<Map<string, DataRelation[]>>> = new LRUCache(MAX_CACHE_SIZE);

  // Dirty tracking for incremental updates
  private dataVersion: number = 0;
  private dirtyFlags: Set<EntityType> = new Set();
  private lastFullBuildVersion: number = 0;

  async initialize(
    projects: Project[],
    tasks: Task[],
    borrowRecords: BorrowRecord[]
  ): Promise<void> {
    this.projects = projects || [];
    this.tasks = tasks || [];
    this.borrowRecords = borrowRecords || [];
    this.dataVersion++;
    this.markAllDirty();
    this.invalidateAllCaches();
    
    logger.log('[DataRelationService] Initialized with:', {
      projects: this.projects.length,
      tasks: this.tasks.length,
      borrowRecords: this.borrowRecords.length,
    });
  }

  updateProjects(projects: Project[]): void {
    this.projects = projects || [];
    this.dataVersion++;
    this.markAllDirty();
  }

  updateTasks(tasks: Task[]): void {
    this.tasks = tasks || [];
    this.dataVersion++;
    this.dirtyFlags.add('project'); // Tasks relate to projects
  }

  updateBorrowRecords(records: BorrowRecord[]): void {
    this.borrowRecords = records || [];
    this.dataVersion++;
    this.dirtyFlags.add('component');
    this.dirtyFlags.add('project');
  }

  private markAllDirty(): void {
    this.dirtyFlags = new Set(['project', 'module', 'component', 'system', 'document', 'software', 'designFile']);
  }


  private invalidateAllCaches(): void {
    this.relationsCache = null;
    this.unifiedDataCache = null;
    this.indexCache.clear();
    this.relationsIndexCache.clear();
    this.reverseRelationsIndexCache.clear();
  }

  private isCacheValid<T>(cache: CacheEntry<T> | null): boolean {
    if (!cache) return false;
    if (Date.now() - cache.timestamp > CACHE_TTL_MS) return false;
    return cache.version === this.dataVersion;
  }

  private shouldRebuild(): boolean {
    return this.dataVersion > this.lastFullBuildVersion || this.dirtyFlags.size > 0;
  }

  private buildProjectRelations(project: Project): DataRelation[] {
    const relations: DataRelation[] = [];

    // Self-relation
    relations.push({
      sourceType: 'project',
      sourceId: project.id,
      targetType: 'project',
      targetId: project.id,
      relationType: 'owns',
      metadata: { name: project.name },
    });

    // Systems
    for (const system of project.systems || []) {
      relations.push({
        sourceType: 'project',
        sourceId: project.id,
        targetType: 'system',
        targetId: system.id,
        relationType: 'contains',
        metadata: { name: system.systemName },
      });
    }

    // Modules (with or without systems)
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

      // Components
      for (const component of module.components || []) {
        relations.push({
          sourceType: 'module',
          sourceId: module.id,
          targetType: 'component',
          targetId: component.id,
          relationType: 'contains',
          metadata: { name: component.componentName },
        });

        // Software dependencies
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

        // Design files references
        for (const df of component.designFiles || []) {
          const dfId = typeof df === 'string' ? df : df.id;
          relations.push({
            sourceType: 'component',
            sourceId: component.id,
            targetType: 'designFile',
            targetId: dfId,
            relationType: 'references',
          });
        }
      }

      // Module design files
      for (const df of module.designFiles || []) {
        const dfId = typeof df === 'string' ? df : df.id;
        relations.push({
          sourceType: 'module',
          sourceId: module.id,
          targetType: 'designFile',
          targetId: dfId,
          relationType: 'references',
        });
      }
    }

    // System -> Module relations
    for (const system of project.systems || []) {
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

    // Documents
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

    // Software
    for (const software of project.software || []) {
      relations.push({
        sourceType: 'project',
        sourceId: project.id,
        targetType: 'software',
        targetId: software.id,
        relationType: 'contains',
        metadata: { name: software.name, version: software.version },
      });

      // Adapted components
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

    // Design files with ownership and belonging
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

    return relations;
  }

  getAllRelations(): DataRelation[] {
    if (this.isCacheValid(this.relationsCache)) {
      return this.relationsCache!.data;
    }

    // Build incrementally if possible
    let relations: DataRelation[];

    if (!this.shouldRebuild() && this.relationsCache) {
      relations = this.relationsCache.data;
    } else {
      // Full rebuild needed
      relations = [];
      for (const project of this.projects) {
        relations.push(...this.buildProjectRelations(project));
      }

      this.relationsCache = {
        data: relations,
        timestamp: Date.now(),
        version: this.dataVersion,
      };
      this.lastFullBuildVersion = this.dataVersion;
      this.dirtyFlags.clear();
    }

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
        category: (project as unknown as Record<string, unknown>).category as string | undefined,
        status: (project as unknown as Record<string, unknown>).status as string | undefined,
        createdAt: (project as unknown as Record<string, unknown>).createdAt as string || '',
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
          createdAt: system.createdAt || new Date().toISOString(),
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
          category: (module as unknown as Record<string, unknown>).category as string | undefined,
          status: module.status,
          createdAt: (module as unknown as Record<string, unknown>).createdAt as string || '',
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
          createdAt: (component as unknown as Record<string, unknown>).createdAt as string || '',
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

    this.unifiedDataCache = {
      data: items,
      timestamp: Date.now(),
      version: this.dataVersion,
    };

    return items;
  }

  getIndexMap(): Map<string, UnifiedDataItem> {
    const cacheKey = 'global';

    const cached = this.indexCache.get(cacheKey);
    if (cached && this.isCacheValid(cached)) {
      return cached.data;
    }

    const indexMap = new Map<string, UnifiedDataItem>();
    const items = this.getUnifiedData();

    for (const item of items) {
      indexMap.set(`${item.type}-${item.id}`, item);
    }

    const entry: CacheEntry<Map<string, UnifiedDataItem>> = {
      data: indexMap,
      timestamp: Date.now(),
      version: this.dataVersion,
    };

    this.indexCache.set(cacheKey, entry);

    return indexMap;
  }

  getRelationsIndex(): Map<string, DataRelation[]> {
    const cacheKey = 'forward';

    const cached = this.relationsIndexCache.get(cacheKey);
    if (cached && this.isCacheValid(cached)) {
      return cached.data;
    }

    const relationsIndex = new Map<string, DataRelation[]>();
    const relations = this.getAllRelations();

    for (const rel of relations) {
      const key = `${rel.sourceType}-${rel.sourceId}`;
      const existing = relationsIndex.get(key);
      if (existing) {
        existing.push(rel);
      } else {
        relationsIndex.set(key, [rel]);
      }
    }

    const entry: CacheEntry<Map<string, DataRelation[]>> = {
      data: relationsIndex,
      timestamp: Date.now(),
      version: this.dataVersion,
    };

    this.relationsIndexCache.set(cacheKey, entry);

    return relationsIndex;
  }

  getReverseRelationsIndex(): Map<string, DataRelation[]> {
    const cacheKey = 'reverse';

    const cached = this.reverseRelationsIndexCache.get(cacheKey);
    if (cached && this.isCacheValid(cached)) {
      return cached.data;
    }

    const reverseIndex = new Map<string, DataRelation[]>();
    const relations = this.getAllRelations();

    for (const rel of relations) {
      const key = `${rel.targetType}-${rel.targetId}`;
      const existing = reverseIndex.get(key);
      if (existing) {
        existing.push(rel);
      } else {
        reverseIndex.set(key, [rel]);
      }
    }

    const entry: CacheEntry<Map<string, DataRelation[]>> = {
      data: reverseIndex,
      timestamp: Date.now(),
      version: this.dataVersion,
    };

    this.reverseRelationsIndexCache.set(cacheKey, entry);

    return reverseIndex;
  }

  getCrossReferences(itemId: string, itemType: string): CrossReferenceResult | null {
    const indexMap = this.getIndexMap();
    const item = indexMap.get(`${itemType}-${itemId}`);

    if (!item) return null;

    const relationsIndex = this.getRelationsIndex();
    const reverseIndex = this.getReverseRelationsIndex();

    const references: CrossReferenceResult['references'] = [];
    const referencedBy: CrossReferenceResult['referencedBy'] = [];

    // Outgoing relations (using forward index)
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

    // Incoming relations (using reverse index - O(1) lookup instead of O(n))
    const incoming = reverseIndex.get(`${itemType}-${itemId}`) || [];
    for (const rel of incoming) {
      const source = indexMap.get(`${rel.sourceType}-${rel.sourceId}`);
      if (source) {
        referencedBy.push({
          itemId: source.id,
          itemType: rel.sourceType,
          itemName: source.name,
          relationType: rel.relationType,
        });
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
          type: 'invalid_reference',
          entityType: 'project',
          entityId: project.id,
          message: '项目名称不能为空',
        });
      }
    }

    for (const relation of relations) {
      const sourceKey = `${relation.sourceType}-${relation.sourceId}`;

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
        dependencies: ((module as unknown as Record<string, unknown>).dependencies as string[]) || [],
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
    // Use reverse index for O(1) lookup instead of O(n) filter
    const reverseIndex = this.getReverseRelationsIndex();
    return reverseIndex.get(`${targetType}-${targetId}`) || [];
  }

  getStats(): {
    totalProjects: number;
    totalModules: number;
    totalComponents: number;
    totalRelations: number;
    totalDocuments: number;
    totalSoftware: number;
    cacheSize: number;
    cacheHitRate?: number;
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
      cacheSize: this.indexCache.size + this.relationsIndexCache.size + this.reverseRelationsIndexCache.size,
    };
  }

  clearCaches(): void {
    this.invalidateAllCaches();
  }

  dispose(): void {
    this.projects = [];
    this.tasks = [];
    this.borrowRecords = [];
    this.invalidateAllCaches();
    this.dataVersion = 0;
    this.dirtyFlags.clear();
    this.lastFullBuildVersion = 0;
  }
}

export const dataRelationService = new DataRelationService();
export default dataRelationService;
