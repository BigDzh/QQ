import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import type { User } from '../types/auth';
import type { Project, Module, Component, Task, BorrowRecord, System, ProjectStage, SystemStatus, DesignFile, ModuleStatus } from '../types';
import { generateId, generateToken, verifyToken, hashPassword } from '../utils/auth';
import { addAuditLog } from '../services/audit';
import {
  safeSetObject,
  safeGetObject,
  autoCleanupIfNeeded,
  getStorageWarning,
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
  addSystem: (projectId: string, system: Omit<System, 'id' | 'logs' | 'statusChanges'>) => string;
  updateSystem: (projectId: string, systemId: string, updates: Partial<System>) => void;
  deleteSystem: (projectId: string, systemId: string) => void;
  addComponent: (projectId: string, moduleId: string, component: Omit<Component, 'id' | 'statusChanges'>) => void;
  updateComponent: (projectId: string, moduleId: string, componentId: string, updates: Partial<Component> & { statusChangeReason?: string }) => void;
  deleteComponent: (projectId: string, moduleId: string, componentId: string) => void;
  updateDocument: (projectId: string, documentId: string, updates: Partial<Document>) => void;
  deleteDocument: (projectId: string, documentId: string) => void;
  addDesignFile: (projectId: string, designFile: Omit<DesignFile, 'id'>) => void;
  updateDesignFile: (projectId: string, designFileId: string, updates: Partial<DesignFile>) => void;
  deleteDesignFile: (projectId: string, designFileId: string) => void;
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => string;
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

const STORAGE_DEBOUNCE_MS = 500;

const defaultPasswordHash = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9';
const defaultUsername = 'admin';

const defaultUsers: User[] = [
  { id: '1', username: defaultUsername, password: defaultPasswordHash, name: '管理员', email: 'admin@example.com', role: 'admin', createdAt: '2026-03-15' },
];

const defaultProjects: Project[] = [
  {
    id: 'proj-001',
    name: '航天器控制系统',
    projectNumber: 'AAC-2024-001',
    stage: 'D阶段',
    version: 'B版',
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
        version: 'B版',
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
            version: 'A版',
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
            version: 'A版',
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
      { id: 'doc-001', documentNumber: 'DOC-2024-001', name: '系统设计说明书', type: '设计文档', stage: 'D阶段' as const, status: '已完成' as const },
      { id: 'doc-002', documentNumber: 'DOC-2024-002', name: '接口定义文档', type: '设计文档', stage: 'D阶段' as const, status: '已完成' as const },
      { id: 'doc-003', documentNumber: 'DOC-2024-003', name: '测试大纲', type: '测试文档', stage: 'D阶段' as const, status: '未完成' as const },
      { id: 'doc-004', documentNumber: 'DOC-2024-004', name: '验收标准', type: '验收文档', stage: 'P阶段' as const, status: '未完成' as const }
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
      { id: 'sys-001', projectId: 'proj-001', systemNumber: 'SYS-001', systemName: '姿态控制系统', instructionNumber: 'INS-2024-001', holder: '张三', status: '正常' as SystemStatus, stage: 'D阶段' as ProjectStage, version: 'v1.0', logs: [], statusChanges: [] },
      { id: 'sys-002', projectId: 'proj-001', systemNumber: 'SYS-002', systemName: '通信系统', instructionNumber: 'INS-2024-002', holder: '李四', status: '投产中' as SystemStatus, stage: 'D阶段' as ProjectStage, version: 'v1.0', logs: [], statusChanges: [] }
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

  const projectsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tasksTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const borrowRecordsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitializedRef = useRef(false);

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
        let users: User[] = defaultUsers;
        if (usersData) {
          try {
            const parsed = JSON.parse(usersData);
            if (Array.isArray(parsed) && parsed.length > 0) {
              users = parsed;
            }
          } catch {
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

    return () => {
      if (projectsTimerRef.current) clearTimeout(projectsTimerRef.current);
      if (tasksTimerRef.current) clearTimeout(tasksTimerRef.current);
      if (borrowRecordsTimerRef.current) clearTimeout(borrowRecordsTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isInitializedRef.current) return;
    if (projectsTimerRef.current) clearTimeout(projectsTimerRef.current);
    projectsTimerRef.current = setTimeout(() => {
      safeSetObject(PROJECTS_KEY, projects);
    }, STORAGE_DEBOUNCE_MS);
  }, [projects]);

  useEffect(() => {
    if (!isInitializedRef.current) return;
    if (tasksTimerRef.current) clearTimeout(tasksTimerRef.current);
    tasksTimerRef.current = setTimeout(() => {
      safeSetObject(TASKS_KEY, tasks);
    }, STORAGE_DEBOUNCE_MS);
  }, [tasks]);

  useEffect(() => {
    if (!isInitializedRef.current) return;
    if (borrowRecordsTimerRef.current) clearTimeout(borrowRecordsTimerRef.current);
    borrowRecordsTimerRef.current = setTimeout(() => {
      safeSetObject(BORROW_RECORDS_KEY, borrowRecords);
    }, STORAGE_DEBOUNCE_MS);
  }, [borrowRecords]);

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
          // invalid JSON, keep defaultUsers
        }
      }
      const hashedInput = hashPassword(password);
      const user = users.find((u) => u.username === username && u.password === hashedInput);

      if (user) {
        const token = generateToken(user);
        localStorage.setItem(AUTH_TOKEN_KEY, token);
        setCurrentUser(user);
        setIsAuthenticated(true);
        addAuditLog(user.id, user.username, 'LOGIN', 'INFO', '用户');
        return true;
      }
    } catch (error) {
      console.error('Login error:', error);
    }
    return false;
  }, [hashPassword, generateToken]);

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

  const calculateModuleStatus = (components: any[]): ModuleStatus => {
    if (components.length === 0) return '未投产';
    if (components.every(c => c.status === '正常')) return '正常';
    if (components.some(c => c.status === '故障')) return '故障';
    if (components.some(c => c.status === '维修中')) return '维修中';
    if (components.some(c => c.status === '三防中')) return '三防中';
    if (components.some(c => c.status === '测试中')) return '测试中';
    if (components.some(c => c.status === '仿真中')) return '仿真中';
    if (components.some(c => c.status === '投产中')) return '投产中';
    if (components.some(c => c.status === '借用中')) return '借用中';
    if (components.every(c => c.status === '未投产')) return '未投产';
    return '未投产';
  };

  const calculateSystemStatus = (modules: any[]): SystemStatus => {
    if (modules.length === 0) return '未投产';
    if (modules.every(m => m.status === '正常')) return '正常';
    if (modules.some(m => m.status === '故障')) return '故障';
    if (modules.some(m => m.status === '维修中')) return '维修中';
    if (modules.some(m => m.status === '三防中')) return '三防中';
    if (modules.some(m => m.status === '测试中')) return '测试中';
    if (modules.some(m => m.status === '仿真中')) return '仿真中';
    if (modules.some(m => m.status === '投产中')) return '投产中';
    if (modules.some(m => m.status === '借用中')) return '借用中';
    if (modules.every(m => m.status === '未投产')) return '未投产';
    return '未投产';
  };

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

  const updateSystem = useCallback((projectId: string, systemId: string, updates: Partial<System>) => {
    setProjects((prev) => prev.map((p) => {
      if (p.id === projectId) {
        const system = p.systems?.find(s => s.id === systemId);
        const changes: string[] = [];
        if (updates.systemName && updates.systemName !== system?.systemName) changes.push(`系统名称: ${system?.systemName} → ${updates.systemName}`);
        if (updates.systemNumber && updates.systemNumber !== system?.systemNumber) changes.push(`系统编号: ${system?.systemNumber} → ${updates.systemNumber}`);
        if (updates.instructionNumber && updates.instructionNumber !== system?.instructionNumber) changes.push(`指令号: ${system?.instructionNumber} → ${updates.instructionNumber}`);
        if (updates.holder && updates.holder !== system?.holder) changes.push(`负责人: ${system?.holder || '-'} → ${updates.holder}`);
        if (updates.stage && updates.stage !== system?.stage) changes.push(`阶段: ${system?.stage} → ${updates.stage}`);
        if (updates.version && updates.version !== system?.version) changes.push(`版本: ${system?.version} → ${updates.version}`);
        if (updates.status && updates.status !== system?.status) changes.push(`状态: ${system?.status} → ${updates.status}`);

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

  const updateComponent = useCallback((projectId: string, moduleId: string, componentId: string, updates: Partial<Component> & { statusChangeReason?: string }) => {
    setProjects((prev) => prev.map((p) => {
      if (p.id !== projectId) return p;

      const updatedModules = p.modules.map((m) => {
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

        const { statusChangeReason, ...restUpdates } = updates;

        const updatedComponents = m.components.map((c) => (c.id === componentId ? {
          ...c,
          ...restUpdates,
          logs: updatedLogs,
          statusChanges: updatedStatusChanges,
        } : c));

        const newModuleStatus = calculateModuleStatus(updatedComponents);

        return {
          ...m,
          components: updatedComponents,
          status: newModuleStatus,
        };
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

      const updatedProject = {
        ...p,
        modules: updatedModules,
        systems: updatedSystems,
      };

      return updatedProject;
    }));
    if (currentUser) {
      addAuditLog(currentUser.id, currentUser.username, 'UPDATE', 'INFO', '组件', componentId);
    }
  }, [currentUser]);

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
        updateDocument,
        deleteDocument,
        addDesignFile,
        updateDesignFile,
        deleteDesignFile,
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
