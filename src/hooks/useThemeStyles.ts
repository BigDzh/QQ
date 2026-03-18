import { useTheme } from '../context/ThemeContext';

const themeConfig = {
  dark: {
    name: '深空灰',
    bg: 'bg-gray-900',
    card: 'bg-gray-800',
    border: 'border-gray-700',
    text: 'text-gray-100',
    textSecondary: 'text-gray-400',
    textMuted: 'text-gray-500',
    accent: 'bg-primary-600',
    accentText: 'text-primary-400',
    input: 'bg-gray-700 border-gray-600',
    modalBg: 'bg-gray-800',
    modalBorder: 'border-gray-700',
    hover: 'hover:bg-gray-700',
    success: 'bg-green-900 text-green-400',
    warning: 'bg-yellow-900 text-yellow-400',
    error: 'bg-red-900 text-red-400',
    button: 'bg-blue-600 text-white hover:bg-blue-500',
    stageColors: {
      C阶段: 'bg-blue-500/20 text-blue-400',
      S阶段: 'bg-yellow-500/20 text-yellow-400',
      D阶段: 'bg-orange-500/20 text-orange-400',
      P阶段: 'bg-green-500/20 text-green-400',
    },
    statusColors: {
      未投产: 'bg-gray-500/20 text-gray-400',
      投产中: 'bg-blue-500/20 text-blue-400',
      正常: 'bg-green-500/20 text-green-400',
      维修中: 'bg-orange-500/20 text-orange-400',
      三防中: 'bg-purple-500/20 text-purple-400',
      测试中: 'bg-yellow-500/20 text-yellow-400',
      仿真中: 'bg-cyan-500/20 text-cyan-400',
      故障: 'bg-red-500/20 text-red-400',
    },
    badge: 'bg-gray-500/20 text-gray-400',
    tableHeader: 'bg-gray-700',
    hoverBg: 'hover:bg-gray-700',
  },
  cyberpunk: {
    name: '赛博朋克',
    bg: 'bg-[#0a0a0f]',
    card: 'bg-[#12121a]',
    border: 'border-[#00ffff]/20',
    text: 'text-[#00ffff]',
    textSecondary: 'text-[#ff00ff]',
    textMuted: 'text-gray-500',
    accent: 'bg-[#00ffff]',
    accentText: 'text-[#00ffff]',
    input: 'bg-[#1a1a2e] border-[#00ffff]/30',
    modalBg: 'bg-[#12121a]',
    modalBorder: 'border-[#00ffff]/30',
    hover: 'hover:bg-[#1a1a2e]',
    success: 'bg-[#00ff00]/10 text-[#00ff00]',
    warning: 'bg-[#ffff00]/10 text-[#ffff00]',
    error: 'bg-[#ff0000]/10 text-[#ff0000]',
    button: 'bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white hover:opacity-90',
    stageColors: {
      C阶段: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30',
      S阶段: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30',
      D阶段: 'bg-orange-500/10 text-orange-400 border border-orange-500/30',
      P阶段: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
    },
    statusColors: {
      未投产: 'bg-gray-500/10 text-gray-400 border border-gray-500/30',
      投产中: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30',
      正常: 'bg-green-500/10 text-green-400 border border-green-500/30',
      维修中: 'bg-orange-500/10 text-orange-400 border border-orange-500/30',
      三防中: 'bg-purple-500/10 text-purple-400 border border-purple-500/30',
      测试中: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30',
      仿真中: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30',
      故障: 'bg-red-500/10 text-red-400 border border-red-500/30',
    },
    badge: 'bg-gray-500/10 text-gray-400 border border-gray-500/30',
    tableHeader: 'bg-[#1a1a2e]',
    hoverBg: 'hover:bg-[#1a1a2e]',
  },
  linear: {
    name: 'Linear',
    bg: 'bg-[#0d0d0f]',
    card: 'bg-[#141416]',
    border: 'border-[#2c2c30]',
    text: 'text-[#ededef]',
    textSecondary: 'text-[#8a8a8e]',
    textMuted: 'text-[#5c5c5f]',
    accent: 'bg-[#5e6ad2]',
    accentText: 'text-[#5e6ad2]',
    input: 'bg-[#1c1c1f] border-[#2c2c30] text-[#ededef]',
    modalBg: 'bg-[#141416]',
    modalBorder: 'border-[#2c2c30]',
    hover: 'hover:bg-[#1c1c1f]',
    success: 'bg-[#2ea043]/20 text-[#3fb950]',
    warning: 'bg-[#9e6a03]/20 text-[#d29922]',
    error: 'bg-[#f85149]/20 text-[#f85149]',
    button: 'bg-[#5e6ad2] text-white hover:bg-[#4b5ab8]',
    stageColors: {
      C阶段: 'bg-[#3b82f6]/20 text-[#60a5fa] border border-[#3b82f6]/30',
      S阶段: 'bg-[#eab308]/20 text-[#facc15] border border-[#eab308]/30',
      D阶段: 'bg-[#f97316]/20 text-[#fb923c] border border-[#f97316]/30',
      P阶段: 'bg-[#22c55e]/20 text-[#4ade80] border border-[#22c55e]/30',
    },
    statusColors: {
      未投产: 'bg-[#6b7280]/20 text-[#9ca3af] border border-[#6b7280]/30',
      投产中: 'bg-[#3b82f6]/20 text-[#60a5fa] border border-[#3b82f6]/30',
      正常: 'bg-[#22c55e]/20 text-[#4ade80] border border-[#22c55e]/30',
      维修中: 'bg-[#f97316]/20 text-[#fb923c] border border-[#f97316]/30',
      三防中: 'bg-[#a855f7]/20 text-[#c084fc] border border-[#a855f7]/30',
      测试中: 'bg-[#eab308]/20 text-[#facc15] border border-[#eab308]/30',
      仿真中: 'bg-[#06b6d4]/20 text-[#22d3ee] border border-[#06b6d4]/30',
      故障: 'bg-[#ef4444]/20 text-[#f87171] border border-[#ef4444]/30',
    },
    badge: 'bg-[#2c2c30] text-[#8a8a8e]',
    tableHeader: 'bg-[#1c1c1f]',
    hoverBg: 'hover:bg-[#1c1c1f]',
  },
  anime: {
    name: '动漫风格',
    bg: 'bg-gradient-to-br from-pink-50 via-purple-50 to-cyan-50',
    card: 'bg-white/70 backdrop-blur-sm',
    border: 'border-pink-200/30',
    text: 'text-pink-900',
    textSecondary: 'text-purple-700',
    textMuted: 'text-pink-500',
    accent: 'bg-gradient-to-r from-pink-400 via-purple-500 to-cyan-500',
    accentText: 'text-white',
    input: 'bg-white/80 border-pink-200/50',
    modalBg: 'bg-white/90 backdrop-blur-md',
    modalBorder: 'border-pink-200/30',
    hover: 'hover:bg-pink-50',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    error: 'bg-red-100 text-red-700',
    button: 'bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-white hover:opacity-90',
    stageColors: {
      C阶段: 'bg-blue-100 text-blue-700',
      S阶段: 'bg-yellow-100 text-yellow-700',
      D阶段: 'bg-orange-100 text-orange-700',
      P阶段: 'bg-green-100 text-green-700',
    },
    statusColors: {
      未投产: 'bg-gray-100 text-gray-700',
      投产中: 'bg-blue-100 text-blue-700',
      正常: 'bg-green-100 text-green-700',
      维修中: 'bg-orange-100 text-orange-700',
      三防中: 'bg-purple-100 text-purple-700',
      测试中: 'bg-yellow-100 text-yellow-700',
      仿真中: 'bg-cyan-100 text-cyan-700',
      故障: 'bg-red-100 text-red-700',
    },
    badge: 'bg-pink-100 text-pink-700',
    tableHeader: 'bg-pink-50',
    hoverBg: 'hover:bg-pink-50',
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
