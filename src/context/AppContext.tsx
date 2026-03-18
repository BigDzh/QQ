import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { User } from '../types/auth';
import type { Project, Module, Component, Task, BorrowRecord, System } from '../types';
import { generateId, generateToken, verifyToken } from '../utils/auth';
import { addAuditLog } from '../services/audit';
import {
  safeSetObject,
  safeGetObject,
  autoCleanupIfNeeded,
  getStorageWarning,
  type StorageStatus,
} from '../services/storageManager';

interface AppState {
  currentUser: User | null;
  projects: Project[];
  tasks: Task[];
  borrowRecords: BorrowRecord[];
  isAuthenticated: boolean;
}

interface AppContextType extends AppState {
  login: (username: string, password: string) => boolean;
  logout: () => void;
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'logs'>) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  addModule: (projectId: string, module: Omit<Module, 'id' | 'logs' | 'statusChanges'>) => void;
  updateModule: (projectId: string, moduleId: string, updates: Partial<Module>) => void;
  deleteModule: (projectId: string, moduleId: string) => void;
  addSystem: (projectId: string, system: Omit<System, 'id' | 'logs' | 'statusChanges'>) => void;
  updateSystem: (projectId: string, systemId: string, updates: Partial<System>) => void;
  deleteSystem: (projectId: string, systemId: string) => void;
  addComponent: (projectId: string, moduleId: string, component: Omit<Component, 'id' | 'statusChanges'>) => void;
  updateComponent: (projectId: string, moduleId: string, componentId: string, updates: Partial<Component>) => void;
  deleteComponent: (projectId: string, moduleId: string, componentId: string) => void;
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  addBorrowRecord: (record: Omit<BorrowRecord, 'id'>) => void;
  returnBorrowRecord: (id: string) => void;
  getProject: (id: string) => Project | undefined;
  getModule: (id: string) => { project: Project; module: Module } | undefined;
  getComponent: (id: string) => { project: Project; module: Module; component: Component } | undefined;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const USERS_KEY = 'users';
const PROJECTS_KEY = 'projects';
const TASKS_KEY = 'tasks';
const BORROW_RECORDS_KEY = 'borrow_records';
const AUTH_TOKEN_KEY = 'auth_token';

const defaultUsers: User[] = [
  { id: '1', username: 'admin', password: 'admin123', name: '管理员', email: 'admin@example.com', role: 'admin', createdAt: '2026-03-15' },
];

