import React, { useState } from 'react';
import { Plus, ArrowRightLeft, CheckCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/Toast';

export default function BorrowSystem() {
  const { projects, borrowRecords, addBorrowRecord, returnBorrowRecord, currentUser } = useApp();
  const { showToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<'all' | '借用中' | '已归还'>('all');

  const [formData, setFormData] = useState({
    itemType: 'module' as 'module' | 'component',
    itemId: '',
    itemName: '',
    borrower: '',
    expectedReturnDate: '',
    notes: '',
  });

  const filteredRecords = borrowRecords.filter((record) => {
    if (filter === 'all') return true;
    return record.status === filter;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addBorrowRecord({
      ...formData,
      borrowDate: new Date().toISOString(),
      status: '借用中',
    });
    showToast('借用记录创建成功', 'success');
    setShowModal(false);
    setFormData({
      itemType: 'module',
      itemId: '',
      itemName: '',
      borrower: '',
      expectedReturnDate: '',
      notes: '',
    });
  };

  const handleReturn = (id: string) => {
    returnBorrowRecord(id);
    showToast('归还成功', 'success');
  };

  const getAllItems = () => {
    const items: { id: string; name: string; type: 'module' | 'component' }[] = [];
    projects.forEach((project) => {
      project.modules.forEach((module) => {
        items.push({
          id: module.id,
          name: `${module.moduleName} (${module.moduleNumber})`,
          type: 'module',
        });
        module.components.forEach((component) => {
          items.push({
            id: component.id,
            name: `${component.componentName} (${component.componentNumber})`,
            type: 'component',
          });
        });
      });
    });
    return items;
  };

  const stats = {
    total: borrowRecords.length,
    borrowing: borrowRecords.filter((r) => r.status === '借用中').length,
    returned: borrowRecords.filter((r) => r.status === '已归还').length,
  };

  const canEdit = currentUser?.role !== 'viewer';

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-sm text-gray-500">总记录</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-sm text-gray-500">借用中</div>
          <div className="text-2xl font-bold text-orange-600">{stats.borrowing}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-sm text-gray-500">已归还</div>
          <div className="text-2xl font-bold text-green-600">{stats.returned}</div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          {(['all', '借用中', '已归还'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1 rounded-full text-sm ${
                filter === status ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status === 'all' ? '全部' : status}
            </button>
          ))}
        </div>
        {canEdit && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus size={18} />
            新建借用
          </button>
        )}
      </div>

      {filteredRecords.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg">
          <ArrowRightLeft className="mx-auto text-gray-300 mb-4" size={48} />
          <p className="text-gray-500">暂无借用记录</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">类型</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">名称</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">借用人</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">借用日期</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">预计归还</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">状态</th>
                {canEdit && <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">操作</th>}
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => (
                <tr key={record.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      record.itemType === 'module' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {record.itemType === 'module' ? '模块' : '组件'}
                    </span>
                  </td>
                  <td className="px-4 py-3">{record.itemName}</td>
                  <td className="px-4 py-3">{record.borrower}</td>
                  <td className="px-4 py-3">{new Date(record.borrowDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {record.expectedReturnDate ? new Date(record.expectedReturnDate).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      record.status === '借用中' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {record.status === '借用中' ? '借用中' : '已归还'}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3">
                      {record.status === '借用中' && (
                        <button
                          onClick={() => handleReturn(record.id)}
                          className="flex items-center gap-1 text-green-600 hover:text-green-700"
                        >
                          <CheckCircle size={16} />
                          归还
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">新建借用记录</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
                <select
                  value={formData.itemType}
                  onChange={(e) => setFormData({ ...formData, itemType: e.target.value as 'module' | 'component', itemId: '', itemName: '' })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="module">模块</option>
                  <option value="component">组件</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">选择项目</label>
                <select
                  value={formData.itemId}
                  onChange={(e) => {
                    const item = getAllItems().find((i) => i.id === e.target.value);
                    setFormData({ ...formData, itemId: e.target.value, itemName: item?.name || '' });
                  }}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  <option value="">选择...</option>
                  {getAllItems().filter((i) => i.type === formData.itemType).map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">借用人</label>
                <input
                  type="text"
                  value={formData.borrower}
                  onChange={(e) => setFormData({ ...formData, borrower: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">预计归还日期</label>
                <input
                  type="date"
                  value={formData.expectedReturnDate}
                  onChange={(e) => setFormData({ ...formData, expectedReturnDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={2}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 border rounded-lg hover:bg-gray-50">
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
    </div>
  );
}
