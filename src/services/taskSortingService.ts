import type { Task, UrgencyLevel, SortingConfig, TaskSortInfo, CachedSortingResult } from '../types/taskSorting';

const DEFAULT_URGENCY_CONFIG: Record<UrgencyLevel, number> = {
  '极高': 100,
  '高': 75,
  '中': 50,
  '低': 25,
};

const DEFAULT_TIME_DECAY_FACTOR = 0.001;

const PRIORITY_TO_URGENCY: Record<Task['priority'], UrgencyLevel> = {
  '紧急': '极高',
  '高': '高',
  '中': '中',
  '低': '低',
};

export class TaskSortingService {
  private config: SortingConfig;
  private cache: Map<string, CachedSortingResult>;
  private cacheTimeout: number;

  constructor(config?: Partial<SortingConfig>, cacheTimeout: number = 30000) {
    this.config = {
      urgencyWeights: { ...DEFAULT_URGENCY_CONFIG, ...config?.urgencyWeights },
      timeDecayFactor: config?.timeDecayFactor ?? DEFAULT_TIME_DECAY_FACTOR,
    };
    this.cache = new Map();
    this.cacheTimeout = cacheTimeout;
  }

  updateConfig(newConfig: Partial<SortingConfig>): void {
    this.config = {
      urgencyWeights: { ...this.config.urgencyWeights, ...newConfig.urgencyWeights },
      timeDecayFactor: newConfig.timeDecayFactor ?? this.config.timeDecayFactor,
    };
    this.invalidateCache();
  }

  getConfig(): SortingConfig {
    return { ...this.config };
  }

  getUrgencyWeight(level: UrgencyLevel): number {
    return this.config.urgencyWeights[level];
  }

  private calculateConfigHash(): string {
    return JSON.stringify(this.config);
  }

  private getCacheKey(tasks: Task[]): string {
    const taskIds = tasks.map(t => t.id).join(',');
    const taskTimestamps = tasks.map(t => t.dueDate || '').join(',');
    return `${taskIds}-${taskTimestamps}-${this.calculateConfigHash()}`;
  }

  private getFromCache(cacheKey: string): TaskSortInfo[] | null {
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.tasks;
    }
    this.cache.delete(cacheKey);
    return null;
  }

  private setCache(cacheKey: string, tasks: TaskSortInfo[]): void {
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(cacheKey, {
      tasks,
      timestamp: Date.now(),
      configHash: this.calculateConfigHash(),
    });
  }

  invalidateCache(): void {
    this.cache.clear();
  }

  calculateTimeScore(dueDate: string | undefined): number {
    if (!dueDate) return 0;

    const now = Date.now();
    const due = new Date(dueDate).getTime();
    const hoursUntilDue = (due - now) / (1000 * 60 * 60);

    if (hoursUntilDue < 0) {
      return -Math.abs(hoursUntilDue) * this.config.timeDecayFactor * 100;
    }

    return Math.exp(-this.config.timeDecayFactor * Math.max(0, hoursUntilDue)) * 100;
  }

  calculateUrgencyScore(priority: Task['priority']): number {
    const urgencyLevel = PRIORITY_TO_URGENCY[priority];
    return this.config.urgencyWeights[urgencyLevel];
  }

  calculateCombinedScore(urgencyScore: number, timeScore: number): number {
    return urgencyScore * 0.7 + timeScore * 0.3;
  }

  sortTasks(tasks: Task[], forceRefresh: boolean = false): TaskSortInfo[] {
    const cacheKey = this.getCacheKey(tasks);

    if (!forceRefresh) {
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;
    }

    const sortInfos: TaskSortInfo[] = tasks
      .filter(task => task.status !== '已完成')
      .map(task => {
        const urgencyScore = this.calculateUrgencyScore(task.priority);
        const timeScore = this.calculateTimeScore(task.dueDate);
        const combinedScore = this.calculateCombinedScore(urgencyScore, timeScore);

        return {
          taskId: task.id,
          urgencyScore,
          timeScore,
          combinedScore,
          sortRank: 0,
        };
      })
      .sort((a, b) => {
        if (b.combinedScore !== a.combinedScore) {
          return b.combinedScore - a.combinedScore;
        }
        if (b.urgencyScore !== a.urgencyScore) {
          return b.urgencyScore - a.urgencyScore;
        }
        return b.timeScore - a.timeScore;
      })
      .map((info, index) => ({ ...info, sortRank: index + 1 }));

    this.setCache(cacheKey, sortInfos);
    return sortInfos;
  }

  getSortedTaskIds(tasks: Task[], forceRefresh: boolean = false): string[] {
    const sortInfos = this.sortTasks(tasks, forceRefresh);
    return sortInfos.map(info => info.taskId);
  }

  getTasksWithSortingInfo(tasks: Task[], forceRefresh: boolean = false): Array<{ task: Task; sortInfo: TaskSortInfo }> {
    const sortInfos = this.sortTasks(tasks, forceRefresh);
    const sortInfoMap = new Map(sortInfos.map(info => [info.taskId, info]));

    return tasks
      .map(task => ({
        task,
        sortInfo: sortInfoMap.get(task.id) || {
          taskId: task.id,
          urgencyScore: this.calculateUrgencyScore(task.priority),
          timeScore: this.calculateTimeScore(task.dueDate),
          combinedScore: this.calculateCombinedScore(
            this.calculateUrgencyScore(task.priority),
            this.calculateTimeScore(task.dueDate)
          ),
          sortRank: tasks.length,
        },
      }))
      .sort((a, b) => a.sortInfo.sortRank - b.sortInfo.sortRank);
  }

  getGroupedByUrgency(tasks: Task[], forceRefresh: boolean = false): Map<UrgencyLevel, Array<{ task: Task; sortInfo: TaskSortInfo }>> {
    const sortedTasks = this.getTasksWithSortingInfo(tasks, forceRefresh);
    const grouped = new Map<UrgencyLevel, Array<{ task: Task; sortInfo: TaskSortInfo }>>();

    sortedTasks.forEach(({ task, sortInfo }) => {
      const urgency = PRIORITY_TO_URGENCY[task.priority];
      if (!grouped.has(urgency)) {
        grouped.set(urgency, []);
      }
      grouped.get(urgency)!.push({ task, sortInfo });
    });

    return grouped;
  }

  static getUrgencyLabel(priority: Task['priority']): UrgencyLevel {
    return PRIORITY_TO_URGENCY[priority];
  }

  static compareTasks(a: Task, b: Task, config?: Partial<SortingConfig>): number {
    const service = new TaskSortingService(config);
    const aScore = service.calculateCombinedScore(
      service.calculateUrgencyScore(a.priority),
      service.calculateTimeScore(a.dueDate)
    );
    const bScore = service.calculateCombinedScore(
      service.calculateUrgencyScore(b.priority),
      service.calculateTimeScore(b.dueDate)
    );
    return bScore - aScore;
  }
}

export const taskSortingService = new TaskSortingService();

export function createSortingService(config?: Partial<SortingConfig>): TaskSortingService {
  return new TaskSortingService(config);
}
