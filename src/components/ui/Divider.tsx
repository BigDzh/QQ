import React from 'react';

export type DividerDirection = 'horizontal' | 'vertical';
export type DividerVariant = 'solid' | 'dashed' | 'dotted';

export interface DividerProps {
  direction?: DividerDirection;
  variant?: DividerVariant;
  className?: string;
}

const directionStyles: Record<DividerDirection, string> = {
  horizontal: 'w-full h-px',
  vertical: 'h-full w-px',
};

const variantStyles: Record<DividerVariant, string> = {
  solid: 'border-gray-200 dark:border-gray-700',
  dashed: 'border-dashed border-gray-300 dark:border-gray-600',
  dotted: 'border-dotted border-gray-300 dark:border-gray-600',
};

export function Divider({
  direction = 'horizontal',
  variant = 'solid',
  className = '',
}: DividerProps) {
  if (direction === 'vertical') {
    return (
      <div
        className={`inline-block ${variantStyles[variant]} ${className}`}
        role="separator"
      />
    );
  }

  return (
    <hr
      className={`${directionStyles[direction]} ${variantStyles[variant]} border-0 mt-4 mb-4 ${className}`}
      role="separator"
    />
  );
}

export interface DividerWithTextProps {
  children: React.ReactNode;
  variant?: DividerVariant;
  className?: string;
}

export function DividerWithText({
  children,
  variant = 'solid',
  className = '',
}: DividerWithTextProps) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <Divider direction="horizontal" variant={variant} className="flex-1" />
      <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
        {children}
      </span>
      <Divider direction="horizontal" variant={variant} className="flex-1" />
    </div>
  );
}
