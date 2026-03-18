import React, { useState, useEffect } from 'react';
import { Plus, User, Trash2, Edit } from 'lucide-react';
import { useToast } from '../components/Toast';
import type { User as UserType, UserRole } from '../types/auth';
import { ROLE_NAMES } from '../types/auth';
import { generateId } from '../utils/auth';

const USERS_KEY = 'users';

export default function UserManagement() {
  const { showToast } = useToast();
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
      const updatedUsers = users.map((u) =>
        u.id === editingUser.id ? { ...u, ...formData } : u
      );
      saveUsers(updatedUsers);
      showToast('用户更新成功', 'success');
    } else {
      const newUser: UserType = {
        id: generateId(),
        ...formData,
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
      password: user.password,
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
      case 'admin': return 'bg-red-100 text-red-700';
      case 'manager': return 'bg-blue-100 text-blue-700';
      case 'engineer': return 'bg-green-100 text-green-700';
      case 'viewer': return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">用户列表</h2>
        <button
          onClick={() => {
            setEditingUser(null);
            setFormData({ username: '', password: '', name: '', email: '', role: 'engineer' });
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <Plus size={18} />
          新建用户
        </button>
      </div>

      {users.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg">
          <User className="mx-auto text-gray-300 mb-4" size={48} />
          <p className="text-gray-500">暂无用户</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">用户名</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">姓名</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">邮箱</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">角色</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">创建时间</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{user.username}</td>
                  <td className="px-4 py-3">{user.name}</td>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${getRoleBadgeColor(user.role)}`}>
                      {ROLE_NAMES[user.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className="p-2 text-gray-400 hover:text-primary-600"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="p-2 text-gray-400 hover:text-red-600"
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
          <div className="bg-white rounded-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">
              {editingUser ? '编辑用户' : '新建用户'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                  disabled={!!editingUser}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  密码 {editingUser && '(留空则不修改)'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required={!editingUser}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="admin">管理员</option>
                  <option value="manager">项目经理</option>
                  <option value="engineer">工程师</option>
                  <option value="viewer">查看者</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 border rounded-lg hover:bg-gray-50">
                  取消
                </button>
                <button type="submit" className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
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
