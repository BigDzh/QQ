import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Database, Trash2, Download, Upload, FileText, Package, Image, Folder,
  Search, ChevronLeft, ChevronRight, RefreshCw, Check,
  BarChart3, PieChart as PieChartIcon, TrendingUp, Activity, Clock,
  FileSpreadsheet, FileJson, File, AlertTriangle, CheckCircle2,
  XCircle, Loader2, RefreshCw as SyncIcon, SortAsc,
  SortDesc, FilterX, DownloadCloud
} from 'lucide-react';
import { useToast } from '../components/Toast';
import { useThemeStyles } from '../hooks/useThemeStyles';
import {
  initDB,
  searchFiles,
  deleteFile,
  deleteFiles,
  clearAllFiles,
  saveCoreData,
  getCoreData,
  getStorageStats,
  exportDatabase,
  importDatabase,
  getAllCoreDataKeys,
} from '../services/database';
import { formatFileSize } from '../utils/auth';
import { useApp } from '../context/AppContext';
import { hasPermission } from '../utils/auth';
import type { StorageStats } from '../services/database';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Area, AreaChart
} from 'recharts';
import { exportToPDF as exportPDF, exportToExcel as exportToExcelLazy } from '../utils/lazyImports';

interface FileRecord {
  id: string;
  projectId?: string;
  type: 'document' | 'software' | 'designFile' | 'image';
  name: string;
  size: number;
  createdAt: string;
}

interface DashboardMetrics {
  totalFiles: number;
  totalSize: number;
  filesByType: Record<string, number>;
  filesByDay: { date: string; count: number }[];
  recentActivity: { action: string; time: string; file: string }[];
  healthScore: number;
  growthRate: number;
}

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const exportToCSV = (data: FileRecord[], filename: string) => {
  const headers = ['ID', '文件名', '类型', '大小', '创建时间', '项目ID'];
  const rows = data.map(f => [
    f.id,
    f.name,
    f.type,
    f.size,
    f.createdAt,
    f.projectId || ''
  ]);
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const exportToExcel = async (data: FileRecord[], filename: string) => {
  try {
    await exportToExcelLazy(data.map(f => ({
      'ID': f.id,
      '文件名': f.name,
      '类型': f.type,
      '大小(字节)': f.size,
      '大小': formatFileSize(f.size),
      '创建时间': f.createdAt,
      '项目ID': f.projectId || ''
    })), filename, '文件数据');
  } catch (error) {
    console.error('Excel export failed:', error);
    throw error;
  }
};

const exportToPDFHandler = async (_data: FileRecord[], _metrics: DashboardMetrics, elementId: string, filename: string): Promise<boolean> => {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`PDF导出失败：找不到ID为"${elementId}"的元素`);
  }

  try {
    await exportPDF({ element, filename, scale: 2 });
    return true;
  } catch (error) {
    console.error('PDF export failed:', error);
    throw error;
  }
};

