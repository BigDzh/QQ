import { useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Module, ComponentStatus, ModuleStatus } from '../types';
import { calculateModuleStatusFromComponents } from '../services/statusEvaluation';

export interface CascadeBorrowInput {
  module: Module;
  borrower: string;
  expectedReturnDate?: string;
  notes?: string;
}

export interface CascadeReturnInput {
  module: Module;
  newStatus: ComponentStatus;
  reason?: string;
}

export interface CascadeResult {
  success: boolean;
  moduleId: string;
  moduleName: string;
  updatedComponents: string[];
  errors: string[];
}

export function useModuleComponentSync() {
  const { projects, updateModule, updateComponent, addBorrowRecord } = useApp();

  const findProjectByModule = useCallback((moduleId: string): { project: typeof projects[0]; module: Module } | null => {
    for (const project of projects) {
      const module = project.modules.find(m => m.id === moduleId);
      if (module) {
        return { project, module };
      }
    }
    return null;
  }, [projects]);

  const cascadeBorrowModule = useCallback((input: CascadeBorrowInput): CascadeResult => {
    const { module, borrower, expectedReturnDate, notes } = input;

    const found = findProjectByModule(module.id);
    if (!found) {
      return { success: false, moduleId: module.id, moduleName: module.moduleName, updatedComponents: [], errors: ['项目不存在'] };
    }

    const { project } = found;

    if (module.status !== '正常') {
      return {
        success: false,
        moduleId: module.id,
        moduleName: module.moduleName,
        updatedComponents: [],
        errors: [`模块当前状态为"${module.status}"，只有状态为"正常"的模块才能被借用`],
      };
    }

    const invalidComponents = module.components.filter(c => c.status !== '正常');
    if (invalidComponents.length > 0) {
      return {
        success: false,
        moduleId: module.id,
        moduleName: module.moduleName,
        updatedComponents: [],
        errors: [`模块内有 ${invalidComponents.length} 个组件状态不为"正常"，无法借用`],
      };
    }

    const updatedComponentIds: string[] = [];
    const errors: string[] = [];

    for (const component of module.components) {
      try {
        updateComponent(project.id, module.id, component.id, {
          status: '借用中' as ComponentStatus,
          borrower,
        });
        updatedComponentIds.push(component.id);

        addBorrowRecord({
          itemType: 'component',
          itemId: component.id,
          itemName: `${component.componentName} (${component.componentNumber})`,
          borrower,
          borrowDate: new Date().toISOString(),
          expectedReturnDate: expectedReturnDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          actualReturnDate: '',
          status: '借用中',
          notes: `随模块"${module.moduleName}"借用`,
          parentModuleBorrowId: module.id,
        });
      } catch (error) {
        errors.push(`组件 ${component.componentName} 更新失败`);
      }
    }

    if (errors.length > 0) {
      return {
        success: false,
        moduleId: module.id,
        moduleName: module.moduleName,
        updatedComponents: updatedComponentIds,
        errors,
      };
    }

    try {
      const allComponentsAfterUpdate = module.components.map(c => ({
        ...c,
        status: '借用中' as ComponentStatus,
      }));
      const calculatedModuleStatus = calculateModuleStatusFromComponents(allComponentsAfterUpdate);

      updateModule(project.id, module.id, {
        status: calculatedModuleStatus,
        borrower,
      });

      addBorrowRecord({
        itemType: 'module',
        itemId: module.id,
        itemName: module.moduleName,
        borrower,
        borrowDate: new Date().toISOString(),
        expectedReturnDate: expectedReturnDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        actualReturnDate: '',
        status: '借用中',
        notes: notes || '',
      });

      return {
        success: true,
        moduleId: module.id,
        moduleName: module.moduleName,
        updatedComponents: updatedComponentIds,
        errors: [],
      };
    } catch (error) {
      return {
        success: false,
        moduleId: module.id,
        moduleName: module.moduleName,
        updatedComponents: updatedComponentIds,
        errors: ['模块状态更新失败'],
      };
    }
  }, [findProjectByModule, updateModule, updateComponent, addBorrowRecord]);

  const cascadeReturnModule = useCallback((input: CascadeReturnInput): CascadeResult => {
    const { module, newStatus } = input;

    const found = findProjectByModule(module.id);
    if (!found) {
      return { success: false, moduleId: module.id, moduleName: module.moduleName, updatedComponents: [], errors: ['项目不存在'] };
    }

    const { project } = found;

    if (module.status !== '借用中') {
      return {
        success: false,
        moduleId: module.id,
        moduleName: module.moduleName,
        updatedComponents: [],
        errors: [`模块当前状态为"${module.status}"，只有状态为"借用中"的模块才能执行归还操作`],
      };
    }

    const borrowedComponents = module.components.filter(c => c.status === '借用中');
    if (borrowedComponents.length === 0) {
      return {
        success: false,
        moduleId: module.id,
        moduleName: module.moduleName,
        updatedComponents: [],
        errors: ['模块内没有借用中的组件'],
      };
    }

    const updatedComponentIds: string[] = [];
    const errors: string[] = [];

    for (const component of borrowedComponents) {
      try {
        updateComponent(project.id, module.id, component.id, {
          status: newStatus,
          borrower: undefined,
        });
        updatedComponentIds.push(component.id);
      } catch (error) {
        errors.push(`组件 ${component.componentName} 更新失败`);
      }
    }

    if (errors.length > 0) {
      return {
        success: false,
        moduleId: module.id,
        moduleName: module.moduleName,
        updatedComponents: updatedComponentIds,
        errors,
      };
    }

    try {
      const allComponentsAfterUpdate = module.components.map(c => ({
        ...c,
        status: newStatus,
      }));
      const calculatedModuleStatus = calculateModuleStatusFromComponents(allComponentsAfterUpdate);

      updateModule(project.id, module.id, {
        status: calculatedModuleStatus,
        borrower: undefined,
      });

      return {
        success: true,
        moduleId: module.id,
        moduleName: module.moduleName,
        updatedComponents: updatedComponentIds,
        errors: [],
      };
    } catch (error) {
      return {
        success: false,
        moduleId: module.id,
        moduleName: module.moduleName,
        updatedComponents: updatedComponentIds,
        errors: ['模块状态更新失败'],
      };
    }
  }, [findProjectByModule, updateModule, updateComponent, calculateModuleStatusFromComponents]);

  const syncModuleStatus = useCallback((moduleId: string): { success: boolean; calculatedStatus: ModuleStatus | null } => {
    const found = findProjectByModule(moduleId);
    if (!found) {
      return { success: false, calculatedStatus: null };
    }

    const { module } = found;

    if (module.components.length === 0) {
      return { success: true, calculatedStatus: '未投产' };
    }

    const statusCounts: Record<string, number> = {};
    for (const component of module.components) {
      statusCounts[component.status] = (statusCounts[component.status] || 0) + 1;
    }

    const allSameStatus = Object.keys(statusCounts).length === 1;
    if (allSameStatus) {
      const calculatedStatus = module.components[0].status as ModuleStatus;
      return { success: true, calculatedStatus };
    }

    return { success: true, calculatedStatus: null };
  }, [findProjectByModule]);

  const verifyModuleComponentSync = useCallback((moduleId: string): {
    isSynced: boolean;
    moduleStatus: ModuleStatus;
    calculatedStatus: ModuleStatus | null;
    componentStatuses: { id: string; name: string; status: ComponentStatus }[];
  } | null => {
    const found = findProjectByModule(moduleId);
    if (!found) {
      return null;
    }

    const { module } = found;

    if (module.components.length === 0) {
      return {
        isSynced: module.status === '未投产',
        moduleStatus: module.status,
        calculatedStatus: '未投产',
        componentStatuses: [],
      };
    }

    const statusCounts: Record<string, number> = {};
    const componentStatuses: { id: string; name: string; status: ComponentStatus }[] = [];

    for (const component of module.components) {
      componentStatuses.push({ id: component.id, name: component.componentName, status: component.status });
      statusCounts[component.status] = (statusCounts[component.status] || 0) + 1;
    }

    const allSameStatus = Object.keys(statusCounts).length === 1;
    const calculatedStatus = allSameStatus ? module.components[0].status as ModuleStatus : null;

    let isSynced = true;
    if (calculatedStatus === null) {
      isSynced = module.status === '未投产' || module.status === '正常';
    } else {
      isSynced = module.status === calculatedStatus;
    }

    return {
      isSynced,
      moduleStatus: module.status,
      calculatedStatus,
      componentStatuses,
    };
  }, [findProjectByModule]);

  return {
    cascadeBorrowModule,
    cascadeReturnModule,
    syncModuleStatus,
    verifyModuleComponentSync,
    findProjectByModule,
  };
}
