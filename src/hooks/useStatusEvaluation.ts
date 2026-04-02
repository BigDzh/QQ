import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  StatusEvaluationResult,
  ProjectHealth,
  SystemHealth,
  ModuleHealth,
  ComponentHealth,
  AbnormalBreadcrumb,
  evaluateFullStatus,
  evaluateProjectHealth,
  evaluateSystemHealth,
  evaluateModuleHealth,
  HealthLevel,
} from '../services/statusEvaluation';
import { useToast } from '../components/Toast';
import { Project } from '../types';

export interface AlertRule {
  id: string;
  name: string;
  level: HealthLevel;
  enabled: boolean;
  autoReport: boolean;
  condition: (result: StatusEvaluationResult) => boolean;
}

export interface StatusFeedback {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: number;
  acknowledged: boolean;
  relatedEntities: {
    systems: string[];
    modules: string[];
    components: string[];
  };
  breadcrumb: AbnormalBreadcrumb[];
  healthLevel: HealthLevel;
}

export interface LocateInfo {
  level: 'system' | 'module' | 'component';
  id: string;
  name: string;
  status: string;
  healthLevel: HealthLevel;
  parentName?: string;
  rootCause?: string;
}

const DEFAULT_ALERT_RULES: AlertRule[] = [
  {
    id: 'critical_component',
    name: '关键组件故障',
    level: 'critical',
    enabled: true,
    autoReport: true,
    condition: (result) => result.abnormalComponents.some(c => c.healthLevel === 'critical'),
  },
  {
    id: 'warning_component',
    name: '组件状态异常',
    level: 'warning',
    enabled: true,
    autoReport: false,
    condition: (result) => result.abnormalComponents.some(c => c.healthLevel === 'warning'),
  },
  {
    id: 'critical_module',
    name: '关键模块异常',
    level: 'critical',
    enabled: true,
    autoReport: true,
    condition: (result) => result.abnormalModules.some(m => m.healthLevel === 'critical'),
  },
  {
    id: 'warning_module',
    name: '模块状态异常',
    level: 'warning',
    enabled: true,
    autoReport: false,
    condition: (result) => result.abnormalModules.some(m => m.healthLevel === 'warning'),
  },
  {
    id: 'critical_system',
    name: '关键系统异常',
    level: 'critical',
    enabled: true,
    autoReport: true,
    condition: (result) => result.abnormalSystems.some(s => s.healthLevel === 'critical'),
  },
  {
    id: 'warning_system',
    name: '系统状态异常',
    level: 'warning',
    enabled: true,
    autoReport: false,
    condition: (result) => result.abnormalSystems.some(s => s.healthLevel === 'warning'),
  },
];

