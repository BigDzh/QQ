import { Component, Module, System, ComponentStatus, ModuleStatus, SystemStatus } from '../types';

export type HealthLevel = 'critical' | 'warning' | 'normal';

export interface ComponentHealth {
  componentId: string;
  componentNumber: string;
  componentName: string;
  status: ComponentStatus;
  healthLevel: HealthLevel;
  isHealthy: boolean;
}

export interface ModuleHealth {
  moduleId: string;
  moduleName: string;
  moduleNumber: string;
  status: ModuleStatus;
  healthLevel: HealthLevel;
  isHealthy: boolean;
  componentCount: number;
  healthyComponentCount: number;
  components: ComponentHealth[];
  abnormalComponents: ComponentHealth[];
}

export interface SystemHealth {
  systemId: string;
  systemName: string;
  systemNumber: string;
  status: SystemStatus;
  healthLevel: HealthLevel;
  isHealthy: boolean;
  moduleCount: number;
  healthyModuleCount: number;
  modules: ModuleHealth[];
  abnormalModules: ModuleHealth[];
}

export interface ProjectHealth {
  projectId: string;
  projectName: string;
  healthLevel: HealthLevel;
  isHealthy: boolean;
  systemCount: number;
  healthySystemCount: number;
  moduleCount: number;
  healthyModuleCount: number;
  componentCount: number;
  healthyComponentCount: number;
  systems: SystemHealth[];
  abnormalSystems: SystemHealth[];
}

export interface StatusEvaluationResult {
  isHealthy: boolean;
  healthLevel: HealthLevel;
  timestamp: number;
  componentHealth: ComponentHealth[];
  moduleHealth: ModuleHealth[];
  systemHealth: SystemHealth[];
  abnormalComponents: ComponentHealth[];
  abnormalModules: ModuleHealth[];
  abnormalSystems: SystemHealth[];
  breadcrumb: AbnormalBreadcrumb[];
}

export interface AbnormalBreadcrumb {
  level: 'system' | 'module' | 'component';
  id: string;
  name: string;
  status: string;
  healthLevel: HealthLevel;
  cause?: string;
  children?: AbnormalBreadcrumb[];
}

const STATUS_HEALTH_MAP: Record<ComponentStatus, { healthLevel: HealthLevel; isHealthy: boolean }> = {
  '正常': { healthLevel: 'normal', isHealthy: true },
  '故障': { healthLevel: 'critical', isHealthy: false },
  '维修中': { healthLevel: 'warning', isHealthy: false },
  '三防中': { healthLevel: 'warning', isHealthy: false },
  '测试中': { healthLevel: 'warning', isHealthy: false },
  '仿真中': { healthLevel: 'warning', isHealthy: false },
  '借用中': { healthLevel: 'warning', isHealthy: false },
  '投产中': { healthLevel: 'warning', isHealthy: false },
  '未投产': { healthLevel: 'normal', isHealthy: true },
};

const STATUS_PRIORITY: Record<string, number> = {
  '故障': 1,
  '维修中': 2,
  '三防中': 3,
  '测试中': 4,
  '投产中': 5,
  '仿真中': 6,
  '借用中': 7,
  '正常': 8,
  '未投产': 9,
};

export function getComponentHealth(component: Component): ComponentHealth {
  const mapping = STATUS_HEALTH_MAP[component.status];
  return {
    componentId: component.id,
    componentNumber: component.componentNumber,
    componentName: component.componentName,
    status: component.status,
    healthLevel: mapping.healthLevel,
    isHealthy: mapping.isHealthy,
  };
}

export function evaluateModuleHealth(modules: Module[], targetModuleId?: string): ModuleHealth | null {
  const targetModule = modules.find(m => m.id === targetModuleId);
  if (!targetModule) return null;

  const componentHealths = targetModule.components.map(getComponentHealth);
  const abnormalComponents = componentHealths.filter(c => !c.isHealthy);

  const allHealthy = componentHealths.length > 0 && abnormalComponents.length === 0;
  const hasCritical = abnormalComponents.some(c => c.healthLevel === 'critical');

  let healthLevel: HealthLevel = 'normal';
  if (!allHealthy) {
    healthLevel = hasCritical ? 'critical' : 'warning';
  }

  const moduleStatus = calculateModuleStatusFromComponents(targetModule.components);

  return {
    moduleId: targetModule.id,
    moduleName: targetModule.moduleName,
    moduleNumber: targetModule.moduleNumber,
    status: moduleStatus,
    healthLevel,
    isHealthy: allHealthy,
    componentCount: targetModule.components.length,
    healthyComponentCount: componentHealths.length - abnormalComponents.length,
    components: componentHealths,
    abnormalComponents,
  };
}

