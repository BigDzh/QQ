import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';
import { CheckCircle, XCircle, Loader2, X, Download, Upload, Pause, Play } from 'lucide-react';

type TransferStatus = 'pending' | 'uploading' | 'paused' | 'complete' | 'failed' | 'cancelled';
type TransferType = 'upload' | 'download';

interface Transfer {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: TransferStatus;
  type: TransferType;
  error?: string;
  startedAt: number;
  fileType?: string;
  pausedAt?: number;
  totalTransferred?: number;
}

interface TransferContextType {
  transfers: Transfer[];
  startTransfer: (name: string, size: number, type: TransferType, fileType?: string) => string;
  updateProgress: (id: string, progress: number, transferred?: number) => void;
  completeTransfer: (id: string) => void;
  failTransfer: (id: string, error: string) => void;
  cancelTransfer: (id: string) => void;
  pauseTransfer: (id: string) => void;
  resumeTransfer: (id: string) => void;
  retryTransfer: (id: string) => void;
  removeTransfer: (id: string) => void;
  clearCompleted: () => void;
}

const TransferContext = createContext<TransferContextType | undefined>(undefined);

const AUTO_HIDE_DELAY = 3000;
const MAX_VISIBLE_TRANSFERS = 5;

export function TransferProvider({ children }: { children: ReactNode }) {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const clearTimer = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const startTransfer = useCallback((name: string, size: number, type: TransferType, fileType?: string): string => {
    const id = `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const transfer: Transfer = {
      id,
      name,
      size,
      progress: 0,
      status: 'pending',
      type,
      startedAt: Date.now(),
      fileType,
      totalTransferred: 0,
    };
    setTransfers(prev => {
      const updated = [transfer, ...prev];
      if (updated.length > MAX_VISIBLE_TRANSFERS) {
        return updated.slice(0, MAX_VISIBLE_TRANSFERS);
      }
      return updated;
    });
    return id;
  }, []);

  const updateProgress = useCallback((id: string, progress: number, transferred?: number) => {
    setTransfers(prev => prev.map(t =>
      t.id === id ? { ...t, progress: Math.min(100, Math.max(0, progress)), status: 'uploading' as TransferStatus, totalTransferred: transferred ?? t.totalTransferred } : t
    ));
  }, []);

  const completeTransfer = useCallback((id: string) => {
    clearTimer(id);
    setTransfers(prev => prev.map(t =>
      t.id === id ? { ...t, progress: 100, status: 'complete' as TransferStatus, totalTransferred: t.size } : t
    ));
    const timer = setTimeout(() => {
      setTransfers(prev => prev.filter(t => t.id !== id));
      timersRef.current.delete(id);
    }, AUTO_HIDE_DELAY);
    timersRef.current.set(id, timer);
  }, [clearTimer]);

  const failTransfer = useCallback((id: string, error: string) => {
    clearTimer(id);
    setTransfers(prev => prev.map(t =>
      t.id === id ? { ...t, status: 'failed' as TransferStatus, error } : t
    ));
  }, [clearTimer]);

  const cancelTransfer = useCallback((id: string) => {
    clearTimer(id);
    setTransfers(prev => prev.map(t =>
      t.id === id ? { ...t, status: 'cancelled' as TransferStatus } : t
    ));
  }, [clearTimer]);

  const pauseTransfer = useCallback((id: string) => {
    setTransfers(prev => prev.map(t =>
      t.id === id ? { ...t, status: 'paused' as TransferStatus, pausedAt: Date.now() } : t
    ));
  }, []);

  const resumeTransfer = useCallback((id: string) => {
    setTransfers(prev => prev.map(t =>
      t.id === id ? { ...t, status: 'uploading' as TransferStatus } : t
    ));
  }, []);

  const retryTransfer = useCallback((id: string) => {
    setTransfers(prev => prev.map(t =>
      t.id === id ? { ...t, progress: 0, status: 'pending' as TransferStatus, error: undefined, startedAt: Date.now(), totalTransferred: 0 } : t
    ));
  }, []);

  const removeTransfer = useCallback((id: string) => {
    clearTimer(id);
    setTransfers(prev => prev.filter(t => t.id !== id));
  }, [clearTimer]);

  const clearCompleted = useCallback(() => {
    setTransfers(prev => prev.filter(t => t.status !== 'complete'));
  }, []);

  return (
    <TransferContext.Provider value={{
      transfers,
      startTransfer,
      updateProgress,
      completeTransfer,
      failTransfer,
      cancelTransfer,
      pauseTransfer,
      resumeTransfer,
      retryTransfer,
      removeTransfer,
      clearCompleted,
    }}>
      {children}
      <TransferProgressOverlay
        transfers={transfers}
        onCancel={cancelTransfer}
        onPause={pauseTransfer}
        onResume={resumeTransfer}
        onRemove={removeTransfer}
      />
    </TransferContext.Provider>
  );
}

export function useTransfer() {
  const context = useContext(TransferContext);
  if (!context) {
    throw new Error('useTransfer must be used within a TransferProvider');
  }
  return context;
}

interface TransferProgressOverlayProps {
  transfers: Transfer[];
  onCancel: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onRemove: (id: string) => void;
}

function TransferProgressOverlay({ transfers, onCancel, onPause, onResume, onRemove }: TransferProgressOverlayProps) {
  if (transfers.length === 0) return null;

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatSpeed = (bytesPerSecond: number): string => {
    if (bytesPerSecond === 0) return '0 B/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
    return `${(bytesPerSecond / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const getProgressColor = (status: TransferStatus): string => {
    switch (status) {
      case 'complete': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'cancelled': return 'bg-gray-400';
      case 'paused': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  const getStatusIcon = (status: TransferStatus) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="text-green-500" size={18} />;
      case 'failed':
        return <XCircle className="text-red-500" size={18} />;
      case 'cancelled':
        return <XCircle className="text-gray-400" size={18} />;
      case 'paused':
        return <Pause className="text-yellow-500" size={18} />;
      case 'uploading':
      case 'pending':
        return <Loader2 className="text-blue-500 animate-spin" size={18} />;
      default:
        return null;
    }
  };

  const activeTransfers = transfers.filter(t => t.status !== 'complete' && t.status !== 'cancelled');
  const completedTransfers = transfers.filter(t => t.status === 'complete' || t.status === 'cancelled');

  const activeUploading = activeTransfers.filter(t => t.status === 'uploading' || t.status === 'pending');
  const activePaused = activeTransfers.filter(t => t.status === 'paused');
  const activeFailed = activeTransfers.filter(t => t.status === 'failed');

  return (
    <div className="fixed bottom-4 right-4 z-[99999] flex flex-col gap-2 w-80 max-h-[70vh] overflow-hidden">
      {activeUploading.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              传输中 ({activeUploading.length})
            </span>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-60 overflow-y-auto">
            {activeUploading.map(transfer => (
              <TransferItem
                key={transfer.id}
                transfer={transfer}
                onCancel={onCancel}
                onPause={onPause}
                onResume={onResume}
                formatSize={formatSize}
                formatSpeed={formatSpeed}
                getProgressColor={getProgressColor}
              />
            ))}
          </div>
        </div>
      )}

      {activePaused.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-2 bg-yellow-50 dark:bg-yellow-900/30 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
              已暂停 ({activePaused.length})
            </span>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-40 overflow-y-auto">
            {activePaused.map(transfer => (
              <TransferItem
                key={transfer.id}
                transfer={transfer}
                onCancel={onCancel}
                onPause={onPause}
                onResume={onResume}
                formatSize={formatSize}
                formatSpeed={formatSpeed}
                getProgressColor={getProgressColor}
              />
            ))}
          </div>
        </div>
      )}

      {activeFailed.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-2 bg-red-50 dark:bg-red-900/30 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <span className="text-sm font-medium text-red-700 dark:text-red-300">
              传输失败 ({activeFailed.length})
            </span>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-40 overflow-y-auto">
            {activeFailed.map(transfer => (
              <div key={transfer.id} className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  {transfer.type === 'upload' ? (
                    <Upload size={14} className="text-red-500" />
                  ) : (
                    <Download size={14} className="text-red-500" />
                  )}
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate flex-1">
                    {transfer.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatSize(transfer.size)}
                  </span>
                </div>
                <p className="text-xs text-red-500 mb-2">{transfer.error}</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getProgressColor(transfer.status)}`}
                      style={{ width: `${transfer.progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-10 text-right">
                    {Math.round(transfer.progress)}%
                  </span>
                  <button
                    onClick={() => onCancel(transfer.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    title="取消"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {completedTransfers.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
              已完成 ({completedTransfers.length})
            </span>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-40 overflow-y-auto">
            {completedTransfers.map(transfer => (
              <div key={transfer.id} className="p-3 flex items-center gap-3">
                {getStatusIcon(transfer.status)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                    {transfer.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {transfer.status === 'complete' ? `${formatSize(transfer.size)} · 传输完成` : '已取消'}
                  </p>
                </div>
                <button
                  onClick={() => onRemove(transfer.id)}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  title="关闭"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface TransferItemProps {
  transfer: Transfer;
  onCancel: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  formatSize: (bytes: number) => string;
  formatSpeed: (bytesPerSecond: number) => string;
  getProgressColor: (status: TransferStatus) => string;
}

function TransferItem({ transfer, onCancel, onPause, onResume, formatSize, formatSpeed, getProgressColor }: TransferItemProps) {
  const transferredSize = Math.round((transfer.progress / 100) * transfer.size);

  const elapsedSeconds = transfer.pausedAt
    ? Math.floor((transfer.pausedAt - transfer.startedAt) / 1000)
    : Math.floor((Date.now() - transfer.startedAt) / 1000);

  const speed = elapsedSeconds > 0 ? Math.round(transferredSize / elapsedSeconds) : 0;

  return (
    <div className="p-3">
      <div className="flex items-center gap-2 mb-1">
        {transfer.type === 'upload' ? (
          <Upload size={14} className="text-blue-500" />
        ) : (
          <Download size={14} className="text-blue-500" />
        )}
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate flex-1">
          {transfer.name}
        </span>
        <span className="text-xs text-gray-500">
          {formatSize(transferredSize)} / {formatSize(transfer.size)}
        </span>
      </div>
      <div className="flex items-center gap-2 mb-1">
        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${getProgressColor(transfer.status)}`}
            style={{ width: `${transfer.progress}%` }}
          />
        </div>
        <span className="text-xs text-gray-500 w-10 text-right">
          {Math.round(transfer.progress)}%
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {speed > 0 ? formatSpeed(speed) : '计算速度...'}
        </span>
        <div className="flex items-center gap-1">
          {transfer.status === 'uploading' && (
            <button
              onClick={() => onPause(transfer.id)}
              className="p-1 text-gray-400 hover:text-yellow-500 transition-colors"
              title="暂停"
            >
              <Pause size={12} />
            </button>
          )}
          {transfer.status === 'paused' && (
            <button
              onClick={() => onResume(transfer.id)}
              className="p-1 text-gray-400 hover:text-green-500 transition-colors"
              title="继续"
            >
              <Play size={12} />
            </button>
          )}
          <button
            onClick={() => onCancel(transfer.id)}
            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
            title="取消"
          >
            <X size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
