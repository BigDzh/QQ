import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/Toast';
import { useThemeStyles, useIsCyberpunk } from '../hooks/useThemeStyles';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useApp();
  const { showToast } = useToast();
  const t = useThemeStyles();
  const isCyberpunk = useIsCyberpunk();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      if (login(username, password)) {
        showToast('登录成功', 'success');
        navigate('/projects');
      } else {
        setError('用户名或密码错误');
        showToast('登录失败', 'error');
      }
      setLoading(false);
    }, 500);
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

          <div>
            <label className={`block text-sm font-medium mb-2 ${t.textSecondary}`}>用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none transition ${
                isCyberpunk 
                  ? 'bg-white/5 border-white/10 text-white placeholder-gray-500 focus:border-cyan-500' 
                  : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
              }`}
              placeholder="请输入用户名"
              required
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${t.textSecondary}`}>密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none transition ${
                isCyberpunk 
                  ? 'bg-white/5 border-white/10 text-white placeholder-gray-500 focus:border-cyan-500' 
                  : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
              }`}
              placeholder="请输入密码"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg font-medium transition disabled:opacity-50 ${
              isCyberpunk 
                ? 'bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white hover:opacity-90' 
                : 'bg-primary-600 text-white hover:bg-primary-700'
            }`}
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 text-center">
            演示账户：admin / admin123
          </p>
        </div>
      </div>
    </div>
  );
}
