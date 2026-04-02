import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  delay?: number;
  maxWidth?: string;
  variant?: 'default' | 'glass' | 'solid';
}

export default function Tooltip({
  children,
  content,
  position = 'top',
  className = '',
  delay = 200,
  maxWidth = '240px',
  variant = 'glass',
}: TooltipProps) {
  const [show, setShow] = useState(false);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    };
  }, []);

  const handleMouseEnter = () => {
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    timerRef.current = setTimeout(() => {
      setShow(true);
      // 短暂延迟后添加可见类以触发CSS过渡
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
    // 等待退出动画完成后隐藏
    leaveTimerRef.current = setTimeout(() => {
      setShow(false);
    }, 150);
  };

  const positionClasses: Record<string, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-3',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-3',
    left: 'right-full top-1/2 -translate-y-1/2 mr-3',
    right: 'left-full top-1/2 -translate-y-1/2 ml-3',
  };

  const arrowClasses: Record<string, string> = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-transparent border-l-transparent border-r-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-transparent border-l-transparent border-r-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-transparent border-t-transparent border-b-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-transparent border-t-transparent border-b-transparent border-l-transparent',
  };

  // 根据位置设置箭头边框颜色
  const getArrowBorderClass = () => {
    switch (position) {
      case 'top': return 'border-t-[6px]';
      case 'bottom': return 'border-b-[6px]';
      case 'left': return 'border-l-[6px]';
      case 'right': return 'border-r-[6px]';
      default: return 'border-t-[6px]';
    }
  };

  const getVariantClasses = () => {
    const baseClasses = `absolute z-[var(--z-tooltip)] ${positionClasses[position]} pointer-events-none`;

    if (variant === 'glass') {
      return `${baseClasses} transition-all duration-150 ease-out`;
    }

    return `${baseClasses} transition-all duration-150 ease-out`;
  };

  const getContentClasses = () => {
    const baseTransform = visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-1';

    if (variant === 'glass') {
      return `
        px-3 py-2 rounded-lg text-xs font-medium whitespace-normal
        bg-gray-800/85 dark:bg-gray-200/90
        backdrop-blur-md
        text-white dark:text-gray-800
        shadow-xl shadow-black/10 dark:shadow-black/20
        border border-white/10 dark:border-black/10
        ${baseTransform}
        transition-all duration-150 ease-out
      `;
    }

    if (variant === 'solid') {
      return `
        px-3 py-2 rounded-lg text-xs font-medium whitespace-normal
        bg-gray-900 dark:bg-gray-100
        text-white dark:text-gray-900
        shadow-lg
        ${baseTransform}
        transition-all duration-150 ease-out
      `;
    }

    // default
    return `
      px-2.5 py-1.5 rounded-lg text-xs whitespace-normal
      bg-gray-700/95 dark:bg-gray-200/95
      backdrop-blur-sm
      text-white dark:text-gray-800
      shadow-lg
      border border-gray-600/20 dark:border-gray-300/20
      ${baseTransform}
      transition-all duration-150 ease-out
    `;
  };

  const getArrowColorClasses = () => {
    if (variant === 'glass') {
      return position === 'top' || position === 'bottom'
        ? 'border-t-gray-800/85 dark:border-t-gray-200/90'
        : position === 'left'
          ? 'border-l-gray-800/85 dark:border-l-gray-200/90'
          : 'border-r-gray-800/85 dark:border-r-gray-200/90';
    }

    if (variant === 'solid') {
      return position === 'top' || position === 'bottom'
        ? 'border-t-gray-900 dark:border-t-gray-100'
        : position === 'left'
          ? 'border-l-gray-900 dark:border-l-gray-100'
          : 'border-r-gray-900 dark:border-r-gray-100';
    }

    // default
    return position === 'top' || position === 'bottom'
      ? 'border-t-gray-700/95 dark:border-t-gray-200/95'
      : position === 'left'
        ? 'border-l-gray-700/95 dark:border-l-gray-200/95'
        : 'border-r-gray-700/95 dark:border-r-gray-200/95';
  };

  return (
    <div className={`relative inline-flex ${className}`}>
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>
      {show && content && (
        <div className={getVariantClasses()}>
          <div
            className={getContentClasses()}
            style={{ maxWidth }}
            role="tooltip"
          >
            {content}
          </div>
          {/* 箭头指示器 */}
          <div
            className={`absolute w-0 h-0 ${arrowClasses[position]} ${getArrowBorderClass()} ${getArrowColorClasses()} transition-opacity duration-150`}
            style={{ opacity: visible ? 1 : 0 }}
          />
        </div>
      )}
    </div>
  );
}
