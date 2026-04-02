import React from 'react';
import { AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';

interface ConfirmModalProps {
  show: boolean;
  title: string;
  message: React.ReactNode;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export function ConfirmModal({
  show,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = '确认',
  cancelText = '取消',
  type = 'info',
}: ConfirmModalProps) {
  const { isDark } = useTheme();

  if (!show) {
    return null;
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  const iconColors = {
    danger: 'text-red-500',
    warning: 'text-yellow-500',
    info: 'text-blue-500',
  };

  const iconBgColors = {
    danger: 'bg-red-100 dark:bg-red-900/30',
    warning: 'bg-yellow-100 dark:bg-yellow-900/30',
    info: 'bg-blue-100 dark:bg-blue-900/30',
  };

  const buttonColors = {
    danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    warning: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
    info: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
  };

  const icons = {
    danger: AlertTriangle,
    warning: AlertTriangle,
    info: Info,
  };

  const Icon = icons[type];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={handleCancel}>
      <div
        className={`${isDark ? 'bg-gray-800/95' : 'bg-white/95'} backdrop-blur-2xl border ${isDark ? 'border-gray-700' : 'border-gray-200'} rounded-2xl p-6 w-full max-w-md shadow-xl animate-scale-in`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-6">
          <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${iconBgColors[type]}`}>
            <Icon size={32} className={iconColors[type]} />
          </div>
          <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>
            {title}
          </h3>
          <div className={`text-[15px] leading-relaxed ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
            {typeof message === 'string' ? <p>{message}</p> : message}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleCancel}
            className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              isDark
                ? 'border-gray-600 text-gray-200 hover:bg-gray-700/80 active:bg-gray-600 focus:ring-gray-400 focus:ring-offset-gray-800'
                : 'border-gray-300 text-gray-800 hover:bg-gray-50 active:bg-gray-100 focus:ring-primary-500 focus:ring-offset-white'
            }`}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-lg transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 ${buttonColors[type]} hover:shadow-lg active:shadow-sm ${
              isDark ? 'focus:ring-offset-gray-800' : 'focus:ring-offset-white'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
