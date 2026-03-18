import { useState, useEffect } from 'react';
import { Database, Trash2, Download, FileText, Package, Image, Folder } from 'lucide-react';
import { useToast } from '../components/Toast';
import {
  initDB,
  getAllFiles,
  getStorageStats,
  deleteFile,
  deleteFiles,
  clearAllFiles,
  saveCoreData,
  getCoreData,
} from '../services/database';
import { formatFileSize } from '../utils/auth';
import { useApp } from '../context/AppContext';

interface FileRecord {
  id: string;
  projectId?: string;
  type: 'document' | 'software' | 'designFile' | 'image';
  name: string;
  size: number;
  createdAt: string;
}

export default function DatabaseManagement() {
  const { showToast } = useToast();
  const { projects } = useApp();
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [stats, setStats] = useState({ fileCount: 0, usedSpace: 0, quota: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await initDB();
      const [fileList, storageStats] = await Promise.all([
        getAllFiles(),
        getStorageStats(),
      ]);
      
      const mappedFiles: FileRecord[] = fileList.map((f: FileRecord & { data?: Blob }) => ({
        id: f.id,
        projectId: f.projectId,
        type: f.type,
        name: f.name,
        size: f.size,
        createdAt: f.createdAt,
      }));
      
      setFiles(mappedFiles);
      setStats(storageStats);
    } catch (error) {
      console.error('Failed to load database:', error);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这个文件吗？')) {
      await deleteFile(id);
      showToast('文件删除成功', 'success');
      loadData();
    }
  };

  const handleBatchDelete = async () => {
    if (selectedFiles.length === 0) return;
    if (confirm(`确定要删除选中的 ${selectedFiles.length} 个文件吗？`)) {
      await deleteFiles(selectedFiles);
      showToast('批量删除成功', 'success');
      setSelectedFiles([]);
      loadData();
    }
  };

  const handleClearAll = async () => {
    if (confirm('确定要清空所有文件吗？此操作不可恢复！')) {
      await clearAllFiles();
      showToast('数据库已清空', 'success');
      loadData();
    }
  };

  const handleSaveCoreData = async () => {
    const data = {
      projects: localStorage.getItem('projects'),
      users: localStorage.getItem('users'),
      tasks: localStorage.getItem('tasks'),
      borrowRecords: localStorage.getItem('borrow_records'),
    };
    await saveCoreData('core', JSON.stringify(data));
    showToast('核心数据已保存到IndexedDB', 'success');
  };

  const handleLoadCoreData = async () => {
    const data = await getCoreData('core');
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed.projects) localStorage.setItem('projects', parsed.projects);
      if (parsed.users) localStorage.setItem('users', parsed.users);
      if (parsed.tasks) localStorage.setItem('tasks', parsed.tasks);
      if (parsed.borrowRecords) localStorage.setItem('borrow_records', parsed.borrowRecords);
      showToast('核心数据已从IndexedDB加载', 'success');
    } else {
      showToast('未找到保存的核心数据', 'error');
    }
  };

  const filteredFiles = files.filter((file) => {
    if (typeFilter !== 'all' && file.type !== typeFilter) return false;
    if (projectFilter !== 'all' && file.projectId !== projectFilter) return false;
    return true;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'document':
        return <FileText size={16} className="text-blue-500" />;
      case 'software':
        return <Package size={16} className="text-green-500" />;
      case 'image':
        return <Image size={16} className="text-purple-500" />;
      default:
        return <Folder size={16} className="text-gray-500" />;
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

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-sm text-gray-500">文件数量</div>
          <div className="text-2xl font-bold">{stats.fileCount}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-sm text-gray-500">已用空间</div>
          <div className="text-2xl font-bold">{formatFileSize(stats.usedSpace)}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-sm text-gray-500">存储配额</div>
          <div className="text-2xl font-bold">{formatFileSize(stats.quota)}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-sm text-gray-500">使用率</div>
          <div className="text-2xl font-bold text-primary-600">{usagePercent}%</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={handleSaveCoreData}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <Database size={18} />
          保存核心数据
        </button>
        <button
          onClick={handleLoadCoreData}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Download size={18} />
          加载核心数据
        </button>
        <button
          onClick={handleClearAll}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          <Trash2 size={18} />
          清空数据库
        </button>
      </div>

      <div className="flex flex-wrap gap-4 mb-4">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="all">全部类型</option>
          <option value="document">文档</option>
          <option value="software">软件</option>
          <option value="designFile">设计文件</option>
          <option value="image">图片</option>
        </select>
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="all">全部项目</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        {selectedFiles.length > 0 && (
          <button
            onClick={handleBatchDelete}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <Trash2 size={18} />
            删除选中 ({selectedFiles.length})
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-gray-500 mt-2">加载中...</p>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg">
          <Database className="mx-auto text-gray-300 mb-4" size={48} />
          <p className="text-gray-500">暂无文件</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                  <input
                    type="checkbox"
                    checked={selectedFiles.length === filteredFiles.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedFiles(filteredFiles.map((f) => f.id));
                      } else {
                        setSelectedFiles([]);
                      }
                    }}
                    className="w-4 h-4"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">文件名</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">类型</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">大小</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">上传时间</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredFiles.map((file) => (
                <tr key={file.id} className="border-t hover:bg-gray-50">
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
                  <td className="px-4 py-3 font-medium">{file.name}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1">
                      {getTypeIcon(file.type)}
                      {getTypeLabel(file.type)}
                    </span>
                  </td>
                  <td className="px-4 py-3">{formatFileSize(file.size)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(file.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(file.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
