import {
  Component,
  Module,
  BorrowRecord,
  StatusChange,
  ComponentLog,
  ModuleLog,
  ComponentStatus,
  ModuleStatus,
} from '../types';

export interface BorrowCascadeResult {
  success: boolean;
  borrowRecordId: string;
  affectedComponents: string[];
  affectedModules: string[];
  errors: string[];
  timestamp: string;
  operator: string;
  reason: string;
}

export interface CascadeOperationResult {
  success: boolean;
  borrowRecordId?: string;
  affectedComponents: string[];
  affectedModules: string[];
  errors: string[];
  message: string;
}

export interface StatusChangeAuditEntry {
  id: string;
  entityType: 'module' | 'component';
  entityId: string;
  entityName: string;
  previousStatus: ComponentStatus | ModuleStatus;
  newStatus: ComponentStatus | ModuleStatus;
  changeReason: string;
  borrowRecordId?: string;
  operator: string;
  timestamp: string;
  parentModuleId?: string;
  parentModuleName?: string;
}

export interface CascadeTransaction {
  id: string;
  type: 'borrow' | 'return';
  borrowRecordId: string;
  startTime: string;
  endTime?: string;
  status: 'pending' | 'completed' | 'failed' | 'rolled_back';
  operations: CascadeOperation[];
  errors: string[];
  operator: string;
  entityId: string;
  entityName: string;
}

export interface CascadeOperation {
  id: string;
  entityType: 'module' | 'component';
  entityId: string;
  entityName: string;
  previousStatus: string;
  newStatus: string;
  timestamp: string;
  success: boolean;
  error?: string;
}

const STATUS_CHANGE_AUDIT_KEY = 'borrow_status_change_audit';

export class BorrowCascadeService {
  private auditCache: StatusChangeAuditEntry[] | null = null;

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private saveAuditToStorage(audit: StatusChangeAuditEntry): void {
    try {
      const existing = this.getAuditFromStorage();
      existing.push(audit);
      localStorage.setItem(STATUS_CHANGE_AUDIT_KEY, JSON.stringify(existing));
      this.auditCache = null;
    } catch (error) {
      console.error('[BorrowCascadeService] Failed to save audit:', error);
    }
  }

  private getAuditFromStorage(): StatusChangeAuditEntry[] {
    if (this.auditCache) return this.auditCache;

    try {
      const stored = localStorage.getItem(STATUS_CHANGE_AUDIT_KEY);
      this.auditCache = stored ? JSON.parse(stored) : [];
      return this.auditCache!;
    } catch {
      this.auditCache = [];
      return this.auditCache;
    }
  }

  validateModuleComponentRelation(module: Module): {
    isValid: boolean;
    componentCount: number;
    components: Component[];
  } {
    return {
      isValid: module.components && module.components.length > 0,
      componentCount: module.components?.length || 0,
      components: module.components || [],
    };
  }

  createBorrowRecord(
    item: Module | Component,
    itemType: 'module' | 'component',
    borrower: string,
    notes: string,
    parentModuleBorrowId?: string,
    expectedReturnDate?: string
  ): BorrowRecord {
    const itemName = itemType === 'module'
      ? (item as Module).moduleName
      : `${(item as Component).componentName} (${(item as Component).componentNumber})`;

    return {
      id: this.generateId(),
      itemType,
      itemId: item.id,
      itemName,
      borrower,
      borrowDate: new Date().toISOString(),
      expectedReturnDate: expectedReturnDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      actualReturnDate: '',
      status: '借用中',
      notes,
      parentModuleBorrowId,
    };
  }

