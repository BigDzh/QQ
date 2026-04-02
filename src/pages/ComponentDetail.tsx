import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Hash, Tag, User, Settings, Clock, CheckCircle, XCircle, Plus, Trash2, FileText, Download, Copy, Search, Edit2, Save, X, AlertTriangle, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { generateId } from '../utils/auth';
import { useToast } from '../components/Toast';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { useShortcuts } from '../hooks/useShortcuts';
import { EnhancedComponentStatusModal } from './ProjectDetail/components/EnhancedComponentStatusModal';
import { addAuditLog } from '../services/audit';
import type { ComponentStatus } from '../types';
import { getDefaultStageForEntity } from '../services/stageConfig';

export default function ComponentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getComponent, updateComponent, currentUser } = useApp();
  const { showToast } = useToast();
  const t = useThemeStyles();
  const [activeTab, setActiveTab] = useState<'overview' | 'certificates' | 'software' | 'logs' | 'designFiles'>('overview');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<ComponentStatus | null>(null);
  const [statusReason, setStatusReason] = useState('');
  const [showSoftwareModal, setShowSoftwareModal] = useState(false);
  const [enhancedStatusModal, setEnhancedStatusModal] = useState(false);
  const [softwareForm, setSoftwareForm] = useState({ name: '', version: '' });
  const [logSearchTerm, setLogSearchTerm] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [clearResult, setClearResult] = useState<{ success: boolean; message: string } | null>(null);

  const [isEditingComponent, setIsEditingComponent] = useState(false);
  const [editComponentForm, setEditComponentForm] = useState({
    componentName: '',
    componentNumber: '',
    productionOrderNumber: '',
    holder: '',
    version: '',
    stage: getDefaultStageForEntity('component'),
    status: '',
  });
  const [componentFormErrors, setComponentFormErrors] = useState<Record<string, string>>({});

  const componentData = getComponent(id!);
  const { project, module, component } = componentData || {};

  if (!project || !module || !component) {
    return (
      <div className={`text-center py-12`}>
        <p className={t.textMuted}>组件不存在</p>
        <Link to="/projects" className={`${t.accentText} hover:underline mt-2 inline-block`}>
          返回项目列表
        </Link>
      </div>
    );
  }

  const extractOrderNumber = (status: string): string => {
    if (!component.statusChanges) return '-';
    const change = component.statusChanges.find((c: any) => c.toStatus === status);
    if (!change?.reason) return '-';
    const match = change.reason.match(/\d+/);
    return match ? match[0] : '-';
  };

  const productionOrderNum = extractOrderNumber('投产中');
  const testOrderNum = extractOrderNumber('测试中');
  const protectionOrderNum = extractOrderNumber('三防中');
  const repairOrderNum = extractOrderNumber('维修中');

  const handleStatusChange = (newStatus: ComponentStatus) => {
    if (newStatus === '未投产') {
      showToast('请通过编辑投产功能更改此状态', 'warning');
      return;
    }
    setPendingStatus(newStatus);
    setStatusReason('');
    setShowStatusModal(false);
    setShowReasonModal(true);
  };

  const handleStatusChangeWithReason = () => {
    if (!pendingStatus) return;

    if (!statusReason.trim()) {
      showToast('请输入状态变更原因（必填）', 'error');
      return;
    }

    updateComponent(project.id, module.id, component.id, {
      status: pendingStatus,
      statusChangeReason: statusReason,
    });
    showToast(`组件状态已从 ${component.status} 变更为 ${pendingStatus}`, 'success');
    setShowReasonModal(false);
    setPendingStatus(null);
    setStatusReason('');
  };

  const handleEnhancedStatusChange = async (
    componentId: string,
    moduleId: string,
    newStatus: ComponentStatus,
    reason: string
  ): Promise<{ success: boolean; error?: string; errorType?: 'network' | 'permission' | 'validation' | 'unknown' }> => {
    if (currentUser?.role === 'viewer') {
      return { success: false, error: '您没有权限更改组件状态', errorType: 'permission' };
    }

    if (!reason.trim()) {
      return { success: false, error: '请输入状态变更原因', errorType: 'validation' };
    }

    try {
      updateComponent(project.id, module.id, component.id, {
        status: newStatus,
        statusChangeReason: reason,
      });

      showToast(`组件状态已从 ${component.status} 变更为 ${newStatus}`, 'success');
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '状态变更失败',
        errorType: 'network'
      };
    }
  };

  const handleAddSoftware = (e: React.FormEvent) => {
    e.preventDefault();
    const newSoftware = {
      id: Date.now().toString(),
      softwareId: Date.now().toString(),
      softwareName: softwareForm.name,
      softwareVersion: softwareForm.version,
      burnedAt: new Date().toISOString(),
      burnedBy: currentUser?.name || '未知',
    };
    const currentSoftware = component.burnedSoftware || [];
    const newLog = {
      id: generateId(),
      action: `添加烧录软件：${softwareForm.name} ${softwareForm.version}`,
      timestamp: new Date().toISOString(),
      userId: currentUser?.id || '',
      username: currentUser?.username || currentUser?.name || '未知',
    };
    updateComponent(project.id, module.id, component.id, {
      burnedSoftware: [...currentSoftware, newSoftware],
      logs: [...component.logs, newLog],
    });
    showToast('烧录软件添加成功', 'success');
    setShowSoftwareModal(false);
    setSoftwareForm({ name: '', version: '' });
  };

  const handleRemoveSoftware = (softwareId: string) => {
    const currentSoftware = component.burnedSoftware || [];
    const software = currentSoftware.find((s: any) => s.id === softwareId);
    const filtered = currentSoftware.filter((s: any) => s.id !== softwareId);
    const newLog = {
      id: generateId(),
      action: `移除烧录软件：${software?.softwareName || ''} ${software?.softwareVersion || ''}`,
      timestamp: new Date().toISOString(),
      userId: currentUser?.id || '',
      username: currentUser?.username || currentUser?.name || '未知',
    };
    updateComponent(project.id, module.id, component.id, {
      burnedSoftware: filtered,
      logs: [...component.logs, newLog],
    });
    showToast('软件已移除', 'success');
  };

  const hasDesignFiles = component.designFiles && component.designFiles.length > 0;

  const handleClearDesignFiles = useCallback(async () => {
    if (!hasDesignFiles) return;

    setIsClearing(true);
    setClearResult(null);

    const fileCount = component.designFiles.length;
    const beforeState = { designFilesCount: fileCount, designFiles: component.designFiles.map((df: any) => ({ id: df.id, name: df.name })) };

    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      updateComponent(project.id, module.id, component.id, {
        designFiles: [],
      });

      const newLog = {
        id: generateId(),
        action: `清除设计文件：删除了 ${fileCount} 个设计文件`,
        timestamp: new Date().toISOString(),
        userId: currentUser?.id || '',
        username: currentUser?.username || currentUser?.name || '未知',
      };

      updateComponent(project.id, module.id, component.id, {
        logs: [...(component.logs || []), newLog],
      });

      if (currentUser) {
        addAuditLog(
          currentUser.id,
          currentUser.username,
          'DELETE',
          'WARNING',
          'Component',
          component.id,
          component.componentName,
          `清除设计文件：删除了 ${fileCount} 个设计文件`,
          beforeState,
          { designFilesCount: 0, designFiles: [] },
          '用户主动清除设计文件'
        );
      }

      setClearResult({ success: true, message: `成功清除 ${fileCount} 个设计文件` });
      showToast(`成功清除 ${fileCount} 个设计文件`, 'success');
      setShowClearConfirm(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '清除失败';
      setClearResult({ success: false, message: errorMessage });
      showToast(`清除失败：${errorMessage}`, 'error');

      if (currentUser) {
        addAuditLog(
          currentUser.id,
          currentUser.username,
          'DELETE',
          'ERROR',
          'Component',
          component.id,
          component.componentName,
          `清除设计文件失败：${errorMessage}`,
          beforeState,
          null,
          '用户主动清除设计文件'
        );
      }
    } finally {
      setIsClearing(false);
    }
  }, [hasDesignFiles, component, project, module, currentUser, updateComponent, showToast, showClearConfirm]);

  const handleClearWithShortcut = useCallback(() => {
    if (!hasDesignFiles || isClearing) return;
    setShowClearConfirm(true);
  }, [hasDesignFiles, isClearing]);

  useShortcuts({
    handlers: [
      { action: 'clearDesignFiles', handler: handleClearWithShortcut },
    ],
    enabled: activeTab === 'designFiles' && hasDesignFiles && !showClearConfirm && !isClearing,
  });

  const handleOpenComponentEdit = () => {
    setEditComponentForm({
      componentName: component.componentName || '',
      componentNumber: component.componentNumber || '',
      productionOrderNumber: component.productionOrderNumber || '',
      holder: component.holder || '',
      version: component.version || '',
      stage: component.stage || '',
      status: component.status || '未投产',
    });
    setComponentFormErrors({});
    setIsEditingComponent(true);
  };

  const validateComponentForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!editComponentForm.componentName.trim()) {
      errors.componentName = '组件名称不能为空';
    }

    if (!editComponentForm.componentNumber.trim()) {
      errors.componentNumber = '组件编号不能为空';
    }

    setComponentFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveComponentEdit = () => {
    if (!validateComponentForm()) {
      showToast('请填写必填项', 'error');
      return;
    }

    try {
      const beforeState = {
        componentName: component.componentName,
        componentNumber: component.componentNumber,
        status: component.status,
        productionOrderNumber: component.productionOrderNumber,
      };

      updateComponent(project.id, module.id, component.id, editComponentForm);

      const newLog = {
        id: generateId(),
        action: `编辑组件信息：${component.componentName} → ${editComponentForm.componentName}`,
        timestamp: new Date().toISOString(),
        userId: currentUser?.id || '',
        username: currentUser?.username || currentUser?.name || '未知',
        details: `用户通过组件详情页执行组件信息编辑操作`,
      };

      updateComponent(project.id, module.id, component.id, {
        ...editComponentForm,
        logs: [...(component.logs || []), newLog],
      });

      showToast('组件信息更新成功', 'success');
      setIsEditingComponent(false);
      setComponentFormErrors({});
    } catch (error) {
      showToast('保存失败，请重试', 'error');
      console.error('保存组件信息失败:', error);
    }
  };

  const handleCancelComponentEdit = () => {
    setIsEditingComponent(false);
    setComponentFormErrors({});
  };

  const canEdit = currentUser?.role !== 'viewer';

  const tabs = [
    { id: 'overview', label: '概览' },
    { id: 'certificates', label: '证书' },
    { id: 'software', label: `烧录软件 (${component.burnedSoftware?.length || 0})` },
    { id: 'designFiles', label: '设计文件' },
    { id: 'logs', label: '日志' },
  ];

  return (
    <div>
      <div className="mb-6">
        <button onClick={() => navigate(-1)} className={`flex items-center gap-2 ${t.textSecondary} hover:${t.text} mb-4`}>
          <ArrowLeft size={20} />
          返回
        </button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className={`text-2xl font-bold ${t.text}`}>{component.componentName}</h1>
            <p className={t.textMuted}>{component.componentNumber}</p>
          </div>
          <div className="flex items-center gap-3">
            {canEdit && (
              <button
                onClick={handleOpenComponentEdit}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:shadow-lg cursor-pointer bg-blue-600 hover:bg-blue-700 text-white`}
              >
                <Edit2 size={18} />
                编辑组件
              </button>
            )}
            {canEdit ? (
              <button
                onClick={() => setEnhancedStatusModal(true)}
                className={`px-3 py-1 rounded-full text-sm font-medium border cursor-pointer transition-colors ${
                  t.statusColors[component.status as keyof typeof t.statusColors] || t.statusColors.故障
                }`}
              >
                {component.status}
              </button>
            ) : (
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
                t.statusColors[component.status as keyof typeof t.statusColors] || t.statusColors.故障
              }`}>
                {component.status}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className={`${t.card} rounded-lg shadow-sm p-4 mb-6 border ${t.border}`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <Hash className={t.textMuted} size={20} />
            <div>
              <div className={`text-sm ${t.textMuted}`}>生产指令号</div>
              <div className={`font-medium ${t.text}`}>{component.productionOrderNumber || '-'}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Tag className={t.textMuted} size={20} />
            <div>
              <div className={`text-sm ${t.textMuted}`}>版本</div>
              <div className={`font-medium ${t.text}`}>{component.version || '-'}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Settings className={t.textMuted} size={20} />
            <div>
              <div className={`text-sm ${t.textMuted}`}>阶段</div>
              <div className={`font-medium ${t.text}`}>{component.stage || '-'}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <User className={t.textMuted} size={20} />
            <div>
              <div className={`text-sm ${t.textMuted}`}>持有人</div>
              <div className={`font-medium ${t.text}`}>{component.holder || '-'}</div>
            </div>
          </div>
        </div>
      </div>

      <div className={`${t.card} rounded-lg shadow-sm p-4 mb-6 border ${t.border}`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className={`text-sm ${t.textMuted}`}>投产单号</div>
            <div className={`font-medium ${t.text}`}>{productionOrderNum}</div>
          </div>
          <div>
            <div className={`text-sm ${t.textMuted}`}>测试单号</div>
            <div className={`font-medium ${t.text}`}>{testOrderNum}</div>
          </div>
          <div>
            <div className={`text-sm ${t.textMuted}`}>三防单号</div>
            <div className={`font-medium ${t.text}`}>{protectionOrderNum}</div>
          </div>
          <div>
            <div className={`text-sm ${t.textMuted}`}>维修单号</div>
            <div className={`font-medium ${t.text}`}>{repairOrderNum}</div>
          </div>
          <div>
            <div className={`text-sm ${t.textMuted}`}>所属模块</div>
            <Link to={`/modules/${module.id}`} className={`${t.accentText} hover:underline`}>
              {module.moduleName}
            </Link>
            <span className={`text-xs ${t.textMuted} ml-1`}>({module.moduleNumber})</span>
          </div>
          <div>
            <div className={`text-sm ${t.textMuted}`}>所属系统</div>
            <Link to={`/systems/${module.systemId}`} className={`${t.accentText} hover:underline`}>
              {project.systems?.find((s: any) => s.id === module.systemId)?.systemName || '-'}
            </Link>
            <span className={`text-xs ${t.textMuted} ml-1`}>
              ({project.systems?.find((s: any) => s.id === module.systemId)?.systemNumber || '-'})
            </span>
          </div>
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
        <div className={`${t.card} rounded-lg shadow-sm p-6 border ${t.border}`}>
          <h3 className={`text-lg font-semibold ${t.text} mb-4`}>组件信息</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className={`text-sm ${t.textMuted}`}>组件编号</div>
              <div className={`font-medium ${t.text}`}>{component.componentNumber}</div>
            </div>
            <div>
              <div className={`text-sm ${t.textMuted}`}>组件名称</div>
              <div className={`font-medium ${t.text}`}>{component.componentName}</div>
            </div>
            <div>
              <div className={`text-sm ${t.textMuted}`}>生产指令号</div>
              <div className={`font-medium ${t.text}`}>{component.productionOrderNumber || '-'}</div>
            </div>
            <div>
              <div className={`text-sm ${t.textMuted}`}>版本</div>
              <div className={`font-medium ${t.text}`}>{component.version || '-'}</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'certificates' && (
        <div className={`${t.card} rounded-lg shadow-sm p-6 border ${t.border}`}>
          <h3 className={`text-lg font-semibold ${t.text} mb-4`}>证书签署状态</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { name: '印制板合格证', key: 'pcb', cert: component.certificates?.pcb },
              { name: '电装合格证', key: 'assembly', cert: component.certificates?.assembly },
              { name: '三防合格证', key: 'coating', cert: component.certificates?.coating },
            ].map((certItem) => (
              <div key={certItem.key} className={`p-4 border rounded-lg ${t.border}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`font-medium ${t.text}`}>{certItem.name}</span>
                  {certItem.cert === '已签署' ? (
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
                        value={component.certificates?.[`${certItem.key}CertificateNumber` as keyof typeof component.certificates] || ''}
                        onChange={(e) => {
                          updateComponent(project.id, module.id, component.id, {
                            certificates: {
                              ...component.certificates,
                              [`${certItem.key}CertificateNumber`]: e.target.value,
                            },
                          });
                        }}
                        placeholder="请输入证书号"
                        className={`w-full px-3 py-1.5 border rounded-lg ${t.input} mt-1`}
                      />
                    ) : (
                      <div className={`font-medium ${t.text} mt-1`}>
                        {component.certificates?.[`${certItem.key}CertificateNumber` as keyof typeof component.certificates] || '-'}
                      </div>
                    )}
                  </div>
                  {component.certificates?.[`${certItem.key}CertificateNumber` as keyof typeof component.certificates] && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(component.certificates[`${certItem.key}CertificateNumber` as keyof typeof component.certificates] as string);
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
            ))}
          </div>
        </div>
      )}

      {activeTab === 'software' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className={`text-lg font-semibold ${t.text}`}>烧录软件列表</h2>
            {canEdit && (
              <button
                onClick={() => setShowSoftwareModal(true)}
                className={`flex items-center gap-2 px-4 py-2 ${t.button} rounded-lg`}
              >
                <Plus size={18} />
                添加软件
              </button>
            )}
          </div>

          {(!component.burnedSoftware || component.burnedSoftware.length === 0) ? (
            <div className={`text-center py-12 ${t.card} rounded-lg border ${t.border}`}>
              <Package className={`mx-auto ${t.textMuted} mb-4`} size={48} />
              <p className={t.textMuted}>暂无烧录软件</p>
            </div>
          ) : (
            <div className={`${t.card} rounded-lg shadow-sm overflow-hidden border ${t.border}`}>
              <table className="w-full">
                <thead className={t.tableHeader}>
                  <tr>
                    <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>软件名称</th>
                    <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>版本</th>
                    <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>烧录时间</th>
                    <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>烧录人</th>
                    {canEdit && <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>操作</th>}
                  </tr>
                </thead>
                <tbody>
                  {component.burnedSoftware.map((software: any) => (
                    <tr key={software.id} className={`border-t ${t.border} ${t.hoverBg}`}>
                      <td className={`px-4 py-3 ${t.text}`}>{software.softwareName}</td>
                      <td className={`px-4 py-3 ${t.textSecondary}`}>{software.softwareVersion}</td>
                      <td className={`px-4 py-3 ${t.textSecondary}`}>{new Date(software.burnedAt).toLocaleString()}</td>
                      <td className={`px-4 py-3 ${t.textSecondary}`}>{software.burnedBy}</td>
                      {canEdit && (
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleRemoveSoftware(software.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'designFiles' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-lg font-semibold ${t.text}`}>设计文件</h2>
            <div className="flex items-center gap-3">
              {clearResult && (
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                  clearResult.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {clearResult.success ? <CheckCircle size={16} /> : <XCircle size={16} />}
                  {clearResult.message}
                </div>
              )}
              <button
                onClick={() => setShowClearConfirm(true)}
                disabled={!hasDesignFiles || isClearing}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  hasDesignFiles && !isClearing
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-200 hover:shadow-red-300 cursor-pointer'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                title={hasDesignFiles ? '清除所有设计文件 (Ctrl+Shift+Delete)' : '暂无设计文件可清除'}
              >
                {isClearing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    清除中...
                  </>
                ) : (
                  <>
                    <Trash2 size={18} />
                    清除
                  </>
                )}
              </button>
            </div>
          </div>
          {component.designFiles && component.designFiles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {component.designFiles.map((df: any) => (
                <div key={df.id} className={`${t.card} rounded-lg shadow-sm border ${t.border} overflow-hidden`}>
                  <div className={`p-4 border-b ${t.border}`}>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                        <FileText size={16} className="text-purple-600" />
                      </div>
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
                          下载
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
                  const logsToExport = component.logs
                    .filter(log => !logSearchTerm || log.action.toLowerCase().includes(logSearchTerm.toLowerCase()) || log.username.toLowerCase().includes(logSearchTerm.toLowerCase()))
                    .map(log => `${new Date(log.timestamp).toLocaleString()}\t${log.username}\t${log.action}`)
                    .join('\n');
                  const csv = `时间\t用户\t操作\n${logsToExport}`;
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `组件日志_${component.componentNumber || component.componentName}_${new Date().toISOString().split('T')[0]}.csv`;
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
          {component.logs.length === 0 ? (
            <p className={`${t.textMuted} text-center py-8`}>暂无日志</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {component.logs
                .filter(log => !logSearchTerm || log.action.toLowerCase().includes(logSearchTerm.toLowerCase()) || log.username.toLowerCase().includes(logSearchTerm.toLowerCase()))
                .map((log) => (
                <div key={log.id} className={`flex items-start gap-3 p-3 rounded-lg ${t.emptyBg}`}>
                  <Clock size={16} className={`${t.textMuted} mt-1`} />
                  <div>
                    <div className={`text-sm ${t.text}`}>{log.action}</div>
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

      <EnhancedComponentStatusModal
        isOpen={enhancedStatusModal}
        onClose={() => setEnhancedStatusModal(false)}
        component={component}
        currentStatus={component.status as ComponentStatus}
        onStatusChange={handleEnhancedStatusChange}
        canEdit={currentUser?.role !== 'viewer'}
      />

      {showSoftwareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowSoftwareModal(false)}>
          <div className={`${t.modalBg} rounded-lg p-6 w-full max-w-md border ${t.modalBorder}`} onClick={(e) => e.stopPropagation()}>
            <h2 className={`text-xl font-semibold mb-4 ${t.text}`}>添加烧录软件</h2>
            <form onSubmit={handleAddSoftware} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>软件名称</label>
                <input
                  type="text"
                  value={softwareForm.name}
                  onChange={(e) => setSoftwareForm({ ...softwareForm, name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                  required
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>版本</label>
                <input
                  type="text"
                  value={softwareForm.version}
                  onChange={(e) => setSoftwareForm({ ...softwareForm, version: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowSoftwareModal(false)} className={`flex-1 py-2 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}>
                  取消
                </button>
                <button type="submit" className={`flex-1 py-2 ${t.button} rounded-lg`}>
                  添加
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showReasonModal && pendingStatus && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowReasonModal(false)}>
          <div className={`${t.modalBg} rounded-lg p-6 w-full max-w-md border ${t.modalBorder}`} onClick={(e) => e.stopPropagation()}>
            <h2 className={`text-xl font-semibold mb-2 ${t.text}`}>填写状态变更原因</h2>
            <p className={`text-sm ${t.textMuted} mb-4`}>每次状态变更必须记录原因，以便追溯</p>
            <div className={`p-4 rounded-lg mb-4 ${t.emptyBg}`}>
              <div className={`text-sm ${t.textSecondary} mb-1`}>组件：<span className={`font-medium ${t.text}`}>{component.componentName}</span></div>
              <div className={`text-sm ${t.textSecondary} mb-1`}>编号：<span className={`font-medium ${t.text}`}>{component.componentNumber}</span></div>
              <div className={`text-sm ${t.textSecondary}`}>状态变更：<span className="font-medium text-red-500">{component.status}</span> → <span className="font-medium text-green-500">{pendingStatus}</span></div>
            </div>
            <div className="mb-2">
              <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>
                变更原因 <span className="text-red-500">*必填</span>
              </label>
              <textarea
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="请详细描述状态变更的原因..."
                className={`w-full px-3 py-2 border rounded-lg ${t.input} min-h-[80px] resize-none focus:ring-2 focus:ring-cyan-500/30`}
                autoFocus
              />
            </div>
            <div className={`text-xs ${t.textMuted} mb-4`}>
              提示：常见原因包括：设备故障维修、定期维护检测、安全检查、三防处理、软件升级等
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowReasonModal(false);
                  setPendingStatus(null);
                  setStatusReason('');
                }}
                className={`flex-1 py-2 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}
              >
                取消
              </button>
              <button
                onClick={handleStatusChangeWithReason}
                disabled={!statusReason.trim()}
                className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                  statusReason.trim()
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

      {isEditingComponent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={handleCancelComponentEdit}>
          <div className={`${t.modalBg} rounded-lg p-6 w-full max-w-2xl border ${t.modalBorder} max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl font-semibold ${t.text}`}>编辑组件信息</h2>
              <button
                onClick={handleCancelComponentEdit}
                className={`p-2 rounded-lg hover:${t.hoverBg} ${t.textSecondary}`}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSaveComponentEdit(); }} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${t.textSecondary}`}>
                    组件名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editComponentForm.componentName}
                    onChange={(e) => setEditComponentForm({ ...editComponentForm, componentName: e.target.value })}
                    className={`w-full px-3 py-2.5 border rounded-lg ${componentFormErrors.componentName ? 'border-red-500' : ''} ${t.input}`}
                    placeholder="请输入组件名称"
                  />
                  {componentFormErrors.componentName && (
                    <p className="text-red-500 text-xs mt-1">{componentFormErrors.componentName}</p>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${t.textSecondary}`}>
                    组件编号 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editComponentForm.componentNumber}
                    onChange={(e) => setEditComponentForm({ ...editComponentForm, componentNumber: e.target.value })}
                    className={`w-full px-3 py-2.5 border rounded-lg ${componentFormErrors.componentNumber ? 'border-red-500' : ''} ${t.input}`}
                    placeholder="如: C001"
                  />
                  {componentFormErrors.componentNumber && (
                    <p className="text-red-500 text-xs mt-1">{componentFormErrors.componentNumber}</p>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${t.textSecondary}`}>生产指令号</label>
                  <input
                    type="text"
                    value={editComponentForm.productionOrderNumber}
                    onChange={(e) => setEditComponentForm({ ...editComponentForm, productionOrderNumber: e.target.value })}
                    className={`w-full px-3 py-2.5 border rounded-lg ${t.input}`}
                    placeholder="请输入生产指令号"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${t.textSecondary}`}>持有人</label>
                  <input
                    type="text"
                    value={editComponentForm.holder}
                    onChange={(e) => setEditComponentForm({ ...editComponentForm, holder: e.target.value })}
                    className={`w-full px-3 py-2.5 border rounded-lg ${t.input}`}
                    placeholder="请输入持有人姓名"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${t.textSecondary}`}>版本</label>
                  <input
                    type="text"
                    value={editComponentForm.version}
                    onChange={(e) => setEditComponentForm({ ...editComponentForm, version: e.target.value })}
                    className={`w-full px-3 py-2.5 border rounded-lg ${t.input}`}
                    placeholder="如: v1.0"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${t.textSecondary}`}>阶段</label>
                  <select
                    value={editComponentForm.stage}
                    onChange={(e) => setEditComponentForm({ ...editComponentForm, stage: e.target.value })}
                    className={`w-full px-3 py-2.5 border rounded-lg ${t.input}`}
                  >
                    <option value="">请选择阶段</option>
                    <option value="设计">设计</option>
                    <option value="开发">开发</option>
                    <option value="测试">测试</option>
                    <option value="投产">投产</option>
                    <option value="维护">维护</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1.5 ${t.textSecondary}`}>状态</label>
                <select
                  value={editComponentForm.status}
                  onChange={(e) => setEditComponentForm({ ...editComponentForm, status: e.target.value })}
                  className={`w-full px-3 py-2.5 border rounded-lg ${t.input}`}
                >
                  <option value="未投产">未投产</option>
                  <option value="投产中">投产中</option>
                  <option value="测试中">测试中</option>
                  <option value="正常">正常</option>
                  <option value="故障">故障</option>
                  <option value="维修中">维修中</option>
                  <option value="三防中">三防中</option>
                  <option value="仿真中">仿真中</option>
                </select>
                <p className={`text-xs ${t.textMuted} mt-1`}>
                  ⚠️ 注意：通过此处更改状态不会记录变更原因，建议使用状态变更功能
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCancelComponentEdit}
                  className={`flex-1 py-2.5 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg} transition-all flex items-center justify-center gap-2`}
                >
                  <X size={18} />
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-lg font-medium transition-all hover:shadow-lg cursor-pointer bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  保存修改
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]" onClick={() => !isClearing && setShowClearConfirm(false)}>
          <div
            className={`${t.modalBg} rounded-xl p-6 w-full max-w-md border-2 border-red-300 dark:border-red-700 shadow-2xl`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30">
              <AlertTriangle size={32} className="text-red-600 dark:text-red-400" />
            </div>

            <h2 className={`text-xl font-bold text-center mb-2 ${t.text}`}>确认清除设计文件</h2>
            <p className={`text-center text-sm mb-4 ${t.textSecondary}`}>
              此操作将永久删除所有设计文件，且无法恢复，是否继续？
            </p>

            {component.designFiles && component.designFiles.length > 0 && (
              <div className={`mb-4 p-3 rounded-lg ${t.emptyBg} max-h-32 overflow-y-auto`}>
                <div className={`text-xs ${t.textMuted} mb-2`}>即将删除 {component.designFiles.length} 个文件：</div>
                {component.designFiles.slice(0, 5).map((df: any) => (
                  <div key={df.id} className={`text-sm ${t.text} truncate`}>
                    • {df.name}
                  </div>
                ))}
                {component.designFiles.length > 5 && (
                  <div className={`text-xs ${t.textMuted} mt-1`}>
                    ...还有 {component.designFiles.length - 5} 个文件
                  </div>
                )}
              </div>
            )}

            <div className={`text-xs ${t.textMuted} mb-4 p-2 rounded bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800`}>
              💡 提示：此操作已记录审计日志，快捷键为 Ctrl+Shift+Delete
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                disabled={isClearing}
                className={`flex-1 py-2.5 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg} transition-all flex items-center justify-center gap-2`}
              >
                <X size={18} />
                取消
              </button>
              <button
                onClick={handleClearDesignFiles}
                disabled={isClearing}
                className={`flex-1 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                  isClearing
                    ? 'bg-red-400 cursor-wait text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-200 hover:shadow-red-300 cursor-pointer'
                }`}
              >
                {isClearing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    清除中...
                  </>
                ) : (
                  <>
                    <Trash2 size={18} />
                    确认清除
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
