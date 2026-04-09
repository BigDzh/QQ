import { describe, it, expect, beforeEach } from 'vitest';
import { DuplicateTaskService } from '../services/duplicateTaskService';
import type { Task } from '../types/duplicateTask';

describe('DuplicateTaskService', () => {
  let service: DuplicateTaskService;

  const createMockTask = (overrides: Partial<Task> = {}): Task => ({
    id: `task-${Math.random().toString(36).substr(2, 9)}`,
    title: '测试任务',
    description: '测试描述',
    priority: '中',
    status: '进行中',
    projectId: 'project-001',
    projectName: '测试项目',
    createdAt: new Date().toISOString(),
    ...overrides,
  });

  beforeEach(() => {
    localStorage.clear();
    service = new DuplicateTaskService();
  });

  describe('Fault Task Time Window', () => {
    it('应该返回默认时间窗口（30分钟）', () => {
      expect(service.getFaultTaskTimeWindow()).toBe(30);
    });

    it('应该正确设置时间窗口', () => {
      service.setFaultTaskTimeWindow(60);
      expect(service.getFaultTaskTimeWindow()).toBe(60);
    });

    it('应该拒绝小于1分钟的时间窗口', () => {
      service.setFaultTaskTimeWindow(0);
      expect(service.getFaultTaskTimeWindow()).toBe(1);
    });
  });

  describe('registerFaultTask', () => {
    it('应该正确注册故障任务记录', () => {
      service.registerFaultTask('component-fault', 'C-001', 'task-123', '组件1 (C-001) 故障处理');
      const result = service.checkFaultTaskDuplicate('component-fault', 'C-001');
      expect(result.isDuplicate).toBe(true);
      expect(result.existingTaskId).toBe('task-123');
      expect(result.existingTaskTitle).toBe('组件1 (C-001) 故障处理');
    });

    it('应该更新已存在的故障任务记录', () => {
      service.registerFaultTask('component-fault', 'C-001', 'task-123', '组件1 (C-001) 故障处理');
      service.registerFaultTask('component-fault', 'C-001', 'task-456', '组件1 (C-001) 故障处理（新）');
      const result = service.checkFaultTaskDuplicate('component-fault', 'C-001');
      expect(result.isDuplicate).toBe(true);
      expect(result.existingTaskId).toBe('task-456');
      expect(result.existingTaskTitle).toBe('组件1 (C-001) 故障处理（新）');
    });

    it('不同故障类型应该独立记录', () => {
      service.registerFaultTask('component-fault', 'C-001', 'task-1', '组件任务');
      service.registerFaultTask('module-fault', 'C-001', 'task-2', '模块任务');
      const componentResult = service.checkFaultTaskDuplicate('component-fault', 'C-001');
      const moduleResult = service.checkFaultTaskDuplicate('module-fault', 'C-001');
      expect(componentResult.isDuplicate).toBe(true);
      expect(componentResult.existingTaskId).toBe('task-1');
      expect(moduleResult.isDuplicate).toBe(true);
      expect(moduleResult.existingTaskId).toBe('task-2');
    });
  });

  describe('checkFaultTaskDuplicate', () => {
    it('应该返回非重复当没有记录存在', () => {
      const result = service.checkFaultTaskDuplicate('component-fault', 'C-999');
      expect(result.isDuplicate).toBe(false);
      expect(result.existingTaskId).toBeUndefined();
    });

    it('应该正确识别重复任务', () => {
      service.registerFaultTask('component-fault', 'C-001', 'task-123', '组件1 (C-001) 故障处理');
      const result = service.checkFaultTaskDuplicate('component-fault', 'C-001');
      expect(result.isDuplicate).toBe(true);
      expect(result.existingTaskId).toBe('task-123');
      expect(result.record).toBeDefined();
    });

    it('应该支持所有故障类型', () => {
      service.registerFaultTask('module-fault', 'M-001', 'task-m', '模块故障');
      service.registerFaultTask('software-incomplete', 'S-001', 'task-s', '软件任务');
      service.registerFaultTask('document-incomplete', 'D-001', 'task-d', '文档任务');
      expect(service.checkFaultTaskDuplicate('module-fault', 'M-001').isDuplicate).toBe(true);
      expect(service.checkFaultTaskDuplicate('software-incomplete', 'S-001').isDuplicate).toBe(true);
      expect(service.checkFaultTaskDuplicate('document-incomplete', 'D-001').isDuplicate).toBe(true);
    });
  });

  describe('logDuplicateInterception', () => {
    it('应该正确记录重复拦截日志', () => {
      const log = service.logDuplicateInterception(
        'component-fault',
        'C-001',
        '组件1 (C-001) 故障处理',
        'existing-task-id',
        '已存在任务',
        '测试原因'
      );
      expect(log.id).toBeDefined();
      expect(log.timestamp).toBeDefined();
      expect(log.faultType).toBe('component-fault');
      expect(log.faultId).toBe('C-001');
      expect(log.attemptedTaskTitle).toBe('组件1 (C-001) 故障处理');
      expect(log.existingTaskId).toBe('existing-task-id');
      expect(log.existingTaskTitle).toBe('已存在任务');
      expect(log.timeWindowMinutes).toBe(30);
      expect(log.reason).toBe('测试原因');
    });

    it('应该返回最新的日志记录', () => {
      service.logDuplicateInterception('component-fault', 'C-001', '任务1', 'id1', '已存在1', '原因1');
      service.logDuplicateInterception('component-fault', 'C-002', '任务2', 'id2', '已存在2', '原因2');
      const logs = service.getDuplicateInterceptionLogs();
      expect(logs.length).toBe(2);
      expect(logs[0].faultId).toBe('C-002');
    });

    it('应该限制日志数量', () => {
      for (let i = 0; i < 600; i++) {
        service.logDuplicateInterception('component-fault', `C-${i}`, `任务${i}`, `id${i}`, `已存在${i}`, `原因${i}`);
      }
      const logs = service.getDuplicateInterceptionLogs();
      expect(logs.length).toBeLessThanOrEqual(100);
    });

    it('应该清空日志', () => {
      service.logDuplicateInterception('component-fault', 'C-001', '任务1', 'id1', '已存在1', '原因1');
      service.clearDuplicateInterceptionLogs();
      const logs = service.getDuplicateInterceptionLogs();
      expect(logs.length).toBe(0);
    });
  });

  describe('checkDuplicate (existing functionality)', () => {
    it('当没有启用规则时应该返回非重复', () => {
      const task = createMockTask({ title: '新任务' });
      const result = service.checkDuplicate(task);
      expect(result.isDuplicate).toBe(false);
    });

    it('当存在匹配任务时应该返回重复', () => {
      const existingTask = createMockTask({
        id: 'existing-1',
        title: '模块A (M-001) 故障处理',
        status: '进行中',
      });
      service.updateTaskCache([existingTask]);

      service.createRule({
        name: '故障任务规则',
        enabled: true,
        matchFields: ['title'],
        matchFieldsOperator: 'or',
        duplicateCountThreshold: 2,
        timeWindowDays: 30,
      });

      const newTask = createMockTask({
        title: '模块A (M-001) 故障处理',
      });
      const result = service.checkDuplicate(newTask);
      expect(result.isDuplicate).toBe(true);
      expect(result.duplicateTask).toBeDefined();
    });
  });

  describe('updateTaskCache', () => {
    it('应该正确更新任务缓存', () => {
      const tasks = [
        createMockTask({ id: 'task-1', title: '任务1' }),
        createMockTask({ id: 'task-2', title: '任务2' }),
      ];
      service.updateTaskCache(tasks);
      const result = service.checkDuplicate(createMockTask({ title: '任务3' }));
      expect(result.isDuplicate).toBe(false);
    });
  });

  describe('规则管理', () => {
    it('应该正确创建规则', () => {
      const rule = service.createRule({ name: '新规则' });
      expect(rule.id).toBeDefined();
      expect(rule.name).toBe('新规则');
      expect(rule.enabled).toBe(true);
    });

    it('应该正确获取规则列表', () => {
      service.createRule({ name: '规则1' });
      service.createRule({ name: '规则2' });
      const rules = service.getRules();
      expect(rules.length).toBe(2);
    });

    it('应该正确删除规则', () => {
      const rule = service.createRule({ name: '待删除规则' });
      const deleted = service.deleteRule(rule.id);
      expect(deleted).toBe(true);
      expect(service.getRules().length).toBe(0);
    });

    it('应该正确切换规则状态', () => {
      const rule = service.createRule({ name: '切换规则' });
      expect(rule.enabled).toBe(true);
      service.toggleRule(rule.id);
      const updatedRule = service.getRule(rule.id);
      expect(updatedRule?.enabled).toBe(false);
    });
  });

  describe('高并发场景模拟', () => {
    it('应该处理多个并发注册请求', () => {
      const results: boolean[] = [];
      for (let i = 0; i < 10; i++) {
        service.registerFaultTask('component-fault', `C-${i % 3}`, `task-${i}`, `任务${i}`);
      }
      for (let i = 0; i < 3; i++) {
        const result = service.checkFaultTaskDuplicate('component-fault', `C-${i}`);
        results.push(result.isDuplicate);
      }
      expect(results.every(r => r === true)).toBe(true);
    });

    it('应该在时间窗口内阻止重复创建', () => {
      service.setFaultTaskTimeWindow(5);
      service.registerFaultTask('component-fault', 'C-001', 'task-1', '任务1');
      const check1 = service.checkFaultTaskDuplicate('component-fault', 'C-001');
      expect(check1.isDuplicate).toBe(true);
      service.registerFaultTask('component-fault', 'C-001', 'task-2', '任务2');
      const check2 = service.checkFaultTaskDuplicate('component-fault', 'C-001');
      expect(check2.isDuplicate).toBe(true);
      expect(check2.existingTaskId).toBe('task-2');
    });
  });
});

