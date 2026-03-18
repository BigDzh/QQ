import { useState, useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';

const getThemeStyles = (themeName: string) => {
  const baseStyles = {
    text: 'text-gray-100',
    textSecondary: 'text-gray-400',
    textMuted: 'text-gray-500',
    bg: 'bg-gray-900',
    bgSecondary: 'bg-gray-800',
    border: 'border-gray-700',
    card: 'bg-gray-800',
    hoverBg: 'hover:bg-gray-700',
    input: 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400',
    button: 'bg-cyan-500 text-white hover:bg-cyan-600',
    buttonSecondary: 'bg-gray-700 text-gray-200 hover:bg-gray-600',
    badge: 'bg-gray-700 text-gray-300',
    success: 'text-emerald-400',
    error: 'text-red-400',
    warning: 'text-amber-400',
    info: 'text-blue-400',
    tableHeader: 'bg-gray-700',
    modalBg: 'bg-gray-800',
    modalBorder: 'border-gray-600',
    emptyBg: 'bg-gray-700',
    statusColors: {
      '正常': 'bg-emerald-500/20 text-emerald-400',
      '投产中': 'bg-blue-500/20 text-blue-400',
      '未投产': 'bg-gray-500/20 text-gray-400',
      '维修中': 'bg-orange-500/20 text-orange-400',
      '三防中': 'bg-violet-500/20 text-violet-400',
      '测试中': 'bg-yellow-500/20 text-yellow-400',
      '仿真中': 'bg-cyan-500/20 text-cyan-400',
      '借用中': 'bg-pink-500/20 text-pink-400',
      '故障': 'bg-red-500/20 text-red-400',
      '进行中': 'bg-blue-500/20 text-blue-400',
      '已完成': 'bg-emerald-500/20 text-emerald-400',
      '已过期': 'bg-red-500/20 text-red-400',
      '未完成': 'bg-gray-500/20 text-gray-400',
    },
    stageColors: {
      'F阶段': 'bg-gray-600 text-white',
      'C阶段': 'bg-blue-600 text-white',
      'S阶段': 'bg-amber-600 text-white',
      'D阶段': 'bg-violet-600 text-white',
      'P阶段': 'bg-emerald-600 text-white',
    } as Record<string, string>,
  };

  switch (themeName) {
    case 'cyberpunk':
      return {
        ...baseStyles,
        button: 'bg-pink-500 text-white hover:bg-pink-600',
        success: 'text-cyan-400',
        warning: 'text-yellow-400',
      };
    case 'linear':
      return {
        ...baseStyles,
        button: 'bg-white text-black hover:bg-gray-100',
        card: 'bg-black border border-gray-800',
      };
    case 'anime':
      return {
        ...baseStyles,
        button: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
      };
    default:
      return baseStyles;
  }
};

export function useThemeStyles() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const styles = useMemo(() => {
    return getThemeStyles(theme);
  }, [theme]);

  if (!mounted) {
    return getThemeStyles('dark');
  }

  return styles;
}
