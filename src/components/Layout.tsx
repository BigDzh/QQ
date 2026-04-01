import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FolderKanban,
  CheckSquare,
  User,
  Database,
  FileText,
  LogOut,
  Menu,
  Keyboard,
  HelpCircle,
  Settings,
  ArrowRightLeft,
  Circle,
  ChevronDown,
  Palette,
  FlaskConical,
  Layers,
  Trash2,
  Package,
} from 'lucide-react';
import SystemResources from './SystemResources';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { getVersion, getBuildDate, getVersionHistory } from '../utils/version';
import { matchesShortcut } from '../utils/shortcuts';
import SidebarCat from './SidebarCat';
import { SkipLink } from './ui/AccessibleModal';

interface LayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  { path: '/projects', icon: FolderKanban, label: '项目管理' },
  { path: '/tasks', icon: CheckSquare, label: '任务管理' },
  { path: '/borrow', icon: ArrowRightLeft, label: '借用系统' },
  { path: '/tools', icon: Settings, label: '工具技能' },
  { path: '/test-data', icon: FlaskConical, label: '测试数据' },
  { path: '/users', icon: User, label: '用户管理', roles: ['admin'] },
  { path: '/backups', icon: Database, label: '备份管理', roles: ['admin'] },
  { path: '/audit-logs', icon: FileText, label: '审计日志', roles: ['admin'] },
  { path: '/database', icon: Layers, label: '数据库管理', roles: ['admin'] },
];

const themeConfig = {
  dark: {
    name: '深空灰',
    bg: 'bg-gray-900',
    card: 'bg-gray-800/80 backdrop-blur-xl',
    border: 'border-gray-700',
    text: 'text-white',
    textSecondary: 'text-gray-300',
    accent: 'bg-blue-600',
    accentText: 'text-white',
  },
  cyberpunk: {
    name: '赛博朋克',
    bg: 'bg-[#0a0a0f]',
    card: 'bg-[#161b22]/80 backdrop-blur-xl',
    border: 'border-white/10',
    text: 'text-white',
    textSecondary: 'text-gray-400',
    accent: 'bg-gradient-to-r from-cyan-500 to-fuchsia-500',
    accentText: 'text-white',
  },
  linear: {
    name: 'Linear',
    bg: 'bg-[#0d0d0f]',
    card: 'bg-[#141416]/80 backdrop-blur-xl',
    border: 'border-[#2c2c30]',
    text: 'text-white',
    textSecondary: 'text-gray-300',
    accent: 'bg-[#5e6ad2]',
    accentText: 'text-white',
  },
  anime: {
    name: '动漫风格',
    bg: 'bg-gradient-to-br from-pink-100 via-purple-100 to-cyan-100',
    card: 'bg-white/75 backdrop-blur-xl',
    border: 'border-pink-200/50',
    text: 'text-pink-900',
    textSecondary: 'text-purple-700',
    accent: 'bg-gradient-to-r from-pink-400 via-purple-500 to-cyan-500',
    accentText: 'text-white',
  },
  cosmos: {
    name: '宇宙探索',
    bg: 'bg-gradient-to-br from-[#0a0118] via-[#0d0d2e] to-[#0a1628]',
    card: 'bg-[#0d1b2a]/75 backdrop-blur-2xl',
    border: 'border-cyan-500/30',
    text: 'text-white',
    textSecondary: 'text-cyan-100/80',
    accent: 'bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-600',
    accentText: 'text-white',
  },
  classical: {
    name: '水墨古风',
    bg: 'bg-gradient-to-br from-stone-100 via-amber-50 to-emerald-50',
    card: 'bg-white/75 backdrop-blur-xl',
    border: 'border-amber-200/60',
    text: 'text-stone-800',
    textSecondary: 'text-stone-600',
    accent: 'bg-gradient-to-r from-amber-600 via-orange-500 to-red-500',
    accentText: 'text-white',
  },
  minimal: {
    name: '极简白',
    bg: 'bg-gray-50',
    card: 'bg-white/80 backdrop-blur-md',
    border: 'border-gray-200',
    text: 'text-gray-900',
    textSecondary: 'text-gray-600',
    accent: 'bg-blue-600',
    accentText: 'text-white',
  },
};

