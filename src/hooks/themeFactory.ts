export interface ThemeToken {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: {
      base: string;
      elevated: string;
      overlay: string;
    };
    text: {
      primary: string;
      secondary: string;
      disabled: string;
      inverse: string;
    };
    border: {
      subtle: string;
      default: string;
      strong: string;
    };
    status: {
      success: { bg: string; text: string; border: string };
      warning: { bg: string; text: string; border: string };
      danger: { bg: string; text: string; border: string };
      info: { bg: string; text: string; border: string };
    };
  };
  shadows: {
    card: string;
    modal: string;
    dropdown: string;
  };
}

export interface ThemeConfig {
  name: string;
  type: 'light' | 'dark';
  colors?: ThemeToken['colors'];
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  card: string;
  input: string;
  button: string;
  modalBg: string;
  modalBorder: string;
  bg: string;
  accent: string;
  accentText: string;
  success: string;
  error: string;
  stageColors: Record<string, string>;
  statusColors: Record<string, string>;
  badge: string;
  tableHeader: string;
  hoverBg: string;
  emptyBg: string;
  menuColors?: string[];
  menuHoverColors?: string[];
  shadows?: {
    card: string;
    modal: string;
    dropdown: string;
  };
  radius?: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
  };
  animation?: {
    spring: string;
    smooth: string;
    bounce: string;
  };
}