export function evaluateSystemHealth(
  modules: Module[],
  systems: System[],
  targetSystemId?: string
): SystemHealth | null {
  const targetSystem = systems.find(s => s.id === targetSystemId);
  if (!targetSystem) return null;

  const systemModules = modules.filter(m => m.systemId === targetSystemId);
  const moduleHealths = systemModules.map(m => evaluateModuleHealth(modules, m.id)).filter(Boolean) as ModuleHealth[];

  const abnormalModules = moduleHealths.filter(m => !m.isHealthy);
  const allHealthy = moduleHealths.length > 0 && abnormalModules.length === 0;
  const hasCritical = abnormalModules.some(m => m.healthLevel === 'critical');

  let healthLevel: HealthLevel = 'normal';
  if (!allHealthy) {
    healthLevel = hasCritical ? 'critical' : 'warning';
  }

  const systemStatus = calculateSystemStatusFromModules(systemModules);

  return {
    systemId: targetSystem.id,
    systemName: targetSystem.systemName,
    systemNumber: targetSystem.systemNumber,
    status: systemStatus,
    healthLevel,
    isHealthy: allHealthy,
    moduleCount: systemModules.length,
    healthyModuleCount: moduleHealths.length - abnormalModules.length,
    modules: moduleHealths,
    abnormalModules,
  };
}

export function evaluateProjectHealth(project: {
  id: string;
  name: string;
  modules: Module[];
  systems: System[];
}): ProjectHealth {
  const modules = project.modules || [];
  const systems = project.systems || [];
  const allModuleHealths = modules.map(m => evaluateModuleHealth(modules, m.id)).filter(Boolean) as ModuleHealth[];
  const allSystemHealths = systems.map(s => evaluateSystemHealth(modules, systems, s.id)).filter(Boolean) as SystemHealth[];

  const abnormalModules = allModuleHealths.filter(m => !m.isHealthy);
  const abnormalSystems = allSystemHealths.filter(s => !s.isHealthy);

  const allModulesHealthy = allModuleHealths.length > 0 && abnormalModules.length === 0;
  const allSystemsHealthy = allSystemHealths.length > 0 && abnormalSystems.length === 0;

  const hasCriticalModule = abnormalModules.some(m => m.healthLevel === 'critical');
  const hasCriticalSystem = abnormalSystems.some(s => s.healthLevel === 'critical');
  const hasWarningModule = abnormalModules.some(m => m.healthLevel === 'warning');
  const hasWarningSystem = abnormalSystems.some(s => s.healthLevel === 'warning');

  let healthLevel: HealthLevel = 'normal';
  if (!allModulesHealthy || !allSystemsHealthy) {
    if (hasCriticalModule || hasCriticalSystem) {
      healthLevel = 'critical';
    } else if (hasWarningModule || hasWarningSystem) {
      healthLevel = 'warning';
    }
  }

  return {
    projectId: project.id,
    projectName: project.name,
    healthLevel,
    isHealthy: allModulesHealthy && allSystemsHealthy,
    systemCount: (project.systems || []).length,
    healthySystemCount: allSystemHealths.length - abnormalSystems.length,
    moduleCount: (project.modules || []).length,
    healthyModuleCount: allModuleHealths.length - abnormalModules.length,
    componentCount: (project.modules || []).reduce((sum, m) => sum + (m.components || []).length, 0),
    healthyComponentCount: allModuleHealths.reduce((sum, m) => sum + m.healthyComponentCount, 0),
    systems: allSystemHealths,
    abnormalSystems,
  };
}

export function evaluateFullStatus(
  project: {
    id: string;
    name: string;
    modules: Module[];
    systems: System[];
  },
  targetSystemId?: string,
  targetModuleId?: string,
  targetComponentId?: string
): StatusEvaluationResult {
  const projectHealth = evaluateProjectHealth(project);

  let abnormalComponents = projectHealth.systems.flatMap(s =>
    s.abnormalModules.flatMap(m => m.abnormalComponents)
  );

  if (targetComponentId) {
    const targetComp = project.modules
      .flatMap(m => m.components)
      .find(c => c.id === targetComponentId);
    if (targetComp) {
      abnormalComponents = [getComponentHealth(targetComp)];
    }
  }

  let abnormalModules = projectHealth.systems.flatMap(s => s.abnormalModules);
  const modules = project.modules || [];
  const systems = project.systems || [];
  if (targetModuleId) {
    const targetMod = modules.find(m => m.id === targetModuleId);
    if (targetMod) {
      const modHealth = evaluateModuleHealth(modules, targetModuleId);
      if (modHealth) {
        abnormalModules = [modHealth];
        abnormalComponents = modHealth.abnormalComponents;
      }
    }
  }

  let abnormalSystems = projectHealth.abnormalSystems;
  if (targetSystemId) {
    const targetSys = systems.find(s => s.id === targetSystemId);
    if (targetSys) {
      const sysHealth = evaluateSystemHealth(modules, systems, targetSystemId);
      if (sysHealth) {
        abnormalSystems = [sysHealth];
        abnormalModules = sysHealth.abnormalModules;
        abnormalComponents = sysHealth.abnormalModules.flatMap(m => m.abnormalComponents);
      }
    }
  }

  const breadcrumb = buildAbnormalBreadcrumb(project, {
    systemId: targetSystemId,
    moduleId: targetModuleId,
    componentId: targetComponentId,
    abnormalSystems,
    abnormalModules,
    abnormalComponents,
  });

  return {
    isHealthy: projectHealth.isHealthy,
    healthLevel: projectHealth.healthLevel,
    timestamp: Date.now(),
    componentHealth: (project.modules || []).flatMap(m => (m.components || []).map(getComponentHealth)),
    moduleHealth: projectHealth.systems.flatMap(s => s.modules),
    systemHealth: projectHealth.systems,
    abnormalComponents,
    abnormalModules,
    abnormalSystems,
    breadcrumb,
  };
}

