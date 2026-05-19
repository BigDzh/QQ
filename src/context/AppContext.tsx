import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, type ReactNode } from 'react';
import CryptoJS from 'crypto-js';
import type { User } from '../types/auth';
import type { Project, Module, Component, Task, BorrowRecord, System, SystemStatus, DesignFile, ModuleStatus } from '../types';
import { generateId, generateToken, verifyToken, verifyPassword } from '../utils/auth';
import { addAuditLog } from '../services/audit';
import { addStateChangeLog, validateReason, isReasonMandatory } from '../services/stateChangeLogger';
import { logComponentStateChange } from '../services/logger/componentLogger';
import { logModuleConfigModify } from '../services/logger/moduleLogger';
import { logSystemConfigChange } from '../services/logger/systemLogger';
import {
  safeSetObject,
  safeGetObject,
  autoCleanupIfNeeded,
  getStorageWarning,
} from '../services/storageManager';
import { dataRelationService } from '../services/dataRelationService';
import { invalidateSearchCache } from '../services/searchService';
import { logger } from '../utils/logger';

const USERS_KEY = 'users';
const PROJECTS_KEY = 'projects';
const TASKS_KEY = 'tasks';
const BORROW_RECORDS_KEY = 'borrow_records';
const AUTH_TOKEN_KEY = 'auth_token';

const STORAGE_DEBOUNCE_MS = 500;

const STATUS_PRIORITY: Record<string, number> = {
  '故障': 0,
  '维修中': 1,
  '三防中': 2,
  '测试中': 3,
  '仿真中': 4,
  '投产中': 5,
  '借用中': 6,
  '正常': 7,
  '未投产': 8,
};

const calculateModuleStatus = (components: { status?: string }[]): ModuleStatus => {
  if (components.length === 0) return '未投产';

  let minPriority = Infinity;
  let worstStatus: ModuleStatus = '正常';

  for (const component of components) {
    const priority = STATUS_PRIORITY[component.status ?? ''];
    if (priority !== undefined && priority < minPriority) {
      minPriority = priority;
      worstStatus = (component.status ?? '正常') as ModuleStatus;
    }
  }

  return worstStatus;
};

const calculateSystemStatus = (modules: { status?: string }[]): SystemStatus => {
  if (modules.length === 0) return '未投产';

  let minPriority = Infinity;
  let worstStatus: SystemStatus = '正常';

  for (const mod of modules) {
    const priority = STATUS_PRIORITY[mod.status ?? ''];
    if (priority !== undefined && priority < minPriority) {
      minPriority = priority;
      worstStatus = (mod.status ?? '正常') as SystemStatus;
    }
  }

  return worstStatus;
};

const getDefaultPasswordHash = (): string => {
  const envKey = typeof import.meta !== 'undefined' && (import.meta as { env?: { VITE_ADMIN_PASSWORD_HASH?: string } }).env?.VITE_ADMIN_PASSWORD_HASH;
  if (envKey) return envKey;

  const storedHash = sessionStorage.getItem('admin_password_hash');
  if (storedHash) return storedHash;

  const hardcodedPassword = 'admin123';
  const hash = CryptoJS.SHA256(hardcodedPassword).toString();
  sessionStorage.setItem('admin_password_hash', hash);
  return hash;
};

const defaultPasswordHash = getDefaultPasswordHash();
const defaultUsername = 'admin';

const defaultUsers: User[] = [
  { id: '1', username: defaultUsername, password: defaultPasswordHash, name: '管理员', email: 'admin@example.com', role: 'admin', createdAt: '2026-03-15' },
];

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface ProjectsContextType {
  projects: Project[];
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'logs'>) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  forceSyncProject: (id: string) => void;
  deleteProject: (id: string) => void;
  addModule: (projectId: string, module: Omit<Module, 'id' | 'logs' | 'statusChanges'>) => void;
  updateModule: (projectId: string, moduleId: string, updates: Partial<Module> & { statusChangeReason?: string }) => void;
  deleteModule: (projectId: string, moduleId: string) => void;
  addSystem: (projectId: string, system: Omit<System, 'id' | 'logs' | 'statusChanges'>) => string;
  updateSystem: (projectId: string, systemId: string, updates: Partial<System> & { statusChangeReason?: string }) => void;
  deleteSystem: (projectId: string, systemId: string) => void;
  addComponent: (projectId: string, moduleId: string, component: Omit<Component, 'id' | 'statusChanges'>) => void;
  updateComponent: (projectId: string, moduleId: string, componentId: string, updates: Partial<Component> & { statusChangeReason?: string; newModuleId?: string }) => void;
  deleteComponent: (projectId: string, moduleId: string, componentId: string) => void;
  updateDocument: (projectId: string, documentId: string, updates: Partial<Document>) => void;
  deleteDocument: (projectId: string, documentId: string) => void;
  addDesignFile: (projectId: string, designFile: Omit<DesignFile, 'id'>) => void;
  updateDesignFile: (projectId: string, designFileId: string, updates: Partial<DesignFile>) => void;
  deleteDesignFile: (projectId: string, designFileId: string) => void;
  getProject: (id: string) => Project | undefined;
  getModule: (id: string) => { project: Project; module: Module } | undefined;
  getComponent: (id: string) => { project: Project; module: Module; component: Component } | undefined;
  clearAllData: () => void;
}

