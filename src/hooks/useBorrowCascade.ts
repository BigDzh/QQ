import { useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/Toast';
import {
  CascadeOperationResult,
  StatusChangeAuditEntry,
  borrowCascadeService,
} from '../services/borrowCascadeService';
import { Module, Component, BorrowRecord, ComponentStatus, ModuleStatus } from '../types';

export interface BorrowOperationInput {
  item: Module | Component;
  itemType: 'module' | 'component';
  borrower: string;
  expectedReturnDate?: string;
  notes?: string;
}

export interface ReturnOperationInput {
  record: BorrowRecord;
  newStatus: ComponentStatus | ModuleStatus;
  reason?: string;
}

export function useBorrowCascade() {
  const { projects, updateModule, updateComponent, addBorrowRecord, returnBorrowRecord, currentUser } = useApp();
  const { showToast, addNotification } = useToast();

  const [isProcessing, setIsProcessing] = useState(false);
  const [lastOperation, setLastOperation] = useState<CascadeOperationResult | null>(null);
  const [auditLogs, setAuditLogs] = useState<StatusChangeAuditEntry[]>([]);

  const operator = currentUser?.name || currentUser?.username || '系统';

  const getModuleById = useCallback((projectId: string, moduleId: string): Module | undefined => {
    const project = projects.find(p => p.id === projectId);
    return project?.modules.find(m => m.id === moduleId);
  }, [projects]);

  const getComponentById = useCallback((projectId: string, moduleId: string, componentId: string): Component | undefined => {
    const project = projects.find(p => p.id === projectId);
    const module = project?.modules.find(m => m.id === moduleId);
    return module?.components.find(c => c.id === componentId);
  }, [projects]);

  const findModuleForComponent = useCallback((componentId: string): { project: typeof projects[0]; module: Module } | undefined => {
    for (const project of projects) {
      for (const module of project.modules) {
        if (module.components.some(c => c.id === componentId)) {
          return { project, module };
        }
      }
    }
    return undefined;
  }, [projects]);

  const executeBorrow = useCallback(async (
    input: BorrowOperationInput
  ): Promise<CascadeOperationResult> => {
    setIsProcessing(true);

    try {
      if (input.itemType === 'module') {
        const module = input.item as Module;

        const project = projects.find(p => p.modules.some(m => m.id === module.id));
        if (!project) {
          return { success: false, affectedComponents: [], affectedModules: [], errors: ['项目不存在'], message: '项目不存在' };
        }

        const cascadeResult = borrowCascadeService.executeBorrowCascade(
          module,
          input.borrower,
          operator,
          input.notes || '模块借用'
        );

        if (!cascadeResult.success) {
          return {
            success: false,
            affectedComponents: cascadeResult.affectedComponents,
            affectedModules: cascadeResult.affectedModules,
            errors: cascadeResult.errors,
            message: cascadeResult.errors.join('; '),
          };
        }

        const borrowRecord = borrowCascadeService.createBorrowRecord(
          module,
          'module',
          input.borrower,
          input.notes || '',
          undefined,
          input.expectedReturnDate
        );

        addBorrowRecord(borrowRecord);

        for (const componentId of cascadeResult.affectedComponents) {
          const component = module.components.find(c => c.id === componentId);
          if (component) {
            const componentBorrowRecord = borrowCascadeService.createBorrowRecord(
              component,
              'component',
              input.borrower,
              `随模块 "${module.moduleName}" 借用`,
              borrowRecord.id,
              input.expectedReturnDate
            );
            addBorrowRecord(componentBorrowRecord);
          }
          updateComponent(project.id, module.id, componentId, {
            status: '借用中',
            borrower: input.borrower,
          });
        }

        updateModule(project.id, module.id, {
          status: '借用中',
          borrower: input.borrower,
        });

        const result: CascadeOperationResult = {
          success: true,
          borrowRecordId: borrowRecord.id,
          affectedComponents: cascadeResult.affectedComponents,
          affectedModules: cascadeResult.affectedModules,
          errors: [],
          message: `成功借用模块 "${module.moduleName}" 及其 ${cascadeResult.affectedComponents.length} 个组件`,
        };

        setLastOperation(result);
        showToast(result.message, 'success');
        addNotification({
          type: 'success',
          title: '借用成功',
          message: result.message,
        });

        return result;

      } else {
        const component = input.item as Component;
        const found = findModuleForComponent(component.id);

        if (!found) {
          return { success: false, affectedComponents: [], affectedModules: [], errors: ['组件所在模块不存在'], message: '组件所在模块不存在' };
        }

        const { project, module } = found;

        if (component.status !== '正常') {
          return {
            success: false,
            affectedComponents: [],
            affectedModules: [],
            errors: [`组件当前状态为"${component.status}"，只有状态为"正常"的组件才能被借用`],
            message: `组件当前状态为"${component.status}"，无法借用`,
          };
        }

        const borrowRecord = borrowCascadeService.createBorrowRecord(
          component,
          'component',
          input.borrower,
          input.notes || '',
          undefined,
          input.expectedReturnDate
        );

        addBorrowRecord(borrowRecord);

        updateComponent(project.id, module.id, component.id, {
          status: '借用中',
          borrower: input.borrower,
        });

        const result: CascadeOperationResult = {
          success: true,
          borrowRecordId: borrowRecord.id,
          affectedComponents: [component.id],
          affectedModules: [],
          errors: [],
          message: `成功借用组件 "${component.componentName}"`,
        };

        setLastOperation(result);
        showToast(result.message, 'success');
        addNotification({
          type: 'success',
          title: '借用成功',
          message: result.message,
        });

        return result;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '借用操作失败';
      const result: CascadeOperationResult = {
        success: false,
        affectedComponents: [],
        affectedModules: [],
        errors: [errorMessage],
        message: errorMessage,
      };
      setLastOperation(result);
      showToast(errorMessage, 'error');
      return result;
    } finally {
      setIsProcessing(false);
    }
  }, [projects, operator, updateModule, updateComponent, addBorrowRecord, findModuleForComponent, showToast, addNotification]);

  const executeReturn = useCallback(async (
    input: ReturnOperationInput
  ): Promise<CascadeOperationResult> => {
    setIsProcessing(true);

    try {
      const { record, newStatus, reason } = input;

      if (record.itemType === 'module') {
        const project = projects.find(p => p.modules.some(m => m.id === record.itemId));
        const module = project?.modules.find(m => m.id === record.itemId);

        if (!project || !module) {
          return { success: false, affectedComponents: [], affectedModules: [], errors: ['模块不存在'], message: '模块不存在' };
        }

        const cascadeResult = borrowCascadeService.executeReturnCascade(
          module,
          newStatus,
          operator,
          reason || '模块归还'
        );

        if (!cascadeResult.success) {
          return {
            success: false,
            affectedComponents: cascadeResult.affectedComponents,
            affectedModules: cascadeResult.affectedModules,
            errors: cascadeResult.errors,
            message: cascadeResult.errors.join('; '),
          };
        }

        for (const componentId of cascadeResult.affectedComponents) {
          updateComponent(project.id, module.id, componentId, {
            status: newStatus as ComponentStatus,
            borrower: undefined,
          });
        }

        updateModule(project.id, module.id, {
          status: newStatus as ModuleStatus,
          borrower: undefined,
        });

        returnBorrowRecord(record.id);

        const result: CascadeOperationResult = {
          success: true,
          affectedComponents: cascadeResult.affectedComponents,
          affectedModules: cascadeResult.affectedModules,
          errors: [],
          message: `成功归还模块 "${module.moduleName}"，状态已更新为"${newStatus}"`,
        };

        setLastOperation(result);
        showToast(result.message, 'success');
        addNotification({
          type: 'success',
          title: '归还成功',
          message: result.message,
        });

        return result;

      } else {
        const found = findModuleForComponent(record.itemId);

        if (!found) {
          return { success: false, affectedComponents: [], affectedModules: [], errors: ['组件所在模块不存在'], message: '组件所在模块不存在' };
        }

        const { project, module } = found;

        updateComponent(project.id, module.id, record.itemId, {
          status: newStatus as ComponentStatus,
          borrower: undefined,
        });

        returnBorrowRecord(record.id);

        const result: CascadeOperationResult = {
          success: true,
          affectedComponents: [record.itemId],
          affectedModules: [],
          errors: [],
          message: `成功归还组件，状态已更新为"${newStatus}"`,
        };

        setLastOperation(result);
        showToast(result.message, 'success');
        addNotification({
          type: 'success',
          title: '归还成功',
          message: result.message,
        });

        return result;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '归还操作失败';
      const result: CascadeOperationResult = {
        success: false,
        affectedComponents: [],
        affectedModules: [],
        errors: [errorMessage],
        message: errorMessage,
      };
      setLastOperation(result);
      showToast(errorMessage, 'error');
      return result;
    } finally {
      setIsProcessing(false);
    }
  }, [projects, operator, updateModule, updateComponent, returnBorrowRecord, findModuleForComponent, showToast, addNotification]);

  const getAuditLogsByRecord = useCallback((borrowRecordId: string): StatusChangeAuditEntry[] => {
    return borrowCascadeService.getAuditLogsByBorrowRecord(borrowRecordId);
  }, []);

  const getAuditLogsByEntity = useCallback((entityType: 'module' | 'component', entityId: string): StatusChangeAuditEntry[] => {
    return borrowCascadeService.getAuditLogsByEntity(entityType, entityId);
  }, []);

  const generateAuditReport = useCallback((borrowRecordId: string): string => {
    return borrowCascadeService.generateAuditReport(borrowRecordId);
  }, []);

  const refreshAuditLogs = useCallback(() => {
    setAuditLogs(borrowCascadeService.getAllAuditLogs());
  }, []);

  const canBorrow = useCallback((item: Module | Component, itemType: 'module' | 'component'): { canBorrow: boolean; reason?: string } => {
    if (itemType === 'module') {
      const module = item as Module;
      if (module.status !== '正常') {
        return { canBorrow: false, reason: `模块状态为"${module.status}"，只有"正常"状态的模块才能被借用` };
      }
      if (!module.components || module.components.length === 0) {
        return { canBorrow: false, reason: '模块不包含任何组件，无法借用' };
      }
      const nonNormalComponents = module.components.filter(c => c.status !== '正常');
      if (nonNormalComponents.length > 0) {
        return { canBorrow: false, reason: `模块内有 ${nonNormalComponents.length} 个组件状态不为"正常"` };
      }
      return { canBorrow: true };
    } else {
      const component = item as Component;
      if (component.status !== '正常') {
        return { canBorrow: false, reason: `组件状态为"${component.status}"，只有"正常"状态的组件才能被借用` };
      }
      return { canBorrow: true };
    }
  }, []);

  const canReturn = useCallback((record: BorrowRecord): { canReturn: boolean; reason?: string } => {
    if (record.status !== '借用中') {
      return { canReturn: false, reason: '该记录状态不为"借用中"' };
    }
    return { canReturn: true };
  }, []);

  const getModuleComponentHierarchy = useCallback((moduleId: string): {
    module: Module | undefined;
    components: Component[];
    projectId: string | undefined;
  } => {
    for (const project of projects) {
      const module = project.modules.find(m => m.id === moduleId);
      if (module) {
        return {
          module,
          components: module.components || [],
          projectId: project.id,
        };
      }
    }
    return { module: undefined, components: [], projectId: undefined };
  }, [projects]);

  return {
    isProcessing,
    lastOperation,
    auditLogs,
    operator,
    executeBorrow,
    executeReturn,
    getAuditLogsByRecord,
    getAuditLogsByEntity,
    generateAuditReport,
    refreshAuditLogs,
    canBorrow,
    canReturn,
    getModuleById,
    getComponentById,
    findModuleForComponent,
    getModuleComponentHierarchy,
  };
}