function ThemeSelector({ onClose }: { onClose: () => void }) {
  const { theme, setTheme } = useTheme();
  const themes = ['dark', 'cyberpunk', 'linear', 'anime', 'cosmos', 'classical', 'minimal'] as const;

  const getThemeColor = (t: string) => {
    switch (t) {
      case 'dark': return 'from-gray-900 to-gray-800';
      case 'cyberpunk': return 'from-cyan-900 to-fuchsia-900';
      case 'linear': return 'from-[#1a1a2e] to-[#0d0d0f]';
      case 'anime': return 'from-pink-200 via-purple-200 to-cyan-200';
      case 'cosmos': return 'from-[#0a0118] via-[#0d0d2e] to-[#0a1628]';
      case 'classical': return 'from-amber-100 via-stone-100 to-emerald-100';
      default: return 'from-gray-900 to-gray-800';
    }
  };

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#161b22] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
      <div className="px-4 py-3 border-b border-white/10">
        <span className="text-sm text-gray-400">选择主题风格</span>
      </div>
      {themes.map((t) => (
        <button
          key={t}
          onClick={() => {
            setTheme(t);
            onClose();
          }}
          className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${
            theme === t ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5'
          }`}
        >
          <span>{themeConfig[t].name}</span>
          {theme === t && <div className={`w-2 h-2 rounded-full ${getThemeColor(t)}`} />}
        </button>
      ))}
    </div>
  );
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout, isAuthenticated, projects, tasks, borrowRecords, clearAllData } = useApp();
  const { theme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showVersion, setShowVersion] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const t = themeConfig[theme] || themeConfig.dark;
  const isDark = theme === 'dark' || theme === 'cyberpunk' || theme === 'linear';
  const isCyberpunk = theme === 'cyberpunk';
  const isAnime = theme === 'anime';

  const stats = {
    projects: (projects || []).length,
    modules: (projects || []).reduce((sum, p) => sum + ((p.modules && Array.isArray(p.modules)) ? p.modules.length : 0), 0),
    components: (projects || []).reduce((sum, p) => sum + ((p.modules && Array.isArray(p.modules)) ? p.modules.reduce((s, m) => s + ((m.components && Array.isArray(m.components)) ? m.components.length : 0), 0) : 0), 0),
    tasks: (tasks || []).length,
    borrowRecords: (borrowRecords || []).length,
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (matchesShortcut(e, 'toggleSidebar')) {
        setSidebarOpen((prev) => !prev);
      }
      if (matchesShortcut(e, 'showHelp')) {
        setShowShortcuts(true);
      }
      if (e.key === 'Escape') {
        setShowShortcuts(false);
        setShowVersion(false);
        setUserMenuOpen(false);
        setThemeMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  const filteredMenuItems = menuItems.filter(
    (item) => !item.roles || (currentUser && item.roles.includes(currentUser.role))
  );

  const getMenuItemColor = (index: number) => {
    if (isCyberpunk) {
      const colors = [
        'text-cyan-400', 'text-fuchsia-400', 'text-emerald-400', 'text-amber-400',
        'text-rose-400', 'text-indigo-400', 'text-sky-400', 'text-pink-400'
      ];
      return colors[index % colors.length];
    }
    if (isAnime) {
      const colors = [
        'text-pink-600', 'text-purple-600', 'text-cyan-600', 'text-rose-500',
        'text-fuchsia-500', 'text-sky-500', 'text-amber-500', 'text-red-500'
      ];
      return colors[index % colors.length];
    }
    if (theme === 'linear') {
      const colors = [
        'text-[#5e6ad2]', 'text-[#6b7280]', 'text-[#22c55e]', 'text-[#f59e0b]',
        'text-[#ef4444]', 'text-[#3b82f6]', 'text-[#a855f7]', 'text-[#14b8a6]'
      ];
      return colors[index % colors.length];
    }
    return '';
  };

  const getActiveBg = () => {
    if (isCyberpunk) return 'bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/20 border-l-2 border-cyan-400';
    if (isAnime) return 'bg-gradient-to-r from-pink-200/50 to-purple-200/50 border-l-2 border-pink-400';
    if (theme === 'linear') return 'bg-[#5e6ad2]/20 border-l-2 border-[#5e6ad2]';
    return 'bg-blue-500/10 border-l-2 border-blue-500';
  };

  const getActiveIconBg = () => {
    if (isCyberpunk) return 'bg-gradient-to-br from-cyan-500/30 to-fuchsia-500/30';
    if (isAnime) return 'bg-gradient-to-br from-pink-300/40 to-purple-300/40';
    if (theme === 'linear') return 'bg-[#5e6ad2]/30';
    return 'bg-blue-500/20';
  };

  const getHoverBg = () => {
    if (isCyberpunk) return 'hover:bg-cyan-500/10 hover:border-l-2 hover:border-cyan-400/50';
    if (isAnime) return 'hover:bg-pink-100 hover:border-l-2 hover:border-pink-400/50';
    if (theme === 'linear') return 'hover:bg-[#5e6ad2]/10 hover:border-l-2 hover:border-[#5e6ad2]/50';
    if (isDark) return 'hover:bg-white/10 hover:border-l-2 hover:border-white/20';
    return 'hover:bg-gray-200 hover:border-l-2 hover:border-gray-400';
  };

  const getHoverIconBg = () => {
    if (isCyberpunk) return 'group-hover:bg-cyan-500/20';
    if (isAnime) return 'group-hover:bg-pink-200/50';
    if (theme === 'linear') return 'group-hover:bg-[#5e6ad2]/20';
    if (isDark) return 'group-hover:bg-white/10';
    return 'group-hover:bg-gray-200';
  };

  return (
    <div className={`flex h-screen ${t.bg} transition-colors duration-300`}>
      <SkipLink targetId="main-content">跳转到主内容</SkipLink>
      <aside
        className={`${sidebarOpen ? 'w-64' : 'w-20'} ${t.card} border-r ${t.border} transition-all duration-300 flex flex-col relative overflow-hidden ${
          isCyberpunk ? 'bg-[#0d1117]' : isAnime ? 'bg-white/60' : ''
        }`}
      >
        {(isCyberpunk || isAnime) && (
          <>
            <div className={`absolute inset-0 pointer-events-none ${
              isCyberpunk 
                ? 'bg-gradient-to-b from-cyan-500/5 via-transparent to-fuchsia-500/5' 
                : 'bg-gradient-to-b from-pink-300/20 via-transparent to-cyan-300/20'
            }`} />
            <div className={`absolute top-0 left-0 right-0 h-px ${
              isCyberpunk 
                ? 'bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent'
                : 'bg-gradient-to-r from-transparent via-pink-400/50 to-transparent'
            }`} />
          </>
        )}
        
        <div className={`relative z-10 h-16 flex items-center justify-between px-4 border-b ${t.border}`}>
          {sidebarOpen && (
            <div className={`flex items-center gap-3`}>
              {isCyberpunk ? (
                <div className="relative">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-fuchsia-500 flex items-center justify-center">
                    <Circle className="text-white" size={18} />
                  </div>
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-cyan-400 to-fuchsia-400 blur-md opacity-50" />
                </div>
              ) : isAnime ? (
                <div className="relative">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-pink-400 via-purple-500 to-cyan-500 flex items-center justify-center">
                    <Circle className="text-white" size={18} />
                  </div>
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-pink-400 to-cyan-500 blur-md opacity-50" />
                </div>
              ) : (
                <div className={`w-9 h-9 rounded-lg ${t.accent} flex items-center justify-center`}>
                  <Circle className={t.accentText} size={18} />
                </div>
              )}
              <span className={`font-bold text-lg ${t.text} tracking-wide`}>
                {isCyberpunk || isAnime ? 'LIFECYCLE' : '生命周期'}
              </span>
            </div>
          )}
          {!sidebarOpen && (
            <div className={isCyberpunk || isAnime ? 'relative mx-auto' : ''}>
              <div className={`w-9 h-9 rounded-lg ${
                isCyberpunk
                  ? 'bg-gradient-to-br from-cyan-500 to-fuchsia-500'
                  : isAnime
                    ? 'bg-gradient-to-br from-pink-400 via-purple-500 to-cyan-500'
                    : t.accent
              } flex items-center justify-center`}>
                <Circle className="text-white" size={18} />
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors`}
            aria-label={sidebarOpen ? '折叠侧边栏' : '展开侧边栏'}
            title={sidebarOpen ? '折叠侧边栏 (Ctrl+B)' : '展开侧边栏 (Ctrl+B)'}
          >
            <Menu size={20} className={t.textSecondary} />
          </button>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto relative z-10 sidebar-scrollbar">
          {filteredMenuItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            const menuColor = (isCyberpunk || isAnime || theme === 'linear') ? getMenuItemColor(index) : '';

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`group relative flex items-center mx-3 mb-1 px-4 py-3 rounded-xl transition-all duration-300 ${
                  isActive
                    ? `${getActiveBg()} ${t.text}`
                    : getHoverBg()
                }`}
              >
                <div className={`p-1.5 rounded-lg ${
                  isActive
                    ? getActiveIconBg()
                    : getHoverIconBg()
                } transition-colors`}>
                  <Icon size={18} className={
                    isActive
                      ? (isCyberpunk || isAnime || theme === 'linear') ? menuColor : t.text
                      : isDark ? 'text-gray-400 group-hover:text-white' : isAnime ? 'text-pink-600 group-hover:text-pink-800' : 'text-gray-500 group-hover:text-gray-700'
                  } />
                </div>
                {sidebarOpen && (
                  <span className={`ml-3 text-sm font-medium ${
                    isActive ? t.text : isDark ? 'text-gray-300 group-hover:text-white' : isAnime ? 'text-pink-700 group-hover:text-pink-900' : 'text-gray-600 group-hover:text-gray-900'
                  }`}>
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* 玩耍的小猫容器 */}
        <div className="relative flex-1 min-h-[200px]">
          <SidebarCat />
        </div>



        <div className="relative z-10 border-t border-gray-100 dark:border-white/5 p-3">
          {sidebarOpen && currentUser && (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className={`w-full flex items-center gap-3 p-2.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  isCyberpunk
                    ? 'bg-gradient-to-br from-cyan-500 to-purple-500 shadow-lg shadow-cyan-500/20'
                    : isAnime
                      ? 'bg-gradient-to-br from-pink-400 via-purple-500 to-cyan-500 shadow-lg shadow-pink-500/20'
                      : isDark
                        ? 'bg-gray-700'
                        : 'bg-gray-200'
                }`}>
                  <User size={18} className={
                    isCyberpunk
                      ? 'text-white'
                      : isAnime
                        ? 'text-white'
                        : isDark
                          ? 'text-white'
                          : 'text-gray-600'
                  } />
                </div>
                <div className="flex-1 text-left">
                  <p className={`text-sm font-medium ${t.text}`}>{currentUser.name}</p>
                  <p className={`text-xs ${t.textSecondary} capitalize`}>{currentUser.role}</p>
                </div>
                <ChevronDown size={14} className={t.textSecondary} />
              </button>
              
              {userMenuOpen && (
                <div className={`absolute bottom-full left-0 right-0 mb-2 ${t.card} border ${t.border} rounded-xl overflow-hidden shadow-xl backdrop-blur-xl`}>
                  <button
                    title="切换主题"
                    onClick={() => {
                      setUserMenuOpen(false);
                      setThemeMenuOpen(true);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm ${t.text} hover:bg-gray-50 dark:hover:bg-white/5 transition-colors`}
                  >
                    <Palette size={16} className={isCyberpunk ? 'text-cyan-400' : isAnime ? 'text-pink-500' : 'text-gray-500'} />
                    <span>切换主题</span>
                    <span className={`ml-auto text-xs ${t.textSecondary}`}>{(themeConfig[theme] || themeConfig.dark).name}</span>
                  </button>
                  <button
                    title="键盘快捷键"
                    onClick={() => {
                      setUserMenuOpen(false);
                      setShowShortcuts(true);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm ${t.text} hover:bg-gray-50 dark:hover:bg-white/5 transition-colors`}
                  >
                    <Keyboard size={16} className={isCyberpunk ? 'text-cyan-400' : isAnime ? 'text-purple-500' : 'text-gray-500'} />
                    <span>快捷键</span>
                  </button>
                  <button
                    title="版本信息"
                    onClick={() => {
                      setUserMenuOpen(false);
                      setShowVersion(true);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm ${t.text} hover:bg-gray-50 dark:hover:bg-white/5 transition-colors`}
                  >
                    <HelpCircle size={16} className={isCyberpunk ? 'text-fuchsia-400' : isAnime ? 'text-cyan-500' : 'text-gray-500'} />
                    <span>版本信息</span>
                  </button>
                  <div className={`border-t ${t.border}`} />
                  <button
                    onClick={() => {
                      logout();
                      navigate('/login');
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm ${t.text} hover:bg-red-50 dark:hover:bg-red-500/20 transition-colors`}
                  >
                    <LogOut size={16} className="text-red-500" />
                    <span className="text-red-500">退出登录</span>
                  </button>
                </div>
              )}

              {themeMenuOpen && (
                <ThemeSelector onClose={() => setThemeMenuOpen(false)} />
              )}
            </div>
          )}
          {!sidebarOpen && currentUser && (
            <div className="relative group">
              <div className="flex justify-center">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  isCyberpunk
                    ? 'bg-gradient-to-br from-cyan-500 to-purple-500'
                    : isAnime
                      ? 'bg-gradient-to-br from-pink-400 via-purple-500 to-cyan-500'
                      : isDark
                        ? 'bg-gray-700'
                        : 'bg-gray-200'
                }`}>
                  <User size={18} className={
                    isCyberpunk
                      ? 'text-white'
                      : isAnime
                        ? 'text-white'
                        : isDark
                          ? 'text-white'
                          : 'text-gray-600'
                  } />
                </div>
              </div>
              <div className={`absolute left-full ml-3 top-0 ${t.card} border ${t.border} px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl`}>
                <p className={`text-sm ${t.text}`}>{currentUser.name}</p>
                <p className={`text-xs ${t.textSecondary} capitalize`}>{currentUser.role}</p>
              </div>
            </div>
          )}
        </div>
      </aside>

      <main id="main-content" aria-label="主内容区域" className="flex-1 overflow-auto relative content-scrollbar" tabIndex={-1}>
        {(isCyberpunk || isAnime) && (
          <div className={`absolute inset-0 pointer-events-none ${
            isCyberpunk 
              ? 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-500/5 via-transparent to-transparent'
              : 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-pink-300/10 via-transparent to-cyan-300/10'
          }`} />
        )}
        <header className={`h-16 ${t.card}/80 backdrop-blur-2xl border-b ${t.border} flex items-center justify-between px-6 relative`}>
          <div className="flex items-center gap-3">
            <h1 className={`text-lg font-semibold ${t.text} tracking-wide`}>
              {menuItems.find((item) => location.pathname.startsWith(item.path))?.label || '项目全生命周期管理系统'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <SystemResources />
          </div>
        </header>
        <div className="p-6 relative">{children}</div>
      </main>

      {showShortcuts && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowShortcuts(false)}>
          <div className={`${t.card} border ${t.border} rounded-2xl p-6 w-96 shadow-xl backdrop-blur-2xl`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-5">
              <div className={`p-2 ${isCyberpunk ? 'bg-cyan-500/10' : 'bg-gray-100'} rounded-xl`}>
                <Keyboard className={isCyberpunk ? 'text-cyan-400' : 'text-gray-600'} size={20} />
              </div>
              <h2 className={`text-lg font-semibold ${t.text}`}>快捷键</h2>
            </div>
            <div className="space-y-1">
              {[
                { key: 'Ctrl + K', desc: '全局搜索' },
                { key: 'Ctrl + B', desc: '切换侧边栏' },
                { key: 'Ctrl + Z', desc: '撤销操作' },
                { key: 'Ctrl + S', desc: '保存' },
                { key: 'Esc', desc: '关闭弹窗' },
              ].map((item) => (
                <div key={item.key} className={`flex justify-between items-center py-3 border-b ${t.border}`}>
                  <span className={`text-sm ${t.textSecondary}`}>{item.desc}</span>
                  <kbd className={`px-3 py-1.5 ${
                    isCyberpunk 
                      ? 'bg-white/5 text-cyan-400 border border-white/10' 
                      : isDark 
                        ? 'bg-gray-700 text-gray-300' 
                        : 'bg-gray-100 text-gray-600'
                  } rounded-lg text-xs font-mono`}>{item.key}</kbd>
                </div>
              ))}
            </div>
            <button onClick={() => setShowShortcuts(false)} className={`mt-5 w-full py-2.5 ${
              isCyberpunk 
                ? 'bg-gradient-to-r from-cyan-500 to-fuchsia-500' 
                : t.accent
            } text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity`}>
              关闭
            </button>
          </div>
        </div>
      )}

      {showVersion && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowVersion(false)}>
          <div className={`${t.card} border ${t.border} rounded-2xl p-6 w-[480px] max-h-[80vh] overflow-hidden flex flex-col shadow-xl backdrop-blur-2xl`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-5">
              <div className={`p-2 ${isCyberpunk ? 'bg-fuchsia-500/10' : 'bg-gray-100'} rounded-xl`}>
                <HelpCircle className={isCyberpunk ? 'text-fuchsia-400' : 'text-gray-600'} size={20} />
              </div>
              <h2 className={`text-lg font-semibold ${t.text}`}>版本信息</h2>
            </div>
            <div className="space-y-3 text-sm mb-4">
              <div className={`flex justify-between py-2.5 border-b ${t.border}`}>
                <span className={t.textSecondary}>当前版本</span>
                <span className={isCyberpunk ? 'text-cyan-400 font-mono font-bold' : `${t.text} font-mono font-bold`}>{getVersion()}</span>
              </div>
              <div className={`flex justify-between py-2.5 border-b ${t.border}`}>
                <span className={t.textSecondary}>构建日期</span>
                <span className={t.text}>{getBuildDate()}</span>
              </div>
              <div className={`flex justify-between py-2.5 border-b ${t.border}`}>
                <span className={t.textSecondary}>系统名称</span>
                <span className={t.text}>项目全生命周期管理系统</span>
              </div>
            </div>
            <div className={`flex items-center gap-2 mb-3`}>
              <div className={`flex-1 h-px ${t.border}`} />
              <span className={`text-xs ${t.textSecondary}`}>版本历史</span>
              <div className={`flex-1 h-px ${t.border}`} />
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {getVersionHistory().map((item, index) => (
                <div key={item.version} className={`p-3 rounded-lg ${index === 0 ? (isCyberpunk ? 'bg-fuchsia-500/10 border border-fuchsia-500/20' : 'bg-blue-50 border border-blue-200') : t.card} border ${t.border}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-mono font-medium ${index === 0 ? (isCyberpunk ? 'text-fuchsia-400' : 'text-blue-600') : t.text}`}>
                      {item.version}
                    </span>
                    <span className={`text-xs ${t.textSecondary}`}>{item.date}</span>
                  </div>
                  <p className={`text-xs ${t.textSecondary}`}>{item.changes}</p>
                </div>
              ))}
            </div>
            <button onClick={() => setShowVersion(false)} className={`mt-4 w-full py-2.5 ${
              isCyberpunk
                ? 'bg-gradient-to-r from-fuchsia-500 to-cyan-500'
                : t.accent
            } text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity`}>
              关闭
            </button>
          </div>
        </div>
      )}

      {/* 清除数据确认对话框 */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowClearConfirm(false)}>
          <div className={`${t.card} border ${t.border} rounded-2xl p-6 w-96 shadow-xl backdrop-blur-2xl`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-500/10 rounded-xl">
                <Trash2 className="text-red-500" size={20} />
              </div>
              <h2 className={`text-lg font-semibold ${t.text}`}>确认清除数据</h2>
            </div>
            <p className={`text-sm ${t.textSecondary} mb-6`}>
              确定要清除全部数据吗？此操作将删除所有项目、模块、组件、任务和借用记录，且无法恢复。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)} 
                className={`flex-1 py-2.5 ${
                  isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                } ${t.text} rounded-xl text-sm font-medium transition-colors`}>
                取消
              </button>
              <button
                onClick={() => {
                  clearAllData();
                  setShowClearConfirm(false);
                }}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition-colors"
              >
                确认清除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
