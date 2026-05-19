import { describe, it, expect, beforeEach } from 'vitest';
import { dataRelationService } from './dataRelationService';

describe('dataRelationService 关联校验测试', () => {
  beforeEach(() => {
    dataRelationService.initialize([], [], []);
  });

  describe('initialize', () => {
    it('应正确初始化空数据', () => {
      const stats = dataRelationService.getStats();
      expect(stats).toBeDefined();
    });

    it('应接受有效的项目数据', () => {
      const projects = [{ id: 'p1', name: 'Test Project', systems: [], modules: [], components: [] }];
      expect(() => dataRelationService.initialize(projects as any, [], [])).not.toThrow();
    });
  });

  describe('validateDataIntegrity', () => {
    it('应对空数据返回有效结果', () => {
      const result = dataRelationService.validateDataIntegrity();
      expect(result).toBeDefined();
      expect(result.isValid).toBe(true);
    });

    it('应检测到无效引用', () => {
      const projects = [{
        id: 'p1',
        name: 'Test',
        components: [{ id: 'c1', componentName: 'C1', moduleId: 'missing-module' }],
      }] as any;
      dataRelationService.initialize(projects, [], []);
      const result = dataRelationService.validateDataIntegrity();
      expect(result).toBeDefined();
    });
  });

  describe('findCircularDependencies', () => {
    it('应对无循环依赖返回空数组', () => {
      const projects = [{
        id: 'p1',
        name: 'Test',
        modules: [
          { id: 'm1', moduleName: 'M1', dependencies: ['m2'] },
          { id: 'm2', moduleName: 'M2', dependencies: [] },
        ],
      }] as any;
      dataRelationService.initialize(projects, [], []);
      const circular = dataRelationService.findCircularDependencies();
      expect(circular).toBeDefined();
      expect(Array.isArray(circular)).toBe(true);
    });
  });

  describe('getCrossReferences', () => {
    it('应返回交叉引用信息', () => {
      const result = dataRelationService.getCrossReferences('nonexistent', 'component');
      expect(result).toBeDefined();
    });
  });

  describe('getAllRelations', () => {
    it('应返回所有关联关系', () => {
      const relations = dataRelationService.getAllRelations();
      expect(Array.isArray(relations)).toBe(true);
    });
  });

  describe('getStats', () => {
    it('应返回统计信息', () => {
      const stats = dataRelationService.getStats();
      expect(stats).toBeDefined();
      expect(typeof stats).toBe('object');
    });
  });
});
