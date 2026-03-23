import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, FolderKanban, Trash2, Edit, ChevronRight, Rocket } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/Toast';
import { useTheme } from '../context/ThemeContext';
import { useThemeStyles } from '../hooks/useThemeStyles';
import type { Project } from '../types';

export default function ProjectList() {
  const { projects, addProject, updateProject, deleteProject, currentUser } = useApp();
  const { showToast } = useToast();
  const { theme } = useTheme();
  const t = useThemeStyles();
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    projectNumber: '',
    stage: 'F阶段' as 'F阶段' | 'C阶段' | 'S阶段' | 'D阶段' | 'P阶段',
    version: 'v1.0',
    categories: '',
  });

  const isCyberpunk = theme === 'cyberpunk';
  const isDark = !theme || theme === 'dark' || theme === 'cyberpunk' || theme === 'linear' || theme === 'anime';

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.projectNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const categories = formData.categories
      ? formData.categories.split(',').map((c) => c.trim()).filter(Boolean)
      : [];

    if (editingProject) {
      updateProject(editingProject.id, {
        name: formData.name,
        projectNumber: formData.projectNumber,
        stage: formData.stage,
        version: formData.version,
        categories,
      });
      showToast('项目更新成功', 'success');
    } else {
      addProject({
        name: formData.name,
        projectNumber: formData.projectNumber,
        stage: formData.stage,
        version: formData.version,
        categories,
        modules: [],
        systems: [],
        documents: [],
        software: [],
        designFiles: [],
      });
      showToast('项目创建成功', 'success');
    }
    setShowModal(false);
    setEditingProject(null);
    setFormData({ name: '', projectNumber: '', stage: 'C阶段', version: 'v1.0', categories: '' });
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      projectNumber: project.projectNumber,
      stage: project.stage as 'F阶段' | 'C阶段' | 'S阶段' | 'D阶段' | 'P阶段',
      version: project.version,
      categories: project.categories.join(', '),
    });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个项目吗？')) {
      deleteProject(id);
      showToast('项目删除成功', 'success');
    }
  };

  const getProjectStats = (project: Project) => {
    const totalModules = project.modules.length;
    const totalComponents = project.modules.reduce((sum, m) => sum + m.components.length, 0);
    const normalComponents = project.modules.reduce(
      (sum, m) => sum + m.components.filter((c) => c.status === '正常').length,
      0
    );
    const normalRate = totalComponents > 0 ? Math.round((normalComponents / totalComponents) * 100) : 0;
    return { totalModules, totalComponents, normalRate };
  };

  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'manager';

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-500 group-focus-within:text-cyan-400' : 'text-gray-400'}`} size={16} />
          <input
            type="text"
            placeholder="搜索项目..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`pl-10 pr-4 py-2.5 w-72 rounded-xl text-sm focus:outline-none transition-all ${
              isCyberpunk 
                ? 'bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-cyan-500/50 focus:bg-white/10' 
                : isDark
                  ? 'bg-white/5 border border-white/10 text-white'
                  : 'border border-gray-200 text-gray-900'
            }`}
          />
        </div>
        <button
          onClick={() => {
            setEditingProject(null);
            setFormData({ name: '', projectNumber: '', stage: 'C阶段', version: 'v1.0', categories: '' });
            setShowModal(true);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all ${
            isCyberpunk 
              ? 'bg-gradient-to-r from-cyan-500 to-fuchsia-500 shadow-lg shadow-cyan-500/25 hover:opacity-90' 
              : t.accent
          }`}
        >
          <Plus size={16} />
          新建项目
        </button>
      </div>

      {filteredProjects.length === 0 ? (
        <div className={`text-center py-20 ${t.emptyBg} rounded-2xl border ${t.border}`}>
          <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${
            isDark ? 'bg-white/10' : 'bg-gray-100'
          }`}>
            <Rocket className={isDark ? 'text-gray-500' : 'text-gray-300'} size={32} />
          </div>
          <p className={`${t.textSecondary} text-sm mb-1`}>暂无项目</p>
          <p className={t.textMuted}>点击上方按钮创建您的第一个项目</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => {
            const stats = getProjectStats(project);
            const stageColors = t.stageColors[project.stage as keyof typeof t.stageColors] || t.stageColors.C阶段;

            return (
              <div key={project.id} className={`rounded-2xl border transition-all duration-300 overflow-hidden ${t.card} ${
                  isCyberpunk ? 'relative group' : ''
                }`}>
                {isCyberpunk && (
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-fuchsia-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
                <div className="relative p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                        isCyberpunk 
                          ? 'bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20 border-white/10' 
                          : isDark 
                            ? 'bg-gray-700' 
                            : 'bg-gray-100'
                      }`}>
                        <FolderKanban className={isCyberpunk ? 'text-cyan-400' : isDark ? 'text-gray-300' : 'text-gray-600'} size={18} />
                      </div>
                      <div>
                        <h3 className={`text-sm font-semibold ${t.text}`}>{project.name}</h3>
                        <p className={`text-xs ${t.textSecondary}`}>{project.projectNumber}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${stageColors}`}>
                      {project.stage}
                    </span>
                  </div>

                  <div className={`flex items-center gap-2 py-3 border-y ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                    <div className="flex-1 text-center">
                      <div className={`text-lg font-bold ${t.text}`}>{stats.totalModules}</div>
                      <div className={`text-xs ${t.textSecondary}`}>模块</div>
                    </div>
                    <div className={`w-px h-8 ${isDark ? 'bg-white/5' : 'bg-gray-200'}`} />
                    <div className="flex-1 text-center">
                      <div className={`text-lg font-bold ${t.text}`}>{stats.totalComponents}</div>
                      <div className={`text-xs ${t.textSecondary}`}>组件</div>
                    </div>
                    <div className={`w-px h-8 ${isDark ? 'bg-white/5' : 'bg-gray-200'}`} />
                    <div className="flex-1 text-center">
                      <div className={`text-lg font-bold ${isCyberpunk ? 'text-cyan-400' : t.text}`}>{stats.normalRate}%</div>
                      <div className={`text-xs ${t.textSecondary}`}>正常率</div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-4">
                    <div className="flex flex-wrap gap-1">
                      {project.categories?.map((category, idx) => (
                        <span
                          key={idx}
                          className={`px-2 py-0.5 rounded text-xs ${
                            isCyberpunk
                              ? 'bg-gradient-to-r from-cyan-500/10 to-fuchsia-500/10 text-cyan-400 border border-cyan-500/20'
                              : isDark
                                ? 'bg-white/10 text-gray-300'
                                : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {category}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-1">
                      {canEdit && (
                        <>
                          <button
                            onClick={() => handleEdit(project)}
                            aria-label="编辑项目"
                            className={`p-2 rounded-lg transition-colors ${
                              isCyberpunk
                                ? 'text-gray-500 hover:text-cyan-400 hover:bg-white/5'
                                : isDark
                                  ? 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(project.id)}
                            aria-label="删除项目"
                            className={`p-2 rounded-lg transition-colors ${
                              isCyberpunk
                                ? 'text-gray-500 hover:text-rose-400 hover:bg-white/5'
                                : isDark
                                  ? 'text-gray-500 hover:text-red-400 hover:bg-white/5'
                                  : 'text-gray-400 hover:text-red-600 hover:bg-gray-100'
                            }`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                      <Link
                        to={`/projects/${project.id}`}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          isCyberpunk 
                            ? 'bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/20 text-cyan-400 border border-cyan-500/20 hover:from-cyan-500/30 hover:to-fuchsia-500/30' 
                            : isDark
                              ? 'bg-white/10 text-white hover:bg-white/20'
                              : 'bg-gray-900 text-white hover:bg-gray-800'
                        }`}
                      >
                        查看 <ChevronRight size={12} />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className={`${t.modalBg} border ${t.modalBorder} rounded-2xl p-6 w-full max-w-md shadow-xl ${
            isCyberpunk ? 'shadow-cyan-500/10' : ''
          }`} onClick={(e) => e.stopPropagation()}>
            <h2 className={`text-lg font-semibold ${t.text} mb-5`}>{editingProject ? '编辑项目' : '新建项目'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>项目名称</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none transition-colors ${
                    isCyberpunk 
                      ? 'bg-white/5 border border-white/10 text-white focus:border-cyan-500/50' 
                      : isDark
                        ? 'bg-white/5 border border-white/10 text-white'
                        : 'border border-gray-200 text-gray-900'
                  }`}
                  required
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>项目编号</label>
                <input
                  type="text"
                  value={formData.projectNumber}
                  onChange={(e) => setFormData({ ...formData, projectNumber: e.target.value })}
                  className={`w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none transition-colors ${
                    isCyberpunk 
                      ? 'bg-white/5 border border-white/10 text-white focus:border-cyan-500/50' 
                      : isDark
                        ? 'bg-white/5 border border-white/10 text-white'
                        : 'border border-gray-200 text-gray-900'
                  }`}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>阶段</label>
                  <select
                    value={formData.stage}
                    onChange={(e) => setFormData({ ...formData, stage: e.target.value as 'F阶段' | 'C阶段' | 'S阶段' | 'D阶段' | 'P阶段' })}
                    className={`w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none transition-colors ${
                      isCyberpunk 
                        ? 'bg-white/5 border border-white/10 text-white focus:border-cyan-500/50' 
                        : isDark
                          ? 'bg-white/5 border border-white/10 text-white'
                          : 'border border-gray-200 text-gray-900'
                    }`}
                  >
                    <option value="F阶段">F阶段</option>
                    <option value="C阶段">C阶段</option>
                    <option value="S阶段">S阶段</option>
                    <option value="D阶段">D阶段</option>
                    <option value="P阶段">P阶段</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>版本</label>
                  <input
                    type="text"
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    className={`w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none transition-colors ${
                      isCyberpunk 
                        ? 'bg-white/5 border border-white/10 text-white focus:border-cyan-500/50' 
                        : isDark
                          ? 'bg-white/5 border border-white/10 text-white'
                          : 'border border-gray-200 text-gray-900'
                    }`}
                  />
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>模块种类（逗号分隔）</label>
                <input
                  type="text"
                  value={formData.categories}
                  onChange={(e) => setFormData({ ...formData, categories: e.target.value })}
                  className={`w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none transition-colors ${
                    isCyberpunk 
                      ? 'bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-cyan-500/50' 
                      : isDark
                        ? 'bg-white/5 border border-white/10 text-white'
                        : 'border border-gray-200 text-gray-900'
                  }`}
                  placeholder="如: 控制类, 通信类, 电源类"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className={`flex-1 py-2.5 border rounded-xl text-sm font-medium transition-colors ${
                  isDark 
                    ? 'border-white/10 text-gray-400 hover:bg-white/5 hover:text-white' 
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}>
                  取消
                </button>
                <button type="submit" className={`flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity ${
                  isCyberpunk 
                    ? 'bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:opacity-90' 
                    : t.accent
                }`}>
                  {editingProject ? '保存' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
