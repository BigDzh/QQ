import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Package, ChevronRight, Edit2, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useThemeStyles } from '../hooks/useThemeStyles';
import type { Module } from '../types';

export default function CategoryModules() {
  const { id, category } = useParams<{ id: string; category: string }>();
  const navigate = useNavigate();
  const { getProject, deleteModule } = useApp();
  const t = useThemeStyles();

  const project = getProject(id!);

  if (!project) {
    return (
      <div className={`text-center py-12 ${t.textMuted}`}>
        <p>项目不存在</p>
        <Link to="/projects" className={`${t.textSecondary} hover:underline mt-2 inline-block`}>
          返回项目列表
        </Link>
      </div>
    );
  }

  const handleCardClick = (e: React.MouseEvent, moduleId: string) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('[data-no-navigate]')) {
      return;
    }
    navigate(`/modules/${moduleId}`);
  };

  const handleViewDetails = (e: React.MouseEvent, moduleId: string) => {
    e.stopPropagation();
    navigate(`/modules/${moduleId}`);
  };

  const handleDelete = (e: React.MouseEvent, moduleId: string) => {
    e.stopPropagation();
    if (confirm('确定要删除该模块吗？')) {
      deleteModule(project.id, moduleId);
    }
  };

  const handleEdit = (e: React.MouseEvent, module: Module) => {
    e.stopPropagation();
    navigate(`/modules/${module.id}/edit`);
  };

  const categoryModules = ((project.modules && Array.isArray(project.modules)) ? project.modules.filter((m) => m.category === category) : []);

  const getStats = () => {
    const total = categoryModules.length;
    const totalComponents = categoryModules.reduce((sum, m) => sum + ((m.components && Array.isArray(m.components)) ? m.components.length : 0), 0);
    const normal = categoryModules.reduce(
      (sum, m) => sum + ((m.components && Array.isArray(m.components)) ? m.components.filter((c) => c.status === '正常').length : 0),
      0
    );
    const fault = categoryModules.reduce(
      (sum, m) => sum + ((m.components && Array.isArray(m.components)) ? m.components.filter((c) => c.status === '故障').length : 0),
      0
    );
    const inProgress = categoryModules.filter((m) => m.status === '投产中').length;
    return { total, totalComponents, normal, fault, inProgress };
  };

  const stats = getStats();

  return (
    <div>
      <div className="mb-6">
        <Link to={`/projects/${project.id}`} className={`flex items-center gap-2 ${t.textSecondary} hover:${t.text} mb-4`}>
          <ArrowLeft size={20} />
          返回项目
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className={`text-2xl font-bold ${t.text}`}>{category}</h1>
            <p className={t.textMuted}>{project.name} - 模块种类</p>
          </div>
        </div>
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-5 gap-4 mb-6`}>
        <div className={`${t.card} rounded-lg shadow-sm p-4 border ${t.border}`}>
          <div className={`text-sm ${t.textMuted}`}>模块数</div>
          <div className={`text-2xl font-bold ${t.accentText}`}>{stats.total}</div>
        </div>
        <div className={`${t.card} rounded-lg shadow-sm p-4 border ${t.border}`}>
          <div className={`text-sm ${t.textMuted}`}>组件数</div>
          <div className="text-2xl font-bold text-blue-400">{stats.totalComponents}</div>
        </div>
        <div className={`${t.card} rounded-lg shadow-sm p-4 border ${t.border}`}>
          <div className={`text-sm ${t.textMuted}`}>正常</div>
          <div className="text-2xl font-bold text-emerald-400">{stats.normal}</div>
        </div>
        <div className={`${t.card} rounded-lg shadow-sm p-4 border ${t.border}`}>
          <div className={`text-sm ${t.textMuted}`}>故障</div>
          <div className="text-2xl font-bold text-red-400">{stats.fault}</div>
        </div>
        <div className={`${t.card} rounded-lg shadow-sm p-4 border ${t.border}`}>
          <div className={`text-sm ${t.textMuted}`}>投产中</div>
          <div className="text-2xl font-bold text-orange-400">{stats.inProgress}</div>
        </div>
      </div>

      <div className="mb-4">
        <h2 className={`text-lg font-semibold ${t.text}`}>模块列表</h2>
      </div>

      {categoryModules.length === 0 ? (
        <div className={`text-center py-12 ${t.card} rounded-lg border ${t.border}`}>
          <Package className={`mx-auto ${t.textMuted} mb-4`} size={48} />
          <p className={t.textMuted}>该种类下暂无模块</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categoryModules.map((module) => (
            <div
              key={module.id}
              onClick={(e) => handleCardClick(e, module.id)}
              className={`${t.card} rounded-lg shadow-sm hover:shadow-md transition p-5 border cursor-pointer ${t.border}`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className={`font-semibold ${t.text}`}>{module.moduleName}</h3>
                  <p className={`text-sm ${t.textMuted}`}>{module.moduleNumber}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEdit(e, module); }}
                    className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-blue-500 transition"
                    title="编辑模块"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(e, module.id); }}
                    className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-red-500 transition"
                    title="删除模块"
                  >
                    <Trash2 size={14} />
                  </button>
                  <span className={`px-2 py-1 rounded text-xs ${
                    t.statusColors[module.status as keyof typeof t.statusColors] || t.statusColors.故障
                  }`}>
                    {module.status}
                  </span>
                </div>
              </div>

              <div className={`grid grid-cols-3 gap-2 text-sm mb-3`}>
                <div>
                  <div className={t.textMuted}>生产指令</div>
                  <div className={`font-medium truncate ${t.text}`}>{module.productionOrderNumber || '-'}</div>
                </div>
                <div>
                  <div className={t.textMuted}>阶段</div>
                  <div className={`font-medium ${t.text}`}>{module.stage}</div>
                </div>
                <div>
                  <div className={t.textMuted}>版本</div>
                  <div className={`font-medium ${t.text}`}>{module.version}</div>
                </div>
              </div>

              <div className={`flex items-center justify-between pt-3 border-t ${t.border}`}>
                  <div className={`text-sm ${t.textMuted}`}>
                    组件: {(module.components || []).length}
                  </div>
                  <div className={`flex items-center gap-1 ${t.accentText} text-sm`}>
                    查看详情 <ChevronRight size={16} />
                  </div>
                </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