describe('DuplicateTaskService 防重复机制集成测试', () => {
  let service: DuplicateTaskService;

  beforeEach(() => {
    service = new DuplicateTaskService();
  });

  describe('完整防重复流程', () => {
    it('应该能够检测并阻止重复任务创建', () => {
      const faultType = 'component-fault';
      const faultId = 'C-TEST-001';
      const taskTitle = `组件测试 (${faultId}) 故障处理`;

      const firstCheck = service.checkFaultTaskDuplicate(faultType, faultId);
      expect(firstCheck.isDuplicate).toBe(false);

      service.registerFaultTask(faultType, faultId, 'task-new-001', taskTitle);

      const secondCheck = service.checkFaultTaskDuplicate(faultType, faultId);
      expect(secondCheck.isDuplicate).toBe(true);
      expect(secondCheck.existingTaskId).toBe('task-new-001');

      service.logDuplicateInterception(
        faultType,
        faultId,
        taskTitle,
        secondCheck.existingTaskId!,
        secondCheck.existingTaskTitle!,
        '测试阻止重复任务'
      );

      const logs = service.getDuplicateInterceptionLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].reason).toBe('测试阻止重复任务');
    });

    it('应该正确处理跨故障类型的重复检测', () => {
      service.registerFaultTask('component-fault', 'C-001', 'task-1', '组件任务');
      service.registerFaultTask('module-fault', 'C-001', 'task-2', '模块任务');

      const componentResult = service.checkFaultTaskDuplicate('component-fault', 'C-001');
      const moduleResult = service.checkFaultTaskDuplicate('module-fault', 'C-001');

      expect(componentResult.isDuplicate).toBe(true);
      expect(moduleResult.isDuplicate).toBe(true);
      expect(componentResult.existingTaskId).not.toBe(moduleResult.existingTaskId);
    });

    it('应该正确配置时间窗口', () => {
      const timeWindow = 15;
      service.setFaultTaskTimeWindow(timeWindow);
      expect(service.getFaultTaskTimeWindow()).toBe(timeWindow);
    });
  });
});
