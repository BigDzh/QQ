import { useState, useMemo } from 'react';
import { ArrowRightLeft, CheckCircle, Package, Settings, Search, XCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/Toast';
import { useTheme } from '../context/ThemeContext';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { useModuleComponentSync } from '../hooks/useModuleComponentSync';
import FilterArea from '../components/BorrowSystemFilter';

import type { BorrowRecord } from '../types';

interface BorrowModalData {
  type: 'module' | 'component';
  item: {
    id: string;
    name: string;
    moduleId?: string;
    projectId?: string;
  };
}

interface ReturnModalData {
  record: BorrowRecord;
  newStatus: '正常' | '故障' | '维修中' | '三防中' | '测试中' | '仿真中';
  reason: string;
}

export default function BorrowSystem() {
  const { projects, borrowRecords, addBorrowRecord, returnBorrowRecord, updateComponent, currentUser } = useApp();
  const { showToast } = useToast();
  const { theme } = useTheme();
  const t = useThemeStyles();
  const { cascadeBorrowModule, cascadeReturnModule } = useModuleComponentSync();
  const [showBorrowModal, setShowBorrowModal] = useState(false);
  const [borrowData, setBorrowData] = useState<BorrowModalData | null>(null);
  const [borrower, setBorrower] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnData, setReturnData] = useState<ReturnModalData | null>(null);
  const [filterSystemId, setFilterSystemId] = useState<string | null>(null);
  const [filterModuleId, setFilterModuleId] = useState<string | null>(null);
  const [filterComponentId, setFilterComponentId] = useState<string | null>(null);

  const handleFilterChange = (filters: {
    systemId: string | null;
    moduleId: string | null;
    componentId: string | null;
  }) => {
    setFilterSystemId(filters.systemId);
    setFilterModuleId(filters.moduleId);
    setFilterComponentId(filters.componentId);
  };

  // 可借用模块：状态为"正常"且当前没有借用中的记录
  const normalModules = useMemo(() => {
    const borrowedModuleIds = new Set(
      borrowRecords
        .filter(r => r.itemType === 'module' && r.status === '借用中')
        .map(r => r.itemId)
    );

    let modules: Array<{
      id: string;
      moduleName: string;
      moduleNumber: string;
      status: string;
      projectId: string;
      projectName: string;
      systemId?: string;
      componentCount: number;
      components: Array<{ id: string; status: string }>;
    }> = [];

    for (const project of projects) {
      for (const m of project.modules) {
        if (m.status === '正常' && !borrowedModuleIds.has(m.id)) {
          modules.push({
            id: m.id,
            moduleName: m.moduleName,
            moduleNumber: m.moduleNumber,
            status: m.status,
            projectId: project.id,
            projectName: project.name,
            systemId: m.systemId,
            componentCount: m.components.length,
            components: m.components,
          });
        }
      }
    }

    if (filterSystemId) {
      modules = modules.filter(m => m.systemId === filterSystemId);
    }
    if (filterModuleId) {
      modules = modules.filter(m => m.id === filterModuleId);
    }
    if (filterComponentId) {
      modules = modules.filter(m => m.components.some(c => c.id === filterComponentId));
    }

    return modules;
  }, [projects, borrowRecords, filterSystemId, filterModuleId, filterComponentId]);

  // 可借用组件：状态为"正常"且当前没有借用中的记录
  const normalComponents = useMemo(() => {
    const borrowedComponentIds = new Set(
      borrowRecords
        .filter(r => r.itemType === 'component' && r.status === '借用中')
        .map(r => r.itemId)
    );

    let components: Array<{
      id: string;
      componentName: string;
      componentNumber: string;
      status: string;
      moduleId: string;
      moduleName: string;
      projectId: string;
      projectName: string;
      systemId?: string;
    }> = [];

    for (const project of projects) {
      for (const module of project.modules) {
        for (const c of module.components) {
          if (c.status === '正常' && !borrowedComponentIds.has(c.id)) {
            components.push({
              id: c.id,
              componentName: c.componentName,
              componentNumber: c.componentNumber,
              status: c.status,
              moduleId: module.id,
              moduleName: module.moduleName,
              projectId: project.id,
              projectName: project.name,
              systemId: module.systemId,
            });
          }
        }
      }
    }

    if (filterSystemId) {
      components = components.filter(c => c.systemId === filterSystemId);
    }
    if (filterModuleId) {
      components = components.filter(c => c.moduleId === filterModuleId);
    }
    if (filterComponentId) {
      components = components.filter(c => c.id === filterComponentId);
    }

    return components;
  }, [projects, borrowRecords, filterSystemId, filterModuleId, filterComponentId]);

  const handleBorrow = (type: 'module' | 'component', item: BorrowModalData['item']) => {
    setBorrowData({ type, item });
    setBorrower(currentUser?.name || currentUser?.username || '');
    setExpectedReturnDate('');
    setNotes('');
    setShowBorrowModal(true);
  };

  const confirmBorrow = () => {
    if (!borrowData || !borrower) {
      showToast('请填写借用人', 'error');
      return;
    }

    const project = projects.find((p) => p.id === borrowData.item.projectId);
    const module = project?.modules.find((m) => m.id === borrowData.item.id);

    if (!project || !module) {
      showToast('模块不存在', 'error');
      return;
    }

    if (borrowData.type === 'module') {
      const result = cascadeBorrowModule({
        module,
        borrower,
        expectedReturnDate,
        notes,
      });

      if (!result.success) {
        showToast(result.errors[0] || '借用失败', 'error');
        return;
      }

      showToast(`借用成功，已同步更新 ${result.updatedComponents.length} 个组件状态`, 'success');
    } else {
      updateComponent(borrowData.item.projectId!, borrowData.item.moduleId!, borrowData.item.id, { status: '借用中', borrower });
      addBorrowRecord({
        itemType: 'component',
        itemId: borrowData.item.id,
        itemName: borrowData.item.name,
        borrower,
        borrowDate: new Date().toISOString(),
        expectedReturnDate: expectedReturnDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        actualReturnDate: '',
        status: '借用中',
        notes,
      });
    }

    showToast('借用成功', 'success');
    setShowBorrowModal(false);
    setBorrowData(null);
  };

  const handleReturn = (record: typeof borrowRecords[0]) => {
    setReturnData({
      record,
      newStatus: '正常',
      reason: '',
    });
    setShowReturnModal(true);
  };

  const confirmReturn = () => {
    if (!returnData) return;

    const { record, newStatus } = returnData;

    if (record.itemType === 'module') {
      const project = projects.find((p) => p.modules.some((m) => m.id === record.itemId));
      const module = project?.modules.find((m) => m.id === record.itemId);
      if (project && module) {
        const result = cascadeReturnModule({
          module,
          newStatus: newStatus as '正常' | '故障' | '维修中' | '三防中' | '测试中' | '仿真中',
        });

        if (!result.success) {
          showToast(result.errors[0] || '归还失败', 'error');
          return;
        }

        borrowRecords
          .filter((r) => r.itemType === 'component' && r.parentModuleBorrowId === record.itemId && r.status === '借用中')
          .forEach((r) => returnBorrowRecord(r.id));

        showToast(`归还成功，状态已更新为"${newStatus}"，已同步更新 ${result.updatedComponents.length} 个组件`, 'success');
      }
    } else {
      for (const project of projects) {
        for (const module of project.modules) {
          const component = module.components.find((c) => c.id === record.itemId);
          if (component) {
            updateComponent(project.id, module.id, component.id, { status: newStatus, borrower: undefined });
            break;
          }
        }
      }
    }
    returnBorrowRecord(record.id);
    showToast(`归还成功，状态已更新为"${newStatus}"`, 'success');
    setShowReturnModal(false);
    setReturnData(null);
  };

  const statusColors = {
    borrowing: { light: 'text-orange-600', dark: 'text-orange-400' },
    returned: { light: 'text-emerald-600', dark: 'text-emerald-400' },
    module: { light: 'text-blue-600', dark: 'text-blue-400' },
    component: { light: 'text-emerald-600', dark: 'text-emerald-400' },
  };

  const getStatusColor = (type: keyof typeof statusColors) => {
    const isDarkTheme = !theme || theme === 'dark' || theme === 'cyberpunk' || theme === 'linear' || theme === 'anime' || theme === 'cosmos';
    return isDarkTheme ? statusColors[type].dark : statusColors[type].light;
  };

  const statusOptions: Array<{ value: '正常' | '故障' | '维修中' | '三防中' | '测试中' | '仿真中'; label: string; color: string }> = [
    { value: '正常', label: '正常', color: 'bg-emerald-500' },
    { value: '故障', label: '故障', color: 'bg-red-500' },
    { value: '维修中', label: '维修中', color: 'bg-orange-500' },
    { value: '三防中', label: '三防中', color: 'bg-yellow-500' },
    { value: '测试中', label: '测试中', color: 'bg-blue-500' },
    { value: '仿真中', label: '仿真中', color: 'bg-purple-500' },
  ];

  const borrowedModules = projects
    .flatMap((project) =>
      project.modules
        .filter((m) => m.status === '借用中')
        .map((m) => ({
          ...m,
          projectId: project.id,
          projectName: project.name,
          borrower: m.borrower || borrowRecords.find((r) => r.itemId === m.id && r.status === '借用中')?.borrower || '',
        }))
    );

  const filteredBorrowedModules = borrowedModules.filter(
    (m) =>
      m.moduleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.moduleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.borrower.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.projectName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const borrowedComponents = projects
    .flatMap((project) =>
      project.modules.flatMap((module) =>
        module.components
          .filter((c) => c.status === '借用中')
          .map((c) => ({
            ...c,
            moduleId: module.id,
            moduleName: module.moduleName,
            projectId: project.id,
            projectName: project.name,
            borrower: c.borrower || '',
          }))
      )
    );

  const filteredBorrowedComponents = borrowedComponents.filter(
    (c) =>
      c.componentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.componentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.borrower.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.projectName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: borrowRecords.length,
    borrowing: borrowRecords.filter((r) => r.status === '借用中').length,
    returned: borrowRecords.filter((r) => r.status === '已归还').length,
  };

  const canEdit = currentUser?.role !== 'viewer';

  return (
    <div>
      <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 mb-6`}>
        <div className={`${t.card} rounded-lg shadow-sm p-4 border ${t.border}`}>
          <div className={`text-sm ${t.textMuted}`}>总记录</div>
          <div className={`text-2xl font-bold ${t.text}`}>{stats.total}</div>
        </div>
        <div className={`${t.card} rounded-lg shadow-sm p-4 border ${t.border}`}>
          <div className={`text-sm ${t.textMuted}`}>借用中</div>
          <div className={`text-2xl font-bold ${getStatusColor('borrowing')}`}>{stats.borrowing}</div>
        </div>
        <div className={`${t.card} rounded-lg shadow-sm p-4 border ${t.border}`}>
          <div className={`text-sm ${t.textMuted}`}>已归还</div>
          <div className={`text-2xl font-bold ${getStatusColor('returned')}`}>{stats.returned}</div>
        </div>
      </div>

      <FilterArea
        projects={projects}
        onFilterChange={handleFilterChange}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`${t.card} rounded-lg shadow-sm p-6 border ${t.border}`}>
          <div className={`flex items-center gap-2 mb-4`}>
            <Package className="text-blue-400" size={20} />
            <h2 className={`text-lg font-semibold ${t.text}`}>可借用模块</h2>
            <span className={`text-sm ${t.textMuted}`}>({normalModules.length})</span>
          </div>
          {normalModules.length === 0 ? (
            <div className={`text-center py-8 ${t.textMuted}`}>
              <Package size={40} className="mx-auto mb-2 opacity-50" />
              <p>暂无可借用的模块</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              {normalModules.slice(0, 5).map((module) => (
                <div key={module.id} className={`flex items-center justify-between p-3 border rounded-lg ${t.border} ${t.hoverBg}`}>
                  <div>
                    <div className={`font-medium ${t.text}`}>{module.moduleName}</div>
                    <div className={`text-sm ${t.textMuted}`}>
                      {module.moduleNumber} | 项目: {module.projectName} | 组件: {module.componentCount}
                    </div>
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => handleBorrow('module', { id: module.id, name: `${module.moduleName} (${module.moduleNumber})`, projectId: module.projectId })}
                      className={`px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm`}
                    >
                      借用
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={`${t.card} rounded-lg shadow-sm p-6 border ${t.border}`}>
          <div className={`flex items-center gap-2 mb-4`}>
            <Settings className={getStatusColor('component')} size={20} />
            <h2 className={`text-lg font-semibold ${t.text}`}>可借用组件</h2>
            <span className={`text-sm ${t.textMuted}`}>({normalComponents.length})</span>
          </div>
          {normalComponents.length === 0 ? (
            <div className={`text-center py-8 ${t.textMuted}`}>
              <Settings size={40} className="mx-auto mb-2 opacity-50" />
              <p>暂无可借用的组件</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              {normalComponents.slice(0, 5).map((component) => (
                <div key={component.id} className={`flex items-center justify-between p-3 border rounded-lg ${t.border} ${t.hoverBg}`}>
                  <div>
                    <div className={`font-medium ${t.text}`}>{component.componentName}</div>
                    <div className={`text-sm ${t.textMuted}`}>
                      {component.componentNumber} | 模块: {component.moduleName} | 项目: {component.projectName}
                    </div>
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => handleBorrow('component', { id: component.id, name: `${component.componentName} (${component.componentNumber})`, moduleId: component.moduleId, projectId: component.projectId })}
                      className={`px-3 py-1 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 text-sm`}
                    >
                      借用
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={`mt-6 ${t.card} rounded-lg shadow-sm p-6 border ${t.border}`}>
        <div className={`flex items-center gap-2 mb-4`}>
          <ArrowRightLeft className={t.textMuted} size={20} />
          <h2 className={`text-lg font-semibold ${t.text}`}>借用记录</h2>
        </div>
        {borrowRecords.length === 0 ? (
          <div className={`text-center py-8 ${t.textMuted}`}>
            <ArrowRightLeft size={40} className="mx-auto mb-2 opacity-50" />
            <p>暂无借用记录</p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${t.textMuted}`} size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索已借出的模块（名称、编号、借用人、项目）"
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg ${t.input}`}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${t.textMuted} hover:${t.text}`}
                  >
                    <XCircle size={18} />
                  </button>
                )}
              </div>
            </div>
            {filteredBorrowedModules.length > 0 && (
              <div className="mb-4">
                <h3 className={`text-sm font-medium mb-2 ${t.textSecondary}`}>已借出的模块</h3>
                <div className="space-y-2">
                  {filteredBorrowedModules.map((module) => (
                    <div key={module.id} className={`flex items-center justify-between p-3 border rounded-lg ${t.emptyBg} ${t.border}`}>
                      <div>
                        <div className={`font-medium ${t.text}`}>{module.moduleName}</div>
                        <div className={`text-sm ${t.textMuted}`}>
                          {module.moduleNumber} | 项目: {module.projectName} | 借用人: {module.borrower}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {filteredBorrowedComponents.length > 0 && (
              <div className="mb-4">
                <h3 className={`text-sm font-medium mb-2 ${t.textSecondary}`}>已借出的组件</h3>
                <div className="space-y-2">
                  {filteredBorrowedComponents.map((component) => (
                    <div key={component.id} className={`flex items-center justify-between p-3 border rounded-lg ${t.emptyBg} ${t.border}`}>
                      <div>
                        <div className={`font-medium ${t.text}`}>{component.componentName}</div>
                        <div className={`text-sm ${t.textMuted}`}>
                          {component.componentNumber} | 模块: {component.moduleName} | 项目: {component.projectName} | 借用人: {component.borrower}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(() => {
              const activeRecords = borrowRecords.filter(r => r.status === '借用中');
              const returnedRecords = borrowRecords.filter(r => r.status === '已归还');
              return (
                <>
                  {activeRecords.length > 0 && (
                    <div className="mb-6">
                      <h3 className={`text-sm font-medium mb-3 ${t.textSecondary}`}>借用中记录 ({activeRecords.length})</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className={t.tableHeader}>
                            <tr>
                              <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>类型</th>
                              <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>名称</th>
                              <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>借用人</th>
                              <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>借用日期</th>
                              <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>预计归还</th>
                              {canEdit && <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>操作</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {activeRecords.map((record) => (
                              <tr key={record.id} className={`border-t ${t.border} ${t.hoverBg}`}>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-1 rounded text-xs ${
                                    record.itemType === 'module'
                                      ? (t.statusColors['借用中'] || 'bg-blue-500/20 text-blue-400')
                                      : (t.statusColors['正常'] || 'bg-emerald-500/20 text-emerald-400')
                                  }`}>
                                    {record.itemType === 'module' ? '模块' : '组件'}
                                  </span>
                                  {record.parentModuleBorrowId && (
                                    <span className={`ml-1 px-1 py-0.5 rounded text-xs bg-orange-500/20 ${t.textMuted}`}>
                                      随模块借用
                                    </span>
                                  )}
                                </td>
                                <td className={`px-4 py-3 ${t.text}`}>{record.itemName}</td>
                                <td className={`px-4 py-3 ${t.textSecondary}`}>{record.borrower}</td>
                                <td className={`px-4 py-3 ${t.textSecondary}`}>{new Date(record.borrowDate).toLocaleDateString()}</td>
                                <td className={`px-4 py-3 ${t.textSecondary}`}>
                                  {record.expectedReturnDate ? new Date(record.expectedReturnDate).toLocaleDateString() : '-'}
                                </td>
                                {canEdit && (
                                  <td className="px-4 py-3">
                                    {!record.parentModuleBorrowId && (
                                      <button
                                        onClick={() => handleReturn(record)}
                                        className={`flex items-center gap-1 ${t.accentText} hover:${t.accentText}`}
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
                    </div>
                  )}
                  {returnedRecords.length > 0 && (
                    <div>
                      <h3 className={`text-sm font-medium mb-3 ${t.textSecondary}`}>已归还记录 ({returnedRecords.length})</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className={t.tableHeader}>
                            <tr>
                              <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>类型</th>
                              <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>名称</th>
                              <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>借用人</th>
                              <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>借用日期</th>
                              <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>实际归还</th>
                              <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>状态</th>
                            </tr>
                          </thead>
                          <tbody>
                            {returnedRecords.map((record) => (
                              <tr key={record.id} className={`border-t ${t.border} ${t.hoverBg}`}>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-1 rounded text-xs ${
                                    record.itemType === 'module'
                                      ? 'bg-blue-500/20 text-blue-400'
                                      : 'bg-emerald-500/20 text-emerald-400'
                                  }`}>
                                    {record.itemType === 'module' ? '模块' : '组件'}
                                  </span>
                                </td>
                                <td className={`px-4 py-3 ${t.text}`}>{record.itemName}</td>
                                <td className={`px-4 py-3 ${t.textSecondary}`}>{record.borrower}</td>
                                <td className={`px-4 py-3 ${t.textSecondary}`}>{new Date(record.borrowDate).toLocaleDateString()}</td>
                                <td className={`px-4 py-3 ${t.textSecondary}`}>
                                  {record.actualReturnDate ? new Date(record.actualReturnDate).toLocaleDateString() : '-'}
                                </td>
                                <td className="px-4 py-3">
                                  <span className="px-2 py-1 rounded text-xs bg-emerald-500/20 text-emerald-400">
                                    已归还
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </>
        )}
      </div>

      {showBorrowModal && borrowData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[var(--z-top-layer)]" onClick={() => setShowBorrowModal(false)}>
          <div className={`${t.modalBg} rounded-lg p-6 w-full max-w-md border ${t.modalBorder}`} onClick={(e) => e.stopPropagation()}>
            <h2 className={`text-xl font-semibold mb-4 ${t.text}`}>确认借用</h2>
            <div className={`${t.emptyBg} rounded-lg p-4 mb-4`}>
              <div className={`text-sm ${t.textMuted} mb-1`}>借用物品</div>
              <div className={`font-medium ${t.text}`}>{borrowData.item.name}</div>
              <div className={`text-sm ${t.textMuted} mt-1`}>
                类型: {borrowData.type === 'module' ? '模块' : '组件'}
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>借用人</label>
                <input
                  type="text"
                  value={borrower}
                  onChange={(e) => setBorrower(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                  placeholder="请输入借用人姓名"
                  required
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>预计归还日期</label>
                <input
                  type="date"
                  value={expectedReturnDate}
                  onChange={(e) => setExpectedReturnDate(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>备注</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                  rows={2}
                  placeholder="可选备注"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowBorrowModal(false)}
                className={`flex-1 py-2 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}
              >
                取消
              </button>
              <button
                onClick={confirmBorrow}
                className={`flex-1 py-2 ${t.button} rounded-lg`}
              >
                确认借用
              </button>
            </div>
          </div>
        </div>
      )}

      {showReturnModal && returnData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[var(--z-top-layer)]" onClick={() => setShowReturnModal(false)}>
          <div className={`${t.modalBg} rounded-lg p-6 w-full max-w-md border ${t.modalBorder}`} onClick={(e) => e.stopPropagation()}>
            <h2 className={`text-xl font-semibold mb-4 ${t.text}`}>归还确认</h2>
            <div className={`${t.emptyBg} rounded-lg p-4 mb-4`}>
              <div className={`text-sm ${t.textMuted} mb-1`}>归还物品</div>
              <div className={`font-medium ${t.text}`}>{returnData.record.itemName}</div>
              <div className={`text-sm ${t.textMuted} mt-1`}>
                类型: {returnData.record.itemType === 'module' ? '模块' : '组件'} | 借用人: {returnData.record.borrower}
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${t.textSecondary}`}>请选择归还后的状态</label>
                <div className="grid grid-cols-3 gap-2">
                  {statusOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setReturnData({ ...returnData, newStatus: option.value })}
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                        returnData.newStatus === option.value
                          ? `${option.color} text-white`
                          : `${t.border} ${t.textSecondary} hover:${t.hoverBg}`
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>备注</label>
                <textarea
                  value={returnData.reason}
                  onChange={(e) => setReturnData({ ...returnData, reason: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                  rows={2}
                  placeholder="可选备注"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowReturnModal(false)}
                className={`flex-1 py-2 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}
              >
                取消
              </button>
              <button
                onClick={confirmReturn}
                className={`flex-1 py-2 ${t.button} rounded-lg`}
              >
                确认归还
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
