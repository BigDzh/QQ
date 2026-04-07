import React, { useEffect, useRef, useState } from 'react';
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
  const [isClosing, setIsClosing] = useState(false);
  const [shouldRender, setShouldRender] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsClosing(false);
      // 禁止背景滚动
      document.body.style.overflow = 'hidden';
    } else if (shouldRender && !isClosing) {
      // 开始关闭动画
      setIsClosing(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsClosing(false);
        document.body.style.overflow = '';
      }, 250); // 与退出动画时长匹配
      return () => clearTimeout(timer);
    }

    return () => {
      if (!isOpen) {
        document.body.style.overflow = '';
      }
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isClosing) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, isClosing]);

  if (!shouldRender) return null;

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setShouldRender(false);
      setIsClosing(false);
      onClose();
      document.body.style.overflow = '';
    }, 250);
  };

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
    ? 'bg-[#0d1117]/95 backdrop-blur-2xl border-cyan-500/20 shadow-2xl shadow-cyan-500/20'
    : isAnime
      ? 'bg-white/95 backdrop-blur-2xl border-pink-300/50 shadow-xl shadow-pink-500/20'
      : isDark
        ? 'bg-gray-800/95 backdrop-blur-2xl border-gray-600 shadow-xl'
        : 'bg-white/95 backdrop-blur-2xl border-gray-200 shadow-xl';

  // 动画状态类
  const overlayAnimationClass = isClosing
    ? 'animate-overlay-exit'
    : 'animate-overlay-enter';

  const modalAnimationClass = isClosing
    ? ''
    : 'animate-modal-enter';

  const modalTransformClass = isClosing
    ? 'opacity-0 scale-95 translate-y-2'
    : 'opacity-100 scale-100 translate-y-0';

  const content = (
    <div
      ref={overlayRef}
      className={`fixed inset-0 z-[var(--z-modal-backdrop)] flex items-center justify-center p-4 ${overlayClasses} ${overlayAnimationClass}`}
      onClick={(e) => {
        if (closeOnOverlayClick && e.target === overlayRef.current && !isClosing) {
          handleClose();
        }
      }}
    >
      <div
        className={`
          ${sizeClasses[size]} ${modalClasses}
          border rounded-2xl w-full ${className}
          ${modalAnimationClass}
          transition-all duration-250 ease-out
          ${modalTransformClass}
        `}
        style={{
          animationDuration: isClosing ? undefined : '0.35s',
          animationTimingFunction: isClosing ? undefined : 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
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
                onClick={handleClose}
                disabled={isClosing}
                className={`p-2 rounded-lg transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  isDark
                    ? 'text-gray-300 hover:text-white hover:bg-gray-700/80 hover:font-semibold active:bg-gray-600 active:text-white focus:ring-cyan-400 focus:ring-offset-gray-800 disabled:opacity-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 hover:font-semibold active:bg-gray-200 active:text-gray-900 focus:ring-primary-500 focus:ring-offset-white disabled:opacity-50'
                } hover:scale-110 active:scale-95`}
                aria-label="关闭"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
        <div className="px-6 py-4 max-h-[70vh] overflow-y-auto modal-scrollbar">
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
    warning: 'text-amber-500',
    info: 'text-blue-500',
  };

  const iconBgColors = {
    danger: 'bg-red-100 dark:bg-red-900/30',
    warning: 'bg-amber-100 dark:bg-amber-900/30',
    info: 'bg-blue-100 dark:bg-blue-900/30',
  };

  const buttonColors = {
    danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500 shadow-lg shadow-red-500/25 hover:shadow-red-500/40',
    warning: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40',
    info: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="text-center">
        {/* 图标容器 - 带呼吸效果 */}
        <div className={`mx-auto mb-4 w-14 h-14 rounded-xl flex items-center justify-center ${iconBgColors[variant]} animate-fade-slide-up`}>
          <span className={`${iconColors[variant]}`}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </span>
        </div>
        <p className={`text-[15px] leading-relaxed font-normal ${isDark ? 'text-gray-100' : 'text-gray-800'} animate-fade-slide-up stagger-1`}>
          {message}
        </p>
      </div>
      <div className={`flex gap-3 mt-6 animate-fade-slide-up stagger-2`}>
        <button
          onClick={onClose}
          disabled={loading}
          className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            isDark
              ? 'border-gray-600 text-gray-100 hover:bg-gray-700/80 hover:text-white hover:font-semibold active:bg-gray-600 active:text-white focus:ring-gray-400 focus:ring-offset-gray-800 disabled:opacity-50 hover:shadow-md'
              : 'border-gray-300 text-gray-800 hover:bg-gray-50 hover:text-gray-900 hover:font-semibold active:bg-gray-100 active:text-gray-900 focus:ring-primary-500 focus:ring-offset-white disabled:opacity-50 hover:shadow-md'
          }`}
        >
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={`
            flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-lg
            transition-all duration-200 ease-out
            focus:outline-none focus:ring-2 focus:ring-offset-2
            ${buttonColors[variant]}
            disabled:opacity-50 disabled:cursor-not-allowed
            hover:-translate-y-0.5 active:translate-y-0
            ${isDark ? 'focus:ring-offset-gray-800' : 'focus:ring-offset-white'}
          `}
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              处理中...
            </span>
          ) : (
            confirmText
          )}
        </button>
      </div>
    </Modal>
  );
}

export default Modal;