  executeBorrowCascade(
    module: Module,
    borrower: string,
    operator: string,
    reason: string = '模块借用',
    borrowRecordId?: string
  ): BorrowCascadeResult {
    const result: BorrowCascadeResult = {
      success: true,
      borrowRecordId: borrowRecordId || this.generateId(),
      affectedComponents: [],
      affectedModules: [],
      errors: [],
      timestamp: new Date().toISOString(),
      operator,
      reason,
    };

    if (module.status !== '正常') {
      result.errors.push(`模块当前状态为"${module.status}"，只有状态为"正常"的模块才能被借用`);
      result.success = false;
      return result;
    }

    const validation = this.validateModuleComponentRelation(module);
    if (!validation.isValid) {
      result.errors.push('模块不包含任何组件，无法执行借用操作');
      result.success = false;
      return result;
    }

    const componentLogs: ComponentLog[] = [];
    const moduleLogs: ModuleLog[] = [];
    const statusChanges: StatusChange[] = [];

    moduleLogs.push({
      id: this.generateId(),
      action: `借用操作开始: 借用人 ${borrower}`,
      timestamp: new Date().toISOString(),
      userId: operator,
      username: operator,
      details: reason,
    });

    for (const component of validation.components) {
      if (component.status !== '正常') {
        result.errors.push(`组件 "${component.componentName}" 当前状态为 "${component.status}"，无法设置为借用中`);
        result.success = false;
        continue;
      }

      const previousStatus = component.status;
      componentLogs.push({
        id: this.generateId(),
        action: `状态变更: ${previousStatus} -> 借用中 (模块借用, 借用人: ${borrower})`,
        timestamp: new Date().toISOString(),
        userId: operator,
        username: operator,
      });

      statusChanges.push({
        id: this.generateId(),
        fromStatus: previousStatus,
        toStatus: '借用中',
        changedAt: new Date().toISOString(),
        changedBy: operator,
        reason: `随模块 "${module.moduleName}" 借用`,
      });

      result.affectedComponents.push(component.id);
    }

    if (!result.success) {
      result.errors.push('部分组件状态更新失败，事务已回滚');
      return result;
    }

    const moduleStatusChange: StatusChange = {
      id: this.generateId(),
      fromStatus: module.status,
      toStatus: '借用中',
      changedAt: new Date().toISOString(),
      changedBy: operator,
      reason: `模块借用: ${reason}`,
    };
    statusChanges.push(moduleStatusChange);

    result.affectedModules.push(module.id);

    for (const component of validation.components) {
      this.saveAuditToStorage({
        id: this.generateId(),
        entityType: 'component',
        entityId: component.id,
        entityName: component.componentName,
        previousStatus: component.status as ComponentStatus,
        newStatus: '借用中',
        changeReason: `随模块 "${module.moduleName}" 借用`,
        borrowRecordId: result.borrowRecordId,
        operator,
        timestamp: new Date().toISOString(),
        parentModuleId: module.id,
        parentModuleName: module.moduleName,
      });
    }

    this.saveAuditToStorage({
      id: this.generateId(),
      entityType: 'module',
      entityId: module.id,
      entityName: module.moduleName,
      previousStatus: module.status as ModuleStatus,
      newStatus: '借用中',
      changeReason: reason,
      borrowRecordId: result.borrowRecordId,
      operator,
      timestamp: new Date().toISOString(),
    });

    return result;
  }

  executeReturnCascade(
    module: Module,
    newStatus: ComponentStatus | ModuleStatus,
    operator: string,
    reason: string = '模块归还',
    borrowRecordId?: string
  ): BorrowCascadeResult {
    const result: BorrowCascadeResult = {
      success: true,
      borrowRecordId: borrowRecordId || this.generateId(),
      affectedComponents: [],
      affectedModules: [],
      errors: [],
      timestamp: new Date().toISOString(),
      operator,
      reason,
    };

    if (module.status !== '借用中') {
      result.errors.push(`模块当前状态为"${module.status}"，只有状态为"借用中"的模块才能执行归还操作`);
      result.success = false;
      return result;
    }

    const validation = this.validateModuleComponentRelation(module);

    for (const component of validation.components) {
      if (component.status !== '借用中') {
        result.errors.push(`组件 "${component.componentName}" 当前状态为 "${component.status}"，无法归还`);
        result.success = false;
        continue;
      }

      result.affectedComponents.push(component.id);

      this.saveAuditToStorage({
        id: this.generateId(),
        entityType: 'component',
        entityId: component.id,
        entityName: component.componentName,
        previousStatus: component.status as ComponentStatus,
        newStatus: newStatus,
        changeReason: reason,
        borrowRecordId: result.borrowRecordId,
        operator,
        timestamp: new Date().toISOString(),
        parentModuleId: module.id,
        parentModuleName: module.moduleName,
      });
    }

    if (!result.success) {
      return result;
    }

    result.affectedModules.push(module.id);

    this.saveAuditToStorage({
      id: this.generateId(),
      entityType: 'module',
      entityId: module.id,
      entityName: module.moduleName,
      previousStatus: module.status as ModuleStatus,
      newStatus: newStatus,
      changeReason: reason,
      borrowRecordId: result.borrowRecordId,
      operator,
      timestamp: new Date().toISOString(),
    });

    return result;
  }

  getAllAuditLogs(): StatusChangeAuditEntry[] {
    return this.getAuditFromStorage();
  }

