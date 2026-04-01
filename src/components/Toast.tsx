import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react';
import ReactDOM from 'react-dom';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle, Bell, BellOff, Trash2, Check, Settings } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  timestamp: number;
  read?: boolean;
}

interface NotificationItem {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  actionUrl?: string;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  notifications: NotificationItem[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  addNotification: (notification: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const MAX_TOASTS = 5;
const TOAST_DURATION = 4000;
const MAX_NOTIFICATIONS = 50;

function ToastItem({ toast, remove }: { toast: Toast; remove: (id: string) => void }) {
  const icons = {
    success: <CheckCircle className="text-green-500" size={20} />,
    error: <AlertCircle className="text-red-500" size={20} />,
    info: <Info className="text-blue-500" size={20} />,
    warning: <AlertTriangle className="text-yellow-500" size={20} />,
  };

  const bgColors = {
    success: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800',
    error: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800',
    info: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
    warning: 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800',
  };

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg animate-slide-in ${bgColors[toast.type]}`}
    >
      {icons[toast.type]}
      <span className="text-sm text-gray-700 dark:text-gray-200 flex-1">{toast.message}</span>
      <button
        onClick={() => remove(toast.id)}
        className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      >
        <X size={16} />
      </button>
    </div>
  );
}

function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
  const container = (
    <div className="fixed top-4 right-4 z-[var(--z-toast)] flex flex-col gap-2 pointer-events-none w-80">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} remove={removeToast} />
      ))}
    </div>
  );

  const mountPoint = document.getElementById('toast-root') || (() => {
    const el = document.createElement('div');
    el.id = 'toast-root';
    document.body.appendChild(el);
    return el;
  })();

  return ReactDOM.createPortal(container, mountPoint);
}

function NotificationCenter({
  notifications,
  unreadCount,
  onClose,
  onMarkAsRead,
  onMarkAllAsRead,
  onClear,
}: {
  notifications: NotificationItem[];
  unreadCount: number;
  onClose: () => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClear: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');

  const filteredNotifications = activeTab === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications;

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    return `${days}天前`;
  };

  const typeIcons = {
    success: <CheckCircle className="text-green-500" size={16} />,
    error: <AlertCircle className="text-red-500" size={16} />,
    info: <Info className="text-blue-500" size={16} />,
    warning: <AlertTriangle className="text-yellow-500" size={16} />,
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[var(--z-toast)]" onClick={onClose}>
      <div
        className="absolute top-0 right-0 w-96 h-full bg-white dark:bg-gray-800 shadow-2xl flex flex-col animate-slide-in-right"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Bell size={20} className="text-gray-600 dark:text-gray-300" />
            <h2 className="font-semibold text-gray-800 dark:text-white">通知中心</h2>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'all'
                ? 'text-cyan-500 border-b-2 border-cyan-500'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            全部
          </button>
          <button
            onClick={() => setActiveTab('unread')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'unread'
                ? 'text-cyan-500 border-b-2 border-cyan-500'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            未读 {unreadCount > 0 && `(${unreadCount})`}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <BellOff size={48} className="mb-3 opacity-50" />
              <p className="text-sm">{activeTab === 'unread' ? '暂无未读通知' : '暂无通知'}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => onMarkAsRead(notification.id)}
                  className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors ${
                    !notification.read ? 'bg-cyan-50/50 dark:bg-cyan-900/10' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{typeIcons[notification.type]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className={`text-sm font-medium ${!notification.read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                          {notification.title}
                        </h3>
                        {!notification.read && (
                          <span className="w-2 h-2 bg-cyan-500 rounded-full flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {formatTime(notification.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <button
            onClick={onMarkAllAsRead}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-cyan-500 transition-colors"
          >
            <Check size={16} />
            全部已读
          </button>
          <button
            onClick={onClear}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-red-500 transition-colors"
          >
            <Trash2 size={16} />
            清空
          </button>
        </div>
      </div>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2);
    setToasts((prev) => {
      const newToasts = [...prev, { id, type, message, timestamp: Date.now() }];
      if (newToasts.length > MAX_TOASTS) {
        const removed = newToasts.shift();
        if (removed) {
          const timer = timersRef.current.get(removed.id);
          if (timer) {
            clearTimeout(timer);
            timersRef.current.delete(removed.id);
          }
        }
      }
      return newToasts;
    });

    const timer = setTimeout(() => {
      removeToast(id);
    }, TOAST_DURATION);
    timersRef.current.set(id, timer);
  }, [removeToast]);

  const addNotification = useCallback((notification: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: NotificationItem = {
      ...notification,
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      timestamp: Date.now(),
      read: false,
    };
    setNotifications(prev => [newNotification, ...prev].slice(0, MAX_NOTIFICATIONS));
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  return (
    <ToastContext.Provider
      value={{
        showToast,
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearNotifications,
        addNotification,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      {showNotificationCenter && (
        <NotificationCenter
          notifications={notifications}
          unreadCount={unreadCount}
          onClose={() => setShowNotificationCenter(false)}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          onClear={clearNotifications}
        />
      )}
      <NotificationBell
        unreadCount={unreadCount}
        onClick={() => setShowNotificationCenter(true)}
      />
    </ToastContext.Provider>
  );
}

function NotificationBell({ unreadCount, onClick }: { unreadCount: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-[var(--z-toast)] p-3 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:shadow-xl transition-all border border-gray-200 dark:border-gray-700 group"
      title="通知中心"
    >
      <Bell size={24} className="text-gray-600 dark:text-gray-300 group-hover:text-cyan-500 transition-colors" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium animate-pulse">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export { ToastContext };
