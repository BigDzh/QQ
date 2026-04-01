import React from 'react';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: AvatarSize;
  shape?: 'circle' | 'square' | 'rounded';
  className?: string;
}

const sizeStyles: Record<AvatarSize, string> = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl',
};

const shapeStyles: Record<string, string> = {
  circle: 'rounded-full',
  square: 'rounded-none',
  rounded: 'rounded-lg',
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const backgroundColors = [
  'bg-red-500',
  'bg-orange-500',
  'bg-amber-500',
  'bg-yellow-500',
  'bg-lime-500',
  'bg-green-500',
  'bg-emerald-500',
  'bg-teal-500',
  'bg-cyan-500',
  'bg-sky-500',
  'bg-blue-500',
  'bg-indigo-500',
  'bg-violet-500',
  'bg-purple-500',
  'bg-fuchsia-500',
  'bg-pink-500',
  'bg-rose-500',
];

function getColorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return backgroundColors[Math.abs(hash) % backgroundColors.length];
}

export function Avatar({
  src,
  alt,
  name = '',
  size = 'md',
  shape = 'circle',
  className = '',
}: AvatarProps) {
  const [imgError, setImgError] = React.useState(false);

  const showInitials = !src || imgError;
  const initials = name ? getInitials(name) : '?';
  const bgColor = name ? getColorFromName(name) : 'bg-gray-400';

  return (
    <div
      className={`inline-flex items-center justify-center overflow-hidden flex-shrink-0 ${sizeStyles[size]} ${shapeStyles[shape]} ${className}`}
    >
      {showInitials ? (
        <div className={`w-full h-full flex items-center justify-center ${bgColor} text-white font-medium`}>
          {initials}
        </div>
      ) : (
        <img
          src={src}
          alt={alt || name}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      )}
    </div>
  );
}

export interface AvatarGroupProps {
  children: React.ReactNode;
  max?: number;
  size?: AvatarSize;
  className?: string;
}

export function AvatarGroup({ children, max = 4, size = 'sm', className = '' }: AvatarGroupProps) {
  const childArray = React.Children.toArray(children);
  const visibleCount = Math.min(childArray.length, max);
  const remainingCount = childArray.length - visibleCount;

  return (
    <div className={`flex items-center ${className}`}>
      {childArray.slice(0, visibleCount).map((child, index) => (
        <div
          key={index}
          className={`relative ring-2 ring-white dark:ring-gray-800 ${index > 0 ? '-ml-2' : ''}`}
        >
          {React.isValidElement(child)
            ? React.cloneElement(child as React.ReactElement<AvatarProps>, { size })
            : child}
        </div>
      ))}
      {remainingCount > 0 && (
        <div
          className={`relative ring-2 ring-white dark:ring-gray-800 -ml-2 ${sizeStyles[size]} rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-200 font-medium`}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
}
