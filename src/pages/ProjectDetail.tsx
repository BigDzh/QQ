import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, FileText, Package, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/Toast';
import { useThemeStyles } from '../hooks/useThemeStyles';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { getProject, addModule, updateProject, currentUser } = useApp();
  const { showToast } = useToast();
  const t = useThemeStyles();
  const [activeTab, setActiveTab] = useState<'overview' | 'modules' | 'documents' | 'software'>('overview');
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [hoveredStatus, setHoveredStatus] = useState<string | null>(null);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [hoveredComponentCategory, setHoveredComponentCategory] = useState<string | null>(null);
  const [moduleForm, setModuleForm] = useState({
    moduleNumber: '',
    moduleName: '',
    category: '',
    productionOrderNumber: '',
    holder: '',
    status: '未投产' as const,
    stage: 'C阶段',
    version: 'v1.0',
  });

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

  const handleCreateModule = (e: React.FormEvent) => {
    e.preventDefault();
    addModule(project.id, {
      projectId: project.id,
      ...moduleForm,
      components: [],
    });
    showToast('模块创建成功', 'success');
    setShowModuleModal(false);
    setModuleForm({
      moduleNumber: '',
      moduleName: '',
      category: '',
      productionOrderNumber: '',
      holder: '',
      status: '未投产',
      stage: 'C阶段',
      version: 'v1.0',
    });
  };

  const getStats = () => {
    const totalModules = project.modules.length;
    const totalComponents = project.modules.reduce((sum, m) => sum + m.components.length, 0);
    const normalComponents = project.modules.reduce(
      (sum, m) => sum + m.components.filter((c) => c.status === '正常').length,
      0
    );
    const faultComponents = project.modules.reduce(
      (sum, m) => sum + m.components.filter((c) => c.status === '故障').length,
      0
    );
    const documentsCompleted = project.documents.filter((d) => d.status === '已完成').length;
    const softwareCompleted = project.software.filter((s) => s.status === '已完成').length;

    const moduleStatusStats = project.modules.reduce((acc, m) => {
      acc[m.status] = (acc[m.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const categoryStats = project.modules.reduce((acc, m) => {
      if (!acc[m.category]) {
        acc[m.category] = { moduleCount: 0, componentCount: 0 };
      }
      acc[m.category].moduleCount += 1;
      acc[m.category].componentCount += m.components.length;
      return acc;
    }, {} as Record<string, { moduleCount: number; componentCount: number }>);

    const componentCategoryStats = project.modules.reduce((acc, m) => {
      m.components.forEach(() => {
        if (!acc[m.category]) {
          acc[m.category] = 0;
        }
        acc[m.category] += 1;
      });
      return acc;
    }, {} as Record<string, number>);

    const statusModuleDetails = project.modules.reduce((acc, m) => {
      if (!acc[m.status]) {
        acc[m.status] = [];
      }
      acc[m.status].push({ name: m.moduleName, number: m.moduleNumber, components: m.components.length });
      return acc;
    }, {} as Record<string, { name: string; number: string; components: number }[]>);

    return {
      totalModules,
      totalComponents,
      normalRate: totalComponents > 0 ? Math.round((normalComponents / totalComponents) * 100) : 0,
      faultRate: totalComponents > 0 ? Math.round((faultComponents / totalComponents) * 100) : 0,
      documentsCompleted,
      documentsTotal: project.documents.length,
      softwareCompleted,
      softwareTotal: project.software.length,
      moduleStatusStats,
      categoryStats,
      componentCategoryStats,
      statusModuleDetails,
    };
  };

  const stats = getStats();
  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'manager';

  const tabs = [
    { id: 'overview', label: '概览' },
    { id: 'modules', label: '模块管理' },
    { id: 'documents', label: '文档管理' },
    { id: 'software', label: '软件管理' },
  ];

  const handleAddCategory = () => {
    if (!newCategory.trim()) {
      showToast('请输入种类名称', 'error');
      return;
    }
    if (project.categories.includes(newCategory.trim())) {
      showToast('该种类已存在', 'error');
      return;
    }
    updateProject(id!, { categories: [...project.categories, newCategory.trim()] });
    showToast('种类添加成功', 'success');
    setNewCategory('');
    setShowCategoryModal(false);
  };

  return (
    <div>
      <div className="mb-6">
        <Link to="/projects" className={`flex items-center gap-2 ${t.textSecondary} hover:${t.text} mb-4`}>
          <ArrowLeft size={20} />
          返回项目列表
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className={`text-2xl font-bold ${t.text}`}>{project.name}</h1>
            <p className={t.textMuted}>{project.projectNumber} | 版本: {project.version}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${t.stageColors[project.stage as keyof typeof t.stageColors] || t.stageColors.C阶段}`}>
            {project.stage}
          </span>
        </div>
      </div>

      <div className={`flex gap-2 mb-6 border-b ${t.border}`}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-2 -mb-px border-b-2 transition ${
              activeTab === tab.id
                ? `border-cyan-500 ${t.text}`
                : `border-transparent ${t.textSecondary} hover:${t.text}`
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className={`${t.card} rounded-lg shadow-sm p-6 border ${t.border}`}>
              <div className={`text-sm ${t.textMuted} mb-1`}>项目阶段</div>
              <div className={`text-2xl font-bold ${t.text}`}>{project.stage}</div>
            </div>
            <div className={`${t.card} rounded-lg shadow-sm p-6 border ${t.border}`}>
              <div className={`text-sm ${t.textMuted} mb-1`}>模块种类</div>
              <div className={`text-2xl font-bold text-cyan-400`}>{project.categories.length}</div>
            </div>
            <div className={`${t.card} rounded-lg shadow-sm p-6 border ${t.border}`}>
              <div className={`text-sm ${t.textMuted} mb-1`}>模块总数 / 正常率</div>
              <div className={`text-2xl font-bold ${t.success}`}>{stats.totalModules} / {stats.normalRate}%</div>
            </div>
            <div className={`${t.card} rounded-lg shadow-sm p-6 border ${t.border}`}>
              <div className={`text-sm ${t.textMuted} mb-1`}>组件总数 / 故障率</div>
              <div className={`text-2xl font-bold ${t.error}`}>{stats.totalComponents} / {stats.faultRate}%</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={`${t.card} rounded-lg shadow-sm p-6 border ${t.border}`}>
              <h3 className={`text-lg font-semibold ${t.text} mb-4`}>模块状态分布</h3>
              <div className="flex flex-col items-center">
                <div className="relative w-48 h-48">
                  <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                    {Object.entries(stats.moduleStatusStats).reduce((acc, [status, count], index, arr) => {
                      const percentage = (count / stats.totalModules) * 100;
                      const statusColors: Record<string, string> = {
                        '正常': '#10b981',
                        '投产中': '#3b82f6',
                        '维修中': '#f97316',
                        '三防中': '#8b5cf6',
                        '测试中': '#eab308',
                        '仿真中': '#06b6d4',
                        '未投产': '#6b7280',
                        '故障': '#ef4444',
                      };
                      const color = statusColors[status] || '#6b7280';
                      const prevPercentage = arr.slice(0, index).reduce((sum, [, c]) => sum + (c / stats.totalModules) * 100, 0);
                      const dashArray = percentage;
                      const dashOffset = prevPercentage;
                      acc.push(
                        <circle
                          key={status}
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke={color}
                          strokeWidth="12"
                          strokeDasharray={`${dashArray} ${100 - dashArray}`}
                          strokeDashoffset={-dashOffset}
                          className={`transition-all duration-300 cursor-pointer ${hoveredStatus === status ? 'opacity-100' : hoveredStatus ? 'opacity-40' : 'opacity-90'}`}
                          onMouseEnter={() => setHoveredStatus(status)}
                          onMouseLeave={() => setHoveredStatus(null)}
                        />
                      );
                      return acc;
                    }, [] as React.ReactNode[])}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-3xl font-bold ${t.text}`}>{stats.totalModules}</span>
                    <span className={`text-xs ${t.textMuted}`}>模块</span>
                  </div>
                </div>
                <div className="w-full mt-4 space-y-2">
                  {Object.entries(stats.moduleStatusStats).map(([status, count]) => {
                    const percentage = stats.totalModules > 0 ? Math.round((count / stats.totalModules) * 100) : 0;
                    const statusColorMap: Record<string, string> = {
                      '正常': 'bg-emerald-500',
                      '投产中': 'bg-blue-500',
                      '维修中': 'bg-orange-500',
                      '三防中': 'bg-violet-500',
                      '测试中': 'bg-yellow-500',
                      '仿真中': 'bg-cyan-500',
                      '未投产': 'bg-gray-500',
                      '故障': 'bg-red-500',
                    };
                    const colorClass = statusColorMap[status] || 'bg-gray-500';
                    const isHovered = hoveredStatus === status;
                    return (
                      <div
                        key={status}
                        className={`p-2 rounded-lg cursor-pointer transition-all ${isHovered ? `${t.border} shadow-sm` : ''}`}
                        onMouseEnter={() => setHoveredStatus(status)}
                        onMouseLeave={() => setHoveredStatus(null)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full ${colorClass}`} />
                            <span className={`text-sm ${t.text}`}>{status}</span>
                          </div>
                          <span className={`text-sm font-medium ${t.text}`}>{count} ({percentage}%)</span>
                        </div>
                        {isHovered && stats.statusModuleDetails[status] && (
                          <div className={`ml-5 p-2 rounded ${t.emptyBg} text-xs ${t.textMuted}`}>
                            {stats.statusModuleDetails[status].map((m, i) => (
                              <div key={i} className="py-1">
                                <span className={t.text}>{m.name}</span>
                                <span className="mx-1">|</span>
                                <span>{m.number}</span>
                                <span className="mx-1">|</span>
                                <span>组件: {m.components}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className={`${t.card} rounded-lg shadow-sm p-6 border ${t.border}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold ${t.text}`}>模块种类统计</h3>
                {canEdit && (
                  <button
                    onClick={() => setShowCategoryModal(true)}
                    className={`flex items-center gap-1 px-2 py-1 text-sm ${t.button} rounded-lg`}
                  >
                    <Plus size={14} />
                    添加种类
                  </button>
                )}
              </div>
              <div className="flex flex-col items-center">
                <div className="relative w-40 h-40">
                  <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                    {Object.entries(stats.categoryStats).reduce((acc, [category, data], index, arr) => {
                      const percentage = (data.moduleCount / stats.totalModules) * 100;
                      const categoryColors = ['#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#84cc16'];
                      const color = categoryColors[index % categoryColors.length];
                      const prevPercentage = arr.slice(0, index).reduce((sum, [, d]) => sum + (d.moduleCount / stats.totalModules) * 100, 0);
                      const dashArray = percentage;
                      const dashOffset = prevPercentage;
                      acc.push(
                        <circle
                          key={category}
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke={color}
                          strokeWidth="12"
                          strokeDasharray={`${dashArray} ${100 - dashArray}`}
                          strokeDashoffset={-dashOffset}
                          className={`transition-all duration-300 cursor-pointer ${hoveredCategory === category ? 'opacity-100' : hoveredCategory ? 'opacity-40' : 'opacity-90'}`}
                          onMouseEnter={() => setHoveredCategory(category)}
                          onMouseLeave={() => setHoveredCategory(null)}
                        />
                      );
                      return acc;
                    }, [] as React.ReactNode[])}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-2xl font-bold ${t.text}`}>{stats.totalModules}</span>
                    <span className={`text-xs ${t.textMuted}`}>模块</span>
                  </div>
                </div>
                <div className="w-full mt-4 space-y-2">
                  {Object.entries(stats.categoryStats).map(([category, data], index) => {
                    const percentage = stats.totalModules > 0 ? Math.round((data.moduleCount / stats.totalModules) * 100) : 0;
                    const categoryColors = ['bg-cyan-500', 'bg-violet-500', 'bg-pink-500', 'bg-amber-500', 'bg-emerald-500', 'bg-blue-500', 'bg-red-500', 'bg-lime-500'];
                    const colorClass = categoryColors[index % categoryColors.length];
                    const isHovered = hoveredCategory === category;
                    return (
                      <div
                        key={category}
                        className={`p-2 rounded-lg cursor-pointer transition-all ${isHovered ? `${t.border} shadow-sm` : ''}`}
                        onMouseEnter={() => setHoveredCategory(category)}
                        onMouseLeave={() => setHoveredCategory(null)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full ${colorClass}`} />
                            <span className={`text-sm ${t.text}`}>{category}</span>
                          </div>
                          <span className={`text-sm font-medium ${t.text}`}>{data.moduleCount} ({percentage}%)</span>
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(stats.categoryStats).length === 0 && (
                    <p className={`text-sm ${t.textMuted}`}>暂无模块数据</p>
                  )}
                </div>
              </div>
            </div>

            <div className={`${t.card} rounded-lg shadow-sm p-6 border ${t.border}`}>
              <h3 className={`text-lg font-semibold ${t.text} mb-4`}>组件种类统计</h3>
              <div className="flex flex-col items-center">
                <div className="relative w-40 h-40">
                  <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                    {Object.entries(stats.componentCategoryStats).reduce((acc, [category, count], index, arr) => {
                      const percentage = (count / stats.totalComponents) * 100;
                      const categoryColors = ['#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#84cc16'];
                      const color = categoryColors[index % categoryColors.length];
                      const prevPercentage = arr.slice(0, index).reduce((sum, [, c]) => sum + (c / stats.totalComponents) * 100, 0);
                      const dashArray = percentage;
                      const dashOffset = prevPercentage;
                      acc.push(
                        <circle
                          key={category}
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke={color}
                          strokeWidth="12"
                          strokeDasharray={`${dashArray} ${100 - dashArray}`}
                          strokeDashoffset={-dashOffset}
                          className={`transition-all duration-300 cursor-pointer ${hoveredComponentCategory === category ? 'opacity-100' : hoveredComponentCategory ? 'opacity-40' : 'opacity-90'}`}
                          onMouseEnter={() => setHoveredComponentCategory(category)}
                          onMouseLeave={() => setHoveredComponentCategory(null)}
                        />
                      );
                      return acc;
                    }, [] as React.ReactNode[])}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-2xl font-bold ${t.text}`}>{stats.totalComponents}</span>
                    <span className={`text-xs ${t.textMuted}`}>组件</span>
                  </div>
                </div>
                <div className="w-full mt-4 space-y-2">
                  {Object.entries(stats.componentCategoryStats).map(([category, count], index) => {
                    const percentage = stats.totalComponents > 0 ? Math.round((count / stats.totalComponents) * 100) : 0;
                    const categoryColors = ['bg-cyan-500', 'bg-violet-500', 'bg-pink-500', 'bg-amber-500', 'bg-emerald-500', 'bg-blue-500', 'bg-red-500', 'bg-lime-500'];
                    const colorClass = categoryColors[index % categoryColors.length];
                    const isHovered = hoveredComponentCategory === category;
                    return (
                      <div
                        key={category}
                        className={`p-2 rounded-lg cursor-pointer transition-all ${isHovered ? `${t.border} shadow-sm` : ''}`}
                        onMouseEnter={() => setHoveredComponentCategory(category)}
                        onMouseLeave={() => setHoveredComponentCategory(null)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full ${colorClass}`} />
                            <span className={`text-sm ${t.text}`}>{category}</span>
                          </div>
                          <span className={`text-sm font-medium ${t.text}`}>{count} ({percentage}%)</span>
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(stats.componentCategoryStats).length === 0 && (
                    <p className={`text-sm ${t.textMuted}`}>暂无组件数据</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'modules' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className={`text-lg font-semibold ${t.text}`}>模块列表</h2>
            {canEdit && (
              <button
                onClick={() => setShowModuleModal(true)}
                className={`flex items-center gap-2 px-4 py-2 ${t.button} rounded-lg`}
              >
                <Plus size={18} />
                新建模块
              </button>
            )}
          </div>

          {project.modules.length === 0 ? (
            <div className={`text-center py-12 ${t.card} rounded-lg border ${t.border}`}>
              <Package className={`mx-auto ${t.textMuted} mb-4`} size={48} />
              <p className={t.textMuted}>暂无模块，点击上方按钮创建</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {project.modules.map((module) => (
                <Link
                  key={module.id}
                  to={`/projects/${project.id}/category/${module.category}`}
                  className={`${t.card} rounded-lg shadow-sm p-4 hover:shadow-md transition border ${t.border}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className={`font-semibold ${t.text}`}>{module.moduleName}</h3>
                      <p className={`text-sm ${t.textMuted}`}>{module.moduleNumber}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${
                      t.statusColors[module.status as keyof typeof t.statusColors] || t.statusColors.故障
                    }`}>
                      {module.status}
                    </span>
                  </div>
                  <div className={`text-sm ${t.textMuted} mt-2`}>
                    种类: {module.category} | 组件: {module.components.length}
                  </div>
                  <div className={`flex items-center gap-1 text-cyan-400 text-sm mt-2`}>
                    查看详情 <ChevronRight size={16} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'documents' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className={`text-lg font-semibold ${t.text}`}>文档列表</h2>
            {canEdit && (
              <button className={`flex items-center gap-2 px-4 py-2 ${t.button} rounded-lg`}>
                <Plus size={18} />
                上传文档
              </button>
            )}
          </div>
          {project.documents.length === 0 ? (
            <div className={`text-center py-12 ${t.card} rounded-lg border ${t.border}`}>
              <FileText className={`mx-auto ${t.textMuted} mb-4`} size={48} />
              <p className={t.textMuted}>暂无文档</p>
            </div>
          ) : (
            <div className={`${t.card} rounded-lg shadow-sm overflow-hidden border ${t.border}`}>
              <table className="w-full">
                <thead className={t.tableHeader}>
                  <tr>
                    <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>文档名称</th>
                    <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>类型</th>
                    <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>阶段</th>
                    <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>状态</th>
                  </tr>
                </thead>
                <tbody>
                  {project.documents.map((doc) => (
                    <tr key={doc.id} className={`border-t ${t.border} ${t.hoverBg}`}>
                      <td className={`px-4 py-3 ${t.text}`}>{doc.name}</td>
                      <td className={`px-4 py-3 ${t.textSecondary}`}>{doc.type}</td>
                      <td className={`px-4 py-3 ${t.textSecondary}`}>{doc.stage}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          doc.status === '已完成' ? t.success : t.badge
                        }`}>
                          {doc.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'software' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className={`text-lg font-semibold ${t.text}`}>软件列表</h2>
            {canEdit && (
              <button className={`flex items-center gap-2 px-4 py-2 ${t.button} rounded-lg`}>
                <Plus size={18} />
                上传软件
              </button>
            )}
          </div>
          {project.software.length === 0 ? (
            <div className={`text-center py-12 ${t.card} rounded-lg border ${t.border}`}>
              <Package className={`mx-auto ${t.textMuted} mb-4`} size={48} />
              <p className={t.textMuted}>暂无软件</p>
            </div>
          ) : (
            <div className={`${t.card} rounded-lg shadow-sm overflow-hidden border ${t.border}`}>
              <table className="w-full">
                <thead className={t.tableHeader}>
                  <tr>
                    <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>软件名称</th>
                    <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>版本</th>
                    <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>阶段</th>
                    <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>状态</th>
                  </tr>
                </thead>
                <tbody>
                  {project.software.map((soft) => (
                    <tr key={soft.id} className={`border-t ${t.border} ${t.hoverBg}`}>
                      <td className={`px-4 py-3 ${t.text}`}>{soft.name}</td>
                      <td className={`px-4 py-3 ${t.textSecondary}`}>{soft.version}</td>
                      <td className={`px-4 py-3 ${t.textSecondary}`}>{soft.stage}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          soft.status === '已完成' ? t.success : t.badge
                        }`}>
                          {soft.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showModuleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModuleModal(false)}>
          <div className={`${t.modalBg} rounded-lg p-6 w-full max-w-md border ${t.modalBorder}`} onClick={(e) => e.stopPropagation()}>
            <h2 className={`text-xl font-semibold mb-4 ${t.text}`}>新建模块</h2>
            <form onSubmit={handleCreateModule} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}> 模块编号</label>
                <input
                  type="text"
                  value={moduleForm.moduleNumber}
                  onChange={(e) => setModuleForm({ ...moduleForm, moduleNumber: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                  required
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}> 模块名称</label>
                <input
                  type="text"
                  value={moduleForm.moduleName}
                  onChange={(e) => setModuleForm({ ...moduleForm, moduleName: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                  required
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}> 模块种类</label>
                <select
                  value={moduleForm.category}
                  onChange={(e) => setModuleForm({ ...moduleForm, category: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                  required
                >
                  <option value="">选择种类</option>
                  {project.categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}> 生产指令号</label>
                <input
                  type="text"
                  value={moduleForm.productionOrderNumber}
                  onChange={(e) => setModuleForm({ ...moduleForm, productionOrderNumber: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModuleModal(false)} className={`flex-1 py-2 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}>
                  取消
                </button>
                <button type="submit" className={`flex-1 py-2 ${t.button} rounded-lg`}>
                  创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCategoryModal(false)}>
          <div className={`${t.modalBg} rounded-lg p-6 w-full max-w-md border ${t.modalBorder}`} onClick={(e) => e.stopPropagation()}>
            <h2 className={`text-xl font-semibold mb-4 ${t.text}`}>添加模块种类</h2>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>种类名称</label>
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                  placeholder="请输入种类名称"
                  autoFocus
                />
              </div>
              <div className={`text-sm ${t.textMuted}`}>
                当前种类: {project.categories.join(', ') || '暂无'}
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowCategoryModal(false)}
                className={`flex-1 py-2 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}
              >
                取消
              </button>
              <button
                onClick={handleAddCategory}
                className={`flex-1 py-2 ${t.button} rounded-lg`}
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
