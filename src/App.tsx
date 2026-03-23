import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider, useToast } from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import GlobalSearch from './components/search/GlobalSearch';
import { useAutoTaskManager } from './hooks/useAutoTaskManager';
import { useTaskProjectSync } from './hooks/useTaskProjectSync';
import { useMemoryMonitor } from './hooks/useMemoryMonitor';
import Login from './pages/Login';
import ProjectList from './pages/ProjectList';
import ProjectDetail from './pages/ProjectDetail';
import CategoryModules from './pages/CategoryModules';
import ModuleDetail from './pages/ModuleDetail';
import ComponentDetail from './pages/ComponentDetail';
import SoftwareDetail from './pages/SoftwareDetail';
import SystemDetail from './pages/SystemDetail';
import FileManagement from './pages/FileManagement';
import TaskManagement from './pages/TaskManagement';
import BorrowSystem from './pages/BorrowSystem';
import UserManagement from './pages/UserManagement';
import BackupManagement from './pages/BackupManagement';
import AuditLogManagement from './pages/AuditLogManagement';
import DatabaseManagement from './pages/DatabaseManagement';
import Tools from './pages/Tools';
import TestDataInitializer from './pages/TestDataInitializer';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useApp();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function MemoryMonitorWrapper({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();

  const { alerts } = useMemoryMonitor({
    onAlert: (alert) => {
      showToast(alert.message, alert.type === 'critical' ? 'error' : 'warning');
    },
    checkInterval: 15000,
    enabled: true,
  });

  useEffect(() => {
    if (alerts.length > 0) {
      const latest = alerts[alerts.length - 1];
      console.warn(`[Memory ${latest.type.toUpperCase()}] ${latest.message}`);
    }
  }, [alerts]);

  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated } = useApp();

  useAutoTaskManager();
  useTaskProjectSync();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/projects" replace /> : <Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <MemoryMonitorWrapper>
              <Layout>
                <GlobalSearch />
                <Routes>
                  <Route path="/" element={<Navigate to="/projects" replace />} />
                  <Route path="/projects" element={<ProjectList />} />
                  <Route path="/projects/:id" element={<ProjectDetail />} />
                  <Route path="/projects/:id/category/:category" element={<CategoryModules />} />
                  <Route path="/projects/:id/files" element={<FileManagement />} />
                  <Route path="/systems/:id" element={<SystemDetail />} />
                  <Route path="/modules/:id" element={<ModuleDetail />} />
                  <Route path="/components/:id" element={<ComponentDetail />} />
                  <Route path="/software/:id" element={<SoftwareDetail />} />
                  <Route path="/tasks" element={<TaskManagement />} />
                  <Route path="/borrow" element={<BorrowSystem />} />
                  <Route path="/tools" element={<Tools />} />
                  <Route path="/users" element={<UserManagement />} />
                  <Route path="/backups" element={<BackupManagement />} />
                  <Route path="/audit-logs" element={<AuditLogManagement />} />
                  <Route path="/database" element={<DatabaseManagement />} />
                  <Route path="/test-data" element={<TestDataInitializer />} />
                  <Route path="*" element={<Navigate to="/projects" replace />} />
                </Routes>
              </Layout>
            </MemoryMonitorWrapper>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppProvider>
          <ThemeProvider>
            <ToastProvider>
              <AppRoutes />
            </ToastProvider>
          </ThemeProvider>
        </AppProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