const defaultProjects: Project[] = [
  {
    id: 'proj-001',
    name: '航天器控制系统',
    projectNumber: 'AAC-2024-001',
    stage: 'D阶段',
    version: 'v2.0',
    categories: ['控制类', '通信类', '电源类', '传感类'],
    modules: [
      {
        id: 'mod-001',
        projectId: 'proj-001',
        systemId: 'sys-001',
        productionOrderNumber: 'PO-2024-001',
        moduleNumber: 'M-CPU-001',
        moduleName: '中央处理器模块',
        category: '控制类',
        holder: '张三',
        status: '正常',
        stage: 'D阶段',
        version: 'v1.2',
        productionNumber: 'PN-100',
        components: [
          {
            id: 'comp-001',
            moduleId: 'mod-001',
            componentNumber: 'CPU-001',
            componentName: '高性能CPU芯片',
            productionOrderNumber: 'PO-2024-001',
            holder: '张三',
            status: '正常',
            stage: 'D阶段',
            version: 'v1.0',
            logs: [],
            statusChanges: [],
            certificates: { pcb: '已签署', assembly: '已签署', coating: '未签署', final: '未签署' } as any,
            burnedSoftware: [
              { id: 'sw-001', softwareId: 'sw-001', softwareName: '飞控软件', softwareVersion: 'v3.2.1', burnedAt: '2024-03-15', burnedBy: '张三' }
            ]
          },
          {
            id: 'comp-002',
            moduleId: 'mod-001',
            componentNumber: 'MEM-001',
            componentName: '存储器模块',
            productionOrderNumber: 'PO-2024-001',
            holder: '李四',
            status: '正常',
            stage: 'D阶段',
            version: 'v1.0',
            logs: [],
            statusChanges: [],
            certificates: { pcb: '已签署', assembly: '已签署', coating: '已签署', final: '已签署' } as any,
            burnedSoftware: []
          },
          {
            id: 'comp-003',
            moduleId: 'mod-001',
            componentNumber: 'PWR-001',
            componentName: '电源管理芯片',
            productionOrderNumber: 'PO-2024-001',
            holder: '王五',
            status: '故障',
            stage: 'D阶段',
            version: 'v1.0',
            logs: [],
            statusChanges: [],
            certificates: { pcb: '已签署', assembly: '未签署', coating: '未签署', final: '未签署' } as any,
            burnedSoftware: []
          }
        ],
        logs: [],
        statusChanges: []
      },
      {
        id: 'mod-002',
        projectId: 'proj-001',
        systemId: 'sys-002',
        productionOrderNumber: 'PO-2024-002',
        moduleNumber: 'M-COM-001',
        moduleName: '通信模块',
        category: '通信类',
        holder: '李四',
        status: '投产中',
        stage: 'D阶段',
        version: 'v1.1',
        productionNumber: 'PN-050',
        components: [
          {
            id: 'comp-004',
            moduleId: 'mod-002',
            componentNumber: 'RF-001',
            componentName: '射频收发器',
            productionOrderNumber: 'PO-2024-002',
            holder: '李四',
            status: '测试中',
            stage: 'D阶段',
            version: 'v1.0',
            logs: [],
            statusChanges: [],
            certificates: {},
            burnedSoftware: []
          },
          {
            id: 'comp-005',
            moduleId: 'mod-002',
            componentNumber: 'MODEM-001',
            componentName: '调制解调器',
            productionOrderNumber: 'PO-2024-002',
            holder: '李四',
            status: '正常',
            stage: 'D阶段',
            version: 'v1.0',
            logs: [],
            statusChanges: [],
            certificates: {},
            burnedSoftware: []
          }
        ],
        logs: [],
        statusChanges: []
      },
      {
        id: 'mod-003',
        projectId: 'proj-001',
        systemId: 'sys-001',
        productionOrderNumber: 'PO-2024-003',
        moduleNumber: 'M-PWR-001',
        moduleName: '电源模块',
        category: '电源类',
        holder: '王五',
        status: '正常',
        stage: 'P阶段',
        version: 'v2.0',
        productionNumber: 'PN-030',
        components: [
          {
            id: 'comp-006',
            moduleId: 'mod-003',
            componentNumber: 'BATT-001',
            componentName: '锂电池组',
            productionOrderNumber: 'PO-2024-003',
            holder: '王五',
            status: '正常',
            stage: 'P阶段',
            version: 'v2.0',
            logs: [],
            statusChanges: [],
            certificates: {},
            burnedSoftware: []
          }
        ],
        logs: [],
        statusChanges: []
      },
      {
        id: 'mod-004',
        projectId: 'proj-001',
        systemId: 'sys-002',
        productionOrderNumber: 'PO-2024-004',
        moduleNumber: 'M-SEN-001',
        moduleName: '传感器模块',
        category: '传感类',
        holder: '赵六',
        status: '维修中',
        stage: 'D阶段',
        version: 'v1.0',
        productionNumber: 'PN-020',
        components: [
          {
            id: 'comp-007',
            moduleId: 'mod-004',
            componentNumber: 'GPS-001',
            componentName: 'GPS定位模块',
            productionOrderNumber: 'PO-2024-004',
            holder: '赵六',
            status: '维修中',
            stage: 'D阶段',
            version: 'v1.0',
            logs: [],
            statusChanges: [],
            certificates: {},
            burnedSoftware: []
          },
          {
            id: 'comp-008',
            moduleId: 'mod-004',
            componentNumber: 'IMU-001',
            componentName: '惯性测量单元',
            productionOrderNumber: 'PO-2024-004',
            holder: '赵六',
            status: '仿真中',
            stage: 'D阶段',
            version: 'v1.0',
            logs: [],
            statusChanges: [],
            certificates: {},
            burnedSoftware: []
          }
        ],
        logs: [],
        statusChanges: []
      }
    ],
    documents: [
      { id: 'doc-001', name: '系统设计说明书', type: '设计文档', stage: 'D阶段' as const, status: '已完成' as const },
      { id: 'doc-002', name: '接口定义文档', type: '设计文档', stage: 'D阶段' as const, status: '已完成' as const },
      { id: 'doc-003', name: '测试大纲', type: '测试文档', stage: 'D阶段' as const, status: '未完成' as const },
      { id: 'doc-004', name: '验收标准', type: '验收文档', stage: 'P阶段' as const, status: '未完成' as const }
    ],
    software: [
      { id: 'sw-001', name: '飞控软件', version: 'v3.2.1', stage: 'D阶段' as const, status: '已完成' as const, md5: 'A1B2C3D4E5F6' },
      { id: 'sw-002', name: '通信协议栈', version: 'v2.1.0', stage: 'D阶段' as const, status: '已完成' as const, md5: 'F6E5D4C3B2A1' },
      { id: 'sw-003', name: '电源管理软件', version: 'v1.5.0', stage: 'P阶段' as const, status: '已完成' as const, md5: '1234567890AB' },
      { id: 'sw-004', name: '传感器融合算法', version: 'v1.0.0', stage: 'D阶段' as const, status: '未完成' as const, md5: '' }
    ],
    designFiles: [],
    logs: [],
    systems: [
      { id: 'sys-001', systemNumber: 'SYS-001', systemName: '姿态控制系统', instructionNumber: 'INS-2024-001', holder: '张三', status: '正常' as const, stage: 'D阶段' as const, version: 'v1.0' },
      { id: 'sys-002', systemNumber: 'SYS-002', systemName: '通信系统', instructionNumber: 'INS-2024-002', holder: '李四', status: '投产中' as const, stage: 'D阶段' as const, version: 'v1.0' }
    ],
    createdAt: '2024-01-15T08:00:00Z'
  },
  {
    id: 'proj-002',
    name: '卫星数据处理系统',
    projectNumber: 'SDS-2024-001',
    stage: 'C阶段',
    version: 'v1.0',
    categories: ['处理类', '存储类'],
    modules: [
      {
        id: 'mod-005',
        projectId: 'proj-002',
        productionOrderNumber: '',
        moduleNumber: 'M-DSP-001',
        moduleName: '数字信号处理器',
        category: '处理类',
        holder: '孙七',
        status: '未投产',
        stage: 'C阶段',
        version: 'v1.0',
        productionNumber: '',
        components: [],
        logs: [],
        statusChanges: []
      }
    ],
    documents: [],
    software: [],
    designFiles: [],
    logs: [],
    systems: [],
    createdAt: '2024-02-20T10:00:00Z'
  }
];

