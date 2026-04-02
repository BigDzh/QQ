import React, { useEffect, lazy, Suspense, useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import { PerformanceModeProvider } from './context/PerformanceModeContext';
import { LowPerformanceModeProvider } from './context/LowPerformanceModeContext';
import { ToastProvider, useToast } from './components/Toast';
import { TaskNotificationProvider } from './components/TaskNotificationPopup';
import { TransferProvider } from './components/TransferProgress';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import GlobalSearch from './components/search/GlobalSearch';

import { WelcomeScreen } from './components/help/WelcomeScreen';
import { useAutoTaskManager } from './hooks/useAutoTaskManager';
import { useTaskProjectSync } from './hooks/useTaskProjectSync';
import { useMemoryMonitor } from './hooks/useMemoryMonitor';
import { useServerLifecycle } from './hooks/useServerLifecycle';
import { ServiceWorkerUpdatePrompt } from './hooks/useServiceWorker';
import Login from './pages/Login';
import ProjectList from './pages/ProjectList';
import { Loader2 } from 'lucide-react';
import { SkeletonDashboard } from './components/Skeleton';

const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
const CategoryModules = lazy(() => import('./pages/CategoryModules'));
const ModuleDetail = lazy(() => import('./pages/ModuleDetail'));
const ComponentDetail = lazy(() => import('./pages/ComponentDetail'));
const SoftwareDetail = lazy(() => import('./pages/SoftwareDetail'));
const SystemDetail = lazy(() => import('./pages/SystemDetail'));
const TaskManagement = lazy(() => import('./pages/TaskManagement'));
const BorrowSystem = lazy(() => import('./pages/BorrowSystem'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const BackupManagement = lazy(() => import('./pages/BackupManagement'));
const AuditLogManagement = lazy(() => import('./pages/AuditLogManagement'));
const DatabaseManagement = lazy(() => import('./pages/DatabaseManagement'));
const Tools = lazy(() => import('./pages/Tools'));
const WorkflowDetail = lazy(() => import('./pages/WorkflowDetail'));
const TestDataInitializer = lazy(() => import('./pages/TestDataInitializer'));

const PerformanceMonitor = lazy(() => import('./components/PerformanceMonitor'));

function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full gap-4 p-8">
      <Loader2 className="animate-spin text-cyan-500" size={40} />
      <div className="w-full max-w-4xl">
        <SkeletonDashboard />
      </div>
    </div>
  );
}

function PrefetchHelper() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const prefetchAssets = () => {
      const assetsToPrefetch = [
        { href: '/assets/vendor-react.js', as: 'script', type: 'module' },
        { href: '/assets/index.js', as: 'script', type: 'module' },
      ];

      assetsToPrefetch.forEach((asset) => {
        const existingLink = document.querySelector(`link[href="${asset.href}"]`);
        if (existingLink) return;

        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = asset.as;
        link.href = asset.href;
        if (asset.type) {
          link.setAttribute('fetchpriority', 'high');
        }
        document.head.appendChild(link);
      });
    };

    const prefetchRoutes = ['/projects', '/tasks', '/borrow', '/tools', '/backups'];
    prefetchRoutes.forEach((route) => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.as = 'document';
      link.href = route;
      document.head.appendChild(link);
    });

    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(prefetchAssets, { timeout: 2000 });
    } else {
      setTimeout(prefetchAssets, 1);
    }
  }, []);

  return null;
}

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
    checkInterval: 30000,
    enabled: true,
  });

  useEffect(() => {
    if (alerts && alerts.length > 0) {
      const latest = alerts[alerts.length - 1];
      console.warn(`[Memory ${latest.type.toUpperCase()}] ${latest.message}`);
    }
  }, [alerts]);

  return <>{children}</>;
}

