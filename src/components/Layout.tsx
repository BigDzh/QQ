import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Settings,
  Database,
  FileText,
  Bell,
  LogOut,
  ChevronDown,
  Sun,
  Moon,
  Palette,
  Shield,
  Archive,
  History,
  Wrench,
  Search,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { useState } from 'react';
import { useThemeStyles } from '../hooks/useThemeStyles';

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { currentUser, logout } = useApp();
  const { theme, setTheme } = useTheme();
  const t = useThemeStyles();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  const navItems = [
    { path: '/projects', icon: FolderKanban, label: '项目管理' },
    { path: '/tasks', icon: Bell, label: '任务管理' },
    { path: '/borrow', icon: Archive, label: '借用管理' },
    { path: '/tools', icon: Wrench, label: '工具' },
  ];

  const adminItems = currentUser?.role === 'admin' || currentUser?.role === 'manager'
    ? [
        { path: '/users', icon: Users, label: '用户管理' },
        { path: '/backups', icon: Database, label: '备份管理' },
        { path: '/audit-logs', icon: History, label: '审计日志' },
        { path: '/database', icon: Shield, label: '数据库' },
      ]
    : [];

  const themeOptions = [
    { id: 'dark', label: '深色', icon: Moon },
    { id: 'cyberpunk', label: '赛博朋克', icon: Palette },
    { id: 'linear', label: '线性', icon: Sun },
    { id: 'anime', label: '动漫', icon: Sun },
  ];

  return (
    <div className={`min-h-screen ${t.bg} flex`}>
      <aside className={`w-64 ${t.bgSecondary} border-r ${t.border} flex flex-col`}>
        <div className="p-4 border-b ${t.border}">
          <h1 className={`text-xl font-bold ${t.text} flex items-center gap-2`}>
            <Database size={24} className="text-cyan-400" />
            项目管理系统
          </h1>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? `${t.button} text-white`
                    : `${t.textSecondary} hover:${t.hoverBg} hover:${t.text}`
                }`}
              >
                <Icon size={20} />
                {item.label}
              </Link>
            );
          })}

          {adminItems.length > 0 && (
            <>
              <div className={`pt-4 pb-2 ${t.textMuted} text-sm`}>系统管理</div>
              {adminItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive
                        ? `${t.button} text-white`
                        : `${t.textSecondary} hover:${t.hoverBg} hover:${t.text}`
                    }`}
                  >
                    <Icon size={20} />
                    {item.label}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        <div className="p-4 border-t ${t.border}">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full ${t.button} flex items-center justify-center text-white font-medium`}>
              {currentUser?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`font-medium ${t.text} truncate`}>{currentUser?.name}</div>
              <div className={`text-sm ${t.textMuted}`}>{currentUser?.role === 'admin' ? '管理员' : currentUser?.role === 'manager' ? '经理' : '工程师'}</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className={`h-16 ${t.bgSecondary} border-b ${t.border} flex items-center justify-between px-6`}>
          <div className="flex items-center gap-4">
            <div className={`relative`}>
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${t.textMuted}`} size={20} />
              <input
                type="text"
                placeholder="搜索项目、模块、组件..."
                className={`w-80 pl-10 pr-4 py-2 border rounded-lg ${t.input}`}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setShowThemeMenu(!showThemeMenu)}
                className={`p-2 rounded-lg ${t.hoverBg}`}
              >
                {theme === 'dark' ? <Moon size={20} className={t.text} /> : <Palette size={20} className={t.text} />}
              </button>
              {showThemeMenu && (
                <div className={`absolute right-0 mt-2 w-40 ${t.card} border ${t.border} rounded-lg shadow-lg py-1 z-50`}>
                  {themeOptions.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => {
                          setTheme(opt.id as any);
                          setShowThemeMenu(false);
                        }}
                        className={`w-full flex items-center gap-2 px-4 py-2 ${t.hoverBg}`}
                      >
                        <Icon size={16} />
                        <span className={t.text}>{opt.label}</span>
                        {theme === opt.id && <span className="text-cyan-400">✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button className={`p-2 rounded-lg ${t.hoverBg} relative`}>
              <Bell size={20} className={t.text} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className={`flex items-center gap-2 p-2 rounded-lg ${t.hoverBg}`}
              >
                <span className={t.text}>{currentUser?.name}</span>
                <ChevronDown size={16} className={t.textMuted} />
              </button>
              {showUserMenu && (
                <div className={`absolute right-0 mt-2 w-48 ${t.card} border ${t.border} rounded-lg shadow-lg py-1 z-50`}>
                  <Link
                    to="/settings"
                    className={`flex items-center gap-2 px-4 py-2 ${t.hoverBg} ${t.text}`}
                  >
                    <Settings size={16} />
                    设置
                  </Link>
                  <button
                    onClick={logout}
                    className={`w-full flex items-center gap-2 px-4 py-2 ${t.hoverBg} ${t.error}`}
                  >
                    <LogOut size={16} />
                    退出登录
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>

      {showUserMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
      )}
      {showThemeMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setShowThemeMenu(false)} />
      )}
    </div>
  );
}
