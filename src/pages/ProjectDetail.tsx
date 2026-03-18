import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, FileText, Package, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/Toast';
import { useThemeStyles } from '../hooks/useThemeStyles';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { getProject, addModule, currentUser } = useApp();
  const { showToast } = useToast();
  const t = useThemeStyles();
  const [activeTab, setActiveTab] = useState<'overview' | 'modules' | 'documents' | 'software'>('overview');
  const [showModuleModal, setShowModuleModal] = useState(false);
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

    return {
      totalModules,
      totalComponents,
      normalRate: totalComponents > 0 ? Math.round((normalComponents / totalComponents) * 100) : 0,
      faultRate: totalComponents > 0 ? Math.round((faultComponents / totalComponents) * 100) : 0,
      documentsCompleted,
      documentsTotal: project.documents.length,
      softwareCompleted,
      softwareTotal: project.software.length,
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
    </div>
  );
}
