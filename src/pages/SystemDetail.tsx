import { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Package, User, Hash,
  CheckCircle, AlertTriangle, Settings, Layers, FolderTree,
  ChevronRight, ChevronDown, Network, LayoutGrid, List, GitBranch,
  Unlink, HelpCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/Toast';
import { useThemeStyles } from '../hooks/useThemeStyles';

interface ModuleTreeNode {
  id: string;
  name: string;
  type: 'system' | 'module' | 'component';
  status: string;
  category?: string;
  systemId?: string;
  moduleId?: string;
  parentId?: string;
  level: number;
  children: ModuleTreeNode[];
  data: any;
}

export default function SystemDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { projects, addModule, updateProject } = useApp();
  const { showToast } = useToast();
  const t = useThemeStyles();

  const [viewMode, setViewMode] = useState<'card' | 'tree'>('card');
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('全部');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [moduleForm, setModuleForm] = useState({
    moduleNumber: '', moduleName: '', category: '',
    productionOrderNumber: '', holder: '',
  });

  const system = useMemo(() => {
    for (const p of projects) {
      const found = p.systems?.find((s: any) => s.id === id);
      if (found) return found;
    }
    return null;
  }, [projects, id]);

  const project = useMemo(() => {
    if (!system) return null;
    return projects.find((p: any) => p.systems?.some((s: any) => s.id === id));
  }, [projects, system, id]);

  const allProjectModules = useMemo(() => {
    if (!project?.modules || !Array.isArray(project.modules)) return [];
    return project.modules;
  }, [project]);

  const systemModules = useMemo(() => {
    if (!allProjectModules.length || !system?.id) return [];
    return allProjectModules.filter((m: any) => m.systemId === system.id);
  }, [allProjectModules, system]);

  const moduleCategories = useMemo(() => {
    const cats = systemModules.map((m: any) => m.category).filter(Boolean);
    return ['全部', ...new Set(cats)];
  }, [systemModules]);

  const categories = useMemo(() => {
    const projectCats = project?.categories || [];
    const moduleCats = moduleCategories.slice(1);
    return ['全部', ...new Set([...projectCats, ...moduleCats])];
  }, [project, moduleCategories]);

  const getComponentsArray = (module: any): any[] => {
    if (!module || !module.components || !Array.isArray(module.components)) return [];
    return module.components;
  };

  const buildModuleTree = (): ModuleTreeNode => {
    const root: ModuleTreeNode = {
      id: `system-${system?.id}`,
      name: system?.systemName || '系统',
      type: 'system',
      status: system?.status || '未知',
      level: 0,
      children: [],
      data: system,
    };

    const modulesByCategory: Record<string, ModuleTreeNode> = {};

    systemModules.forEach((module: any) => {
      const cat = module.category || '其他';
      if (!modulesByCategory[cat]) {
        modulesByCategory[cat] = {
          id: `category-${cat}`,
          name: cat,
          type: 'module',
          status: '',
          category: cat,
          level: 1,
          children: [],
          data: null,
        };
        root.children.push(modulesByCategory[cat]);
      }

      const moduleNode: ModuleTreeNode = {
        id: module.id,
        name: module.moduleName,
        type: 'module',
        status: module.status,
        category: module.category,
        systemId: module.systemId,
        level: 2,
        children: [],
        data: module,
      };

      const components = getComponentsArray(module);
      components.forEach((comp: any) => {
        moduleNode.children.push({
          id: comp.id,
          name: comp.componentName,
          type: 'component',
          status: comp.status,
          moduleId: module.id,
          level: 3,
          children: [],
          data: comp,
        });
      });

      modulesByCategory[cat].children.push(moduleNode);
    });

    return root;
  };

  const moduleTree = useMemo(() => buildModuleTree(), [system, systemModules]);

  const unlinkedModules = useMemo(() => {
    if (!allProjectModules.length) return [];
    return allProjectModules.filter((m: any) => !m.systemId || m.systemId === '');
  }, [allProjectModules]);

  const stats = useMemo(() => {
    let totalModules = 0;
    let totalComponents = 0;
    let normalComponents = 0;
    let faultComponents = 0;
    const moduleStatusStats: Record<string, number> = {};
    const categoryStats: Record<string, { moduleCount: number; componentCount: number }> = {};

    totalModules = systemModules.length;

    for (const module of systemModules) {
      const components = getComponentsArray(module);
      const componentCount = components.length;
      totalComponents += componentCount;

      const normalCount = components.filter((c: any) => c.status === '正常').length;
      const faultCount = components.filter((c: any) => c.status === '故障').length;
      normalComponents += normalCount;
      faultComponents += faultCount;

      const status = module.status || '未知';
      moduleStatusStats[status] = (moduleStatusStats[status] || 0) + 1;

      const category = module.category || '其他';
      if (!categoryStats[category]) {
        categoryStats[category] = { moduleCount: 0, componentCount: 0 };
      }
      categoryStats[category].moduleCount += 1;
      categoryStats[category].componentCount += componentCount;
    }

    return {
      totalModules,
      totalComponents,
      normalComponents,
      faultComponents,
      normalRate: totalComponents > 0 ? Math.round((normalComponents / totalComponents) * 100) : 0,
      faultRate: totalComponents > 0 ? Math.round((faultComponents / totalComponents) * 100) : 0,
      moduleStatusStats,
      categoryStats,
    };
  }, [systemModules]);

  const filteredModules = useMemo(() => {
    if (activeCategory === '全部') return systemModules;
    return systemModules.filter((m: any) => m.category === activeCategory);
  }, [systemModules, activeCategory]);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const statusColors: Record<string, string> = {
    '正常': '#10b981',
    '故障': '#ef4444',
    '维修中': '#f59e0b',
    '三防中': '#a855f7',
    '测试中': '#eab308',
    '仿真中': '#06b6d4',
    '未投产': '#6b7280',
    '投产中': '#ec4899',
    '借用中': '#f97316',
    '未知': '#6b7280',
  };

  const categoryColors: Record<string, string> = {
    '控制类': '#06b6d4',
    '通信类': '#8b5cf6',
    '电源类': '#f59e0b',
    '传感类': '#ec4899',
    '处理类': '#10b981',
    '存储类': '#6366f1',
    '其他': '#6b7280',
  };

  const renderStatusBadge = (status: string) => {
    const color = statusColors[status] || statusColors['未知'];
    return (
      <span
        className="px-2 py-0.5 rounded-full text-xs font-medium"
        style={{ backgroundColor: `${color}20`, color, border: `1px solid ${color}40` }}
      >
        {status}
      </span>
    );
  };

  const renderTreeNode = (node: ModuleTreeNode, isLast: boolean = false) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const indent = node.level * 6;

    let iconBg = 'bg-gray-100';
    let iconColor = '#6b7280';
    let NodeIcon = Package;

    if (node.type === 'system') {
      iconBg = 'bg-emerald-100';
      iconColor = '#10b981';
      NodeIcon = Layers;
    } else if (node.type === 'module') {
      iconBg = 'bg-blue-100';
      iconColor = '#3b82f6';
      NodeIcon = Package;
    } else if (node.type === 'component') {
      iconBg = 'bg-purple-100';
      iconColor = '#8b5cf6';
      NodeIcon = Hash;
    }

    const connector = node.level > 0 && (
      <div
        className="absolute"
        style={{
          left: `${indent - 6}px`,
          top: '50%',
          width: '16px',
          height: '1px',
          backgroundColor: '#d1d5db',
        }}
      />
    );

    const isModuleUnlinked = node.type === 'module' && node.data && !node.data.systemId;
    const isComponentUnlinked = node.type === 'component' && node.data && !node.data.moduleId;

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors relative ${
            node.type === 'system' ? 'bg-emerald-50' : ''
          } ${node.type === 'module' ? 'bg-blue-50/50' : ''} ${isModuleUnlinked ? 'bg-amber-50 border border-amber-200' : ''}`}
          style={{ marginLeft: `${indent}px` }}
          onClick={() => node.type === 'module' && navigate(`/modules/${node.id}`)}
        >
          {(isModuleUnlinked || isComponentUnlinked) && (
            <div className="group flex items-center mr-1">
              <Unlink size={12} className="text-amber-500" />
              <span className="absolute left-3 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none" style={{ top: '-24px' }}>
                {isModuleUnlinked ? '未关联到任何系统' : '未关联到任何模块'}
              </span>
            </div>
          )}
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.id);
              }}
              className="p-0.5 hover:bg-gray-200 rounded"
            >
              {isExpanded ? (
                <ChevronDown size={14} className="text-gray-400" />
              ) : (
                <ChevronRight size={14} className="text-gray-400" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-5" />}

          <div className={`p-1.5 rounded-lg ${iconBg}`}>
            <NodeIcon size={14} style={{ color: iconColor }} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium truncate ${node.type === 'system' ? 'text-emerald-700' : 'text-gray-700'}`}>
                {node.name}
              </span>
              {node.status && renderStatusBadge(node.status)}
            </div>
            {node.type === 'module' && node.data && (
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-400">{node.data.moduleNumber}</span>
                {node.data.holder && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="text-xs text-gray-400">{node.data.holder}</span>
                  </>
                )}
              </div>
            )}
            {node.type === 'component' && (
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-xs text-gray-400">{node.data?.componentNumber}</span>
                {node.data?.holder && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="text-xs text-gray-400">{node.data.holder}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {node.type === 'module' && node.data && (
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1 text-gray-400">
                <Package size={12} /> {getComponentsArray(node.data).length}
              </span>
            </div>
          )}

          {node.type === 'module' && (
            <ChevronRight size={14} className="text-gray-300" />
          )}
        </div>

        {hasChildren && isExpanded && (
          <div className="relative">
            <div
              className="absolute border-l border-gray-200"
              style={{ left: `${indent + 8}px`, top: 0, height: '100%' }}
            />
            {node.children.map((child, idx) => renderTreeNode(child, idx === node.children.length - 1))}
          </div>
        )}
      </div>
    );
  };

  if (!system || !project) {
    return (
      <div className={`min-h-screen ${t.bg}`}>
        <div className="max-w-7xl mx-auto p-6">
          <div className={`text-center py-12 ${t.card} rounded-lg`}>
            <p className={t.textMuted}>系统不存在</p>
            <Link to="/projects" className={`mt-4 inline-block ${t.textSecondary} hover:underline`}>返回项目</Link>
          </div>
        </div>
      </div>
    );
  }

  const handleCreateModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleForm.moduleNumber || !moduleForm.moduleName || !moduleForm.category) {
      showToast('请填写必填项', 'error');
      return;
    }
    addModule(project.id, {
      projectId: project.id,
      systemId: system.id,
      ...moduleForm,
      productionOrderNumber: moduleForm.productionOrderNumber || system.productionOrderNumber,
      holder: moduleForm.holder || system.holder,
      status: '未投产',
      stage: system.stage,
      version: system.version || 'v1.0',
      components: [],
      logs: [],
      statusChanges: [],
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
    if (project.categories?.includes(newCategory.trim())) {
      showToast('该种类已存在', 'error');
      return;
    }
    updateProject(project.id, { categories: [...(project.categories || []), newCategory.trim()] });
    showToast('种类添加成功', 'success');
    setNewCategory('');
    setShowCategoryModal(false);
  };

  return (
    <div className={`min-h-screen ${t.bg}`}>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className={`flex items-center gap-2 ${t.textSecondary} hover:${t.text} mb-4 transition-colors`}
          >
            <ArrowLeft size={20} />
            <span>返回</span>
          </button>

          <div className={`${t.card} rounded-xl p-6 border ${t.border}`}>
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className={`text-2xl font-bold ${t.text}`}>{system.systemName}</h1>
                  {renderStatusBadge(system.status)}
                </div>
                <p className={`text-sm ${t.textMuted} mb-4`}>{system.systemNumber}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
                  <div className="flex items-center gap-2">
                    <Hash className={t.textMuted} size={16} />
                    <div>
                      <p className={`text-xs ${t.textMuted}`}>生产指令号</p>
                      <p className={`text-sm font-medium ${t.text}`}>{system.productionOrderNumber || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className={t.textMuted} size={16} />
                    <div>
                      <p className={`text-xs ${t.textMuted}`}>负责人</p>
                      <p className={`text-sm font-medium ${t.text}`}>{system.holder || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Settings className={t.textMuted} size={16} />
                    <div>
                      <p className={`text-xs ${t.textMuted}`}>阶段</p>
                      <p className={`text-sm font-medium ${t.text}`}>{system.stage || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className={t.textMuted} size={16} />
                    <div>
                      <p className={`text-xs ${t.textMuted}`}>版本</p>
                      <p className={`text-sm font-medium ${t.text}`}>{system.version || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Layers className={t.textMuted} size={16} />
                    <div>
                      <p className={`text-xs ${t.textMuted}`}>模块数量</p>
                      <p className={`text-sm font-medium ${t.text}`}>{stats.totalModules}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCategoryModal(true)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}
                >
                  新建种类
                </button>
                <button
                  onClick={() => setShowModuleModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium transition-all hover:shadow-lg cursor-pointer bg-emerald-600 hover:bg-emerald-700"
                >
                  <Plus size={18} />
                  新建模块
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className={`${t.card} rounded-xl p-5 border ${t.border}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-emerald-100">
                <Package className="text-emerald-600" size={20} />
              </div>
              <div>
                <p className={`text-xs ${t.textMuted}`}>直接关联模块</p>
                <p className={`text-xl font-bold ${t.text}`}>{stats.totalModules}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.moduleStatusStats).slice(0, 3).map(([status, count]) => (
                <span key={status} className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: `${statusColors[status]}15`, color: statusColors[status] }}>
                  {status}: {count}
                </span>
              ))}
            </div>
          </div>

          <div className={`${t.card} rounded-xl p-5 border ${t.border}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Layers className="text-blue-600" size={20} />
              </div>
              <div>
                <p className={`text-xs ${t.textMuted}`}>组件总数</p>
                <p className={`text-xl font-bold ${t.text}`}>{stats.totalComponents}</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-1">
                <CheckCircle className="text-emerald-500" size={14} />
                <span className="text-xs text-emerald-600">正常 {stats.normalComponents}</span>
              </div>
              <div className="flex items-center gap-1">
                <AlertTriangle className="text-red-500" size={14} />
                <span className="text-xs text-red-600">故障 {stats.faultComponents}</span>
              </div>
            </div>
          </div>

          <div className={`${t.card} rounded-xl p-5 border ${t.border}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <FolderTree className="text-purple-600" size={20} />
              </div>
              <div>
                <p className={`text-xs ${t.textMuted}`}>种类分布</p>
                <p className={`text-xl font-bold ${t.text}`}>{Object.keys(stats.categoryStats).length}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {Object.keys(stats.categoryStats).slice(0, 3).map((cat) => (
                <span key={cat} className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: `${categoryColors[cat] || '#6b7280'}15`, color: categoryColors[cat] || '#6b7280' }}>
                  {cat}
                </span>
              ))}
            </div>
          </div>

          <div className={`${t.card} rounded-xl p-5 border ${t.border}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <GitBranch className="text-amber-600" size={20} />
              </div>
              <div>
                <p className={`text-xs ${t.textMuted}`}>未关联模块</p>
                <p className={`text-xl font-bold ${t.text}`}>{unlinkedModules.length}</p>
              </div>
            </div>
            <p className={`text-xs ${t.textMuted}`}>项目内其他系统模块</p>
          </div>
        </div>

        <div className={`${t.card} rounded-xl p-6 border ${t.border}`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-100">
                <Network className="text-emerald-600" size={20} />
              </div>
              <div>
                <h3 className={`font-semibold text-lg ${t.text}`}>模块关联视图</h3>
                <p className={`text-xs ${t.textMuted}`}>
                  系统 → {moduleCategories.length - 1} 个种类 → {systemModules.length} 个模块 → {stats.totalComponents} 个组件
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('card')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1 ${
                    viewMode === 'card' ? 'bg-white shadow text-emerald-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <LayoutGrid size={14} />
                  卡片
                </button>
                <button
                  onClick={() => setViewMode('tree')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1 ${
                    viewMode === 'tree' ? 'bg-white shadow text-emerald-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <GitBranch size={14} />
                  树形
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap mb-4">
            <span className={`text-xs ${t.textMuted}`}>种类筛选:</span>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  activeCategory === cat
                    ? 'bg-emerald-600 text-white shadow-md'
                    : `${t.border} ${t.textSecondary} hover:${t.hoverBg}`
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {viewMode === 'tree' ? (
            <div className="border rounded-xl p-4 bg-gray-50/50 max-h-96 overflow-y-auto">
              <div className="space-y-1">
                {renderTreeNode(moduleTree)}
              </div>
            </div>
          ) : (
            <>
              {filteredModules.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 opacity-60">
                  <Package className="mb-4" size={48} style={{ color: 'var(--text-muted)' }} />
                  <p style={{ color: 'var(--text-secondary)' }}>暂无模块</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>点击右上角按钮创建新模块</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredModules.map((module: any) => {
                    const components = getComponentsArray(module);
                    const componentCount = components.length;
                    const normalCount = components.filter((c: any) => c.status === '正常').length;
                    const faultCount = components.filter((c: any) => c.status === '故障').length;
                    const health = componentCount > 0 ? Math.round((normalCount / componentCount) * 100) : 100;
                    const statusColor = statusColors[module.status] || statusColors['未知'];
                    const catColor = categoryColors[module.category] || categoryColors['其他'];

                    return (
                      <div
                        key={module.id}
                        className={`p-4 rounded-xl border ${t.border} ${t.card} hover:shadow-md transition-all cursor-pointer relative ${
                          !module.systemId ? 'bg-amber-50/30 border-amber-200' : ''
                        }`}
                        onClick={() => navigate(`/modules/${module.id}`)}
                      >
                        {!module.systemId && (
                          <div className="absolute top-2 right-2 group flex items-center">
                            <Unlink size={14} className="text-amber-500" />
                            <span className="absolute right-0 top-5 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                              未关联到任何系统
                            </span>
                          </div>
                        )}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: catColor }} />
                              <h4 className={`font-semibold text-sm ${t.text} truncate`}>{module.moduleName}</h4>
                            </div>
                            <p className="text-xs text-gray-400">{module.moduleNumber}</p>
                          </div>
                          {renderStatusBadge(module.status)}
                        </div>

                        <div className="flex items-center gap-3 text-xs">
                          <span className={`flex items-center gap-1 ${t.textMuted}`}>
                            <Package size={12} /> {componentCount}
                          </span>
                          {normalCount > 0 && (
                            <span className="flex items-center gap-1 text-emerald-600">
                              <CheckCircle size={12} /> {normalCount}
                            </span>
                          )}
                          {faultCount > 0 && (
                            <span className="flex items-center gap-1 text-red-600">
                              <AlertTriangle size={12} /> {faultCount}
                            </span>
                          )}
                          <span className={`ml-auto ${t.textMuted}`}>{module.stage}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {unlinkedModules.length > 0 && (
          <div className={`${t.card} rounded-xl p-6 border ${t.border}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-amber-100">
                <AlertTriangle className="text-amber-600" size={20} />
              </div>
              <div>
                <h3 className={`font-semibold text-lg ${t.text}`}>项目内未关联模块</h3>
                <p className={`text-xs ${t.textMuted}`}>
                  以下模块属于该项目但未关联到当前系统
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {unlinkedModules.slice(0, 6).map((module: any) => {
                const otherSystem = project.systems?.find((s: any) => s.id === module.systemId);
                return (
                  <div
                    key={module.id}
                    className={`p-3 rounded-lg border ${t.border} bg-amber-50/30 hover:bg-amber-50/50 transition-colors cursor-pointer`}
                    onClick={() => navigate(`/modules/${module.id}`)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span className={`text-sm font-medium ${t.text} truncate`}>{module.moduleName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">{module.moduleNumber}</span>
                      <span className="text-xs text-amber-600">
                        关联: {otherSystem?.systemName || '未知系统'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            {unlinkedModules.length > 6 && (
              <p className={`text-xs text-center mt-3 ${t.textMuted}`}>
                还有 {unlinkedModules.length - 6} 个未关联模块...
              </p>
            )}
          </div>
        )}
      </div>

      {showModuleModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModuleModal(false)}>
          <div className="rounded-2xl p-6 w-full max-w-md shadow-2xl bg-white" onClick={(e) => e.stopPropagation()}>
            <h2 className={`text-xl font-semibold mb-6 ${t.text}`}>新建模块</h2>
            <form onSubmit={handleCreateModule} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${t.textSecondary}`}>模块编号 *</label>
                <input
                  type="text"
                  value={moduleForm.moduleNumber}
                  onChange={(e) => setModuleForm({ ...moduleForm, moduleNumber: e.target.value })}
                  className={`w-full px-3 py-2.5 border rounded-xl ${t.border} ${t.text} ${t.card} focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all`}
                  placeholder="如: M001"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${t.textSecondary}`}>模块名称 *</label>
                <input
                  type="text"
                  value={moduleForm.moduleName}
                  onChange={(e) => setModuleForm({ ...moduleForm, moduleName: e.target.value })}
                  className={`w-full px-3 py-2.5 border rounded-xl ${t.border} ${t.text} ${t.card} focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all`}
                  placeholder="请输入模块名称"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${t.textSecondary}`}>种类 *</label>
                <select
                  value={moduleForm.category}
                  onChange={(e) => setModuleForm({ ...moduleForm, category: e.target.value })}
                  className={`w-full px-3 py-2.5 border rounded-xl ${t.border} ${t.text} ${t.card} focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all`}
                >
                  <option value="">请选择种类</option>
                  {categories.filter(c => c !== '全部').map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${t.textSecondary}`}>生产指令号</label>
                <input
                  type="text"
                  value={moduleForm.productionOrderNumber || system.productionOrderNumber}
                  onChange={(e) => setModuleForm({ ...moduleForm, productionOrderNumber: e.target.value })}
                  className={`w-full px-3 py-2.5 border rounded-xl ${t.border} ${t.text} ${t.card} focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all`}
                  placeholder={system.productionOrderNumber}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${t.textSecondary}`}>负责人</label>
                <input
                  type="text"
                  value={moduleForm.holder || system.holder}
                  onChange={(e) => setModuleForm({ ...moduleForm, holder: e.target.value })}
                  className={`w-full px-3 py-2.5 border rounded-xl ${t.border} ${t.text} ${t.card} focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all`}
                  placeholder={system.holder}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModuleModal(false)}
                  className={`flex-1 py-2.5 border rounded-xl ${t.border} ${t.textSecondary} hover:${t.hoverBg} transition-all`}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl text-white font-medium transition-all hover:shadow-lg cursor-pointer bg-emerald-600 hover:bg-emerald-700"
                >
                  创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowCategoryModal(false)}>
          <div className="rounded-2xl p-6 w-full max-w-md shadow-2xl bg-white" onClick={(e) => e.stopPropagation()}>
            <h2 className={`text-xl font-semibold mb-6 ${t.text}`}>新建种类</h2>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${t.textSecondary}`}>种类名称</label>
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className={`w-full px-3 py-2.5 border rounded-xl ${t.border} ${t.text} ${t.card} focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all`}
                  placeholder="如: 控制类"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className={`flex-1 py-2.5 border rounded-xl ${t.border} ${t.textSecondary} hover:${t.hoverBg} transition-all`}
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="flex-1 py-2.5 rounded-xl text-white font-medium transition-all hover:shadow-lg cursor-pointer bg-emerald-600 hover:bg-emerald-700"
                >
                  创建
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
