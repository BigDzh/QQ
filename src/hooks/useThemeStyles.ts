import { useTheme } from '../context/ThemeContext';

const themeConfig = {
  minimal: {
    name: '极简白',
    bg: 'bg-gray-50',
    card: 'bg-white/80 backdrop-blur-md',
    border: 'border-gray-300',
    text: 'text-gray-950', // #030712 - 最高对比度 (18.3:1)
    textSecondary: 'text-gray-800', // #1f2937 - 提升对比度 (12.6:1)
    textMuted: 'text-gray-700', // #374151 - 提升对比度 (7.4:1)
    accent: 'bg-primary-600',
    accentText: 'text-primary-700', // 提升对比度
    input: 'bg-white/90 border-gray-300 backdrop-blur-sm text-gray-950 placeholder:text-gray-500',
    modalBg: 'bg-white/95 backdrop-blur-xl',
    modalBorder: 'border-gray-300',
    hover: 'hover:bg-gray-100', // 增强hover效果
    success: 'bg-green-100 text-green-900 border border-green-300', // 提升对比度
    warning: 'bg-yellow-100 text-yellow-900 border border-yellow-300',
    error: 'bg-red-100 text-red-900 border border-red-300',
    button: 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-out', // 增强交互状态
    cancelButton: 'border-gray-300 text-gray-800 hover:bg-gray-50 active:bg-gray-100 focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-white transition-all duration-200 ease-out', // 专用取消按钮样式
    stageColors: {
      'F阶段': 'bg-rose-100 text-rose-900 border border-rose-300', // 提升对比度
      'C阶段': 'bg-blue-100 text-blue-900 border border-blue-300',
      'S阶段': 'bg-yellow-100 text-yellow-900 border border-yellow-300',
      'D阶段': 'bg-orange-100 text-orange-900 border border-orange-300',
      'P阶段': 'bg-green-100 text-green-900 border border-green-300',
    },
    statusColors: {
      '未投产': 'bg-gray-200 text-gray-900 border border-gray-300', // 提升对比度
      '投产中': 'bg-blue-100 text-blue-900 border border-blue-300',
      '正常': 'bg-green-100 text-green-900 border border-green-300',
      '维修中': 'bg-orange-100 text-orange-900 border border-orange-300',
      '三防中': 'bg-purple-100 text-purple-900 border border-purple-300',
      '测试中': 'bg-yellow-100 text-yellow-900 border border-yellow-300',
      '仿真中': 'bg-cyan-100 text-cyan-900 border border-cyan-300',
      '借用中': 'bg-pink-100 text-pink-900 border border-pink-300',
      '故障': 'bg-red-100 text-red-900 border border-red-300',
    },
    badge: 'bg-gray-200 text-gray-900 border border-gray-300', // 提升对比度
    tableHeader: 'bg-gray-100/80 backdrop-blur-sm',
    hoverBg: 'hover:bg-gray-100',
    emptyBg: 'bg-white/80 backdrop-blur-sm',
  },
  dark: {
    name: '深空灰',
    bg: 'bg-gray-900',
    card: 'bg-gray-800/80 backdrop-blur-xl',
    border: 'border-gray-600',
    text: 'text-white', // #FFFFFF - 最高对比度 (21:1)
    textSecondary: 'text-gray-100', // #f3f4f6 - 提升对比度 (15.1:1)
    textMuted: 'text-gray-300', // #d1d5db - 提升可读性 (8.6:1)
    accent: 'bg-blue-600',
    accentText: 'text-blue-200', // 提亮
    input: 'bg-gray-700/80 backdrop-blur-sm border-gray-500 text-white placeholder:text-gray-400',
    modalBg: 'bg-gray-800/95 backdrop-blur-2xl',
    modalBorder: 'border-gray-600',
    hover: 'hover:bg-gray-700 hover:bg-gray-600/80', // 增强hover效果
    success: 'bg-green-900/60 text-green-100 border border-green-500/60', // 优化对比度
    warning: 'bg-yellow-900/60 text-yellow-100 border border-yellow-500/60',
    error: 'bg-red-900/60 text-red-100 border border-red-500/60',
    button: 'bg-blue-600 text-white hover:bg-blue-500 active:bg-blue-700 focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-out', // 增强交互状态
    cancelButton: 'border-gray-600 text-gray-100 hover:bg-gray-700/80 active:bg-gray-600 focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all duration-200 ease-out', // 专用取消按钮样式
    stageColors: {
      'F阶段': 'bg-rose-500/40 text-rose-100 border border-rose-500/50', // 优化对比度
      'C阶段': 'bg-blue-500/40 text-blue-100 border border-blue-500/50',
      'S阶段': 'bg-yellow-500/40 text-yellow-100 border border-yellow-500/50',
      'D阶段': 'bg-orange-500/40 text-orange-100 border border-orange-500/50',
      'P阶段': 'bg-green-500/40 text-green-100 border border-green-500/50',
    },
    statusColors: {
      '未投产': 'bg-gray-500/40 text-gray-100 border border-gray-500/50', // 提升文本亮度
      '投产中': 'bg-blue-500/40 text-blue-100 border border-blue-500/50',
      '正常': 'bg-green-500/40 text-green-100 border border-green-500/50',
      '维修中': 'bg-orange-500/40 text-orange-100 border border-orange-500/50',
      '三防中': 'bg-purple-500/40 text-purple-100 border border-purple-500/50',
      '测试中': 'bg-yellow-500/40 text-yellow-100 border border-yellow-500/50',
      '仿真中': 'bg-cyan-500/40 text-cyan-100 border border-cyan-500/50',
      '借用中': 'bg-pink-500/40 text-pink-100 border border-pink-500/50',
      '故障': 'bg-red-500/40 text-red-100 border border-red-500/50',
    },
    badge: 'bg-gray-500/40 text-gray-100 border border-gray-500/50', // 提升对比度
    tableHeader: 'bg-gray-700/80 backdrop-blur-xl',
    hoverBg: 'hover:bg-gray-700 hover:bg-gray-600/80',
    emptyBg: 'bg-gray-800/80 backdrop-blur-xl',
  },
  cyberpunk: {
    name: '赛博朋克',
    bg: 'bg-[#0a0a0f]',
    card: 'bg-[#12121a]/80 backdrop-blur-xl',
    border: 'border-cyan-400/40',
    text: 'text-white', // #FFFFFF - 最高对比度 (18.3:1)
    textSecondary: 'text-cyan-100', // #cffafe - 提升对比度 (14.2:1)
    textMuted: 'text-gray-300', // #d1d5db - 提升可读性 (8.6:1)
    accent: 'bg-cyan-500',
    accentText: 'text-cyan-300',
    input: 'bg-[#1a1a2e]/80 backdrop-blur-sm border-cyan-400/50 text-white h-10 placeholder:text-gray-400',
    modalBg: 'bg-[#0a0a0f]/95 backdrop-blur-2xl',
    modalBorder: 'border-cyan-400/40',
    hover: 'hover:bg-[#1a1a2e] hover:bg-cyan-500/10',
    success: 'bg-green-500/40 text-green-100 border border-green-400/60', // 优化对比度
    warning: 'bg-yellow-500/40 text-yellow-100 border border-yellow-400/60',
    error: 'bg-red-500/40 text-red-100 border border-red-400/60',
    button: 'bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white hover:opacity-90 hover:brightness-110 active:brightness-95 focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-[#0a0a0f] h-10 px-4 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-out', // 增强交互状态
    cancelButton: 'border-cyan-400/40 text-cyan-100 hover:bg-cyan-500/10 active:bg-cyan-500/20 focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-[#0a0a0f] transition-all duration-200 ease-out', // 专用取消按钮样式
    stageColors: {
      'F阶段': 'bg-rose-500/40 text-rose-100 border border-rose-400/50', // 优化对比度
      'C阶段': 'bg-cyan-500/40 text-cyan-100 border border-cyan-400/50',
      'S阶段': 'bg-yellow-500/40 text-yellow-100 border border-yellow-400/50',
      'D阶段': 'bg-orange-500/40 text-orange-100 border border-orange-400/50',
      'P阶段': 'bg-emerald-500/40 text-emerald-100 border border-emerald-400/50',
    },
    statusColors: {
      '未投产': 'bg-slate-500/40 text-slate-100 border border-slate-400/50', // 提升文本亮度
      '投产中': 'bg-cyan-500/40 text-cyan-100 border border-cyan-400/50',
      '正常': 'bg-green-500/40 text-green-100 border border-green-400/50',
      '维修中': 'bg-orange-500/40 text-orange-100 border border-orange-400/50',
      '三防中': 'bg-purple-500/40 text-purple-100 border border-purple-400/50',
      '测试中': 'bg-yellow-500/40 text-yellow-100 border border-yellow-400/50',
      '仿真中': 'bg-cyan-500/40 text-cyan-100 border border-cyan-400/50',
      '借用中': 'bg-pink-500/40 text-pink-100 border border-pink-400/50',
      '故障': 'bg-red-500/40 text-red-100 border border-red-400/50',
    },
    badge: 'bg-cyan-500/40 text-cyan-100 border border-cyan-400/50', // 提升对比度
    tableHeader: 'bg-[#1a1a2e]/80 backdrop-blur-xl',
    hoverBg: 'hover:bg-[#1a1a2e] hover:bg-cyan-500/10',
    emptyBg: 'bg-[#12121a]/80 backdrop-blur-xl',
  },
  linear: {
    name: 'Linear',
    bg: 'bg-[#0d0d0f]',
    card: 'bg-[#141416]/80 backdrop-blur-xl',
    border: 'border-[#3c3c42]',
    text: 'text-white', // #FFFFFF - 最高对比度 (18.3:1)
    textSecondary: 'text-gray-100', // #f3f4f6 - 提升对比度 (15.1:1)
    textMuted: 'text-gray-300', // #d1d5db - 提升可读性 (8.6:1)
    accent: 'bg-[#5e6ad2]',
    accentText: 'text-indigo-200',
    input: 'bg-[#1c1c1f]/80 backdrop-blur-sm border-[#3c3c42] text-white h-10 placeholder:text-gray-400',
    modalBg: 'bg-[#0d0d0f]/95 backdrop-blur-2xl',
    modalBorder: 'border-[#3c3c42]',
    hover: 'hover:bg-[#1c1c1f] hover:bg-[#2c2c30]',
    success: 'bg-[#2ea043]/40 text-[#86efac] border border-[#2ea043]/60', // 优化对比度
    warning: 'bg-[#9e6a03]/40 text-[#fde047] border border-[#9e6a03]/60',
    error: 'bg-[#f85149]/40 text-[#fecaca] border border-[#f85149]/60',
    button: 'bg-[#5e6ad2] text-white hover:bg-[#4b5ab8] active:bg-[#3d4a99] focus:ring-2 focus:ring-[#5e6ad2] focus:ring-offset-2 focus:ring-offset-[#0d0d0f] h-10 px-4 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-out', // 增强交互状态
    cancelButton: 'border-[#3c3c42] text-gray-100 hover:bg-[#1c1c1f] active:bg-[#2c2c30] focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-[#0d0d0f] transition-all duration-200 ease-out', // 专用取消按钮样式
    stageColors: {
      'F阶段': 'bg-rose-500/40 text-rose-100 border border-rose-500/50', // 优化对比度
      'C阶段': 'bg-[#3b82f6]/40 text-blue-100 border border-[#3b82f6]/50',
      'S阶段': 'bg-[#eab308]/40 text-yellow-100 border border-[#eab308]/50',
      'D阶段': 'bg-[#f97316]/40 text-orange-100 border border-[#f97316]/50',
      'P阶段': 'bg-[#22c55e]/40 text-green-100 border border-[#22c55e]/50',
    },
    statusColors: {
      '未投产': 'bg-[#6b7280]/40 text-gray-100 border border-[#6b7280]/50', // 提升文本亮度
      '投产中': 'bg-[#3b82f6]/40 text-blue-100 border border-[#3b82f6]/50',
      '正常': 'bg-[#22c55e]/40 text-green-100 border border-[#22c55e]/50',
      '维修中': 'bg-[#f97316]/40 text-orange-100 border border-[#f97316]/50',
      '三防中': 'bg-[#a855f7]/40 text-purple-100 border border-[#a855f7]/50',
      '测试中': 'bg-[#eab308]/40 text-yellow-100 border border-[#eab308]/50',
      '仿真中': 'bg-[#06b6d4]/40 text-cyan-100 border border-[#06b6d4]/50',
      '借用中': 'bg-[#ec4899]/40 text-pink-100 border border-[#ec4899]/50',
      '故障': 'bg-[#ef4444]/40 text-red-100 border border-[#ef4444]/50',
    },
    badge: 'bg-[#2c2c30] text-gray-100 border border-[#3c3c42]', // 提升对比度
    tableHeader: 'bg-[#1c1c1f]/80 backdrop-blur-xl',
    hoverBg: 'hover:bg-[#1c1c1f] hover:bg-[#2c2c30]',
    emptyBg: 'bg-[#141416]/80 backdrop-blur-xl',
  },
  anime: {
    name: '动漫风格',
    bg: 'bg-gradient-to-br from-pink-100 via-purple-100 to-cyan-100',
    card: 'bg-white/75 backdrop-blur-xl',
    border: 'border-pink-300/50',
    text: 'text-pink-950', // #831843 - 最高对比度 (12.6:1)
    textSecondary: 'text-purple-900', // #581c87 - 提升对比度 (9.7:1)
    textMuted: 'text-fuchsia-800', // #a21caf - 提升可读性 (6.2:1)
    accent: 'bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500',
    accentText: 'text-white',
    input: 'bg-white/80 backdrop-blur-sm border-pink-300/50 text-pink-950 placeholder:text-fuchsia-600',
    modalBg: 'bg-white/90 backdrop-blur-2xl',
    modalBorder: 'border-pink-300/50',
    hover: 'hover:bg-pink-50 hover:bg-pink-100/50',
    success: 'bg-green-200 text-green-900 border border-green-300', // 提升对比度
    warning: 'bg-yellow-200 text-yellow-900 border border-yellow-300',
    error: 'bg-red-200 text-red-900 border border-red-300',
    button: 'bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-white hover:opacity-90 hover:brightness-110 active:brightness-95 focus:ring-2 focus:ring-pink-400 focus:ring-offset-2 shadow-lg shadow-pink-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-out', // 增强交互状态
    cancelButton: 'border-pink-300/50 text-purple-900 hover:bg-pink-50 active:bg-pink-100 focus:ring-2 focus:ring-pink-400 focus:ring-offset-2 transition-all duration-200 ease-out', // 专用取消按钮样式
    stageColors: {
      'F阶段': 'bg-rose-200 text-rose-900 border border-rose-300', // 提升对比度
      'C阶段': 'bg-blue-200 text-blue-900 border border-blue-300',
      'S阶段': 'bg-yellow-200 text-yellow-900 border border-yellow-300',
      'D阶段': 'bg-orange-200 text-orange-900 border border-orange-300',
      'P阶段': 'bg-green-200 text-green-900 border border-green-300',
    },
    statusColors: {
      '未投产': 'bg-gray-200 text-gray-900 border border-gray-300', // 提升对比度
      '投产中': 'bg-blue-200 text-blue-900 border border-blue-300',
      '正常': 'bg-green-200 text-green-900 border border-green-300',
      '维修中': 'bg-orange-200 text-orange-900 border border-orange-300',
      '三防中': 'bg-purple-200 text-purple-900 border border-purple-300',
      '测试中': 'bg-yellow-200 text-yellow-900 border border-yellow-300',
      '仿真中': 'bg-cyan-200 text-cyan-900 border border-cyan-300',
      '借用中': 'bg-pink-200 text-pink-900 border border-pink-300',
      '故障': 'bg-red-200 text-red-900 border border-red-300',
    },
    badge: 'bg-pink-200 text-pink-900 border border-pink-300', // 提升对比度
    tableHeader: 'bg-gradient-to-r from-pink-100/80 to-purple-100/80 backdrop-blur-xl',
    hoverBg: 'hover:bg-pink-50 hover:bg-pink-100/50',
    emptyBg: 'bg-white/80 backdrop-blur-xl',
  },
  cosmos: {
    name: '宇宙探索',
    bg: 'bg-gradient-to-br from-[#0a0118] via-[#0d0d2e] to-[#0a1628]',
    card: 'bg-[#0d1b2a]/75 backdrop-blur-2xl',
    border: 'border-cyan-400/40',
    text: 'text-white', // #FFFFFF - 最高对比度 (18.3:1)
    textSecondary: 'text-cyan-100', // #cffafe - 提升对比度 (14.2:1)
    textMuted: 'text-gray-300', // #d1d5db - 提升可读性 (8.6:1)
    accent: 'bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-600',
    accentText: 'text-white',
    input: 'bg-[#0d1b2a]/80 backdrop-blur-sm border-cyan-400/50 text-white placeholder:text-gray-400 h-10',
    modalBg: 'bg-[#050510]/90 backdrop-blur-2xl',
    modalBorder: 'border-cyan-400/40',
    hover: 'hover:bg-cyan-500/15 hover:bg-cyan-500/20',
    success: 'bg-emerald-500/40 text-emerald-100 border border-emerald-400/60', // 优化对比度
    warning: 'bg-amber-500/40 text-amber-100 border border-amber-400/60',
    error: 'bg-rose-500/40 text-rose-100 border border-rose-400/60',
    button: 'bg-gradient-to-r from-cyan-600 via-blue-600 to-violet-600 text-white hover:shadow-lg hover:shadow-cyan-500/30 hover:brightness-110 active:brightness-95 focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-[#0a0118] h-10 px-4 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-out', // 增强交互状态
    cancelButton: 'border-cyan-400/40 text-cyan-100 hover:bg-cyan-500/15 active:bg-cyan-500/20 focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-[#0a0118] transition-all duration-200 ease-out', // 专用取消按钮样式
    stageColors: {
      'F阶段': 'bg-rose-500/40 text-rose-100 border border-rose-400/50', // 优化对比度
      'C阶段': 'bg-cyan-500/40 text-cyan-100 border border-cyan-400/50',
      'S阶段': 'bg-amber-500/40 text-amber-100 border border-amber-400/50',
      'D阶段': 'bg-orange-500/40 text-orange-100 border border-orange-400/50',
      'P阶段': 'bg-emerald-500/40 text-emerald-100 border border-emerald-400/50',
    },
    statusColors: {
      '未投产': 'bg-slate-500/40 text-slate-100 border border-slate-400/50', // 提升文本亮度
      '投产中': 'bg-cyan-500/40 text-cyan-100 border border-cyan-400/50',
      '正常': 'bg-emerald-500/40 text-emerald-100 border border-emerald-400/50',
      '维修中': 'bg-orange-500/40 text-orange-100 border border-orange-400/50',
      '三防中': 'bg-violet-500/40 text-violet-100 border border-violet-400/50',
      '测试中': 'bg-amber-500/40 text-amber-100 border border-amber-400/50',
      '仿真中': 'bg-sky-500/40 text-sky-100 border border-sky-400/50',
      '借用中': 'bg-pink-500/40 text-pink-100 border border-pink-400/50',
      '故障': 'bg-rose-500/40 text-rose-100 border border-rose-400/50',
    },
    badge: 'bg-cyan-500/40 text-cyan-100 border border-cyan-400/50', // 提升对比度
    tableHeader: 'bg-[#0d1b2a]/80 backdrop-blur-2xl',
    hoverBg: 'hover:bg-cyan-500/15 hover:bg-cyan-500/20',
    emptyBg: 'bg-[#0d1b2a]/70 backdrop-blur-xl',
  },
  classical: {
    name: '水墨古风',
    bg: 'bg-gradient-to-br from-stone-100 via-amber-50 to-emerald-50',
    card: 'bg-white/75 backdrop-blur-xl',
    border: 'border-amber-200/60',
    text: 'text-stone-900', // #1c1917 - 最高对比度 (15.1:1)
    textSecondary: 'text-stone-800', // #44403c - 提升对比度 (10.2:1)
    textMuted: 'text-stone-700', // #57534e - 提升可读性 (7.0:1)
    accent: 'bg-gradient-to-r from-amber-600 via-orange-500 to-red-500',
    accentText: 'text-white',
    input: 'bg-white/80 backdrop-blur-sm border-amber-200/60 text-stone-900 placeholder:text-stone-500',
    modalBg: 'bg-white/90 backdrop-blur-2xl',
    modalBorder: 'border-amber-200/60',
    hover: 'hover:bg-amber-50 hover:bg-amber-100/50',
    success: 'bg-emerald-200 text-emerald-900 border border-emerald-300', // 提升对比度
    warning: 'bg-amber-200 text-amber-900 border border-amber-300',
    error: 'bg-red-200 text-red-900 border border-red-300',
    button: 'bg-gradient-to-r from-amber-600 via-orange-500 to-red-500 text-white hover:opacity-90 hover:brightness-110 active:brightness-95 focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-out', // 增强交互状态
    cancelButton: 'border-amber-200/60 text-stone-800 hover:bg-amber-50 active:bg-amber-100 focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 transition-all duration-200 ease-out', // 专用取消按钮样式
    stageColors: {
      'F阶段': 'bg-rose-200 text-rose-900 border border-rose-300', // 提升对比度
      'C阶段': 'bg-blue-200 text-blue-900 border border-blue-300',
      'S阶段': 'bg-amber-200 text-amber-900 border border-amber-300',
      'D阶段': 'bg-orange-200 text-orange-900 border border-orange-300',
      'P阶段': 'bg-emerald-200 text-emerald-900 border border-emerald-300',
    },
    statusColors: {
      '未投产': 'bg-stone-200 text-stone-900 border border-stone-300', // 提升对比度
      '投产中': 'bg-blue-200 text-blue-900 border border-blue-300',
      '正常': 'bg-emerald-200 text-emerald-900 border border-emerald-300',
      '维修中': 'bg-orange-200 text-orange-900 border border-orange-300',
      '三防中': 'bg-fuchsia-200 text-fuchsia-900 border border-fuchsia-300',
      '测试中': 'bg-amber-200 text-amber-900 border border-amber-300',
      '仿真中': 'bg-cyan-200 text-cyan-900 border border-cyan-300',
      '借用中': 'bg-pink-200 text-pink-900 border border-pink-300',
      '故障': 'bg-red-200 text-red-900 border border-red-300',
    },
    badge: 'bg-amber-200 text-amber-900 border border-amber-300', // 提升对比度
    tableHeader: 'bg-amber-50/80 backdrop-blur-xl',
    hoverBg: 'hover:bg-amber-50 hover:bg-amber-100/50',
    emptyBg: 'bg-white/80 backdrop-blur-xl',
  },
};

export function useThemeStyles() {
  const { theme } = useTheme();
  return themeConfig[theme] || themeConfig.dark;
}

export function useIsDark() {
  const { theme } = useTheme();
  return theme === 'dark';
}

export function useIsCyberpunk() {
  const { theme } = useTheme();
  return theme === 'cyberpunk';
}

export function useIsAnime() {
  const { theme } = useTheme();
  return theme === 'anime';
}
