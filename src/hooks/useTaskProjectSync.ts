import { useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/Toast';

const SET_MAX_SIZE = 200;

export function useTaskProjectSync() {
  const { tasks, projects, updateProject } = useApp();
  const { showToast } = useToast();
  const processedTasksRef = useRef<Set<string>>(new Set());
  const lastProcessedTaskCountRef = useRef<number>(0);

  const cleanupProcessedTasks = useCallback(() => {
    if (tasks.length < lastProcessedTaskCountRef.current) {
      processedTasksRef.current.clear();
    }
    if (processedTasksRef.current.size > SET_MAX_SIZE) {
      const itemsArray = Array.from(processedTasksRef.current);
      processedTasksRef.current = new Set(itemsArray.slice(-SET_MAX_SIZE));
    }
    lastProcessedTaskCountRef.current = tasks.length;
  }, [tasks.length]);

  useEffect(() => {
    tasks.forEach((task) => {
      if (task.status === '已完成' && task.projectId) {
        const project = projects.find((p) => p.id === task.projectId);

        if (project && project.tasks && !processedTasksRef.current.has(task.id)) {
          const existingPlanTask = project.tasks.find(
            (pt) => pt.title === task.title && pt.status !== '已完成'
          );

          if (existingPlanTask) {
            updateProject(project.id, {
              tasks: project.tasks.map((pt) =>
                pt.id === existingPlanTask.id
                  ? { ...pt, status: '已完成' as const, completedAt: new Date().toISOString() }
                  : pt
              ),
            });
            showToast(`项目"${project.name}"的计划"${task.title}"已自动标记为完成`, 'success');
          }
          processedTasksRef.current.add(task.id);
        }
      }
    });

    cleanupProcessedTasks();
  }, [tasks, projects, updateProject, showToast, cleanupProcessedTasks]);

  return null;
}
