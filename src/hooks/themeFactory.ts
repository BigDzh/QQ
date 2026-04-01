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
        primary: config.type === 'dark' ? 'text-white' : 'text-gray-950',
        secondary: config.type === 'dark' ? 'text-gray-200' : 'text-gray-700',
        disabled: config.type === 'dark' ? 'text-gray-500' : 'text-gray-400',
        inverse: config.type === 'dark' ? 'text-gray-900' : 'text-white',
      },
      border: {
        subtle: config.type === 'dark' ? 'border-gray-700' : 'border-gray-200',
        default: config.type === 'dark' ? 'border-gray-600' : 'border-gray-300',
        strong: config.type === 'dark' ? 'border-gray-500' : 'border-gray-400',
      },
      status: {
        success: { bg: 'bg-success-100', text: 'text-success-700', border: 'border-success-300' },
        warning: { bg: 'bg-warning-100', text: 'text-warning-700', border: 'border-warning-300' },
        danger: { bg: 'bg-danger-100', text: 'text-danger-700', border: 'border-danger-300' },
        info: { bg: 'bg-info-100', text: 'text-info-700', border: 'border-info-300' },
      },
    },
    text: config.text || (config.type === 'dark' ? 'text-white' : 'text-gray-900'),
    textSecondary: config.textSecondary || (config.type === 'dark' ? 'text-gray-300' : 'text-gray-600'),
    textMuted: config.textMuted || (config.type === 'dark' ? 'text-gray-500' : 'text-gray-400'),
    border: config.border || (config.type === 'dark' ? 'border-gray-600' : 'border-gray-300'),
    card: config.card || (config.type === 'dark' ? 'bg-gray-800/80' : 'bg-white/90'),
    input: config.input || (config.type === 'dark' ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'),
    button: config.button || 'bg-blue-600 text-white hover:bg-blue-700',
    modalBg: config.modalBg || (config.type === 'dark' ? 'bg-gray-800' : 'bg-white'),
    modalBorder: config.modalBorder || (config.type === 'dark' ? 'border-gray-600' : 'border-gray-300'),
    bg: config.bg || (config.type === 'dark' ? 'bg-gray-900' : 'bg-gray-50'),
    accent: config.accent || (config.type === 'dark' ? 'bg-blue-600' : 'bg-blue-500'),
    accentText: config.accentText || (config.type === 'dark' ? 'text-blue-400' : 'text-blue-600'),
    success: config.success || (config.type === 'dark' ? 'text-green-400' : 'text-green-600'),
    error: config.error || (config.type === 'dark' ? 'text-red-400' : 'text-red-600'),
    stageColors: config.stageColors || {
      'F阶段': config.type === 'dark' ? 'bg-purple-500/40 text-purple-200 border-purple-500/50' : 'bg-purple-100 text-purple-800 border-purple-300',
      'C阶段': config.type === 'dark' ? 'bg-blue-500/40 text-blue-200 border-blue-500/50' : 'bg-blue-100 text-blue-800 border-blue-300',
      'S阶段': config.type === 'dark' ? 'bg-yellow-500/40 text-yellow-200 border-yellow-500/50' : 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'D阶段': config.type === 'dark' ? 'bg-orange-500/40 text-orange-200 border-orange-500/50' : 'bg-orange-100 text-orange-800 border-orange-300',
      'P阶段': config.type === 'dark' ? 'bg-green-500/40 text-green-200 border-green-500/50' : 'bg-green-100 text-green-800 border-green-300',
    },
    statusColors: config.statusColors || {
      '未投产': config.type === 'dark' ? 'bg-gray-500/40 text-gray-200 border-gray-500/50' : 'bg-gray-200 text-gray-900 border-gray-300',
      '投产中': config.type === 'dark' ? 'bg-blue-500/40 text-blue-200 border-blue-500/50' : 'bg-blue-100 text-blue-800 border-blue-300',
      '正常': config.type === 'dark' ? 'bg-green-500/40 text-green-200 border-green-500/50' : 'bg-green-100 text-green-800 border-green-300',
      '维修中': config.type === 'dark' ? 'bg-orange-500/40 text-orange-200 border-orange-500/50' : 'bg-orange-100 text-orange-800 border-orange-300',
      '三防中': config.type === 'dark' ? 'bg-purple-500/40 text-purple-200 border-purple-500/50' : 'bg-purple-100 text-purple-800 border-purple-300',
      '测试中': config.type === 'dark' ? 'bg-yellow-500/40 text-yellow-200 border-yellow-500/50' : 'bg-yellow-100 text-yellow-800 border-yellow-300',
      '仿真中': config.type === 'dark' ? 'bg-cyan-500/40 text-cyan-200 border-cyan-500/50' : 'bg-cyan-100 text-cyan-800 border-cyan-300',
      '故障': config.type === 'dark' ? 'bg-red-500/40 text-red-200 border-red-500/50' : 'bg-red-100 text-red-800 border-red-300',
    },
    badge: config.type === 'dark' ? 'bg-gray-500/40 text-gray-200 border-gray-500/50' : 'bg-gray-200 text-gray-900 border-gray-300',
    tableHeader: config.type === 'dark' ? 'bg-gray-700/80 backdrop-blur-xl border-b border-gray-600' : 'bg-gray-100/80 backdrop-blur-sm border-b border-gray-200',
    hoverBg: config.type === 'dark' ? 'bg-gray-700/80 backdrop-blur-sm' : 'bg-gray-100/80 backdrop-blur-sm',
    emptyBg: config.type === 'dark' ? 'bg-gray-800/80 backdrop-blur-xl border border-gray-700/50 rounded-2xl' : 'bg-white/90 backdrop-blur-sm border border-gray-200/50 rounded-2xl',
    menuColors: config.menuColors || ['text-blue-600', 'text-purple-600', 'text-green-600', 'text-orange-600', 'text-red-600', 'text-cyan-600', 'text-pink-600', 'text-indigo-600'],
    menuHoverColors: config.menuHoverColors || ['text-blue-800', 'text-purple-800', 'text-green-800', 'text-orange-800', 'text-red-800', 'text-cyan-800', 'text-pink-800', 'text-indigo-800'],
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
      bounce: 'transition-all duration-200 ease-out hover:scale-105 active:scale-95',
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
      primary: 'text-cyan-50',
      secondary: 'text-cyan-100',
      disabled: 'text-cyan-300/50',
      inverse: 'text-[#0c4a6e]',
    },
    border: {
      subtle: 'border-cyan-400/20',
      default: 'border-cyan-400/40',
      strong: 'border-cyan-400/60',
    },
    status: {
      success: { bg: 'bg-green-500/30', text: 'text-green-200', border: 'border-green-400/50' },
      warning: { bg: 'bg-yellow-500/30', text: 'text-yellow-200', border: 'border-yellow-400/50' },
      danger: { bg: 'bg-red-500/30', text: 'text-red-200', border: 'border-red-400/50' },
      info: { bg: 'bg-cyan-500/30', text: 'text-cyan-200', border: 'border-cyan-400/50' },
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
      primary: 'text-orange-50',
      secondary: 'text-orange-100',
      disabled: 'text-orange-300/50',
      inverse: 'text-[#1c1917]',
    },
    border: {
      subtle: 'border-orange-400/20',
      default: 'border-orange-400/40',
      strong: 'border-orange-400/60',
    },
    status: {
      success: { bg: 'bg-green-500/30', text: 'text-green-200', border: 'border-green-400/50' },
      warning: { bg: 'bg-amber-500/30', text: 'text-amber-200', border: 'border-amber-400/50' },
      danger: { bg: 'bg-red-500/30', text: 'text-red-200', border: 'border-red-400/50' },
      info: { bg: 'bg-orange-500/30', text: 'text-orange-200', border: 'border-orange-400/50' },
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
      primary: 'text-indigo-50',
      secondary: 'text-indigo-100',
      disabled: 'text-indigo-300/50',
      inverse: 'text-[#0f0f23]',
    },
    border: {
      subtle: 'border-indigo-400/20',
      default: 'border-indigo-400/40',
      strong: 'border-indigo-400/60',
    },
    status: {
      success: { bg: 'bg-green-500/30', text: 'text-green-200', border: 'border-green-400/50' },
      warning: { bg: 'bg-yellow-500/30', text: 'text-yellow-200', border: 'border-yellow-400/50' },
      danger: { bg: 'bg-red-500/30', text: 'text-red-200', border: 'border-red-400/50' },
      info: { bg: 'bg-indigo-500/30', text: 'text-indigo-200', border: 'border-indigo-400/50' },
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
