import { useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { useTaskNotification } from '../components/TaskNotificationPopup';
import { usePerformanceMode } from '../context/PerformanceModeContext';
import { useLowPerformanceMode } from '../context/LowPerformanceModeContext';
import { duplicateTaskService } from '../services/duplicateTaskService';
import { addAuditLog } from '../services/audit';
import { logger } from '../utils/logger';
import {
  markPageLoaded,
  getPageRefreshState,
  getAndClearPendingTask,
} from './usePageRefreshDetection';

const SET_MAX_SIZE = 500;
const PROCESS_INTERVAL_HIGH = 10000;
const PROCESS_INTERVAL_LOW = 30000;

interface TaskKey {
  type: 'module-fault' | 'component-fault' | 'software-incomplete' | 'document-incomplete';
  id: string;
}

interface TaskCreationLog {
  timestamp: string;
  type: TaskKey['type'];
  title: string;
  taskId: string;
  reason: string;
}

interface DuplicateCreationAttemptLog {
  timestamp: string;
  type: TaskKey['type'];
  title: string;
  duplicateTaskId: string;
  duplicateTaskTitle: string;
  reason: string;
  blocked: boolean;
}

interface TaskCreationConfig {
  taskType: TaskKey['type'];
  taskId: string;
  projectId: string;
  title: string;
  description: string;
  notificationMessage: string;
  existingTaskKeys: Set<string>;
}

function createTaskKey(type: TaskKey['type'], id: string): string {
  return `${type}-${id}`;
}

export function useAutoTaskManager() {
  const { projects, tasks, addTask, updateTask, currentUser } = useApp();
  const { showNotification } = useTaskNotification();
  const { isHighPerformance } = usePerformanceMode();
  const { getEffectiveFeatureState } = useLowPerformanceMode();
  const processedItemsRef = useRef<Set<string>>(new Set());
  const lastProcessTimeRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);
  const taskCreationLogsRef = useRef<TaskCreationLog[]>([]);
  const recentlyCreatedRef = useRef<Set<string>>(new Set());
  const isHighPerformanceRef = useRef<boolean>(isHighPerformance);
  const duplicateAttemptLogsRef = useRef<DuplicateCreationAttemptLog[]>([]);
  const isPageRefreshRef = useRef<boolean>(false);
  const pendingTaskBlockedRef = useRef<boolean>(false);

  useEffect(() => {
    isHighPerformanceRef.current = isHighPerformance;
  }, [isHighPerformance]);

  const PROCESS_INTERVAL = isHighPerformance ? PROCESS_INTERVAL_HIGH : PROCESS_INTERVAL_LOW;

  const logTaskCreation = useCallback((type: TaskKey['type'], title: string, taskId: string, reason: string) => {
    const log: TaskCreationLog = {
      timestamp: new Date().toISOString(),
      type,
      title,
      taskId,
      reason,
    };
    taskCreationLogsRef.current.push(log);
    if (taskCreationLogsRef.current.length > 100) {
      taskCreationLogsRef.current = taskCreationLogsRef.current.slice(-50);
    }
    logger.log(`[AutoTaskManager] Created task: ${type} - ${title} (ID: ${taskId})`, log);
  }, []);

  const logDuplicateAttempt = useCallback((
    type: TaskKey['type'],
    title: string,
    duplicateTaskId: string,
    duplicateTaskTitle: string,
    reason: string,
    blocked: boolean
  ) => {
    const log: DuplicateCreationAttemptLog = {
      timestamp: new Date().toISOString(),
      type,
      title,
      duplicateTaskId,
      duplicateTaskTitle,
      reason,
      blocked,
    };
    duplicateAttemptLogsRef.current.push(log);
    if (duplicateAttemptLogsRef.current.length > 100) {
      duplicateAttemptLogsRef.current = duplicateAttemptLogsRef.current.slice(-50);
    }
    logger.log(`[AutoTaskManager] Duplicate task blocked: ${type} - ${title} (Duplicate of: ${duplicateTaskTitle}, ID: ${duplicateTaskId})`, log);
  }, []);

  const cleanupProcessedItems = useCallback(() => {
    if (processedItemsRef.current.size > SET_MAX_SIZE) {
      const itemsArray = Array.from(processedItemsRef.current);
      processedItemsRef.current = new Set(itemsArray.slice(-SET_MAX_SIZE));
    }
    recentlyCreatedRef.current.clear();
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    markPageLoaded();

    const { isPageRefresh, pendingTaskData } = getPageRefreshState();
    isPageRefreshRef.current = isPageRefresh;

    if (isPageRefresh && pendingTaskData) {
      pendingTaskBlockedRef.current = true;
      logger.log('[AutoTaskManager] Page refresh detected, blocking automatic task creation from previous session');
      getAndClearPendingTask();
    }

    return () => {
      isMountedRef.current = false;
      processedItemsRef.current.clear();
      taskCreationLogsRef.current = [];
      recentlyCreatedRef.current.clear();
      duplicateAttemptLogsRef.current = [];
      pendingTaskBlockedRef.current = false;
    };
  }, []);

  const buildExistingTaskKeys = useCallback((allTasks: typeof tasks): Set<string> => {
    const keys = new Set<string>();

    for (const task of allTasks) {
      if (task.status === '已完成') continue;

      if (task.title.includes('故障处理')) {
        const match = task.title.match(/\(([^)]+)\)/);
        if (match) {
          if (task.title.includes('模块')) {
            keys.add(createTaskKey('module-fault', match[1]));
          } else if (task.title.includes('组件')) {
            keys.add(createTaskKey('component-fault', match[1]));
          }
        }
      }

      if (task.title.includes('软件开发')) {
        const match = task.title.match(/^(.+?)\s*\(([^)]+)\)\s*软件开发/);
        if (match) {
          keys.add(createTaskKey('software-incomplete', `${match[1]}-${match[2]}`));
        }
      }

      if (task.title.includes('文档编写')) {
        const match = task.title.match(/^(.+?)\s*\(([^)]+)\)\s*文档编写/);
        if (match) {
          keys.add(createTaskKey('document-incomplete', `${match[1]}-${match[2]}`));
        }
      }
    }

    return keys;
  }, []);

  const createTaskWithDuplicateCheck = useCallback((
    config: TaskCreationConfig
  ): string | null => {
    const { taskType, taskId, projectId, title, description, notificationMessage, existingTaskKeys } = config;
    const taskKey = createTaskKey(taskType, taskId);

    if (processedItemsRef.current.has(taskKey) || existingTaskKeys.has(taskKey)) {
      return null;
    }

    const faultDuplicateCheck = duplicateTaskService.checkFaultTaskDuplicate(taskType, taskId);
    if (faultDuplicateCheck.isDuplicate && faultDuplicateCheck.record) {
      duplicateTaskService.logDuplicateInterception(
        taskType,
        taskId,
        title,
        faultDuplicateCheck.existingTaskId!,
        faultDuplicateCheck.existingTaskTitle!,
        `${taskType} 在时间窗口内已创建过任务`
      );
      logDuplicateAttempt(
        taskType,
        title,
        faultDuplicateCheck.existingTaskId!,
        faultDuplicateCheck.existingTaskTitle!,
        `${taskType} (fault record check)`,
        true
      );
      if (currentUser) {
        addAuditLog(
          currentUser.id,
          currentUser.username,
          'CREATE_BLOCKED',
          'WARNING',
          '任务',
          faultDuplicateCheck.existingTaskId!,
          faultDuplicateCheck.existingTaskTitle!,
          `自动任务创建被阻止：${taskType}重复检查（时间窗口）`,
          undefined,
          { faultType: taskType, faultId: taskId } as Record<string, unknown>
        );
      }
      return null;
    }

    const taskInfo = {
      title,
      description,
      priority: '紧急' as const,
      status: '进行中' as const,
      projectId,
    };

    const duplicateCheck = duplicateTaskService.checkDuplicate(taskInfo);
    if (duplicateCheck.isDuplicate && duplicateCheck.duplicateTask) {
      duplicateTaskService.registerFaultTask(taskType, taskId, duplicateCheck.duplicateTask.id, duplicateCheck.duplicateTask.title);
      duplicateTaskService.logDuplicateInterception(
        taskType,
        taskId,
        title,
        duplicateCheck.duplicateTask.id,
        duplicateCheck.duplicateTask.title,
        `${taskType} 匹配到现有重复任务`
      );
      logDuplicateAttempt(
        taskType,
        title,
        duplicateCheck.duplicateTask.id,
        duplicateCheck.duplicateTask.title,
        `${taskType}`,
        true
      );
      if (currentUser) {
        addAuditLog(
          currentUser.id,
          currentUser.username,
          'CREATE_BLOCKED',
          'WARNING',
          '任务',
          duplicateCheck.duplicateTask.id,
          duplicateCheck.duplicateTask.title,
          `自动任务创建被阻止：检测到重复任务`,
          undefined,
          { blockedTask: taskInfo } as Record<string, unknown>
        );
      }
      return null;
    }

    processedItemsRef.current.add(taskKey);

    const newTaskId = addTask(taskInfo);

    duplicateTaskService.registerFaultTask(taskType, taskId, newTaskId, title);
    logTaskCreation(taskType, title, newTaskId, `${taskType}`);

    if (isHighPerformanceRef.current) {
      showNotification('自动创建任务', notificationMessage, 'info');
    }

    return newTaskId;
  }, [addTask, showNotification, logTaskCreation, logDuplicateAttempt, currentUser]);

  const processFaultModules = useCallback((
    projectId: string,
    moduleName: string,
    moduleNumber: string,
    existingTaskKeys: Set<string>
  ): string | null => {
    return createTaskWithDuplicateCheck({
      taskType: 'module-fault',
      taskId: moduleNumber,
      projectId,
      title: `${moduleName} (${moduleNumber}) 故障处理`,
      description: `模块 ${moduleName} 当前状态为故障，需要进行检查和维修。`,
      notificationMessage: `已为故障模块 ${moduleName} 自动创建任务`,
      existingTaskKeys,
    });
  }, [createTaskWithDuplicateCheck]);

  const processFaultComponents = useCallback((
    projectId: string,
    componentName: string,
    componentNumber: string,
    moduleName: string,
    existingTaskKeys: Set<string>
  ): string | null => {
    return createTaskWithDuplicateCheck({
      taskType: 'component-fault',
      taskId: componentNumber,
      projectId,
      title: `${componentName} (${componentNumber}) 故障处理`,
      description: `组件 ${componentName} 当前状态为故障，需要进行检查和维修。所属模块：${moduleName}`,
      notificationMessage: `已为故障组件 ${componentName} 自动创建任务`,
      existingTaskKeys,
    });
  }, [createTaskWithDuplicateCheck]);

  const processIncompleteSoftware = useCallback((
    projectId: string,
    sw: { id: string; name: string; version: string },
    existingTaskKeys: Set<string>
  ): string | null => {
    return createTaskWithDuplicateCheck({
      taskType: 'software-incomplete',
      taskId: `${sw.name}-${sw.version}`,
      projectId,
      title: `${sw.name} (${sw.version}) 软件开发`,
      description: `软件 ${sw.name} 尚未完成开发。`,
      notificationMessage: `已为未完成软件 ${sw.name} 自动创建任务`,
      existingTaskKeys,
    });
  }, [createTaskWithDuplicateCheck]);

  const processCompletedSoftware = useCallback((sw: { name: string }, existingTask: { id: string } | undefined) => {
    if (existingTask) {
      updateTask(existingTask.id, {
        status: '已完成',
        completedAt: new Date().toISOString(),
      });
      showNotification(`任务完成`, `软件 ${sw.name} 已完成，相关任务已自动标记为完成`, 'success');
    }
  }, [updateTask, showNotification]);

  const processIncompleteDocument = useCallback((
    projectId: string,
    doc: { id: string; name: string; documentNumber: string },
    existingTaskKeys: Set<string>
  ): string | null => {
    return createTaskWithDuplicateCheck({
      taskType: 'document-incomplete',
      taskId: `${doc.name}-${doc.documentNumber}`,
      projectId,
      title: `${doc.name} (${doc.documentNumber}) 文档编写`,
      description: `文档 ${doc.name} 尚未完成。`,
      notificationMessage: `已为未完成文档 ${doc.name} 自动创建任务`,
      existingTaskKeys,
    });
  }, [createTaskWithDuplicateCheck]);

  const processCompletedDocument = useCallback((doc: { name: string }, existingTask: { id: string } | undefined) => {
    if (existingTask) {
      updateTask(existingTask.id, {
        status: '已完成',
        completedAt: new Date().toISOString(),
      });
      showNotification(`任务完成`, `文档 ${doc.name} 已完成，相关任务已自动标记为完成`, 'success');
    }
  }, [updateTask, showNotification]);

  const taskAutoCreateFeature = { id: 'task-auto-create', name: '自动任务创建', description: '', category: 'enhanced' as const, enabledInHighMode: true, enabledInLowMode: false, resourceCost: 'medium' as const };
  const isAutoTaskEnabled = getEffectiveFeatureState(taskAutoCreateFeature);

  useEffect(() => {
    if (!isMountedRef.current) return;

    if (!isAutoTaskEnabled) {
      logger.log('[AutoTaskManager] Auto task creation is disabled (feature flag off)');
      return;
    }

    if (pendingTaskBlockedRef.current) {
      logger.log('[AutoTaskManager] Skipping task processing due to page refresh detection');
      pendingTaskBlockedRef.current = false;
      return;
    }

    const now = Date.now();
    if (now - lastProcessTimeRef.current < PROCESS_INTERVAL) {
      return;
    }

    isProcessingRef.current = true;
    lastProcessTimeRef.current = now;

    try {
      const existingTaskKeys = buildExistingTaskKeys(tasks);

      for (const project of projects) {
        if (!isMountedRef.current) break;

        for (const module of project.modules) {
          if (!isMountedRef.current) break;

          if (module.status === '故障') {
            processFaultModules(project.id, module.moduleName, module.moduleNumber, existingTaskKeys);
          }

          for (const component of module.components) {
            if (!isMountedRef.current) break;

            if (component.status === '故障') {
              processFaultComponents(project.id, component.componentName, component.componentNumber, module.moduleName, existingTaskKeys);
            }
          }
        }

        for (const sw of project.software) {
          if (!isMountedRef.current) break;
          if (sw.status === '未完成') {
            processIncompleteSoftware(project.id, sw, existingTaskKeys);
          } else if (sw.status === '已完成') {
            const existingTask = tasks.find(t => t.title.includes(sw.name) && t.title.includes('开发') && t.status !== '已完成');
            processCompletedSoftware(sw, existingTask);
          }
        }

        for (const doc of project.documents) {
          if (!isMountedRef.current) break;
          if (doc.status === '未完成') {
            processIncompleteDocument(project.id, doc, existingTaskKeys);
          } else if (doc.status === '已完成') {
            const existingTask = tasks.find(t => t.title.includes(doc.name) && t.title.includes('编写') && t.status !== '已完成');
            processCompletedDocument(doc, existingTask);
          }
        }
      }

      cleanupProcessedItems();
    } finally {
      isProcessingRef.current = false;
    }
  }, [
    isAutoTaskEnabled,
    projects,
    tasks,
    buildExistingTaskKeys,
    cleanupProcessedItems,
    processFaultModules,
    processFaultComponents,
    processIncompleteSoftware,
    processCompletedSoftware,
    processIncompleteDocument,
    processCompletedDocument,
  ]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      processedItemsRef.current.clear();
      recentlyCreatedRef.current.clear();
      taskCreationLogsRef.current = [];
      duplicateAttemptLogsRef.current = [];
    };
  }, []);

  return null;
}