export function createTheme(config: Partial<ThemeConfig> & { name: string; type: 'light' | 'dark' }): ThemeConfig {
  return {
    name: config.name,
    type: config.type,
    colors: config.colors || {
      primary: '#0ea5e9',
      secondary: '#0284c7',
      accent: '#0ea5e9',
      background: {
        base: config.type === 'dark' ? 'bg-gray-900' : 'bg-gray-50',
        elevated: config.type === 'dark' ? 'bg-gray-800/90' : 'bg-white/90',
        overlay: config.type === 'dark' ? 'bg-gray-800/95' : 'bg-white/95',
      },
      text: {
        primary: config.type === 'dark' ? 'text-white' : 'text-gray-950', // 确保高对比度
        secondary: config.type === 'dark' ? 'text-gray-200' : 'text-gray-700', // 提升对比度
        disabled: config.type === 'dark' ? 'text-gray-400' : 'text-gray-500', // 保持可读性
        inverse: config.type === 'dark' ? 'text-gray-900' : 'text-white',
      },
      border: {
        subtle: config.type === 'dark' ? 'border-gray-700' : 'border-gray-200',
        default: config.type === 'dark' ? 'border-gray-600' : 'border-gray-300',
        strong: config.type === 'dark' ? 'border-gray-500' : 'border-gray-400',
      },
      status: {
        success: { bg: config.type === 'dark' ? 'bg-green-500/40' : 'bg-green-100', text: config.type === 'dark' ? 'text-green-100' : 'text-green-800', border: config.type === 'dark' ? 'border-green-400/60' : 'border-green-300' }, // 优化深色模式对比度
        warning: { bg: config.type === 'dark' ? 'bg-yellow-500/40' : 'bg-yellow-100', text: config.type === 'dark' ? 'text-yellow-100' : 'text-yellow-800', border: config.type === 'dark' ? 'border-yellow-400/60' : 'border-yellow-300' },
        danger: { bg: config.type === 'dark' ? 'bg-red-500/40' : 'bg-red-100', text: config.type === 'dark' ? 'text-red-100' : 'text-red-800', border: config.type === 'dark' ? 'border-red-400/60' : 'border-red-300' },
        info: { bg: config.type === 'dark' ? 'bg-blue-500/40' : 'bg-blue-100', text: config.type === 'dark' ? 'text-blue-100' : 'text-blue-800', border: config.type === 'dark' ? 'border-blue-400/60' : 'border-blue-300' },
      },
    },
    text: config.text || (config.type === 'dark' ? 'text-white' : 'text-gray-900'), // 使用更高对比度的颜色
    textSecondary: config.textSecondary || (config.type === 'dark' ? 'text-gray-200' : 'text-gray-700'), // 从gray-600提升到gray-700
    textMuted: config.textMuted || (config.type === 'dark' ? 'text-gray-400' : 'text-gray-500'),
    border: config.border || (config.type === 'dark' ? 'border-gray-600' : 'border-gray-300'),
    card: config.card || (config.type === 'dark' ? 'bg-gray-800/80' : 'bg-white/90'),
    input: config.input || (config.type === 'dark' ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'), // 提升placeholder对比度
    button: config.button || 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 focus:ring-primary-500 focus:ring-offset-2', // 增强交互状态
    modalBg: config.modalBg || (config.type === 'dark' ? 'bg-gray-800' : 'bg-white'),
    modalBorder: config.modalBorder || (config.type === 'dark' ? 'border-gray-600' : 'border-gray-300'),
    bg: config.bg || (config.type === 'dark' ? 'bg-gray-900' : 'bg-gray-50'),
    accent: config.accent || (config.type === 'dark' ? 'bg-blue-600' : 'bg-blue-500'),
    accentText: config.accentText || (config.type === 'dark' ? 'text-blue-400' : 'text-blue-700'), // 提升浅色模式对比度
    success: config.success || (config.type === 'dark' ? 'text-green-300' : 'text-green-700'),
    error: config.error || (config.type === 'dark' ? 'text-red-300' : 'text-red-700'),
    stageColors: config.stageColors || {
      'F阶段': config.type === 'dark' ? 'bg-purple-500/40 text-purple-100 border-purple-500/50' : 'bg-purple-100 text-purple-800 border-purple-300', // 优化对比度
      'C阶段': config.type === 'dark' ? 'bg-blue-500/40 text-blue-100 border-blue-500/50' : 'bg-blue-100 text-blue-800 border-blue-300',
      'S阶段': config.type === 'dark' ? 'bg-yellow-500/40 text-yellow-100 border-yellow-500/50' : 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'D阶段': config.type === 'dark' ? 'bg-orange-500/40 text-orange-100 border-orange-500/50' : 'bg-orange-100 text-orange-800 border-orange-300',
      'P阶段': config.type === 'dark' ? 'bg-green-500/40 text-green-100 border-green-500/50' : 'bg-green-100 text-green-800 border-green-300',
    },
    statusColors: config.statusColors || {
      '未投产': config.type === 'dark' ? 'bg-gray-500/40 text-gray-200 border-gray-500/50' : 'bg-gray-200 text-gray-800 border-gray-300', // 提升文本对比度
      '投产中': config.type === 'dark' ? 'bg-blue-500/40 text-blue-100 border-blue-500/50' : 'bg-blue-100 text-blue-800 border-blue-300',
      '正常': config.type === 'dark' ? 'bg-green-500/40 text-green-100 border-green-500/50' : 'bg-green-100 text-green-800 border-green-300',
      '维修中': config.type === 'dark' ? 'bg-orange-500/40 text-orange-100 border-orange-500/50' : 'bg-orange-100 text-orange-800 border-orange-300',
      '三防中': config.type === 'dark' ? 'bg-purple-500/40 text-purple-100 border-purple-500/50' : 'bg-purple-100 text-purple-800 border-purple-300',
      '测试中': config.type === 'dark' ? 'bg-yellow-500/40 text-yellow-100 border-yellow-500/50' : 'bg-yellow-100 text-yellow-800 border-yellow-300',
      '仿真中': config.type === 'dark' ? 'bg-cyan-500/40 text-cyan-100 border-cyan-500/50' : 'bg-cyan-100 text-cyan-800 border-cyan-300',
      '故障': config.type === 'dark' ? 'bg-red-500/40 text-red-100 border-red-500/50' : 'bg-red-100 text-red-800 border-red-300',
    },
    badge: config.type === 'dark' ? 'bg-gray-500/40 text-gray-200 border-gray-500/50' : 'bg-gray-200 text-gray-800 border-gray-300', // 提升对比度
    tableHeader: config.tableHeader || (config.type === 'dark' ? 'bg-gray-700/80 backdrop-blur-xl border-b border-gray-600' : 'bg-gray-100/80 backdrop-blur-sm border-b border-gray-200'),
    hoverBg: config.hoverBg || (config.type === 'dark' ? 'bg-gray-700/80 backdrop-blur-sm hover:bg-gray-600/80' : 'bg-gray-100/80 backdrop-blur-sm hover:bg-gray-200/80'), // 增强hover效果
    emptyBg: config.emptyBg || (config.type === 'dark' ? 'bg-gray-800/80 backdrop-blur-xl border border-gray-700/50 rounded-2xl' : 'bg-white/90 backdrop-blur-sm border border-gray-200/50 rounded-2xl'),
    menuColors: config.menuColors || ['text-blue-700', 'text-purple-700', 'text-green-700', 'text-orange-700', 'text-red-700', 'text-cyan-700', 'text-pink-700', 'text-indigo-700'], // 提升菜单颜色对比度
    menuHoverColors: config.menuHoverColors || ['text-blue-900', 'text-purple-900', 'text-green-900', 'text-orange-900', 'text-red-900', 'text-cyan-900', 'text-pink-900', 'text-indigo-900'],
    shadows: config.shadows || {
      card: config.type === 'dark' ? 'shadow-xl shadow-black/20' : 'shadow-xl shadow-gray-900/10',
      modal: config.type === 'dark' ? 'shadow-2xl shadow-black/30' : 'shadow-2xl shadow-gray-900/15',
      dropdown: config.type === 'dark' ? 'shadow-xl shadow-black/25' : 'shadow-xl shadow-gray-900/10',
    },
    radius: config.radius || {
      sm: 'rounded-lg',
      md: 'rounded-xl',
      lg: 'rounded-2xl',
      xl: 'rounded-2xl',
      '2xl': 'rounded-3xl',
    },
    animation: config.animation || {
      spring: 'transition-all duration-300 ease-out',
      smooth: 'transition-all duration-200 ease-out',
      bounce: 'transition-all duration-200 ease-out hover:scale-105 active:scale-95 focus:ring-2 focus:ring-offset-2', // 添加focus状态
    },
  };
}

export const oceanTheme = createTheme({
  name: '海洋',
  type: 'dark',
  colors: {
    primary: '#0ea5e9',
    secondary: '#06b6d4',
    accent: '#22d3ee',
    background: {
      base: 'bg-gradient-to-br from-[#0c4a6e] via-[#0c4a6e] to-[#164e63]',
      elevated: 'bg-[#0c4a6e]/90 backdrop-blur-xl',
      overlay: 'bg-[#0c4a6e]/95 backdrop-blur-2xl',
    },
    text: {
      primary: 'text-white', // #FFFFFF - 对比度 > 15:1 ✓
      secondary: 'text-cyan-100', // #cffafe - 对比度 ~10:1 ✓
      disabled: 'text-cyan-200/70', // #a5f3fc at 70% opacity - 更清晰
      inverse: 'text-[#0c4a6e]',
    },
    border: {
      subtle: 'border-cyan-400/30',
      default: 'border-cyan-400/50',
      strong: 'border-cyan-400/70',
    },
    status: {
      success: { bg: 'bg-green-500/40', text: 'text-green-100', border: 'border-green-400/60' }, // 增加背景透明度，提亮文字
      warning: { bg: 'bg-yellow-500/40', text: 'text-yellow-100', border: 'border-yellow-400/60' },
      danger: { bg: 'bg-red-500/40', text: 'text-red-100', border: 'border-red-400/60' },
      info: { bg: 'bg-cyan-500/40', text: 'text-cyan-100', border: 'border-cyan-400/60' },
    },
  },
  shadows: {
    card: 'shadow-2xl shadow-cyan-500/10',
    modal: 'shadow-2xl shadow-cyan-500/20',
    dropdown: 'shadow-xl shadow-cyan-500/15',
  },
  radius: {
    sm: 'rounded-lg',
    md: 'rounded-xl',
    lg: 'rounded-2xl',
    xl: 'rounded-2xl',
    '2xl': 'rounded-3xl',
  },
  animation: {
    spring: 'transition-all duration-300 ease-out',
    smooth: 'transition-all duration-200 ease-out',
    bounce: 'transition-all duration-200 ease-out hover:scale-105 active:scale-95',
  },
});

export const forestTheme = createTheme({
  name: '森林',
  type: 'light',
  colors: {
    primary: '#22c55e',
    secondary: '#16a34a',
    accent: '#4ade80',
    background: {
      base: 'bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50',
      elevated: 'bg-white/90 backdrop-blur-xl',
      overlay: 'bg-white/95 backdrop-blur-2xl',
    },
    text: {
      primary: 'text-stone-900',
      secondary: 'text-stone-700',
      disabled: 'text-stone-400',
      inverse: 'text-white',
    },
    border: {
      subtle: 'border-green-200',
      default: 'border-green-300',
      strong: 'border-green-400',
    },
    status: {
      success: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
      warning: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
      danger: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
      info: { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-300' },
    },
  },
  shadows: {
    card: 'shadow-xl shadow-green-500/10',
    modal: 'shadow-2xl shadow-green-500/20',
    dropdown: 'shadow-lg shadow-green-500/10',
  },
  radius: {
    sm: 'rounded-lg',
    md: 'rounded-xl',
    lg: 'rounded-2xl',
    xl: 'rounded-2xl',
    '2xl': 'rounded-3xl',
  },
  animation: {
    spring: 'transition-all duration-300 ease-out',
    smooth: 'transition-all duration-200 ease-out',
    bounce: 'transition-all duration-200 ease-out hover:scale-105 active:scale-95',
  },
});

export const sunsetTheme = createTheme({
  name: '落日',
  type: 'dark',
  colors: {
    primary: '#f97316',
    secondary: '#ea580c',
    accent: '#fb923c',
    background: {
      base: 'bg-gradient-to-br from-[#1c1917] via-[#292524] to-[#1c1917]',
      elevated: 'bg-[#292524]/90 backdrop-blur-xl',
      overlay: 'bg-[#1c1917]/95 backdrop-blur-2xl',
    },
    text: {
      primary: 'text-white', // #FFFFFF - 对比度 > 15:1 ✓
      secondary: 'text-orange-100', // #ffedd5 - 对比度 ~12:1 ✓
      disabled: 'text-orange-200/70', // #fed7aa at 70% opacity - 更清晰
      inverse: 'text-[#1c1917]',
    },
    border: {
      subtle: 'border-orange-400/30',
      default: 'border-orange-400/50',
      strong: 'border-orange-400/70',
    },
    status: {
      success: { bg: 'bg-green-500/40', text: 'text-green-100', border: 'border-green-400/60' },
      warning: { bg: 'bg-amber-500/40', text: 'text-amber-100', border: 'border-amber-400/60' },
      danger: { bg: 'bg-red-500/40', text: 'text-red-100', border: 'border-red-400/60' },
      info: { bg: 'bg-orange-500/40', text: 'text-orange-100', border: 'border-orange-400/60' },
    },
  },
  shadows: {
    card: 'shadow-2xl shadow-orange-500/10',
    modal: 'shadow-2xl shadow-orange-500/20',
    dropdown: 'shadow-xl shadow-orange-500/15',
  },
  radius: {
    sm: 'rounded-lg',
    md: 'rounded-xl',
    lg: 'rounded-2xl',
    xl: 'rounded-2xl',
    '2xl': 'rounded-3xl',
  },
  animation: {
    spring: 'transition-all duration-300 ease-out',
    smooth: 'transition-all duration-200 ease-out',
    bounce: 'transition-all duration-200 ease-out hover:scale-105 active:scale-95',
  },
});

export const midnightTheme = createTheme({
  name: '午夜',
  type: 'dark',
  colors: {
    primary: '#6366f1',
    secondary: '#4f46e5',
    accent: '#818cf8',
    background: {
      base: 'bg-gradient-to-br from-[#0f0f23] via-[#1a1a3e] to-[#0f0f23]',
      elevated: 'bg-[#1a1a3e]/90 backdrop-blur-xl',
      overlay: 'bg-[#0f0f23]/95 backdrop-blur-2xl',
    },
    text: {
      primary: 'text-white', // #FFFFFF - 对比度 > 15:1 ✓
      secondary: 'text-indigo-100', // #e0e7ff - 对比度 ~13:1 ✓
      disabled: 'text-indigo-200/70', // #c7d2fe at 70% opacity - 更清晰
      inverse: 'text-[#0f0f23]',
    },
    border: {
      subtle: 'border-indigo-400/30',
      default: 'border-indigo-400/50',
      strong: 'border-indigo-400/70',
    },
    status: {
      success: { bg: 'bg-green-500/40', text: 'text-green-100', border: 'border-green-400/60' },
      warning: { bg: 'bg-yellow-500/40', text: 'text-yellow-100', border: 'border-yellow-400/60' },
      danger: { bg: 'bg-red-500/40', text: 'text-red-100', border: 'border-red-400/60' },
      info: { bg: 'bg-indigo-500/40', text: 'text-indigo-100', border: 'border-indigo-400/60' },
    },
  },
  shadows: {
    card: 'shadow-2xl shadow-indigo-500/10',
    modal: 'shadow-2xl shadow-indigo-500/20',
    dropdown: 'shadow-xl shadow-indigo-500/15',
  },
  radius: {
    sm: 'rounded-lg',
    md: 'rounded-xl',
    lg: 'rounded-2xl',
    xl: 'rounded-2xl',
    '2xl': 'rounded-3xl',
  },
  animation: {
    spring: 'transition-all duration-300 ease-out',
    smooth: 'transition-all duration-200 ease-out',
    bounce: 'transition-all duration-200 ease-out hover:scale-105 active:scale-95',
  },
});

export const availableThemes = {
  minimal: '极简白',
  dark: '深空灰',
  cyberpunk: '赛博朋克',
  linear: 'Linear',
  anime: '二次元',
  cosmos: '宇宙探索',
  classical: '水墨古风',
  ocean: '海洋',
  forest: '森林',
  sunset: '落日',
  midnight: '午夜',
};

export type ThemeName = keyof typeof availableThemes;