const defaultTasks: Task[] = [
  {
    id: 'task-001',
    title: '完成飞控软件v3.2.1版本测试',
    description: '完成所有测试用例的执行和问题修复',
    priority: '紧急' as const,
    status: '进行中' as const,
    dueDate: '2024-04-01',
    createdAt: '2024-03-01T08:00:00Z'
  },
  {
    id: 'task-002',
    title: '提交电源模块验收材料',
    description: '准备P阶段验收所需的所有文档和测试报告',
    priority: '高' as const,
    status: '进行中' as const,
    dueDate: '2024-04-15',
    createdAt: '2024-03-05T10:00:00Z'
  },
  {
    id: 'task-003',
    title: '采购传感器备件',
    description: 'IMU传感器库存不足，需要补充',
    priority: '中' as const,
    status: '已完成' as const,
    dueDate: '2024-03-20',
    createdAt: '2024-03-01T08:00:00Z',
    completedAt: '2024-03-18T15:00:00Z'
  },
  {
    id: 'task-004',
    title: '更新项目文档',
    description: '整理项目所有技术文档',
    priority: '低' as const,
    status: '已过期' as const,
    dueDate: '2024-03-10',
    createdAt: '2024-02-28T08:00:00Z'
  }
];

const defaultBorrowRecords: BorrowRecord[] = [
  {
    id: 'borrow-001',
    itemType: 'component' as const,
    itemId: 'comp-001',
    itemName: '高性能CPU芯片 (CPU-001)',
    borrower: '张三',
    borrowDate: '2024-03-15T09:00:00Z',
    expectedReturnDate: '2024-03-20',
    actualReturnDate: '',
    status: '借用中' as const,
    notes: '用于测试验证'
  },
  {
    id: 'borrow-002',
    itemType: 'module' as const,
    itemId: 'mod-002',
    itemName: '通信模块 (M-COM-001)',
    borrower: '李四',
    borrowDate: '2024-03-10T14:00:00Z',
    expectedReturnDate: '2024-03-17',
    actualReturnDate: '2024-03-16T10:00:00Z',
    status: '已归还' as const,
    notes: '已归还'
  }
];

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [borrowRecords, setBorrowRecords] = useState<BorrowRecord[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    autoCleanupIfNeeded();
    const warning = getStorageWarning();
    if (warning) {
      console.warn('Storage warning:', warning);
    }

    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        const usersData = localStorage.getItem(USERS_KEY);
        const users: User[] = usersData ? JSON.parse(usersData) : defaultUsers;
        const user = users.find((u) => u.id === payload.id);
        if (user) {
          setCurrentUser(user);
          setIsAuthenticated(true);
        }
      }
    }

    const storedProjects = safeGetObject<Project[]>(PROJECTS_KEY);
    if (storedProjects && storedProjects.length > 0) {
      setProjects(storedProjects);
    } else {
      setProjects(defaultProjects);
      safeSetObject(PROJECTS_KEY, defaultProjects);
    }

    const storedTasks = safeGetObject<Task[]>(TASKS_KEY);
    if (storedTasks && storedTasks.length > 0) {
      setTasks(storedTasks);
    } else {
      setTasks(defaultTasks);
      safeSetObject(TASKS_KEY, defaultTasks);
    }

    const storedBorrowRecords = safeGetObject<BorrowRecord[]>(BORROW_RECORDS_KEY);
    if (storedBorrowRecords && storedBorrowRecords.length > 0) {
      setBorrowRecords(storedBorrowRecords);
    } else {
      setBorrowRecords(defaultBorrowRecords);
      safeSetObject(BORROW_RECORDS_KEY, defaultBorrowRecords);
    }

    if (!localStorage.getItem(USERS_KEY)) {
      safeSetObject(USERS_KEY, defaultUsers);
    }
  }, []);

  useEffect(() => {
    safeSetObject(PROJECTS_KEY, projects);
  }, [projects]);

  useEffect(() => {
    safeSetObject(TASKS_KEY, tasks);
  }, [tasks]);

  useEffect(() => {
    safeSetObject(BORROW_RECORDS_KEY, borrowRecords);
  }, [borrowRecords]);

  const login = useCallback((username: string, password: string): boolean => {
    const usersData = localStorage.getItem(USERS_KEY);
    const users: User[] = usersData ? JSON.parse(usersData) : defaultUsers;
    const user = users.find((u) => u.username === username && u.password === password);
    
    if (user) {
      const token = generateToken(user);
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      setCurrentUser(user);
      setIsAuthenticated(true);
      addAuditLog(user.id, user.username, 'LOGIN', 'INFO', '用户');
      return true;
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

  const deleteProject = useCallback((id: string) => {
    const project = projects.find((p) => p.id === id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    if (currentUser && project) {
      addAuditLog(currentUser.id, currentUser.username, 'DELETE', 'WARNING', '项目', id, project.name);
    }
  }, [currentUser, projects]);

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

  const updateModule = useCallback((projectId: string, moduleId: string, updates: Partial<Module>) => {
    setProjects((prev) => prev.map((p) => {
      if (p.id === projectId) {
        return {
          ...p,
          modules: p.modules.map((m) => (m.id === moduleId ? { ...m, ...updates } : m)),
        };
      }
      return p;
    }));
    if (currentUser) {
      addAuditLog(currentUser.id, currentUser.username, 'UPDATE', 'INFO', '模块', moduleId);
    }
  }, [currentUser]);

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

  const addSystem = useCallback((projectId: string, system: Omit<System, 'id' | 'logs' | 'statusChanges'>) => {
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
  }, [currentUser]);

  const updateSystem = useCallback((projectId: string, systemId: string, updates: Partial<System>) => {
    setProjects((prev) => prev.map((p) => {
      if (p.id === projectId) {
        return {
          ...p,
          systems: (p.systems || []).map((s) => (s.id === systemId ? { ...s, ...updates } : s)),
        };
      }
      return p;
    }));
    if (currentUser) {
      addAuditLog(currentUser.id, currentUser.username, 'UPDATE', 'INFO', '系统', systemId);
    }
  }, [currentUser]);

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
      if (p.id === projectId) {
        return {
          ...p,
          modules: p.modules.map((m) => {
            if (m.id === moduleId) {
              return { ...m, components: [...m.components, newComponent] };
            }
            return m;
          }),
        };
      }
      return p;
    }));
    if (currentUser) {
      addAuditLog(currentUser.id, currentUser.username, 'CREATE', 'INFO', '组件', newComponent.id, newComponent.componentName);
    }
  }, [currentUser]);

  const updateComponent = useCallback((projectId: string, moduleId: string, componentId: string, updates: Partial<Component>) => {
    setProjects((prev) => prev.map((p) => {
      if (p.id === projectId) {
        return {
          ...p,
          modules: p.modules.map((m) => {
            if (m.id === moduleId) {
              return {
                ...m,
                components: m.components.map((c) => (c.id === componentId ? { ...c, ...updates } : c)),
              };
            }
            return m;
          }),
        };
      }
      return p;
    }));
    if (currentUser) {
      addAuditLog(currentUser.id, currentUser.username, 'UPDATE', 'INFO', '组件', componentId);
    }
  }, [currentUser]);

  const deleteComponent = useCallback((projectId: string, moduleId: string, componentId: string) => {
    setProjects((prev) => prev.map((p) => {
      if (p.id === projectId) {
        return {
          ...p,
          modules: p.modules.map((m) => {
            if (m.id === moduleId) {
              return { ...m, components: m.components.filter((c) => c.id !== componentId) };
            }
            return m;
          }),
        };
      }
      return p;
    }));
    if (currentUser) {
      addAuditLog(currentUser.id, currentUser.username, 'DELETE', 'WARNING', '组件', componentId);
    }
  }, [currentUser]);

  const addTask = useCallback((task: Omit<Task, 'id' | 'createdAt'>) => {
    const newTask: Task = {
      ...task,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    setTasks((prev) => [...prev, newTask]);
    if (currentUser) {
      addAuditLog(currentUser.id, currentUser.username, 'CREATE', 'INFO', '任务', newTask.id, newTask.title);
    }
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

  const getComponent = useCallback((id: string) => {
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

  return (
    <AppContext.Provider
      value={{
        currentUser,
        projects,
        tasks,
        borrowRecords,
        isAuthenticated,
        login,
        logout,
        addProject,
        updateProject,
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
        addTask,
        updateTask,
        deleteTask,
        addBorrowRecord,
        returnBorrowRecord,
        getProject,
        getModule,
        getComponent,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