function ServerLifecycleWrapper({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();

  useServerLifecycle({
    serverUrl: 'http://localhost:5173',
    processes: [],
    terminationDelay: 1000,
    enabled: true,
    onServerTerminating: () => {
      console.log('[App] Server termination initiated');
    },
    onServerTerminated: () => {
      console.log('[App] Server termination completed');
    },
    onError: (error) => {
      console.error('[App] Server termination error:', error);
      showToast(`服务器关闭异常: ${error.message}`, 'error');
    },
  });

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
            <ServerLifecycleWrapper>
              <MemoryMonitorWrapper>
                <Layout>
                  <GlobalSearch />
                  <Routes>
                    <Route path="/" element={<Navigate to="/projects" replace />} />
                    <Route path="/projects" element={<ProjectList />} />
                    <Route path="/projects/:id" element={<Suspense fallback={<PageLoader />}><ProjectDetail /></Suspense>} />
                    <Route path="/projects/:id/category/:category" element={<Suspense fallback={<PageLoader />}><CategoryModules /></Suspense>} />
                    <Route path="/systems/:id" element={<Suspense fallback={<PageLoader />}><SystemDetail /></Suspense>} />
                    <Route path="/modules/:id" element={<Suspense fallback={<PageLoader />}><ModuleDetail /></Suspense>} />
                    <Route path="/components/:id" element={<Suspense fallback={<PageLoader />}><ComponentDetail /></Suspense>} />
                    <Route path="/software/:id" element={<Suspense fallback={<PageLoader />}><SoftwareDetail /></Suspense>} />
                    <Route path="/tasks" element={<Suspense fallback={<PageLoader />}><TaskManagement /></Suspense>} />
                    <Route path="/borrow" element={<Suspense fallback={<PageLoader />}><BorrowSystem /></Suspense>} />
                    <Route path="/tools" element={<Suspense fallback={<PageLoader />}><Tools /></Suspense>} />
                    <Route path="/workflows/:id" element={<Suspense fallback={<PageLoader />}><WorkflowDetail /></Suspense>} />
                    <Route path="/users" element={<Suspense fallback={<PageLoader />}><UserManagement /></Suspense>} />
                    <Route path="/backups" element={<Suspense fallback={<PageLoader />}><BackupManagement /></Suspense>} />
                    <Route path="/audit-logs" element={<Suspense fallback={<PageLoader />}><AuditLogManagement /></Suspense>} />
                    <Route path="/database" element={<Suspense fallback={<PageLoader />}><DatabaseManagement /></Suspense>} />
                    <Route path="/test-data" element={<Suspense fallback={<PageLoader />}><TestDataInitializer /></Suspense>} />
                    <Route path="*" element={<Navigate to="/projects" replace />} />
                  </Routes>
                </Layout>
              </MemoryMonitorWrapper>
            </ServerLifecycleWrapper>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  const isDev = import.meta.env.DEV;
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    const welcomeCompleted = localStorage.getItem('welcome_screen_completed');
    if (!welcomeCompleted) {
      setShowWelcome(true);
    }
  }, []);

  const handleWelcomeComplete = useCallback(() => {
    setShowWelcome(false);
  }, []);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <ToastProvider>
            <AppProvider>
              <PerformanceModeProvider>
                <LowPerformanceModeProvider>
                  <TaskNotificationProvider>
                    <TransferProvider>
                      <PrefetchHelper />
                      <ServiceWorkerUpdatePrompt />
                      {showWelcome && (
                        <WelcomeScreen
                          onComplete={handleWelcomeComplete}
                          onSkip={handleWelcomeComplete}
                        />
                      )}
                      <AppRoutes />
                      {isDev && (
                        <Suspense fallback={null}>
                          <PerformanceMonitor
                            isVisible={true}
                            defaultExpanded={false}
                          />
                        </Suspense>
                      )}
                    </TransferProvider>
                  </TaskNotificationProvider>
                </LowPerformanceModeProvider>
              </PerformanceModeProvider>
            </AppProvider>
          </ToastProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
