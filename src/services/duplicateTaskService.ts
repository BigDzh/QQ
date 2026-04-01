import type {
  Task,
  DuplicateRule,
  DuplicateGroup,
  DuplicateTaskInfo,
  DeletionHistory,
  DeletionResult,
  TaskSnapshot,
  TrashTask,
  DeletionConfig,
  DuplicateMatchField,
} from '../types/duplicateTask';
import { DEFAULT_DUPLICATE_RULE, DEFAULT_DELETION_CONFIG } from '../types/duplicateTask';

export class DuplicateTaskService {
  private rules: DuplicateRule[] = [];
  private trash: TrashTask[] = [];
  private deletionHistory: DeletionHistory[] = [];
  private config: DeletionConfig;
  private listeners: Set<() => void> = new Set();
  private cachedTasks: Task[] = [];

  constructor() {
    this.loadFromStorage();
    this.config = { ...DEFAULT_DELETION_CONFIG };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private loadFromStorage(): void {
    try {
      const rulesJson = localStorage.getItem('duplicate-task-rules');
      const trashJson = localStorage.getItem('duplicate-task-trash');
      const historyJson = localStorage.getItem('duplicate-task-history');
      const configJson = localStorage.getItem('duplicate-task-config');

      if (rulesJson) this.rules = JSON.parse(rulesJson);
      if (trashJson) this.trash = JSON.parse(trashJson);
      if (historyJson) this.deletionHistory = JSON.parse(historyJson);
      if (configJson) this.config = JSON.parse(configJson);
    } catch (e) {
      console.warn('Failed to load duplicate task data from storage:', e);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem('duplicate-task-rules', JSON.stringify(this.rules));
      localStorage.setItem('duplicate-task-trash', JSON.stringify(this.trash));
      localStorage.setItem('duplicate-task-history', JSON.stringify(this.deletionHistory));
      localStorage.setItem('duplicate-task-config', JSON.stringify(this.config));
    } catch (e) {
      console.warn('Failed to save duplicate task data to storage:', e);
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(listener => listener());
  }

  updateTaskCache(tasks: Task[]): void {
    this.cachedTasks = tasks;
  }

  getRules(): DuplicateRule[] {
    return [...this.rules];
  }

  getRule(id: string): DuplicateRule | undefined {
    return this.rules.find(r => r.id === id);
  }

  createRule(partial: Partial<DuplicateRule> = {}): DuplicateRule {
    const rule: DuplicateRule = {
      ...DEFAULT_DUPLICATE_RULE,
      ...partial,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.rules.push(rule);
    this.saveToStorage();
    this.notify();
    return rule;
  }

  updateRule(id: string, updates: Partial<DuplicateRule>): DuplicateRule | null {
    const index = this.rules.findIndex(r => r.id === id);
    if (index === -1) return null;

    this.rules[index] = {
      ...this.rules[index],
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };
    this.saveToStorage();
    this.notify();
    return this.rules[index];
  }

  deleteRule(id: string): boolean {
    const index = this.rules.findIndex(r => r.id === id);
    if (index === -1) return false;

    this.rules.splice(index, 1);
    this.saveToStorage();
    this.notify();
    return true;
  }

  toggleRule(id: string): boolean {
    const rule = this.rules.find(r => r.id === id);
    if (!rule) return false;

    rule.enabled = !rule.enabled;
    rule.updatedAt = new Date().toISOString();
    this.saveToStorage();
    this.notify();
    return true;
  }

  getConfig(): DeletionConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<DeletionConfig>): void {
    this.config = { ...this.config, ...updates };
    this.saveToStorage();
    this.notify();
  }

  private normalizeString(str: string): string {
    return str.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  checkDuplicate(task: Omit<Task, 'id' | 'createdAt'>): { isDuplicate: boolean; duplicateTask?: Task } {
    const enabledRules = this.rules.filter(r => r.enabled);
    if (enabledRules.length === 0) {
      return { isDuplicate: false };
    }

    for (const rule of enabledRules) {
      for (const existingTask of this.cachedTasks || []) {
        if (existingTask.status === '已完成') continue;
        if (rule.protectedTaskIds.includes(existingTask.id)) continue;
        if (!this.matchesCriteria(existingTask, rule, rule.timeWindowDays)) continue;

        const isMatch = this.isTasksMatch(task, existingTask, rule);
        if (isMatch) {
          return { isDuplicate: true, duplicateTask: existingTask };
        }
      }
    }
    return { isDuplicate: false };
  }

  private isTasksMatch(task1: Omit<Task, 'id' | 'createdAt'>, task2: Task, rule: DuplicateRule): boolean {
    if (rule.matchFields.includes('all')) {
      const key1 = this.normalizeString(`${task1.title}|${task1.description || ''}|${task1.priority}|${task1.dueDate || ''}`);
      const key2 = this.normalizeString(`${task2.title}|${task2.description || ''}|${task2.priority}|${task2.dueDate || ''}`);
      return key1 === key2;
    }

    if (rule.matchFieldsOperator === 'and') {
      return rule.matchFields.every(field => this.isFieldMatch(task1, task2, field));
    } else {
      return rule.matchFields.some(field => this.isFieldMatch(task1, task2, field));
    }
  }

  private isFieldMatch(task1: Omit<Task, 'id' | 'createdAt'>, task2: Task, field: DuplicateMatchField): boolean {
    switch (field) {
      case 'title':
        return this.normalizeString(task1.title) === this.normalizeString(task2.title);
      case 'description':
        return this.normalizeString(task1.description || '') === this.normalizeString(task2.description || '');
      case 'priority':
        return task1.priority === task2.priority;
      case 'dueDate':
        return task1.dueDate === task2.dueDate;
      default:
        return false;
    }
  }

  private getMatchKey(task: Task, matchFields: DuplicateMatchField[]): string {
    if (matchFields.includes('all')) {
      return this.normalizeString(`${task.title}|${task.description || ''}|${task.priority}|${task.dueDate || ''}`);
    }

    const parts: string[] = [];
    if (matchFields.includes('title')) parts.push(this.normalizeString(task.title));
    if (matchFields.includes('description')) parts.push(this.normalizeString(task.description || ''));
    if (matchFields.includes('priority')) parts.push(task.priority);
    if (matchFields.includes('dueDate')) parts.push(task.dueDate || '');

    return parts.join('|');
  }

  private matchesCriteria(task: Task, _rule: DuplicateRule, withinDays: number): boolean {
    const taskDate = new Date(task.createdAt);
    const now = new Date();
    const diffDays = (now.getTime() - taskDate.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= withinDays;
  }

  findDuplicateGroups(tasks: Task[]): DuplicateGroup[] {
    const groups: DuplicateGroup[] = [];
    const enabledRules = this.rules.filter(r => r.enabled);

    if (enabledRules.length === 0) return groups;

    for (const rule of enabledRules) {
      const taskGroups = new Map<string, Task[]>();

      for (const task of tasks) {
        if (task.status === '已完成') continue;
        if (rule.protectedTaskIds.includes(task.id)) continue;
        if (!this.matchesCriteria(task, rule, rule.timeWindowDays)) continue;

        const matchKey = this.getMatchKey(task, rule.matchFields);
        if (!taskGroups.has(matchKey)) {
          taskGroups.set(matchKey, []);
        }
        taskGroups.get(matchKey)!.push(task);
      }

      for (const [matchKey, matchedTasks] of taskGroups) {
        if (matchedTasks.length < rule.duplicateCountThreshold) continue;

        const sortedTasks = [...matchedTasks].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        const taskInfos: DuplicateTaskInfo[] = sortedTasks.map((task, index) => ({
          task,
          isNewest: index === 0,
          isProtected: rule.protectedTaskIds.includes(task.id),
          matchScore: rule.duplicateCountThreshold / matchedTasks.length,
        }));

        groups.push({
          ruleId: rule.id,
          matchKey,
          tasks: taskInfos,
        });
      }
    }

    return groups;
  }

  getDeletionCandidates(tasks: Task[]): Map<string, { task: Task; rule: DuplicateRule }[]> {
    const candidates = new Map<string, { task: Task; rule: DuplicateRule }[]>();
    const groups = this.findDuplicateGroups(tasks);

    for (const group of groups) {
      const rule = this.getRule(group.ruleId);
      if (!rule) continue;

      for (const taskInfo of group.tasks) {
        const shouldDelete = rule.keepNewest ? !taskInfo.isNewest : false;
        if (!shouldDelete) continue;

        if (!candidates.has(rule.id)) {
          candidates.set(rule.id, []);
        }
        candidates.get(rule.id)!.push({ task: taskInfo.task, rule });
      }
    }

    return candidates;
  }

  private createTaskSnapshot(task: Task): TaskSnapshot {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate,
      createdAt: task.createdAt,
      completedAt: task.completedAt,
      projectId: task.projectId,
      projectName: task.projectName,
    };
  }

  deleteTasks(
    tasks: Task[],
    ruleId: string,
    taskIds: string[],
    deletedBy: string = 'system'
  ): DeletionResult & { deletedTaskIds: string[] } {
    const rule = this.getRule(ruleId);
    if (!rule) {
      return {
        success: false,
        deletedCount: 0,
        failedCount: taskIds.length,
        errors: ['Rule not found'],
        historyIds: [],
        deletedTaskIds: [],
      };
    }

    const result: DeletionResult & { deletedTaskIds: string[] } = {
      success: true,
      deletedCount: 0,
      failedCount: 0,
      errors: [],
      historyIds: [],
      deletedTaskIds: [],
    };

    const tasksToDelete = tasks.filter(t => taskIds.includes(t.id));
    const recoveryDeadline = new Date();
    recoveryDeadline.setHours(recoveryDeadline.getHours() + this.config.recoveryDeadlineHours);

    for (const task of tasksToDelete) {
      try {
        const snapshot = this.createTaskSnapshot(task);

        const trashTask: TrashTask = {
          id: this.generateId(),
          originalTask: snapshot,
          deletedAt: new Date().toISOString(),
          deletedBy,
          ruleId: rule.id,
          ruleName: rule.name,
          recoveryDeadline: recoveryDeadline.toISOString(),
        };

        this.trash.push(trashTask);

        const historyEntry: DeletionHistory = {
          id: this.generateId(),
          taskId: task.id,
          taskTitle: task.title,
          taskSnapshot: snapshot,
          ruleId: rule.id,
          ruleName: rule.name,
          deletedAt: new Date().toISOString(),
          deletedBy,
          status: 'completed',
          recoveryAvailable: true,
          recoveryDeadline: recoveryDeadline.toISOString(),
        };

        this.deletionHistory.push(historyEntry);
        result.historyIds.push(historyEntry.id);
        result.deletedCount++;
        result.deletedTaskIds.push(task.id);
      } catch (e) {
        result.failedCount++;
        result.errors.push(`Failed to delete task ${task.id}: ${e}`);
      }
    }

    if (this.trash.length > this.config.maxTrashSize) {
      const toRemove = this.trash.splice(0, this.trash.length - this.config.maxTrashSize);
      for (const t of toRemove) {
        const history = this.deletionHistory.find(h => h.taskId === t.originalTask.id);
        if (history) {
          history.recoveryAvailable = false;
          history.status = 'failed';
        }
      }
    }

    result.success = result.failedCount === 0;
    this.saveToStorage();
    this.notify();
    return result;
  }

  getTrash(): TrashTask[] {
    return [...this.trash].sort(
      (a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()
    );
  }

  getTrashTask(id: string): TrashTask | undefined {
    return this.trash.find(t => t.id === id);
  }

  getDeletionHistory(): DeletionHistory[] {
    return [...this.deletionHistory].sort(
      (a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()
    );
  }

  restoreFromTrash(taskId: string): boolean {
    const index = this.trash.findIndex(t => t.id === taskId);
    if (index === -1) return false;

    const trashTask = this.trash[index];
    const now = new Date();
    const deadline = new Date(trashTask.recoveryDeadline);

    if (now > deadline) {
      return false;
    }

    const history = this.deletionHistory.find(h => h.taskId === trashTask.originalTask.id);
    if (history) {
      history.status = 'restored';
      history.recoveryAvailable = false;
    }

    this.trash.splice(index, 1);
    this.saveToStorage();
    this.notify();
    return true;
  }

  permanentlyDeleteFromTrash(taskId: string): boolean {
    const index = this.trash.findIndex(t => t.id === taskId);
    if (index === -1) return false;

    const trashTask = this.trash[index];
    const history = this.deletionHistory.find(h => h.taskId === trashTask.originalTask.id);

    if (history) {
      history.status = 'failed';
      history.recoveryAvailable = false;
    }

    this.trash.splice(index, 1);
    this.saveToStorage();
    this.notify();
    return true;
  }

  permanentlyDeleteByOriginalTaskId(originalTaskId: string, newStatus: string = 'auto_deleted'): boolean {
    const index = this.trash.findIndex(t => t.originalTask.id === originalTaskId);
    if (index === -1) return false;

    const trashTask = this.trash[index];
    const history = this.deletionHistory.find(h => h.taskId === trashTask.originalTask.id);

    if (history) {
      history.status = newStatus as any;
      history.recoveryAvailable = false;
    }

    this.trash.splice(index, 1);
    this.saveToStorage();
    this.notify();
    return true;
  }

  emptyTrash(): number {
    const count = this.trash.length;
    for (const trashTask of this.trash) {
      const history = this.deletionHistory.find(h => h.taskId === trashTask.originalTask.id);
      if (history) {
        history.recoveryAvailable = false;
      }
    }
    this.trash = [];
    this.saveToStorage();
    this.notify();
    return count;
  }

  cleanupExpiredTrash(): number {
    const now = new Date();
    const expired = this.trash.filter(t => new Date(t.recoveryDeadline) < now);
    const historyToUpdate = this.deletionHistory.filter(h =>
      expired.some(e => e.originalTask.id === h.taskId)
    );

    for (const history of historyToUpdate) {
      history.recoveryAvailable = false;
    }

    this.trash = this.trash.filter(t => new Date(t.recoveryDeadline) >= now);
    this.saveToStorage();
    this.notify();
    return expired.length;
  }

  getStats(): {
    totalRules: number;
    enabledRules: number;
    trashCount: number;
    historyCount: number;
    recoverableCount: number;
  } {
    return {
      totalRules: this.rules.length,
      enabledRules: this.rules.filter(r => r.enabled).length,
      trashCount: this.trash.length,
      historyCount: this.deletionHistory.length,
      recoverableCount: this.trash.filter(
        t => new Date(t.recoveryDeadline) > new Date()
      ).length,
    };
  }
}

export const duplicateTaskService = new DuplicateTaskService();
