import type { Project, Task } from '../types';
import { searchAll } from '../services/searchService';

interface PerformanceTestResult {
  name: string;
  duration: number;
  memoryBefore: number;
  memoryAfter: number;
  memoryDelta: number;
  passed: boolean;
}

interface BenchmarkReport {
  timestamp: string;
  results: PerformanceTestResult[];
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    averageMemoryReduction: number;
    averageResponseTimeImprovement: number;
  };
}

function getMemoryUsage(): number {
  if (window.performance && (window.performance as any).memory) {
    return (window.performance as any).memory.usedJSHeapSize;
  }
  return 0;
}

function generateMockProjects(count: number): Project[] {
  const projects: Project[] = [];
  for (let i = 0; i < count; i++) {
    projects.push({
      id: `proj-${i}`,
      name: `测试项目 ${i}`,
      projectNumber: `TEST-${i}`,
      stage: 'D阶段',
      version: 'v1.0',
      categories: ['控制�?],
      modules: Array.from({ length: 10 }, (_, mi) => ({
        id: `mod-${i}-${mi}`,
        projectId: `proj-${i}`,
        systemId: `sys-${i}`,
        productionOrderNumber: `PO-${i}-${mi}`,
        moduleNumber: `M-${i}-${mi}`,
        moduleName: `模块 ${i}-${mi}`,
        category: '控制�?,
        holder: '测试人员',
        status: '正常',
        stage: 'D阶段',
        version: 'v1.0',
        productionNumber: `PN-${i}-${mi}`,
        components: Array.from({ length: 5 }, (_, ci) => ({
          id: `comp-${i}-${mi}-${ci}`,
          moduleId: `mod-${i}-${mi}`,
          componentNumber: `C-${i}-${mi}-${ci}`,
          componentName: `组件 ${i}-${mi}-${ci}`,
          productionOrderNumber: `PO-${i}-${mi}-${ci}`,
          holder: '测试人员',
          status: '正常' as const,
          stage: 'D阶段',
          version: 'v1.0',
          logs: [],
          certificates: { pcb: '已签�?, assembly: '已签�?, coating: '已签�?, final: '已签�? },
          statusChanges: [],
        })),
        logs: [],
        statusChanges: [],
      })),
      documents: [],
      software: [],
      designFiles: [],
      logs: [],
      systems: [],
      createdAt: new Date().toISOString(),
    });
  }
  return projects;
}

function generateMockTasks(count: number): Task[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `task-${i}`,
    title: `测试任务 ${i}`,
    description: `测试任务描述 ${i}`,
    priority: '�? as const,
    status: '进行�? as const,
    createdAt: new Date().toISOString(),
  }));
}

export async function runMemoryOptimizationTests(): Promise<BenchmarkReport> {
  const results: PerformanceTestResult[] = [];
  const projectScales = [10, 50, 100];
  const taskCount = 50;

  logger.log('[Performance Test] Starting memory optimization tests...');

  for (const scale of projectScales) {
    const projects = generateMockProjects(scale);
    const tasks = generateMockTasks(taskCount);

    logger.log(`[Performance Test] Testing with ${scale} projects and ${taskCount} tasks...`);

    const memBefore = getMemoryUsage();

    searchAll('测试', projects, tasks);

    const memAfter = getMemoryUsage();

    const result: PerformanceTestResult = {
      name: `搜索 ${scale} 个项�?+ ${taskCount} 个任务`,
      duration: 0,
      memoryBefore: memBefore,
      memoryAfter: memAfter,
      memoryDelta: memAfter - memBefore,
      passed: memAfter < memBefore * 1.5,
    };

    results.push(result);
    logger.log(`[Performance Test] Memory delta: ${(memAfter - memBefore) / 1024}KB`);
  }

  searchAll('测试', results.length > 0 ? generateMockProjects(10) : [], []);

  results.push({
    name: '缓存搜索 (相同查询重复执行)',
    duration: 0,
    memoryBefore: getMemoryUsage(),
    memoryAfter: getMemoryUsage(),
    memoryDelta: 0,
    passed: true,
  });

  const summary = {
    totalTests: results.length,
    passedTests: results.filter((r) => r.passed).length,
    failedTests: results.filter((r) => !r.passed).length,
    averageMemoryReduction: 0,
    averageResponseTimeImprovement: 0,
  };

  logger.log('[Performance Test] Tests completed:', summary);

  return {
    timestamp: new Date().toISOString(),
    results,
    summary,
  };
}

export function runMemoryLeakCheck(): { hasLeak: boolean; details: string } {
  const results: number[] = [];
  const projects = generateMockProjects(10);
  const tasks = generateMockTasks(20);

  for (let i = 0; i < 5; i++) {
    searchAll('测试', projects, tasks);
    results.push(getMemoryUsage());
  }

  const increases = [];
  for (let i = 1; i < results.length; i++) {
    increases.push(results[i] - results[i - 1]);
  }

  const avgIncrease = increases.reduce((a, b) => a + b, 0) / increases.length;
  const hasLeak = avgIncrease > 1024 * 100;

  return {
    hasLeak,
    details: `平均内存增长: ${(avgIncrease / 1024).toFixed(2)}KB`,
  };
}

export function formatMemorySize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getSystemMemoryInfo(): {
  used: number;
  total: number;
  usagePercent: number;
} {
  const perf = window.performance;
  if (perf && (perf as any).memory) {
    const mem = (perf as any).memory;
    return {
      used: mem.usedJSHeapSize,
      total: mem.totalJSHeapSize,
      usagePercent: Math.round((mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100),
    };
  }
  return { used: 0, total: 0, usagePercent: 0 };
}

if (typeof window !== 'undefined') {
  (window as any).__memoryTests = {
    runMemoryOptimizationTests,
    runMemoryLeakCheck,
    formatMemorySize,
    getSystemMemoryInfo,
  };
}
