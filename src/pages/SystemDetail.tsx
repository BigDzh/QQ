import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Package } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/Toast';
import { useThemeStyles } from '../hooks/useThemeStyles';

export default function SystemDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { projects, getProject, addModule, updateProject } = useApp();
  const { showToast } = useToast();
  const t = useThemeStyles();

  const system = projects.flatMap(p => p.systems).find(s => s.id === id);
  const project = getProject(projects.find(p => p.systems.some(s => s.id === id))?.id || '');

  const [showModuleModal, setShowModuleModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [moduleForm, setModuleForm] = useState({
    moduleNumber: '',
    moduleName: '',
    category: '',
    productionOrderNumber: '',
    holder: '',
  });

  if (!system || !project) {
    return (
      <div className={`min-h-screen ${t.bg}`}>
        <div className="max-w-7xl mx-auto p-6">
          <div className={`text-center py-12 ${t.card} rounded-lg`}>
            <p className={t.textMuted}>系统不存在</p>
            <Link to={`/projects/${project?.id}`} className={`mt-4 inline-block ${t.textSecondary} hover:underline`}>
              返回项目
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const moduleCategories = [...new Set(project.modules.filter(m => m.systemId === system.id).map(m => m.category).filter(Boolean))];
  const categories = [...new Set([...moduleCategories, ...project.categories])];

  const handleCreateModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleForm.moduleNumber || !moduleForm.moduleName || !moduleForm.category) {
      showToast('请填写必填项', 'error');
      return;
    }
    addModule(project.id, {
      projectId: project.id,
      systemId: system.id,
      moduleNumber: moduleForm.moduleNumber,
      moduleName: moduleForm.moduleName,
      category: moduleForm.category,
      productionOrderNumber: moduleForm.productionOrderNumber || system.instructionNumber,
      holder: moduleForm.holder || system.holder,
      status: '未投产',
      stage: system.stage,
      version: system.version || 'v1.0',
      components: [],
    });
    showToast('模块创建成功', 'success');
    setShowModuleModal(false);
    setModuleForm({ moduleNumber: '', moduleName: '', category: '', productionOrderNumber: '', holder: '' });
  };

  const handleAddCategory = () => {
    if (!newCategory.trim()) {
      showToast('请输入种类名称', 'error');
      return;
    }
    if (project.categories.includes(newCategory.trim())) {
      showToast('该种类已存在', 'error');
      return;
    }
    updateProject(project.id, { categories: [...project.categories, newCategory.trim()] });
    showToast('种类添加成功', 'success');
    setNewCategory('');
    setShowCategoryModal(false);
  };

  return (
    <div className={`min-h-screen ${t.bg}`}>
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <button onClick={() => navigate(-1)} className={`flex items-center gap-2 ${t.textSecondary} hover:${t.text} mb-4`}>
            <ArrowLeft size={20} />
            返回
          </button>
          <div className={`${t.card} rounded-xl shadow-md p-6 border ${t.border}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className={`text-2xl font-bold ${t.text} mb-2`}>{system.systemName}</h1>
                <div className="flex items-center gap-4 mt-4">
                  <div>
                    <span className={`text-sm ${t.textMuted}`}>系统编号</span>
                    <p className={t.text}>{system.systemNumber}</p>
                  </div>
                  <div>
                    <span className={`text-sm ${t.textMuted}`}>指令号</span>
                    <p className={t.text}>{system.instructionNumber}</p>
                  </div>
                  <div>
                    <span className={`text-sm ${t.textMuted}`}>负责人</span>
                    <p className={t.text}>{system.holder}</p>
                  </div>
                  <div>
                    <span className={`text-sm ${t.textMuted}`}>阶段</span>
                    <p className={t.text}>{system.stage}</p>
                  </div>
                  <div>
                    <span className={`text-sm ${t.textMuted}`}>版本</span>
                    <p className={t.text}>{system.version}</p>
                  </div>
                  <div>
                    <span className={`text-sm ${t.textMuted}`}>状态</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      t.statusColors[system.status as keyof typeof t.statusColors] || t.statusColors['故障']
                    }`}>
                      {system.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-lg font-semibold ${t.text}`}>模块列表</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCategoryModal(true)}
                className={`px-3 py-1.5 text-sm rounded-lg border ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}
              >
                新建种类
              </button>
              <button
                onClick={() => setShowModuleModal(true)}
                className={`flex items-center gap-2 px-4 py-2 ${t.button} rounded-lg text-white`}
              >
                <Plus size={18} />
                新建模块
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap mb-4">
            <span className={`text-sm ${t.textMuted}`}>种类：</span>
            {categories.map(cat => (
              <span key={cat} className={`px-3 py-1 rounded-lg text-sm ${t.badge}`}>
                {cat}
              </span>
            ))}
            {categories.length === 0 && (
              <span className={`text-sm ${t.textMuted}`}>暂无种类</span>
            )}
          </div>

          {project.modules.filter(m => m.systemId === system.id).length === 0 ? (
            <div className={`text-center py-12 ${t.card} rounded-lg border ${t.border}`}>
              <Package className={`mx-auto ${t.textMuted} mb-4`} size={48} />
              <p className={t.textMuted}>暂无模块</p>
            </div>
          ) : (
            <div className="space-y-4">
              {categories.map(category => {
                const categoryModules = project.modules.filter(m => m.systemId === system.id && m.category === category);
                if (categoryModules.length === 0) return null;
                return (
                  <div key={category} className={`${t.card} rounded-lg shadow-sm border ${t.border} overflow-hidden`}>
                    <div className={`px-4 py-3 ${t.tableHeader} flex items-center justify-between`}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          category === '控制类' ? 'bg-cyan-500' :
                          category === '通信类' ? 'bg-violet-500' :
                          category === '电源类' ? 'bg-amber-500' :
                          category === '传感类' ? 'bg-pink-500' :
                          'bg-gray-500'
                        }`} />
                        <span className={`font-medium ${t.text}`}>{category}</span>
                        <span className={`text-sm ${t.textMuted}`}>({categoryModules.length})</span>
                      </div>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                      {categoryModules.map(module => (
                        <div key={module.id} className={`flex items-center justify-between px-4 py-3 hover:${t.hoverBg}`}>
                          <div>
                            <Link to={`/modules/${module.id}`} className={`font-medium ${t.text} hover:underline`}>
                              {module.moduleName}
                            </Link>
                            <p className={`text-sm ${t.textMuted}`}>{module.moduleNumber}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className={`px-2 py-1 rounded text-xs ${
                              t.statusColors[module.status as keyof typeof t.statusColors] || t.statusColors.故障
                            }`}>
                              {module.status}
                            </span>
                            <span className={`text-sm ${t.textMuted}`}>{module.components.length} 组件</span>
                            <Link to={`/modules/${module.id}`} className={`p-1.5 rounded border ${t.border} ${t.textMuted} hover:${t.hoverBg}`}>
                              <ArrowLeft size={14} className="rotate-180" />
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {showModuleModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModuleModal(false)}>
            <div className={`${t.card} rounded-lg p-6 w-full max-w-md border ${t.border}`} onClick={e => e.stopPropagation()}>
              <h2 className={`text-xl font-semibold mb-4 ${t.text}`}>新建模块</h2>
              <form onSubmit={handleCreateModule} className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>模块编号 *</label>
                  <input
                    type="text"
                    value={moduleForm.moduleNumber}
                    onChange={e => setModuleForm({ ...moduleForm, moduleNumber: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg ${t.border} ${t.text} ${t.card}`}
                    placeholder="如: M001"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>模块名称 *</label>
                  <input
                    type="text"
                    value={moduleForm.moduleName}
                    onChange={e => setModuleForm({ ...moduleForm, moduleName: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg ${t.border} ${t.text} ${t.card}`}
                    placeholder="请输入模块名称"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>种类 *</label>
                  <select
                    value={moduleForm.category}
                    onChange={e => setModuleForm({ ...moduleForm, category: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg ${t.border} ${t.text} ${t.card}`}
                  >
                    <option value="">请选择种类</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>生产指令号</label>
                  <input
                    type="text"
                    value={moduleForm.productionOrderNumber || system.instructionNumber}
                    onChange={e => setModuleForm({ ...moduleForm, productionOrderNumber: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg ${t.border} ${t.text} ${t.card}`}
                    placeholder={system.instructionNumber}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>负责人</label>
                  <input
                    type="text"
                    value={moduleForm.holder || system.holder}
                    onChange={e => setModuleForm({ ...moduleForm, holder: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg ${t.border} ${t.text} ${t.card}`}
                    placeholder={system.holder}
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowModuleModal(false)} className={`flex-1 py-2 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}>
                    取消
                  </button>
                  <button type="submit" className={`flex-1 py-2 ${t.button} rounded-lg text-white`}>
                    创建
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showCategoryModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCategoryModal(false)}>
            <div className={`${t.card} rounded-lg p-6 w-full max-w-md border ${t.border}`} onClick={e => e.stopPropagation()}>
              <h2 className={`text-xl font-semibold mb-4 ${t.text}`}>新建种类</h2>
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>种类名称</label>
                  <input
                    type="text"
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg ${t.border} ${t.text} ${t.card}`}
                    placeholder="如: 控制类"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowCategoryModal(false)} className={`flex-1 py-2 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}>
                    取消
                  </button>
                  <button type="button" onClick={handleAddCategory} className={`flex-1 py-2 ${t.button} rounded-lg text-white`}>
                    创建
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}