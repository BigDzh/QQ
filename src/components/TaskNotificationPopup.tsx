import { useState, useCallback, createContext, useContext, type ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface TaskNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
}

interface TaskNotificationContextType {
  showNotification: (title: string, message: string, type?: NotificationType) => void;
}

const TaskNotificationContext = createContext<TaskNotificationContextType | undefined>(undefined);

interface TaskNotificationPopupProps {
  children: ReactNode;
}

export function TaskNotificationProvider({ children }: TaskNotificationPopupProps) {
  const [notifications, setNotifications] = useState<TaskNotification[]>([]);
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());

  const hideNotification = useCallback((id: string) => {
    setVisibleIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 300);
  }, []);

  const showNotification = useCallback((title: string, message: string, type: NotificationType = 'info') => {
    const id = Date.now().toString();
    const notification: TaskNotification = { id, type, title, message };

    setNotifications((prev) => [...prev, notification]);

    requestAnimationFrame(() => {
      setVisibleIds((prev) => new Set([...prev, id]));
    });

    setTimeout(() => {
      hideNotification(id);
    }, 3000);
  }, [hideNotification]);

  return (
    <TaskNotificationContext.Provider value={{ showNotification }}>
      {children}
      <div className="fixed top-20 right-4 z-[99998] pointer-events-none flex flex-col gap-2 items-end">
        {notifications.map((notification) => {
          const isVisible = visibleIds.has(notification.id);
          return (
            <NotificationItem
              key={notification.id}
              notification={notification}
              isVisible={isVisible}
              onClose={() => hideNotification(notification.id)}
            />
          );
        })}
      </div>
    </TaskNotificationContext.Provider>
  );
}

interface NotificationItemProps {
  notification: TaskNotification;
  isVisible: boolean;
  onClose: () => void;
}

function NotificationItem({ notification, isVisible, onClose }: NotificationItemProps) {
  const { type, title, message } = notification;

  const icons = {
    success: <CheckCircle className="text-green-500" size={24} />,
    error: <AlertCircle className="text-red-500" size={24} />,
    info: <Info className="text-blue-500" size={24} />,
    warning: <AlertTriangle className="text-yellow-500" size={24} />,
  };

  const bgColors = {
    success: 'bg-green-50/95 dark:bg-green-900/80 border-green-200 dark:border-green-700',
    error: 'bg-red-50/95 dark:bg-red-900/80 border-red-200 dark:border-red-700',
    info: 'bg-blue-50/95 dark:bg-blue-900/80 border-blue-200 dark:border-blue-700',
    warning: 'bg-yellow-50/95 dark:bg-yellow-900/80 border-yellow-200 dark:border-yellow-700',
  };

  return (
    <div
      className={`
        flex items-start gap-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-md
        min-w-[320px] max-w-[420px]
        transition-all duration-300 ease-out
        ${bgColors[type]}
        ${isVisible
          ? 'opacity-100 translate-x-0 translate-y-0 pointer-events-auto'
          : 'opacity-0 translate-x-2 translate-y-0 pointer-events-none'
        }
      `}
      role="alert"
      aria-live="polite"
    >
      <div className="flex-shrink-0 mt-0.5">
        {icons[type]}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5">
          {title}
        </h4>
        <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
          {message}
        </p>
      </div>
      <button
        onClick={onClose}
        className="flex-shrink-0 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        aria-label="关闭通知"
      >
        <X size={16} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" />
      </button>
    </div>
  );
}

export function useTaskNotification() {
  const context = useContext(TaskNotificationContext);
  if (!context) {
    throw new Error('useTaskNotification must be used within TaskNotificationProvider');
  }
  return context;
}
