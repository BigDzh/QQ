import { useState, ReactNode } from 'react';
import { Info } from 'lucide-react';

interface HoverCardProps {
  children: ReactNode;
  title?: string;
  content?: ReactNode;
  details?: Array<{ label: string; value: string | number | ReactNode }>;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
  showIcon?: boolean;
  theme?: 'default' | 'cyberpunk' | 'glass';
}

export default function HoverCard({
  children,
  title,
  content,
  details = [],
  position = 'right',
  delay = 150,
  className = '',
  showIcon = true,
  theme = 'default',
}: HoverCardProps) {
  const [isVisible, setIsVisible] = useState(false);

  const handleMouseEnter = () => {
    setTimeout(() => setIsVisible(true), delay);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'right': return 'left-full top-1/2 -translate-y-1/2 ml-3';
      case 'left': return 'right-full top-1/2 -translate-y-1/2 mr-3';
      case 'bottom': return 'top-full left-1/2 -translate-x-1/2 mt-3';
      case 'top': return 'bottom-full left-1/2 -translate-x-1/2 mb-3';
      default: return 'left-full top-1/2 -translate-y-1/2 ml-3';
    }
  };

  const getArrowClasses = () => {
    switch (position) {
      case 'right': return 'left-0 top-1/2 -translate-y-1/2 -translate-x-full border-l-0 border-y-transparent';
      case 'left': return 'right-0 top-1/2 -translate-y-1/2 translate-x-full border-r-0 border-y-transparent';
      case 'bottom': return 'top-0 left-1/2 -translate-x-1/2 -translate-y-full border-b-0 border-x-transparent';
      case 'top': return 'bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-t-0 border-x-transparent';
      default: return 'left-0 top-1/2 -translate-y-1/2 -translate-x-full border-l-0 border-y-transparent';
    }
  };

  const getThemeBg = () => {
    switch (theme) {
      case 'cyberpunk': return 'bg-[#0a0f1a]/95 backdrop-blur-xl border-cyan-500/30';
      case 'glass': return 'bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50';
      default: return 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700';
    }
  };

  const getArrowBg = () => {
    switch (theme) {
      case 'cyberpunk': return 'bg-[#0a0f1a]/95 border-cyan-500/30';
      case 'glass': return 'bg-white/90 dark:bg-gray-800/90 border-gray-200/50 dark:border-gray-700/50';
      default: return 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700';
    }
  };

  return (
    <div
      className={`relative inline-block w-full ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="cursor-default">
        {children}
      </div>

      {isVisible && (details.length > 0 || content) && (
        <div
          className={`absolute z-[var(--z-tooltip)] w-80 rounded-xl p-4 shadow-2xl border ${getPositionClasses()}`}
          style={{
            animation: 'fadeInScale 0.2s ease-out forwards',
          }}
        >
          <div className={`rounded-xl overflow-hidden ${getThemeBg()}`}>
            {title && (
              <div className="flex items-center gap-2 pb-3 mb-3 border-b border-gray-100 dark:border-gray-700/50">
                {showIcon && <Info size={14} className="text-cyan-500" />}
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                  {title}
                </h3>
              </div>
            )}

            {content && (
              <div className="text-sm text-gray-700 dark:text-gray-200 mb-3 font-normal leading-relaxed">
                {content}
              </div>
            )}

            {details.length > 0 && (
              <div className="space-y-2">
                {details.map((item, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center py-1.5 px-2 rounded-lg bg-gray-50 dark:bg-gray-900/50"
                  >
                    <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                      {item.label}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            className={`absolute w-3 h-3 border ${getArrowClasses()} ${getArrowBg()}`}
          />
        </div>
      )}

      <style>{`
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: translateY(-50%) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(-50%) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
