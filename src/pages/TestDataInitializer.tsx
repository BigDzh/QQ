import { useState, useCallback, useMemo } from 'react';
import { Play, CheckCircle, Package, FileText, ArrowRightLeft, Trash2, RefreshCw, AlertTriangle, Database, Layers, Cpu, ClipboardList, Repeat, FolderOpen, TestTube2 } from 'lucide-react';
import { useToast } from '../components/Toast';
import { ConfirmModal } from '../pages/ProjectDetail/components/ConfirmModal';
import { clearAllFiles, exportDatabase } from '../services/database';
import { getAllCoreDataKeys, deleteCoreData } from '../services/database';
import {
  getDefaultTestData,
  getTestDataSets,
  getTestDataStats,
  createNormalProjects,
  createBoundaryProjects,
  createErrorProjects,
  createEdgeCaseProjects,
  createNormalTasks,
  createBoundaryTasks,
  createErrorTasks,
  createEdgeCaseTasks,
  createNormalBorrowRecords,
  createEdgeCaseBorrowRecords,
  type TestDataCategory,
} from '../testData';

const TEST_DATA_KEYS = {
  PROJECTS: 'projects',
  TASKS: 'tasks',
  BORROW_RECORDS: 'borrow_records',
  SEARCH_HISTORY: 'search_history',
  AUDIT_LOGS: 'audit_logs',
  BACKUP_RECORDS: 'backup_records',
  USER_PREFERENCES: 'user_preferences',
};

interface ClearResult {
  localStorageCleared: number;
  indexedDBFilesCleared: number;
  indexedDBCoreDataCleared: number;
  cacheCleared: boolean;
}

interface DataCategoryInfo {
  category: TestDataCategory;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  count: number;
}