export function buildAbnormalBreadcrumb(
  project: { modules: Module[]; systems: System[] },
  context: {
    systemId?: string;
    moduleId?: string;
    componentId?: string;
    abnormalSystems: SystemHealth[];
    abnormalModules: ModuleHealth[];
    abnormalComponents: ComponentHealth[];
  }
): AbnormalBreadcrumb[] {
  const breadcrumb: AbnormalBreadcrumb[] = [];
  const modules = project.modules || [];
  const systems = project.systems || [];

  if (context.componentId) {
    const component = modules
      .flatMap(m => (m.components || []))
      .find(c => c.id === context.componentId);
    const module = modules.find(m => m.id === component?.moduleId);
    const system = systems.find(s => s.id === module?.systemId);

    if (system) {
      const sysAbnormal = context.abnormalSystems.find(s => s.systemId === system.id);
      breadcrumb.push({
        level: 'system',
        id: system.id,
        name: system.systemName,
        status: sysAbnormal?.status || system.status,
        healthLevel: sysAbnormal?.healthLevel || 'normal',
      });
    }

    if (module) {
      const modAbnormal = context.abnormalModules.find(m => m.moduleId === module.id);
      breadcrumb.push({
        level: 'module',
        id: module.id,
        name: module.moduleName,
        status: modAbnormal?.status || module.status,
        healthLevel: modAbnormal?.healthLevel || 'normal',
      });
    }

    if (component) {
      const compAbnormal = context.abnormalComponents.find(c => c.componentId === component.id);
      breadcrumb.push({
        level: 'component',
        id: component.id,
        name: component.componentName,
        status: component.status,
        healthLevel: compAbnormal?.healthLevel || 'normal',
        cause: compAbnormal?.healthLevel === 'critical' ? '组件故障' :
               compAbnormal?.healthLevel === 'warning' ? '组件状态异常' : undefined,
      });
    }
  } else if (context.moduleId) {
    const module = modules.find(m => m.id === context.moduleId);
    const system = systems.find(s => s.id === module?.systemId);

    if (system) {
      const sysAbnormal = context.abnormalSystems.find(s => s.systemId === system.id);
      breadcrumb.push({
        level: 'system',
        id: system.id,
        name: system.systemName,
        status: sysAbnormal?.status || system.status,
        healthLevel: sysAbnormal?.healthLevel || 'normal',
      });
    }

    if (module) {
      const modAbnormal = context.abnormalModules.find(m => m.moduleId === module.id);
      breadcrumb.push({
        level: 'module',
        id: module.id,
        name: module.moduleName,
        status: modAbnormal?.status || module.status,
        healthLevel: modAbnormal?.healthLevel || 'normal',
        cause: modAbnormal?.healthLevel === 'critical' ? '模块内存在故障组件' :
               modAbnormal?.healthLevel === 'warning' ? '模块内存在异常组件' : undefined,
        children: modAbnormal?.abnormalComponents.map(c => ({
          level: 'component' as const,
          id: c.componentId,
          name: c.componentName,
          status: c.status,
          healthLevel: c.healthLevel,
        })),
      });
    }
  } else if (context.systemId) {
    const system = systems.find(s => s.id === context.systemId);

    if (system) {
      const sysAbnormal = context.abnormalSystems.find(s => s.systemId === system.id);
      breadcrumb.push({
        level: 'system',
        id: system.id,
        name: system.systemName,
        status: sysAbnormal?.status || system.status,
        healthLevel: sysAbnormal?.healthLevel || 'normal',
        cause: sysAbnormal?.healthLevel === 'critical' ? '系统内存在故障模块' :
               sysAbnormal?.healthLevel === 'warning' ? '系统内存在异常模块' : undefined,
        children: sysAbnormal?.abnormalModules.map(m => ({
          level: 'module' as const,
          id: m.moduleId,
          name: m.moduleName,
          status: m.status,
          healthLevel: m.healthLevel,
          children: m.abnormalComponents.map(c => ({
            level: 'component' as const,
            id: c.componentId,
            name: c.componentName,
            status: c.status,
            healthLevel: c.healthLevel,
          })),
        })),
      });
    }
  }

  return breadcrumb;
}

