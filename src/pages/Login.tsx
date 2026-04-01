import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, AlertCircle, UserPlus, X, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/Toast';
import { useThemeStyles, useIsCyberpunk } from '../hooks/useThemeStyles';
import { generateId, hashPassword, validatePasswordStrength, sanitizeInput } from '../utils/auth';
import type { UserRole } from '../types/auth';

const USERS_KEY = 'users';

interface RegisterUser {
  id: string;
  username: string;
  password: string;
  name?: string;
  email?: string;
  role: UserRole;
  createdAt?: string;
}

function getStoredUsers(): RegisterUser[] {
  try {
    const stored = localStorage.getItem(USERS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveUser(user: RegisterUser): boolean {
  const users = getStoredUsers();
  if (users.some(u => u.username === user.username)) {
    return false;
  }
  users.push(user);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  return true;
}

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    role: 'viewer' as UserRole,
  });
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();
  const { login } = useApp();
  const { showToast } = useToast();
  const t = useThemeStyles();
  const isCyberpunk = useIsCyberpunk();

  useEffect(() => {
    if (lockoutUntil && Date.now() < lockoutUntil) {
      const timeout = lockoutUntil - Date.now();
      const timer = setTimeout(() => {
        setLockoutUntil(null);
        setLoginAttempts(0);
      }, timeout);
      return () => clearTimeout(timer);
    }
  }, [lockoutUntil]);

  const validateUsername = useCallback((value: string): boolean => {
    const sanitized = sanitizeInput(value);
    if (!sanitized) {
      setUsernameError('用户名不能为空');
      return false;
    }
    if (sanitized.length < 2) {
      setUsernameError('用户名至少2个字符');
      return false;
    }
    if (sanitized.length > 20) {
      setUsernameError('用户名最多20个字符');
      return false;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(sanitized)) {
      setUsernameError('用户名只能包含字母、数字和下划线');
      return false;
    }
    setUsernameError('');
    return true;
  }, []);

  const validatePassword = useCallback((value: string): boolean => {
    if (!value) {
      setPasswordError('密码不能为空');
      return false;
    }
    if (value.length < 6) {
      setPasswordError('密码至少6个字符');
      return false;
    }
    setPasswordError('');
    return true;
  }, []);

  const handleUsernameChange = useCallback((value: string) => {
    setUsername(value);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      validateUsername(value);
    }, 300);
  }, [validateUsername]);

  const handlePasswordChange = useCallback((value: string) => {
    setPassword(value);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      validatePassword(value);
    }, 300);
  }, [validatePassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (lockoutUntil && Date.now() < lockoutUntil) {
      const remainingSeconds = Math.ceil((lockoutUntil - Date.now()) / 1000);
      setError(`登录失败次数过多，请 ${remainingSeconds} 秒后重试`);
      return;
    }

    const sanitizedUsername = sanitizeInput(username);
    const isUsernameValid = validateUsername(sanitizedUsername);
    const isPasswordValid = validatePassword(password);

    if (!isUsernameValid || !isPasswordValid) {
      setError('请检查输入格式');
      return;
    }

    setLoading(true);

    const success = login(sanitizedUsername, password);
    if (success) {
      showToast('登录成功', 'success');
      setLoginAttempts(0);
      navigate('/projects');
    } else {
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);
      if (newAttempts >= 5) {
        const lockoutDuration = Math.min(30 * Math.pow(2, newAttempts - 5), 300) * 1000;
        setLockoutUntil(Date.now() + lockoutDuration);
        setError(`登录失败次数过多，请 ${Math.ceil(lockoutDuration / 1000)} 秒后重试`);
      } else {
        setError(`用户名或密码错误，剩余尝试次数：${5 - newAttempts}`);
      }
      showToast('登录失败', 'error');
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');

    const sanitizedUsername = sanitizeInput(registerForm.username);

    if (!sanitizedUsername.trim()) {
      setRegisterError('用户名不能为空');
      return;
    }

    if (sanitizedUsername.length < 2 || sanitizedUsername.length > 20) {
      setRegisterError('用户名长度需在2-20个字符之间');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(sanitizedUsername)) {
      setRegisterError('用户名只能包含字母、数字和下划线');
      return;
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      setRegisterError('两次输入的密码不一致');
      return;
    }

    const passwordValidation = validatePasswordStrength(registerForm.password);
    if (!passwordValidation.isValid) {
      setRegisterError(passwordValidation.errors[0]);
      return;
    }

    setRegisterLoading(true);

    const newUser: RegisterUser = {
      id: generateId(),
      username: sanitizedUsername,
      password: hashPassword(registerForm.password),
      role: registerForm.role,
    };

    setTimeout(() => {
      if (saveUser(newUser)) {
        showToast('注册成功，请登录', 'success');
        setShowRegisterModal(false);
        setRegisterForm({ username: '', password: '', confirmPassword: '', role: 'viewer' });
        setUsername(sanitizedUsername);
      } else {
        setRegisterError('用户名已存在');
      }
      setRegisterLoading(false);
    }, 300);
  };

  return (
    <div className={`min-h-screen flex items-center justify-center ${
      isCyberpunk
        ? 'bg-gradient-to-br from-cyan-900 via-purple-900 to-fuchsia-900'
        : 'bg-gradient-to-br from-primary-600 to-primary-800'
    }`}>
      <div className={`${t.card} rounded-2xl shadow-2xl w-full max-w-md p-8 border ${t.border}`}>
        <div className="flex flex-col items-center mb-8">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
            isCyberpunk ? 'bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20' : 'bg-primary-100'
          }`}>
            <Shield className={isCyberpunk ? 'text-cyan-400' : 'text-primary-600'} size={32} />
          </div>
          <h1 className={`text-2xl font-bold ${t.text}`}>项目全生命周期管理系统</h1>
          <p className={`${t.textMuted} mt-2`}>请登录您的账户</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className={`flex items-center gap-2 p-3 ${t.error} border ${t.border} rounded-lg`}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem('users');
                localStorage.removeItem('auth_token');
                showToast('登录数据已重置，请使用 admin / admin123 登录', 'success');
                setError('');
              }}
              className={`text-xs ${t.textMuted} hover:${t.text} underline`}
            >
              登录数据损坏？点击重置
            </button>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${t.textSecondary}`}>用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => handleUsernameChange(e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none transition ${
                isCyberpunk
                  ? 'bg-white/5 border-white/10 text-white placeholder-gray-500 focus:border-cyan-500'
                  : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
              } ${usernameError ? 'border-red-500' : ''}`}
              placeholder="请输入用户名"
              required
              autoComplete="username"
            />
            {usernameError && (
              <p className="text-xs text-red-500 mt-1">{usernameError}</p>
            )}
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${t.textSecondary}`}>密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none transition ${
                isCyberpunk
                  ? 'bg-white/5 border-white/10 text-white placeholder-gray-500 focus:border-cyan-500'
                  : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
              } ${passwordError ? 'border-red-500' : ''}`}
              placeholder="请输入密码"
              required
              autoComplete="current-password"
            />
            {passwordError && (
              <p className="text-xs text-red-500 mt-1">{passwordError}</p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 py-3 rounded-lg font-medium transition disabled:opacity-50 ${
                isCyberpunk
                  ? 'bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white hover:opacity-90'
                  : 'bg-primary-600 text-white hover:bg-primary-700'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={18} className="animate-spin" />
                  登录中...
                </span>
              ) : '登录'}
            </button>
            <button
              type="button"
              onClick={() => setShowRegisterModal(true)}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition border ${
                isCyberpunk
                  ? 'border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10'
                  : 'border-primary-300 text-primary-600 hover:bg-primary-50'
              }`}
            >
              <UserPlus size={18} />
              注册
            </button>
          </div>
        </form>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition" onClick={() => { setUsername('admin'); setPassword('admin123'); setTimeout(() => { if (login('admin', 'admin123')) { showToast('登录成功', 'success'); navigate('/projects'); } else { setError('用户名或密码错误'); showToast('登录失败', 'error'); } }, 100); }}>
          <p className="text-sm text-gray-600 text-center">
            演示账户：admin / admin123
          </p>
          <p className="text-xs text-gray-400 text-center mt-1">点击直接登录</p>
        </div>
      </div>

      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowRegisterModal(false)}>
          <div className={`${t.modalBg} rounded-xl p-6 w-full max-w-md border ${t.modalBorder} shadow-2xl`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl font-bold ${t.text} flex items-center gap-2`}>
                <UserPlus size={24} className={isCyberpunk ? 'text-cyan-400' : 'text-primary-600'} />
                注册新用户
              </h2>
              <button
                type="button"
                onClick={() => setShowRegisterModal(false)}
                className={`p-1 rounded-lg hover:${t.hoverBg} ${t.textSecondary}`}
                aria-label="关闭"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              {registerError && (
                <div className={`flex items-center gap-2 p-3 ${t.error} border ${t.border} rounded-lg text-sm`}>
                  <AlertCircle size={16} />
                  <span>{registerError}</span>
                </div>
              )}

              <div>
                <label className={`block text-sm font-medium mb-1.5 ${t.textSecondary}`}>用户名</label>
                <input
                  type="text"
                  value={registerForm.username}
                  onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:outline-none transition ${
                    isCyberpunk
                      ? 'bg-white/5 border-white/10 text-white focus:border-cyan-500'
                      : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                  }`}
                  placeholder="请输入用户名"
                  required
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1.5 ${t.textSecondary}`}>密码</label>
                <input
                  type="password"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:outline-none transition ${
                    isCyberpunk
                      ? 'bg-white/5 border-white/10 text-white focus:border-cyan-500'
                      : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                  }`}
                  placeholder="请输入密码（至少6位）"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1.5 ${t.textSecondary}`}>确认密码</label>
                <input
                  type="password"
                  value={registerForm.confirmPassword}
                  onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:outline-none transition ${
                    isCyberpunk
                      ? 'bg-white/5 border-white/10 text-white focus:border-cyan-500'
                      : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                  }`}
                  placeholder="请再次输入密码"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1.5 ${t.textSecondary}`}>用户角色</label>
                <select
                  value={registerForm.role}
                  onChange={(e) => setRegisterForm({ ...registerForm, role: e.target.value as UserRole })}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:outline-none transition ${
                    isCyberpunk
                      ? 'bg-white/5 border-white/10 text-white focus:border-cyan-500'
                      : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                  }`}
                >
                  <option value="viewer">操作员</option>
                  <option value="admin">管理员</option>
                  <option value="manager">审计员</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className={`flex-1 py-2.5 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg} transition`}
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={registerLoading}
                  className={`flex-1 py-2.5 rounded-lg font-medium transition disabled:opacity-50 ${
                    isCyberpunk
                      ? 'bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white hover:opacity-90'
                      : 'bg-primary-600 text-white hover:bg-primary-700'
                  }`}
                >
                  {registerLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      注册中...
                    </span>
                  ) : '注册'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
