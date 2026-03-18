import type { SearchResult, SearchHistory } from '../types/search';
import type { Project, Task } from '../types';

const SEARCH_HISTORY_KEY = 'search_history';
const MAX_HISTORY = 10;

export function searchAll(
  query: string,
  projects: Project[],
  tasks: Task[]
): SearchResult[] {
  if (!query.trim()) return [];

  const results: SearchResult[] = [];
  const lowerQuery = query.toLowerCase();

  projects.forEach((project) => {
    if (project.name.toLowerCase().includes(lowerQuery) || 
        project.projectNumber.toLowerCase().includes(lowerQuery)) {
      results.push({
        id: project.id,
        type: 'project',
        title: project.name,
        subtitle: `项目编号: ${project.projectNumber}`,
        path: `/projects/${project.id}`,
        score: calculateScore(query, project.name, project.projectNumber),
      });
    }

    project.modules.forEach((module) => {
      if (module.moduleName.toLowerCase().includes(lowerQuery) ||
          module.moduleNumber.toLowerCase().includes(lowerQuery)) {
        results.push({
          id: module.id,
          type: 'module',
          title: module.moduleName,
          subtitle: `模块编号: ${module.moduleNumber} | 种类: ${module.category}`,
          path: `/modules/${module.id}`,
          score: calculateScore(query, module.moduleName, module.moduleNumber),
        });
      }

      module.components.forEach((component) => {
        if (component.componentName.toLowerCase().includes(lowerQuery) ||
            component.componentNumber.toLowerCase().includes(lowerQuery)) {
          results.push({
            id: component.id,
            type: 'component',
            title: component.componentName,
            subtitle: `组件编号: ${component.componentNumber}`,
            path: `/components/${component.id}`,
            score: calculateScore(query, component.componentName, component.componentNumber),
          });
        }
      });
    });

    project.documents.forEach((doc) => {
      if (doc.name.toLowerCase().includes(lowerQuery)) {
        results.push({
          id: doc.id,
          type: 'document',
          title: doc.name,
          subtitle: `类型: ${doc.type} | 阶段: ${doc.stage}`,
          path: `/projects/${project.id}/files`,
          score: calculateScore(query, doc.name),
        });
      }
    });

    project.software.forEach((soft) => {
      if (soft.name.toLowerCase().includes(lowerQuery)) {
        results.push({
          id: soft.id,
          type: 'software',
          title: soft.name,
          subtitle: `版本: ${soft.version} | 阶段: ${soft.stage}`,
          path: `/projects/${project.id}/files`,
          score: calculateScore(query, soft.name),
        });
      }
    });
  });

  tasks.forEach((task) => {
    if (task.title.toLowerCase().includes(lowerQuery)) {
      results.push({
        id: task.id,
        type: 'task',
        title: task.title,
        subtitle: `状态: ${task.status} | 优先级: ${task.priority}`,
        path: '/tasks',
        score: calculateScore(query, task.title),
      });
    }
  });

  return results.sort((a, b) => b.score - a.score);
}

function calculateScore(query: string, ...fields: string[]): number {
  const lowerQuery = query.toLowerCase();
  let score = 0;

  fields.forEach((field) => {
    const lowerField = field.toLowerCase();
    if (lowerField === lowerQuery) {
      score += 100;
    } else if (lowerField.startsWith(lowerQuery)) {
      score += 80;
    } else if (lowerField.includes(lowerQuery)) {
      score += 50;
    }
  });

  return score;
}

export function getSearchHistory(): SearchHistory[] {
  const data = localStorage.getItem(SEARCH_HISTORY_KEY);
  return data ? JSON.parse(data) : [];
}

export function addSearchHistory(query: string): void {
  if (!query.trim()) return;

  let history = getSearchHistory();
  history = history.filter((h) => h.query !== query);
  history.unshift({ query, timestamp: new Date().toISOString() });
  
  if (history.length > MAX_HISTORY) {
    history = history.slice(0, MAX_HISTORY);
  }

  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
}

export function clearSearchHistory(): void {
  localStorage.removeItem(SEARCH_HISTORY_KEY);
}
