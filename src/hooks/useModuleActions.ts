import { useCallback } from 'react';
import { useToast } from '../components/Toast';
import { generateId } from '../utils/auth';
import type { Module, ModuleStatus, ProjectStage } from '../types';

export function useModuleActions(params: {
  projectId: string;
  addModule: (projectId: string, module: any) => void;
  deleteModule: (projectId: string, moduleId: string) => void;
  updateProject: (projectId: string, updates: any) => void;
  project: any;
  modules: Module[];
  showToast: ReturnType<typeof useToast>['showToast'];
}) {
  const { projectId, addModule, deleteModule, updateProject, project, modules, showToast } = params;

  const handleCopyModule = useCallback((module: Module, newNumber: string) => {
    addModule(projectId, {
      projectId,
      moduleNumber: newNumber,
      moduleName: module.moduleName,
      category: module.category,
      productionOrderNumber: module.productionOrderNumber,
      holder: module.holder,
      status: '未投产' as ModuleStatus,
      stage: module.stage as ProjectStage,
      version: module.version,
      components: module.components.map((c: any) => ({ ...c, id: generateId() })),
    });
    showToast('模块复制成功', 'success');
  }, [projectId, addModule]);

  const handleDeleteModule = useCallback((moduleId: string) => {
    if (confirm('确定要删除该模块吗？')) {
      deleteModule(projectId, moduleId);
      showToast('模块已删除', 'success');
    }
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
