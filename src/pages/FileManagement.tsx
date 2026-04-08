import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, FileText, Package, Trash2, Search, Copy, X, Download, FileCode, Table, Layout, Upload, CheckSquare, Square, FolderOpen, Move } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/Toast';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { calculateFileMD5Async, type MD5Progress } from '../utils/md5';
import { saveFileInChunks, getFileBlob, deleteFile } from '../services/database';
import { BatchOperationsBar } from '../components/BatchOperationsBar';
import { ConfirmModal } from '../pages/ProjectDetail/components/ConfirmModal';
import type { Document, Software, ProjectStage } from '../types';
import type { SaveFileProgress } from '../services/database';
import {
  generateAllDiagrams,
  type DiagramResult,
} from '../services/diagramService';

const stageOptions: ProjectStage[] = ['F阶段', 'C阶段', 'S阶段', 'D阶段', 'P阶段'];

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function FileManagement() {
  const { id } = useParams<{ id: string }>();
  const { getProject, updateProject, currentUser } = useApp();
  const { showToast } = useToast();
  const t = useThemeStyles();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const softwareInputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState<'documents' | 'software'>('documents');
  const [stageFilter, setStageFilter] = useState<ProjectStage | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState<'md5' | 'uploading' | 'complete'>('md5');
  const [currentUploadFile, setCurrentUploadFile] = useState<File | null>(null);
  const cancelRef = useRef(false);
  
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDiagramModal, setShowDiagramModal] = useState(false);
  const [diagramType, setDiagramType] = useState<'module' | 'component' | 'table'>('module');
  const [diagramResult, setDiagramResult] = useState<DiagramResult | null>(null);
  const [diagramText, setDiagramText] = useState('');
  
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState<{ name: string; type: string; stage: ProjectStage }[]>([]);
  const excelInputRef = useRef<HTMLInputElement>(null);
  
  const [uploadForm, setUploadForm] = useState({
    name: '',
    type: '',
    stage: 'F阶段' as ProjectStage,
  });

  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [selectedSoftware, setSelectedSoftware] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [targetStage, setTargetStage] = useState<ProjectStage>('F阶段');
  const [isBatchLoading, setIsBatchLoading] = useState(false);

  useEffect(() => {
    setSelectedDocuments(new Set());
    setSelectedSoftware(new Set());
    setLastSelectedIndex(null);
  }, [activeTab, stageFilter]);

  const project = getProject(id!);

  if (!project) {
    return <div className="text-center py-12 text-gray-500">项目不存在</div>;
  }

  const canEdit = currentUser?.role !== 'viewer';

  const handleGenerateDiagram = (type: 'module' | 'component' | 'table') => {
    const result = generateAllDiagrams(project);
    setDiagramResult(result);
    setDiagramType(type);
    
    switch (type) {
      case 'module':
        setDiagramText(result.moduleAssembly.text);
        break;
      case 'component':
        setDiagramText(result.componentAssembly.text);
        break;
      case 'table':
        setDiagramText(result.componentTable.text);
        break;
    }
    setShowDiagramModal(true);
  };

  const handleCopyDiagram = async () => {
    await navigator.clipboard.writeText(diagramText);
    showToast('已复制到剪贴板', 'success');
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const XLSX = await import('xlsx');
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const data = event.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json<{ 名称?: string; name?: string; 类型?: string; type?: string; 阶段?: string; stage?: string }>(sheet);

          const parsedData = jsonData
            .map((row) => ({
              name: row['名称'] || row['name'] || '',
              type: row['类型'] || row['type'] || '其他',
              stage: (row['阶段'] || row['stage'] || 'F阶段') as ProjectStage,
            }))
            .filter((row) => row.name.trim() !== '');

          if (parsedData.length === 0) {
            showToast('Excel中没有找到有效的文档数据', 'error');
            return;
          }

          setImportData(parsedData);
          setShowImportModal(true);
          showToast(`成功解析 ${parsedData.length} 条文档数据`, 'success');
        } catch (error) {
          showToast('解析Excel文件失败', 'error');
        }
      };

      reader.onerror = () => {
        showToast('读取文件失败', 'error');
      };

      reader.readAsBinaryString(file);
    } catch (error) {
      showToast('导入失败', 'error');
    }

    if (excelInputRef.current) {
      excelInputRef.current.value = '';
    }
  };

  const handleConfirmImport = () => {
    if (importData.length === 0) return;

    const newDocs: Document[] = importData.map((item) => ({
      id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      documentNumber: `DOC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: item.name,
      type: item.type,
      stage: item.stage,
      status: '未完成' as const,
      uploadDate: new Date().toISOString(),
    }));

    updateProject(project.id, {
      documents: [...project.documents, ...newDocs],
    });

    showToast(`成功导入 ${newDocs.length} 个文档`, 'success');
    setShowImportModal(false);
    setImportData([]);
  };

  const handleDownloadTemplate = () => {
    const template = [
      { '名称': '示例文档1', '类型': '设计文档', '阶段': 'F阶段' },
      { '名称': '示例文档2', '类型': '测试文档', '阶段': 'C阶段' },
    ];
    
    import('xlsx').then((XLSX) => {
      const worksheet = XLSX.utils.json_to_sheet(template);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, '文档导入模板');
      XLSX.writeFile(workbook, '文档导入模板.xlsx');
      showToast('模板已下载', 'success');
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadStage('md5');
    setCurrentUploadFile(file);
    cancelRef.current = false;

    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    showToast(`开始处理文件 ${file.name} (${fileSizeMB}MB)`, 'info');

    try {
      const fileId = `doc_${Date.now()}`;

      await calculateFileMD5Async(file, (progress: MD5Progress) => {
        if (cancelRef.current) return;
        setUploadProgress(progress.percent * 0.3);
      });

      if (cancelRef.current) {
        setUploading(false);
        setUploadProgress(0);
        setCurrentUploadFile(null);
        showToast('上传已取消', 'info');
        return;
      }

      setUploadStage('uploading');

      await saveFileInChunks(
        file,
        fileId,
        project.id,
        'document',
        (progress: SaveFileProgress) => {
          if (cancelRef.current) return;
          setUploadProgress(30 + progress.percent * 0.7);
        }
      );

      if (cancelRef.current) {
        await deleteFile(fileId);
        setUploading(false);
        setUploadProgress(0);
        setCurrentUploadFile(null);
        showToast('上传已取消', 'info');
        return;
      }

      setUploadStage('complete');
      setUploadProgress(100);

      const newDoc: Document = {
        id: fileId,
        documentNumber: `DOC-${Date.now()}`,
        name: file.name,
        type: uploadForm.type || '其他',
        stage: uploadForm.stage,
        status: '未完成',
        fileName: file.name,
        fileSize: file.size,
        uploadDate: new Date().toISOString(),
        dbId: fileId,
      };

      updateProject(project.id, {
        documents: [...project.documents, newDoc],
      });

      showToast('文档上传成功', 'success');
      setShowUploadModal(false);
      setUploadForm({ name: '', type: '', stage: 'F阶段' });
      setUploading(false);
      setUploadProgress(0);
      setUploadStage('md5');
      setCurrentUploadFile(null);
      cancelRef.current = false;
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      showToast('上传失败', 'error');
    }
  };

  const handleCancelUpload = () => {
    cancelRef.current = true;
  };

  const handleSoftwareUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadStage('md5');
    setCurrentUploadFile(file);
    cancelRef.current = false;

    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    showToast(`开始处理文件 ${file.name} (${fileSizeMB}MB)`, 'info');

    try {
      const fileId = `soft_${Date.now()}`;
      let md5 = '';

      md5 = await calculateFileMD5Async(file, (progress: MD5Progress) => {
        if (cancelRef.current) return;
        setUploadProgress(progress.percent * 0.3);
      });

      if (cancelRef.current) {
        setUploading(false);
        setUploadProgress(0);
        setCurrentUploadFile(null);
        showToast('上传已取消', 'info');
        return;
      }

      setUploadStage('uploading');

      await saveFileInChunks(
        file,
        fileId,
        project.id,
        'software',
        (progress: SaveFileProgress) => {
          if (cancelRef.current) return;
          setUploadProgress(30 + progress.percent * 0.7);
        }
      );

      if (cancelRef.current) {
        await deleteFile(fileId);
        setUploading(false);
        setUploadProgress(0);
        setCurrentUploadFile(null);
        showToast('上传已取消', 'info');
        return;
      }

      setUploadStage('complete');
      setUploadProgress(100);

      const newSoftware: Software = {
        id: fileId,
        name: file.name.replace(/\.[^/.]+$/, ''),
        version: 'v1.0',
        stage: uploadForm.stage,
        status: '未完成',
        fileName: file.name,
        fileSize: file.size,
        md5: md5,
        uploadDate: new Date().toISOString(),
        dbId: fileId,
      };

      updateProject(project.id, {
        software: [...project.software, newSoftware],
      });

      showToast('软件上传成功', 'success');
      setShowUploadModal(false);
      setUploadForm({ name: '', type: '', stage: 'F阶段' });
      setUploading(false);
      setUploadProgress(0);
      setCurrentUploadFile(null);
      cancelRef.current = false;
      if (softwareInputRef.current) {
        softwareInputRef.current.value = '';
      }
    } catch (error) {
      showToast('上传失败', 'error');
    }

    setUploading(false);
    setUploadProgress(0);
    setUploadStage('md5');
    setCurrentUploadFile(null);
    cancelRef.current = false;
    if (softwareInputRef.current) {
      softwareInputRef.current.value = '';
    }
  };

  const handleDownload = async (doc: Document) => {
    if (!doc.dbId) {
      showToast('文件未存储在数据库中', 'error');
      return;
    }

    try {
      const blob = await getFileBlob(doc.dbId);
      if (!blob) {
        showToast('文件不存在', 'error');
        return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName || doc.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('下载成功', 'success');
    } catch (error) {
      showToast('下载失败', 'error');
    }
  };

  const handleDownloadSoftware = async (soft: Software) => {
    if (!soft.dbId && !soft.fileUrl) {
      showToast('文件未存储在数据库中', 'error');
      return;
    }

    try {
      let blob: Blob | null = null;

      if (soft.dbId) {
        blob = await getFileBlob(soft.dbId);
      }

      if (!blob && soft.fileUrl) {
        const response = await fetch(soft.fileUrl);
        if (response.ok) {
          blob = await response.blob();
        }
      }

      if (!blob) {
        showToast('文件不存在', 'error');
        return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = soft.fileName || soft.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('下载成功', 'success');
    } catch (error) {
      showToast('下载失败', 'error');
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    const doc = project.documents.find((d) => d.id === docId);
    if (confirm('确定要删除这个文档吗？')) {
      if (doc?.dbId) {
        try {
          await deleteFile(doc.dbId);
        } catch (e) {
          console.error('Failed to delete file from DB:', e);
        }
      }
      updateProject(project.id, {
        documents: project.documents.filter((d) => d.id !== docId),
      });
      showToast('文档删除成功', 'success');
    }
  };

  const handleDeleteSoftware = async (softId: string) => {
    const soft = project.software.find((s) => s.id === softId);
    if (confirm('确定要删除这个软件吗？')) {
      if (soft?.dbId) {
        try {
          await deleteFile(soft.dbId);
        } catch (e) {
          console.error('Failed to delete file from DB:', e);
        }
      }
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

  const currentItems = activeTab === 'documents' ? filteredDocuments : filteredSoftware;
  const currentSelected = activeTab === 'documents' ? selectedDocuments : selectedSoftware;
  const setCurrentSelected = activeTab === 'documents' ? setSelectedDocuments : setSelectedSoftware;

  const selectedCount = currentSelected.size;
  const isAllSelected = selectedCount === currentItems.length && currentItems.length > 0;
  const isIndeterminate = selectedCount > 0 && selectedCount < currentItems.length;

  const handleToggleAll = useCallback(() => {
    if (isAllSelected) {
      setCurrentSelected(new Set());
    } else {
      setCurrentSelected(new Set(currentItems.map(item => item.id)));
    }
    setLastSelectedIndex(null);
  }, [isAllSelected, currentItems, setCurrentSelected]);

  const handleSelectItem = useCallback((itemId: string, index: number, event: React.MouseEvent | React.KeyboardEvent) => {
    const isCtrlPressed = event.ctrlKey || event.metaKey;
    const isShiftPressed = event.shiftKey;

    setCurrentSelected(prev => {
      const newSelected = new Set(prev);

      if (isShiftPressed && lastSelectedIndex !== null) {
        const startIndex = Math.min(lastSelectedIndex, index);
        const endIndex = Math.max(lastSelectedIndex, index);
        
        if (!isCtrlPressed) {
          newSelected.clear();
        }
        
        for (let i = startIndex; i <= endIndex; i++) {
          newSelected.add(currentItems[i].id);
        }
      } else if (isCtrlPressed) {
        if (newSelected.has(itemId)) {
          newSelected.delete(itemId);
        } else {
          newSelected.add(itemId);
        }
      } else {
        newSelected.clear();
        newSelected.add(itemId);
      }

      return newSelected;
    });

    setLastSelectedIndex(index);
  }, [lastSelectedIndex, currentItems, setCurrentSelected]);

  const handleBatchDelete = async () => {
    if (!canEdit || selectedCount === 0) return;
    
    setIsBatchLoading(true);
    try {
      if (activeTab === 'documents') {
        for (const docId of Array.from(selectedDocuments)) {
          const doc = project.documents.find(d => d.id === docId);
          if (doc?.dbId) {
            try { await deleteFile(doc.dbId); } catch (e) { console.error('Failed to delete file:', e); }
          }
        }
        updateProject(project.id, {
          documents: project.documents.filter(d => !selectedDocuments.has(d.id))
        });
        showToast(`成功删除 ${selectedCount} 个文档`, 'success');
        setSelectedDocuments(new Set());
      } else {
        for (const softId of Array.from(selectedSoftware)) {
          const soft = project.software.find(s => s.id === softId);
          if (soft?.dbId) {
            try { await deleteFile(soft.dbId); } catch (e) { console.error('Failed to delete file:', e); }
          }
        }
        updateProject(project.id, {
          software: project.software.filter(s => !selectedSoftware.has(s.id))
        });
        showToast(`成功删除 ${selectedCount} 个软件`, 'success');
        setSelectedSoftware(new Set());
      }
      setShowBatchDeleteConfirm(false);
    } catch (error) {
      showToast('批量删除失败，请重试', 'error');
    } finally {
      setIsBatchLoading(false);
    }
  };

  const handleBatchMove = async () => {
    if (!canEdit || selectedCount === 0) return;
    
    setIsBatchLoading(true);
    try {
      if (activeTab === 'documents') {
        const updatedDocs = project.documents.map(doc =>
          selectedDocuments.has(doc.id) ? { ...doc, stage: targetStage } : doc
        );
        updateProject(project.id, { documents: updatedDocs });
        showToast(`成功移动 ${selectedCount} 个文档到 ${targetStage}`, 'success');
        setSelectedDocuments(new Set());
      } else {
        const updatedSoft = project.software.map(soft =>
          selectedSoftware.has(soft.id) ? { ...soft, stage: targetStage } : soft
        );
        updateProject(project.id, { software: updatedSoft });
        showToast(`成功移动 ${selectedCount} 个软件到 ${targetStage}`, 'success');
        setSelectedSoftware(new Set());
      }
      setShowMoveModal(false);
    } catch (error) {
      showToast('批量移动失败，请重试', 'error');
    } finally {
      setIsBatchLoading(false);
    }
  };

  const handleBatchDownload = async () => {
    if (selectedCount === 0) return;

    let successCount = 0;
    let failCount = 0;

    if (activeTab === 'documents') {
      for (const docId of Array.from(selectedDocuments)) {
        const doc = project.documents.find(d => d.id === docId);
        if (doc?.dbId) {
          try {
            const blob = await getFileBlob(doc.dbId);
            if (blob) {
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = doc.fileName || doc.name;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              successCount++;
            } else {
              failCount++;
            }
          } catch (e) {
            failCount++;
          }
        }
      }
    } else {
      for (const softId of Array.from(selectedSoftware)) {
        const soft = project.software.find(s => s.id === softId);
        if (soft?.dbId) {
          try {
            const blob = await getFileBlob(soft.dbId);
            if (blob) {
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = soft.fileName || soft.name;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              successCount++;
            } else {
              failCount++;
            }
          } catch (e) {
            failCount++;
          }
        }
      }
    }

    if (failCount === 0) {
      showToast(`成功下载 ${successCount} 个文件`, 'success');
    } else {
      showToast(`下载完成：成功 ${successCount} 个，失败 ${failCount} 个`, 'warning');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${t.text}`}>文件管理</h1>
          <p className={t.textMuted}>{project.name}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleGenerateDiagram('module')}
            className={`flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm`}
            title="模块装配图"
          >
            <Layout size={16} />
            模块装配图
          </button>
          <button
            onClick={() => handleGenerateDiagram('component')}
            className={`flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm`}
            title="组件装配图"
          >
            <FileCode size={16} />
            组件装配图
          </button>
          <button
            onClick={() => handleGenerateDiagram('table')}
            className={`flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm`}
            title="组件配套表"
          >
            <Table size={16} />
            组件配套表
          </button>
        </div>
      </div>

      <div className={`flex gap-2 mb-6 border-b ${t.border}`}>
        <button
          onClick={() => setActiveTab('documents')}
          className={`px-4 py-2 -mb-px border-b-2 transition flex items-center gap-2 ${
            activeTab === 'documents'
              ? `border-cyan-500 ${t.text}`
              : `border-transparent ${t.textSecondary} hover:${t.text}`
          }`}
        >
          <FileText size={18} />
          文档 ({project.documents.length})
        </button>
        <button
          onClick={() => setActiveTab('software')}
          className={`px-4 py-2 -mb-px border-b-2 transition flex items-center gap-2 ${
            activeTab === 'software'
              ? `border-cyan-500 ${t.text}`
              : `border-transparent ${t.textSecondary} hover:${t.text}`
          }`}
        >
          <Package size={18} />
          软件 ({project.software.length})
        </button>
      </div>

      <div className={`${t.card} rounded-lg shadow-sm border ${t.border} p-4`}>
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${t.textMuted}`} size={18} />
            <input
              type="text"
              placeholder="搜索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 border rounded-lg ${t.input}`}
            />
          </div>
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value as ProjectStage | 'all')}
            className={`px-3 py-2 border rounded-lg ${t.input}`}
          >
            <option value="all">全部阶段</option>
            {stageOptions.map((stage) => (
              <option key={stage} value={stage}>{stage}</option>
            ))}
          </select>
          {canEdit && (
            <>
              {activeTab === 'documents' && (
                <>
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Upload size={18} />
                    Excel导入
                  </button>
                  <input
                    type="file"
                    ref={excelInputRef}
                    accept=".xlsx,.xls"
                    onChange={handleExcelImport}
                    className="hidden"
                  />
                </>
              )}
              <button
                onClick={() => setShowUploadModal(true)}
                className={`flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700`}
              >
                <Plus size={18} />
                上传{activeTab === 'documents' ? '文档' : '软件'}
              </button>
            </>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-6">
              {stageOptions.map((stage) => {
                const stageDocs = filteredDocuments.filter((d) => d.stage === stage);
                if (stageFilter !== 'all' && stage !== stageFilter) return null;

                return (
                  <div key={stage} className={`${t.card} rounded-lg shadow-sm overflow-hidden border ${t.border}`}>
                <div className={`px-4 py-3 ${t.emptyBg} border-b ${t.border} flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${t.text}`}>{stage}</span>
                    <span className={`text-sm ${t.textMuted}`}>
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
                    <thead className={`${t.tableHeader}`}>
                      <tr>
                        <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary} w-10`}>
                          <button
                            onClick={handleToggleAll}
                            className={`p-1 rounded transition-colors ${
                              isAllSelected || isIndeterminate
                                ? 'text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900'
                                : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                            aria-label={isAllSelected ? '取消全选' : '全选'}
                          >
                            {isAllSelected || isIndeterminate ? (
                              <CheckSquare size={18} className={isIndeterminate ? 'opacity-50' : ''} />
                            ) : (
                              <Square size={18} className="opacity-50" />
                            )}
                          </button>
                        </th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">名称</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">类型</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">状态</th>
                        {canEdit && <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">操作</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {stageDocs.map((doc, index) => {
                        const isSelected = selectedDocuments.has(doc.id);
                        const globalIndex = filteredDocuments.findIndex(d => d.id === doc.id);
                        return (
                          <tr
                            key={doc.id}
                            className={`border-t ${t.border} ${isSelected ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''} ${t.hoverBg}`}
                          >
                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={(e) => handleSelectItem(doc.id, globalIndex, e)}
                                className={`p-1 rounded transition-colors ${
                                  isSelected
                                    ? 'text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900'
                                    : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                                aria-label={isSelected ? '取消选择' : '选择'}
                              >
                                {isSelected ? (
                                  <CheckSquare size={18} />
                                ) : (
                                  <Square size={18} className="opacity-50" />
                                )}
                              </button>
                            </td>
                            <td
                              onClick={(e) => handleSelectItem(doc.id, globalIndex, e)}
                              className="px-4 py-3 cursor-pointer"
                            >
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
                                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                  {doc.dbId && (
                                    <button
                                      onClick={() => handleDownload(doc)}
                                      className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${t.textMuted}`}
                                      title="下载"
                                    >
                                      <Download size={16} />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDeleteDocument(doc.id)}
                                    className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${t.textMuted}`}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className={`p-8 text-center ${t.textMuted}`}>暂无文档</div>
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
              <div key={stage} className={`${t.card} rounded-lg shadow-sm overflow-hidden border ${t.border}`}>
                <div className={`px-4 py-3 ${t.emptyBg} border-b ${t.border} flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${t.text}`}>{stage}</span>
                    <span className={`text-sm ${t.textMuted}`}>
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
                    <thead className={`${t.tableHeader}`}>
                      <tr>
                        <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary} w-10`}>
                          <button
                            onClick={handleToggleAll}
                            className={`p-1 rounded transition-colors ${
                              isAllSelected || isIndeterminate
                                ? 'text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900'
                                : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                            aria-label={isAllSelected ? '取消全选' : '全选'}
                          >
                            {isAllSelected || isIndeterminate ? (
                              <CheckSquare size={18} className={isIndeterminate ? 'opacity-50' : ''} />
                            ) : (
                              <Square size={18} className="opacity-50" />
                            )}
                          </button>
                        </th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">名称</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">版本</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">大小</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">MD5</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">状态</th>
                        {canEdit && <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">操作</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {stageSoft.map((soft, index) => {
                        const isSelected = selectedSoftware.has(soft.id);
                        const globalIndex = filteredSoftware.findIndex(s => s.id === soft.id);
                        return (
                          <tr
                            key={soft.id}
                            className={`border-t ${t.border} ${isSelected ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''} ${t.hoverBg}`}
                          >
                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={(e) => handleSelectItem(soft.id, globalIndex, e)}
                                className={`p-1 rounded transition-colors ${
                                  isSelected
                                    ? 'text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900'
                                    : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                                aria-label={isSelected ? '取消选择' : '选择'}
                              >
                                {isSelected ? (
                                  <CheckSquare size={18} />
                                ) : (
                                  <Square size={18} className="opacity-50" />
                                )}
                              </button>
                            </td>
                            <td
                              onClick={(e) => handleSelectItem(soft.id, globalIndex, e)}
                              className="px-4 py-3 cursor-pointer"
                            >
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
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {soft.fileSize ? formatFileSize(soft.fileSize) : '-'}
                          </td>
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
                              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                {soft.dbId && (
                                  <button
                                    onClick={() => handleDownloadSoftware(soft)}
                                    className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${t.textMuted}`}
                                    title="下载"
                                  >
                                    <Download size={16} />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteSoftware(soft.id)}
                                  className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${t.textMuted}`}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className={`p-8 text-center ${t.textMuted}`}>暂无软件</div>
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
                <div className="mb-4 text-center">
                  <p className="font-medium">{currentUploadFile?.name}</p>
                  <p className="text-sm text-gray-500">
                    {currentUploadFile ? (currentUploadFile.size / (1024 * 1024)).toFixed(2) : 0} MB
                  </p>
                </div>
                <div className="mb-2 text-center text-sm">
                  {uploadStage === 'md5' ? '正在计算文件校验值...' : '正在上传...'}
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-primary-600 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <div className="text-center text-sm text-gray-500 mb-4">
                  {uploadProgress}%
                </div>
                <button
                  onClick={handleCancelUpload}
                  className="w-full flex items-center justify-center gap-2 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                >
                  <X size={16} />
                  取消上传
                </button>
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

      {showImportModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowImportModal(false)}
        >
          <div
            className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Excel导入文档预览</h2>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                共解析到 <span className="font-bold text-blue-600">{importData.length}</span> 条文档数据
              </p>
              <button
                onClick={handleDownloadTemplate}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
              >
                <Download size={14} />
                下载模板
              </button>
            </div>

            <div className="flex-1 overflow-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">序号</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">文档名称</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">类型</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">阶段</th>
                  </tr>
                </thead>
                <tbody>
                  {importData.map((item, index) => (
                    <tr key={index} className="border-t">
                      <td className="px-4 py-2 text-gray-500">{index + 1}</td>
                      <td className="px-4 py-2">{item.name}</td>
                      <td className="px-4 py-2 text-gray-500">{item.type}</td>
                      <td className="px-4 py-2">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                          {item.stage}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex gap-3 justify-end">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleConfirmImport}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                确认导入 ({importData.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {canEdit && selectedCount > 0 && (
        <BatchOperationsBar
          selectedCount={selectedCount}
          totalCount={currentItems.length}
          isAllSelected={isAllSelected}
          isIndeterminate={isIndeterminate}
          onToggleAll={handleToggleAll}
          onDeselectAll={() => {
            setCurrentSelected(new Set());
            setLastSelectedIndex(null);
          }}
          onBatchDelete={() => setShowBatchDeleteConfirm(true)}
          onBatchExport={handleBatchDownload}
          onBatchUpdateStage={canEdit ? () => setShowMoveModal(true) : undefined}
          itemType={activeTab === 'documents' ? '文档' : '软件'}
          deleteLabel="删除"
          exportLabel="下载"
          updateStageLabel="移动阶段"
          isDeleting={isBatchLoading}
          isExporting={false}
          isUpdatingStage={isBatchLoading}
        />
      )}

      <ConfirmModal
        show={showBatchDeleteConfirm}
        title="确认批量删除"
        message={`确定要删除选中的 ${selectedCount} 个${activeTab === 'documents' ? '文档' : '软件'}吗？此操作不可恢复！`}
        onConfirm={handleBatchDelete}
        onCancel={() => setShowBatchDeleteConfirm(false)}
        type="danger"
        confirmText="删除"
        cancelText="取消"
      />

      {showMoveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowMoveModal(false)}>
          <div className={`${t.modalBg} rounded-lg p-6 w-full max-w-md border ${t.modalBorder}`} onClick={(e) => e.stopPropagation()}>
            <h2 className={`text-xl font-semibold mb-4 ${t.text}`}>批量移动阶段</h2>
            <div className="space-y-4">
              <p className={`text-sm ${t.textMuted}`}>
                将选中的 {selectedCount} 个{activeTab === 'documents' ? '文档' : '软件'}移动到新阶段
              </p>
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${t.textSecondary}`}>目标阶段</label>
                <select
                  value={targetStage}
                  onChange={(e) => setTargetStage(e.target.value as ProjectStage)}
                  className={`w-full px-3 py-2.5 border rounded-lg ${t.input}`}
                >
                  {stageOptions.map((stage) => (
                    <option key={stage} value={stage}>{stage}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowMoveModal(false)}
                  className={`flex-1 py-2.5 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}
                >
                  取消
                </button>
                <button
                  onClick={handleBatchMove}
                  disabled={isBatchLoading}
                  className={`flex-1 py-2.5 rounded-lg font-medium transition-all ${
                    isBatchLoading
                      ? `${t.button} opacity-50 cursor-not-allowed`
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {isBatchLoading ? '移动中...' : '确认移动'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDiagramModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowDiagramModal(false)}
        >
          <div
            className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                {diagramType === 'module' && '模块装配图'}
                {diagramType === 'component' && '组件装配图'}
                {diagramType === 'table' && '组件配套表'}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={handleCopyDiagram}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                >
                  <Copy size={14} />
                  复制
                </button>
                <button
                  onClick={() => setShowDiagramModal(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => {
                  if (diagramResult) {
                    setDiagramType('module');
                    setDiagramText(diagramResult.moduleAssembly.text);
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-sm ${
                  diagramType === 'module' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                模块装配图
              </button>
              <button
                onClick={() => {
                  if (diagramResult) {
                    setDiagramType('component');
                    setDiagramText(diagramResult.componentAssembly.text);
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-sm ${
                  diagramType === 'component' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                组件装配图
              </button>
              <button
                onClick={() => {
                  if (diagramResult) {
                    setDiagramType('table');
                    setDiagramText(diagramResult.componentTable.text);
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-sm ${
                  diagramType === 'table' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                组件配套表
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-gray-900 rounded-lg p-4">
              <pre className="text-green-400 text-xs font-mono whitespace-pre overflow-x-auto">
                {diagramText}
              </pre>
            </div>

            <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
              <span>
                {diagramResult && diagramType === 'module' && (
                  <>项目: {diagramResult.moduleAssembly.data.projectName} | 模块: {diagramResult.moduleAssembly.data.totalModules} | 组件: {diagramResult.moduleAssembly.data.totalComponents}</>
                )}
                {diagramResult && diagramType === 'component' && (
                  <>共 {diagramResult.componentAssembly.data.length} 个组件</>
                )}
                {diagramResult && diagramType === 'table' && (
                  <>共 {diagramResult.componentTable.data.length} 条配套记录</>
                )}
              </span>
              <span>生成时间: {new Date().toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
