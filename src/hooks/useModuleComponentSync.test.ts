import { describe, it, expect } from 'vitest';
import { borrowCascadeService } from '../services/borrowCascadeService';
import { Module, Component } from '../types';

describe('borrowCascadeService', () => {
  describe('validateModuleComponentRelation', () => {
    it('应该验证包含组件的模块为有效', () => {
      const module: Module = {
        id: 'mod-001',
        moduleNumber: 'M-TEST-001',
        moduleName: '测试模块',
        systemId: 'sys-001',
        systemName: '测试系统',
        category: '控制类',
        phase: 'D阶段',
        version: 'v1.0',
        status: '正常',
        borrower: undefined,
        components: [
          {
            id: 'comp-001',
            componentNumber: 'C-001',
            componentName: '组件1',
            moduleId: 'mod-001',
            status: '正常',
            borrower: undefined,
            logs: [],
          },
        ],
        logs: [],
      };

      const result = borrowCascadeService.validateModuleComponentRelation(module);

      expect(result.isValid).toBe(true);
      expect(result.componentCount).toBe(1);
      expect(result.components.length).toBe(1);
    });

    it('应该验证不包含组件的模块为无效', () => {
      const module: Module = {
        id: 'mod-002',
        moduleNumber: 'M-TEST-002',
        moduleName: '空模块',
        systemId: 'sys-001',
        systemName: '测试系统',
        category: '控制类',
        phase: 'D阶段',
        version: 'v1.0',
        status: '未投产',
        borrower: undefined,
        components: [],
        logs: [],
      };

      const result = borrowCascadeService.validateModuleComponentRelation(module);

      expect(result.isValid).toBe(false);
      expect(result.componentCount).toBe(0);
      expect(result.components.length).toBe(0);
    });
  });

  describe('executeBorrowCascade', () => {
    it('不应该借用非"正常"状态的模块', () => {
      const module: Module = {
        id: 'mod-001',
        moduleNumber: 'M-TEST-001',
        moduleName: '测试模块',
        systemId: 'sys-001',
        systemName: '测试系统',
        category: '控制类',
        phase: 'D阶段',
        version: 'v1.0',
        status: '维修中',
        borrower: undefined,
        components: [
          {
            id: 'comp-001',
            componentNumber: 'C-001',
            componentName: '组件1',
            moduleId: 'mod-001',
            status: '正常',
            borrower: undefined,
            logs: [],
          },
        ],
        logs: [],
      };

      const result = borrowCascadeService.executeBorrowCascade(
        module,
        '测试用户',
        '操作员',
        '测试借用'
      );

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('维修中');
    });

    it('不应该借用包含非"正常"状态组件的模块', () => {
      const module: Module = {
        id: 'mod-001',
        moduleNumber: 'M-TEST-001',
        moduleName: '测试模块',
        systemId: 'sys-001',
        systemName: '测试系统',
        category: '控制类',
        phase: 'D阶段',
        version: 'v1.0',
        status: '正常',
        borrower: undefined,
        components: [
          {
            id: 'comp-001',
            componentNumber: 'C-001',
            componentName: '组件1',
            moduleId: 'mod-001',
            status: '借用中',
            borrower: '其他用户',
            logs: [],
          },
          {
            id: 'comp-002',
            componentNumber: 'C-002',
            componentName: '组件2',
            moduleId: 'mod-001',
            status: '正常',
            borrower: undefined,
            logs: [],
          },
        ],
        logs: [],
      };

      const result = borrowCascadeService.executeBorrowCascade(
        module,
        '测试用户',
        '操作员',
        '测试借用'
      );

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('不应该借用不包含组件的模块', () => {
      const module: Module = {
        id: 'mod-002',
        moduleNumber: 'M-TEST-002',
        moduleName: '空模块',
        systemId: 'sys-001',
        systemName: '测试系统',
        category: '控制类',
        phase: 'D阶段',
        version: 'v1.0',
        status: '正常',
        borrower: undefined,
        components: [],
        logs: [],
      };

      const result = borrowCascadeService.executeBorrowCascade(
        module,
        '测试用户',
        '操作员',
        '测试借用'
      );

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('不包含任何组件');
    });
  });

  describe('executeReturnCascade', () => {
    it('不应该归还非"借用中"状态的模块', () => {
      const module: Module = {
        id: 'mod-001',
        moduleNumber: 'M-TEST-001',
        moduleName: '测试模块',
        systemId: 'sys-001',
        systemName: '测试系统',
        category: '控制类',
        phase: 'D阶段',
        version: 'v1.0',
        status: '正常',
        borrower: undefined,
        components: [
          {
            id: 'comp-001',
            componentNumber: 'C-001',
            componentName: '组件1',
            moduleId: 'mod-001',
            status: '正常',
            borrower: undefined,
            logs: [],
          },
        ],
        logs: [],
      };

      const result = borrowCascadeService.executeReturnCascade(
        module,
        '正常',
        '操作员',
        '测试归还'
      );

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('借用中');
    });
  });

  describe('getAuditSummary', () => {
    it('应该返回正确的审计汇总', () => {
      const summary = borrowCascadeService.getAuditSummary();

      expect(summary).toHaveProperty('totalChanges');
      expect(summary).toHaveProperty('moduleChanges');
      expect(summary).toHaveProperty('componentChanges');
      expect(summary).toHaveProperty('operators');
      expect(summary).toHaveProperty('timeRange');
      expect(Array.isArray(summary.operators)).toBe(true);
    });
  });

  describe('createBorrowRecord', () => {
    it('应该为模块创建正确的借用记录', () => {
      const module: Module = {
        id: 'mod-001',
        moduleNumber: 'M-TEST-001',
        moduleName: '测试模块',
        systemId: 'sys-001',
        systemName: '测试系统',
        category: '控制类',
        phase: 'D阶段',
        version: 'v1.0',
        status: '正常',
        borrower: undefined,
        components: [],
        logs: [],
      };

      const record = borrowCascadeService.createBorrowRecord(
        module,
        'module',
        '测试用户',
        '测试备注'
      );

      expect(record.itemType).toBe('module');
      expect(record.itemId).toBe('mod-001');
      expect(record.borrower).toBe('测试用户');
      expect(record.status).toBe('借用中');
      expect(record.notes).toBe('测试备注');
    });

    it('应该为组件创建正确的借用记录', () => {
      const component: Component = {
        id: 'comp-001',
        componentNumber: 'C-001',
        componentName: '测试组件',
        moduleId: 'mod-001',
        status: '正常',
        borrower: undefined,
        logs: [],
      };

      const record = borrowCascadeService.createBorrowRecord(
        component,
        'component',
        '测试用户',
        '测试备注',
        'parent-module-id'
      );

      expect(record.itemType).toBe('component');
      expect(record.itemId).toBe('comp-001');
      expect(record.borrower).toBe('测试用户');
      expect(record.status).toBe('借用中');
      expect(record.parentModuleBorrowId).toBe('parent-module-id');
    });
  });
});

describe('状态同步规则测试', () => {
  describe('模块状态计算', () => {
    it('当所有组件状态一致时，模块状态应为该状态', () => {
      const module: Module = {
        id: 'mod-001',
        moduleNumber: 'M-TEST-001',
        moduleName: '测试模块',
        systemId: 'sys-001',
        systemName: '测试系统',
        category: '控制类',
        phase: 'D阶段',
        version: 'v1.0',
        status: '正常',
        borrower: undefined,
        components: [
          {
            id: 'comp-001',
            componentNumber: 'C-001',
            componentName: '组件1',
            moduleId: 'mod-001',
            status: '正常',
            borrower: undefined,
            logs: [],
          },
          {
            id: 'comp-002',
            componentNumber: 'C-002',
            componentName: '组件2',
            moduleId: 'mod-001',
            status: '正常',
            borrower: undefined,
            logs: [],
          },
        ],
        logs: [],
      };

      const validation = borrowCascadeService.validateModuleComponentRelation(module);

      expect(validation.isValid).toBe(true);
      expect(validation.componentCount).toBe(2);

      const allComponentsNormal = validation.components.every(c => c.status === '正常');
      expect(allComponentsNormal).toBe(true);
    });

    it('当组件状态不一致时，模块状态应标记为需要重新计算', () => {
      const module: Module = {
        id: 'mod-001',
        moduleNumber: 'M-TEST-001',
        moduleName: '测试模块',
        systemId: 'sys-001',
        systemName: '测试系统',
        category: '控制类',
        phase: 'D阶段',
        version: 'v1.0',
        status: '借用中',
        borrower: '用户A',
        components: [
          {
            id: 'comp-001',
            componentNumber: 'C-001',
            componentName: '组件1',
            moduleId: 'mod-001',
            status: '借用中',
            borrower: '用户A',
            logs: [],
          },
          {
            id: 'comp-002',
            componentNumber: 'C-002',
            componentName: '组件2',
            moduleId: 'mod-001',
            status: '正常',
            borrower: undefined,
            logs: [],
          },
        ],
        logs: [],
      };

      const validation = borrowCascadeService.validateModuleComponentRelation(module);
      const componentStatuses = validation.components.map(c => c.status);
      const uniqueStatuses = [...new Set(componentStatuses)];

      expect(uniqueStatuses.length).toBeGreaterThan(1);
      expect(module.status).toBe('借用中');
    });

    it('空模块的状态应为"未投产"', () => {
      const module: Module = {
        id: 'mod-002',
        moduleNumber: 'M-TEST-002',
        moduleName: '空模块',
        systemId: 'sys-001',
        systemName: '测试系统',
        category: '控制类',
        phase: 'D阶段',
        version: 'v1.0',
        status: '未投产',
        borrower: undefined,
        components: [],
        logs: [],
      };

      expect(module.components.length).toBe(0);
      expect(module.status).toBe('未投产');
    });
  });

  describe('借用操作状态传播', () => {
    it('模块借用应该影响所有组件状态', () => {
      const module: Module = {
        id: 'mod-001',
        moduleNumber: 'M-TEST-001',
        moduleName: '测试模块',
        systemId: 'sys-001',
        systemName: '测试系统',
        category: '控制类',
        phase: 'D阶段',
        version: 'v1.0',
        status: '正常',
        borrower: undefined,
        components: [
          {
            id: 'comp-001',
            componentNumber: 'C-001',
            componentName: '组件1',
            moduleId: 'mod-001',
            status: '正常',
            borrower: undefined,
            logs: [],
          },
          {
            id: 'comp-002',
            componentNumber: 'C-002',
            componentName: '组件2',
            moduleId: 'mod-001',
            status: '正常',
            borrower: undefined,
            logs: [],
          },
          {
            id: 'comp-003',
            componentNumber: 'C-003',
            componentName: '组件3',
            moduleId: 'mod-001',
            status: '正常',
            borrower: undefined,
            logs: [],
          },
        ],
        logs: [],
      };

      const result = borrowCascadeService.executeBorrowCascade(
        module,
        '测试用户',
        '操作员',
        '测试借用'
      );

      expect(result.success).toBe(true);
      expect(result.affectedComponents.length).toBe(3);
      expect(result.affectedModules.length).toBe(1);
    });
  });
});
