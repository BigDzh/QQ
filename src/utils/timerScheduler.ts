interface ScheduledTask {
  id: string;
  name: string;
  callback: () => void;
  interval: number;
  priority: 'high' | 'medium' | 'low';
  lastExecution: number;
  nextExecution: number;
  enabled: boolean;
  executeImmediately?: boolean;
}

type TaskId = string;

class TimerScheduler {
  private tasks: Map<TaskId, ScheduledTask> = new Map();
  private mainTimer: ReturnType<typeof setInterval> | null = null;
  private tickInterval: number = 1000;
  private isRunning: boolean = false;
  private static instance: TimerScheduler | null = null;
  private taskCounter: number = 0;

  private constructor() {
    this.start();
  }

  static getInstance(): TimerScheduler {
    if (!TimerScheduler.instance) {
      TimerScheduler.instance = new TimerScheduler();
    }
    return TimerScheduler.instance;
  }

  static destroyInstance(): void {
    if (TimerScheduler.instance) {
      TimerScheduler.instance.stop();
      TimerScheduler.instance.tasks.clear();
      TimerScheduler.instance = null;
    }
  }

  private start(): void {
    if (this.isRunning) return;

    this.mainTimer = setInterval(() => this.tick(), this.tickInterval);
    this.isRunning = true;
  }

  private stop(): void {
    if (this.mainTimer) {
      clearInterval(this.mainTimer);
      this.mainTimer = null;
    }
    this.isRunning = false;
  }

  private tick(): void {
    const now = Date.now();
    const tasksToExecute: ScheduledTask[] = [];

    for (const task of this.tasks.values()) {
      if (!task.enabled) continue;

      if (now >= task.nextExecution) {
        tasksToExecute.push(task);
      }
    }

    tasksToExecute.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    for (const task of tasksToExecute) {
      try {
        task.callback();
        task.lastExecution = now;
        task.nextExecution = now + task.interval;
      } catch (error) {
        console.error(`[TimerScheduler] Error executing task "${task.name}":`, error);
        task.lastExecution = now;
        task.nextExecution = now + task.interval;
      }
    }

    if (tasksToExecute.length > 3) {
      console.warn(`[TimerScheduler] Executed ${tasksToExecute.length} tasks in one tick, consider spreading intervals`);
    }
  }

  addTask(
    name: string,
    callback: () => void,
    intervalMs: number,
    options?: {
      priority?: 'high' | 'medium' | 'low';
      enabled?: boolean;
      executeImmediately?: boolean;
    }
  ): TaskId {
    const id = `task_${++this.taskCounter}_${Date.now()}`;
    const now = Date.now();

    const task: ScheduledTask = {
      id,
      name,
      callback,
      interval: intervalMs,
      priority: options?.priority || 'medium',
      lastExecution: 0,
      nextExecution: options?.executeImmediately ? now : now + intervalMs,
      enabled: options?.enabled !== false,
      executeImmediately: options?.executeImmediately,
    };

    this.tasks.set(id, task);

    if (task.executeImmediately && task.enabled) {
      try {
        task.callback();
        task.lastExecution = now;
        task.nextExecution = now + intervalMs;
      } catch (error) {
        console.error(`[TimerScheduler] Error executing immediate task "${task.name}":`, error);
      }
    }

    return id;
  }

  removeTask(taskId: TaskId): boolean {
    const existed = this.tasks.has(taskId);
    this.tasks.delete(taskId);
    return existed;
  }

  enableTask(taskId: TaskId): void {
    const task = this.tasks.get(taskId);
    if (task) {
      task.enabled = true;
      task.nextExecution = Date.now() + task.interval;
    }
  }

  disableTask(taskId: TaskId): void {
    const task = this.tasks.get(taskId);
    if (task) {
      task.enabled = false;
    }
  }

  updateInterval(taskId: TaskId, newIntervalMs: number): void {
    const task = this.tasks.get(taskId);
    if (task) {
      task.interval = newIntervalMs;
      const elapsedSinceLastExecution = Date.now() - task.lastExecution;
      if (elapsedSinceLastExecution >= newIntervalMs) {
        task.nextExecution = Date.now();
      } else {
        task.nextExecution = task.lastExecution + newIntervalMs;
      }
    }
  }

  getTaskInfo(taskId: TaskId): ScheduledTask | undefined {
    return this.tasks.get(taskId);
  }

  getAllTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }

  getActiveTasksCount(): number {
    let count = 0;
    for (const task of this.tasks.values()) {
      if (task.enabled) count++;
    }
    return count;
  }

  clearAllTasks(): void {
    this.tasks.clear();
  }

  pause(): void {
    this.stop();
  }

  resume(): void {
    this.start();

    const now = Date.now();
    for (const task of this.tasks.values()) {
      if (task.enabled && task.lastExecution > 0) {
        const elapsed = now - task.lastExecution;
        if (elapsed >= task.interval) {
          task.nextExecution = now;
        } else {
          task.nextExecution = task.lastExecution + task.interval;
        }
      } else if (task.enabled) {
        task.nextExecution = now + task.interval;
      }
    }
  }

  getStatus(): {
    isRunning: boolean;
    totalTasks: number;
    activeTasks: number;
    tickInterval: number;
    tasks: Array<{
      id: string;
      name: string;
      interval: number;
      priority: string;
      enabled: boolean;
      lastExecutionAgo: number;
      nextExecutionIn: number;
    }>;
  } {
    const now = Date.now();

    return {
      isRunning: this.isRunning,
      totalTasks: this.tasks.size,
      activeTasks: this.getActiveTasksCount(),
      tickInterval: this.tickInterval,
      tasks: Array.from(this.tasks.values()).map(task => ({
        id: task.id,
        name: task.name,
        interval: task.interval,
        priority: task.priority,
        enabled: task.enabled,
        lastExecutionAgo: task.lastExecution ? now - task.lastExecution : -1,
        nextExecutionIn: Math.max(0, task.nextExecution - now),
      })),
    };
  }
}

export const timerScheduler = TimerScheduler.getInstance();

export function registerInterval(
  name: string,
  callback: () => void,
  intervalMs: number,
  options?: {
    priority?: 'high' | 'medium' | 'low';
    enabled?: boolean;
  }
): TaskId {
  return timerScheduler.addTask(name, callback, intervalMs, options);
}

export function unregisterInterval(taskId: TaskId): void {
  timerScheduler.removeTask(taskId);
}

export function enableInterval(taskId: TaskId): void {
  timerScheduler.enableTask(taskId);
}

export function disableInterval(taskId: TaskId): void {
  timerScheduler.disableTask(taskId);
}

export function getSchedulerStatus() {
  return timerScheduler.getStatus();
}
