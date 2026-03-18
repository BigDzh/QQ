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
  Search,
  Keyboard,
  HelpCircle,
  Settings,
  ArrowRightLeft,
  Layers,
  ChevronDown,
  Palette,
  FlaskConical,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { getVersion, getBuildDate } from '../utils/version';
import { matchesShortcut } from '../utils/shortcuts';

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
    card: 'bg-gray-800',
    border: 'border-gray-700',
    text: 'text-white',
    textSecondary: 'text-gray-300',
    accent: 'bg-blue-600',
    accentText: 'text-white',
  },
  cyberpunk: {
    name: '赛博朋克',
    bg: 'bg-[#0a0a0f]',
    card: 'bg-[#161b22]',
    border: 'border-white/10',
    text: 'text-white',
    textSecondary: 'text-gray-400',
    accent: 'bg-gradient-to-r from-cyan-500 to-fuchsia-500',
    accentText: 'text-white',
  },
  linear: {
    name: 'Linear',
    bg: 'bg-[#0d0d0f]',
    card: 'bg-[#141416]',
    border: 'border-[#2c2c30]',
    text: 'text-[#ededef]',
    textSecondary: 'text-[#8a8a8e]',
    accent: 'bg-[#5e6ad2]',
    accentText: 'text-white',
  },
  anime: {
    name: '动漫风格',
    bg: 'bg-gradient-to-br from-pink-100 via-purple-100 to-cyan-100',
    card: 'bg-white/80 backdrop-blur-md',
    border: 'border-pink-200/50',
    text: 'text-pink-900',
    textSecondary: 'text-purple-700',
    accent: 'bg-gradient-to-r from-pink-400 via-purple-500 to-cyan-500',
    accentText: 'text-white',
  },
};

