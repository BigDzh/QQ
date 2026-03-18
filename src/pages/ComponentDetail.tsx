import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Package, Hash, Tag, User, Settings, Clock, CheckCircle, XCircle, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/Toast';
import type { ComponentStatus } from '../types';

const statusColors: Record<ComponentStatus, { bg: string; text: string; border: string }> = {
  未投产: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
  投产中: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  正常: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  维修中: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
  三防中: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
  测试中: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
  仿真中: { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-300' },
  故障: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
};

export default function ComponentDetail() {
  const { id } = useParams<{ id: string }>();
  const { getComponent, updateComponent, currentUser } = useApp();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'certificates' | 'software' | 'logs'>('overview');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showSoftwareModal, setShowSoftwareModal] = useState(false);
  const [softwareForm, setSoftwareForm] = useState({
    name: '',
    version: '',
  });

  const componentData = getComponent(id!);
  const { project, module, component } = componentData || {};

  if (!project || !module || !component) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">组件不存在</p>
        <Link to="/projects" className="text-primary-600 hover:underline mt-2 inline-block">
          返回项目列表
        </Link>
      </div>
    );
  }

  const handleStatusChange = (newStatus: ComponentStatus) => {
    updateComponent(project.id, module.id, component.id, { status: newStatus });
    showToast(`状态已变更为${newStatus}`, 'success');
    setShowStatusModal(false);
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
    updateComponent(project.id, module.id, component.id, {
      burnedSoftware: [...currentSoftware, newSoftware],
    });
    showToast('烧录软件添加成功', 'success');
    setShowSoftwareModal(false);
    setSoftwareForm({ name: '', version: '' });
  };

  const handleRemoveSoftware = (softwareId: string) => {
    const currentSoftware = component.burnedSoftware || [];
    const filtered = currentSoftware.filter((s: any) => s.id !== softwareId);
    updateComponent(project.id, module.id, component.id, {
      burnedSoftware: filtered,
    });
    showToast('软件已移除', 'success');
  };

  const canEdit = currentUser?.role !== 'viewer';

  const tabs = [
    { id: 'overview', label: '概览' },
    { id: 'certificates', label: '证书' },
    { id: 'software', label: `烧录软件 (${component.burnedSoftware?.length || 0})` },
    { id: 'logs', label: '日志' },
  ];

  return (
    <div>
      <div className="mb-6">
        <Link to={`/modules/${module.id}`} className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4">
          <ArrowLeft size={20} />
          返回模块
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{component.componentName}</h1>
            <p className="text-gray-500">{component.componentNumber}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusColors[component.status].bg} ${statusColors[component.status].text} ${statusColors[component.status].border}`}>
              {component.status}
            </span>
            {canEdit && (
              <button
                onClick={() => setShowStatusModal(true)}
                className="px-3 py-1 border rounded-lg hover:bg-gray-50"
              >
                更改状态
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <Hash className="text-gray-400" size={20} />
            <div>
              <div className="text-sm text-gray-500">生产指令号</div>
              <div className="font-medium">{component.productionOrderNumber || '-'}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Tag className="text-gray-400" size={20} />
            <div>
              <div className="text-sm text-gray-500">版本</div>
              <div className="font-medium">{component.version || '-'}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Settings className="text-gray-400" size={20} />
            <div>
              <div className="text-sm text-gray-500">阶段</div>
              <div className="font-medium">{component.stage || '-'}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <User className="text-gray-400" size={20} />
            <div>
              <div className="text-sm text-gray-500">持有人</div>
              <div className="font-medium">{component.holder || '-'}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-500">维修单号</div>
            <div className="font-medium">{component.repairOrderNumber || '-'}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">三防单号</div>
            <div className="font-medium">{component.protectionOrderNumber || '-'}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">所属模块</div>
            <Link to={`/modules/${module.id}`} className="text-primary-600 hover:underline">
              {module.moduleName}
            </Link>
          </div>
          <div>
            <div className="text-sm text-gray-500">所属项目</div>
            <Link to={`/projects/${project.id}`} className="text-primary-600 hover:underline">
              {project.name}
            </Link>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-6 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-2 -mb-px border-b-2 transition ${
              activeTab === tab.id
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">组件信息</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-500">组件编号</div>
              <div className="font-medium">{component.componentNumber}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">组件名称</div>
              <div className="font-medium">{component.componentName}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">生产指令号</div>
              <div className="font-medium">{component.productionOrderNumber || '-'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">版本</div>
              <div className="font-medium">{component.version || '-'}</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'certificates' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">证书签署状态</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { name: '印制板合格证', key: 'pcb' },
              { name: '电装合格证', key: 'assembly' },
              { name: '三防合格证', key: 'coating' },
              { name: '装配合格证', key: 'final' },
            ].map((cert) => {
              const status = component.certificates?.[cert.key as keyof typeof component.certificates];
              return (
                <div key={cert.key} className="flex items-center justify-between p-4 border rounded-lg">
                  <span className="font-medium">{cert.name}</span>
                  {status === '已签署' ? (
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle size={18} /> 已签署
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-gray-400">
                      <XCircle size={18} /> 未签署
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'software' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">烧录软件列表</h2>
            {canEdit && (
              <button
                onClick={() => setShowSoftwareModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                <Plus size={18} />
                添加软件
              </button>
            )}
          </div>

          {(!component.burnedSoftware || component.burnedSoftware.length === 0) ? (
            <div className="text-center py-12 bg-white rounded-lg">
              <Package className="mx-auto text-gray-300 mb-4" size={48} />
              <p className="text-gray-500">暂无烧录软件</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">软件名称</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">版本</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">烧录时间</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">烧录人</th>
                    {canEdit && <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">操作</th>}
                  </tr>
                </thead>
                <tbody>
                  {component.burnedSoftware.map((software: any) => (
                    <tr key={software.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">{software.softwareName}</td>
                      <td className="px-4 py-3">{software.softwareVersion}</td>
                      <td className="px-4 py-3">{new Date(software.burnedAt).toLocaleString()}</td>
                      <td className="px-4 py-3">{software.burnedBy}</td>
                      {canEdit && (
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleRemoveSoftware(software.id)}
                            className="text-red-600 hover:text-red-700"
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

      {activeTab === 'logs' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">操作日志</h3>
          {component.logs.length === 0 ? (
            <p className="text-gray-500 text-center py-8">暂无日志</p>
          ) : (
            <div className="space-y-3">
              {component.logs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <Clock size={16} className="text-gray-400 mt-1" />
                  <div>
                    <div className="text-sm">{log.action}</div>
                    <div className="text-xs text-gray-500">
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
          <div className="bg-white rounded-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">更改状态</h2>
            <div className="grid grid-cols-2 gap-3">
              {Object.keys(statusColors).map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status as ComponentStatus)}
                  className={`px-4 py-3 rounded-lg border ${status === component.status ? 'bg-primary-50 border-primary-500' : 'hover:bg-gray-50'}`}
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
          <div className="bg-white rounded-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">添加烧录软件</h2>
            <form onSubmit={handleAddSoftware} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">软件名称</label>
                <input
                  type="text"
                  value={softwareForm.name}
                  onChange={(e) => setSoftwareForm({ ...softwareForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">版本</label>
                <input
                  type="text"
                  value={softwareForm.version}
                  onChange={(e) => setSoftwareForm({ ...softwareForm, version: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowSoftwareModal(false)} className="flex-1 py-2 border rounded-lg hover:bg-gray-50">
                  取消
                </button>
                <button type="submit" className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                  添加
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