export default function DatabaseManagement() {
  const { showToast } = useToast();
  const t = useThemeStyles();
  const { projects, currentUser } = useApp();
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [stats, setStats] = useState<StorageStats>({ fileCount: 0, usedSpace: 0, quota: 0, byType: {} });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'createdAt', direction: 'desc' });
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics>({
    totalFiles: 0,
    totalSize: 0,
    filesByType: {},
    filesByDay: [],
    recentActivity: [],
    healthScore: 100,
    growthRate: 0
  });
  const [viewMode, setViewMode] = useState<'dashboard' | 'table' | 'charts'>('dashboard');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalFiles, setTotalFiles] = useState(0);
  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);

  const PAGE_SIZE = 50;
  const canDelete = currentUser && hasPermission(currentUser.role, 'component:delete');
  const canExport = currentUser && hasPermission(currentUser.role, 'project:read');

  useEffect(() => {
    loadData();
    loadSavedKeys();

    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
        autoRefreshRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    loadFiles();
  }, [typeFilter, projectFilter, searchKeyword, page, sortConfig]);

  useEffect(() => {
    if (autoRefreshRef.current) {
      clearInterval(autoRefreshRef.current);
      autoRefreshRef.current = null;
    }

    if (autoRefresh) {
      autoRefreshRef.current = setInterval(() => {
        loadData();
        loadFiles();
      }, 30000);
    }

    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
        autoRefreshRef.current = null;
      }
    };
  }, [autoRefresh]);

  const loadData = async () => {
    try {
      await initDB();
      const storageStats = await getStorageStats();
      setStats(storageStats);
      calculateMetrics(storageStats);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to load database:', error);
      showToast('数据加载失败', 'error');
    }
  };

  const calculateMetrics = (storageStats: StorageStats) => {
    const filesByDay: { date: string; count: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      filesByDay.push({ date: dateStr, count: 0 });
    }

    const totalRecentFiles = filesByDay.reduce((sum, d) => sum + d.count, 0);
    const growthRate = storageStats.fileCount > 0 && totalRecentFiles > 0 ?
      Math.round((totalRecentFiles / storageStats.fileCount) * 100) : 0;

    setDashboardMetrics({
      totalFiles: storageStats.fileCount,
      totalSize: storageStats.usedSpace,
      filesByType: Object.fromEntries(
        Object.entries(storageStats.byType).map(([k, v]) => [k, (v as { count: number }).count])
      ),
      filesByDay,
      recentActivity: [],
      healthScore: calculateHealthScore(storageStats),
      growthRate
    });
  };

  const calculateHealthScore = (stats: StorageStats): number => {
    let score = 100;
    if (stats.quota > 0) {
      const usagePercent = (stats.usedSpace / stats.quota) * 100;
      if (usagePercent > 90) score -= 30;
      else if (usagePercent > 75) score -= 15;
      else if (usagePercent > 50) score -= 5;
    }
    return Math.max(0, score);
  };

  const loadFiles = async () => {
    setLoading(true);
    try {
      const result = await searchFiles(searchKeyword, {
        type: typeFilter,
        projectId: projectFilter,
        page,
        pageSize: PAGE_SIZE,
      });

      let sortedFiles = [...result.items];
      if (sortConfig.key) {
        sortedFiles.sort((a, b) => {
          const aVal = a[sortConfig.key as keyof FileRecord];
          const bVal = b[sortConfig.key as keyof FileRecord];
          if (aVal === undefined || bVal === undefined) return 0;
          if (sortConfig.direction === 'asc') {
            return aVal > bVal ? 1 : -1;
          }
          return aVal < bVal ? 1 : -1;
        });
      }

      setFiles(sortedFiles);
      setTotalPages(result.totalPages);
      setTotalFiles(result.total);
    } catch (error) {
      console.error('Failed to load files:', error);
      showToast('文件列表加载失败', 'error');
    }
    setLoading(false);
  };

  const loadSavedKeys = async () => {
    try {
      const keys = await getAllCoreDataKeys();
      console.log('Loaded data keys:', keys);
    } catch (error) {
      console.error('Failed to load saved keys:', error);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    await loadFiles();
    setRefreshing(false);
    showToast('数据已刷新', 'success');
  }, []);

  const handleDelete = async (id: string) => {
    if (!canDelete) {
      showToast('您没有删除权限', 'error');
      return;
    }
    if (deleteConfirm !== id) {
      setDeleteConfirm(id);
      setTimeout(() => setDeleteConfirm(null), 3000);
      return;
    }
    try {
      await deleteFile(id);
      showToast('文件删除成功', 'success');
      setDeleteConfirm(null);
      handleRefresh();
    } catch (error) {
      showToast('删除失败', 'error');
    }
  };

  const handleBatchDelete = async () => {
    if (!canDelete) {
      showToast('您没有删除权限', 'error');
      return;
    }
    if (selectedFiles.length === 0) return;
    if (confirm(`确定要删除选中的 ${selectedFiles.length} 个文件吗？`)) {
      try {
        await deleteFiles(selectedFiles);
        showToast('批量删除成功', 'success');
        setSelectedFiles([]);
        handleRefresh();
      } catch (error) {
        showToast('批量删除失败', 'error');
      }
    }
  };

  const handleClearAll = async () => {
    if (!canDelete) {
      showToast('您没有清空权限', 'error');
      return;
    }
    if (confirm('确定要清空所有文件吗？此操作不可恢复！')) {
      try {
        await clearAllFiles();
        showToast('数据库已清空', 'success');
        handleRefresh();
      } catch (error) {
        showToast('清空失败', 'error');
      }
    }
  };

  const handleSaveCoreData = async () => {
    const data = {
      projects: localStorage.getItem('projects'),
      users: localStorage.getItem('users'),
      tasks: localStorage.getItem('tasks'),
      borrowRecords: localStorage.getItem('borrow_records'),
    };
    const key = `backup_${Date.now()}`;
    try {
      await saveCoreData(key, JSON.stringify(data));
      showToast('核心数据已保存到IndexedDB', 'success');
      loadSavedKeys();
    } catch (error) {
      showToast('保存失败', 'error');
    }
  };

  const handleLoadCoreData = async () => {
    try {
      const keys = await getAllCoreDataKeys();
      const latestKey = keys.length > 0 ? keys[keys.length - 1] : null;
      if (!latestKey) {
        showToast('未找到保存的核心数据', 'error');
        return;
      }
      const data = await getCoreData(latestKey);
      if (data) {
        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(data);
        } catch {
          showToast('数据格式错误', 'error');
          return;
        }
        if (typeof parsed !== 'object' || parsed === null) {
          showToast('数据格式错误', 'error');
          return;
        }
        if (parsed.projects && typeof parsed.projects === 'string') {
          localStorage.setItem('projects', parsed.projects);
        }
        if (parsed.users && typeof parsed.users === 'string') {
          localStorage.setItem('users', parsed.users);
        }
        if (parsed.tasks && typeof parsed.tasks === 'string') {
          localStorage.setItem('tasks', parsed.tasks);
        }
        if (parsed.borrowRecords && typeof parsed.borrowRecords === 'string') {
          localStorage.setItem('borrow_records', parsed.borrowRecords);
        }
        showToast(`核心数据已从 ${latestKey} 加载`, 'success');
      } else {
        showToast('未找到保存的核心数据', 'error');
      }
    } catch (error) {
      showToast('加载失败', 'error');
    }
  };

  const handleExport = async (format: 'json' | 'csv' | 'excel' | 'pdf') => {
    if (!canExport) {
      showToast('您没有导出权限', 'error');
      return;
    }
    setShowExportMenu(false);
    const timestamp = new Date().toISOString().slice(0, 10);
    try {
      switch (format) {
        case 'json': {
          const data = await exportDatabase();
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `database_backup_${timestamp}.json`;
          a.click();
          URL.revokeObjectURL(url);
          showToast('JSON导出成功', 'success');
          break;
        }
        case 'csv':
          exportToCSV(files, `files_export_${timestamp}`);
          showToast('CSV导出成功', 'success');
          break;
        case 'excel':
          exportToExcel(files, `files_export_${timestamp}`);
          showToast('Excel导出成功', 'success');
          break;
        case 'pdf':
          await exportToPDFHandler(files, dashboardMetrics, 'dashboard-content', `dashboard_${timestamp}`);
          showToast('PDF导出成功', 'success');
          break;
      }
    } catch (error) {
      showToast(`${format.toUpperCase()}导出失败`, 'error');
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    try {
      const text = await importFile.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        showToast('导入失败：文件格式不正确（无效的JSON）', 'error');
        setImporting(false);
        return;
      }
      if (!data || typeof data !== 'object') {
        showToast('导入失败：文件格式不正确', 'error');
        setImporting(false);
        return;
      }
      if (!Array.isArray(data.files)) {
        showToast('导入失败：文件数据格式无效', 'error');
        setImporting(false);
        return;
      }
      if (!data.coreData || typeof data.coreData !== 'object') {
        showToast('导入失败：核心数据格式无效', 'error');
        setImporting(false);
        return;
      }
      const result = await importDatabase({
        files: data.files,
        coreData: data.coreData,
        clearFirst: true,
      });
      showToast(`导入成功：${result.filesImported} 个文件，${result.coreDataImported} 条数据`, 'success');
      setShowImportModal(false);
      setImportFile(null);
      handleRefresh();
    } catch (error) {
      showToast('导入失败：文件格式不正确', 'error');
    }
    setImporting(false);
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const clearFilters = () => {
    setSearchKeyword('');
    setTypeFilter('all');
    setProjectFilter('all');
    setPage(1);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'document': return <FileText size={16} className="text-blue-500" />;
      case 'software': return <Package size={16} className="text-green-500" />;
      case 'image': return <Image size={16} className="text-purple-500" />;
      default: return <Folder size={16} className="text-gray-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'document': return '文档';
      case 'software': return '软件';
      case 'designFile': return '设计文件';
      case 'image': return '图片';
      default: return type;
    }
  };

  const usagePercent = stats.quota > 0 ? Math.round((stats.usedSpace / stats.quota) * 100) : 0;

  const pieChartData = Object.entries(dashboardMetrics.filesByType).map(([name, value]) => ({
    name: getTypeLabel(name),
    value
  }));

  const chartTypeData = Object.entries(dashboardMetrics.filesByType).map(([type, count]) => ({
    type: getTypeLabel(type),
    count,
    fill: COLORS[Object.keys(dashboardMetrics.filesByType).indexOf(type) % COLORS.length]
  }));

  const hasActiveFilters = searchKeyword || typeFilter !== 'all' || projectFilter !== 'all';

  const renderDashboard = () => (
    <div id="dashboard-content" className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className={`${t.card} rounded-lg shadow-sm p-4 border ${t.border}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <File size={20} className="text-blue-600" />
            </div>
            <div>
              <div className={`text-sm ${t.textMuted}`}>文件总数</div>
              <div className={`text-2xl font-bold ${t.text}`}>{stats.fileCount}</div>
            </div>
          </div>
        </div>

        <div className={`${t.card} rounded-lg shadow-sm p-4 border ${t.border}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Database size={20} className="text-green-600" />
            </div>
            <div>
              <div className={`text-sm ${t.textMuted}`}>已用空间</div>
              <div className={`text-2xl font-bold ${t.text}`}>{formatFileSize(stats.usedSpace)}</div>
            </div>
          </div>
        </div>

        <div className={`${t.card} rounded-lg shadow-sm p-4 border ${t.border}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Activity size={20} className="text-orange-600" />
            </div>
            <div>
              <div className={`text-sm ${t.textMuted}`}>使用率</div>
              <div className={`text-2xl font-bold ${t.accentText}`}>{usagePercent}%</div>
            </div>
          </div>
        </div>

        <div className={`${t.card} rounded-lg shadow-sm p-4 border ${t.border}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp size={20} className="text-purple-600" />
            </div>
            <div>
              <div className={`text-sm ${t.textMuted}`}>增长率</div>
              <div className={`text-2xl font-bold ${t.text}`}>{dashboardMetrics.growthRate}%</div>
            </div>
          </div>
        </div>

        <div className={`${t.card} rounded-lg shadow-sm p-4 border ${t.border}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${dashboardMetrics.healthScore >= 80 ? 'bg-green-100' : dashboardMetrics.healthScore >= 50 ? 'bg-yellow-100' : 'bg-red-100'}`}>
              {dashboardMetrics.healthScore >= 80 ? (
                <CheckCircle2 size={20} className="text-green-600" />
              ) : dashboardMetrics.healthScore >= 50 ? (
                <AlertTriangle size={20} className="text-yellow-600" />
              ) : (
                <XCircle size={20} className="text-red-600" />
              )}
            </div>
            <div>
              <div className={`text-sm ${t.textMuted}`}>健康度</div>
              <div className={`text-2xl font-bold ${dashboardMetrics.healthScore >= 80 ? 'text-green-600' : dashboardMetrics.healthScore >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                {dashboardMetrics.healthScore}%
              </div>
            </div>
          </div>
        </div>

        <div className={`${t.card} rounded-lg shadow-sm p-4 border ${t.border}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-100 rounded-lg">
              <Clock size={20} className="text-cyan-600" />
            </div>
            <div>
              <div className={`text-sm ${t.textMuted}`}>搜索结果</div>
              <div className={`text-2xl font-bold ${t.text}`}>{totalFiles}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`${t.card} rounded-lg shadow-sm p-4 border ${t.border}`}>
          <h3 className={`text-lg font-semibold mb-4 ${t.text}`}>文件类型分布</h3>
          <div className="h-64">
            {pieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [value, '文件数']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className={t.textMuted}>暂无数据</p>
              </div>
            )}
          </div>
        </div>

        <div className={`${t.card} rounded-lg shadow-sm p-4 border ${t.border}`}>
          <h3 className={`text-lg font-semibold mb-4 ${t.text}`}>文件数量统计</h3>
          <div className="h-64">
            {chartTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartTypeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {chartTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className={t.textMuted}>暂无数据</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {Object.keys(stats.byType).length > 0 && (
        <div className={`${t.card} rounded-lg shadow-sm p-4 border ${t.border}`}>
          <h3 className={`text-lg font-semibold mb-4 ${t.text}`}>各类文件详情</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats.byType).map(([type, data]) => (
              <div key={type} className={`p-3 rounded-lg border ${t.border}`}>
                <div className="flex items-center gap-2 mb-2">
                  {getTypeIcon(type)}
                  <span className={`font-medium ${t.text}`}>{getTypeLabel(type)}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className={t.textMuted}>数量:</span>
                    <span className={t.text}>{(data as { count: number }).count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={t.textMuted}>大小:</span>
                    <span className={t.text}>{formatFileSize((data as { size: number }).size)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={`${t.card} rounded-lg shadow-sm p-4 border ${t.border}`}>
        <h3 className={`text-lg font-semibold mb-4 ${t.text}`}>存储概览</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span className={t.textMuted}>存储使用</span>
              <span className={t.text}>{formatFileSize(stats.usedSpace)} / {formatFileSize(stats.quota)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  usagePercent > 90 ? 'bg-red-500' : usagePercent > 75 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(usagePercent, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTable = () => (
    <div className={`${t.card} rounded-lg shadow-sm overflow-hidden border ${t.border}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className={t.tableHeader}>
            <tr>
              <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary} w-12`}>
                <input
                  type="checkbox"
                  checked={selectedFiles.length === files.length && files.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedFiles(files.map((f) => f.id));
                    } else {
                      setSelectedFiles([]);
                    }
                  }}
                  className="w-4 h-4"
                />
              </th>
              <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>
                <button onClick={() => handleSort('name')} className="flex items-center gap-1 hover:text-blue-500">
                  文件名
                  {sortConfig.key === 'name' && (
                    sortConfig.direction === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />
                  )}
                </button>
              </th>
              <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>类型</th>
              <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>
                <button onClick={() => handleSort('size')} className="flex items-center gap-1 hover:text-blue-500">
                  大小
                  {sortConfig.key === 'size' && (
                    sortConfig.direction === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />
                  )}
                </button>
              </th>
              <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>
                <button onClick={() => handleSort('createdAt')} className="flex items-center gap-1 hover:text-blue-500">
                  创建时间
                  {sortConfig.key === 'createdAt' && (
                    sortConfig.direction === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />
                  )}
                </button>
              </th>
              <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>操作</th>
            </tr>
          </thead>
          <tbody>
            {files.map((file) => (
              <tr key={file.id} className={`border-t ${t.border} ${t.hoverBg}`}>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedFiles.includes(file.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedFiles([...selectedFiles, file.id]);
                      } else {
                        setSelectedFiles(selectedFiles.filter((id) => id !== file.id));
                      }
                    }}
                    className="w-4 h-4"
                  />
                </td>
                <td className={`px-4 py-3 font-medium ${t.text}`}>{file.name}</td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1">
                    {getTypeIcon(file.type)}
                    <span className={t.textSecondary}>{getTypeLabel(file.type)}</span>
                  </span>
                </td>
                <td className={`px-4 py-3 ${t.textSecondary}`}>{formatFileSize(file.size)}</td>
                <td className={`px-4 py-3 text-sm ${t.textMuted}`}>
                  {new Date(file.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleDelete(file.id)}
                    className={`p-1.5 rounded transition-colors ${
                      deleteConfirm === file.id
                        ? 'bg-red-500 text-white'
                        : 'text-red-400 hover:bg-red-50'
                    }`}
                    disabled={!canDelete}
                    title={canDelete ? '点击确认删除' : '无删除权限'}
                  >
                    {deleteConfirm === file.id ? <Check size={16} /> : <Trash2 size={16} />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 p-4 border-t">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className={`p-2 rounded-lg border ${page === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
          >
            <ChevronLeft size={20} />
          </button>
          <span className={t.text}>
            第 {page} / {totalPages} 页
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className={`p-2 rounded-lg border ${page === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">数据库管理</h1>
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <span className={`text-sm ${t.textMuted}`}>
              最后更新: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`p-2 rounded-lg border transition-colors ${autoRefresh ? 'bg-green-100 border-green-300 text-green-600' : t.border}`}
            title={autoRefresh ? '自动刷新已开启 (30秒)' : '自动刷新已关闭'}
          >
            <SyncIcon size={18} className={autoRefresh ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`flex items-center gap-2 px-3 py-2 ${t.button} text-white rounded-lg`}
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            刷新
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b">
        <button
          onClick={() => setViewMode('dashboard')}
          className={`px-4 py-2 font-medium transition-colors ${
            viewMode === 'dashboard' ? 'border-b-2 border-blue-500 text-blue-600' : t.textMuted
          }`}
        >
          <BarChart3 size={18} className="inline mr-2" />
          仪表盘
        </button>
        <button
          onClick={() => setViewMode('table')}
          className={`px-4 py-2 font-medium transition-colors ${
            viewMode === 'table' ? 'border-b-2 border-blue-500 text-blue-600' : t.textMuted
          }`}
        >
          <Database size={18} className="inline mr-2" />
          数据表
        </button>
        <button
          onClick={() => setViewMode('charts')}
          className={`px-4 py-2 font-medium transition-colors ${
            viewMode === 'charts' ? 'border-b-2 border-blue-500 text-blue-600' : t.textMuted
          }`}
        >
          <PieChartIcon size={18} className="inline mr-2" />
          图表
        </button>
      </div>

      {viewMode === 'dashboard' && renderDashboard()}

      {viewMode === 'charts' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={`${t.card} rounded-lg shadow-sm p-4 border ${t.border}`}>
              <h3 className={`text-lg font-semibold mb-4 ${t.text}`}>文件趋势</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dashboardMetrics.filesByDay}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="count" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className={`${t.card} rounded-lg shadow-sm p-4 border ${t.border}`}>
              <h3 className={`text-lg font-semibold mb-4 ${t.text}`}>文件类型对比</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartTypeData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="type" type="category" width={80} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {chartTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'table' && (
        <>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleSaveCoreData}
              className={`flex items-center gap-2 px-4 py-2 ${t.button} text-white rounded-lg`}
            >
              <Database size={18} />
              备份核心数据
            </button>
            <button
              onClick={handleLoadCoreData}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              <Download size={18} />
              恢复核心数据
            </button>
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                <DownloadCloud size={18} />
                导出数据
              </button>
              {showExportMenu && (
                <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border z-10 min-w-[160px]">
                  <button
                    onClick={() => handleExport('json')}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
                  >
                    <FileJson size={16} />
                    JSON 格式
                  </button>
                  <button
                    onClick={() => handleExport('csv')}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
                  >
                    <FileSpreadsheet size={16} />
                    CSV 格式
                  </button>
                  <button
                    onClick={() => handleExport('excel')}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
                  >
                    <FileSpreadsheet size={16} />
                    Excel 格式
                  </button>
                  <button
                    onClick={() => handleExport('pdf')}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
                  >
                    <File size={16} />
                    PDF 格式
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
            >
              <Upload size={18} />
              导入数据
            </button>
            {canDelete && (
              <button
                onClick={handleClearAll}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                <Trash2 size={18} />
                清空数据库
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="搜索文件名..."
                value={searchKeyword}
                onChange={(e) => {
                  setSearchKeyword(e.target.value);
                  setPage(1);
                }}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg ${t.input}`}
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className={`px-3 py-2 border rounded-lg ${t.input}`}
            >
              <option value="all">全部类型</option>
              <option value="document">文档</option>
              <option value="software">软件</option>
              <option value="designFile">设计文件</option>
              <option value="image">图片</option>
            </select>
            <select
              value={projectFilter}
              onChange={(e) => {
                setProjectFilter(e.target.value);
                setPage(1);
              }}
              className={`px-3 py-2 border rounded-lg ${t.input}`}
            >
              <option value="all">全部项目</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg"
              >
                <FilterX size={16} />
                清除筛选
              </button>
            )}
            {selectedFiles.length > 0 && (
              <button
                onClick={handleBatchDelete}
                disabled={!canDelete}
                className={`flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50`}
              >
                <Trash2 size={18} />
                删除选中 ({selectedFiles.length})
              </button>
            )}
          </div>

          {loading ? (
            <div className={`text-center py-12 ${t.card} rounded-lg border ${t.border}`}>
              <Loader2 className={`w-8 h-8 animate-spin mx-auto ${t.accent}`} />
              <p className={`${t.textMuted} mt-2`}>加载中...</p>
            </div>
          ) : files.length === 0 ? (
            <div className={`text-center py-12 ${t.card} rounded-lg border ${t.border}`}>
              <Database className={`mx-auto ${t.textMuted} mb-4`} size={48} />
              <p className={t.textMuted}>暂无文件</p>
            </div>
          ) : (
            renderTable()
          )}
        </>
      )}

      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowImportModal(false)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">导入数据库</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                选择备份文件
              </label>
              <input
                type="file"
                accept=".json"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <p className="text-sm text-red-500 mb-4">
              注意：导入将清空现有数据，此操作不可恢复！
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowImportModal(false)}
                className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleImport}
                disabled={!importFile || importing}
                className={`flex-1 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50`}
              >
                {importing ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    导入中...
                  </span>
                ) : '确认导入'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}