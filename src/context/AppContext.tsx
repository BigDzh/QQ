import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { User } from '../types/auth';
import type { Project, Module, Component, Task, BorrowRecord } from '../types';
import { generateId, generateToken, verifyToken } from '../utils/auth';
import { addAuditLog } from '../services/audit';

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
  addComponent: (projectId: string, moduleId: string, component: Omit<Component, 'id' | 'logs' | 'statusChanges' | 'certificates'>) => void;
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

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [borrowRecords, setBorrowRecords] = useState<BorrowRecord[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
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

    const storedProjects = localStorage.getItem(PROJECTS_KEY);
    if (storedProjects) {
      setProjects(JSON.parse(storedProjects));
    }

    const storedTasks = localStorage.getItem(TASKS_KEY);
    if (storedTasks) {
      setTasks(JSON.parse(storedTasks));
    }

    const storedBorrowRecords = localStorage.getItem(BORROW_RECORDS_KEY);
    if (storedBorrowRecords) {
      setBorrowRecords(JSON.parse(storedBorrowRecords));
    }

    if (!localStorage.getItem(USERS_KEY)) {
      localStorage.setItem(USERS_KEY, JSON.stringify(defaultUsers));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem(BORROW_RECORDS_KEY, JSON.stringify(borrowRecords));
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

  const addComponent = useCallback((projectId: string, moduleId: string, component: Omit<Component, 'id' | 'logs' | 'statusChanges' | 'certificates'>) => {
    const newComponent: Component = {
      ...component,
      id: generateId(),
      logs: [],
      statusChanges: [],
      certificates: {},
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
