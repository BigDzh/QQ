import { useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/Toast';

const SET_MAX_SIZE = 500;
const PROCESS_INTERVAL = 5000;

export function useAutoTaskManager() {
  const { projects, tasks, addTask, updateTask } = useApp();
  const { showToast } = useToast();
  const processedItemsRef = useRef<Set<string>>(new Set());
  const lastProcessTimeRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);

  const cleanupProcessedItems = useCallback(() => {
    if (processedItemsRef.current.size > SET_MAX_SIZE) {
      const itemsArray = Array.from(processedItemsRef.current);
      processedItemsRef.current = new Set(itemsArray.slice(-SET_MAX_SIZE));
    }
  }, []);

  useEffect(() => {
    const now = Date.now();
    if (isProcessingRef.current || now - lastProcessTimeRef.current < PROCESS_INTERVAL) {
      return;
    }

    isProcessingRef.current = true;
    lastProcessTimeRef.current = now;

    try {
      projects.forEach((project) => {
        project.modules.forEach((module) => {
          if (module.status === '故障') {
            const taskKey = `module-fault-${module.id}`;
            if (processedItemsRef.current.has(taskKey)) return;

            const existingTask = tasks.find(
              (t) => t.title.includes(module.moduleName) && t.title.includes('故障处理')
            );

            if (!existingTask) {
              addTask({
                title: `${module.moduleName} (${module.moduleNumber}) 故障处理`,
                description: `模块 ${module.moduleName} 当前状态为故障，需要进行检查和维修。项目：${project.name}`,
                priority: '紧急',
                status: '进行中',
                projectId: project.id,
                projectName: project.name,
                relatedComponentIds: module.components.map((c) => c.id),
              });
              processedItemsRef.current.add(taskKey);
              showToast(`已为故障模块 ${module.moduleName} 自动创建任务`, 'info');
            } else {
              processedItemsRef.current.add(taskKey);
            }
          }

          module.components.forEach((component) => {
            if (component.status === '故障') {
              const taskKey = `component-fault-${component.id}`;
              if (processedItemsRef.current.has(taskKey)) return;

              const existingTask = tasks.find(
                (t) => t.title.includes(component.componentName) && t.title.includes('故障')
              );

              if (!existingTask) {
                addTask({
                  title: `${component.componentName} (${component.componentNumber}) 故障处理`,
                  description: `组件 ${component.componentName} 当前状态为故障，需要进行检查和维修。所属模块：${module.moduleName}，项目：${project.name}`,
                  priority: '紧急',
                  status: '进行中',
                  projectId: project.id,
                  projectName: project.name,
                  relatedComponentIds: [component.id],
                });
                processedItemsRef.current.add(taskKey);
                showToast(`已为故障组件 ${component.componentName} 自动创建任务`, 'info');
              } else {
                processedItemsRef.current.add(taskKey);
              }
            }
          });
        });

        project.software.forEach((sw) => {
          if (sw.status === '未完成') {
            const taskKey = `software-incomplete-${sw.id}`;
            if (processedItemsRef.current.has(taskKey)) return;

            const existingTask = tasks.find(
              (t) => t.title.includes(sw.name) && t.title.includes('开发')
            );

            if (!existingTask) {
              addTask({
                title: `${sw.name} (${sw.version}) 软件开发`,
                description: `软件 ${sw.name} 尚未完成开发。项目：${project.name}`,
                priority: '高',
                status: '进行中',
                projectId: project.id,
                projectName: project.name,
              });
              processedItemsRef.current.add(taskKey);
              showToast(`已为未完成软件 ${sw.name} 自动创建任务`, 'info');
            } else {
              processedItemsRef.current.add(taskKey);
            }
          } else if (sw.status === '已完成') {
            const existingTask = tasks.find(
              (t) => t.title.includes(sw.name) && t.title.includes('开发') && t.status !== '已完成'
            );

            if (existingTask) {
              updateTask(existingTask.id, {
                status: '已完成',
                completedAt: new Date().toISOString(),
              });
              showToast(`软件 ${sw.name} 已完成，相关任务已自动标记为完成`, 'success');
            }
          }
        });

        project.documents.forEach((doc) => {
          if (doc.status === '未完成') {
            const taskKey = `document-incomplete-${doc.id}`;
            if (processedItemsRef.current.has(taskKey)) return;

            const existingTask = tasks.find(
              (t) => t.title.includes(doc.name) && t.title.includes('编写')
            );

            if (!existingTask) {
              addTask({
                title: `${doc.name} (${doc.documentNumber}) 文档编写`,
                description: `文档 ${doc.name} 尚未完成。项目：${project.name}`,
                priority: '中',
                status: '进行中',
                projectId: project.id,
                projectName: project.name,
              });
              processedItemsRef.current.add(taskKey);
              showToast(`已为未完成文档 ${doc.name} 自动创建任务`, 'info');
            } else {
              processedItemsRef.current.add(taskKey);
            }
          } else if (doc.status === '已完成') {
            const existingTask = tasks.find(
              (t) => t.title.includes(doc.name) && t.title.includes('编写') && t.status !== '已完成'
            );

            if (existingTask) {
              updateTask(existingTask.id, {
                status: '已完成',
                completedAt: new Date().toISOString(),
              });
              showToast(`文档 ${doc.name} 已完成，相关任务已自动标记为完成`, 'success');
            }
          }
        });
      });

      cleanupProcessedItems();
    } finally {
      isProcessingRef.current = false;
    }
  }, [projects, tasks, addTask, updateTask, showToast, cleanupProcessedItems]);

  return null;
}
