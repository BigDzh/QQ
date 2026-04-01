import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Plus, Package, Settings, Clock, User, Hash, Tag, CheckCircle, XCircle, FileText, Download, Copy, Search } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/Toast';
import { useThemeStyles } from '../hooks/useThemeStyles';
import type { ComponentStatus, Component } from '../types';
import { generateId } from '../utils/auth';
import ModuleStatusBoard from '../components/ModuleStatusBoard';
import { addModuleAuditLog } from '../services/audit';
import { BackButton } from '../components/BackButton';

export default function ModuleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getModule, updateModule, addComponent, updateComponent, currentUser } = useApp();
  const { showToast } = useToast();
  const t = useThemeStyles();
  const [activeTab, setActiveTab] = useState<'overview' | 'components' | 'certificates' | 'logs' | 'designFiles' | 'software'>('overview');
  const [showComponentModal, setShowComponentModal] = useState(false);
  const [showComponentStatusModal, setShowComponentStatusModal] = useState(false);
  const [showComponentReasonModal, setShowComponentReasonModal] = useState(false);
  const [pendingComponent, setPendingComponent] = useState<Component | null>(null);
  const [pendingComponentStatus, setPendingComponentStatus] = useState<ComponentStatus | null>(null);
  const [componentStatusReason, setComponentStatusReason] = useState('');
  const [componentForm, setComponentForm] = useState({
    componentNumber: '',
    componentName: '',
    productionOrderNumber: '',
    holder: '',
    version: 'v1.0',
  });
  const [isEditingComponent, setIsEditingComponent] = useState(false);
  const [editingComponentForm, setEditingComponentForm] = useState({
    componentNumber: '',
    componentName: '',
    productionOrderNumber: '',
    holder: '',
    version: 'v1.0',
    stage: '',
  });
  const [logSearchTerm, setLogSearchTerm] = useState('');

  const moduleData = getModule(id!);
  const { project, module } = moduleData || {};
  const system = project?.systems?.find((s: any) => s.id === module?.systemId);

  if (!project || !module) {
    return (
      <div className={`text-center py-12`}>
        <p className={t.textMuted}>模块不存在</p>
        <Link to="/projects" className={`${t.accentText} hover:underline mt-2 inline-block`}>
          返回项目列表
        </Link>
      </div>
    );
  }

  const handleCreateComponent = (e: React.FormEvent) => {
    e.preventDefault();
    const beforeState = { componentCount: module.components.length };
    addComponent(project.id, module.id, {
      moduleId: module.id,
      ...componentForm,
      status: '未投产',
      logs: [],
      certificates: { pcb: undefined, assembly: undefined, coating: undefined },
    });
    addModuleAuditLog(
      currentUser?.id || '',
      currentUser?.username || currentUser?.name || '未知',
      'CREATE',
      module.id,
      module.moduleName,
      `创建组件: ${componentForm.componentName} (${componentForm.componentNumber})`,
      beforeState,
      { componentCount: beforeState.componentCount + 1, componentName: componentForm.componentName, componentNumber: componentForm.componentNumber, status: '未投产' },
      '用户手动创建组件',
      `用户通过模块详情页组件创建功能执行创建操作`
    );
    showToast('组件创建成功', 'success');
    setShowComponentModal(false);
    setComponentForm({ componentNumber: '', componentName: '', productionOrderNumber: '', holder: '', version: 'v1.0' });
  };

  const handleUpdateComponentProduction = () => {
    if (!pendingComponent) return;
    if (!editingComponentForm.productionOrderNumber.trim()) {
      showToast('投产编号为必填项', 'error');
      return;
    }
    const beforeState = { status: pendingComponent.status, productionOrderNumber: pendingComponent.productionOrderNumber };
    const newLog = {
      id: generateId(),
      action: `组件编辑投产：${editingComponentForm.componentName}`,
      timestamp: new Date().toISOString(),
      userId: currentUser?.id || '',
      username: currentUser?.username || currentUser?.name || '未知',
      details: '组件投产编辑',
    };
    updateComponent(project.id, module.id, pendingComponent.id, {
      componentNumber: editingComponentForm.componentNumber,
      componentName: editingComponentForm.componentName,
      productionOrderNumber: editingComponentForm.productionOrderNumber,
      holder: editingComponentForm.holder,
      version: editingComponentForm.version,
      stage: editingComponentForm.stage,
      status: '投产中',
      logs: [...(pendingComponent.logs || []), newLog],
    });
    addModuleAuditLog(
      currentUser?.id || '',
      currentUser?.username || currentUser?.name || '未知',
      'UPDATE',
      module.id,
      module.moduleName,
      `组件投产: ${editingComponentForm.componentName}`,
      beforeState,
      { status: '投产中', productionOrderNumber: editingComponentForm.productionOrderNumber },
      '组件正式投产',
      `用户通过模块详情页执行组件投产操作，投产编号: ${editingComponentForm.productionOrderNumber}`
    );
    showToast('组件投产成功，状态已更新为投产中', 'success');
    setIsEditingComponent(false);
    setPendingComponent(null);
    setEditingComponentForm({ componentNumber: '', componentName: '', productionOrderNumber: '', holder: '', version: 'v1.0', stage: '' });
  };

  const handleComponentStatusClick = (component: Component, newStatus: ComponentStatus) => {
    setPendingComponent(component);
    setPendingComponentStatus(newStatus);
    setComponentStatusReason('');
    setShowComponentStatusModal(false);
    setShowComponentReasonModal(true);
  };

  const handleComponentStatusChangeWithReason = () => {
    if (!pendingComponent || !pendingComponentStatus) return;

    if (!componentStatusReason.trim()) {
      showToast('请输入状态变更原因（必填）', 'error');
      return;
    }

    const beforeState = { status: pendingComponent.status };
    updateComponent(project.id, module.id, pendingComponent.id, {
      status: pendingComponentStatus,
      statusChangeReason: componentStatusReason,
    });
    addModuleAuditLog(
      currentUser?.id || '',
      currentUser?.username || currentUser?.name || '未知',
      'UPDATE',
      module.id,
      module.moduleName,
      `组件状态变更: ${pendingComponent.componentName} 从 ${pendingComponent.status} 变更为 ${pendingComponentStatus}`,
      beforeState,
      { status: pendingComponentStatus },
      componentStatusReason,
      `用户通过模块详情页状态变更功能执行状态变更操作`
    );

    showToast(`组件状态已从 ${pendingComponent.status} 变更为 ${pendingComponentStatus}`, 'success');
    setShowComponentReasonModal(false);
    setPendingComponent(null);
    setPendingComponentStatus(null);
    setComponentStatusReason('');
  };

  const getComponentStats = () => {
    const total = module.components.length;
    const normal = module.components.filter((c) => c.status === '正常').length;
    const fault = module.components.filter((c) => c.status === '故障').length;
    return { total, normal, fault };
  };

  const stats = getComponentStats();
  const canEdit = currentUser?.role !== 'viewer';

  const tabs = [
    { id: 'overview', label: '概览' },
    { id: 'components', label: `组件 (${module.components.length})` },
    { id: 'certificates', label: '证书' },
    { id: 'logs', label: '日志' },
    { id: 'designFiles', label: '设计文件' },
    { id: 'software', label: '软件' },
  ];

  return (
    <div>
      <div className="mb-6">
        <BackButton className="mb-4" />
        <div className="flex justify-between items-start">
          <div>
            <h1 className={`text-2xl font-bold ${t.text}`}>{module.moduleName}</h1>
            <p className={t.textMuted}>{module.moduleNumber}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${t.statusColors[module.status as keyof typeof t.statusColors] || t.statusColors.故障}`}>
              {module.status}
            </span>
          </div>
        </div>
      </div>

      <div className={`${t.card} rounded-lg shadow-sm p-4 mb-6 border ${t.border}`}>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="flex items-center gap-3">
            <Tag className={t.textMuted} size={20} />
            <div>
              <div className={`text-sm ${t.textMuted}`}>生产指令号</div>
              <div className={`font-medium ${t.text}`}>{module.productionOrderNumber || '-'}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Hash className={t.textMuted} size={20} />
            <div>
              <div className={`text-sm ${t.textMuted}`}>版本</div>
              <div className={`font-medium ${t.text}`}>{module.version}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Settings className={t.textMuted} size={20} />
            <div>
              <div className={`text-sm ${t.textMuted}`}>阶段</div>
              <div className={`font-medium ${t.text}`}>{module.stage}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <User className={t.textMuted} size={20} />
            <div>
              <div className={`text-sm ${t.textMuted}`}>负责人</div>
              <div className={`font-medium ${t.text}`}>{module.holder || '-'}</div>
            </div>
          </div>
          {system && (
            <div className="flex items-center gap-3">
              <Package className={t.textMuted} size={20} />
              <div>
                <div className={`text-sm ${t.textMuted}`}>所属系统</div>
                <Link to={`/systems/${system.id}`} className={`font-medium ${t.accentText} hover:underline`}>
                  {system.systemName}
                </Link>
                <span className={`text-xs ${t.textMuted} ml-1`}>({system.systemNumber})</span>
              </div>
            </div>
          )}
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
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className={`${t.card} rounded-lg shadow-sm p-6 border ${t.border}`}>
              <div className={`text-sm ${t.textMuted} mb-1`}>模块种类</div>
              <div className={`text-xl font-bold ${t.text}`}>{module.category}</div>
            </div>
            <div className={`${t.card} rounded-lg shadow-sm p-6 border ${t.border}`}>
              <div className={`text-sm ${t.textMuted} mb-1`}>组件总数</div>
              <div className={`text-xl font-bold ${t.accentText}`}>{stats.total}</div>
            </div>
            <div className={`${t.card} rounded-lg shadow-sm p-6 border ${t.border}`}>
              <div className={`text-sm ${t.textMuted} mb-1`}>正常/故障</div>
              <div className="text-xl font-bold">
                <span className="text-emerald-400">{stats.normal}</span>
                {' / '}
                <span className="text-red-400">{stats.fault}</span>
              </div>
            </div>
          </div>

          <ModuleStatusBoard
            components={module.components || []}
            moduleName={module.moduleName}
            moduleId={module.id}
            projectId={project.id}
            canEdit={canEdit}
            onComponentClick={(component) => {
              if (!canEdit) {
                showToast('您没有权限修改组件状态', 'warning');
                return;
              }
              if (component.status === '未投产') {
                setPendingComponent(component);
                setEditingComponentForm({
                  componentNumber: component.componentNumber || '',
                  componentName: component.componentName || '',
                  productionOrderNumber: component.productionOrderNumber || '',
                  holder: component.holder || '',
                  version: component.version || 'v1.0',
                  stage: component.stage || '',
                });
                setIsEditingComponent(true);
              } else {
                setPendingComponent(component);
                setShowComponentStatusModal(true);
              }
            }}
          />
        </div>
      )}

      {activeTab === 'components' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className={`text-lg font-semibold ${t.text}`}>组件列表</h2>
            {canEdit && (
              <button
                onClick={() => {
                  setComponentForm({
                    componentNumber: '',
                    componentName: '',
                    productionOrderNumber: module.productionOrderNumber || '',
                    holder: module.holder || '',
                    version: 'v1.0',
                  });
                  setShowComponentModal(true);
                }}
                className={`flex items-center gap-2 px-4 py-2 ${t.button} rounded-lg`}
              >
                <Plus size={18} />
                新建组件
              </button>
            )}
          </div>

          {module.components.length === 0 ? (
            <div className={`text-center py-12 ${t.card} rounded-lg border ${t.border}`}>
              <Package className={`mx-auto ${t.textMuted} mb-4`} size={48} />
              <p className={t.textMuted}>暂无组件</p>
            </div>
          ) : (
            <div className={`${t.card} rounded-lg shadow-sm overflow-hidden border ${t.border}`}>
              <table className="w-full">
                <thead className={t.tableHeader}>
                  <tr>
                    <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>组件编号</th>
                    <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>组件名称</th>
                    <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>生产指令号</th>
                    <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>阶段</th>
                    <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>状态</th>
                  </tr>
                </thead>
                <tbody>
                  {module.components.map((component) => (
                    <tr
                      key={component.id}
                      onClick={() => navigate(`/components/${component.id}`)}
                      className={`border-t ${t.border} ${t.hoverBg} cursor-pointer`}
                    >
                      <td className={`px-4 py-3`}>
                        <Link to={`/components/${component.id}`} className={`${t.accentText} hover:underline`}>
                          {component.componentNumber}
                        </Link>
                      </td>
                      <td className={`px-4 py-3`}>
                        <Link to={`/components/${component.id}`} className={`${t.accentText} hover:underline`}>
                          {component.componentName}
                        </Link>
                      </td>
                      <td className={`px-4 py-3 ${t.textSecondary}`}>{component.productionOrderNumber || '-'}</td>
                      <td className={`px-4 py-3 ${t.textSecondary}`}>{component.stage || '-'}</td>
                      <td className="px-4 py-3">
                        {canEdit ? (
                          <button
                            onClick={() => {
                              setPendingComponent(component);
                              setShowComponentStatusModal(true);
                            }}
                            className={`px-2 py-1 rounded text-xs transition-colors ${
                              t.statusColors[component.status as keyof typeof t.statusColors] || t.statusColors.故障
                            }`}
                          >
                            {component.status}
                          </button>
                        ) : (
                          <span className={`px-2 py-1 rounded text-xs ${
                            t.statusColors[component.status as keyof typeof t.statusColors] || t.statusColors.故障
                          }`}>
                            {component.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'certificates' && (
        <div className={`${t.card} rounded-lg shadow-sm p-6 border ${t.border}`}>
          <h3 className={`text-lg font-semibold ${t.text} mb-4`}>证书签署状态</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-4 border rounded-lg ${t.border}`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`font-medium ${t.text}`}>装配合格证</span>
                {module.assemblyCertificate?.status === '已签署' ? (
                  <span className={`flex items-center gap-1 ${t.success}`}>
                    <CheckCircle size={18} /> 已签署
                  </span>
                ) : (
                  <span className={`flex items-center gap-1 ${t.textMuted}`}>
                    <XCircle size={18} /> 未签署
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className={`text-sm ${t.textMuted}`}>证书号</label>
                  {canEdit ? (
                    <input
                      type="text"
                      value={module.assemblyCertificate?.certificateNumber || ''}
                      onChange={(e) => {
                        updateModule(project.id, module.id, {
                          assemblyCertificate: {
                            status: module.assemblyCertificate?.status || '未签署',
                            signedAt: module.assemblyCertificate?.signedAt,
                            signedBy: module.assemblyCertificate?.signedBy,
                            certificateNumber: e.target.value,
                          },
                        });
                      }}
                      placeholder="请输入证书号"
                      className={`w-full px-3 py-1.5 border rounded-lg ${t.input} mt-1`}
                    />
                  ) : (
                    <div className={`font-medium ${t.text} mt-1`}>
                      {module.assemblyCertificate?.certificateNumber || '-'}
                    </div>
                  )}
                </div>
                {module.assemblyCertificate?.certificateNumber && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(module.assemblyCertificate?.certificateNumber || '');
                      showToast('证书号已复制', 'success');
                    }}
                    className={`mt-5 p-2 border rounded-lg hover:${t.hoverBg} ${t.border}`}
                    title="复制证书号"
                  >
                    <Copy size={16} className={t.textSecondary} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className={`${t.card} rounded-lg shadow-sm p-6 border ${t.border}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-semibold ${t.text}`}>操作日志</h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${t.textMuted}`} />
                <input
                  type="text"
                  value={logSearchTerm}
                  onChange={(e) => setLogSearchTerm(e.target.value)}
                  placeholder="搜索日志..."
                  className={`pl-9 pr-3 py-1.5 border rounded-lg ${t.input} text-sm w-48`}
                />
              </div>
              <button
                onClick={() => {
                  const logsToExport = module.logs
                    .filter(log => !logSearchTerm || log.action.toLowerCase().includes(logSearchTerm.toLowerCase()) || log.username.toLowerCase().includes(logSearchTerm.toLowerCase()))
                    .map(log => `${new Date(log.timestamp).toLocaleString()}\t${log.username}\t${log.action}`)
                    .join('\n');
                  const csv = `时间\t用户\t操作\n${logsToExport}`;
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `模块日志_${module.moduleNumber || module.moduleName}_${new Date().toISOString().split('T')[0]}.csv`;
                  link.click();
                  URL.revokeObjectURL(url);
                  showToast('日志已导出', 'success');
                }}
                className={`px-3 py-1.5 border rounded-lg ${t.button} text-sm flex items-center gap-1.5`}
              >
                <Download size={14} /> 导出
              </button>
            </div>
          </div>
          {module.logs.length === 0 ? (
            <p className={`${t.textMuted} text-center py-8`}>暂无日志</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {module.logs
                .filter(log => !logSearchTerm || log.action.toLowerCase().includes(logSearchTerm.toLowerCase()) || log.username.toLowerCase().includes(logSearchTerm.toLowerCase()))
                .map((log) => (
                <div key={log.id} className={`flex items-start gap-3 p-3 rounded-lg ${t.emptyBg}`}>
                  <Clock size={16} className={`${t.textMuted} mt-1`} />
                  <div className="flex-1">
                    <div className={`text-sm ${t.text}`}>{log.action}</div>
                    {log.details && log.details !== '无' && (
                      <div className={`text-xs ${t.textSecondary} mt-1`}>
                        原因: {log.details}
                      </div>
                    )}
                    <div className={`text-xs ${t.textMuted}`}>
                      {log.username} · {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'designFiles' && (
        <div>
          <h2 className={`text-lg font-semibold ${t.text} mb-4`}>设计文件</h2>
          {module.designFiles && module.designFiles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {module.designFiles.map((df: any) => (
                <div key={df.id} className={`${t.card} rounded-lg shadow-sm border ${t.border} overflow-hidden`}>
                  <div className={`p-4 border-b ${t.border}`}>
                    <div className="flex items-center gap-2">
                      {df.type === '装配图' ? (
                        df.category === 'module' ? (
                          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Package size={16} className="text-blue-600" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                            <FileText size={16} className="text-green-600" />
                          </div>
                        )
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                          <FileText size={16} className="text-purple-600" />
                        </div>
                      )}
                      <div>
                        <div className={`font-medium ${t.text}`}>{df.name}</div>
                        <div className={`text-xs ${t.textMuted}`}>{df.type}</div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <div>
                        <span className={t.textMuted}>格式:</span>
                        <span className={`ml-1 ${t.text}`}>{df.format}</span>
                      </div>
                      <div>
                        <span className={t.textMuted}>版本:</span>
                        <span className={`ml-1 ${t.text}`}>{df.version}</span>
                      </div>
                      <div>
                        <span className={t.textMuted}>阶段:</span>
                        <span className={`ml-1 ${t.text}`}>{df.stage}</span>
                      </div>
                      <div>
                        <span className={t.textMuted}>大小:</span>
                        <span className={`ml-1 ${t.text}`}>{df.fileSize ? `${(df.fileSize / 1024).toFixed(1)} KB` : '-'}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {df.fileUrl && (
                        <button
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = df.fileUrl;
                            link.download = df.name || '设计文件';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 ${t.button} rounded text-xs`}
                        >
                          <Download size={12} />
                          URL下载
                        </button>
                      )}
                      {df.data && (
                        <button
                          onClick={() => {
                            const blob = new Blob([df.data], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${df.name}.txt`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                          className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 ${t.button} rounded text-xs`}
                        >
                          <Download size={12} />
                          数据下载
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={`text-center py-12 ${t.card} rounded-lg border ${t.border}`}>
              <FileText className={`mx-auto ${t.textMuted} mb-4`} size={48} />
              <p className={t.textMuted}>暂无设计文件</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'software' && (
        <div>
          <h2 className={`text-lg font-semibold ${t.text} mb-4`}>软件列表</h2>
          {module.components && module.components.length > 0 ? (
            <div className="space-y-4">
              {module.components.flatMap((comp: any) =>
                (comp.adaptedSoftware || [])?.map((sw: any) => (
                  <div key={`${comp.id}-${sw.id}`} className={`${t.card} rounded-lg shadow-sm border ${t.border} p-4`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                          <Package size={20} className="text-indigo-600" />
                        </div>
                        <div>
                          <div className={`font-medium ${t.text}`}>{sw.name}</div>
                          <div className={`text-sm ${t.textMuted}`}>{sw.version}</div>
                        </div>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs ${
                        sw.status === '已完成' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {sw.status}
                      </div>
                    </div>
                    {comp.componentName && (
                      <div className={`mt-2 text-sm ${t.textSecondary}`}>
                        适配组件: {comp.componentName}
                      </div>
                    )}
                  </div>
                )) || []
              )}
            </div>
          ) : (
            <div className={`text-center py-12 ${t.card} rounded-lg border ${t.border}`}>
              <Package className={`mx-auto ${t.textMuted} mb-4`} size={48} />
              <p className={t.textMuted}>暂无软件信息</p>
            </div>
          )}
        </div>
      )}

      {showComponentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowComponentModal(false)}>
          <div className={`${t.modalBg} rounded-lg p-6 w-full max-w-md border ${t.modalBorder}`} onClick={(e) => e.stopPropagation()}>
            <h2 className={`text-xl font-semibold mb-4 ${t.text}`}>新建组件</h2>
            <form onSubmit={handleCreateComponent} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>组件编号</label>
                <input
                  type="text"
                  value={componentForm.componentNumber}
                  onChange={(e) => setComponentForm({ ...componentForm, componentNumber: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                  required
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>组件名称</label>
                <input
                  type="text"
                  value={componentForm.componentName}
                  onChange={(e) => setComponentForm({ ...componentForm, componentName: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                  required
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>生产指令号</label>
                <input
                  type="text"
                  value={componentForm.productionOrderNumber}
                  onChange={(e) => setComponentForm({ ...componentForm, productionOrderNumber: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>负责人</label>
                <input
                  type="text"
                  value={componentForm.holder}
                  onChange={(e) => setComponentForm({ ...componentForm, holder: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>版本</label>
                <input
                  type="text"
                  value={componentForm.version}
                  onChange={(e) => setComponentForm({ ...componentForm, version: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowComponentModal(false)} className={`flex-1 py-2 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}>
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

      {showComponentStatusModal && pendingComponent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowComponentStatusModal(false)}>
          <div className={`${t.modalBg} rounded-lg p-6 w-full max-w-md border ${t.modalBorder}`} onClick={(e) => e.stopPropagation()}>
            <h2 className={`text-xl font-semibold mb-2 ${t.text}`}>更改组件状态</h2>
            <p className={`text-sm ${t.textMuted} mb-4`}>请选择新的状态（需填写变更原因）</p>
            <div className={`p-4 rounded-lg mb-4 ${t.emptyBg}`}>
              <div className={`text-sm ${t.textSecondary} mb-1`}>组件：<span className={`font-medium ${t.text}`}>{pendingComponent.componentName}</span></div>
              <div className={`text-sm ${t.textSecondary} mb-1`}>编号：<span className={`font-medium ${t.text}`}>{pendingComponent.componentNumber}</span></div>
              <div className={`text-sm ${t.textSecondary}`}>当前状态：<span className={`font-medium ${t.text}`}>{pendingComponent.status}</span></div>
            </div>
            <div className="mb-2">
              <div className={`text-xs ${t.textMuted} mb-2`}>选择新状态：</div>
              <div className="grid grid-cols-3 gap-2">
                {Object.keys(t.statusColors).map((status) => {
                  const isSelected = status === pendingComponent.status;
                  const isDisabled = status === '未投产';
                  return (
                    <button
                      key={status}
                      disabled={isDisabled || isSelected}
                      onClick={() => !isDisabled && !isSelected && handleComponentStatusClick(pendingComponent, status as ComponentStatus)}
                      className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                        isSelected
                          ? `${t.statusColors[status as keyof typeof t.statusColors]} ${t.statusColors[status as keyof typeof t.statusColors].split(' ')[0].replace('bg-', 'text-')} border-current opacity-60`
                          : isDisabled
                            ? `${t.border} ${t.textMuted} opacity-40 cursor-not-allowed`
                            : `${t.border} hover:${t.hoverBg} ${t.textSecondary} cursor-pointer hover:scale-105`
                      }`}
                      title={isDisabled ? '请通过编辑投产功能更改此状态' : ''}
                    >
                      {status}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className={`text-xs ${t.textMuted} mt-4 text-center`}>
              💡 提示：点击状态按钮后将要求填写变更原因
            </div>
          </div>
        </div>
      )}

      {isEditingComponent && pendingComponent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { setIsEditingComponent(false); setPendingComponent(null); }}>
          <div className={`${t.modalBg} rounded-lg p-6 w-full max-w-md border ${t.modalBorder}`} onClick={(e) => e.stopPropagation()}>
            <h2 className={`text-xl font-semibold mb-4 ${t.text}`}>编辑组件</h2>
            <div className={`p-4 rounded-lg mb-4 ${t.emptyBg}`}>
              <div className={`text-sm ${t.textSecondary} mb-1`}>将组件状态更新为：<span className="font-medium text-blue-500">投产中</span></div>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleUpdateComponentProduction(); }} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>组件编号</label>
                <input
                  type="text"
                  value={editingComponentForm.componentNumber}
                  onChange={(e) => setEditingComponentForm({ ...editingComponentForm, componentNumber: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>组件名称</label>
                <input
                  type="text"
                  value={editingComponentForm.componentName}
                  onChange={(e) => setEditingComponentForm({ ...editingComponentForm, componentName: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>阶段</label>
                <input
                  type="text"
                  value={editingComponentForm.stage}
                  onChange={(e) => setEditingComponentForm({ ...editingComponentForm, stage: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>版本</label>
                <input
                  type="text"
                  value={editingComponentForm.version}
                  onChange={(e) => setEditingComponentForm({ ...editingComponentForm, version: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>负责人</label>
                <input
                  type="text"
                  value={editingComponentForm.holder}
                  onChange={(e) => setEditingComponentForm({ ...editingComponentForm, holder: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>投产编号 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={editingComponentForm.productionOrderNumber}
                  onChange={(e) => setEditingComponentForm({ ...editingComponentForm, productionOrderNumber: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                  placeholder="必填项"
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setIsEditingComponent(false); setPendingComponent(null); }} className={`flex-1 py-2 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}>
                  取消
                </button>
                <button type="submit" className={`flex-1 py-2 ${t.button} rounded-lg`}>
                  确认投产
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showComponentReasonModal && pendingComponent && pendingComponentStatus && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowComponentReasonModal(false)}>
          <div className={`${t.modalBg} rounded-lg p-6 w-full max-w-md border ${t.modalBorder}`} onClick={(e) => e.stopPropagation()}>
            <h2 className={`text-xl font-semibold mb-2 ${t.text}`}>填写状态变更原因</h2>
            <p className={`text-sm ${t.textMuted} mb-4`}>每次状态变更必须记录原因，以便追溯</p>
            <div className={`p-4 rounded-lg mb-4 ${t.emptyBg}`}>
              <div className={`text-sm ${t.textSecondary} mb-1`}>组件：<span className={`font-medium ${t.text}`}>{pendingComponent.componentName}</span></div>
              <div className={`text-sm ${t.textSecondary} mb-1`}>编号：<span className={`font-medium ${t.text}`}>{pendingComponent.componentNumber}</span></div>
              <div className={`text-sm ${t.textSecondary}`}>状态变更：<span className="font-medium text-red-500">{pendingComponent.status}</span> → <span className="font-medium text-green-500">{pendingComponentStatus}</span></div>
            </div>
            <div className="mb-2">
              <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>
                变更原因 <span className="text-red-500">*必填</span>
              </label>
              <textarea
                value={componentStatusReason}
                onChange={(e) => setComponentStatusReason(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg ${t.input} focus:ring-2 focus:ring-cyan-500/30`}
                rows={3}
                placeholder="请详细描述状态变更的原因..."
                autoFocus
              />
            </div>
            <div className={`text-xs ${t.textMuted} mb-4`}>
              提示：常见原因包括：设备故障维修、定期维护检测、安全检查、三防处理、软件升级等
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowComponentReasonModal(false)}
                className={`flex-1 py-2 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleComponentStatusChangeWithReason}
                disabled={!componentStatusReason.trim()}
                className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                  componentStatusReason.trim()
                    ? `${t.button} bg-cyan-600 hover:bg-cyan-700 text-white`
                    : `${t.button} opacity-50 cursor-not-allowed`
                }`}
              >
                确认变更
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