export default function TestDataInitializer() {
  const { showToast } = useToast();
  const [initialized, setInitialized] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<TestDataCategory>('normal');

  const dataSets = useMemo(() => getTestDataSets(), []);
  const stats = useMemo(() => getTestDataStats(), []);

  const categoryInfo: Record<TestDataCategory, DataCategoryInfo> = useMemo(() => ({
    normal: {
      category: 'normal',
      label: '正常数据',
      description: '符合业务规则的常规测试数据，用于功能测试',
      icon: <CheckCircle className="w-5 h-5" />,
      color: 'text-green-600',
      bgColor: 'bg-green-50 border-green-200',
      count: (dataSets.normal.projects?.length || 0) + (dataSets.normal.tasks?.length || 0) + (dataSets.normal.borrowRecords?.length || 0),
    },
    boundary: {
      category: 'boundary',
      label: '边界数据',
      description: '测试数据边界值，包括最大值、最小值、空值等',
      icon: <Layers className="w-5 h-5" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 border-blue-200',
      count: (dataSets.boundary.projects?.length || 0) + (dataSets.boundary.tasks?.length || 0),
    },
    error: {
      category: 'error',
      label: '异常数据',
      description: '包含无效值、null、undefined等异常数据，用于错误处理测试',
      icon: <AlertTriangle className="w-5 h-5" />,
      color: 'text-red-600',
      bgColor: 'bg-red-50 border-red-200',
      count: (dataSets.error.projects?.length || 0) + (dataSets.error.tasks?.length || 0),
    },
    edge_case: {
      category: 'edge_case',
      label: '边缘数据',
      description: '特殊场景数据，包括Unicode、特殊字符、超长字符串等',
      icon: <TestTube2 className="w-5 h-5" />,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 border-purple-200',
      count: (dataSets.edge_case.projects?.length || 0) + (dataSets.edge_case.tasks?.length || 0) + (dataSets.edge_case.borrowRecords?.length || 0),
    },
  }), [dataSets]);

  const getCurrentDataStats = useCallback(() => {
    let projects = 0, modules = 0, components = 0, tasks = 0, borrowRecords = 0;

    try {
      const projectsData = localStorage.getItem(TEST_DATA_KEYS.PROJECTS);
      if (projectsData) {
        const parsed = JSON.parse(projectsData);
        projects = parsed.length;
        modules = parsed.reduce((sum: number, p: any) => sum + ((p.modules && Array.isArray(p.modules)) ? p.modules.length : 0), 0);
        components = parsed.reduce((sum: number, p: any) =>
          sum + ((p.modules && Array.isArray(p.modules)) ? p.modules.reduce((s: number, m: any) => s + ((m.components && Array.isArray(m.components)) ? m.components.length : 0), 0) : 0), 0);
      }
    } catch {}

    try {
      const tasksData = localStorage.getItem(TEST_DATA_KEYS.TASKS);
      if (tasksData) tasks = JSON.parse(tasksData).length;
    } catch {}

    try {
      const borrowData = localStorage.getItem(TEST_DATA_KEYS.BORROW_RECORDS);
      if (borrowData) borrowRecords = JSON.parse(borrowData).length;
    } catch {}

    return { projects, modules, components, tasks, borrowRecords };
  }, []);

  const currentStats = useMemo(() => getCurrentDataStats(), [getCurrentDataStats]);

  const handleInitData = useCallback(() => {
    localStorage.removeItem(TEST_DATA_KEYS.PROJECTS);
    localStorage.removeItem(TEST_DATA_KEYS.TASKS);
    localStorage.removeItem(TEST_DATA_KEYS.BORROW_RECORDS);

    const defaultData = getDefaultTestData();
    localStorage.setItem(TEST_DATA_KEYS.PROJECTS, JSON.stringify(defaultData.projects));
    localStorage.setItem(TEST_DATA_KEYS.TASKS, JSON.stringify(defaultData.tasks));
    localStorage.setItem(TEST_DATA_KEYS.BORROW_RECORDS, JSON.stringify(defaultData.borrowRecords));

    setInitialized(true);
    showToast('测试数据初始化成功！', 'success');
    setTimeout(() => window.location.reload(), 1500);
  }, [showToast]);

  const handleInitCategoryData = useCallback((category: TestDataCategory) => {
    localStorage.removeItem(TEST_DATA_KEYS.PROJECTS);
    localStorage.removeItem(TEST_DATA_KEYS.TASKS);
    localStorage.removeItem(TEST_DATA_KEYS.BORROW_RECORDS);

    let projects: any[] = [];
    let tasks: any[] = [];
    let borrowRecords: any[] = [];

    switch (category) {
      case 'normal':
        projects = dataSets.normal.projects;
        tasks = dataSets.normal.tasks;
        borrowRecords = dataSets.normal.borrowRecords;
        break;
      case 'boundary':
        projects = dataSets.boundary.projects;
        tasks = dataSets.boundary.tasks;
        break;
      case 'error':
        projects = dataSets.error.projects;
        tasks = dataSets.error.tasks;
        break;
      case 'edge_case':
        projects = dataSets.edge_case.projects;
        tasks = dataSets.edge_case.tasks;
        borrowRecords = dataSets.edge_case.borrowRecords;
        break;
    }

    localStorage.setItem(TEST_DATA_KEYS.PROJECTS, JSON.stringify(projects));
    localStorage.setItem(TEST_DATA_KEYS.TASKS, JSON.stringify(tasks));
    localStorage.setItem(TEST_DATA_KEYS.BORROW_RECORDS, JSON.stringify(borrowRecords));

    setInitialized(true);
    showToast(`${categoryInfo[category].label}初始化成功！`, 'success');
    setTimeout(() => window.location.reload(), 1500);
  }, [dataSets, categoryInfo, showToast]);

  const clearAllTestData = useCallback(async (): Promise<ClearResult> => {
    const result: ClearResult = {
      localStorageCleared: 0,
      indexedDBFilesCleared: 0,
      indexedDBCoreDataCleared: 0,
      cacheCleared: false,
    };

    const testDataKeys = Object.values(TEST_DATA_KEYS);
    for (const key of testDataKeys) {
      if (localStorage.getItem(key) !== null) {
        localStorage.removeItem(key);
        result.localStorageCleared++;
      }
    }

    const projectsData = localStorage.getItem('projects');
    const tasksData = localStorage.getItem('tasks');
    const borrowData = localStorage.getItem('borrow_records');
    if (projectsData) result.localStorageCleared++;
    if (tasksData) result.localStorageCleared++;
    if (borrowData) result.localStorageCleared++;

    try {
      await clearAllFiles();
      const db = await exportDatabase();
      result.indexedDBFilesCleared = db.files.length;
    } catch (error) {
      console.error('Failed to clear IndexedDB files:', error);
    }

    try {
      const coreDataKeys = await getAllCoreDataKeys();
      for (const key of coreDataKeys) {
        await deleteCoreData(key);
        result.indexedDBCoreDataCleared++;
      }
    } catch (error) {
      console.error('Failed to clear IndexedDB coreData:', error);
    }

    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
        result.cacheCleared = cacheNames.length > 0;
      }
    } catch (error) {
      console.error('Failed to clear caches:', error);
    }

    return result;
  }, []);

  const handleClearAllData = useCallback(async () => {
    setIsClearing(true);
    try {
      const result = await clearAllTestData();
      showToast(
        `数据清除完成！已清除：本地存储${result.localStorageCleared}项、IndexedDB文件${result.indexedDBFilesCleared}个、IndexedDB核心数据${result.indexedDBCoreDataCleared}项、缓存${result.cacheCleared ? '已清除' : '无'}`,
        'success'
      );
      setShowClearConfirm(false);
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      showToast(`清除数据时出错: ${error instanceof Error ? error.message : '未知错误'}`, 'error');
    } finally {
      setIsClearing(false);
    }
  }, [clearAllTestData, showToast]);

  const handleUpdateTestData = useCallback(async () => {
    setIsUpdating(true);
    try {
      const defaultData = getDefaultTestData();

      localStorage.setItem(TEST_DATA_KEYS.PROJECTS, JSON.stringify(defaultData.projects));
      localStorage.setItem(TEST_DATA_KEYS.TASKS, JSON.stringify(defaultData.tasks));
      localStorage.setItem(TEST_DATA_KEYS.BORROW_RECORDS, JSON.stringify(defaultData.borrowRecords));

      showToast(
        `测试数据已更新！项目: ${defaultData.projects.length}，任务: ${defaultData.tasks.length}，借用记录: ${defaultData.borrowRecords.length}`,
        'success'
      );
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      showToast(`更新数据时出错: ${error instanceof Error ? error.message : '未知错误'}`, 'error');
    } finally {
      setIsUpdating(false);
    }
  }, [showToast]);

  if (initialized) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-green-600">测试数据已初始化</h2>
          <p className="text-gray-500 mt-2">请刷新页面查看测试数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">测试数据管理中心</h1>
        <p className="text-gray-500">系统化管理测试数据，支持多种数据类型分类，包括正常数据、边界数据、异常数据和边缘数据</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-600" />
          测试数据统计
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalProjects}</div>
              <div className="text-sm text-gray-500">项目总数</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Layers className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalModules}</div>
              <div className="text-sm text-gray-500">模块总数</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="p-2 bg-green-100 rounded-lg">
              <Cpu className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalComponents}</div>
              <div className="text-sm text-gray-500">组件总数</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="p-2 bg-orange-100 rounded-lg">
              <ClipboardList className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalTasks}</div>
              <div className="text-sm text-gray-500">任务总数</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="p-2 bg-cyan-100 rounded-lg">
              <Repeat className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalBorrowRecords}</div>
              <div className="text-sm text-gray-500">借用记录</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <FileText className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalDocuments}</div>
              <div className="text-sm text-gray-500">文档总数</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="p-2 bg-pink-100 rounded-lg">
              <FolderOpen className="w-5 h-5 text-pink-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalSoftware}</div>
              <div className="text-sm text-gray-500">软件总数</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalSystems}</div>
              <div className="text-sm text-gray-500">系统总数</div>
            </div>
          </div>
        </div>

        {currentStats.projects > 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              当前已加载数据：{currentStats.projects}个项目、{currentStats.modules}个模块、{currentStats.components}个组件、{currentStats.tasks}个任务、{currentStats.borrowRecords}条借用记录
            </p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TestTube2 className="w-5 h-5 text-purple-600" />
          选择测试数据类型
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(Object.keys(categoryInfo) as TestDataCategory[]).map((cat) => {
            const info = categoryInfo[cat];
            return (
              <div
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedCategory === cat
                    ? 'border-blue-500 ring-2 ring-blue-200'
                    : 'border-gray-200 hover:border-gray-300'
                } ${info.bgColor}`}
              >
                <div className={`flex items-center gap-2 mb-2 ${info.color}`}>
                  {info.icon}
                  <span className="font-medium">{info.label}</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{info.description}</p>
                <div className="text-xs text-gray-500">
                  <span className="font-medium">{info.count}</span> 条测试数据
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Play className="w-5 h-5 text-green-600" />
            初始化 {categoryInfo[selectedCategory].label}
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            初始化{categoryInfo[selectedCategory].label}到本地存储，覆盖现有数据。
          </p>
          <button
            onClick={() => handleInitCategoryData(selectedCategory)}
            className={`w-full flex items-center justify-center gap-2 px-6 py-3 text-white rounded-lg hover:opacity-90 transition ${
              selectedCategory === 'normal' ? 'bg-green-600' :
              selectedCategory === 'boundary' ? 'bg-blue-600' :
              selectedCategory === 'error' ? 'bg-red-600' :
              'bg-purple-600'
            }`}
          >
            <Play className="w-5 h-5" />
            初始化 {categoryInfo[selectedCategory].label}
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-blue-600" />
            更新测试数据
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            用最新的正常测试数据模板更新现有数据。
          </p>
          <button
            onClick={handleUpdateTestData}
            disabled={isUpdating}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUpdating ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                更新中...
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5" />
                更新测试数据
              </>
            )}
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-600" />
            清除所有测试数据
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            彻底删除所有测试数据，包括本地存储、IndexedDB数据库记录和浏览器缓存。
          </p>
          <button
            onClick={() => setShowClearConfirm(true)}
            disabled={isClearing}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isClearing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                清除中...
              </>
            ) : (
              <>
                <Trash2 className="w-5 h-5" />
                清除所有测试数据
              </>
            )}
          </button>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-yellow-800 mb-2 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          注意事项
        </h3>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• 初始化和更新将覆盖现有的项目、任务和借用记录数据</li>
          <li>• 清除操作会彻底删除所有相关数据，包括IndexedDB中的文件记录</li>
          <li>• 清除操作会清理浏览器缓存，这是测试数据，仅供功能演示使用</li>
          <li>• 执行操作后需要刷新页面才能看到最新状态</li>
          <li>• 异常数据和边界数据仅用于测试系统的错误处理和边界值处理能力</li>
        </ul>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-3">完整初始化</h3>
        <p className="text-sm text-gray-500 mb-4">
          点击下方按钮初始化完整的正常测试数据到本地存储（项目、任务、借用记录）。
        </p>
        <button
          onClick={handleInitData}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
        >
          <Play className="w-5 h-5" />
          初始化完整测试数据
        </button>
      </div>

      <ConfirmModal
        show={showClearConfirm}
        title="确认清除所有测试数据？"
        message="此操作将彻底删除所有测试数据，包括：1) 本地存储中的项目、任务、借用记录；2) IndexedDB中的文件记录；3) 浏览器缓存数据。此操作不可撤销，请谨慎操作！"
        onConfirm={handleClearAllData}
        onCancel={() => setShowClearConfirm(false)}
        confirmText="确认清除"
        cancelText="取消"
        type="danger"
      />
    </div>
  );
}
