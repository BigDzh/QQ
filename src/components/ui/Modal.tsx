import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../context/ThemeContext';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeOnOverlayClick = true,
  showCloseButton = true,
  className = '',
}: ModalProps) {
  const { isDark, isCyberpunk, isAnime } = useTheme();
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-4xl',
  };

  const overlayClasses = isCyberpunk
    ? 'bg-black/60 backdrop-blur-sm'
    : isAnime
    ? 'bg-pink-900/20 backdrop-blur-sm'
    : 'bg-black/40 backdrop-blur-sm';

  const modalClasses = isCyberpunk
    ? 'bg-[#161b22]/95 backdrop-blur-2xl border-white/10 shadow-2xl shadow-cyan-500/10'
    : isAnime
    ? 'bg-white/95 backdrop-blur-2xl border-pink-200/50 shadow-xl shadow-pink-500/10'
    : isDark
    ? 'bg-gray-800/95 backdrop-blur-2xl border-gray-700 shadow-xl'
    : 'bg-white/95 backdrop-blur-2xl border-gray-200 shadow-xl';

  const content = (
    <div
      ref={overlayRef}
      className={`fixed inset-0 z-[var(--z-modal-backdrop)] flex items-center justify-center p-4 ${overlayClasses}`}
      onClick={(e) => {
        if (closeOnOverlayClick && e.target === overlayRef.current) {
          onClose();
        }
      }}
    >
      <div
        className={`${sizeClasses[size]} ${modalClasses} border rounded-2xl w-full ${className} animate-scale-in`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {(title || showCloseButton) && (
          <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            {title && (
              <h2 id="modal-title" className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className={`p-1.5 rounded-lg transition-colors ${
                  isDark
                    ? 'hover:bg-gray-700 text-gray-400 hover:text-white'
                    : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                }`}
                aria-label="关闭"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
        <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  variant = 'info',
  loading = false,
}: ConfirmModalProps) {
  const { isDark } = useTheme();

  const iconColors = {
    danger: 'text-red-500',
    warning: 'text-yellow-500',
    info: 'text-blue-500',
  };

  const buttonColors = {
    danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    warning: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
    info: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="text-center">
        <div className={`mx-auto mb-4 ${iconColors[variant]}`}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{message}</p>
      </div>
      <div className="flex gap-3 mt-6">
        <button
          onClick={onClose}
          disabled={loading}
          className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border transition-colors ${
            isDark
              ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          } disabled:opacity-50`}
        >
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={`flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-lg ${buttonColors[variant]} disabled:opacity-50 transition-colors`}
        >
          {loading ? '处理中...' : confirmText}
        </button>
      </div>
    </Modal>
  );
}

export default Modal;