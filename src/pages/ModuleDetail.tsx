import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Package, Settings, Clock, User, Hash, Tag, CheckCircle, XCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/Toast';
import type { ModuleStatus } from '../types';

const statusColors: Record<ModuleStatus, { bg: string; text: string; border: string }> = {
  未投产: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
  投产中: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  正常: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  维修中: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
  三防中: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
  测试中: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
  仿真中: { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-300' },
  故障: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
};

export default function ModuleDetail() {
  const { id } = useParams<{ id: string }>();
  const { getModule, updateModule, addComponent, currentUser } = useApp();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'components' | 'certificates' | 'logs'>('overview');
  const [showComponentModal, setShowComponentModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [componentForm, setComponentForm] = useState({
    componentNumber: '',
    componentName: '',
    productionOrderNumber: '',
    holder: '',
  });

  const moduleData = getModule(id!);
  const { project, module } = moduleData || {};

  if (!project || !module) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">模块不存在</p>
        <Link to="/projects" className="text-primary-600 hover:underline mt-2 inline-block">
          返回项目列表
        </Link>
      </div>
    );
  }

  const handleCreateComponent = (e: React.FormEvent) => {
    e.preventDefault();
    addComponent(project.id, module.id, {
      moduleId: module.id,
      ...componentForm,
      status: '未投产',
    });
    showToast('组件创建成功', 'success');
    setShowComponentModal(false);
    setComponentForm({ componentNumber: '', componentName: '', productionOrderNumber: '', holder: '' });
  };

  const handleStatusChange = (newStatus: ModuleStatus) => {
    updateModule(project.id, module.id, { status: newStatus });
    showToast(`状态已变更为${newStatus}`, 'success');
    setShowStatusModal(false);
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
  ];

  return (
    <div>
      <div className="mb-6">
        <Link to={`/projects/${project.id}`} className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4">
          <ArrowLeft size={20} />
          返回项目
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{module.moduleName}</h1>
            <p className="text-gray-500">{module.moduleNumber}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusColors[module.status].bg} ${statusColors[module.status].text} ${statusColors[module.status].border}`}>
              {module.status}
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
            <Tag className="text-gray-400" size={20} />
            <div>
              <div className="text-sm text-gray-500">生产指令号</div>
              <div className="font-medium">{module.productionOrderNumber || '-'}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Hash className="text-gray-400" size={20} />
            <div>
              <div className="text-sm text-gray-500">版本</div>
              <div className="font-medium">{module.version}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Settings className="text-gray-400" size={20} />
            <div>
              <div className="text-sm text-gray-500">阶段</div>
              <div className="font-medium">{module.stage}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <User className="text-gray-400" size={20} />
            <div>
              <div className="text-sm text-gray-500">持有人</div>
              <div className="font-medium">{module.holder || '-'}</div>
            </div>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-500 mb-1">模块种类</div>
            <div className="text-xl font-bold text-gray-800">{module.category}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-500 mb-1">组件总数</div>
            <div className="text-xl font-bold text-primary-600">{stats.total}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-500 mb-1">正常/故障</div>
            <div className="text-xl font-bold">
              <span className="text-green-600">{stats.normal}</span>
              {' / '}
              <span className="text-red-600">{stats.fault}</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'components' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">组件列表</h2>
            {canEdit && (
              <button
                onClick={() => setShowComponentModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                <Plus size={18} />
                新建组件
              </button>
            )}
          </div>

          {module.components.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg">
              <Package className="mx-auto text-gray-300 mb-4" size={48} />
              <p className="text-gray-500">暂无组件</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">组件编号</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">组件名称</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">生产指令号</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">阶段</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {module.components.map((component) => (
                    <tr key={component.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link to={`/components/${component.id}`} className="text-primary-600 hover:underline">
                          {component.componentNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link to={`/components/${component.id}`} className="text-primary-600 hover:underline">
                          {component.componentName}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{component.productionOrderNumber || '-'}</td>
                      <td className="px-4 py-3">{component.stage || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          component.status === '正常' ? 'bg-green-100 text-green-700' :
                          component.status === '故障' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {component.status}
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
              const status = (module as any).certificates?.[cert.key];
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

      {activeTab === 'logs' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">操作日志</h3>
          {module.logs.length === 0 ? (
            <p className="text-gray-500 text-center py-8">暂无日志</p>
          ) : (
            <div className="space-y-3">
              {module.logs.map((log) => (
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

      {showComponentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowComponentModal(false)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">新建组件</h2>
            <form onSubmit={handleCreateComponent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">组件编号</label>
                <input
                  type="text"
                  value={componentForm.componentNumber}
                  onChange={(e) => setComponentForm({ ...componentForm, componentNumber: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">组件名称</label>
                <input
                  type="text"
                  value={componentForm.componentName}
                  onChange={(e) => setComponentForm({ ...componentForm, componentName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">生产指令号</label>
                <input
                  type="text"
                  value={componentForm.productionOrderNumber}
                  onChange={(e) => setComponentForm({ ...componentForm, productionOrderNumber: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">持有人</label>
                <input
                  type="text"
                  value={componentForm.holder}
                  onChange={(e) => setComponentForm({ ...componentForm, holder: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowComponentModal(false)} className="flex-1 py-2 border rounded-lg hover:bg-gray-50">
                  取消
                </button>
                <button type="submit" className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                  创建
                </button>
              </div>
            </form>
          </div>
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
                  onClick={() => handleStatusChange(status as ModuleStatus)}
                  className={`px-4 py-3 rounded-lg border ${status === module.status ? 'bg-primary-50 border-primary-500' : 'hover:bg-gray-50'}`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
