import type { SearchResult } from '../types/search';
import type { Project, Task } from '../types';
import type { ComputeTask } from '../workers/computeWorker';
import { shouldUseWorker } from '../hooks/useComputeWorker';
import { searchAll, invalidateSearchCache } from './searchService';

export interface SearchServiceWithWorkerOptions {
  useWorker?: boolean;
  threshold?: number;
}

interface SearchableItem {
  id: string;
  type: 'project' | 'module' | 'component' | 'document' | 'software' | 'task';
  title: string;
  subtitle?: string;
  path: string;
}

function buildSearchableItems(projects: Project[], tasks: Task[]): SearchableItem[] {
  const items: SearchableItem[] = [];

  for (const project of projects) {
    items.push({
      id: project.id,
      type: 'project',
      title: project.name,
      subtitle: `项目编号: ${project.projectNumber}`,
      path: `/projects/${project.id}`,
    });

    for (const module of project.modules) {
      items.push({
        id: module.id,
        type: 'module',
        title: module.moduleName,
        subtitle: `模块编号: ${module.moduleNumber} | 种类: ${module.category}`,
        path: `/modules/${module.id}`,
      });

      for (const component of module.components) {
        items.push({
          id: component.id,
          type: 'component',
          title: component.componentName,
          subtitle: `组件编号: ${component.componentNumber}`,
          path: `/components/${component.id}`,
        });
      }
    }

    for (const doc of project.documents) {
      items.push({
        id: doc.id,
        type: 'document',
        title: doc.name,
        subtitle: `类型: ${doc.type} | 阶段: ${doc.stage}`,
        path: `/projects/${project.id}`,
      });
    }

    for (const sw of project.software) {
      items.push({
        id: sw.id,
        type: 'software',
        title: sw.name,
        subtitle: `版本: ${sw.version} | 阶段: ${sw.stage}`,
        path: `/projects/${project.id}`,
      });
    }
  }

  for (const task of tasks) {
    items.push({
      id: task.id,
      type: 'task',
      title: task.title,
      subtitle: `状态: ${task.status} | 优先级: ${task.priority}`,
      path: '/tasks',
    });
  }

  return items;
}

export async function searchWithWorker(
  query: string,
  projects: Project[],
  tasks: Task[],
  executeWorker: <T>(task: ComputeTask<T>) => Promise<unknown>,
  options: SearchServiceWithWorkerOptions = {}
): Promise<SearchResult[]> {
  if (!query.trim()) return [];

  const { useWorker = true } = options;
  const items = buildSearchableItems(projects, tasks);

  if (useWorker && shouldUseWorker('search', items.length)) {
    const task: ComputeTask<{ query: string; data: SearchableItem[] }> = {
      id: `search_${Date.now()}`,
      type: 'search',
      payload: { query, data: items },
    };

    try {
      const result = await executeWorker(task);
      if (result && typeof result === 'object' && 'data' in result) {
        const workerResults = result.data as Array<{ id: string; type: string; title: string; score: number }>;

        const itemMap = new Map(items.map(item => [`${item.type}-${item.id}`, item]));

        return workerResults.map(r => {
          const item = itemMap.get(`${r.type}-${r.id}`);
          return {
            id: r.id,
            type: r.type as SearchResult['type'],
            title: r.title,
            subtitle: item?.subtitle,
            path: item?.path || '',
            score: r.score,
          };
        });
      }
    } catch (error) {
      console.warn('Worker search failed, falling back to main thread:', error);
    }
  }

  return searchAll(query, projects, tasks);
}

export function useSearchServiceWithWorker() {
  return {
    search: searchWithWorker,
    invalidateCache: invalidateSearchCache,
  };
}