  getAuditLogs(
    filters?: {
      entityType?: 'module' | 'component';
      entityId?: string;
      startDate?: string;
      endDate?: string;
      operator?: string;
      borrowRecordId?: string;
    }
  ): StatusChangeAuditEntry[] {
    let auditLogs = this.getAuditFromStorage();

    if (filters) {
      if (filters.entityType) {
        auditLogs = auditLogs.filter(log => log.entityType === filters.entityType);
      }
      if (filters.entityId) {
        auditLogs = auditLogs.filter(log => log.entityId === filters.entityId);
      }
      if (filters.startDate) {
        auditLogs = auditLogs.filter(log => log.timestamp >= filters.startDate!);
      }
      if (filters.endDate) {
        auditLogs = auditLogs.filter(log => log.timestamp <= filters.endDate!);
      }
      if (filters.operator) {
        auditLogs = auditLogs.filter(log => log.operator.includes(filters.operator!));
      }
      if (filters.borrowRecordId) {
        auditLogs = auditLogs.filter(log => log.borrowRecordId === filters.borrowRecordId);
      }
    }

    return auditLogs.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  getAuditLogsByEntity(entityType: 'module' | 'component', entityId: string): StatusChangeAuditEntry[] {
    return this.getAuditLogs({ entityType, entityId });
  }

  getAuditLogsByBorrowRecord(borrowRecordId: string): StatusChangeAuditEntry[] {
    return this.getAuditLogs({ borrowRecordId });
  }

  getAuditSummary(borrowRecordId?: string): {
    totalChanges: number;
    moduleChanges: number;
    componentChanges: number;
    operators: string[];
    timeRange: { start: string; end: string } | null;
  } {
    const logs = borrowRecordId ? this.getAuditLogsByBorrowRecord(borrowRecordId) : this.getAuditFromStorage();

    return {
      totalChanges: logs.length,
      moduleChanges: logs.filter(l => l.entityType === 'module').length,
      componentChanges: logs.filter(l => l.entityType === 'component').length,
      operators: [...new Set(logs.map(l => l.operator))],
      timeRange: logs.length > 0
        ? {
            start: logs[logs.length - 1].timestamp,
            end: logs[0].timestamp,
          }
        : null,
    };
  }

  clearAuditLogs(beforeDate?: string): number {
    try {
      const existing = this.getAuditFromStorage();
      let filtered = existing;

      if (beforeDate) {
        filtered = existing.filter(log => log.timestamp > beforeDate);
      } else {
        filtered = [];
      }

      localStorage.setItem(STATUS_CHANGE_AUDIT_KEY, JSON.stringify(filtered));
      this.auditCache = null;

      return existing.length - filtered.length;
    } catch (error) {
      console.error('[BorrowCascadeService] Failed to clear audit logs:', error);
      return 0;
    }
  }

  generateAuditReport(borrowRecordId: string): string {
    const logs = this.getAuditLogsByBorrowRecord(borrowRecordId);
    const summary = this.getAuditSummary(borrowRecordId);

    if (logs.length === 0) {
      return `借用记录 ${borrowRecordId} 未找到状态变更审计日志`;
    }

    const lines: string[] = [];
    lines.push('='.repeat(60));
    lines.push('借用状态变更审计报告');
    lines.push('='.repeat(60));
    lines.push(`借用记录ID: ${borrowRecordId}`);
    lines.push(`生成时间: ${new Date().toLocaleString('zh-CN')}`);
    lines.push('');
    lines.push('变更汇总:');
    lines.push(`  - 总变更数: ${summary.totalChanges}`);
    lines.push(`  - 模块变更: ${summary.moduleChanges}`);
    lines.push(`  - 组件变更: ${summary.componentChanges}`);
    lines.push(`  - 操作人员: ${summary.operators.join(', ')}`);
    if (summary.timeRange) {
      lines.push(`  - 时间范围: ${new Date(summary.timeRange.start).toLocaleString('zh-CN')} ~ ${new Date(summary.timeRange.end).toLocaleString('zh-CN')}`);
    }
    lines.push('');
    lines.push('变更明细:');

    const moduleLogs = logs.filter(l => l.entityType === 'module');
    const componentLogs = logs.filter(l => l.entityType === 'component');

    moduleLogs.forEach(log => {
      lines.push(`  [模块] ${log.entityName}`);
      lines.push(`    状态: ${log.previousStatus} -> ${log.newStatus}`);
      lines.push(`    原因: ${log.changeReason}`);
      lines.push(`    操作人: ${log.operator}`);
      lines.push(`    时间: ${new Date(log.timestamp).toLocaleString('zh-CN')}`);
    });

    componentLogs.forEach(log => {
      lines.push(`  [组件] ${log.entityName} (模块: ${log.parentModuleName || 'N/A'})`);
      lines.push(`    状态: ${log.previousStatus} -> ${log.newStatus}`);
      lines.push(`    原因: ${log.changeReason}`);
      lines.push(`    操作人: ${log.operator}`);
      lines.push(`    时间: ${new Date(log.timestamp).toLocaleString('zh-CN')}`);
    });

    lines.push('='.repeat(60));

    return lines.join('\n');
  }

  createTransactionRecord(
    type: 'borrow' | 'return',
    borrowRecordId: string,
    entity: Module,
    operator: string
  ): CascadeTransaction {
    return {
      id: this.generateId(),
      type,
      borrowRecordId,
      startTime: new Date().toISOString(),
      status: 'pending',
      operations: [],
      errors: [],
      operator,
      entityId: entity.id,
      entityName: entity.moduleName,
    };
  }

  updateTransactionRecord(
    transaction: CascadeTransaction,
    operation: CascadeOperation
  ): CascadeTransaction {
    return {
      ...transaction,
      operations: [...transaction.operations, operation],
      errors: operation.error ? [...transaction.errors, operation.error] : transaction.errors,
    };
  }

  completeTransaction(transaction: CascadeTransaction, success: boolean): CascadeTransaction {
    return {
      ...transaction,
      endTime: new Date().toISOString(),
      status: success ? 'completed' : 'failed',
    };
  }
}

export const borrowCascadeService = new BorrowCascadeService();
export default borrowCascadeService;
