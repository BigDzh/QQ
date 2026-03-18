import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Package, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useThemeStyles } from '../hooks/useThemeStyles';
import type { ModuleStatus } from '../types';

const statusColors: Record<ModuleStatus, string> = {
  未投产: 'bg-gray-100 text-gray-700',
  投产中: 'bg-blue-100 text-blue-700',
  正常: 'bg-green-100 text-green-700',
  维修中: 'bg-orange-100 text-orange-700',
  三防中: 'bg-purple-100 text-purple-700',
  测试中: 'bg-yellow-100 text-yellow-700',
  仿真中: 'bg-cyan-100 text-cyan-700',
  故障: 'bg-red-100 text-red-700',
};

export default function CategoryModules() {
  const { id, category } = useParams<{ id: string; category: string }>();
  const { getProject } = useApp();
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

  const categoryModules = project.modules.filter((m) => m.category === category);

  const getStats = () => {
    const total = categoryModules.length;
    const totalComponents = categoryModules.reduce((sum, m) => sum + m.components.length, 0);
    const normal = categoryModules.reduce(
      (sum, m) => sum + m.components.filter((c) => c.status === '正常').length,
      0
    );
    const fault = categoryModules.reduce(
      (sum, m) => sum + m.components.filter((c) => c.status === '故障').length,
      0
    );
    const inProgress = categoryModules.filter((m) => m.status === '投产中').length;
    return { total, totalComponents, normal, fault, inProgress };
  };

  const stats = getStats();

  return (
    <div>
      <div className="mb-6">
        <Link to={`/projects/${project.id}`} className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4">
          <ArrowLeft size={20} />
          返回项目
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{category}</h1>
            <p className="text-gray-500">{project.name} - 模块种类</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-sm text-gray-500">模块数</div>
          <div className="text-2xl font-bold text-primary-600">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-sm text-gray-500">组件数</div>
          <div className="text-2xl font-bold text-blue-600">{stats.totalComponents}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-sm text-gray-500">正常</div>
          <div className="text-2xl font-bold text-green-600">{stats.normal}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-sm text-gray-500">故障</div>
          <div className="text-2xl font-bold text-red-600">{stats.fault}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-sm text-gray-500">投产中</div>
          <div className="text-2xl font-bold text-orange-600">{stats.inProgress}</div>
        </div>
      </div>

      <div className="mb-4">
        <h2 className="text-lg font-semibold">模块列表</h2>
      </div>

      {categoryModules.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg">
          <Package className="mx-auto text-gray-300 mb-4" size={48} />
          <p className="text-gray-500">该种类下暂无模块</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categoryModules.map((module) => (
            <Link
              key={module.id}
              to={`/modules/${module.id}`}
              className="bg-white rounded-lg shadow-sm hover:shadow-md transition p-5"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-gray-800">{module.moduleName}</h3>
                  <p className="text-sm text-gray-500">{module.moduleNumber}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${statusColors[module.status]}`}>
                  {module.status}
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                <div>
                  <div className="text-gray-500">生产指令</div>
                  <div className="font-medium truncate">{module.productionOrderNumber || '-'}</div>
                </div>
                <div>
                  <div className="text-gray-500">阶段</div>
                  <div className="font-medium">{module.stage}</div>
                </div>
                <div>
                  <div className="text-gray-500">版本</div>
                  <div className="font-medium">{module.version}</div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t">
                <div className="text-sm text-gray-500">
                  组件: {module.components.length}
                </div>
                <div className="flex items-center gap-1 text-primary-600 text-sm">
                  查看详情 <ChevronRight size={16} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
