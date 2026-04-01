import type { ComputeTask, ComputeResult, AggregatePayload, SortPayload, FilterPayload, IndexPayload } from '../workers/computeWorker';
import { shouldUseWorker } from '../hooks/useComputeWorker';

export interface ComputeServiceOptions {
  useWorker?: boolean;
}

export interface AggregateResult {
  [group: string]: number;
}

export interface SortOptions<T> {
  field: keyof T;
  direction?: 'asc' | 'desc';
}

export class ComputeService {
  private executeTask: <T>(task: ComputeTask<T>) => Promise<ComputeResult<T>>;
  private useWorkerByDefault: boolean;

  constructor(
    executeTask: <T>(task: ComputeTask<T>) => Promise<ComputeResult<T>>,
    options: ComputeServiceOptions = {}
  ) {
    this.executeTask = executeTask;
    this.useWorkerByDefault = options.useWorker ?? true;
  }

  async sort<T>(data: T[], options: SortOptions<T>, useWorker?: boolean): Promise<T[]> {
    const shouldUse = useWorker ?? this.useWorkerByDefault;

    if (shouldUse && shouldUseWorker('sort', data.length)) {
      const task: ComputeTask<SortPayload<T>> = {
        id: `sort_${Date.now()}`,
        type: 'sort',
        payload: { data, field: options.field, direction: options.direction },
      };

      const result = await this.executeTask(task);
      if (result.success && result.data) {
        return result.data as unknown as T[];
      }
    }

    return [...data].sort((a, b) => {
      const aVal = a[options.field];
      const bVal = b[options.field];
      if (aVal === bVal) return 0;
      const comparison = aVal < bVal ? -1 : 1;
      return options.direction === 'desc' ? -comparison : comparison;
    });
  }

  async filter<T>(data: T[], predicate: (item: T) => boolean, useWorker?: boolean): Promise<T[]> {
    const shouldUse = useWorker ?? this.useWorkerByDefault;

    if (shouldUse && shouldUseWorker('filter', data.length)) {
      const task: ComputeTask<FilterPayload<T>> = {
        id: `filter_${Date.now()}`,
        type: 'filter',
        payload: { data, predicate },
      };

      const result = await this.executeTask(task);
      if (result.success && result.data) {
        return result.data as unknown as T[];
      }
    }

    return data.filter(predicate);
  }

  async aggregate<T>(
    data: T[],
    groupBy: keyof T,
    aggregateFn: 'count' | 'sum' | 'avg' | 'min' | 'max',
    valueField?: keyof T,
    useWorker?: boolean
  ): Promise<AggregateResult> {
    const shouldUse = useWorker ?? this.useWorkerByDefault;

    if (shouldUse && shouldUseWorker('aggregate', data.length)) {
      const task: ComputeTask<AggregatePayload<T>> = {
        id: `aggregate_${Date.now()}`,
        type: 'aggregate',
        payload: { data, groupBy, aggregateFn, valueField },
      };

      const result = await this.executeTask(task);
      if (result.success && result.data) {
        return result.data as unknown as AggregateResult;
      }
    }

    const groups = new Map<string, T[]>();
    for (const item of data) {
      const key = String(item[groupBy]);
      const group = groups.get(key) || [];
      group.push(item);
      groups.set(key, group);
    }

    const result: AggregateResult = {};
    for (const [key, items] of groups) {
      switch (aggregateFn) {
        case 'count':
          result[key] = items.length;
          break;
        case 'sum':
          if (valueField !== undefined) {
            result[key] = items.reduce((sum, item) => sum + (Number(item[valueField]) || 0), 0);
          }
          break;
        case 'avg':
          if (valueField !== undefined) {
            const sum = items.reduce((s, item) => s + (Number(item[valueField]) || 0), 0);
            result[key] = sum / items.length;
          }
          break;
        case 'min':
          if (valueField !== undefined) {
            result[key] = Math.min(...items.map(item => Number(item[valueField]) || 0));
          }
          break;
        case 'max':
          if (valueField !== undefined) {
            result[key] = Math.max(...items.map(item => Number(item[valueField]) || 0));
          }
          break;
      }
    }

    return result;
  }

  async buildIndex<T>(data: T[], keyField: keyof T, useWorker?: boolean): Promise<Map<string, T[]>> {
    const shouldUse = useWorker ?? this.useWorkerByDefault;

    if (shouldUse && shouldUseWorker('index', data.length)) {
      const task: ComputeTask<IndexPayload<T>> = {
        id: `index_${Date.now()}`,
        type: 'index',
        payload: { data, keyField },
      };

      const result = await this.executeTask(task);
      if (result.success && result.data) {
        const entries = result.data as unknown as Record<string, T[]>;
        return new Map(Object.entries(entries));
      }
    }

    const index = new Map<string, T[]>();
    for (const item of data) {
      const key = String(item[keyField]);
      const existing = index.get(key) || [];
      existing.push(item);
      index.set(key, existing);
    }

    return index;
  }
}

let computeServiceInstance: ComputeService | null = null;

export function initComputeService(
  executeTask: <T>(task: ComputeTask<T>) => Promise<ComputeResult<T>>,
  options?: ComputeServiceOptions
): ComputeService {
  computeServiceInstance = new ComputeService(executeTask, options);
  return computeServiceInstance;
}

export function getComputeService(): ComputeService | null {
  return computeServiceInstance;
}
