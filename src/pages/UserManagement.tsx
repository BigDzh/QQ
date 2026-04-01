import React, { useState, useEffect } from 'react';
import { Plus, User, Trash2, Edit } from 'lucide-react';
import { useToast } from '../components/Toast';
import { useThemeStyles } from '../hooks/useThemeStyles';
import type { User as UserType, UserRole } from '../types/auth';
import { ROLE_NAMES } from '../types/auth';
import { generateId, hashPassword } from '../utils/auth';

const USERS_KEY = 'users';

export default function UserManagement() {
  const { showToast } = useToast();
  const t = useThemeStyles();
  const [users, setUsers] = useState<UserType[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    email: '',
    role: 'engineer' as UserRole,
  });

  useEffect(() => {
    const storedUsers = localStorage.getItem(USERS_KEY);
    if (storedUsers) {
      setUsers(JSON.parse(storedUsers));
    }
  }, []);

  const saveUsers = (newUsers: UserType[]) => {
    localStorage.setItem(USERS_KEY, JSON.stringify(newUsers));
    setUsers(newUsers);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingUser) {
      const updatedUsers = users.map((u) => {
        if (u.id === editingUser.id) {
          const updates: Partial<UserType> = {
            name: formData.name,
            email: formData.email,
            role: formData.role,
          };
          if (formData.password) {
            updates.password = hashPassword(formData.password);
          }
          return { ...u, ...updates };
        }
        return u;
      });
      saveUsers(updatedUsers);
      showToast('用户更新成功', 'success');
    } else {
      if (!formData.password) {
        showToast('密码为必填项', 'error');
        return;
      }
      const newUser: UserType = {
        id: generateId(),
        username: formData.username,
        password: hashPassword(formData.password),
        name: formData.name,
        email: formData.email,
        role: formData.role,
        createdAt: new Date().toISOString(),
      };
      saveUsers([...users, newUser]);
      showToast('用户创建成功', 'success');
    }
    
    setShowModal(false);
    setEditingUser(null);
    setFormData({ username: '', password: '', name: '', email: '', role: 'engineer' });
  };

  const handleEdit = (user: UserType) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      name: user.name,
      email: user.email,
      role: user.role,
    });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个用户吗？')) {
      const updatedUsers = users.filter((u) => u.id !== id);
      saveUsers(updatedUsers);
      showToast('用户删除成功', 'success');
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'bg-red-500/20 text-red-400';
      case 'manager': return 'bg-blue-500/20 text-blue-400';
      case 'engineer': return 'bg-emerald-500/20 text-emerald-400';
      case 'viewer': return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className={`text-lg font-semibold ${t.text}`}>用户列表</h2>
        <button
          onClick={() => {
            setEditingUser(null);
            setFormData({ username: '', password: '', name: '', email: '', role: 'engineer' });
            setShowModal(true);
          }}
          className={`flex items-center gap-2 px-4 py-2 ${t.button} rounded-lg`}
        >
          <Plus size={18} />
          新建用户
        </button>
      </div>

      {users.length === 0 ? (
        <div className={`text-center py-12 ${t.card} rounded-lg border ${t.border}`}>
          <User className={`mx-auto ${t.textMuted} mb-4`} size={48} />
          <p className={t.textMuted}>暂无用户</p>
        </div>
      ) : (
        <div className={`${t.card} rounded-lg shadow-sm overflow-hidden border ${t.border}`}>
          <table className="w-full">
            <thead className={t.tableHeader}>
              <tr>
                <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>用户名</th>
                <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>姓名</th>
                <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>邮箱</th>
                <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>角色</th>
                <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>创建时间</th>
                <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className={`border-t ${t.border} ${t.hoverBg}`}>
                  <td className={`px-4 py-3 font-medium ${t.text}`}>{user.username}</td>
                  <td className={`px-4 py-3 ${t.textSecondary}`}>{user.name}</td>
                  <td className={`px-4 py-3 ${t.textSecondary}`}>{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${getRoleBadgeColor(user.role)}`}>
                      {ROLE_NAMES[user.role]}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-sm ${t.textMuted}`}>
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className={`p-2 ${t.textMuted} hover:text-cyan-400`}
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className={`p-2 ${t.textMuted} hover:text-red-400`}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className={`${t.modalBg} rounded-lg p-6 w-full max-w-md border ${t.modalBorder}`} onClick={(e) => e.stopPropagation()}>
            <h2 className={`text-xl font-semibold mb-4 ${t.text}`}>
              {editingUser ? '编辑用户' : '新建用户'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>用户名</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                  required
                  disabled={!!editingUser && editingUser.role === 'admin'}
                  title={editingUser && editingUser.role === 'admin' ? '管理员用户名不可修改' : ''}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>
                  密码 {editingUser && '(留空则不修改)'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                  required={!editingUser}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>姓名</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                  required
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>邮箱</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                  required
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>角色</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                >
                  <option value="admin">管理员</option>
                  <option value="manager">项目经理</option>
                  <option value="engineer">工程师</option>
                  <option value="viewer">查看者</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className={`flex-1 py-2 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}>
                  取消
                </button>
                <button type="submit" className={`flex-1 py-2 ${t.button} rounded-lg`}>
                  {editingUser ? '保存' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