function ThemeSelector({ onClose }: { onClose: () => void }) {
  const { theme, setTheme } = useTheme();
  const themes = ['dark', 'cyberpunk', 'linear', 'anime'] as const;

  const getThemeColor = (t: string) => {
    if (t === 'cyberpunk') return 'bg-cyan-400';
    if (t === 'linear') return 'bg-[#5e6ad2]';
    if (t === 'anime') return 'bg-gradient-to-r from-pink-400 to-purple-500';
    if (t === 'dark') return 'bg-blue-400';
    return 'bg-gray-400';
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
  const { currentUser, logout, isAuthenticated } = useApp();
  const { theme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showVersion, setShowVersion] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);

  const t = themeConfig[theme];
  const isDark = theme === 'dark' || theme === 'cyberpunk' || theme === 'linear';
  const isCyberpunk = theme === 'cyberpunk';
  const isAnime = theme === 'anime';

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
        'text-pink-500', 'text-purple-500', 'text-cyan-500', 'text-rose-400',
        'text-fuchsia-500', 'text-sky-500', 'text-amber-500', 'text-red-400'
      ];
      return colors[index % colors.length];
    }
    return '';
  };

  return (
    <div className={`flex h-screen ${t.bg} transition-colors duration-300`}>
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
                    <Layers className="text-white" size={18} />
                  </div>
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-cyan-400 to-fuchsia-400 blur-md opacity-50" />
                </div>
              ) : (
                <div className={`w-9 h-9 rounded-lg ${t.accent} flex items-center justify-center`}>
                  <Layers className={t.accentText} size={18} />
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
                <Layers className="text-white" size={18} />
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors`}
          >
            <Menu size={20} className={t.textSecondary} />
          </button>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto relative z-10">
          {filteredMenuItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            const menuColor = (isCyberpunk || isAnime) ? getMenuItemColor(index) : '';
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`group relative flex items-center mx-3 mb-1 px-4 py-3 rounded-xl transition-all duration-300 ${
                  isActive 
                    ? isDark ? 'bg-white/10' : isAnime ? 'bg-pink-100/50' : 'bg-gray-100'
                    : isDark ? 'hover:bg-white/5' : isAnime ? 'hover:bg-pink-50' : 'hover:bg-gray-50'
                }`}
              >
                {(isActive) && (
                  <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full ${
                    isCyberpunk 
                      ? 'bg-gradient-to-b from-cyan-400 to-fuchsia-400' 
                      : isAnime
                        ? 'bg-gradient-to-b from-pink-400 to-cyan-400'
                        : ''
                  }`} />
                )}
                <div className={`p-1.5 rounded-lg ${
                  isActive 
                    ? isCyberpunk 
                      ? 'bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20'
                      : isAnime
                        ? 'bg-gradient-to-br from-pink-200/50 to-purple-200/50'
                        : isDark ? 'bg-gray-700' : 'bg-gray-200'
                    : isDark ? 'bg-white/5 group-hover:bg-white/10' : isAnime ? 'bg-pink-50 group-hover:bg-pink-100' : 'bg-gray-100 group-hover:bg-gray-200'
                } transition-colors`}>
                  <Icon size={18} className={
                    isActive 
                      ? (isCyberpunk || isAnime) ? menuColor : t.text
                      : isDark ? 'text-gray-400 group-hover:text-white' : isAnime ? 'text-pink-600 group-hover:text-pink-800' : 'text-gray-500 group-hover:text-gray-700'
                  } />
                </div>
                {sidebarOpen && (
                  <span className={`ml-3 text-sm font-medium ${
                    isActive ? t.text : isDark ? 'text-gray-400 group-hover:text-white' : isAnime ? 'text-pink-700 group-hover:text-pink-900' : 'text-gray-600 group-hover:text-gray-900'
                  }`}>
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="relative z-10 border-t border-gray-100 dark:border-white/5 p-3">
          {sidebarOpen && currentUser && (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className={`w-full flex items-center gap-3 p-2.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors`}
              >
                <div className={`w-9 h-9 rounded-lg ${
                  isCyberpunk 
                    ? 'bg-gradient-to-br from-cyan-500 to-purple-500 shadow-lg shadow-cyan-500/20' 
                    : isDark 
                      ? 'bg-gray-700' 
                      : 'bg-gray-200'
                } flex items-center justify-center text-white font-semibold text-sm`}>
                  {currentUser.name.charAt(0)}
                </div>
                <div className="flex-1 text-left">
                  <p className={`text-sm font-medium ${t.text}`}>{currentUser.name}</p>
                  <p className={`text-xs ${t.textSecondary} capitalize`}>{currentUser.role}</p>
                </div>
                <ChevronDown size={14} className={t.textSecondary} />
              </button>
              
              {userMenuOpen && (
                <div className={`absolute bottom-full left-0 right-0 mb-2 ${t.card} border ${t.border} rounded-xl overflow-hidden shadow-xl`}>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      setThemeMenuOpen(true);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${
                      isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    <Palette size={16} className={isCyberpunk ? 'text-cyan-400' : 'text-gray-500'} />
                    <span>切换主题</span>
                    <span className={`ml-auto text-xs ${t.textSecondary}`}>{themeConfig[theme].name}</span>
                  </button>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      setShowShortcuts(true);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${
                      isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    <Keyboard size={16} className={isCyberpunk ? 'text-cyan-400' : 'text-gray-500'} />
                    <span>快捷键</span>
                  </button>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      setShowVersion(true);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${
                      isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    <HelpCircle size={16} className={isCyberpunk ? 'text-fuchsia-400' : 'text-gray-500'} />
                    <span>版本信息</span>
                  </button>
                  <div className={`border-t ${t.border}`} />
                  <button
                    onClick={() => {
                      logout();
                      navigate('/login');
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut size={16} />
                    <span>退出登录</span>
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
                <div className={`w-9 h-9 rounded-lg ${
                  isCyberpunk 
                    ? 'bg-gradient-to-br from-cyan-500 to-purple-500' 
                    : isDark 
                      ? 'bg-gray-700' 
                      : 'bg-gray-200'
                } flex items-center justify-center text-white font-semibold text-sm cursor-pointer`}>
                  {currentUser.name.charAt(0)}
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

      <main className="flex-1 overflow-auto relative">
        {(isCyberpunk || isAnime) && (
          <div className={`absolute inset-0 pointer-events-none ${
            isCyberpunk 
              ? 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-500/5 via-transparent to-transparent'
              : 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-pink-300/10 via-transparent to-cyan-300/10'
          }`} />
        )}
        <header className={`h-16 ${t.card}/80 backdrop-blur-xl border-b ${t.border} flex items-center justify-between px-6 relative`}>
          <div className="flex items-center gap-3">
            <h1 className={`text-lg font-semibold ${t.text} tracking-wide`}>
              {menuItems.find((item) => location.pathname.startsWith(item.path))?.label || '项目全生命周期管理系统'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative group">
              <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isCyberpunk ? 'text-gray-500 group-focus-within:text-cyan-400' : 'text-gray-400'}`} />
              <input
                type="text"
                placeholder="搜索..."
                className={`pl-10 pr-4 py-2 w-64 ${
                  isCyberpunk 
                    ? 'bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-cyan-500/50 focus:bg-white/10' 
                    : isDark 
                      ? 'bg-white/5 border border-white/10 rounded-xl text-white focus:border-gray-500'
                      : 'bg-white border border-gray-200 rounded-lg text-gray-900 focus:border-gray-400'
                } text-sm focus:outline-none transition-all`}
              />
            </div>
          </div>
        </header>
        <div className="p-6 relative">{children}</div>
      </main>

      {showShortcuts && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowShortcuts(false)}>
          <div className={`${t.card} border ${t.border} rounded-2xl p-6 w-96 shadow-xl`} onClick={(e) => e.stopPropagation()}>
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowVersion(false)}>
          <div className={`${t.card} border ${t.border} rounded-2xl p-6 w-96 shadow-xl`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-5">
              <div className={`p-2 ${isCyberpunk ? 'bg-fuchsia-500/10' : 'bg-gray-100'} rounded-xl`}>
                <HelpCircle className={isCyberpunk ? 'text-fuchsia-400' : 'text-gray-600'} size={20} />
              </div>
              <h2 className={`text-lg font-semibold ${t.text}`}>版本信息</h2>
            </div>
            <div className="space-y-3 text-sm">
              <div className={`flex justify-between py-2.5 border-b ${t.border}`}>
                <span className={t.textSecondary}>当前版本</span>
                <span className={isCyberpunk ? 'text-cyan-400 font-mono' : t.text}>{getVersion()}</span>
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
            <button onClick={() => setShowVersion(false)} className={`mt-5 w-full py-2.5 ${
              isCyberpunk 
                ? 'bg-gradient-to-r from-fuchsia-500 to-cyan-500' 
                : t.accent
            } text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity`}>
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