export function calculateModuleStatusFromComponents(components: { status: string }[]): ModuleStatus {
  if (components.length === 0) return '未投产';

  const sorted = [...components].sort((a, b) => {
    const priorityA = STATUS_PRIORITY[a.status] ?? 99;
    const priorityB = STATUS_PRIORITY[b.status] ?? 99;
    return priorityA - priorityB;
  });

  return sorted[0].status as ModuleStatus;
}

export function calculateSystemStatusFromModules(modules: { status: string }[]): SystemStatus {
  if (modules.length === 0) return '未投产';

  const sorted = [...modules].sort((a, b) => {
    const priorityA = STATUS_PRIORITY[a.status] ?? 99;
    const priorityB = STATUS_PRIORITY[b.status] ?? 99;
    return priorityA - priorityB;
  });

  return sorted[0].status as SystemStatus;
}

export function getHealthColor(healthLevel: HealthLevel): string {
  switch (healthLevel) {
    case 'critical':
      return 'text-red-500';
    case 'warning':
      return 'text-yellow-500';
    case 'normal':
      return 'text-green-500';
  }
}

export function getHealthBgColor(healthLevel: HealthLevel): string {
  switch (healthLevel) {
    case 'critical':
      return 'bg-red-500/10';
    case 'warning':
      return 'bg-yellow-500/10';
    case 'normal':
      return 'bg-green-500/10';
  }
}

export function getStatusHealthInfo(status: ComponentStatus | ModuleStatus | SystemStatus): {
  healthLevel: HealthLevel;
  isHealthy: boolean;
} {
  return STATUS_HEALTH_MAP[status as ComponentStatus] || { healthLevel: 'normal', isHealthy: true };
}

export function generateStatusReport(result: StatusEvaluationResult): string {
  const lines: string[] = [];

  lines.push('='.repeat(50));
  lines.push('系统状态评估报告');
  lines.push('='.repeat(50));
  lines.push(`评估时间: ${new Date(result.timestamp).toLocaleString('zh-CN')}`);
  lines.push(`总体状态: ${result.isHealthy ? '正常' : '异常'}`);
  lines.push(`健康等级: ${result.healthLevel === 'critical' ? '危险' : result.healthLevel === 'warning' ? '警告' : '正常'}`);
  lines.push('');

  lines.push(`系统数量: ${result.systemHealth.length}`);
  lines.push(`模块数量: ${result.moduleHealth.length}`);
  lines.push(`组件数量: ${result.componentHealth.length}`);
  lines.push('');

  if (result.abnormalSystems.length > 0) {
    lines.push('-'.repeat(50));
    lines.push('异常系统:');
    result.abnormalSystems.forEach(sys => {
      lines.push(`  [${sys.systemName}] 状态: ${sys.status} 健康等级: ${sys.healthLevel}`);
      sys.abnormalModules.forEach(mod => {
        lines.push(`    └─ [${mod.moduleName}] 状态: ${mod.status} 健康等级: ${mod.healthLevel}`);
        mod.abnormalComponents.forEach(comp => {
          lines.push(`      └─ [${comp.componentName}] 状态: ${comp.status}`);
        });
      });
    });
  }

  if (result.abnormalModules.length > 0 && result.abnormalSystems.length === 0) {
    lines.push('-'.repeat(50));
    lines.push('异常模块:');
    result.abnormalModules.forEach(mod => {
      lines.push(`  [${mod.moduleName}] 状态: ${mod.status} 健康等级: ${mod.healthLevel}`);
      mod.abnormalComponents.forEach(comp => {
        lines.push(`    └─ [${comp.componentName}] 状态: ${comp.status}`);
      });
    });
  }

  if (result.abnormalComponents.length > 0 && result.abnormalModules.length === 0 && result.abnormalSystems.length === 0) {
    lines.push('-'.repeat(50));
    lines.push('异常组件:');
    result.abnormalComponents.forEach(comp => {
      lines.push(`  [${comp.componentName}] 状态: ${comp.status} 健康等级: ${comp.healthLevel}`);
    });
  }

  lines.push('='.repeat(50));

  return lines.join('\n');
}