export const ProjectsContext = createContext<ProjectsContextType | undefined>(undefined);

interface TasksContextType {
  tasks: Task[];
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => string;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
}

export const TasksContext = createContext<TasksContextType | undefined>(undefined);

interface BorrowRecordsContextType {
  borrowRecords: BorrowRecord[];
  addBorrowRecord: (record: Omit<BorrowRecord, 'id'>) => void;
  returnBorrowRecord: (id: string) => void;
}

export const BorrowRecordsContext = createContext<BorrowRecordsContextType | undefined>(undefined);

function useDebouncedStorage<T extends string | object>(key: string, value: T, isInitialized: React.MutableRefObject<boolean>) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isInitialized.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      safeSetObject(key, value as object);
    }, STORAGE_DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [key, value, isInitialized]);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [borrowRecords, setBorrowRecords] = useState<BorrowRecord[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const isInitializedRef = useRef(false);

  useEffect(() => {
    autoCleanupIfNeeded();
    const warning = getStorageWarning();
    if (warning) {
      logger.warn('Storage warning:', warning);
    }

    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        const usersData = localStorage.getItem(USERS_KEY);
        let users: User[] = defaultUsers;
        if (usersData) {
          try {
            const parsed = JSON.parse(usersData);
            if (Array.isArray(parsed) && parsed.length > 0) {
              users = parsed;
            }
          } catch {
            // ignore parse error
          }
        }
        const user = users.find((u) => u.id === payload.id);
        if (user) {
          setCurrentUser(user);
          setIsAuthenticated(true);
        }
      }
    }

    const storedProjects = safeGetObject<Project[]>(PROJECTS_KEY);
    if (storedProjects && storedProjects.length > 0) {
      const migratedProjects = migrateProjectsData(storedProjects);
      setProjects(migratedProjects);
    }

    const storedTasks = safeGetObject<Task[]>(TASKS_KEY);
    if (storedTasks && storedTasks.length > 0) {
      setTasks(storedTasks);
    }

    const storedBorrowRecords = safeGetObject<BorrowRecord[]>(BORROW_RECORDS_KEY);
    if (storedBorrowRecords && storedBorrowRecords.length > 0) {
      setBorrowRecords(storedBorrowRecords);
    }

    if (!localStorage.getItem(USERS_KEY)) {
      safeSetObject(USERS_KEY, defaultUsers);
    } else {
      try {
        const parsed = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
        if (!Array.isArray(parsed) || parsed.length === 0) {
          safeSetObject(USERS_KEY, defaultUsers);
        }
      } catch {
        safeSetObject(USERS_KEY, defaultUsers);
      }
    }

    isInitializedRef.current = true;
  }, []);

  const migrateProjectsData = useCallback((projects: Project[]): Project[] => {
    return projects.map(project => {
      const migratedSystems = project.systems?.map((system) => ({
        ...system,
        productionOrderNumber: system.productionOrderNumber || (system as unknown as Record<string, unknown>).instructionNumber || '',
      })) || [];
      return { ...project, systems: migratedSystems } as Project;
    });
  }, []);

  useEffect(() => {
    if (isInitializedRef.current && projects.length > 0) {
      const timeoutId = setTimeout(() => {
        dataRelationService.initialize(projects, tasks, borrowRecords);
        invalidateSearchCache();
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [projects, tasks, borrowRecords]);

  useDebouncedStorage(PROJECTS_KEY, projects, isInitializedRef);
  useDebouncedStorage(TASKS_KEY, tasks, isInitializedRef);
  useDebouncedStorage(BORROW_RECORDS_KEY, borrowRecords, isInitializedRef);

  const login = useCallback((username: string, password: string): boolean => {
    try {
      const usersData = localStorage.getItem(USERS_KEY);
      let users: User[] = defaultUsers;
      if (usersData) {
        try {
          const parsed = JSON.parse(usersData);
          if (Array.isArray(parsed) && parsed.length > 0) {
            users = parsed;
          }
        } catch {
          // ignore parse error
        }
      }
      const user = users.find((u) => u.username === username && verifyPassword(password, u.password));

      if (user) {
        const token = generateToken(user);
        localStorage.setItem(AUTH_TOKEN_KEY, token);
        setCurrentUser(user);
        setIsAuthenticated(true);
        addAuditLog(user.id, user.username, 'LOGIN', 'INFO', '用户');
        return true;
      }
    } catch (error) {
      logger.error('Login error:', error);
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    if (currentUser) {
      addAuditLog(currentUser.id, currentUser.username, 'LOGOUT', 'INFO', '用户');
    }
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setCurrentUser(null);
    setIsAuthenticated(false);
  }, [currentUser]);

  const authValue = useMemo(() => ({
    currentUser,
    isAuthenticated,
    login,
    logout,
  }), [currentUser, isAuthenticated, login, logout]);

  const addProject = useCallback((project: Omit<Project, 'id' | 'createdAt' | 'logs'>) => {
    const newProject: Project = {
      ...project,
      id: generateId(),
      createdAt: new Date().toISOString(),
      logs: [],
    };
    setProjects((prev) => [...prev, newProject]);
    if (currentUser) {
      addAuditLog(currentUser.id, currentUser.username, 'CREATE', 'INFO', '项目', newProject.id, newProject.name);
    }
  }, [currentUser]);

  const updateProject = useCallback((id: string, updates: Partial<Project>) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    if (currentUser) {
      addAuditLog(currentUser.id, currentUser.username, 'UPDATE', 'INFO', '项目', id);
    }
  }, [currentUser]);

  const forceSyncProject = useCallback((id: string) => {
    setProjects(prev => {
      const project = prev.find(p => p.id === id);
      if (project) {
        safeSetObject(PROJECTS_KEY, prev);
      }
      return prev;
    });
  }, []);

  const deleteProject = useCallback((id: string) => {
    setProjects((prev) => {
      const project = prev.find((p) => p.id === id);
      if (currentUser && project) {
        addAuditLog(currentUser.id, currentUser.username, 'DELETE', 'WARNING', '项目', id, project.name);
      }
      return prev.filter((p) => p.id !== id);
    });
  }, [currentUser]);

  const addModule = useCallback((projectId: string, module: Omit<Module, 'id' | 'logs' | 'statusChanges'>) => {
    const newModule: Module = {
      ...module,
      id: generateId(),
      logs: [],
      statusChanges: [],
    };
    setProjects((prev) => prev.map((p) => {
      if (p.id === projectId) {
        return { ...p, modules: [...p.modules, newModule] };
      }
      return p;
    }));
    if (currentUser) {
      addAuditLog(currentUser.id, currentUser.username, 'CREATE', 'INFO', '模块', newModule.id, newModule.moduleName);
    }
  }, [currentUser]);

  const updateModule = useCallback((projectId: string, moduleId: string, updates: Partial<Module> & { statusChangeReason?: string }) => {
    const currentProject = projects.find(p => p.id === projectId);
    const currentModule = currentProject?.modules.find(m => m.id === moduleId);
    const previousState = currentModule?.status || '未知';
    const newStatus = updates.status;

    setProjects((prev) => prev.map((p) => {
      if (p.id !== projectId) return p;

      const module = p.modules.find(m => m.id === moduleId);
      const changes: string[] = [];
      if (updates.moduleName && updates.moduleName !== module?.moduleName) changes.push(`模块名称: ${module?.moduleName} → ${updates.moduleName}`);
      if (updates.moduleNumber && updates.moduleNumber !== module?.moduleNumber) changes.push(`模块编号: ${module?.moduleNumber} → ${updates.moduleNumber}`);
      if (updates.category && updates.category !== module?.category) changes.push(`模块种类: ${module?.category} → ${updates.category}`);
      if (updates.productionOrderNumber && updates.productionOrderNumber !== module?.productionOrderNumber) changes.push(`生产指令号: ${module?.productionOrderNumber || '-'} → ${updates.productionOrderNumber}`);
      if (updates.holder && updates.holder !== module?.holder) changes.push(`负责人: ${module?.holder || '-'} → ${updates.holder}`);
      if (updates.stage && updates.stage !== module?.stage) changes.push(`阶段: ${module?.stage} → ${updates.stage}`);
      if (updates.version && updates.version !== module?.version) changes.push(`版本: ${module?.version} → ${updates.version}`);
      if (updates.status && updates.status !== module?.status) changes.push(`状态: ${module?.status} → ${updates.status}`);

      if (updates.status && updates.status !== module?.status && updates.statusChangeReason) {
        try {
          addStateChangeLog(
            currentUser?.id || null,
            currentUser?.username || currentUser?.name || '系统',
            'MODULE',
            moduleId,
            module?.moduleName || '未知模块',
            previousState,
            newStatus ?? '',
            updates.statusChangeReason,
            { metadata: { projectId, projectName: currentProject?.name } }
          );
        } catch (error) {
          logger.error('Failed to add state change log:', error);
        }

        try {
          logModuleConfigModify(
            moduleId,
            module?.moduleName || '未知模块',
            {
              id: currentUser?.id || null,
              username: currentUser?.username || currentUser?.name || '系统',
            },
            `模块状态变更: ${previousState} → ${newStatus}`,
            updates.statusChangeReason,
            { status: previousStatus },
            { status: newStatus ?? '' }
          );
        } catch (error) {
          console.error('Failed to add module state change log to HierarchicalLogger:', error);
        }
      }

      const newLog = {
        id: generateId(),
        action: `模块信息更新${changes.length > 0 ? `: ${changes.join(', ')}` : ''}`,
        timestamp: new Date().toISOString(),
        userId: currentUser?.id || '',
        username: currentUser?.username || currentUser?.name || '未知',
        details: JSON.stringify(updates),
      };

      return {
        ...p,
        modules: p.modules.map((m) => (m.id === moduleId ? {
          ...m,
          ...updates,
          logs: [...(m.logs || []), newLog],
        } : m)),
      };
    }));
    if (currentUser) {
      addAuditLog(currentUser.id, currentUser.username, 'UPDATE', 'INFO', '模块', moduleId);
    }
  }, [currentUser, projects]);

  const deleteModule = useCallback((projectId: string, moduleId: string) => {
    setProjects((prev) => prev.map((p) => {
      if (p.id === projectId) {
        return { ...p, modules: p.modules.filter((m) => m.id !== moduleId) };
      }
      return p;
    }));
    if (currentUser) {
      addAuditLog(currentUser.id, currentUser.username, 'DELETE', 'WARNING', '模块', moduleId);
    }
  }, [currentUser]);

  const addSystem = useCallback((projectId: string, system: Omit<System, 'id' | 'logs' | 'statusChanges'>): string => {
    const newSystem: System = {
      ...system,
      id: generateId(),
      logs: [],
      statusChanges: [],
    };
    setProjects((prev) => prev.map((p) => {
      if (p.id === projectId) {
        return { ...p, systems: [...(p.systems || []), newSystem] };
      }
      return p;
    }));
    if (currentUser) {
      addAuditLog(currentUser.id, currentUser.username, 'CREATE', 'INFO', '系统', newSystem.id, newSystem.systemName);
    }
    return newSystem.id;
  }, [currentUser]);

  const updateSystem = useCallback((projectId: string, systemId: string, updates: Partial<System> & { statusChangeReason?: string }) => {
    const currentProject = projects.find(p => p.id === projectId);
    const currentSystem = currentProject?.systems?.find(s => s.id === systemId);
    const previousState = currentSystem?.status || '未知';
    const newStatus = updates.status;

    setProjects((prev) => prev.map((p) => {
      if (p.id !== projectId) return p;

      const system = p.systems?.find(s => s.id === systemId);
      const changes: string[] = [];
      if (updates.systemName && updates.systemName !== system?.systemName) changes.push(`系统名称: ${system?.systemName} → ${updates.systemName}`);
      if (updates.systemNumber && updates.systemNumber !== system?.systemNumber) changes.push(`系统编号: ${system?.systemNumber} → ${updates.systemNumber}`);
      if (updates.productionOrderNumber && updates.productionOrderNumber !== system?.productionOrderNumber) changes.push(`生产指令号: ${system?.productionOrderNumber} → ${updates.productionOrderNumber}`);
      if (updates.holder && updates.holder !== system?.holder) changes.push(`负责人: ${system?.holder || '-'} → ${updates.holder}`);
      if (updates.stage && updates.stage !== system?.stage) changes.push(`阶段: ${system?.stage} → ${updates.stage}`);
      if (updates.version && updates.version !== system?.version) changes.push(`版本: ${system?.version} → ${updates.version}`);
      if (updates.status && updates.status !== system?.status) changes.push(`状态: ${system?.status} → ${updates.status}`);

      if (updates.status && updates.status !== system?.status && updates.statusChangeReason) {
        try {
          addStateChangeLog(
            currentUser?.id || null,
            currentUser?.username || currentUser?.name || '系统',
            'SYSTEM',
            systemId,
            system?.systemName || '未知系统',
            previousState,
            newStatus ?? '',
            updates.statusChangeReason,
            { metadata: { projectId, projectName: currentProject?.name } }
          );
        } catch (error) {
          logger.error('Failed to add state change log:', error);
        }

        try {
          logSystemConfigChange(
            {
              id: currentUser?.id || null,
              username: currentUser?.username || currentUser?.name || '系统',
            },
            `系统状态变更: ${system?.systemName || '未知系统'} ${previousState} → ${newStatus}`,
            updates.statusChangeReason,
            { status: previousStatus },
            { status: newStatus ?? '' }
          );
        } catch (error) {
          console.error('Failed to add system state change log to HierarchicalLogger:', error);
        }
      }

      const newLog = {
        id: generateId(),
        action: `系统信息更新${changes.length > 0 ? `: ${changes.join(', ')}` : ''}`,
        timestamp: new Date().toISOString(),
        userId: currentUser?.id || '',
        username: currentUser?.username || currentUser?.name || '未知',
        details: JSON.stringify(updates),
      };

      return {
        ...p,
        systems: (p.systems || []).map((s) => (s.id === systemId ? {
          ...s,
          ...updates,
          logs: [...(s.logs || []), newLog],
        } : s)),
      };
    }));
    if (currentUser) {
      addAuditLog(currentUser.id, currentUser.username, 'UPDATE', 'INFO', '系统', systemId);
    }
  }, [currentUser, projects]);

  const deleteSystem = useCallback((projectId: string, systemId: string) => {
    setProjects((prev) => prev.map((p) => {
      if (p.id === projectId) {
        return { ...p, systems: (p.systems || []).filter((s) => s.id !== systemId) };
      }
      return p;
    }));
    if (currentUser) {
      addAuditLog(currentUser.id, currentUser.username, 'DELETE', 'WARNING', '系统', systemId);
    }
  }, [currentUser]);

  const addComponent = useCallback((projectId: string, moduleId: string, component: Omit<Component, 'id' | 'statusChanges'>) => {
    const newComponent: Component = {
      ...component,
      id: generateId(),
      statusChanges: [],
      certificates: component.certificates || { pcb: undefined, assembly: undefined, coating: undefined },
    };
    setProjects((prev) => prev.map((p) => {
      if (p.id !== projectId) return p;

      const updatedModules = p.modules.map((m) => {
        if (m.id !== moduleId) return m;

        const updatedComponents = [...m.components, newComponent];
        const newModuleStatus = calculateModuleStatus(updatedComponents);

        return { ...m, components: updatedComponents, status: newModuleStatus };
      });

      const targetModule = updatedModules.find(m => m.id === moduleId);
      const systemId = targetModule?.systemId;

      let updatedSystems = p.systems;
      if (systemId && targetModule) {
        const systemModules = updatedModules.filter(m => m.systemId === systemId);
        const newSystemStatus = calculateSystemStatus(systemModules);
        const currentSystem = p.systems.find(s => s.id === systemId);
        if (currentSystem && currentSystem.status !== newSystemStatus) {
          updatedSystems = p.systems.map(s =>
            s.id === systemId ? { ...s, status: newSystemStatus } : s
          );
        }
      }

      const updatedProject = { ...p, modules: updatedModules, systems: updatedSystems };

      return updatedProject;
    }));
    if (currentUser) {
      addAuditLog(currentUser.id, currentUser.username, 'CREATE', 'INFO', '组件', newComponent.id, newComponent.componentName);
    }
  }, [currentUser]);

  const updateComponent = useCallback((projectId: string, moduleId: string, componentId: string, updates: Partial<Component> & { statusChangeReason?: string; newModuleId?: string }) => {
    const currentProject = projects.find(p => p.id === projectId);
    const currentModule = currentProject?.modules.find(m => m.id === moduleId);
    const currentComponent = currentModule?.components.find(c => c.id === componentId);

    const previousState = currentComponent?.status || '未知';
    const newStatus = updates.status;
    const newModuleId = updates.newModuleId;
    const isMovingModule = newModuleId && newModuleId !== moduleId;

    setProjects((prev) => prev.map((p) => {
      if (p.id !== projectId) return p;

      let updatedModules: typeof p.modules;

      if (isMovingModule) {
        const oldModule = p.modules.find(m => m.id === moduleId);
        const targetModule = p.modules.find(m => m.id === newModuleId);

        if (!oldModule || !targetModule) {
          return p;
        }

        const component = oldModule.components.find(c => c.id === componentId);
        if (!component) {
          return p;
        }

        const changes: string[] = [];
        if (updates.componentName && updates.componentName !== component.componentName) changes.push(`组件名称: ${component.componentName} → ${updates.componentName}`);
        if (updates.componentNumber && updates.componentNumber !== component.componentNumber) changes.push(`组件编号: ${component.componentNumber} → ${updates.componentNumber}`);
        if (updates.productionOrderNumber && updates.productionOrderNumber !== component.productionOrderNumber) changes.push(`生产指令号: ${component.productionOrderNumber || '-'} → ${updates.productionOrderNumber}`);
        if (updates.holder && updates.holder !== component.holder) changes.push(`持有人: ${component.holder || '-'} → ${updates.holder}`);
        if (updates.stage && updates.stage !== component.stage) changes.push(`阶段: ${component.stage} → ${updates.stage}`);
        if (updates.version && updates.version !== component.version) changes.push(`版本: ${component.version} → ${updates.version}`);
        if (updates.status && updates.status !== component.status) changes.push(`状态: ${component.status} → ${updates.status}`);
        changes.push(`所属模块: ${oldModule.moduleName} → ${targetModule.moduleName}`);

        const newLog = {
          id: generateId(),
          action: `组件信息更新: ${changes.join(', ')}`,
          timestamp: new Date().toISOString(),
          userId: currentUser?.id || '',
          username: currentUser?.username || currentUser?.name || '未知',
          details: JSON.stringify({ ...updates, oldModuleName: oldModule.moduleName, newModuleName: targetModule.moduleName }),
        };

        const { statusChangeReason: _statusChangeReason, newModuleId: _, ...restUpdates } = updates;

        const movedComponent = {
          ...component,
          ...restUpdates,
          moduleId: newModuleId,
          systemId: targetModule.systemId,
          systemNumber: targetModule.systemNumber,
          systemName: targetModule.systemName,
          logs: [...(component.logs || []), newLog],
        };

        updatedModules = p.modules.map(m => {
          if (m.id === moduleId) {
            const remainingComponents = m.components.filter(c => c.id !== componentId);
            return {
              ...m,
              components: remainingComponents,
              status: calculateModuleStatus(remainingComponents),
            };
          }
          if (m.id === newModuleId) {
            return {
              ...m,
              components: [...m.components, movedComponent],
              status: calculateModuleStatus([...m.components, movedComponent]),
            };
          }
          return m;
        });
      } else {
        updatedModules = p.modules.map((m) => {
          if (m.id !== moduleId) return m;

          const component = m.components.find(c => c.id === componentId);
          const changes: string[] = [];
          if (updates.componentName && updates.componentName !== component?.componentName) changes.push(`组件名称: ${component?.componentName} → ${updates.componentName}`);
          if (updates.componentNumber && updates.componentNumber !== component?.componentNumber) changes.push(`组件编号: ${component?.componentNumber} → ${updates.componentNumber}`);
          if (updates.productionOrderNumber && updates.productionOrderNumber !== component?.productionOrderNumber) changes.push(`生产指令号: ${component?.productionOrderNumber || '-'} → ${updates.productionOrderNumber}`);
          if (updates.holder && updates.holder !== component?.holder) changes.push(`持有人: ${component?.holder || '-'} → ${updates.holder}`);
          if (updates.stage && updates.stage !== component?.stage) changes.push(`阶段: ${component?.stage} → ${updates.stage}`);
          if (updates.version && updates.version !== component?.version) changes.push(`版本: ${component?.version} → ${updates.version}`);
          if (updates.status && updates.status !== component?.status) changes.push(`状态: ${component?.status} → ${updates.status}`);

          let updatedLogs = component?.logs || [];
          let updatedStatusChanges = component?.statusChanges || [];

          if (updates.status && updates.status !== component?.status) {
            if (isReasonMandatory('COMPONENT', component?.status || '', updates.status)) {
              const validation = validateReason(updates.statusChangeReason);
              if (!validation.isValid) {
                console.error('Invalid status change reason:', validation.errors);
              }
            }

            if (updates.statusChangeReason) {
              try {
                addStateChangeLog(
                  currentUser?.id || null,
                  currentUser?.username || currentUser?.name || '系统',
                  'COMPONENT',
                  componentId,
                  currentComponent?.componentName || '未知组件',
                  previousState,
                  newStatus ?? '',
                  updates.statusChangeReason,
                  { metadata: { projectId, moduleId, projectName: currentProject?.name, moduleName: currentModule?.moduleName } }
                );
              } catch (error) {
                console.error('Failed to add state change log:', error);
              }

              try {
                logComponentStateChange(
                  componentId,
                  currentComponent?.componentName || '未知组件',
                  {
                    id: currentUser?.id || null,
                    username: currentUser?.username || currentUser?.name || '系统',
                  },
                  'STATE_CHANGE',
                  previousState,
                  newStatus ?? '',
                  updates.statusChangeReason,
                  'INFO',
                  { projectId, moduleId, source: 'AppContext.updateComponent' }
                );
              } catch (error) {
                console.error('Failed to add component state change log to HierarchicalLogger:', error);
              }
            }

            const newLog = {
              id: generateId(),
              action: `状态从 ${component?.status} 变更为 ${updates.status}`,
              timestamp: new Date().toISOString(),
              userId: currentUser?.id || '',
              username: currentUser?.username || currentUser?.name || '未知',
              details: updates.statusChangeReason || '无',
            };
            updatedLogs = [...updatedLogs, newLog];

            updatedStatusChanges = [
              ...updatedStatusChanges,
              {
                id: generateId(),
                fromStatus: component?.status || '未知',
                toStatus: updates.status,
                changedAt: new Date().toISOString(),
                changedBy: currentUser?.username || currentUser?.name || '未知',
                reason: updates.statusChangeReason || '无',
              },
            ];
          } else if (changes.length > 0) {
            const newLog = {
              id: generateId(),
              action: `组件信息更新: ${changes.join(', ')}`,
              timestamp: new Date().toISOString(),
              userId: currentUser?.id || '',
              username: currentUser?.username || currentUser?.name || '未知',
              details: JSON.stringify(updates),
            };
            updatedLogs = [...updatedLogs, newLog];
          }

          const { statusChangeReason: _statusChangeReason, logs: _externalLogs, ...restUpdates } = updates;

          console.log('[DEBUG] updateComponent - restUpdates 内容:', {
            hasProtectionOrderNumber: 'protectionOrderNumber' in restUpdates,
            protectionOrderNumber: restUpdates.protectionOrderNumber,
            hasRepairOrderNumber: 'repairOrderNumber' in restUpdates,
            repairOrderNumber: restUpdates.repairOrderNumber,
            allKeys: Object.keys(restUpdates)
          });

          const finalLogs = _externalLogs && Array.isArray(_externalLogs) ? _externalLogs : updatedLogs;

          const updatedComponents = m.components.map((c) => (c.id === componentId ? {
            ...c,
            ...restUpdates,
            logs: finalLogs,
            statusChanges: updatedStatusChanges,
          } : c));

          const newModuleStatus = calculateModuleStatus(updatedComponents);

          return {
            ...m,
            components: updatedComponents,
            status: newModuleStatus,
          };
        });
      }

      const affectedModuleIds = isMovingModule ? [moduleId, newModuleId] : [moduleId];
      const affectedModules = updatedModules.filter(m => affectedModuleIds.includes(m.id));
      const affectedSystemIds = [...new Set(affectedModules.map(m => m.systemId).filter(Boolean))];

      let updatedSystems = p.systems;
      for (const systemId of affectedSystemIds) {
        const systemModules = updatedModules.filter(m => m.systemId === systemId);
        const newSystemStatus = calculateSystemStatus(systemModules);
        const currentSystem = p.systems.find(s => s.id === systemId);
        if (currentSystem && currentSystem.status !== newSystemStatus) {
          updatedSystems = updatedSystems.map(s =>
            s.id === systemId ? { ...s, status: newSystemStatus } : s
          );
        }
      }

      const updatedProject = {
        ...p,
        modules: updatedModules,
        systems: updatedSystems,
      };

      return updatedProject;
    }));
    if (currentUser) {
      const component = projects
        .flatMap(p => p.modules.map(m => ({ project: p, module: m, component: m.components.find(c => c.id === componentId) })))
        .find(item => item.component?.id === componentId);

      let details = `项目: ${component?.project.name}, 模块: ${component?.module.moduleName}`;
      if (isMovingModule) {
        const newMod = projects.flatMap(p => p.modules).find(m => m.id === newModuleId);
        details += `, 所属模块变更: ${component?.module.moduleName} → ${newMod?.moduleName}`;
      }
      if (updates.status) {
        details += `, 状态变更: ${component?.component?.status} → ${updates.status}`;
      }
      if (updates.statusChangeReason) {
        details += `, 变更原因: ${updates.statusChangeReason}`;
      }

      addAuditLog(currentUser.id, currentUser.username, 'UPDATE', 'INFO', '组件', componentId, component?.component?.componentName, details);
    }
  }, [currentUser, projects]);

  const deleteComponent = useCallback((projectId: string, moduleId: string, componentId: string) => {
    setProjects((prev) => prev.map((p) => {
      if (p.id !== projectId) return p;

      const updatedModules = p.modules.map((m) => {
        if (m.id !== moduleId) return m;

        const remainingComponents = m.components.filter(c => c.id !== componentId);
        const newModuleStatus = calculateModuleStatus(remainingComponents);

        return { ...m, components: remainingComponents, status: newModuleStatus };
      });

      const targetModule = updatedModules.find(m => m.id === moduleId);
      const systemId = targetModule?.systemId;

      let updatedSystems = p.systems;
      if (systemId && targetModule) {
        const systemModules = updatedModules.filter(m => m.systemId === systemId);
        const newSystemStatus = calculateSystemStatus(systemModules);
        const currentSystem = p.systems.find(s => s.id === systemId);
        if (currentSystem && currentSystem.status !== newSystemStatus) {
          updatedSystems = p.systems.map(s =>
            s.id === systemId ? { ...s, status: newSystemStatus } : s
          );
        }
      }

      const updatedProject = { ...p, modules: updatedModules, systems: updatedSystems };

      return updatedProject;
    }));
    if (currentUser) {
      addAuditLog(currentUser.id, currentUser.username, 'DELETE', 'WARNING', '组件', componentId);
    }
  }, [currentUser]);

  const updateDocument = useCallback((projectId: string, documentId: string, updates: Partial<Document>) => {
    setProjects((prev) => prev.map((p) => {
      if (p.id === projectId) {
        return {
          ...p,
          documents: p.documents.map((d) => (d.id === documentId ? { ...d, ...updates } : d)),
        };
      }
      return p;
    }));
    if (currentUser) {
      addAuditLog(currentUser.id, currentUser.username, 'UPDATE', 'INFO', '文档', documentId);
    }
  }, [currentUser]);

  const deleteDocument = useCallback((projectId: string, documentId: string) => {
    setProjects((prev) => prev.map((p) => {
      if (p.id === projectId) {
        return {
          ...p,
          documents: p.documents.filter((d) => d.id !== documentId),
        };
      }
      return p;
    }));
    if (currentUser) {
      addAuditLog(currentUser.id, currentUser.username, 'DELETE', 'WARNING', '文档', documentId);
    }
  }, [currentUser]);

  const addDesignFile = useCallback((projectId: string, designFile: Omit<DesignFile, 'id'>) => {
    const newDesignFile: DesignFile = {
      ...designFile,
      id: `df_${generateId()}`,
    };
    setProjects((prev) => prev.map((p) => {
      if (p.id === projectId) {
        return {
          ...p,
          designFiles: [...p.designFiles, newDesignFile],
        };
      }
      return p;
    }));
    if (currentUser) {
      addAuditLog(currentUser.id, currentUser.username, 'CREATE', 'INFO', '设计文件', newDesignFile.id, newDesignFile.name);
    }
  }, [currentUser]);

  const updateDesignFile = useCallback((projectId: string, designFileId: string, updates: Partial<DesignFile>) => {
    setProjects((prev) => prev.map((p) => {
      if (p.id === projectId) {
        return {
          ...p,
          designFiles: p.designFiles.map((df) => (df.id === designFileId ? { ...df, ...updates } : df)),
        };
      }
      return p;
    }));
    if (currentUser) {
      addAuditLog(currentUser.id, currentUser.username, 'UPDATE', 'INFO', '设计文件', designFileId);
    }
  }, [currentUser]);

  const deleteDesignFile = useCallback((projectId: string, designFileId: string) => {
    setProjects((prev) => prev.map((p) => {
      if (p.id === projectId) {
        return {
          ...p,
          designFiles: p.designFiles.filter((df) => df.id !== designFileId),
        };
      }
      return p;
    }));
    if (currentUser) {
      addAuditLog(currentUser.id, currentUser.username, 'DELETE', 'WARNING', '设计文件', designFileId);
    }
  }, [currentUser]);

  const getProject = useCallback((id: string) => {
    return projects.find((p) => p.id === id);
  }, [projects]);

  const getModule = useCallback((id: string) => {
    for (const project of projects) {
      const module = project.modules.find((m) => m.id === id);
      if (module) {
        return { project, module };
      }
    }
    return undefined;
  }, [projects]);

  const getComponent = useCallback((id: string): { project: Project; module: Module; component: Component } | undefined => {
    for (const project of projects) {
      for (const module of project.modules) {
        const component = module.components.find((c) => c.id === id);
        if (component) {
          return { project, module, component };
        }
      }
    }
    return undefined;
  }, [projects]);

  const clearAllData = useCallback(() => {
    setProjects([]);
    setTasks([]);
    setBorrowRecords([]);
    if (currentUser) {
      addAuditLog(currentUser.id, currentUser.username, 'DELETE', 'WARNING', '全部数据');
    }
  }, [currentUser]);

  const projectsValue = useMemo(() => ({
    projects,
    addProject,
    updateProject,
    forceSyncProject,
    deleteProject,
    addModule,
    updateModule,
    deleteModule,
    addSystem,
    updateSystem,
    deleteSystem,
    addComponent,
    updateComponent,
    deleteComponent,
    updateDocument,
    deleteDocument,
    addDesignFile,
    updateDesignFile,
    deleteDesignFile,
    getProject,
    getModule,
    getComponent,
    clearAllData,
  }), [projects, currentUser, addProject, updateProject, forceSyncProject, deleteProject, addModule, updateModule, deleteModule, addSystem, updateSystem, deleteSystem, addComponent, updateComponent, deleteComponent, updateDocument, deleteDocument, addDesignFile, updateDesignFile, deleteDesignFile, getProject, getModule, getComponent, clearAllData]);

  const addTask = useCallback((task: Omit<Task, 'id' | 'createdAt'>): string => {
    const newTask: Task = {
      ...task,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    setTasks((prev) => [...prev, newTask]);
    if (currentUser) {
      addAuditLog(currentUser.id, currentUser.username, 'CREATE', 'INFO', '任务', newTask.id, newTask.title);
    }
    return newTask.id;
  }, [currentUser]);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
    if (currentUser) {
      addAuditLog(currentUser.id, currentUser.username, 'UPDATE', 'INFO', '任务', id);
    }
  }, [currentUser]);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (currentUser) {
      addAuditLog(currentUser.id, currentUser.username, 'DELETE', 'WARNING', '任务', id);
    }
  }, [currentUser]);

  const tasksValue = useMemo(() => ({
    tasks,
    addTask,
    updateTask,
    deleteTask,
  }), [tasks, addTask, updateTask, deleteTask]);

  const addBorrowRecord = useCallback((record: Omit<BorrowRecord, 'id'>) => {
    const newRecord: BorrowRecord = {
      ...record,
      id: generateId(),
    };
    setBorrowRecords((prev) => [...prev, newRecord]);
    if (currentUser) {
      addAuditLog(currentUser.id, currentUser.username, 'CREATE', 'INFO', '借用记录', newRecord.id, newRecord.itemName);
    }
  }, [currentUser]);

  const returnBorrowRecord = useCallback((id: string) => {
    setBorrowRecords((prev) => prev.map((r) =>
      r.id === id ? { ...r, status: '已归还', actualReturnDate: new Date().toISOString() } : r
    ));
    if (currentUser) {
      addAuditLog(currentUser.id, currentUser.username, 'UPDATE', 'INFO', '借用记录', id, '归还');
    }
  }, [currentUser]);

  const borrowRecordsValue = useMemo(() => ({
    borrowRecords,
    addBorrowRecord,
    returnBorrowRecord,
  }), [borrowRecords, addBorrowRecord, returnBorrowRecord]);

  return (
    <AuthContext.Provider value={authValue}>
      <ProjectsContext.Provider value={projectsValue}>
        <TasksContext.Provider value={tasksValue}>
          <BorrowRecordsContext.Provider value={borrowRecordsValue}>
            {children}
          </BorrowRecordsContext.Provider>
        </TasksContext.Provider>
      </ProjectsContext.Provider>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AppProvider');
  }
  return context;
}

export function useProjects() {
  const context = useContext(ProjectsContext);
  if (!context) {
    throw new Error('useProjects must be used within an AppProvider');
  }
  return context;
}

export function useTasks() {
  const context = useContext(TasksContext);
  if (!context) {
    throw new Error('useTasks must be used within an AppProvider');
  }
  return context;
}

export function useBorrowRecords() {
  const context = useContext(BorrowRecordsContext);
  if (!context) {
    throw new Error('useBorrowRecords must be used within an AppProvider');
  }
  return context;
}

export const AppContext = createContext<AuthContextType & ProjectsContextType & TasksContextType & BorrowRecordsContextType | undefined>(undefined);

export function useApp() {
  const auth = useAuth();
  const projects = useProjects();
  const tasks = useTasks();
  const borrowRecords = useBorrowRecords();

  return {
    ...auth,
    ...projects,
    ...tasks,
    ...borrowRecords,
  };
}
