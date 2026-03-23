import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Hash, Tag, User, Settings, Clock, CheckCircle, XCircle, Plus, Trash2, FileText, Download, Copy, Search } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { generateId } from '../utils/auth';
import { useToast } from '../components/Toast';
import { useThemeStyles } from '../hooks/useThemeStyles';
import type { ComponentStatus } from '../types';

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
  const [softwareForm, setSoftwareForm] = useState({
    name: '',
    version: '',
  });
  const [logSearchTerm, setLogSearchTerm] = useState('');

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

  const handleStatusChange = (newStatus: ComponentStatus) => {
    setPendingStatus(newStatus);
    setStatusReason('');
    setShowStatusModal(false);
    setShowReasonModal(true);
  };

  const handleStatusChangeWithReason = () => {
    if (!pendingStatus) return;
    const newLog = {
      id: generateId(),
      action: `状态从 ${component.status} 变更为 ${pendingStatus}`,
      timestamp: new Date().toISOString(),
      userId: currentUser?.id || '',
      username: currentUser?.username || currentUser?.name || '未知',
      details: statusReason || '无',
    };
    updateComponent(project.id, module.id, component.id, {
      status: pendingStatus,
      logs: [...component.logs, newLog],
      statusChanges: [
        ...(component.statusChanges || []),
        {
          id: generateId(),
          fromStatus: component.status,
          toStatus: pendingStatus,
          changedAt: new Date().toISOString(),
          changedBy: currentUser?.username || currentUser?.name || '未知',
          reason: statusReason || '无',
        },
      ],
    });
    showToast(`状态已变更为${pendingStatus}`, 'success');
    setShowReasonModal(false);
    setPendingStatus(null);
    setStatusReason('');
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
            {canEdit ? (
              <button
                onClick={() => setShowStatusModal(true)}
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
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <div className={`text-sm ${t.textMuted}`}>维修单号</div>
            <div className={`font-medium ${t.text}`}>{component.repairOrderNumber || '-'}</div>
          </div>
          <div>
            <div className={`text-sm ${t.textMuted}`}>三防单号</div>
            <div className={`font-medium ${t.text}`}>{component.protectionOrderNumber || '-'}</div>
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
          <h2 className={`text-lg font-semibold ${t.text} mb-4`}>设计文件</h2>
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

      {showStatusModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowStatusModal(false)}>
          <div className={`${t.modalBg} rounded-lg p-6 w-full max-w-md border ${t.modalBorder}`} onClick={(e) => e.stopPropagation()}>
            <h2 className={`text-xl font-semibold mb-4 ${t.text}`}>更改状态</h2>
            <div className="grid grid-cols-2 gap-3">
              {Object.keys(t.statusColors).map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status as ComponentStatus)}
                  className={`px-4 py-3 rounded-lg border ${status === component.status ? `${t.accent} text-white` : `${t.border} hover:${t.hoverBg}`}`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

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
            <h2 className={`text-xl font-semibold mb-4 ${t.text}`}>填写更改原因</h2>
            <p className={`text-sm ${t.textSecondary} mb-4`}>
              组件状态将变更为：<span className={`font-medium ${t.accentText}`}>{pendingStatus}</span>
            </p>
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>更改原因</label>
              <textarea
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="请输入状态更改原因（选填）"
                className={`w-full px-3 py-2 border rounded-lg ${t.input} min-h-[100px] resize-none`}
              />
            </div>
            <div className="flex gap-3 pt-2">
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
                className={`flex-1 py-2 ${t.button} rounded-lg`}
              >
                确认更改
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
