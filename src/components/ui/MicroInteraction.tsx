import React, { useRef, useCallback, useState, type ReactNode } from 'react';

/**
 * Ripple 波纹点击效果组件
 * 为子元素添加 Material Design 风格的波纹扩散动画
 */
interface RippleProps {
  children: ReactNode;
  color?: string;
  duration?: number;
  className?: string;
  disabled?: boolean;
}

export function Ripple({
  children,
  color = 'rgba(255, 255, 255, 0.35)',
  duration = 600,
  className = '',
  disabled = false,
}: RippleProps) {
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number; size: number }>>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);

  const createRipple = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2.5;
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    const id = nextId.current++;
    setRipples((prev) => [...prev, { id, x, y, size }]);

    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, duration);
  }, [disabled, duration]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      onMouseDown={createRipple}
    >
      {children}
      {!disabled && ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: ripple.size,
            height: ripple.size,
            background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
            transform: 'scale(0)',
            animation: `ripple ${duration}ms ease-out forwards`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * ShimmerOverlay 骨架屏加载遮罩组件
 * 用于内容加载时显示精致的闪烁效果
 */
interface ShimmerOverlayProps {
  show?: boolean;
  variant?: 'default' | 'circular' | 'text' | 'custom';
  lines?: number;
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  className?: string;
  children?: ReactNode;
}

export function ShimmerOverlay({
  show = true,
  variant = 'default',
  lines = 3,
  width,
  height,
  borderRadius = '0.5rem',
  className = '',
  children,
}: ShimmerOverlayProps) {
  if (!show) return <>{children}</>;

  const shimmerBaseClass = `
    animate-shimmer
    bg-gradient-to-r from-gray-200/60 via-gray-100 to-gray-200/60
    dark:from-gray-700/60 dark:via-gray-600 dark:to-gray-700/60
    bg-[length:200%_100%]
  `;

  const renderShimmer = () => {
    switch (variant) {
      case 'circular':
        return (
          <div
            className={`${shimmerBaseClass} rounded-full`}
            style={{
              width: width || 48,
              height: height || 48,
            }}
          />
        );

      case 'text':
        return (
          <div className={`space-y-2 ${className}`}>
            {Array.from({ length: lines }).map((_, i) => (
              <div
                key={i}
                className={`${shimmerBaseClass} rounded`}
                style={{
                  height: height || 14,
                  width: i === lines - 1 ? '70%' : '100%',
                  borderRadius,
                }}
              />
            ))}
          </div>
        );

      case 'custom':
        return (
          <div
            className={shimmerBaseClass}
            style={{
              width: width || '100%',
              height: height || 120,
              borderRadius,
            }}
          />
        );

      default:
        return (
          <div
            className={`${shimmerBaseClass} rounded-lg`}
            style={{
              width: width || '100%',
              height: height || 80,
              borderRadius,
            }}
          />
        );
    }
  };

  return renderShimmer();
}

/**
 * MagneticButton 磁性悬浮按钮组件
 * 鼠标靠近时按钮会轻微跟随，创造磁性吸引效果
 */
interface MagneticButtonProps {
  children: ReactNode;
  strength?: number;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
}

export function MagneticButton({
  children,
  strength = 0.3,
  className = '',
  disabled = false,
  onClick,
}: MagneticButtonProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || !ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = (e.clientX - centerX) * strength;
    const deltaY = (e.clientY - centerY) * strength;

    setPosition({ x: deltaX, y: deltaY });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <div
      ref={ref}
      className={`inline-block transition-transform duration-200 ease-out ${className}`}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={!disabled ? onClick : undefined}
    >
      {children}
    </div>
  );
}

/**
 * GlowFocus 发光聚焦效果组件
 * 聚焦时产生柔和的光晕扩散效果
 */
interface GlowFocusProps {
  children: ReactNode;
  glowColor?: string;
  glowSize?: string;
  className?: string;
}

export function GlowFocus({
  children,
  glowColor = 'rgba(14, 165, 233, 0.4)',
  glowSize = '0 0 20px',
  className = '',
}: GlowFocusProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div
      className={`relative ${className}`}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
    >
      {children}
      {/* 光晕层 */}
      <div
        className="absolute inset-0 rounded-inherit pointer-events-none transition-all duration-300 ease-out opacity-0"
        style={{
          boxShadow: isFocused ? `${glowSize} ${glowColor}` : 'none',
          opacity: isFocused ? 1 : 0,
        }}
      />
    </div>
  );
}

/**
 * PressScale 按压缩放效果组件
 * 点击时产生弹性缩放反馈
 */
interface PressScaleProps {
  children: ReactNode;
  scale?: number;
  className?: string;
  disabled?: boolean;
}

export function PressScale({
  children,
  scale = 0.95,
  className = '',
  disabled = false,
}: PressScaleProps) {
  return (
    <div
      className={`
        transition-transform duration-150 ease-out
        ${disabled ? '' : 'active:scale-[0.97] hover:scale-[1.01]'}
        ${className}
      `}
      style={{
        '--press-scale': scale,
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

export default Ripple;
