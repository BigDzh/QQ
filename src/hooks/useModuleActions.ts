import { useCallback } from 'react';
import type { useToast } from '../components/Toast';
import { generateId } from '../utils/auth';
import type { Module, ModuleStatus, Component } from '../types';

export function useModuleActions(params: {
  projectId: string;
  addModule: (projectId: string, module: Module) => void;
  deleteModule: (projectId: string, moduleId: string) => void;
  showToast: ReturnType<typeof useToast>['showToast'];
}) {
  const { projectId, addModule, deleteModule, showToast } = params;

  const handleCopyModule = useCallback((module: Module, newNumber: string) => {
    addModule(projectId, {
      ...module,
      id: generateId(),
      projectId,
      moduleNumber: newNumber,
      status: '未投产' as ModuleStatus,
      components: module.components.map((c: Component) => ({ ...c, id: generateId() })),
    } as Module);
    showToast('模块复制成功', 'success');
  }, [projectId, addModule]);

  const handleDeleteModule = useCallback((moduleId: string) => {
    deleteModule(projectId, moduleId);
    showToast('模块已删除', 'success');
  }, [projectId, deleteModule, showToast]);

  const handleEditModule = useCallback((module: Module) => {
    return { module };
  }, []);

  return {
    handleCopyModule,
    handleDeleteModule,
    handleEditModule,
  };
}
