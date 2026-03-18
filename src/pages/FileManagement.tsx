import React, { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, FileText, Package, Trash2, Search, Copy } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/Toast';
import { calculateFileMD5 } from '../utils/md5';
import type { Document, Software, ProjectStage } from '../types';

const stageOptions: ProjectStage[] = ['C阶段', 'S阶段', 'D阶段', 'P阶段'];

export default function FileManagement() {
  const { id } = useParams<{ id: string }>();
  const { getProject, updateProject, currentUser } = useApp();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const softwareInputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState<'documents' | 'software'>('documents');
  const [stageFilter, setStageFilter] = useState<ProjectStage | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    name: '',
    type: '',
    stage: 'C阶段' as ProjectStage,
  });

  const project = getProject(id!);

  if (!project) {
    return <div className="text-center py-12 text-gray-500">项目不存在</div>;
  }

  const canEdit = currentUser?.role !== 'viewer';

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 100);

      await calculateFileMD5(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      const newDoc: Document = {
        id: Date.now().toString(),
        name: file.name,
        type: uploadForm.type || '其他',
        stage: uploadForm.stage,
        status: '未完成',
        fileName: file.name,
        fileSize: file.size,
        uploadDate: new Date().toISOString(),
      };

      updateProject(project.id, {
        documents: [...project.documents, newDoc],
      });

      showToast('文档上传成功', 'success');
      setShowUploadModal(false);
      setUploadForm({ name: '', type: '', stage: 'C阶段' });
    } catch (error) {
      showToast('上传失败', 'error');
    }

    setUploading(false);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSoftwareUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 100);

      const md5 = await calculateFileMD5(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      const newSoftware: Software = {
        id: Date.now().toString(),
        name: file.name.replace(/\.[^/.]+$/, ''),
        version: 'v1.0',
        stage: uploadForm.stage,
        status: '未完成',
        fileName: file.name,
        fileSize: file.size,
        md5: md5,
        uploadDate: new Date().toISOString(),
      };

      updateProject(project.id, {
        software: [...project.software, newSoftware],
      });

      showToast('软件上传成功', 'success');
      setShowUploadModal(false);
      setUploadForm({ name: '', type: '', stage: 'C阶段' });
    } catch (error) {
      showToast('上传失败', 'error');
    }

    setUploading(false);
    setUploadProgress(0);
    if (softwareInputRef.current) {
      softwareInputRef.current.value = '';
    }
  };

  const handleDeleteDocument = (docId: string) => {
    if (confirm('确定要删除这个文档吗？')) {
      updateProject(project.id, {
        documents: project.documents.filter((d) => d.id !== docId),
      });
      showToast('文档删除成功', 'success');
    }
  };

  const handleDeleteSoftware = (softId: string) => {
    if (confirm('确定要删除这个软件吗？')) {
      updateProject(project.id, {
        software: project.software.filter((s) => s.id !== softId),
      });
      showToast('软件删除成功', 'success');
    }
  };

  const handleCopyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    showToast('已复制到剪贴板', 'success');
  };

  const filteredDocuments = project.documents.filter((doc) => {
    if (stageFilter !== 'all' && doc.stage !== stageFilter) return false;
    if (searchTerm && !doc.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const filteredSoftware = project.software.filter((soft) => {
    if (stageFilter !== 'all' && soft.stage !== stageFilter) return false;
    if (searchTerm && !soft.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">文件管理</h1>
          <p className="text-gray-500">{project.name}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('documents')}
          className={`px-4 py-2 rounded-lg ${
            activeTab === 'documents' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          <FileText size={18} className="inline mr-2" />
          文档 ({project.documents.length})
        </button>
        <button
          onClick={() => setActiveTab('software')}
          className={`px-4 py-2 rounded-lg ${
            activeTab === 'software' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          <Package size={18} className="inline mr-2" />
          软件 ({project.software.length})
        </button>
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="搜索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
          />
        </div>
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value as ProjectStage | 'all')}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="all">全部阶段</option>
          {stageOptions.map((stage) => (
            <option key={stage} value={stage}>{stage}</option>
          ))}
        </select>
        {canEdit && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus size={18} />
            上传{activeTab === 'documents' ? '文档' : '软件'}
          </button>
        )}
      </div>

      {activeTab === 'documents' && (
        <div className="space-y-6">
          {stageOptions.map((stage) => {
            const stageDocs = filteredDocuments.filter((d) => d.stage === stage);
            if (stageFilter !== 'all' && stage !== stageFilter) return null;
            
            return (
              <div key={stage} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{stage}</span>
                    <span className="text-sm text-gray-500">
                      ({stageDocs.filter((d) => d.status === '已完成').length}/{stageDocs.length})
                    </span>
                  </div>
                  <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all"
                      style={{
                        width: stageDocs.length > 0 
                          ? `${(stageDocs.filter((d) => d.status === '已完成').length / stageDocs.length) * 100}%`
                          : '0%'
                      }}
                    />
                  </div>
                </div>
                {stageDocs.length > 0 ? (
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">名称</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">类型</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">状态</th>
                        {canEdit && <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">操作</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {stageDocs.map((doc) => (
                        <tr key={doc.id} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <FileText size={16} className="text-blue-500" />
                              <span>{doc.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">{doc.type}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs ${
                              doc.status === '已完成' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {doc.status}
                            </span>
                          </td>
                          {canEdit && (
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleDeleteDocument(doc.id)}
                                  className="p-1 text-gray-400 hover:text-red-600"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-8 text-center text-gray-400">暂无文档</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'software' && (
        <div className="space-y-6">
          {stageOptions.map((stage) => {
            const stageSoft = filteredSoftware.filter((s) => s.stage === stage);
            if (stageFilter !== 'all' && stage !== stageFilter) return null;
            
            return (
              <div key={stage} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{stage}</span>
                    <span className="text-sm text-gray-500">
                      ({stageSoft.filter((s) => s.status === '已完成').length}/{stageSoft.length})
                    </span>
                  </div>
                  <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all"
                      style={{
                        width: stageSoft.length > 0 
                          ? `${(stageSoft.filter((s) => s.status === '已完成').length / stageSoft.length) * 100}%`
                          : '0%'
                      }}
                    />
                  </div>
                </div>
                {stageSoft.length > 0 ? (
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">名称</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">版本</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">MD5</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">状态</th>
                        {canEdit && <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">操作</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {stageSoft.map((soft) => (
                        <tr key={soft.id} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Package size={16} className="text-green-500" />
                              <span>{soft.name}</span>
                              {soft.version && (
                                <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                                  {soft.version}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">{soft.version || '-'}</td>
                          <td className="px-4 py-3">
                            {soft.md5 ? (
                              <button
                                onClick={() => handleCopyToClipboard(soft.md5 || '')}
                                className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary-600"
                              >
                                <Copy size={12} />
                                {soft.md5.substring(0, 8)}...
                              </button>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs ${
                              soft.status === '已完成' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {soft.status}
                            </span>
                          </td>
                          {canEdit && (
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleDeleteSoftware(soft.id)}
                                  className="p-1 text-gray-400 hover:text-red-600"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-8 text-center text-gray-400">暂无软件</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowUploadModal(false)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">
              上传{activeTab === 'documents' ? '文档' : '软件'}
            </h2>
            
            {uploading ? (
              <div className="py-8">
                <div className="mb-2 text-center">上传中...</div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-600 transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">选择阶段</label>
                  <select
                    value={uploadForm.stage}
                    onChange={(e) => setUploadForm({ ...uploadForm, stage: e.target.value as ProjectStage })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    {stageOptions.map((stage) => (
                      <option key={stage} value={stage}>{stage}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    选择{activeTab === 'documents' ? '文档' : '软件'}文件
                  </label>
                  <input
                    type="file"
                    ref={activeTab === 'documents' ? fileInputRef : softwareInputRef}
                    onChange={activeTab === 'documents' ? handleFileUpload : handleSoftwareUpload}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowUploadModal(false)}
                    className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    取消
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