export function useStatusEvaluation(project: Project | null) {
  const { showToast, addNotification } = useToast();
  const [lastResult, setLastResult] = useState<StatusEvaluationResult | null>(null);
  const [feedbacks, setFeedbacks] = useState<StatusFeedback[]>([]);
  const [alertRules] = useState<AlertRule[]>(DEFAULT_ALERT_RULES);
  const [isMonitoring, setIsMonitoring] = useState(false);

  const evaluate = useCallback((
    targetSystemId?: string,
    targetModuleId?: string,
    targetComponentId?: string
  ): StatusEvaluationResult | null => {
    if (!project) return null;

    const result = evaluateFullStatus(project, targetSystemId, targetModuleId, targetComponentId);
    setLastResult(result);
    return result;
  }, [project]);

  const evaluateProject = useCallback((): ProjectHealth | null => {
    if (!project) return null;
    return evaluateProjectHealth(project);
  }, [project]);

  const evaluateSystem = useCallback((systemId: string): SystemHealth | null => {
    if (!project) return null;
    return evaluateSystemHealth(project.modules, project.systems, systemId);
  }, [project]);

  const evaluateModule = useCallback((moduleId: string): ModuleHealth | null => {
    if (!project) return null;
    return evaluateModuleHealth(project.modules, moduleId);
  }, [project]);

  const generateFeedback = useCallback((
    result: StatusEvaluationResult,
    customMessage?: string
  ): StatusFeedback[] => {
    const newFeedbacks: StatusFeedback[] = [];

    result.abnormalSystems.forEach(sys => {
      newFeedbacks.push({
        id: `sys_${sys.systemId}_${Date.now()}`,
        type: sys.healthLevel === 'critical' ? 'error' : 'warning',
        title: `系统异常: ${sys.systemName}`,
        message: customMessage || `系统 ${sys.systemName} 状态为 ${sys.status}，包含 ${sys.abnormalModules.length} 个异常模块`,
        timestamp: Date.now(),
        acknowledged: false,
        relatedEntities: {
          systems: [sys.systemId],
          modules: sys.abnormalModules.map(m => m.moduleId),
          components: sys.abnormalModules.flatMap(m => m.abnormalComponents.map(c => c.componentId)),
        },
        breadcrumb: result.breadcrumb.filter(b => b.level === 'system' && b.id === sys.systemId),
        healthLevel: sys.healthLevel,
      });
    });

    result.abnormalModules.forEach(mod => {
      if (!result.abnormalSystems.some(s => s.abnormalModules.some(m => m.moduleId === mod.moduleId))) {
        newFeedbacks.push({
          id: `mod_${mod.moduleId}_${Date.now()}`,
          type: mod.healthLevel === 'critical' ? 'error' : 'warning',
          title: `模块异常: ${mod.moduleName}`,
          message: customMessage || `模块 ${mod.moduleName} 状态为 ${mod.status}，包含 ${mod.abnormalComponents.length} 个异常组件`,
          timestamp: Date.now(),
          acknowledged: false,
          relatedEntities: {
            systems: [],
            modules: [mod.moduleId],
            components: mod.abnormalComponents.map(c => c.componentId),
          },
          breadcrumb: result.breadcrumb.filter(b => b.level === 'module' && b.id === mod.moduleId),
          healthLevel: mod.healthLevel,
        });
      }
    });

    result.abnormalComponents.forEach(comp => {
      if (!result.abnormalModules.some(m => m.abnormalComponents.some(c => c.componentId === comp.componentId))) {
        newFeedbacks.push({
          id: `comp_${comp.componentId}_${Date.now()}`,
          type: comp.healthLevel === 'critical' ? 'error' : 'warning',
          title: `组件异常: ${comp.componentName}`,
          message: customMessage || `组件 ${comp.componentName} 状态为 ${comp.status}`,
          timestamp: Date.now(),
          acknowledged: false,
          relatedEntities: {
            systems: [],
            modules: [],
            components: [comp.componentId],
          },
          breadcrumb: result.breadcrumb.filter(b => b.level === 'component' && b.id === comp.componentId),
          healthLevel: comp.healthLevel,
        });
      }
    });

    return newFeedbacks;
  }, []);

  const triggerAlerts = useCallback((result: StatusEvaluationResult) => {
    const activeRules = alertRules.filter(rule => rule.enabled);

    activeRules.forEach(rule => {
      if (rule.condition(result)) {
        if (rule.autoReport) {
          const feedback = generateFeedback(result)[0];
          if (feedback) {
            showToast(feedback.message, rule.level === 'critical' ? 'error' : 'warning');
            addNotification({
              type: rule.level === 'critical' ? 'error' : 'warning',
              title: rule.name,
              message: feedback.message,
            });
          }
        }
      }
    });
  }, [alertRules, generateFeedback, showToast, addNotification]);

  const addFeedback = useCallback((feedback: StatusFeedback) => {
    setFeedbacks(prev => [feedback, ...prev]);
  }, []);

  const acknowledgeFeedback = useCallback((feedbackId: string) => {
    setFeedbacks(prev =>
      prev.map(f => f.id === feedbackId ? { ...f, acknowledged: true } : f)
    );
  }, []);

  const clearAcknowledgedFeedbacks = useCallback(() => {
    setFeedbacks(prev => prev.filter(f => !f.acknowledged));
  }, []);

  const locateAbnormalSource = useCallback((
    result: StatusEvaluationResult,
    targetId?: string,
    targetType?: 'system' | 'module' | 'component'
  ): LocateInfo[] => {
    const located: LocateInfo[] = [];

    if (targetType === 'component' && targetId) {
      const comp = result.abnormalComponents.find(c => c.componentId === targetId);
      if (comp) {
        const mod = result.abnormalModules.find(m =>
          m.abnormalComponents.some(c => c.componentId === targetId)
        );
        const sys = result.abnormalSystems.find(s =>
          s.abnormalModules.some(m => m.abnormalComponents.some(c => c.componentId === targetId))
        );

        if (sys) {
          located.push({
            level: 'system',
            id: sys.systemId,
            name: sys.systemName,
            status: sys.status,
            healthLevel: sys.healthLevel,
            rootCause: sys.healthLevel === 'critical' ? '系统内存在故障模块' : '系统内存在异常模块',
          });
        }
        if (mod) {
          located.push({
            level: 'module',
            id: mod.moduleId,
            name: mod.moduleName,
            status: mod.status,
            healthLevel: mod.healthLevel,
            parentName: sys?.systemName,
            rootCause: mod.abnormalComponents.length > 0 ? '模块内存在故障组件' : '模块状态异常',
          });
        }
        located.push({
          level: 'component',
          id: comp.componentId,
          name: comp.componentName,
          status: comp.status,
          healthLevel: comp.healthLevel,
          parentName: mod?.moduleName,
          rootCause: comp.healthLevel === 'critical' ? '组件故障' : '组件状态异常',
        });
      }
    } else if (targetType === 'module' && targetId) {
      const mod = result.abnormalModules.find(m => m.moduleId === targetId);
      if (mod) {
        const sys = result.abnormalSystems.find(s =>
          s.abnormalModules.some(m => m.moduleId === targetId)
        );

        if (sys) {
          located.push({
            level: 'system',
            id: sys.systemId,
            name: sys.systemName,
            status: sys.status,
            healthLevel: sys.healthLevel,
            rootCause: sys.healthLevel === 'critical' ? '系统内存在故障模块' : '系统内存在异常模块',
          });
        }
        located.push({
          level: 'module',
          id: mod.moduleId,
          name: mod.moduleName,
          status: mod.status,
          healthLevel: mod.healthLevel,
          parentName: sys?.systemName,
          rootCause: mod.abnormalComponents.length > 0 ? '模块内存在故障组件' : '模块状态异常',
        });
      }
    } else if (targetType === 'system' && targetId) {
      const sys = result.abnormalSystems.find(s => s.systemId === targetId);
      if (sys) {
        located.push({
          level: 'system',
          id: sys.systemId,
          name: sys.systemName,
          status: sys.status,
          healthLevel: sys.healthLevel,
          rootCause: sys.healthLevel === 'critical' ? '系统内存在故障模块' : '系统内存在异常模块',
        });
      }
    } else {
      result.abnormalSystems.forEach(sys => {
        located.push({
          level: 'system',
          id: sys.systemId,
          name: sys.systemName,
          status: sys.status,
          healthLevel: sys.healthLevel,
          rootCause: sys.healthLevel === 'critical' ? '系统内存在故障模块' : '系统内存在异常模块',
        });
      });

      result.abnormalModules.forEach(mod => {
        if (!result.abnormalSystems.some(s => s.abnormalModules.some(m => m.moduleId === mod.moduleId))) {
          located.push({
            level: 'module',
            id: mod.moduleId,
            name: mod.moduleName,
            status: mod.status,
            healthLevel: mod.healthLevel,
            rootCause: mod.abnormalComponents.length > 0 ? '模块内存在故障组件' : '模块状态异常',
          });
        }
      });

      result.abnormalComponents.forEach(comp => {
        if (!result.abnormalModules.some(m => m.abnormalComponents.some(c => c.componentId === comp.componentId))) {
          located.push({
            level: 'component',
            id: comp.componentId,
            name: comp.componentName,
            status: comp.status,
            healthLevel: comp.healthLevel,
            rootCause: comp.healthLevel === 'critical' ? '组件故障' : '组件状态异常',
          });
        }
      });
    }

    return located;
  }, []);

  const getRootCause = useCallback((
    result: StatusEvaluationResult,
    abnormalBreadcrumb: AbnormalBreadcrumb[]
  ): string => {
    if (abnormalBreadcrumb.length === 0) {
      return '未知原因';
    }

    const deepest = abnormalBreadcrumb[abnormalBreadcrumb.length - 1];

    if (deepest.level === 'component') {
      const comp = result.abnormalComponents.find(c => c.componentId === deepest.id);
      if (comp?.healthLevel === 'critical') {
        return `组件 ${deepest.name} 发生故障`;
      }
      return `组件 ${deepest.name} 状态异常 (${deepest.status})`;
    }

    if (deepest.level === 'module') {
      const mod = result.abnormalModules.find(m => m.moduleId === deepest.id);
      if (mod?.healthLevel === 'critical') {
        const criticalComponents = mod.abnormalComponents.filter(c => c.healthLevel === 'critical');
        if (criticalComponents.length > 0) {
          return `模块 ${deepest.name} 内关键组件 ${criticalComponents[0].componentName} 故障`;
        }
        return `模块 ${deepest.name} 内存在故障组件`;
      }
      return `模块 ${deepest.name} 内组件状态异常`;
    }

    if (deepest.level === 'system') {
      const sys = result.abnormalSystems.find(s => s.systemId === deepest.id);
      if (sys?.healthLevel === 'critical') {
        const criticalModules = sys.abnormalModules.filter(m => m.healthLevel === 'critical');
        if (criticalModules.length > 0) {
          const criticalMod = criticalModules[0];
          const criticalComponents = criticalMod.abnormalComponents.filter(c => c.healthLevel === 'critical');
          if (criticalComponents.length > 0) {
            return `系统 ${deepest.name} 内模块 ${criticalMod.moduleName} 的关键组件 ${criticalComponents[0].componentName} 故障`;
          }
          return `系统 ${deepest.name} 内模块 ${criticalMod.moduleName} 故障`;
        }
        return `系统 ${deepest.name} 内存在故障模块`;
      }
      return `系统 ${deepest.name} 内模块状态异常`;
    }

    return '未知原因';
  }, []);

  const unacknowledgedCount = useMemo(() =>
    feedbacks.filter(f => !f.acknowledged).length,
    [feedbacks]
  );

  const criticalCount = useMemo(() =>
    feedbacks.filter(f => !f.acknowledged && f.healthLevel === 'critical').length,
    [feedbacks]
  );

  const warningCount = useMemo(() =>
    feedbacks.filter(f => !f.acknowledged && f.healthLevel === 'warning').length,
    [feedbacks]
  );

  useEffect(() => {
    if (lastResult && isMonitoring) {
      triggerAlerts(lastResult);
    }
  }, [lastResult, isMonitoring, triggerAlerts]);

  return {
    lastResult,
    feedbacks,
    alertRules,
    isMonitoring,
    unacknowledgedCount,
    criticalCount,
    warningCount,
    evaluate,
    evaluateProject,
    evaluateSystem,
    evaluateModule,
    generateFeedback,
    addFeedback,
    acknowledgeFeedback,
    clearAcknowledgedFeedbacks,
    locateAbnormalSource,
    getRootCause,
    setIsMonitoring,
  };
}

export type { StatusEvaluationResult, ProjectHealth, SystemHealth, ModuleHealth, ComponentHealth, AbnormalBreadcrumb, HealthLevel, LocateInfo };
