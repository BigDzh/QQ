import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, FileText, Package, ChevronRight, Monitor, Copy, Trash2, Upload, Download, Edit2, Search, RefreshCw, FileCode, Table, Layout, Loader2, FileUp, Zap, CheckCircle, Clock, RotateCcw, ClipboardCheck, Folder, FolderOpen, File } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { generateId } from '../utils/auth';
import { useToast } from '../components/Toast';
import { useThemeStyles } from '../hooks/useThemeStyles';
import type { ProjectStage, ProjectVersion, Document as DocType, ModuleStatus } from '../types';
import { calculateFileMD5Async } from '../utils/md5';
import {
  generateDesignDiagrams,
  type DiagramCard,
} from '../services/designDiagramService';
import {
  createPreUpdateSnapshot,
  rollbackData,
  getRollbackSnapshot,
  type DataSnapshot,
} from '../services/dataMigration';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { getProject, addModule, addComponent, deleteModule, deleteComponent, addSystem, updateSystem, deleteSystem, updateProject, updateComponent, deleteDocument, addDesignFile, deleteDesignFile, updateDesignFile, addTask, updateTask, deleteTask, currentUser } = useApp();
  const { showToast } = useToast();
  const t = useThemeStyles();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'systems' | 'modules' | 'components' | 'design' | 'reviews' | 'logs' | 'documents' | 'software'>('overview');
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [groupByCategory, setGroupByCategory] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [componentSearchTerm, setComponentSearchTerm] = useState('');
  const [groupByComponentName, setGroupByComponentName] = useState(true);
  const [selectedComponentName, setSelectedComponentName] = useState<string | null>(null);
  const [systemSearchTerm, setSystemSearchTerm] = useState('');
  const [systemSearchHistory, setSystemSearchHistory] = useState<string[]>([]);
  const [showSystemSearchDropdown, setShowSystemSearchDropdown] = useState(false);
  const [showSystemModal, setShowSystemModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    title: '',
    content: '',
  });
  const [expandedReviews, setExpandedReviews] = useState<string[]>([]);
  const [expandedReviewCategories, setExpandedReviewCategories] = useState<string[]>([]);
  const [selectedCategoryForUpload, setSelectedCategoryForUpload] = useState<string>('');
  const [isDraggingReview, setIsDraggingReview] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ show: boolean; title: string; message: string; onConfirm: () => void }>({ show: false, title: '', message: '', onConfirm: () => {} });
  const [navigatingReviewCategory, setNavigatingReviewCategory] = useState<{ reviewId: string; category: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [systemForm, setSystemForm] = useState<{
    systemNumber: string;
    systemName: string;
    instructionNumber: string;
    holder: string;
    status: '未投产' | '投产中' | '正常' | '维修中' | '三防中' | '测试中' | '仿真中' | '借用中' | '故障';
    stage: ProjectStage;
    version: string;
  }>({
    systemNumber: '',
    systemName: '',
    instructionNumber: '',
    holder: '',
    status: '未投产',
    stage: 'C阶段',
    version: 'v1.0',
  });
  const [editingSystem, setEditingSystem] = useState<any>(null);
  const [systemTemplate, setSystemTemplate] = useState<any>(null);
  const [isCopyingSystem, setIsCopyingSystem] = useState(false);

  const [showSoftwareModal, setShowSoftwareModal] = useState(false);
  const [editingSoftware, setEditingSoftware] = useState<any>(null);
  const [softwareForm, setSoftwareForm] = useState({
    name: '',
    version: '',
    adaptedComponentIds: [] as string[],
  });
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planForm, setPlanForm] = useState({
    title: '',
    description: '',
    riskItem: '',
    dueDate: '',
    priority: '中' as '低' | '中' | '高' | '紧急',
  });
  const [showComponentEditModal, setShowComponentEditModal] = useState(false);
  const [editingComponent, setEditingComponent] = useState<any>(null);
  const [componentEditForm, setComponentEditForm] = useState({
    componentName: '',
    componentNumber: '',
    productionOrderNumber: '',
    stage: '',
    version: '',
    moduleId: '',
  });
  const [showComponentStatusModal, setShowComponentStatusModal] = useState(false);
  const [componentStatusForm, setComponentStatusForm] = useState({
    status: '',
    reason: '',
  });
  const [showComponentCopyModal, setShowComponentCopyModal] = useState(false);
  const [copyingComponent, setCopyingComponent] = useState<any>(null);
  const [componentCopyForm, setComponentCopyForm] = useState({
    moduleId: '',
    componentNumber: '',
  });
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncTargetSoftware, setSyncTargetSoftware] = useState<any>(null);
  const [syncComponentIds, setSyncComponentIds] = useState<string[]>([]);
  const [selectedDocStage, setSelectedDocStage] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'module' | 'component' | 'table'>('all');
  const [filterType, setFilterType] = useState<'all' | 'assembly' | 'table'>('all');
  const [filterStage, setFilterStage] = useState<string>('');
  const [filterVersion, setFilterVersion] = useState<string>('');
  const [uploadingDesignFile, setUploadingDesignFile] = useState<string | null>(null);
  
  const [showDesignSyncModal, setShowDesignSyncModal] = useState(false);
  const [syncTargetDesignFile, setSyncTargetDesignFile] = useState<any>(null);
  const [syncDesignModuleIds, setSyncDesignModuleIds] = useState<string[]>([]);
  
  const [showDocModal, setShowDocModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<any>(null);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [editingVersionSoftware, setEditingVersionSoftware] = useState<any>(null);
  const [versionInput, setVersionInput] = useState('');
  const [showRollbackModal, setShowRollbackModal] = useState(false);
  const [rollbackSnapshot, setRollbackSnapshot] = useState<DataSnapshot | null>(null);
  const [rollbackConfirmText, setRollbackConfirmText] = useState('');
  const [docForm, setDocForm] = useState({
    documentNumber: '',
    name: '',
    type: '',
    stage: 'F阶段' as ProjectStage,
    version: 'A',
  });
  const [docPage, setDocPage] = useState(1);
  const DOC_PAGE_SIZE = 20;

  const [showDesignModal, setShowDesignModal] = useState(false);
  const [editingDesignFile, setEditingDesignFile] = useState<any>(null);
  const [designForm, setDesignForm] = useState({
    name: '',
    type: '装配图' as '装配图' | '配套表',
    format: 'AutoCAD' as 'AutoCAD' | 'Excel' | 'PDF',
    stage: 'F阶段' as ProjectStage,
    version: 'A版' as ProjectVersion,
    adaptedModuleIds: [] as string[],
    adaptedComponentIds: [] as string[],
  });

  const [showDiagramModal, setShowDiagramModal] = useState(false);
  const [diagramType, setDiagramType] = useState<'module' | 'component' | 'table'>('module');
  const [diagramResult, setDiagramResult] = useState<DiagramCard[]>([]);
  const [diagramText, setDiagramText] = useState('');

  const [moduleForm, setModuleForm] = useState({
    moduleNumber: '',
    moduleName: '',
    category: '',
    productionOrderNumber: '',
    holder: '',
    status: '未投产' as const,
    stage: 'C阶段',
    version: 'v1.0',
  });
  const [editingModule, setEditingModule] = useState<any>(null);
  const [showModuleEditModal, setShowModuleEditModal] = useState(false);
  const [moduleEditForm, setModuleEditForm] = useState({
    moduleNumber: '',
    moduleName: '',
    instructionNumber: '',
    systemId: '',
    systemNumber: '',
    systemName: '',
    productionOrderNumber: '',
    holder: '',
    status: '未投产' as ModuleStatus,
    stage: 'C阶段' as ProjectStage,
    version: 'v1.0',
  });

  const incrementVersion = (version: string): string => {
    const parts = version.split('.');
    if (parts.length >= 3) {
      const patch = parseInt(parts[2]) || 0;
      parts[2] = (patch + 1).toString();
      return parts.join('.');
    }
    return version + '.1';
  };

  const project = getProject(id!);

  if (!project) {
    return (
      <div className={`text-center py-12 ${t.textMuted}`}>
        <p>项目不存在</p>
        <Link to="/projects" className={`${t.textSecondary} hover:underline mt-2 inline-block`}>
          返回项目列表
        </Link>
      </div>
    );
  }

  const handleOpenSystemModal = () => {
    if (project.systems && project.systems.length > 0) {
      const sortedSystems = [...project.systems].sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });
      const template = sortedSystems[0];
      setSystemForm({
        systemNumber: '',
        systemName: project.name,
        instructionNumber: template.instructionNumber,
        holder: template.holder || '',
        status: '未投产',
        stage: template.stage,
        version: template.version || 'v1.0',
      });
      setSystemTemplate(template);
      setEditingSystem(null);
      setShowSystemModal(true);
    } else {
      setSystemForm({
        systemNumber: '',
        systemName: project.name,
        instructionNumber: '',
        holder: '',
        status: '未投产',
        stage: project.stage,
        version: 'v1.0',
      });
      setSystemTemplate(null);
      setEditingSystem(null);
      setShowSystemModal(true);
    }
  };

  const handleGenerateDiagram = (type: 'module' | 'component' | 'table') => {
    const cards = generateDesignDiagrams(project);
    const typeMap: Record<typeof type, string> = {
      'module': 'module-assembly',
      'component': 'component-assembly',
      'table': 'component-table',
    };
    const targetCard = cards.find(c => c.type === typeMap[type]);
    if (targetCard) {
      setDiagramResult([targetCard]);
      setDiagramText(targetCard.content);
      setDiagramType(type);
      setShowDiagramModal(true);
    }
  };

  const handleAutoGenerateDesignDiagrams = () => {
    const cards = generateDesignDiagrams(project);
    
    cards.forEach((card) => {
      const cardModuleId = card.id.includes('-module-assembly-') 
        ? card.id.split('-module-assembly-')[1]?.split('-')[0]
        : card.id.includes('-component-assembly-')
          ? card.id.split('-component-assembly-')[1]?.split('-')[0]
          : card.id.includes('-component-table-')
            ? card.id.split('-component-table-')[1]?.split('-')[0]
            : null;
      
      const existingFile = project.designFiles.find(
        df => df.name === card.title && df.isAutoGenerated && df.format === card.format
      );
      
      if (!existingFile) {
        const newDesignFile: any = {
          name: card.title,
          type: card.type === 'module-assembly' || card.type === 'component-assembly' ? '装配图' : '配套表',
          format: card.format === 'AutoCAD' ? 'AutoCAD' : 'Excel',
          category: card.type === 'module-assembly' ? 'module' : card.type === 'component-assembly' ? 'component' : 'table',
          stage: project.stage,
          version: 'A版',
          isAutoGenerated: true,
          uploadDate: new Date().toLocaleString(),
          data: card.content,
          fileSize: card.content ? new Blob([card.content]).size : 0,
        };

        if (cardModuleId) {
          if (card.type === 'module-assembly') {
            newDesignFile.moduleId = cardModuleId;
          } else if (card.type === 'component-assembly' || card.type === 'component-table') {
            newDesignFile.componentId = cardModuleId;
          }
        }

        addDesignFile(project.id, newDesignFile);
      }
    });

    setDiagramResult(cards);
    showToast('已生成并保存设计图表', 'success');
  };

  const handleUploadDesignFile = async (e: React.ChangeEvent<HTMLInputElement>, designFileId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDesignFile(designFileId);
    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        const existingFile = project.designFiles.find(df => df.id === designFileId);
        if (existingFile) {
          updateDesignFile(project.id, designFileId, {
            data: content,
            fileSize: file.size,
            uploadDate: new Date().toLocaleString(),
          });
          showToast('设计文件已上传', 'success');
        }
      };
      reader.readAsText(file);
    } catch (error) {
      showToast('上传失败', 'error');
    }
    setUploadingDesignFile(null);
    if (e.target) e.target.value = '';
  };

  const handleSyncDesignFileToModules = () => {
    if (!syncTargetDesignFile || syncDesignModuleIds.length === 0) return;

    let syncedModules = 0;
    let syncedComponents = 0;

    syncDesignModuleIds.forEach(id => {
      const isModule = project.modules.some((m: any) => m.id === id);
      const allComponents = project.modules.flatMap((m: any) => m.components);
      const isComponent = allComponents.some((c: any) => c.id === id);

      if (isModule) {
        const module = project.modules.find((m: any) => m.id === id);
        if (module) {
          const existingDesignFile = module.designFiles?.find((df: any) => df.id === syncTargetDesignFile.id);
          if (!existingDesignFile) {
            updateProject(project.id, {
              modules: project.modules.map((m: any) => {
                if (m.id === id) {
                  return {
                    ...m,
                    designFiles: [...(m.designFiles || []), syncTargetDesignFile],
                  };
                }
                return m;
              }),
            });
            syncedModules++;
          }
        }
      }

      if (isComponent) {
        updateProject(project.id, {
          modules: project.modules.map((m: any) => {
            const compIndex = m.components.findIndex((c: any) => c.id === id);
            if (compIndex !== -1) {
              const existingDesignFile = m.components[compIndex].designFiles?.find((df: any) => df.id === syncTargetDesignFile.id);
              if (!existingDesignFile) {
                m.components[compIndex].designFiles = [...(m.components[compIndex].designFiles || []), syncTargetDesignFile];
              }
            }
            return m;
          }),
        });
        syncedComponents++;
      }
    });

    const msg = `${syncedModules > 0 ? `${syncedModules} 个模块` : ''}${syncedModules > 0 && syncedComponents > 0 ? '和' : ''}${syncedComponents > 0 ? `${syncedComponents} 个组件` : ''}`;
    showToast(`已将设计文件同步到 ${msg}`, 'success');
    setShowDesignSyncModal(false);
    setSyncTargetDesignFile(null);
    setSyncDesignModuleIds([]);
  };

  const handleCopyDiagram = async () => {
    if (diagramText) {
      await navigator.clipboard.writeText(diagramText);
      showToast('已复制到剪贴板', 'success');
    }
  };

  const handleCreateModule = (e: React.FormEvent) => {
    e.preventDefault();
    addModule(project.id, {
      projectId: project.id,
      ...moduleForm,
      components: [],
    });
    showToast('模块创建成功', 'success');
    setShowModuleModal(false);
    setModuleForm({
      moduleNumber: '',
      moduleName: '',
      category: '',
      productionOrderNumber: '',
      holder: '',
      status: '未投产',
      stage: 'C阶段',
      version: 'v1.0',
    });
  };

  const handleUpdateModule = (e: React.FormEvent) => {
    e.preventDefault();

    if (!moduleEditForm.moduleNumber.trim()) {
      showToast('模块编号不能为空', 'error');
      return;
    }
    if (!moduleEditForm.moduleName.trim()) {
      showToast('模块名称不能为空', 'error');
      return;
    }

    const validationErrors: string[] = [];

    if (moduleEditForm.moduleNumber && !/^[A-Za-z0-9\-_]+$/.test(moduleEditForm.moduleNumber)) {
      validationErrors.push('模块编号只能包含字母、数字、连字符和下划线');
    }
    if (moduleEditForm.productionOrderNumber && !/^[A-Za-z0-9\-_]+$/.test(moduleEditForm.productionOrderNumber)) {
      validationErrors.push('生产指令号只能包含字母、数字、连字符和下划线');
    }

    if (validationErrors.length > 0) {
      showToast(validationErrors[0], 'error');
      return;
    }

    const system = project.systems.find(s => s.id === moduleEditForm.systemId);

    updateProject(project.id, {
      modules: project.modules.map(m => {
        if (m.id === editingModule.id) {
          return {
            ...m,
            moduleNumber: moduleEditForm.moduleNumber,
            moduleName: moduleEditForm.moduleName,
            productionOrderNumber: moduleEditForm.productionOrderNumber || m.productionOrderNumber,
            holder: moduleEditForm.holder || m.holder,
            status: moduleEditForm.status,
            stage: moduleEditForm.stage,
            version: moduleEditForm.version,
            systemId: moduleEditForm.systemId || m.systemId,
            systemNumber: system?.systemNumber || moduleEditForm.systemNumber,
            systemName: system?.systemName || moduleEditForm.systemName,
            instructionNumber: moduleEditForm.instructionNumber || m.instructionNumber,
          };
        }
        return m;
      }),
    });

    showToast('模块更新成功', 'success');
    setShowModuleEditModal(false);
    setEditingModule(null);
  };

  const handleCreateSystem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSystem) {
      updateSystem(project.id, editingSystem.id, systemForm);
      showToast('系统已更新', 'success');
    } else {
      setIsCopyingSystem(true);
      try {
        const newSystemId = addSystem(project.id, {
          projectId: project.id,
          systemNumber: systemForm.systemNumber,
          systemName: systemForm.systemName,
          instructionNumber: systemForm.instructionNumber,
          holder: systemForm.holder,
          status: '未投产',
          stage: systemForm.stage,
          version: systemForm.version,
        });

        if (systemTemplate) {
          const templateModules = project.modules.filter(m => m.systemId === systemTemplate.id);

          for (const templateModule of templateModules) {
            const newModuleId = generateId();

            const newModule = {
              ...templateModule,
              id: newModuleId,
              systemId: newSystemId,
              instructionNumber: systemForm.instructionNumber,
              status: '未投产' as const,
              components: (templateModule.components || []).map((comp: any) => ({
                ...comp,
                id: generateId(),
                moduleId: newModuleId,
                instructionNumber: systemForm.instructionNumber,
                status: '未投产' as const,
              })),
            };
            addModule(project.id, newModule);
          }

          if (templateModules.length > 0) {
            showToast(`系统创建成功，已复制 ${templateModules.length} 个模块`, 'success');
          } else {
            showToast('系统创建成功', 'success');
          }

          setTimeout(() => {
            navigate(`/systems/${newSystemId}`);
          }, 500);
        } else {
          showToast('系统创建成功', 'success');
          setTimeout(() => {
            navigate(`/systems/${newSystemId}`);
          }, 500);
        }
      } catch (error) {
        console.error('Failed to create system:', error);
        showToast('系统创建失败', 'error');
      } finally {
        setIsCopyingSystem(false);
      }
    }
    setShowSystemModal(false);
    setEditingSystem(null);
    setSystemTemplate(null);
    setSystemForm({
      systemNumber: '',
      systemName: '',
      instructionNumber: '',
      holder: '',
      status: '未投产',
      stage: 'C阶段',
      version: 'v1.0',
    });
  };

  const handleCreateSoftware = (e: React.FormEvent) => {
    e.preventDefault();
    const allComponents = project.modules.flatMap(m => m.components);
    const adaptedComponents = allComponents.filter(c => softwareForm.adaptedComponentIds.includes(c.id));

    if (editingSoftware) {
      updateProject(project.id, {
        software: project.software.map(s =>
          s.id === editingSoftware.id
            ? {
                ...s,
                name: softwareForm.name,
                version: softwareForm.version,
                adaptedComponentIds: softwareForm.adaptedComponentIds,
                adaptedComponents: adaptedComponents.map(c => ({ id: c.id, name: c.componentName })),
              }
            : s
        ),
      });
      showToast('软件已更新', 'success');
    } else {
      const newSoftware = {
        id: generateId(),
        name: softwareForm.name,
        version: softwareForm.version,
        stage: 'C阶段' as ProjectStage,
        status: '未完成' as const,
        adaptedCategories: [],
        adaptedComponentTypes: [],
        adaptedComponentIds: softwareForm.adaptedComponentIds,
        adaptedComponents: adaptedComponents.map(c => ({ id: c.id, name: c.componentName })),
      };
      updateProject(project.id, {
        software: [...project.software, newSoftware],
      });
      showToast('软件创建成功', 'success');
    }

    setShowSoftwareModal(false);
    setEditingSoftware(null);
    setSoftwareForm({
      name: '',
      version: '',
      adaptedComponentIds: [],
    });
  };

  const handleDeleteSoftware = (softwareId: string) => {
    if (confirm('确定要删除该软件吗？')) {
      updateProject(project.id, {
        software: project.software.filter(s => s.id !== softwareId),
      });
      showToast('软件已删除', 'success');
    }
  };

  const handleOpenSyncModal = (soft: any) => {
    setSyncTargetSoftware(soft);
    setSyncComponentIds(soft.adaptedComponentIds || []);
    setShowSyncModal(true);
  };

  const handleSyncSoftwareToComponents = () => {
    if (!syncTargetSoftware) return;

    syncComponentIds.forEach(compId => {
      project.modules.forEach(module => {
        const comp = module.components.find((c: any) => c.id === compId);
        if (comp) {
          const existingSoftware = comp.burnedSoftware || [];
          const softwareEntry = {
            id: generateId(),
            softwareId: syncTargetSoftware.id,
            softwareName: syncTargetSoftware.name,
            softwareVersion: syncTargetSoftware.version,
            burnedAt: new Date().toISOString(),
            burnedBy: currentUser?.username || '系统',
          };
          const existingIndex = existingSoftware.findIndex((s: any) => s.softwareId === syncTargetSoftware.id);
          if (existingIndex >= 0) {
            existingSoftware[existingIndex] = softwareEntry;
          } else {
            existingSoftware.push(softwareEntry);
          }
          updateComponent(project.id, module.id, compId, {
            burnedSoftware: existingSoftware,
            logs: [...(comp.logs || []), {
              id: generateId(),
              action: `同步软件: ${syncTargetSoftware.name} v${syncTargetSoftware.version}`,
              timestamp: new Date().toISOString(),
              userId: currentUser?.id || '',
              username: currentUser?.username || '系统',
            }],
          });
        }
      });
    });

    showToast(`已同步软件到 ${syncComponentIds.length} 个组件`, 'success');
    setShowSyncModal(false);
    setSyncTargetSoftware(null);
    setSyncComponentIds([]);
  };

  const handleUpdateDocument = () => {
    if (!docForm.name.trim()) {
      showToast('请填写文档名称', 'error');
      return;
    }

    if (editingDoc) {
      updateProject(project.id, {
        documents: project.documents.map(d =>
          d.id === editingDoc.id
            ? { ...d, ...docForm }
            : d
        ),
      });
      showToast('文档已更新', 'success');
    } else {
      updateProject(project.id, {
        documents: [...project.documents, {
          id: generateId(),
          documentNumber: docForm.documentNumber,
          name: docForm.name,
          type: docForm.type || '设计文档',
          stage: docForm.stage,
          status: '未完成' as const,
        }],
      });
      showToast('文档已创建', 'success');
    }
    setShowDocModal(false);
    setEditingDoc(null);
    setDocForm({ documentNumber: '', name: '', type: '', stage: 'F阶段', version: 'A' });
  };

  const getStats = () => {
    const totalModules = project.modules.length;
    const totalComponents = project.modules.reduce((sum, m) => sum + m.components.length, 0);
    const normalComponents = project.modules.reduce(
      (sum, m) => sum + m.components.filter((c) => c.status === '正常').length,
      0
    );
    const faultComponents = project.modules.reduce(
      (sum, m) => sum + m.components.filter((c) => c.status === '故障').length,
      0
    );
    const documentsCompleted = project.documents.filter((d) => d.status === '已完成').length;
    const softwareCompleted = project.software.filter((s) => s.status === '已完成').length;

    const moduleStatusStats = project.modules.reduce((acc, m) => {
      acc[m.status] = (acc[m.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const categoryStats = project.modules.reduce((acc, m) => {
      if (!acc[m.category]) {
        acc[m.category] = { moduleCount: 0, componentCount: 0 };
      }
      acc[m.category].moduleCount += 1;
      acc[m.category].componentCount += m.components.length;
      return acc;
    }, {} as Record<string, { moduleCount: number; componentCount: number }>);

    const systemStatusStats = project.systems.reduce((acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const componentStatusStats = project.modules.reduce((acc, m) => {
      m.components.forEach((c: any) => {
        acc[c.status] = (acc[c.status] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    const statusModuleDetails = project.modules.reduce((acc, m) => {
      if (!acc[m.status]) {
        acc[m.status] = [];
      }
      acc[m.status].push({ name: m.moduleName, number: m.moduleNumber, components: m.components.length });
      return acc;
    }, {} as Record<string, { name: string; number: string; components: number }[]>);

    return {
      totalModules,
      totalComponents,
      normalRate: totalComponents > 0 ? Math.round((normalComponents / totalComponents) * 100) : 0,
      faultRate: totalComponents > 0 ? Math.round((faultComponents / totalComponents) * 100) : 0,
      documentsCompleted,
      documentsTotal: project.documents.length,
      softwareCompleted,
      softwareTotal: project.software.length,
      moduleStatusStats,
      categoryStats,
      systemStatusStats,
      componentStatusStats,
      statusModuleDetails,
    };
  };

  const getSearchResults = () => {
    const term = globalSearchTerm.toLowerCase();
    const results: { type: string; id: string; name: string; number: string; url: string }[] = [];

    project.systems.forEach(s => {
      if (s.systemName.toLowerCase().includes(term) || s.systemNumber.toLowerCase().includes(term)) {
        results.push({ type: '系统', id: s.id, name: s.systemName, number: s.systemNumber, url: `#systems` });
      }
    });

    project.modules.forEach(m => {
      if (m.moduleName.toLowerCase().includes(term) || m.moduleNumber.toLowerCase().includes(term)) {
        results.push({ type: '模块', id: m.id, name: m.moduleName, number: m.moduleNumber, url: `/modules/${m.id}` });
      }
      m.components.forEach(c => {
        if (c.componentName.toLowerCase().includes(term) || c.componentNumber.toLowerCase().includes(term)) {
          results.push({ type: '组件', id: c.id, name: c.componentName, number: c.componentNumber, url: `/components/${c.id}` });
        }
      });
    });

    project.documents.forEach(d => {
      if (d.name.toLowerCase().includes(term)) {
        results.push({ type: '文档', id: d.id, name: d.name, number: d.format || '', url: `#documents` });
      }
    });

    project.software.forEach(s => {
      if (s.name.toLowerCase().includes(term) || s.version.toLowerCase().includes(term)) {
        results.push({ type: '软件', id: s.id, name: s.name, number: s.version, url: `/software/${s.id}` });
      }
    });

    return results;
  };

  const stats = getStats();
  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'manager';

  const tabs = [
    { id: 'overview', label: '概览' },
    { id: 'systems', label: '系统管理' },
    { id: 'modules', label: '模块管理' },
    { id: 'components', label: '组件管理' },
    { id: 'design', label: '设计管理' },
    { id: 'reviews', label: '评审管理' },
    { id: 'software', label: '软件管理' },
    { id: 'documents', label: '文档管理' },
    { id: 'logs', label: '项目日志' },
  ];

  const handleAddCategory = () => {
    if (!newCategory.trim()) {
      showToast('请输入种类名称', 'error');
      return;
    }
    if (project.categories.includes(newCategory.trim())) {
      showToast('该种类已存在', 'error');
      return;
    }
    updateProject(id!, { categories: [...project.categories, newCategory.trim()] });
    showToast('种类添加成功', 'success');
    setNewCategory('');
    setShowCategoryModal(false);
  };

  const handleCreateReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewForm.title.trim() || !reviewForm.content.trim()) {
      showToast('请填写评审标题和内容', 'error');
      return;
    }
    const newReview = {
      id: generateId(),
      title: reviewForm.title,
      content: reviewForm.content,
      status: '待评审' as const,
      createdAt: new Date().toLocaleString('zh-CN'),
      createdBy: currentUser?.username || '未知用户',
      categories: [...project.categories],
      files: [],
    };
    updateProject(id!, { reviews: [...(project.reviews || []), newReview] });
    showToast('评审创建成功', 'success');
    setShowReviewModal(false);
    setReviewForm({ title: '', content: '' });
  };

  const handleReviewAction = (reviewId: string, status: '通过' | '不通过' | '需修改') => {
    if (!project.reviews) return;
    const updatedReviews = project.reviews.map(r => {
      if (r.id === reviewId) {
        return {
          ...r,
          status,
          reviewer: currentUser?.username || '未知用户',
          reviewDate: new Date().toLocaleString('zh-CN'),
        };
      }
      return r;
    });
    updateProject(id!, { reviews: updatedReviews });
    showToast(`评审已${status}`, 'success');
  };

  const handleReviewFileUploadWithDrag = (reviewId: string, files: FileList | null, category?: string) => {
    if (!files || files.length === 0) return;
    
    const targetCategory = category || selectedCategoryForUpload || '未分类';
    setIsUploading(true);
    let successCount = 0;
    let errorCount = 0;
    
    Array.from(files).forEach((file, index) => {
      let fileCategory = targetCategory;
      
      if (fileCategory === '未分类' && file.webkitRelativePath) {
        const pathParts = file.webkitRelativePath.split('/');
        if (pathParts.length > 1) {
          const possibleCategory = pathParts[0];
          const reviewCategories = (project.reviews || []).find(r => r.id === reviewId)?.categories || project.categories || [];
          if (reviewCategories.includes(possibleCategory)) {
            fileCategory = possibleCategory;
          }
        }
      }
      
      const reader = new FileReader();
      reader.onload = () => {
        const newFile = {
          id: generateId(),
          name: file.name,
          size: file.size,
          type: file.type,
          uploadDate: new Date().toLocaleString('zh-CN'),
          uploadedBy: currentUser?.username || '未知用户',
          category: fileCategory,
          dataUrl: reader.result as string,
        };
        
        const updatedReviews = (project.reviews || []).map(r => {
          if (r.id === reviewId) {
            return {
              ...r,
              files: [...(r.files || []), newFile],
            };
          }
          return r;
        });
        updateProject(id!, { reviews: updatedReviews });
        successCount++;
        
        if (index === files.length - 1) {
          setIsUploading(false);
          if (successCount > 0) {
            showToast(`成功上传 ${successCount} 个文件`, 'success');
          }
          if (errorCount > 0) {
            showToast(`${errorCount} 个文件上传失败`, 'error');
          }
        }
      };
      reader.onerror = () => {
        errorCount++;
        if (index === files.length - 1) {
          setIsUploading(false);
          if (successCount > 0) {
            showToast(`成功上传 ${successCount} 个文件`, 'success');
          }
          if (errorCount > 0) {
            showToast(`${errorCount} 个文件上传失败`, 'error');
          }
        }
      };
      reader.readAsDataURL(file);
    });
    
    setSelectedCategoryForUpload('');
  };
  const handleDownloadReviewFile = (reviewId: string, fileId: string) => {
    const review = (project.reviews || []).find(r => r.id === reviewId);
    if (!review || !review.files) return;
    
    const file = review.files.find(f => f.id === fileId);
    if (!file || !file.dataUrl) return;
    
    const link = document.createElement('a');
    link.href = file.dataUrl;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`文件 ${file.name} 下载成功`, 'success');
  };

  const handleDownloadReviewFolder = (reviewId: string) => {
    const review = (project.reviews || []).find(r => r.id === reviewId);
    if (!review || !review.files || review.files.length === 0) {
      showToast('没有可下载的文件', 'error');
      return;
    }
    
    review.files.forEach(file => {
      if (file.dataUrl) {
        setTimeout(() => {
          const link = document.createElement('a');
          link.href = file.dataUrl!;
          link.download = `${file.category || '未分类'}_${file.name}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }, 100);
      }
    });
    showToast('文件夹下载开始', 'success');
  };

  const handleDownloadReviewCategoryFiles = (reviewId: string, category: string) => {
    const review = (project.reviews || []).find(r => r.id === reviewId);
    if (!review || !review.files) {
      showToast('没有可下载的文件', 'error');
      return;
    }
    
    const categoryFiles = review.files.filter(f => f.category === category);
    if (categoryFiles.length === 0) {
      showToast('该文件夹没有文件', 'error');
      return;
    }
    
    categoryFiles.forEach((file, index) => {
      if (file.dataUrl) {
        setTimeout(() => {
          const link = document.createElement('a');
          link.href = file.dataUrl!;
          link.download = file.name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }, index * 100);
      }
    });
    showToast(`${category} 文件夹下载开始`, 'success');
  };

  const handleDeleteReviewFile = (reviewId: string, fileId: string) => {
    setConfirmModal({
      show: true,
      title: '确认删除',
      message: '确定要删除这个文件吗？此操作不可撤销。',
      onConfirm: () => {
        const updatedReviews = (project.reviews || []).map(r => {
          if (r.id === reviewId) {
            return {
              ...r,
              files: (r.files || []).filter(f => f.id !== fileId),
            };
          }
          return r;
        });
        updateProject(id!, { reviews: updatedReviews });
        showToast('文件已删除', 'success');
        setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
      }
    });
  };

  const handleDeleteReviewCategory = (reviewId: string, category: string) => {
    const categoryFiles = (project.reviews || []).find(r => r.id === reviewId)?.files?.filter(f => f.category === category) || [];
    setConfirmModal({
      show: true,
      title: '确认删除',
      message: `确定要删除 "${category}" 文件夹及其所有文件 (${categoryFiles.length}个) 吗？此操作不可撤销。`,
      onConfirm: () => {
        const updatedReviews = (project.reviews || []).map(r => {
          if (r.id === reviewId) {
            return {
              ...r,
              files: (r.files || []).filter(f => f.category !== category),
            };
          }
          return r;
        });
        updateProject(id!, { reviews: updatedReviews });
        showToast(`${category} 文件夹已删除`, 'success');
        setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
      }
    });
  };

  const handleDeleteReview = (reviewId: string) => {
    setConfirmModal({
      show: true,
      title: '确认删除评审',
      message: '确定要删除这个评审及其所有文件吗？此操作不可撤销。',
      onConfirm: () => {
        const updatedReviews = (project.reviews || []).filter(r => r.id !== reviewId);
        updateProject(id!, { reviews: updatedReviews });
        showToast('评审已删除', 'success');
        setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
      }
    });
  };

  return (
    <div>
      <div className="mb-6">
        <Link to="/projects" className={`flex items-center gap-2 ${t.textSecondary} hover:${t.text} mb-4`}>
          <ArrowLeft size={20} />
          返回项目列表
        </Link>
        <div className="flex justify-between items-start gap-4">
          <div>
            <h1 className={`text-2xl font-bold ${t.text}`}>{project.name}</h1>
            <p className={t.textMuted}>{project.projectNumber} | 版本: {project.version}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${t.textMuted}`} size={16} />
              <input
                type="text"
                placeholder="搜索..."
                value={globalSearchTerm}
                onChange={(e) => setGlobalSearchTerm(e.target.value)}
                className={`pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none transition-all ${t.input} w-48`}
              />
            </div>
            <button
              onClick={async () => {
                const snapshot = await createPreUpdateSnapshot();
                showToast(`数据快照已创建，包含 ${snapshot.metadata.projectCount || 0} 个项目`, 'success');
              }}
              className={`px-3 py-2 border rounded-lg text-sm flex items-center gap-1.5 ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}
              title="创建数据备份"
            >
              <Download size={14} /> 备份
            </button>
            <button
              onClick={() => {
                const snapshot = getRollbackSnapshot();
                if (snapshot) {
                  setRollbackSnapshot(snapshot);
                  setShowRollbackModal(true);
                } else {
                  showToast('暂无可用回滚快照', 'warning');
                }
              }}
              className={`px-3 py-2 border rounded-lg text-sm flex items-center gap-1.5 ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}
              title="回滚数据"
            >
              <RotateCcw size={14} /> 回滚
            </button>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${t.stageColors[project.stage as keyof typeof t.stageColors] || t.stageColors.C阶段}`}>
              {project.stage}
            </span>
          </div>
        </div>
      </div>

      {globalSearchTerm && getSearchResults().length > 0 && (
        <div className={`relative z-50 mb-4 p-4 ${t.card} rounded-lg border ${t.border} max-h-64 overflow-y-auto shadow-lg`}>
          <div className={`text-sm ${t.textMuted} mb-2`}>找到 {getSearchResults().length} 个结果</div>
          <div className="space-y-2">
            {getSearchResults().map((result, index) => (
              <Link
                key={`${result.type}-${result.id}-${index}`}
                to={result.url}
                onClick={() => setGlobalSearchTerm('')}
                className={`flex items-center justify-between p-2 rounded ${t.hoverBg} hover:${t.hoverBg}`}
              >
                <div className="flex items-center gap-2">
                  {result.type === '系统' && <Monitor size={14} className={t.textMuted} />}
                  {result.type === '模块' && <Package size={14} className={t.textMuted} />}
                  {result.type === '组件' && <Package size={14} className={t.textMuted} />}
                  {result.type === '文档' && <FileText size={14} className={t.textMuted} />}
                  {result.type === '软件' && <Download size={14} className={t.textMuted} />}
                  <span className={`text-sm ${t.text}`}>{result.name}</span>
                  <span className={`text-xs ${t.textMuted}`}>{result.number}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${t.badge}`}>{result.type}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
      {globalSearchTerm && getSearchResults().length === 0 && (
        <div className={`relative z-50 mb-4 text-sm ${t.textMuted} p-4 ${t.card} rounded-lg border ${t.border}`}>未找到相关结果</div>
      )}

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
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className={`${t.card} rounded-lg shadow-sm p-6 border ${t.border}`}>
              <div className={`text-sm ${t.textMuted} mb-1`}>项目阶段</div>
              <div className={`text-2xl font-bold ${t.text}`}>{project.stage}</div>
            </div>
            <div className={`${t.card} rounded-lg shadow-sm p-6 border ${t.border}`}>
              <div className={`text-sm ${t.textMuted} mb-1`}>系统总数</div>
              <div className={`text-2xl font-bold text-emerald-400`}>{project.systems.length}</div>
            </div>
            <div className={`${t.card} rounded-lg shadow-sm p-6 border ${t.border}`}>
              <div className={`text-sm ${t.textMuted} mb-1`}>模块总数 / 正常率</div>
              <div className={`text-2xl font-bold ${t.success}`}>{stats.totalModules} / {stats.normalRate}%</div>
            </div>
            <div className={`${t.card} rounded-lg shadow-sm p-6 border ${t.border}`}>
              <div className={`text-sm ${t.textMuted} mb-1`}>组件总数 / 故障率</div>
              <div className={`text-2xl font-bold ${t.error}`}>{stats.totalComponents} / {stats.faultRate}%</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={`${t.card} rounded-xl shadow-md p-6 border ${t.border} relative overflow-hidden`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-bl-full" />
              <h3 className={`text-lg font-semibold ${t.text} mb-6 flex items-center gap-2`}>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                系统状态
              </h3>
              <div className="flex items-center justify-center gap-8">
                <div className="relative group">
                  <div className="absolute inset-0 rounded-full animate-pulse opacity-20 bg-gradient-to-r from-emerald-500 via-cyan-500 to-emerald-500 blur-sm animate-spin-slow" />
                  <svg viewBox="0 0 100 100" className="w-44 h-44 transform -rotate-90 transition-transform duration-300 group-hover:scale-105">
                    <defs>
                      <filter id="glow-emerald">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                        <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="0" className={t.textMuted} opacity="0.1" />
                    <g className="animate-slow-rotate origin-center">
                    {(() => {
                      const total = Object.entries(stats.systemStatusStats).reduce((sum, [, count]) => sum + count, 0) || 1;
                      const circumference = 2 * Math.PI * 40;
                      let currentOffset = 0;
                      const statusColors: Record<string, string> = {
                        '正常': '#10b981',
                        '投产中': '#3b82f6',
                        '维修中': '#f97316',
                        '三防中': '#8b5cf6',
                        '测试中': '#eab308',
                        '仿真中': '#06b6d4',
                        '未投产': '#6b7280',
                        '借用中': '#f59e0b',
                        '故障': '#ef4444',
                      };
                      return Object.entries(stats.systemStatusStats).map(([status, count]) => {
                        const percentage = count / total;
                        const dashLength = percentage * circumference;
                        const color = statusColors[status] || '#6b7280';
                        const segment = (
                          <circle
                            key={status}
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke={color}
                            strokeWidth="10"
                            strokeLinecap="round"
                            strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                            strokeDashoffset={-currentOffset}
                            className="transition-all duration-500 ease-out"
                            filter="url(#glow-emerald)"
                          />
                        );
                        currentOffset += dashLength;
                        return segment;
                      });
                    })()}
                    </g>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center group-hover:scale-105 transition-transform duration-300">
                    <span className={`text-4xl font-bold ${t.text}`}>{project.systems.length}</span>
                    <span className={`text-xs ${t.textMuted} uppercase tracking-wider`}>系统</span>
                  </div>
                </div>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  {Object.entries(stats.systemStatusStats).map(([status, count]) => {
                    const statusColorMap: Record<string, string> = {
                      '正常': 'bg-emerald-500',
                      '投产中': 'bg-blue-500',
                      '维修中': 'bg-orange-500',
                      '三防中': 'bg-violet-500',
                      '测试中': 'bg-yellow-500',
                      '仿真中': 'bg-cyan-500',
                      '未投产': 'bg-gray-500',
                      '借用中': 'bg-amber-500',
                      '故障': 'bg-red-500',
                    };
                    const colorClass = statusColorMap[status] || 'bg-gray-500';
                    return (
                      <div key={status} className="px-3 py-2 rounded-lg transition-all duration-200">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${colorClass}`} />
                            <span className={`text-sm ${t.text}`}>{status}</span>
                          </div>
                          <span className={`text-sm font-medium ${t.text}`}>{count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className={`${t.card} rounded-xl shadow-md p-6 border ${t.border} relative overflow-hidden`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/5 to-transparent rounded-bl-full" />
              <h3 className={`text-lg font-semibold ${t.text} mb-6 flex items-center gap-2`}>
                <span className="w-2 h-2 rounded-full bg-cyan-500" />
                模块种类
              </h3>
              <div className="flex items-center justify-center gap-8">
                <div className="relative group">
                  <div className="absolute inset-0 rounded-full animate-pulse opacity-20 bg-gradient-to-r from-cyan-500 via-violet-500 to-cyan-500 blur-sm animate-spin-slow" />
                  <svg viewBox="0 0 100 100" className="w-44 h-44 transform -rotate-90 transition-transform duration-300 group-hover:scale-105">
                    <defs>
                      <filter id="glow-cyan">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                        <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="0" className={t.textMuted} opacity="0.1" />
                    <g className="animate-slow-rotate origin-center">
                    {(() => {
                      const total = Object.entries(stats.categoryStats).reduce((sum, [, data]) => sum + data.moduleCount, 0) || 1;
                      const circumference = 2 * Math.PI * 40;
                      let currentOffset = 0;
                      const categoryColors = ['#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#84cc16'];
                      return Object.entries(stats.categoryStats).map(([category, data], index) => {
                        const percentage = data.moduleCount / total;
                        const dashLength = percentage * circumference;
                        const color = categoryColors[index % categoryColors.length];
                        const segment = (
                          <circle
                            key={category}
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke={color}
                            strokeWidth="10"
                            strokeLinecap="round"
                            strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                            strokeDashoffset={-currentOffset}
                            className="transition-all duration-500 ease-out"
                            filter="url(#glow-cyan)"
                          />
                        );
                        currentOffset += dashLength;
                        return segment;
                      });
                    })()}
                    </g>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center group-hover:scale-105 transition-transform duration-300">
                    <span className={`text-4xl font-bold ${t.text}`}>{Object.keys(stats.categoryStats).length}</span>
                    <span className={`text-xs ${t.textMuted} uppercase tracking-wider`}>种类</span>
                  </div>
                </div>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  {Object.entries(stats.categoryStats).map(([category, data], index) => {
                    const categoryColors = ['bg-cyan-500', 'bg-violet-500', 'bg-pink-500', 'bg-amber-500', 'bg-emerald-500', 'bg-blue-500', 'bg-red-500', 'bg-lime-500'];
                    const colorClass = categoryColors[index % categoryColors.length];
                    return (
                      <div key={category} className="px-3 py-2 rounded-lg transition-all duration-200">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${colorClass}`} />
                            <span className={`text-sm ${t.text}`}>{category}</span>
                          </div>
                          <span className={`text-sm font-medium ${t.text}`}>{data.moduleCount}</span>
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(stats.categoryStats).length === 0 && (
                    <p className={`text-sm ${t.textMuted} col-span-2 text-center`}>暂无种类数据</p>
                  )}
                </div>
              </div>
            </div>

            <div className={`${t.card} rounded-xl shadow-md p-6 border ${t.border} relative overflow-hidden`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-500/5 to-transparent rounded-bl-full" />
              <h3 className={`text-lg font-semibold ${t.text} mb-6 flex items-center gap-2`}>
                <span className="w-2 h-2 rounded-full bg-violet-500" />
                模块状态
              </h3>
              <div className="flex items-center justify-center gap-8">
                <div className="relative group">
                  <div className="absolute inset-0 rounded-full animate-pulse opacity-20 bg-gradient-to-r from-violet-500 via-purple-500 to-violet-500 blur-sm animate-spin-slow" />
                  <svg viewBox="0 0 100 100" className="w-44 h-44 transform -rotate-90 transition-transform duration-300 group-hover:scale-105">
                    <defs>
                      <filter id="glow-violet">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                        <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="0" className={t.textMuted} opacity="0.1" />
                    <g className="animate-slow-rotate origin-center">
                    {(() => {
                      const total = Object.entries(stats.moduleStatusStats).reduce((sum, [, count]) => sum + count, 0) || 1;
                      const circumference = 2 * Math.PI * 40;
                      let currentOffset = 0;
                      const statusColors: Record<string, string> = {
                        '正常': '#10b981',
                        '投产中': '#3b82f6',
                        '维修中': '#f97316',
                        '三防中': '#8b5cf6',
                        '测试中': '#eab308',
                        '仿真中': '#06b6d4',
                        '未投产': '#6b7280',
                        '借用中': '#f59e0b',
                        '故障': '#ef4444',
                      };
                      return Object.entries(stats.moduleStatusStats).map(([status, count]) => {
                        const percentage = count / total;
                        const dashLength = percentage * circumference;
                        const color = statusColors[status] || '#6b7280';
                        const segment = (
                          <circle
                            key={status}
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke={color}
                            strokeWidth="10"
                            strokeLinecap="round"
                            strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                            strokeDashoffset={-currentOffset}
                            className="transition-all duration-500 ease-out"
                            filter="url(#glow-violet)"
                          />
                        );
                        currentOffset += dashLength;
                        return segment;
                      });
                    })()}
                    </g>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center group-hover:scale-105 transition-transform duration-300">
                    <span className={`text-4xl font-bold ${t.text}`}>{stats.totalModules}</span>
                    <span className={`text-xs ${t.textMuted} uppercase tracking-wider`}>模块</span>
                  </div>
                </div>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  {Object.entries(stats.moduleStatusStats).map(([status, count]) => {
                    const statusColorMap: Record<string, string> = {
                      '正常': 'bg-emerald-500',
                      '投产中': 'bg-blue-500',
                      '维修中': 'bg-orange-500',
                      '三防中': 'bg-violet-500',
                      '测试中': 'bg-yellow-500',
                      '仿真中': 'bg-cyan-500',
                      '未投产': 'bg-gray-500',
                      '借用中': 'bg-amber-500',
                      '故障': 'bg-red-500',
                    };
                    const colorClass = statusColorMap[status] || 'bg-gray-500';
                    return (
                      <div key={status} className="px-3 py-2 rounded-lg transition-all duration-200">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${colorClass}`} />
                            <span className={`text-sm ${t.text}`}>{status}</span>
                          </div>
                          <span className={`text-sm font-medium ${t.text}`}>{count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className={`${t.card} rounded-xl shadow-md p-6 border ${t.border} relative overflow-hidden`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-rose-500/5 to-transparent rounded-bl-full" />
              <h3 className={`text-lg font-semibold ${t.text} mb-6 flex items-center gap-2`}>
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                组件状态
              </h3>
              <div className="flex items-center justify-center gap-8">
                <div className="relative group">
                  <div className="absolute inset-0 rounded-full animate-pulse opacity-20 bg-gradient-to-r from-rose-500 via-pink-500 to-rose-500 blur-sm animate-spin-slow" />
                  <svg viewBox="0 0 100 100" className="w-44 h-44 transform -rotate-90 transition-transform duration-300 group-hover:scale-105">
                    <defs>
                      <filter id="glow-rose">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                        <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="0" className={t.textMuted} opacity="0.1" />
                    <g className="animate-slow-rotate origin-center">
                    {(() => {
                      const total = Object.entries(stats.componentStatusStats).reduce((sum, [, count]) => sum + count, 0) || 1;
                      const circumference = 2 * Math.PI * 40;
                      let currentOffset = 0;
                      const statusColors: Record<string, string> = {
                        '正常': '#10b981',
                        '投产中': '#3b82f6',
                        '维修中': '#f97316',
                        '三防中': '#8b5cf6',
                        '测试中': '#eab308',
                        '仿真中': '#06b6d4',
                        '未投产': '#6b7280',
                        '借用中': '#f59e0b',
                        '故障': '#ef4444',
                      };
                      return Object.entries(stats.componentStatusStats).map(([status, count]) => {
                        const percentage = count / total;
                        const dashLength = percentage * circumference;
                        const color = statusColors[status] || '#6b7280';
                        const segment = (
                          <circle
                            key={status}
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke={color}
                            strokeWidth="10"
                            strokeLinecap="round"
                            strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                            strokeDashoffset={-currentOffset}
                            className="transition-all duration-500 ease-out"
                            filter="url(#glow-rose)"
                          />
                        );
                        currentOffset += dashLength;
                        return segment;
                      });
                    })()}
                    </g>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center group-hover:scale-105 transition-transform duration-300">
                    <span className={`text-4xl font-bold ${t.text}`}>{stats.totalComponents}</span>
                    <span className={`text-xs ${t.textMuted} uppercase tracking-wider`}>组件</span>
                  </div>
                </div>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  {Object.entries(stats.componentStatusStats).map(([status, count]) => {
                    const statusColorMap: Record<string, string> = {
                      '正常': 'bg-emerald-500',
                      '投产中': 'bg-blue-500',
                      '维修中': 'bg-orange-500',
                      '三防中': 'bg-violet-500',
                      '测试中': 'bg-yellow-500',
                      '仿真中': 'bg-cyan-500',
                      '未投产': 'bg-gray-500',
                      '借用中': 'bg-amber-500',
                      '故障': 'bg-red-500',
                    };
                    const colorClass = statusColorMap[status] || 'bg-gray-500';
                    return (
                      <div key={status} className="px-3 py-2 rounded-lg transition-all duration-200">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${colorClass}`} />
                            <span className={`text-sm ${t.text}`}>{status}</span>
                          </div>
                          <span className={`text-sm font-medium ${t.text}`}>{count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* 项目计划 */}
          <div className={`${t.card} rounded-xl shadow-md p-6 border ${t.border} relative overflow-hidden mt-6`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/5 to-transparent rounded-bl-full" />
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-lg font-semibold ${t.text} flex items-center gap-2`}>
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                项目计划
              </h3>
              <button
                onClick={() => {
                  console.log('点击添加计划，当前 showPlanModal:', showPlanModal);
                  setShowPlanModal(true);
                }}
                className={`flex items-center gap-2 px-4 py-2 ${t.button} rounded-lg text-sm cursor-pointer z-10 relative`}
                type="button"
              >
                <Plus size={16} />
                添加计划
              </button>
            </div>
            <div className="space-y-3">
              {project.tasks && project.tasks.length > 0 ? (
                project.tasks
                  .sort((a, b) => {
                    if (a.status === '已完成' && b.status !== '已完成') return 1;
                    if (a.status !== '已完成' && b.status === '已完成') return -1;
                    return 0;
                  })
                  .map((task) => (
                    <div
                      key={task.id}
                      className={`flex items-center justify-between p-4 rounded-lg border ${t.border} ${t.hoverBg} transition-all ${
                        task.status === '已完成' ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`w-2 h-2 rounded-full ${
                          task.priority === '紧急' ? 'bg-red-500' :
                          task.priority === '高' ? 'bg-orange-500' :
                          task.priority === '中' ? 'bg-blue-500' : 'bg-gray-400'
                        }`} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-medium ${t.text} ${task.status === '已完成' ? 'line-through' : ''}`}>{task.title}</span>
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              task.priority === '紧急' ? 'bg-red-500/20 text-red-400' :
                              task.priority === '高' ? 'bg-orange-500/20 text-orange-400' :
                              task.priority === '中' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'
                            }`}>
                              {task.priority}
                            </span>
                            {task.status === '已完成' && (
                              <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400">
                                已完成
                              </span>
                            )}
                            {task.riskItem && (
                              <span className="px-2 py-0.5 rounded text-xs bg-orange-500/20 text-orange-400 flex items-center gap-1">
                                <Zap size={10} />
                                风险项
                              </span>
                            )}
                          </div>
                          {task.description && (
                            <p className={`text-sm ${t.textSecondary} mt-1`}>
                              {task.description.split('⚠️')[0].trim()}
                              {task.riskItem && (
                                <span className="text-orange-500/80 block mt-1 text-xs">
                                  ⚠️ 风险：{task.riskItem}
                                </span>
                              )}
                            </p>
                          )}
                          {task.dueDate && (
                            <div className={`flex items-center gap-1 mt-1 text-xs ${t.textMuted}`}>
                              <Clock size={12} />
                              <span>截止日期：{task.dueDate}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {task.status !== '已完成' && (
                          <button
                            onClick={() => {
                              const newTask = {
                                ...task,
                                status: '已完成' as const,
                                completedAt: new Date().toISOString().split('T')[0],
                              };
                              updateProject(id!, {
                                tasks: (project.tasks || []).map(t => t.id === task.id ? newTask : t)
                              });
                              if (task.taskId) {
                                updateTask(task.taskId, { status: '已完成', completedAt: new Date().toISOString().split('T')[0] });
                              }
                              showToast('计划已完成', 'success');
                            }}
                            className={`p-2 rounded-lg ${t.textSecondary} hover:bg-green-500/20 hover:text-green-400 transition-colors`}
                            title="标记为完成"
                          >
                            <CheckCircle size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            const newTasks = (project.tasks || []).filter(t => t.id !== task.id);
                            updateProject(id!, { tasks: newTasks });
                            if (task.taskId) {
                              deleteTask(task.taskId);
                            }
                            showToast('计划已删除', 'success');
                          }}
                          className={`p-2 rounded-lg ${t.textSecondary} hover:bg-red-500/20 hover:text-red-400 transition-colors`}
                          title="删除"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))
              ) : (
                <div className={`text-center py-12 ${t.textMuted}`}>
                  <Zap className={`mx-auto mb-4 opacity-50`} size={48} />
                  <p>暂无计划目标</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === 'modules' && (
        <div>
          <div className="mb-4">
            <h2 className={`text-lg font-semibold ${t.text}`}>模块列表</h2>
          </div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setGroupByCategory(!groupByCategory)}
                className={`relative w-20 h-7 rounded-full transition-colors flex items-center justify-between px-1 ${
                  groupByCategory ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span className={`text-xs ml-1 ${groupByCategory ? 'text-white' : 'text-gray-600'}`}>种类</span>
                <span
                  className={`absolute top-0.5 w-8 h-6 bg-white rounded-full shadow transition-transform ${
                    groupByCategory ? 'left-11' : 'left-0.5'
                  }`}
                />
                <span className={`text-xs mr-1 ${groupByCategory ? 'text-gray-300' : 'text-gray-700'}`}>全部</span>
              </button>
              <select
                value={selectedStatus || ''}
                onChange={(e) => setSelectedStatus(e.target.value || null)}
                className={`h-7 px-2 text-sm rounded border ${t.border} ${t.text} ${t.card}`}
              >
                <option value="">所有状态</option>
                <option value="未投产">未投产</option>
                <option value="投产中">投产中</option>
                <option value="正常">正常</option>
                <option value="维修中">维修中</option>
                <option value="三防中">三防中</option>
                <option value="测试中">测试中</option>
                <option value="仿真中">仿真中</option>
                <option value="借用中">借用中</option>
                <option value="故障">故障</option>
              </select>
              <input
                type="text"
                placeholder="搜索模块编号..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`h-7 px-3 text-sm rounded border ${t.border} ${t.text} ${t.card} w-40`}
              />
              {canEdit && (
                <button
                  onClick={() => setShowModuleModal(true)}
                  className={`h-7 w-7 flex items-center justify-center rounded border ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}
                  title="新建模块"
                >
                  <Plus size={16} />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  selectedCategory === null
                    ? `${t.button} text-white`
                    : `${t.border} ${t.textSecondary} hover:${t.hoverBg}`
                }`}
              >
                全部 ({project.modules.filter(m => (!selectedStatus || m.status === selectedStatus) && (!searchTerm || m.moduleNumber.toLowerCase().includes(searchTerm.toLowerCase()))).length})
              </button>
              {Object.entries(
                project.modules.filter(m => (!selectedStatus || m.status === selectedStatus) && (!searchTerm || m.moduleNumber.toLowerCase().includes(searchTerm.toLowerCase()))).reduce((acc, module) => {
                  if (!acc[module.category]) {
                    acc[module.category] = 0;
                  }
                  acc[module.category]++;
                  return acc;
                }, {} as Record<string, number>)
              ).map(([category, count]) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                    selectedCategory === category
                      ? `${t.button} text-white`
                      : `${t.border} ${t.textSecondary} hover:${t.hoverBg}`
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${
                    category === '控制类' ? 'bg-cyan-500' :
                    category === '通信类' ? 'bg-violet-500' :
                    category === '电源类' ? 'bg-amber-500' :
                    category === '传感类' ? 'bg-pink-500' :
                    'bg-gray-500'
                  }`} />
                  {category} ({count})
                </button>
              ))}
            </div>
          </div>
          {project.modules.length === 0 ? (
            <div className={`text-center py-12 ${t.card} rounded-lg border ${t.border}`}>
              <Package className={`mx-auto ${t.textMuted} mb-4`} size={48} />
              <p className={t.textMuted}>暂无模块，点击上方按钮创建</p>
            </div>
          ) : groupByCategory ? (
            <div className="space-y-6">
              {Object.entries(
                project.modules.filter(m => (!selectedStatus || m.status === selectedStatus) && (!searchTerm || m.moduleNumber.toLowerCase().includes(searchTerm.toLowerCase()))).reduce((acc, module) => {
                  if (!acc[module.category]) {
                    acc[module.category] = [];
                  }
                  acc[module.category].push(module);
                  return acc;
                }, {} as Record<string, typeof project.modules>)
              ).filter(([category]) => selectedCategory === null || selectedCategory === category)
              .map(([category, modules]) => (
                <div key={category} className={`${t.card} rounded-lg shadow-sm border ${t.border} overflow-hidden`}>
                  <div className={`px-4 py-3 ${t.tableHeader} flex items-center justify-between`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        category === '控制类' ? 'bg-cyan-500' :
                        category === '通信类' ? 'bg-violet-500' :
                        category === '电源类' ? 'bg-amber-500' :
                        category === '传感类' ? 'bg-pink-500' :
                        'bg-gray-500'
                      }`} />
                      <span className={`font-medium ${t.text}`}>{category}</span>
                      <span className={`text-sm ${t.textMuted}`}>({modules.length})</span>
                    </div>
                    {selectedCategory === null && (
                      <button
                        onClick={() => setSelectedCategory(category)}
                        className={`text-xs ${t.textMuted} hover:${t.text}`}
                      >
                        只显示此类
                      </button>
                    )}
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {modules.map((module) => (
                      <div
                        key={module.id}
                        className={`flex items-center justify-between px-4 py-3 ${t.hoverBg} transition ${t.border}`}
                      >
                        <div className="flex flex-col gap-1 flex-1">
                          <div className="flex items-center gap-2">
                            <Link to={`/modules/${module.id}`} className={`font-medium ${t.text} hover:underline whitespace-nowrap`}>
                              {module.moduleName}
                            </Link>
                            <span className={`text-sm ${t.textMuted}`}>{module.moduleNumber}</span>
                            <span className={`px-2 py-1 rounded text-xs ${
                              t.statusColors[module.status as keyof typeof t.statusColors] || t.statusColors.故障
                            }`}>
                              {module.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {module.productionOrderNumber && <span className={`text-xs ${t.textMuted}`}>{module.productionOrderNumber}</span>}
                            <span className={`text-xs ${t.textMuted}`}>{module.stage}|{module.version}</span>
                            <span className={`text-xs ${t.textMuted}`}>· 组件数量：{module.components.length}</span>
                            {module.holder && <span className={`text-xs ${t.textMuted}`}>· 负责人：{module.holder}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const newNumber = (parseInt(module.moduleNumber.replace(/\D/g, '')) + 1).toString().padStart(module.moduleNumber.replace(/\D/g, '').length, '0');
                              const newModule: typeof module = {
                                ...module,
                                id: generateId(),
                                moduleNumber: module.moduleNumber.replace(/\d+$/, newNumber),
                                moduleName: module.moduleName,
                                status: '未投产',
                                components: module.components.map(c => ({ ...c, id: generateId() })),
                              };
                              addModule(project.id, {
                                projectId: project.id,
                                moduleNumber: newModule.moduleNumber,
                                moduleName: newModule.moduleName,
                                category: newModule.category,
                                productionOrderNumber: newModule.productionOrderNumber,
                                holder: newModule.holder,
                                status: newModule.status,
                                stage: newModule.stage,
                                version: newModule.version,
                                components: newModule.components,
                              });
                              showToast('模块复制成功', 'success');
                            }}
                            className={`p-1.5 rounded border ${t.border} ${t.textMuted} hover:${t.hoverBg}`}
                            title="复制模块"
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            onClick={() => {
                              setEditingModule(module);
                              setModuleEditForm({
                                moduleNumber: module.moduleNumber || '',
                                moduleName: module.moduleName || '',
                                instructionNumber: module.instructionNumber || '',
                                systemId: module.systemId || '',
                                systemNumber: module.systemNumber || '',
                                systemName: module.systemName || '',
                                productionOrderNumber: module.productionOrderNumber || '',
                                holder: module.holder || '',
                                status: (module.status || '未投产') as ModuleStatus,
                                stage: (module.stage || 'C阶段') as ProjectStage,
                                version: module.version || 'v1.0',
                              });
                              setShowModuleEditModal(true);
                            }}
                            className={`p-1.5 rounded border ${t.border} ${t.textMuted} hover:${t.hoverBg}`}
                            title="编辑模块"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('确定要删除该模块吗？')) {
                                deleteModule(project.id, module.id);
                                showToast('模块已删除', 'success');
                              }
                            }}
                            className={`p-1.5 rounded border ${t.border} ${t.textMuted} hover:${t.hoverBg}`}
                            title="删除模块"
                          >
                            <Trash2 size={14} />
                          </button>
                          <Link
                            to={`/modules/${module.id}`}
                            className={`p-1.5 rounded border ${t.border} ${t.textMuted} hover:${t.hoverBg}`}
                            title="查看详情"
                          >
                            <ChevronRight size={14} />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {project.modules.filter(m => (!selectedStatus || m.status === selectedStatus) && (!searchTerm || m.moduleNumber.toLowerCase().includes(searchTerm.toLowerCase()))).map((module) => (
                <div
                  key={module.id}
                  className={`${t.card} rounded-lg shadow-sm p-4 hover:shadow-md transition border ${t.border}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <Link to={`/modules/${module.id}`} className={`font-semibold ${t.text} hover:underline whitespace-nowrap`}>
                        {module.moduleName}
                      </Link>
                      <span className={`text-sm ${t.textMuted}`}>{module.moduleNumber}</span>
                      {(() => {
                        const total = module.components.length;
                        const normalCount = module.components.filter(c => c.status === '正常').length;
                        const faultCount = module.components.filter(c => c.status === '故障').length;
                        const normalRatio = total > 0 ? (normalCount / total) * 100 : 0;
                        const faultRatio = total > 0 ? (faultCount / total) * 100 : 0;
                        const statusBg = module.status === '正常' ? 'bg-green-100 dark:bg-green-500/30' :
                          module.status === '故障' ? 'bg-red-100 dark:bg-red-500/30' :
                          'bg-gray-100 dark:bg-gray-500/30';
                        return (
                          <div className="relative">
                            <span className={`px-2 py-1 rounded text-xs ${statusBg} text-green-700 dark:text-green-300`}>
                              {module.status}
                            </span>
                            {total > 0 && (
                              <div className="absolute bottom-0 left-0 h-0.5 bg-green-500 rounded-b" style={{ width: `${normalRatio}%` }} />
                            )}
                            {total > 0 && faultRatio > 0 && (
                              <div className="absolute bottom-0 right-0 h-0.5 bg-red-500 rounded-b" style={{ width: `${faultRatio}%` }} />
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {module.productionOrderNumber && <span className={`text-xs ${t.textMuted}`}>{module.productionOrderNumber}</span>}
                    <span className={`text-xs ${t.textMuted}`}>{module.stage}|{module.version}</span>
                    <span className={`text-xs ${t.textMuted}`}>· 组件数量：{module.components.length}</span>
                    {module.holder && <span className={`text-xs ${t.textMuted}`}>· 负责人：{module.holder}</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => {
                        const numMatch = module.moduleNumber.match(/\d+/);
                        const num = numMatch ? parseInt(numMatch[0]) + 1 : 1;
                        const prefix = numMatch ? module.moduleNumber.slice(0, numMatch.index) : module.moduleNumber;
                        const suffix = numMatch ? module.moduleNumber.slice(numMatch.index! + numMatch[0].length) : '';
                        const newNumber = prefix + num + suffix;
                        addModule(project.id, {
                          projectId: project.id,
                          moduleNumber: newNumber,
                          moduleName: module.moduleName,
                          category: module.category,
                          productionOrderNumber: module.productionOrderNumber,
                          holder: module.holder,
                          status: '未投产',
                          stage: module.stage,
                          version: module.version,
                          components: module.components.map(c => ({ ...c, id: generateId() })),
                        });
                        showToast('模块复制成功', 'success');
                      }}
                      className={`p-1.5 rounded border ${t.border} ${t.textMuted} hover:${t.hoverBg}`}
                      title="复制模块"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('确定要删除该模块吗？')) {
                          deleteModule(project.id, module.id);
                          showToast('模块已删除', 'success');
                        }
                      }}
                      className={`p-1.5 rounded border ${t.border} ${t.textMuted} hover:${t.hoverBg}`}
                      title="删除模块"
                    >
                      <Trash2 size={14} />
                    </button>
                    <button
                      onClick={() => {
                        setEditingModule(module);
                        setModuleEditForm({
                          moduleNumber: module.moduleNumber || '',
                          moduleName: module.moduleName || '',
                          instructionNumber: module.instructionNumber || '',
                          systemId: module.systemId || '',
                          systemNumber: module.systemNumber || '',
                          systemName: module.systemName || '',
                          productionOrderNumber: module.productionOrderNumber || '',
                          holder: module.holder || '',
                          status: (module.status || '未投产') as ModuleStatus,
                          stage: (module.stage || 'C阶段') as ProjectStage,
                          version: module.version || 'v1.0',
                        });
                        setShowModuleEditModal(true);
                      }}
                      className={`p-1.5 rounded border ${t.border} ${t.textMuted} hover:${t.hoverBg}`}
                      title="编辑模块"
                    >
                      <Edit2 size={14} />
                    </button>
                    <Link
                      to={`/modules/${module.id}`}
                      className={`p-1.5 rounded border ${t.border} ${t.textMuted} hover:${t.hoverBg}`}
                      title="查看详情"
                    >
                      <ChevronRight size={14} />
                    </Link>
                    <span className={`text-sm ${t.textMuted} ml-auto`}>{module.components.length} 组件</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'systems' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-lg font-semibold ${t.text}`}>系统列表</h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="flex items-center">
                  <input
                    type="text"
                    placeholder="搜索系统名称、编号或指令号..."
                    value={systemSearchTerm}
                    onChange={(e) => setSystemSearchTerm(e.target.value)}
                    onFocus={() => setShowSystemSearchDropdown(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && systemSearchTerm.trim()) {
                        const newHistory = [systemSearchTerm, ...systemSearchHistory.filter(h => h !== systemSearchTerm)].slice(0, 10);
                        setSystemSearchHistory(newHistory);
                        setShowSystemSearchDropdown(false);
                      }
                    }}
                    className={`h-8 px-3 text-sm rounded-l border ${t.border} ${t.text} ${t.card} w-56`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSystemSearchDropdown(!showSystemSearchDropdown)}
                    className={`h-8 px-2 border-t border-b border-r ${t.border} ${t.textSecondary} ${t.card} rounded-r hover:${t.hoverBg}`}
                  >
                    <ChevronRight size={16} className={`transition-transform ${showSystemSearchDropdown ? 'rotate-90' : ''}`} />
                  </button>
                </div>
                {showSystemSearchDropdown && (
                  <div className={`absolute top-full right-0 mt-1 ${t.card} border ${t.border} rounded-lg shadow-lg z-50 w-72 max-h-80 overflow-y-auto`}>
                    {systemSearchTerm && (
                      <div className="p-2 border-b ${t.border}">
                        <div className={`text-xs ${t.textMuted} mb-1`}>搜索 "{systemSearchTerm}"</div>
                        <div className="flex flex-wrap gap-1">
                          {project.systems
                            .filter(s => s.instructionNumber?.includes(systemSearchTerm))
                            .slice(0, 5)
                            .map(s => (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => {
                                  setSystemSearchTerm(s.instructionNumber || '');
                                  setShowSystemSearchDropdown(false);
                                }}
                                className={`px-2 py-1 text-xs rounded ${t.hoverBg} ${t.textSecondary}`}
                              >
                                {s.instructionNumber}
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                    {systemSearchHistory.length > 0 && (
                      <div className="p-2">
                        <div className={`text-xs ${t.textMuted} mb-1`}>搜索历史</div>
                        <div className="flex flex-wrap gap-1">
                          {systemSearchHistory.map((history, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setSystemSearchTerm(history);
                                setShowSystemSearchDropdown(false);
                              }}
                              className={`px-2 py-1 text-xs rounded ${t.hoverBg} ${t.textSecondary} flex items-center gap-1`}
                            >
                              <Clock size={10} />
                              {history}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {!systemSearchTerm && systemSearchHistory.length === 0 && (
                      <div className={`p-3 text-xs ${t.textMuted}`}>
                        输入指令号开始搜索，支持模糊匹配
                      </div>
                    )}
                  </div>
                )}
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={handleOpenSystemModal}
                  className={`flex items-center gap-2 px-4 py-2 ${t.button} rounded-lg`}
                >
                  <Plus size={18} />
                  新建系统
                </button>
              )}
            </div>
          </div>
          {project.systems && project.systems.length === 0 ? (
            <div className={`text-center py-12 ${t.card} rounded-lg border ${t.border}`}>
              <Monitor className={`mx-auto ${t.textMuted} mb-4`} size={48} />
              <p className={t.textMuted}>暂无系统</p>
            </div>
          ) : (
            <div className={`${t.card} rounded-lg shadow-sm overflow-hidden border ${t.border}`}>
              <table className="w-full">
                <thead className={t.tableHeader}>
                  <tr>
                    <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>系统名称</th>
                    <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>编号</th>
                    <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>指令号</th>
                    <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>阶段</th>
                    <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>状态</th>
                    <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {project.systems?.filter(s =>
                    !systemSearchTerm ||
                    s.systemName.toLowerCase().includes(systemSearchTerm.toLowerCase()) ||
                    s.systemNumber.toLowerCase().includes(systemSearchTerm.toLowerCase()) ||
                    s.instructionNumber?.toLowerCase().includes(systemSearchTerm.toLowerCase())
                  ).map((system) => (
                    <tr key={system.id} className={`border-t ${t.border} ${t.hoverBg}`}>
                      <td className={`px-4 py-3 ${t.text}`}>
                        <Link to={`/systems/${system.id}`} className={`hover:underline ${t.text}`}>
                          {system.systemName}
                        </Link>
                      </td>
                      <td className={`px-4 py-3 ${t.textSecondary}`}>{system.systemNumber}</td>
                      <td className={`px-4 py-3 ${t.textSecondary}`}>{system.instructionNumber}</td>
                      <td className={`px-4 py-3 ${t.textSecondary}`}>{system.stage}</td>
                      <td className="px-4 py-3">
                        {(() => {
                          const systemModules = project.modules.filter(m => m.systemId === system.id);
                          const allComponents = systemModules.flatMap(m => m.components || []);
                          const total = allComponents.length;
                          const statusCounts: Record<string, number> = {};
                          allComponents.forEach(c => {
                            statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
                          });
                          const statusColors: Record<string, string> = {
                            '正常': '#10b981',
                            '故障': '#ef4444',
                            '维修中': '#f97316',
                            '三防中': '#a855f7',
                            '测试中': '#eab308',
                            '仿真中': '#06b6d4',
                            '借用中': '#3b82f6',
                            '投产中': '#3b82f6',
                            '未投产': '#6b7280',
                          };
                          const statusBg = system.status === '正常' ? 'bg-green-100 dark:bg-green-500/30 text-green-700 dark:text-green-300' :
                            system.status === '故障' ? 'bg-red-100 dark:bg-red-500/30 text-red-700 dark:text-red-300' :
                            'bg-gray-100 dark:bg-gray-500/30 text-gray-700 dark:text-gray-300';
                          return (
                            <div className="relative inline-block">
                              <span className={`px-2 py-1 rounded text-xs ${statusBg}`}>
                                {system.status}
                              </span>
                              {total > 0 && (
                                <div className="absolute bottom-0 left-0 right-0 h-1 flex rounded-b overflow-hidden">
                                  {Object.entries(statusCounts).map(([status, count]) => (
                                    <div
                                      key={status}
                                      className="h-full"
                                      style={{
                                        width: `${(count / total) * 100}%`,
                                        backgroundColor: statusColors[status] || '#6b7280'
                                      }}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSystemForm({
                                systemNumber: system.systemNumber,
                                systemName: system.systemName,
                                instructionNumber: system.instructionNumber,
                                holder: system.holder || '',
                                status: system.status,
                                stage: system.stage,
                                version: system.version || 'v1.0',
                              });
                              setEditingSystem(system);
                              setShowSystemModal(true);
                            }}
                            className={`p-1.5 rounded border ${t.border} ${t.textMuted} hover:${t.hoverBg}`}
                            title="编辑"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('确定要删除该系统吗？')) {
                                deleteSystem(project.id, system.id);
                                showToast('系统已删除', 'success');
                              }
                            }}
                            className={`p-1.5 rounded border ${t.border} text-red-500 hover:${t.hoverBg}`}
                            title="删除"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {project.documents.filter(doc => !selectedDocStage || doc.stage === selectedDocStage).length > DOC_PAGE_SIZE && (
                <div className={`flex items-center justify-between px-4 py-3 border-t ${t.border}`}>
                  <div className={`text-sm ${t.textSecondary}`}>
                    第 {docPage} 页，共 {Math.ceil(project.documents.filter(doc => !selectedDocStage || doc.stage === selectedDocStage).length / DOC_PAGE_SIZE)} 页
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setDocPage(p => Math.max(1, p - 1))}
                      disabled={docPage === 1}
                      className={`px-3 py-1 border rounded ${t.button} disabled:opacity-50`}
                    >
                      上一页
                    </button>
                    <button
                      onClick={() => setDocPage(p => Math.min(Math.ceil(project.documents.filter(doc => !selectedDocStage || doc.stage === selectedDocStage).length / DOC_PAGE_SIZE), p + 1))}
                      disabled={docPage >= Math.ceil(project.documents.filter(doc => !selectedDocStage || doc.stage === selectedDocStage).length / DOC_PAGE_SIZE)}
                      className={`px-3 py-1 border rounded ${t.button} disabled:opacity-50`}
                    >
                      下一页
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'components' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-lg font-semibold ${t.text}`}>组件列表</h2>
            {canEdit && (
              <button
                onClick={() => {
                  if (project.modules.length === 0) {
                    showToast('请先创建模块', 'warning');
                    return;
                  }
                  navigate(`/projects/${project.id}/modules/new`);
                }}
                className={`flex items-center gap-2 px-4 py-2 ${t.button} rounded-lg`}
              >
                <Plus size={18} />
                新增组件
              </button>
            )}
          </div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setGroupByComponentName(!groupByComponentName)}
                className={`relative w-20 h-7 rounded-full transition-colors flex items-center justify-between px-1 ${
                  groupByComponentName ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span className={`text-xs ml-1 ${groupByComponentName ? 'text-white' : 'text-gray-600'}`}>名称</span>
                <span
                  className={`absolute top-0.5 w-8 h-6 bg-white rounded-full shadow transition-transform ${
                    groupByComponentName ? 'left-11' : 'left-0.5'
                  }`}
                />
                <span className={`text-xs mr-1 ${groupByComponentName ? 'text-gray-300' : 'text-gray-700'}`}>全部</span>
              </button>
              <select
                value={selectedStatus || ''}
                onChange={(e) => setSelectedStatus(e.target.value || null)}
                className={`h-7 px-2 text-sm rounded border ${t.border} ${t.text} ${t.card}`}
              >
                <option value="">所有状态</option>
                <option value="未投产">未投产</option>
                <option value="投产中">投产中</option>
                <option value="正常">正常</option>
                <option value="维修中">维修中</option>
                <option value="三防中">三防中</option>
                <option value="测试中">测试中</option>
                <option value="仿真中">仿真中</option>
                <option value="借用中">借用中</option>
                <option value="故障">故障</option>
              </select>
              <input
                type="text"
                placeholder="搜索组件编号..."
                value={componentSearchTerm}
                onChange={(e) => setComponentSearchTerm(e.target.value)}
                className={`h-7 px-3 text-sm rounded border ${t.border} ${t.text} ${t.card} w-40`}
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setSelectedComponentName(null)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  selectedComponentName === null
                    ? `${t.button} text-white`
                    : `${t.border} ${t.textSecondary} hover:${t.hoverBg}`
                }`}
              >
                全部
              </button>
              {[...new Set(project.modules.flatMap(m => m.components.map(c => c.componentName)))].map(name => (
                <button
                  key={name}
                  onClick={() => setSelectedComponentName(name)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    selectedComponentName === name
                      ? `${t.button} text-white`
                      : `${t.border} ${t.textSecondary} hover:${t.hoverBg}`
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
          {project.modules.flatMap(m => m.components).length === 0 ? (
            <div className={`text-center py-12 ${t.card} rounded-lg border ${t.border}`}>
              <Package className={`mx-auto ${t.textMuted} mb-4`} size={48} />
              <p className={t.textMuted}>暂无组件</p>
            </div>
          ) : groupByComponentName ? (
            <div className="space-y-6">
              {Object.entries(
                project.modules
                  .flatMap(m => m.components.map(c => ({ ...c, moduleName: m.moduleName, moduleId: m.id })))
                  .filter(c => (!selectedStatus || c.status === selectedStatus) && (!selectedComponentName || c.componentName === selectedComponentName) && (!componentSearchTerm || c.componentNumber.toLowerCase().includes(componentSearchTerm.toLowerCase())))
                  .reduce((acc, comp) => {
                    if (!acc[comp.componentName]) {
                      acc[comp.componentName] = [];
                    }
                    acc[comp.componentName].push(comp);
                    return acc;
                  }, {} as Record<string, any[]>)
              ).map(([name, components]) => (
                <div key={name} className={`${t.card} rounded-lg shadow-sm border ${t.border} overflow-hidden`}>
                  <div className={`px-4 py-3 ${t.tableHeader} flex items-center justify-between`}>
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${t.text}`}>{name}</span>
                      <span className={`text-sm ${t.textMuted}`}>({components.length})</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                    {components.map((comp) => (
                      <div
                        key={comp.id}
                        className={`rounded-lg shadow-sm p-4 hover:shadow-md transition border ${t.border}`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex flex-col gap-2 flex-1">
                            <div className="flex items-center gap-2">
                              <Link to={`/components/${comp.id}`} className={`font-semibold ${t.text} hover:underline whitespace-nowrap`}>
                                {comp.componentName}
                              </Link>
                              <span className={`text-sm ${t.textMuted}`}>{comp.componentNumber}</span>
                              <div className="relative">
                                <button
                                  onClick={() => {
                                    setEditingComponent(comp);
                                    setComponentStatusForm({
                                      status: comp.status,
                                      reason: ''
                                    });
                                    setShowComponentStatusModal(true);
                                  }}
                                  className={`px-2 py-1 rounded text-xs ${
                                    t.statusColors[comp.status as keyof typeof t.statusColors] || t.statusColors.故障
                                  }`}
                                >
                                  {comp.status}
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {comp.productionOrderNumber && <span className={`text-xs ${t.textMuted}`}>{comp.productionOrderNumber}</span>}
                              <span className={`text-xs ${t.textMuted}`}>{comp.stage || '-'}|{comp.version || '-'}</span>
                              {comp.holder && <span className={`text-xs ${t.textMuted}`}>· 负责人：{comp.holder}</span>}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 ml-2">
                            <button
                              onClick={() => {
                                setEditingComponent(comp);
                                setComponentEditForm({
                                  componentName: comp.componentName,
                                  componentNumber: comp.componentNumber,
                                  productionOrderNumber: comp.productionOrderNumber || '',
                                  stage: comp.stage || '',
                                  version: comp.version || '',
                                  moduleId: comp.moduleId,
                                });
                                setShowComponentEditModal(true);
                              }}
                              className={`p-1.5 rounded border ${t.border} ${t.textMuted} hover:${t.hoverBg}`}
                              title="编辑组件"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('确定要删除该组件吗？')) {
                                  deleteComponent(project.id, comp.moduleId, comp.id);
                                  showToast('组件已删除', 'success');
                                }
                              }}
                              className={`p-1.5 rounded border ${t.border} ${t.textMuted} hover:${t.hoverBg}`}
                              title="删除组件"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {project.modules
                .flatMap(m => m.components.map(c => ({ ...c, moduleName: m.moduleName, moduleId: m.id })))
                .filter(c => (!selectedStatus || c.status === selectedStatus) && (!selectedComponentName || c.componentName === selectedComponentName) && (!componentSearchTerm || c.componentNumber.toLowerCase().includes(componentSearchTerm.toLowerCase())))
                .map((comp) => (
                  <div
                    key={comp.id}
                    className={`rounded-lg shadow-sm p-4 hover:shadow-md transition border ${t.border}`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex flex-col gap-1 flex-1">
                        <div className="flex items-center gap-2">
                          <Link to={`/components/${comp.id}`} className={`font-semibold ${t.text} hover:underline whitespace-nowrap`}>
                            {comp.componentName}
                          </Link>
                          <span className={`text-sm ${t.textMuted}`}>{comp.componentNumber}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {comp.productionOrderNumber && <span className={`text-xs ${t.textMuted}`}>{comp.productionOrderNumber}</span>}
                          <span className={`text-xs ${t.textMuted}`}>{comp.stage || '-'} | {comp.version || '-'}</span>
                        </div>
                        {comp.holder && <span className={`text-xs ${t.textMuted}`}>负责人: {comp.holder}</span>}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <button
                          onClick={() => {
                            const statuses = ['未投产', '投产中', '正常', '维修中', '三防中', '测试中', '仿真中', '借用中', '故障'];
                            const currentIndex = statuses.indexOf(comp.status);
                            const nextIndex = (currentIndex + 1) % statuses.length;
                            const newStatus = statuses[nextIndex];
                            const reason = prompt('请输入状态变更理由（可选）：');
                            updateComponent(project.id, comp.moduleId, comp.id, {
                              status: newStatus as any,
                              logs: [...(comp.logs || []), {
                                id: generateId(),
                                action: `状态变更：${comp.status} → ${newStatus}`,
                                timestamp: new Date().toISOString(),
                                userId: currentUser?.id || '',
                                username: currentUser?.username || '',
                                details: reason || '无'
                              }]
                            });
                            showToast('状态已更新', 'success');
                          }}
                          className={`px-2 py-1 rounded text-xs ${
                            t.statusColors[comp.status as keyof typeof t.statusColors] || t.statusColors.故障
                          }`}
                        >
                          {comp.status}
                        </button>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setCopyingComponent(comp);
                              setComponentCopyForm({
                                moduleId: comp.moduleId,
                                componentNumber: comp.componentNumber,
                              });
                              setShowComponentCopyModal(true);
                            }}
                            className={`p-1 rounded border ${t.border} ${t.textMuted} hover:${t.hoverBg}`}
                            title="复制组件"
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            onClick={() => {
                              setEditingComponent(comp);
                              setComponentEditForm({
                                componentName: comp.componentName,
                                componentNumber: comp.componentNumber,
                                productionOrderNumber: comp.productionOrderNumber || '',
                                stage: comp.stage || '',
                                version: comp.version || '',
                                moduleId: comp.moduleId,
                              });
                              setShowComponentEditModal(true);
                            }}
                            className={`p-1 rounded border ${t.border} ${t.textMuted} hover:${t.hoverBg}`}
                            title="编辑组件"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('确定要删除该组件吗？')) {
                                deleteComponent(project.id, comp.moduleId, comp.id);
                                showToast('组件已删除', 'success');
                              }
                            }}
                            className={`p-1 rounded border ${t.border} ${t.textMuted} hover:${t.hoverBg}`}
                            title="删除组件"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'reviews' && !navigatingReviewCategory && (
        <div
          className={`${isDraggingReview ? 'ring-2 ring-blue-500 ring-offset-2 rounded-lg' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            if (isDraggingReview !== 'main') {
              setIsDraggingReview('main');
            }
          }}
          onDragLeave={(e) => {
            if (e.currentTarget === e.target) {
              setIsDraggingReview(null);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDraggingReview(null);
          }}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className={`text-lg font-semibold ${t.text}`}>评审管理</h2>
            <button
              onClick={() => {
                setReviewForm({ title: '', content: '' });
                setShowReviewModal(true);
              }}
              className={`flex items-center gap-2 px-4 py-2 ${t.button} rounded-lg text-white`}
            >
              <Plus size={18} />
              新建评审
            </button>
          </div>
          {(!project.reviews || project.reviews.length === 0) ? (
            <div className={`text-center py-12 ${t.card} rounded-lg border ${t.border}`}>
              <ClipboardCheck className={`mx-auto ${t.textMuted} mb-4`} size={48} />
              <p className={t.textMuted}>暂无评审</p>
            </div>
          ) : (
            <div className="space-y-4">
              {project.reviews.map((review) => {
                const isExpanded = expandedReviews.includes(review.id);
                const reviewCategories = review.categories || project.categories || [];
                const reviewFiles = review.files || [];
                return (
                <div 
                  key={review.id} 
                  className={`${t.card} rounded-lg shadow-sm border ${t.border} p-4 ${isDraggingReview === review.id ? 'ring-2 ring-blue-400' : ''}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingReview(review.id);
                  }}
                  onDragLeave={(e) => {
                    e.stopPropagation();
                    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                    setIsDraggingReview(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingReview(null);
                    const files = e.dataTransfer.files;
                    if (files && files.length > 0) {
                      handleReviewFileUploadWithDrag(review.id, files);
                    }
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <button
                          onClick={() => setExpandedReviews(isExpanded ? expandedReviews.filter(id => id !== review.id) : [...expandedReviews, review.id])}
                          className={`p-1 rounded hover:${t.hoverBg}`}
                        >
                          {isExpanded ? <FolderOpen size={18} className={t.textMuted} /> : <Folder size={18} className={t.textMuted} />}
                        </button>
                        <button
                          onClick={() => setExpandedReviews(isExpanded ? expandedReviews.filter(id => id !== review.id) : [...expandedReviews, review.id])}
                          className={`font-medium ${t.text} hover:underline text-left`}
                        >
                          {review.title}
                        </button>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          review.status === '通过' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                          review.status === '不通过' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                          review.status === '需修改' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                          'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {review.status}
                        </span>
                      </div>
                      <p className={`text-sm ${t.textSecondary} mb-2`}>{review.content}</p>
                      <div className={`text-xs ${t.textMuted}`}>
                        创建者: {review.createdBy} | 创建时间: {review.createdAt}
                        {review.reviewer && ` | 评审人: ${review.reviewer}`}
                        {review.reviewDate && ` | 评审时间: ${review.reviewDate}`}
                      </div>
                      {review.comments && review.comments.length > 0 && (
                        <div className={`mt-3 pt-3 border-t ${t.border}`}>
                          <p className={`text-xs font-medium ${t.textSecondary} mb-2`}>评论:</p>
                          {review.comments.map((comment) => (
                            <div key={comment.id} className={`text-sm ${t.textMuted} mb-1`}>
                              <span className={t.text}>{comment.createdBy}:</span> {comment.content}
                              <span className={`ml-2 text-xs`}> ({comment.createdAt})</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      {canEdit && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedCategoryForUpload('');
                              document.getElementById(`upload-input-${review.id}`)?.click();
                            }}
                            className={`p-1.5 rounded border ${t.border} ${t.textMuted} hover:${t.hoverBg}`}
                            title="上传"
                          >
                            <Upload size={16} />
                          </button>
                          <input
                            id={`upload-input-${review.id}`}
                            type="file"
                            multiple
                            {...({ webkitdirectory: true } as React.InputHTMLAttributes<HTMLInputElement>)}
                            className="hidden"
                            onChange={(e) => handleReviewFileUploadWithDrag(review.id, e.target.files)}
                          />
                          <button
                            onClick={() => handleDownloadReviewFolder(review.id)}
                            className={`p-1.5 rounded border ${t.border} ${t.textMuted} hover:${t.hoverBg}`}
                            title="下载"
                          >
                            <Download size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteReview(review.id)}
                            className={`p-1.5 rounded border ${t.border} ${t.textMuted} hover:${t.hoverBg}`}
                            title="删除"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                      {canEdit && review.status === '待评审' && (
                        <>
                          <button
                            onClick={() => handleReviewAction(review.id, '通过')}
                            className={`p-1.5 rounded border ${t.border} ${t.textMuted} hover:${t.hoverBg}`}
                            title="通过"
                          >
                            <CheckCircle size={16} className="text-green-500" />
                          </button>
                          <button
                            onClick={() => handleReviewAction(review.id, '需修改')}
                            className={`p-1.5 rounded border ${t.border} ${t.textMuted} hover:${t.hoverBg}`}
                            title="需修改"
                          >
                            <Clock size={16} className="text-yellow-500" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {isExpanded && (
                    <div className={`mt-4 pt-4 border-t ${t.border}`}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className={`text-sm font-medium ${t.text}`}>评审文件夹</h4>
                        <div className="flex gap-2">
                          {isUploading && <Loader2 size={16} className={`animate-spin ${t.textMuted}`} />}
                          <select
                            value={selectedCategoryForUpload}
                            onChange={(e) => setSelectedCategoryForUpload(e.target.value)}
                            className={`px-2 py-1 text-xs border rounded ${t.border} ${t.text} ${t.card}`}
                          >
                            <option value="">选择种类</option>
                            {reviewCategories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                          <label className={`flex items-center gap-1 px-3 py-1 text-xs ${t.button} text-white rounded cursor-pointer`}>
                            <Upload size={14} />
                            上传
                            <input
                              type="file"
                              multiple
                              {...({ webkitdirectory: true } as React.InputHTMLAttributes<HTMLInputElement>)}
                              className="hidden"
                              onChange={(e) => handleReviewFileUploadWithDrag(review.id, e.target.files)}
                            />
                          </label>
                          <button
                            onClick={() => handleDownloadReviewFolder(review.id)}
                            className={`flex items-center gap-1 px-3 py-1 text-xs border rounded ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}
                          >
                            <Download size={14} />
                            下载
                          </button>
                        </div>
                      </div>
                      {reviewCategories.length === 0 ? (
                        <p className={`text-xs ${t.textMuted}`}>暂无种类文件夹</p>
                      ) : (
                        <div className="space-y-3">
                          {reviewCategories.map(category => {
                            const categoryFiles = reviewFiles.filter(f => f.category === category);
                            const isCatExpanded = expandedReviewCategories.includes(`${review.id}-${category}`);
                            return (
                              <div 
                                key={category} 
                                className={`p-3 rounded border ${t.border} ${isDraggingReview === `${review.id}-${category}` ? 'ring-2 ring-blue-400' : ''}`}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setIsDraggingReview(`${review.id}-${category}`);
                                }}
                                onDragLeave={(e) => {
                                  e.stopPropagation();
                                  if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                                  setIsDraggingReview(null);
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setIsDraggingReview(null);
                                  const files = e.dataTransfer.files;
                                  if (files && files.length > 0) {
                                    handleReviewFileUploadWithDrag(review.id, files, category);
                                  }
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <button
                                    onClick={() => {
                                      if (isCatExpanded) {
                                        setExpandedReviewCategories(expandedReviewCategories.filter(id => id !== `${review.id}-${category}`));
                                      } else {
                                        setExpandedReviewCategories([...expandedReviewCategories, `${review.id}-${category}`]);
                                      }
                                    }}
                                    className={`flex items-center gap-2 text-sm font-medium ${t.text} hover:${t.hoverBg} rounded p-1`}
                                  >
                                    {isCatExpanded ? <FolderOpen size={16} className={t.textMuted} /> : <Folder size={16} className={t.textMuted} />}
                                    {category}
                                    <span className={`text-xs ${t.textMuted}`}>({categoryFiles.length}个文件)</span>
                                  </button>
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => document.getElementById(`cat-upload-${review.id}-${category}`)?.click()}
                                      className={`p-1.5 rounded border ${t.border} ${t.textMuted} hover:${t.hoverBg}`}
                                      title="上传到此处"
                                    >
                                      <Upload size={14} />
                                    </button>
                                    <input
                                      id={`cat-upload-${review.id}-${category}`}
                                      type="file"
                                      multiple
                                      {...({ webkitdirectory: true } as React.InputHTMLAttributes<HTMLInputElement>)}
                                      className="hidden"
                                      onChange={(e) => handleReviewFileUploadWithDrag(review.id, e.target.files, category)}
                                    />
                                    {categoryFiles.length > 0 && (
                                      <button
                                        onClick={() => handleDownloadReviewCategoryFiles(review.id, category)}
                                        className={`p-1.5 rounded border ${t.border} ${t.textMuted} hover:${t.hoverBg}`}
                                        title="下载此文件夹"
                                      >
                                        <Download size={14} />
                                      </button>
                                    )}
                                    <button
                                      onClick={() => setNavigatingReviewCategory({ reviewId: review.id, category })}
                                      className={`p-1.5 rounded border ${t.border} ${t.textMuted} hover:${t.hoverBg}`}
                                      title="进入文件夹"
                                    >
                                      <ChevronRight size={14} />
                                    </button>
                                    {canEdit && (
                                      <button
                                        onClick={() => handleDeleteReviewCategory(review.id, category)}
                                        className={`p-1.5 rounded border ${t.border} ${t.textMuted} hover:${t.hoverBg}`}
                                        title="删除此文件夹"
                                      >
                                        <Trash2 size={14} className="text-red-400" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                {isCatExpanded && (
                                  categoryFiles.length === 0 ? (
                                    <p className={`text-xs ${t.textMuted} ml-6`}>暂无文件</p>
                                  ) : (
                                    <div className="ml-6 space-y-1">
                                      {categoryFiles.map(file => (
                                        <div key={file.id} className={`flex items-center justify-between p-2 rounded ${t.hoverBg}`}>
                                          <div className="flex items-center gap-2">
                                            <File size={14} className={t.textMuted} />
                                            <span className={`text-sm ${t.text}`}>{file.name}</span>
                                            <span className={`text-xs ${t.textMuted}`}>({(file.size / 1024).toFixed(1)} KB)</span>
                                          </div>
                                          <div className="flex gap-1">
                                            <button
                                              onClick={() => handleDownloadReviewFile(review.id, file.id)}
                                              className={`p-1 rounded hover:${t.hoverBg}`}
                                              title="下载"
                                            >
                                              <Download size={14} className={t.textMuted} />
                                            </button>
                                            {canEdit && (
                                              <button
                                                onClick={() => handleDeleteReviewFile(review.id, file.id)}
                                                className={`p-1 rounded hover:${t.hoverBg}`}
                                                title="删除"
                                              >
                                                <Trash2 size={14} className="text-red-400" />
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {isDraggingReview === review.id && (
                        <div className={`p-8 border-2 border-dashed rounded-lg text-center ${t.border}`}>
                          <Upload size={32} className={`mx-auto ${t.textMuted} mb-2`} />
                          <p className={`text-sm ${t.textMuted}`}>拖放文件或文件夹到此处上传</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'reviews' && navigatingReviewCategory && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setNavigatingReviewCategory(null)}
              className={`flex items-center gap-1 px-3 py-1.5 text-sm border rounded ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}
            >
              <ArrowLeft size={16} />
              返回
            </button>
            <span className={`text-sm ${t.textMuted}`}>
              评审: {(project.reviews || []).find(r => r.id === navigatingReviewCategory.reviewId)?.title} &gt; {navigatingReviewCategory.category}
            </span>
          </div>
          {(() => {
            const review = (project.reviews || []).find(r => r.id === navigatingReviewCategory.reviewId);
            if (!review) return null;
            const categoryFiles = (review.files || []).filter(f => f.category === navigatingReviewCategory.category);
            return (
              <div className={`${t.card} rounded-lg border ${t.border} p-4`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-lg font-medium ${t.text}`}>{navigatingReviewCategory.category}</h3>
                  <div className="flex gap-2">
                    {isUploading && <Loader2 size={16} className={`animate-spin ${t.textMuted}`} />}
                    <label className={`flex items-center gap-1 px-3 py-1.5 text-sm ${t.button} text-white rounded cursor-pointer`}>
                      <Upload size={16} />
                      上传
                      <input
                        type="file"
                        multiple
                        {...({ webkitdirectory: true } as React.InputHTMLAttributes<HTMLInputElement>)}
                        className="hidden"
                        onChange={(e) => handleReviewFileUploadWithDrag(navigatingReviewCategory.reviewId, e.target.files, navigatingReviewCategory.category)}
                      />
                    </label>
                    {categoryFiles.length > 0 && (
                      <>
                        <button
                          onClick={() => handleDownloadReviewCategoryFiles(navigatingReviewCategory.reviewId, navigatingReviewCategory.category)}
                          className={`flex items-center gap-1 px-3 py-1.5 text-sm border rounded ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}
                        >
                          <Download size={16} />
                          下载
                        </button>
                        <button
                          onClick={() => handleDeleteReviewCategory(navigatingReviewCategory.reviewId, navigatingReviewCategory.category)}
                          className={`flex items-center gap-1 px-3 py-1.5 text-sm border rounded ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}
                        >
                          <Trash2 size={16} className="text-red-400" />
                          删除
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {categoryFiles.length === 0 ? (
                  <div className={`text-center py-12 border rounded ${t.border}`}>
                    <Folder size={48} className={`mx-auto ${t.textMuted} mb-4`} />
                    <p className={`text-sm ${t.textMuted}`}>文件夹为空</p>
                    <p className={`text-xs ${t.textMuted} mt-2`}>拖放文件到此处或点击上传按钮添加文件</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {categoryFiles.map(file => (
                      <div 
                        key={file.id} 
                        className={`flex items-center justify-between p-3 rounded border ${t.border} hover:${t.hoverBg}`}
                      >
                        <div className="flex items-center gap-3">
                          <File size={20} className={t.textMuted} />
                          <div>
                            <p className={`text-sm ${t.text}`}>{file.name}</p>
                            <p className={`text-xs ${t.textMuted}`}>{(file.size / 1024).toFixed(1)} KB | 上传者: {file.uploadedBy} | {file.uploadDate}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDownloadReviewFile(navigatingReviewCategory.reviewId, file.id)}
                            className={`flex items-center gap-1 px-3 py-1.5 text-sm border rounded ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}
                          >
                            <Download size={14} />
                            下载
                          </button>
                          {canEdit && (
                            <button
                              onClick={() => handleDeleteReviewFile(navigatingReviewCategory.reviewId, file.id)}
                              className={`flex items-center gap-1 px-3 py-1.5 text-sm border rounded ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}
                            >
                              <Trash2 size={14} className="text-red-400" />
                              删除
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {activeTab === 'design' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className={`text-lg font-semibold ${t.text}`}>设计文件</h2>
            <div className="flex gap-2">
              <button
                onClick={handleAutoGenerateDesignDiagrams}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 text-sm font-medium shadow-md"
                title="自动生成模块装配图、组件装配图和组件配套表"
              >
                <RefreshCw size={16} className="animate-spin" style={{ animationDuration: '2s' }} />
                自动生成
              </button>
            </div>
          </div>

          <h3 className={`text-md font-medium ${t.text} mb-3 mt-6`}>设计文件列表</h3>
          
          <div className={`${t.card} rounded-lg p-4 mb-4 border ${t.border}`}>
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                <span className={`text-sm font-medium ${t.textSecondary}`}>分类:</span>
                <div className="flex rounded-lg overflow-hidden border ${t.border}">
                  <button
                    onClick={() => setFilterCategory('all')}
                    className={`px-3 py-1.5 text-sm ${filterCategory === 'all' ? 'bg-blue-600 text-white' : `${t.text} ${t.hoverBg}`}`}
                  >
                    全部
                  </button>
                  <button
                    onClick={() => setFilterCategory('module')}
                    className={`px-3 py-1.5 text-sm ${filterCategory === 'module' ? 'bg-blue-600 text-white' : `${t.text} ${t.hoverBg}`}`}
                  >
                    模块
                  </button>
                  <button
                    onClick={() => setFilterCategory('component')}
                    className={`px-3 py-1.5 text-sm ${filterCategory === 'component' ? 'bg-blue-600 text-white' : `${t.text} ${t.hoverBg}`}`}
                  >
                    组件
                  </button>
                  <button
                    onClick={() => setFilterCategory('table')}
                    className={`px-3 py-1.5 text-sm ${filterCategory === 'table' ? 'bg-blue-600 text-white' : `${t.text} ${t.hoverBg}`}`}
                  >
                    配套表
                  </button>
                </div>

                <span className={`text-sm font-medium ${t.textSecondary}`}>类型:</span>
                <div className="flex rounded-lg overflow-hidden border ${t.border}">
                  <button
                    onClick={() => setFilterType('all')}
                    className={`px-3 py-1.5 text-sm ${filterType === 'all' ? 'bg-green-600 text-white' : `${t.text} ${t.hoverBg}`}`}
                  >
                    全部
                  </button>
                  <button
                    onClick={() => setFilterType('assembly')}
                    className={`px-3 py-1.5 text-sm ${filterType === 'assembly' ? 'bg-green-600 text-white' : `${t.text} ${t.hoverBg}`}`}
                  >
                    装配图
                  </button>
                  <button
                    onClick={() => setFilterType('table')}
                    className={`px-3 py-1.5 text-sm ${filterType === 'table' ? 'bg-green-600 text-white' : `${t.text} ${t.hoverBg}`}`}
                  >
                    配套表
                  </button>
                </div>

                <span className={`text-sm font-medium ${t.textSecondary}`}>阶段:</span>
                <select
                  value={filterStage}
                  onChange={(e) => setFilterStage(e.target.value)}
                  className={`h-8 px-2 text-sm rounded border ${t.border} ${t.text} ${t.card}`}
                >
                  <option value="">全部阶段</option>
                  <option value="F阶段">F阶段</option>
                  <option value="C阶段">C阶段</option>
                  <option value="S阶段">S阶段</option>
                  <option value="D阶段">D阶段</option>
                  <option value="P阶段">P阶段</option>
                </select>

                <span className={`text-sm font-medium ${t.textSecondary}`}>版本:</span>
                <select
                  value={filterVersion}
                  onChange={(e) => setFilterVersion(e.target.value)}
                  className={`h-8 px-2 text-sm rounded border ${t.border} ${t.text} ${t.card}`}
                >
                  <option value="">全部版本</option>
                  <option value="A版">A版</option>
                  <option value="B版">B版</option>
                  <option value="C版">C版</option>
                  <option value="D版">D版</option>
                </select>

                <button
                  onClick={() => {
                    setFilterCategory('all');
                    setFilterType('all');
                    setFilterStage('');
                    setFilterVersion('');
                  }}
                  className={`px-3 py-1.5 text-sm border ${t.border} rounded-lg hover:${t.hoverBg} ${t.textSecondary}`}
                >
                  重置
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {project.designFiles
              .filter(df => {
                if (filterCategory === 'module' && df.category !== 'module') return false;
                if (filterCategory === 'component' && df.category !== 'component') return false;
                if (filterCategory === 'table' && df.category !== 'table') return false;
                if (filterType === 'assembly' && df.type !== '装配图') return false;
                if (filterType === 'table' && df.type !== '配套表') return false;
                if (filterStage && df.stage !== filterStage) return false;
                if (filterVersion && df.version !== filterVersion) return false;
                return true;
              })
              .map((file) => (
                <div key={file.id} className={`${t.card} rounded-lg shadow-sm border ${t.border} overflow-hidden hover:shadow-md transition-shadow`}>
                  <div className={`p-4 border-b ${t.border}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {file.type === '装配图' ? (
                          file.category === 'module' ? (
                            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                              <Layout size={16} className="text-blue-600" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                              <FileCode size={16} className="text-green-600" />
                            </div>
                          )
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                            <Table size={16} className="text-purple-600" />
                          </div>
                        )}
                        <div>
                          <div className={`font-medium ${t.text}`}>{file.name}</div>
                          <div className={`text-xs ${t.textMuted}`}>{file.type}</div>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        file.format === 'Excel' ? 'bg-green-100 text-green-700' : 
                        file.format === 'AutoCAD' ? 'bg-orange-100 text-orange-700' : 
                        'bg-red-100 text-red-700'
                      }`}>
                        {file.format}
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <div>
                        <span className={t.textMuted}>阶段:</span>
                        <span className={`ml-1 ${t.text}`}>{file.stage || '-'}</span>
                      </div>
                      <div>
                        <span className={t.textMuted}>版本:</span>
                        <span className={`ml-1 ${t.text}`}>{file.version || 'A版'}</span>
                      </div>
                      <div>
                        <span className={t.textMuted}>大小:</span>
                        <span className={`ml-1 ${t.text}`}>{file.fileSize ? `${(file.fileSize / 1024).toFixed(1)} KB` : '-'}</span>
                      </div>
                      <div>
                        <span className={t.textMuted}>时间:</span>
                        <span className={`ml-1 ${t.text}`}>{file.uploadDate.split(' ')[0]}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingDesignFile(file);
                          setDesignForm({
                            name: file.name,
                            type: file.type as '装配图' | '配套表',
                            format: file.format as 'AutoCAD' | 'Excel' | 'PDF',
                            stage: (file.stage as ProjectStage) || 'F阶段',
                            version: (file.version as ProjectVersion) || 'A版',
                            adaptedModuleIds: file.adaptedModuleIds || [],
                            adaptedComponentIds: file.adaptedComponentIds || [],
                          });
                          setShowDesignModal(true);
                        }}
                        className={`p-1.5 rounded border ${t.border} ${t.textMuted} hover:${t.hoverBg}`}
                        title="编辑"
                      >
                        <Edit2 size={14} />
                      </button>
                      <label
                        className={`p-1.5 rounded border ${t.border} ${t.textMuted} hover:${t.hoverBg} cursor-pointer`}
                        title="上传"
                      >
                        <Upload size={14} />
                        {uploadingDesignFile === file.id && <Loader2 size={14} className="animate-spin" />}
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => handleUploadDesignFile(e, file.id)}
                        />
                      </label>
                      <button
                        onClick={() => {
                          setSyncTargetDesignFile(file);
                          setSyncDesignModuleIds([...(file.adaptedModuleIds || []), ...(file.adaptedComponentIds || [])]);
                          setShowDesignSyncModal(true);
                        }}
                        className={`p-1.5 rounded border ${t.border} ${t.textMuted} hover:${t.hoverBg}`}
                        title="同步"
                      >
                        <RefreshCw size={14} />
                      </button>
                      <button
                        onClick={() => {
                          if (file.data) {
                            const blob = new Blob([file.data], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${file.name}.txt`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }
                        }}
                        className={`p-1.5 rounded border ${t.border} ${t.textMuted} hover:${t.hoverBg}`}
                        title="下载"
                      >
                        <Download size={14} />
                      </button>
                      {canEdit && (
                        <button
                          onClick={() => {
                            if (confirm('确定要删除这个设计文件吗？')) {
                              deleteDesignFile(project.id, file.id);
                              showToast('设计文件已删除', 'success');
                            }
                          }}
                          className={`p-1.5 rounded border ${t.border} ${t.textMuted} hover:${t.hoverBg}`}
                          title="删除"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>

          {project.designFiles.filter(df => {
            if (filterCategory === 'module' && df.category !== 'module') return false;
            if (filterCategory === 'component' && df.category !== 'component') return false;
            if (filterCategory === 'table' && df.category !== 'table') return false;
            if (filterType === 'assembly' && df.type !== '装配图') return false;
            if (filterType === 'table' && df.type !== '配套表') return false;
            if (filterStage && df.stage !== filterStage) return false;
            if (filterVersion && df.version !== filterVersion) return false;
            return true;
          }).length === 0 && (
            <div className={`text-center py-12 ${t.card} rounded-lg border ${t.border}`}>
              <FileText className={`mx-auto ${t.textMuted} mb-4`} size={48} />
              <p className={t.textMuted}>暂无设计文件</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'software' && (
        <div>
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <h2 className={`text-lg font-semibold ${t.text}`}>软件列表</h2>
              {canEdit && (
                <button
                  onClick={() => setShowSoftwareModal(true)}
                  className={`flex items-center gap-2 px-4 py-2 ${t.button} rounded-lg`}
                >
                  <Plus size={18} />
                  新建
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={selectedStatus || ''}
                onChange={(e) => setSelectedStatus(e.target.value || null)}
                className={`h-7 px-2 text-sm rounded border ${t.border} ${t.text} ${t.card}`}
              >
                <option value="">所有状态</option>
                <option value="未完成">未完成</option>
                <option value="已完成">已完成</option>
              </select>
            </div>
          </div>
          {project.software.length === 0 ? (
            <div className={`text-center py-12 ${t.card} rounded-lg border ${t.border}`}>
              <Package className={`mx-auto ${t.textMuted} mb-4`} size={48} />
              <p className={t.textMuted}>暂无软件</p>
            </div>
          ) : (
            <div className={`${t.card} rounded-lg shadow-sm overflow-hidden border ${t.border}`}>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {project.software
                  .filter(s => !selectedStatus || s.status === selectedStatus)
                  .map((soft) => (
                    <div key={soft.id} className={`flex items-center justify-between px-4 py-3 ${t.hoverBg} transition ${t.border}`}>
                      <div className="flex flex-col gap-1 flex-1">
                        <div className="flex items-center gap-2">
                          <Link to={`/software/${soft.id}`} className={`font-medium ${t.accentText} hover:underline`}>
                            {soft.name}
                          </Link>
                          <span className={`text-sm ${t.textMuted}`}>{soft.version}</span>
                          <button
                            onClick={() => {
                              setEditingVersionSoftware(soft);
                              setVersionInput(incrementVersion(soft.version));
                              setShowVersionModal(true);
                            }}
                            className={`p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${t.textMuted}`}
                            title="更新版本"
                          >
                            <Plus size={14} />
                          </button>
                          <span className={`px-2 py-1 rounded text-xs ${
                            soft.status === '已完成' ? t.success : t.badge
                          }`}>
                            {soft.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {soft.productionOrderNumber && <span className={`text-xs ${t.textMuted}`}>{soft.productionOrderNumber}</span>}
                          {soft.md5 && (
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(soft.md5 || '');
                                showToast('已复制到剪贴板', 'success');
                              }}
                              className={`flex items-center gap-1 text-xs ${t.textMuted} hover:${t.accentText}`}
                            >
                              <Copy size={12} />
                              MD5: {soft.md5.substring(0, 8)}...
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingSoftware(soft);
                            setSoftwareForm({
                              name: soft.name,
                              version: soft.version,
                              adaptedComponentIds: soft.adaptedComponentIds || [],
                            });
                            setShowSoftwareModal(true);
                          }}
                          className={`p-1.5 rounded border ${t.border} ${t.textMuted} hover:${t.hoverBg}`}
                          title="编辑"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleOpenSyncModal(soft)}
                          className={`p-1.5 rounded border ${t.border} ${t.textMuted} hover:${t.hoverBg}`}
                          title="同步到组件"
                        >
                          <RefreshCw size={14} />
                        </button>
                        <button
                          onClick={() => navigate(`/projects/${project.id}/files`)}
                          className={`p-1.5 rounded border ${t.border} ${t.textMuted} hover:${t.hoverBg}`}
                          title="下载"
                        >
                          <Download size={14} />
                        </button>
                        <label
                          className={`p-1.5 rounded border ${t.border} ${t.textMuted} hover:${t.hoverBg} cursor-pointer`}
                          title="上传"
                        >
                          <Upload size={14} />
                          <input
                            type="file"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const md5 = await calculateFileMD5Async(file);
                                updateProject(project.id, {
                                  software: project.software.map(s =>
                                    s.id === soft.id
                                      ? { ...s, md5, fileName: file.name, status: '已完成' as const }
                                      : s
                                  ),
                                });
                                showToast('文件已上传，MD5已计算', 'success');
                              }
                              e.target.value = '';
                            }}
                          />
                        </label>
                        {canEdit && (
                          <button
                            onClick={() => handleDeleteSoftware(soft.id)}
                            className={`p-1.5 rounded border ${t.border} ${t.textMuted} hover:${t.hoverBg}`}
                            title="删除"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'documents' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className={`text-lg font-semibold ${t.text}`}>文档列表</h2>
            <div className="flex gap-2">
              <div className="relative group">
                <label
                  className={`flex items-center gap-2 px-4 py-2 border ${t.border} ${t.textSecondary} rounded-lg cursor-pointer hover:${t.hoverBg} transition`}
                >
                  <FileUp size={18} />
                  Excel导入
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = async (event) => {
                        try {
                          const data = new Uint8Array(event.target?.result as ArrayBuffer);
                          const XLSX = await import('xlsx');
                          const workbook = XLSX.read(data, { type: 'array' });
                          const sheetName = workbook.SheetNames[0];
                          const worksheet = workbook.Sheets[sheetName];
                          const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, any>[];

                          const existingDocNames = new Set(project.documents.map(d => d.name));
                          let addedCount = 0;
                          let skippedCount = 0;

                          const newDocuments = jsonData
                            .map(row => {
                              const docName = row['文档名称'] || row['name'] || row['文档名'] || row['name'];
                              const docNumber = row['文档编号'] || row['number'] || row['编号'] || '';
                              const docType = row['类型'] || row['type'] || row['类型'] || '设计文档';
                              const docStage = row['阶段'] || row['stage'] || 'F阶段';

                              if (!docName) return null;

                              if (existingDocNames.has(docName)) {
                                skippedCount++;
                                return null;
                              }

                              return {
                                id: generateId(),
                                documentNumber: docNumber || `DOC-${Date.now()}-${addedCount}`,
                                name: docName,
                                type: docType,
                                stage: docStage as ProjectStage,
                                status: '未完成' as const,
                              };
                            })
                            .filter((doc): doc is NonNullable<typeof doc> => doc !== null) as DocType[];

                          addedCount = newDocuments.length;

                          if (newDocuments.length > 0) {
                            updateProject(project.id, {
                              documents: [...project.documents, ...newDocuments],
                            });
                          }

                          showToast(`导入完成：新增${addedCount}个文档，跳过${skippedCount}个已存在`, 'success');
                        } catch (error) {
                          showToast('Excel解析失败', 'error');
                        }
                      };
                      reader.readAsArrayBuffer(file);
                    }
                    e.target.value = '';
                  }}
                />
                </label>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-4 py-3 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 min-w-[400px]">
                  <div className="text-center mb-2 font-medium border-b border-gray-700 pb-2">Excel示例</div>
                  <table className="w-full border-collapse border border-gray-700">
                    <thead>
                      <tr className="bg-gray-800">
                        <th className="border border-gray-700 px-3 py-2 text-left">文档名称</th>
                        <th className="border border-gray-700 px-3 py-2 text-left">文档编号</th>
                        <th className="border border-gray-700 px-3 py-2 text-left">类型</th>
                        <th className="border border-gray-700 px-3 py-2 text-left">阶段</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-300">
                      <tr><td className="border border-gray-700 px-3 py-2">卫星测量数据</td><td className="border border-gray-700 px-3 py-2">DOC-001</td><td className="border border-gray-700 px-3 py-2">设计文档</td><td className="border border-gray-700 px-3 py-2">F阶段</td></tr>
                      <tr className="bg-gray-800/50"><td className="border border-gray-700 px-3 py-2">测试报告</td><td className="border border-gray-700 px-3 py-2">DOC-002</td><td className="border border-gray-700 px-3 py-2">测试文档</td><td className="border border-gray-700 px-3 py-2">C阶段</td></tr>
                    </tbody>
                  </table>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                </div>
              </div>
              <button
                onClick={() => {
                  setEditingDoc(null);
                  setDocForm({ documentNumber: '', name: '', type: '', stage: 'F阶段', version: 'A' });
                  setShowDocModal(true);
                }}
                className={`flex items-center gap-2 px-4 py-2 ${t.button} rounded-lg`}
              >
                <Plus size={18} />
                新建文档
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span className={`text-sm ${t.textSecondary}`}>阶段:</span>
              <select
                value={selectedDocStage}
                onChange={(e) => setSelectedDocStage(e.target.value)}
                className={`h-8 px-2 text-sm rounded border ${t.border} ${t.text} ${t.card}`}
              >
                <option value="">全部</option>
                <option value="F 阶段">F 阶段</option>
                <option value="C 阶段">C 阶段</option>
                <option value="S 阶段">S 阶段</option>
                <option value="D 阶段">D 阶段</option>
                <option value="P 阶段">P 阶段</option>
              </select>
            </div>
          </div>
          {project.documents.length === 0 ? (
            <div className={`text-center py-12 ${t.card} rounded-lg border ${t.border}`}>
              <FileText className={`mx-auto ${t.textMuted} mb-4`} size={48} />
              <p className={t.textMuted}>暂无文档</p>
            </div>
          ) : (
            <div className={`${t.card} rounded-lg shadow-sm overflow-hidden border ${t.border}`}>
              <table className="w-full">
                <thead className={t.tableHeader}>
                  <tr>
                    <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>文档编号</th>
                    <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>文档名称</th>
                    <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>类型</th>
                    <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>阶段</th>
                    <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>版本</th>
                    <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>状态</th>
                    <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {project.documents
                    .filter(doc => !selectedDocStage || doc.stage === selectedDocStage)
                    .filter((_, index) => {
                      const startIndex = (docPage - 1) * DOC_PAGE_SIZE;
                      const endIndex = startIndex + DOC_PAGE_SIZE;
                      return index >= startIndex && index < endIndex;
                    })
                    .map((doc) => (
                    <tr key={doc.id} className={`border-t ${t.border} ${t.hoverBg}`}>
                      <td className={`px-4 py-3 ${t.text}`}>{doc.documentNumber}</td>
                      <td className={`px-4 py-3 ${t.text}`}>{doc.name}</td>
                      <td className={`px-4 py-3 ${t.textSecondary}`}>{doc.type}</td>
                      <td className={`px-4 py-3 ${t.textSecondary}`}>{doc.stage}</td>
                      <td className={`px-4 py-3 ${t.textSecondary}`}>{doc.version || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          doc.status === '已完成' ? t.success : t.badge
                        }`}>
                          {doc.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingDoc(doc);
                              setDocForm({
                                documentNumber: doc.documentNumber,
                                name: doc.name,
                                type: doc.type,
                                stage: doc.stage,
                                version: (doc as any).version || '',
                              });
                              setShowDocModal(true);
                            }}
                            className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${t.textMuted}`}
                            title="编辑"
                          >
                            <Edit2 size={16} />
                          </button>
                          <label className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${t.textMuted} cursor-pointer`} title="上传Word">
                            <Upload size={16} />
                            <input
                              type="file"
                              accept=".doc,.docx"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = () => {
                                    if (doc.fileName) {
                                      const versionChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                                      const currentVersion = doc.version || 'A';
                                      const nextVersionIndex = versionChars.indexOf(currentVersion.toUpperCase());
                                      const nextVersion = nextVersionIndex >= 0 && nextVersionIndex < versionChars.length - 1
                                        ? versionChars[nextVersionIndex + 1]
                                        : currentVersion + '1';
                                      const newDoc: DocType = {
                                        id: generateId(),
                                        documentNumber: doc.documentNumber,
                                        name: doc.name,
                                        type: doc.type,
                                        stage: doc.stage,
                                        status: '已完成' as const,
                                        fileName: file.name,
                                        fileSize: file.size,
                                        uploadDate: new Date().toISOString(),
                                        version: nextVersion,
                                      };
                                      updateProject(project.id, {
                                        documents: [...project.documents, newDoc],
                                      });
                                      showToast(`文件 "${file.name}" 已上传，新版本: ${nextVersion}`, 'success');
                                    } else {
                                      updateProject(project.id, {
                                        documents: project.documents.map(d =>
                                          d.id === doc.id
                                            ? {
                                                ...d,
                                                fileName: file.name,
                                                fileSize: file.size,
                                                uploadDate: new Date().toISOString(),
                                                status: '已完成' as const,
                                              }
                                            : d
                                        ),
                                      });
                                      showToast(`文件 "${file.name}" 已上传`, 'success');
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }
                                e.target.value = '';
                              }}
                            />
                          </label>
                          <button
                            onClick={() => {
                              if (doc.fileUrl) {
                                const link = document.createElement('a');
                                link.href = doc.fileUrl;
                                link.download = doc.fileName || '文档';
                                link.click();
                              } else if (!doc.fileName) {
                                showToast('该文档暂无上传文件', 'warning');
                              } else {
                                showToast('该文档暂无上传文件', 'warning');
                              }
                            }}
                            className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${t.textMuted}`}
                            title="下载"
                          >
                            <Download size={16} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('确定要清空此文档的文件吗？')) {
                                updateProject(project.id, {
                                  documents: project.documents.map(d =>
                                    d.id === doc.id
                                      ? {
                                          ...d,
                                          fileName: undefined,
                                          fileSize: undefined,
                                          uploadDate: undefined,
                                          status: '未完成' as const,
                                        }
                                      : d
                                  ),
                                });
                                showToast('文档文件已清空', 'success');
                              }
                            }}
                            className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${t.textMuted}`}
                            title="清空"
                          >
                            <span className="text-base leading-none">×</span>
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('确定要删除此文档吗？')) {
                                deleteDocument(project.id, doc.id);
                                showToast('文档已删除', 'success');
                              }
                            }}
                            className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-red-500`}
                            title="删除"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'logs' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className={`text-lg font-semibold ${t.text}`}>项目日志</h2>
          </div>
          {project.logs.length === 0 ? (
            <div className={`text-center py-12 ${t.card} rounded-lg border ${t.border}`}>
              <FileText className={`mx-auto ${t.textMuted} mb-4`} size={48} />
              <p className={t.textMuted}>暂无日志</p>
            </div>
          ) : (
            <div className={`${t.card} rounded-lg shadow-sm overflow-hidden border ${t.border}`}>
              <table className="w-full">
                <thead className={t.tableHeader}>
                  <tr>
                    <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>时间</th>
                    <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>用户</th>
                    <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>操作</th>
                    <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>详情</th>
                  </tr>
                </thead>
                <tbody>
                  {project.logs.map((log) => (
                    <tr key={log.id} className={`border-t ${t.border} ${t.hoverBg}`}>
                      <td className={`px-4 py-3 ${t.textSecondary}`}>{log.timestamp}</td>
                      <td className={`px-4 py-3 ${t.text}`}>{log.username}</td>
                      <td className={`px-4 py-3 ${t.text}`}>{log.action}</td>
                      <td className={`px-4 py-3 ${t.textSecondary}`}>{log.details || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showModuleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModuleModal(false)}>
          <div className={`${t.modalBg} rounded-lg p-6 w-full max-w-md border ${t.modalBorder}`} onClick={(e) => e.stopPropagation()}>
            <h2 className={`text-xl font-semibold mb-4 ${t.text}`}>新建模块</h2>
            <form onSubmit={handleCreateModule} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}> 模块编号</label>
                <input
                  type="text"
                  value={moduleForm.moduleNumber}
                  onChange={(e) => setModuleForm({ ...moduleForm, moduleNumber: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                  required
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}> 模块名称</label>
                <input
                  type="text"
                  value={moduleForm.moduleName}
                  onChange={(e) => setModuleForm({ ...moduleForm, moduleName: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                  required
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}> 模块种类</label>
                <select
                  value={moduleForm.category}
                  onChange={(e) => setModuleForm({ ...moduleForm, category: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                  required
                >
                  <option value="">选择种类</option>
                  {project.categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}> 生产指令号</label>
                <input
                  type="text"
                  value={moduleForm.productionOrderNumber}
                  onChange={(e) => setModuleForm({ ...moduleForm, productionOrderNumber: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModuleModal(false)} className={`flex-1 py-2 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}>
                  取消
                </button>
                <button type="submit" className={`flex-1 py-2 ${t.button} rounded-lg`}>
                  创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModuleEditModal && editingModule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { setShowModuleEditModal(false); setEditingModule(null); }}>
          <div className={`${t.modalBg} rounded-lg p-6 w-full max-w-md border ${t.modalBorder} max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
            <h2 className={`text-xl font-semibold mb-4 ${t.text}`}>编辑模块</h2>
            <form onSubmit={handleUpdateModule} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>模块编号 *</label>
                <input
                  type="text"
                  value={moduleEditForm.moduleNumber}
                  onChange={(e) => setModuleEditForm({ ...moduleEditForm, moduleNumber: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                  placeholder="如: M-001"
                  required
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>模块名称 *</label>
                <input
                  type="text"
                  value={moduleEditForm.moduleName}
                  onChange={(e) => setModuleEditForm({ ...moduleEditForm, moduleName: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                  required
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>指令号</label>
                <input
                  type="text"
                  value={moduleEditForm.instructionNumber}
                  onChange={(e) => setModuleEditForm({ ...moduleEditForm, instructionNumber: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                  placeholder="如: INS-001"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>关联系统</label>
                <select
                  value={moduleEditForm.systemId}
                  onChange={(e) => {
                    const selectedSystem = project.systems.find(s => s.id === e.target.value);
                    setModuleEditForm({
                      ...moduleEditForm,
                      systemId: e.target.value,
                      systemNumber: selectedSystem?.systemNumber || '',
                      systemName: selectedSystem?.systemName || '',
                    });
                  }}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                >
                  <option value="">选择系统（可选）</option>
                  {project.systems.map((sys) => (
                    <option key={sys.id} value={sys.id}>
                      {sys.systemName} ({sys.systemNumber})
                    </option>
                  ))}
                </select>
              </div>
              {moduleEditForm.systemId && (
                <div className={`p-3 rounded-lg ${t.emptyBg}`}>
                  <div className="text-xs space-y-1">
                    <div className={`${t.textSecondary}`}>系统编号: <span className={t.text}>{moduleEditForm.systemNumber || '-'}</span></div>
                    <div className={`${t.textSecondary}`}>系统名称: <span className={t.text}>{moduleEditForm.systemName || '-'}</span></div>
                  </div>
                </div>
              )}
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>生产指令号</label>
                <input
                  type="text"
                  value={moduleEditForm.productionOrderNumber}
                  onChange={(e) => setModuleEditForm({ ...moduleEditForm, productionOrderNumber: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                  placeholder="如: PRD-001"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>负责人</label>
                <input
                  type="text"
                  value={moduleEditForm.holder}
                  onChange={(e) => setModuleEditForm({ ...moduleEditForm, holder: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>阶段</label>
                  <select
                    value={moduleEditForm.stage}
                    onChange={(e) => setModuleEditForm({ ...moduleEditForm, stage: e.target.value as ProjectStage })}
                    className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                  >
                    <option value="C阶段">C阶段</option>
                    <option value="S阶段">S阶段</option>
                    <option value="D阶段">D阶段</option>
                    <option value="P阶段">P阶段</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>状态</label>
                  <select
                    value={moduleEditForm.status}
                    onChange={(e) => setModuleEditForm({ ...moduleEditForm, status: e.target.value as any })}
                    className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                  >
                    <option value="未投产">未投产</option>
                    <option value="投产中">投产中</option>
                    <option value="正常">正常</option>
                    <option value="维修中">维修中</option>
                    <option value="三防中">三防中</option>
                    <option value="测试中">测试中</option>
                    <option value="仿真中">仿真中</option>
                    <option value="故障">故障</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setShowModuleEditModal(false); setEditingModule(null); }} className={`flex-1 py-2 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}>
                  取消
                </button>
                <button type="submit" className={`flex-1 py-2 ${t.button} rounded-lg`}>
                  保存修改
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSystemModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { setShowSystemModal(false); setEditingSystem(null); setSystemTemplate(null); setSystemForm({ systemNumber: '', systemName: '', instructionNumber: '', holder: '', status: '未投产', stage: 'C阶段', version: 'v1.0' }); }}>
          <div className={`${t.modalBg} rounded-lg p-6 w-full max-w-md border ${t.modalBorder} max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
            <h2 className={`text-xl font-semibold mb-4 ${t.text}`}>{editingSystem ? '编辑系统' : '新建系统'}</h2>
            {!editingSystem && project.systems.length > 0 && (
              <div className={`mb-4 p-3 rounded-lg border ${t.border} ${t.card}`}>
                <div className={`text-sm font-medium ${t.textSecondary} mb-2`}>参考已有系统 (最多显示同名的最早和最晚系统):</div>
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    const systemsByName: Record<string, typeof project.systems> = {};
                    project.systems.forEach(sys => {
                      if (!systemsByName[sys.systemName]) {
                        systemsByName[sys.systemName] = [];
                      }
                      systemsByName[sys.systemName].push(sys);
                    });
                    const displaySystems: typeof project.systems = [];
                    Object.entries(systemsByName).forEach(([, systems]) => {
                      if (systems.length === 1) {
                        displaySystems.push(systems[0]);
                      } else {
                        const sorted = [...systems].sort((a, b) =>
                          new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
                        );
                        displaySystems.push(sorted[0]);
                        displaySystems.push(sorted[sorted.length - 1]);
                      }
                    });
                    return displaySystems.map(sys => (
                      <button
                        key={sys.id}
                        type="button"
                        onClick={() => {
                          setSystemForm({
                            systemNumber: '',
                            systemName: sys.systemName,
                            instructionNumber: sys.instructionNumber,
                            holder: sys.holder || '',
                            status: '未投产',
                            stage: sys.stage,
                            version: sys.version || 'v1.0',
                          });
                          setSystemTemplate(sys);
                        }}
                        className={`px-3 py-1.5 text-xs rounded-lg border ${t.border} ${t.textSecondary} hover:${t.hoverBg} transition ${systemTemplate?.id === sys.id ? 'bg-blue-100 dark:bg-blue-900 border-blue-300' : ''}`}
                      >
                        {sys.systemName} ({sys.systemNumber})
                      </button>
                    ));
                  })()}
                </div>
              </div>
            )}
            <form onSubmit={handleCreateSystem} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>系统名称</label>
                <input
                  type="text"
                  value={systemForm.systemName}
                  onChange={(e) => setSystemForm({ ...systemForm, systemName: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                  required
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>系统编号</label>
                <input
                  type="text"
                  value={systemForm.systemNumber}
                  onChange={(e) => setSystemForm({ ...systemForm, systemNumber: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                  required
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>指令号</label>
                <input
                  type="text"
                  value={systemForm.instructionNumber}
                  onChange={(e) => setSystemForm({ ...systemForm, instructionNumber: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                  required
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>阶段</label>
                <select
                  value={systemForm.stage}
                  onChange={(e) => setSystemForm({ ...systemForm, stage: e.target.value as any })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                  required
                >
                  <option value="C阶段">C阶段</option>
                  <option value="S阶段">S阶段</option>
                  <option value="D阶段">D阶段</option>
                  <option value="P阶段">P阶段</option>
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>状态</label>
                <select
                  value={systemForm.status}
                  onChange={(e) => setSystemForm({ ...systemForm, status: e.target.value as any })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                  required
                >
                  <option value="未投产">未投产</option>
                  <option value="投产中">投产中</option>
                  <option value="正常">正常</option>
                  <option value="维修中">维修中</option>
                  <option value="三防中">三防中</option>
                  <option value="测试中">测试中</option>
                  <option value="仿真中">仿真中</option>
                  <option value="借用中">借用中</option>
                  <option value="故障">故障</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowSystemModal(false)} className={`flex-1 py-2 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}>
                  取消
                </button>
                <button type="submit" disabled={isCopyingSystem} className={`flex-1 py-2 ${t.button} rounded-lg ${isCopyingSystem ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  {isCopyingSystem ? '复制中...' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCategoryModal(false)}>
          <div className={`${t.modalBg} rounded-lg p-6 w-full max-w-md border ${t.modalBorder}`} onClick={(e) => e.stopPropagation()}>
            <h2 className={`text-xl font-semibold mb-4 ${t.text}`}>添加模块种类</h2>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>种类名称</label>
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                  placeholder="请输入种类名称"
                  autoFocus
                />
              </div>
              <div className={`text-sm ${t.textMuted}`}>
                当前种类: {project.categories.join(', ') || '暂无'}
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowCategoryModal(false)}
                className={`flex-1 py-2 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}
              >
                取消
              </button>
              <button
                onClick={handleAddCategory}
                className={`flex-1 py-2 ${t.button} rounded-lg`}
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}

      {showSoftwareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { setShowSoftwareModal(false); setEditingSoftware(null); setSoftwareForm({ name: '', version: '', adaptedComponentIds: [] }); }}>
          <div className={`${t.modalBg} rounded-lg p-6 w-full max-w-lg border ${t.modalBorder}`} onClick={(e) => e.stopPropagation()}>
            <h2 className={`text-xl font-semibold mb-4 ${t.text}`}>{editingSoftware ? '编辑软件' : '新建软件'}</h2>
            <form onSubmit={handleCreateSoftware} className="space-y-4">
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
              <div>
                <label className={`block text-sm font-medium mb-2 ${t.textSecondary}`}>适配组件（可多选）</label>
                <div className={`max-h-48 overflow-y-auto border rounded-lg p-3 ${t.border}`}>
                  {project.modules.flatMap(m => m.components).length === 0 ? (
                    <p className={`text-sm ${t.textMuted}`}>暂无可选组件</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {project.modules.map(module => (
                        <div key={module.id}>
                          <div className={`text-xs font-medium ${t.textSecondary} mb-1`}>{module.moduleName}</div>
                          {module.components.map(comp => (
                            <label key={comp.id} className="flex items-center gap-2 py-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={softwareForm.adaptedComponentIds.includes(comp.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSoftwareForm({
                                      ...softwareForm,
                                      adaptedComponentIds: [...softwareForm.adaptedComponentIds, comp.id],
                                    });
                                  } else {
                                    setSoftwareForm({
                                      ...softwareForm,
                                      adaptedComponentIds: softwareForm.adaptedComponentIds.filter(id => id !== comp.id),
                                    });
                                  }
                                }}
                                className="rounded"
                              />
                              <span className={`text-sm ${t.text}`}>{comp.componentName}</span>
                            </label>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowSoftwareModal(false)}
                  className={`flex-1 py-2 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-2 ${t.button} rounded-lg`}
                >
                  创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showVersionModal && editingVersionSoftware && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { setShowVersionModal(false); setEditingVersionSoftware(null); setVersionInput(''); }}>
          <div className={`${t.modalBg} rounded-lg p-6 w-full max-w-md border ${t.modalBorder}`} onClick={(e) => e.stopPropagation()}>
            <h2 className={`text-xl font-semibold mb-4 ${t.text}`}>更新软件版本</h2>
            <div className="space-y-4">
              <div>
                <div className={`text-sm ${t.textSecondary} mb-1`}>当前版本</div>
                <div className={`text-lg font-medium ${t.text}`}>{editingVersionSoftware.version}</div>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>新版本号</label>
                <input
                  type="text"
                  value={versionInput}
                  onChange={(e) => setVersionInput(e.target.value)}
                  placeholder="如: 1.0.1"
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                  pattern="^\d+\.\d+\.\d+$"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setVersionInput(incrementVersion(editingVersionSoftware.version))}
                  className={`px-3 py-2 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg} text-sm flex items-center gap-1`}
                >
                  <Plus size={14} /> 自动+1
                </button>
              </div>
              <div className={`text-xs ${t.textMuted}`}>
                格式说明：主版本号.次版本号.修订号（如 1.0.1）
              </div>
            </div>
            <div className="flex gap-3 pt-4 mt-4 border-t ${t.border}">
              <button
                type="button"
                onClick={() => { setShowVersionModal(false); setEditingVersionSoftware(null); setVersionInput(''); }}
                className={`flex-1 py-2 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!versionInput.match(/^\d+\.\d+\.\d+$/)) {
                    showToast('请输入正确格式的版本号（如：1.0.1）', 'error');
                    return;
                  }
                  updateProject(project.id, {
                    software: project.software.map(s =>
                      s.id === editingVersionSoftware.id
                        ? { ...s, version: versionInput }
                        : s
                    ),
                  });
                  showToast(`版本已更新为 ${versionInput}`, 'success');
                  setShowVersionModal(false);
                  setEditingVersionSoftware(null);
                  setVersionInput('');
                }}
                className={`flex-1 py-2 ${t.button} rounded-lg`}
              >
                确认更新
              </button>
            </div>
          </div>
        </div>
      )}

      {showRollbackModal && rollbackSnapshot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { setShowRollbackModal(false); setRollbackSnapshot(null); setRollbackConfirmText(''); }}>
          <div className={`${t.modalBg} rounded-lg p-6 w-full max-w-md border ${t.modalBorder}`} onClick={(e) => e.stopPropagation()}>
            <h2 className={`text-xl font-semibold mb-4 ${t.text}`}>数据回滚</h2>
            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${t.emptyBg}`}>
                <div className="flex items-center gap-2 mb-2">
                  <RotateCcw size={18} className="text-amber-500" />
                  <span className={`font-medium ${t.text}`}>回滚快照信息</span>
                </div>
                <div className="text-sm space-y-1">
                  <div className={`${t.textSecondary}`}>版本: <span className={t.text}>{rollbackSnapshot.version}</span></div>
                  <div className={`${t.textSecondary}`}>时间: <span className={t.text}>{new Date(rollbackSnapshot.timestamp).toLocaleString()}</span></div>
                  <div className={`${t.textSecondary}`}>项目数: <span className={t.text}>{rollbackSnapshot.metadata.projectCount || 0}</span></div>
                  <div className={`${t.textSecondary}`}>文档数: <span className={t.text}>{rollbackSnapshot.metadata.documentCount || 0}</span></div>
                  <div className={`${t.textSecondary}`}>用户数: <span className={t.text}>{rollbackSnapshot.metadata.userCount || 0}</span></div>
                </div>
              </div>
              <div className={`p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 text-sm`}>
                ⚠️ 回滚将清除当前所有数据并恢复到上述快照状态，当前未保存的更改将丢失！
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>请输入 "确认回滚" 以继续</label>
                <input
                  type="text"
                  value={rollbackConfirmText}
                  onChange={(e) => setRollbackConfirmText(e.target.value)}
                  placeholder="确认回滚"
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                />
              </div>
            </div>
            <div className="flex gap-3 pt-4 mt-4 border-t ${t.border}">
              <button
                onClick={() => { setShowRollbackModal(false); setRollbackSnapshot(null); setRollbackConfirmText(''); }}
                className={`flex-1 py-2 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}
              >
                取消
              </button>
              <button
                onClick={async () => {
                  if (rollbackConfirmText !== '确认回滚') {
                    showToast('请输入确认文字', 'error');
                    return;
                  }
                  const result = rollbackData();
                  if (result.success) {
                    showToast(result.message, 'success');
                    window.location.reload();
                  } else {
                    showToast(result.message, 'error');
                  }
                  setShowRollbackModal(false);
                  setRollbackSnapshot(null);
                  setRollbackConfirmText('');
                }}
                disabled={rollbackConfirmText !== '确认回滚'}
                className={`flex-1 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                确认回滚
              </button>
            </div>
          </div>
        </div>
      )}

      {showComponentEditModal && editingComponent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { setShowComponentEditModal(false); setEditingComponent(null); }}>
          <div className={`${t.modalBg} rounded-lg p-6 w-full max-w-md border ${t.modalBorder}`} onClick={(e) => e.stopPropagation()}>
            <h2 className={`text-xl font-semibold mb-4 ${t.text}`}>编辑组件</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              const oldModuleId = editingComponent.moduleId;
              const newModuleId = componentEditForm.moduleId;

              if (oldModuleId !== newModuleId) {
                const oldModule = project.modules.find(m => m.id === oldModuleId);
                const newModule = project.modules.find(m => m.id === newModuleId);
                const component = oldModule?.components.find(c => c.id === editingComponent.id);

                if (component && oldModule && newModule) {
                  const updatedComponent = {
                    ...component,
                    componentName: componentEditForm.componentName,
                    componentNumber: componentEditForm.componentNumber,
                    productionOrderNumber: componentEditForm.productionOrderNumber || component.productionOrderNumber,
                    stage: componentEditForm.stage || component.stage,
                    version: componentEditForm.version || component.version,
                  };

                  const calculateModuleStatus = (components: any[]) => {
                    if (components.length === 0) return '未投产';
                    if (components.every(c => c.status === '正常')) return '正常';
                    if (components.some(c => c.status === '故障')) return '故障';
                    if (components.some(c => c.status === '维修中')) return '维修中';
                    if (components.some(c => c.status === '三防中')) return '三防中';
                    if (components.some(c => c.status === '测试中')) return '测试中';
                    if (components.some(c => c.status === '仿真中')) return '仿真中';
                    if (components.some(c => c.status === '借用中')) return '借用中';
                    if (components.every(c => c.status === '未投产')) return '未投产';
                    if (components.some(c => c.status === '投产中')) return '投产中';
                    return '未投产';
                  };

                  updateProject(project.id, {
                    modules: project.modules.map(m => {
                      if (m.id === oldModuleId) {
                        const remainingComponents = m.components.filter(c => c.id !== editingComponent.id);
                        return { ...m, components: remainingComponents, status: calculateModuleStatus(remainingComponents) };
                      }
                      if (m.id === newModuleId) {
                        const newComponents = [...m.components, updatedComponent];
                        return { ...m, components: newComponents, status: calculateModuleStatus(newComponents) };
                      }
                      return m;
                    }),
                  });
                }
              } else {
                project.modules.forEach(m => {
                  const comp = m.components.find(c => c.id === editingComponent.id);
                  if (comp) {
                    updateComponent(project.id, m.id, editingComponent.id, {
                      componentName: componentEditForm.componentName,
                      componentNumber: componentEditForm.componentNumber,
                      productionOrderNumber: componentEditForm.productionOrderNumber || undefined,
                      stage: componentEditForm.stage || undefined,
                      version: componentEditForm.version || undefined,
                    });
                  }
                });
              }

              showToast('组件已更新', 'success');
              setShowComponentEditModal(false);
              setEditingComponent(null);
            }} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>组件名称</label>
                <input
                  type="text"
                  value={componentEditForm.componentName}
                  onChange={(e) => setComponentEditForm({ ...componentEditForm, componentName: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                  required
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>组件编号</label>
                <input
                  type="text"
                  value={componentEditForm.componentNumber}
                  onChange={(e) => setComponentEditForm({ ...componentEditForm, componentNumber: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                  required
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>生产指令号</label>
                <input
                  type="text"
                  value={componentEditForm.productionOrderNumber}
                  onChange={(e) => setComponentEditForm({ ...componentEditForm, productionOrderNumber: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>阶段</label>
                  <select
                    value={componentEditForm.stage}
                    onChange={(e) => setComponentEditForm({ ...componentEditForm, stage: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                  >
                    <option value="">请选择</option>
                    <option value="F阶段">F阶段</option>
                    <option value="C阶段">C阶段</option>
                    <option value="S阶段">S阶段</option>
                    <option value="D阶段">D阶段</option>
                    <option value="P阶段">P阶段</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>版本</label>
                  <input
                    type="text"
                    value={componentEditForm.version}
                    onChange={(e) => setComponentEditForm({ ...componentEditForm, version: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                    placeholder="如 v1.0"
                  />
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>所属模块</label>
                <select
                  value={componentEditForm.moduleId}
                  onChange={(e) => setComponentEditForm({ ...componentEditForm, moduleId: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                >
                  {project.modules.map(m => (
                    <option key={m.id} value={m.id}>{m.moduleNumber} - {m.moduleName}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowComponentEditModal(false); setEditingComponent(null); }}
                  className={`flex-1 py-2 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-2 ${t.button} rounded-lg`}
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showComponentStatusModal && editingComponent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { setShowComponentStatusModal(false); setEditingComponent(null); setComponentStatusForm({ status: '', reason: '' }); }}>
          <div className={`${t.modalBg} rounded-lg p-6 w-full max-w-md border ${t.modalBorder}`} onClick={(e) => e.stopPropagation()}>
            <h2 className={`text-xl font-semibold mb-4 ${t.text}`}>更改组件状态</h2>
            <div className={`p-4 rounded-lg mb-4 ${t.emptyBg}`}>
              <div className={`text-sm ${t.textSecondary} mb-1`}>组件名称：{editingComponent.componentName}</div>
              <div className={`text-sm ${t.textSecondary} mb-1`}>组件编号：{editingComponent.componentNumber}</div>
              <div className={`text-sm ${t.textSecondary}`}>当前状态：<span className="font-medium">{componentStatusForm.status}</span></div>
            </div>
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${t.textSecondary}`}>选择新状态</label>
              <div className="grid grid-cols-3 gap-2">
                {['未投产', '投产中', '正常', '维修中', '三防中', '测试中', '仿真中', '借用中', '故障'].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setComponentStatusForm({ ...componentStatusForm, status })}
                    className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                      componentStatusForm.status === status
                        ? `${t.button} text-white`
                        : `${t.border} ${t.textSecondary} hover:${t.hoverBg}`
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${t.textSecondary}`}>变更原因（必填）</label>
              <textarea
                value={componentStatusForm.reason}
                onChange={(e) => setComponentStatusForm({ ...componentStatusForm, reason: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                rows={3}
                placeholder="请输入状态变更原因..."
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setShowComponentStatusModal(false); setEditingComponent(null); setComponentStatusForm({ status: '', reason: '' }); }}
                className={`flex-1 py-2 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!componentStatusForm.reason.trim()) {
                    showToast('请输入状态变更原因', 'error');
                    return;
                  }
                  const comp = editingComponent;
                  const moduleId = comp.moduleId;
                  updateComponent(project.id, moduleId, comp.id, {
                    status: componentStatusForm.status as any,
                    logs: [...(comp.logs || []), {
                      id: generateId(),
                      action: `状态变更：${comp.status} → ${componentStatusForm.status}`,
                      timestamp: new Date().toISOString(),
                      userId: currentUser?.id || '',
                      username: currentUser?.username || '',
                      details: componentStatusForm.reason
                    }],
                    statusChanges: [
                      ...(comp.statusChanges || []),
                      {
                        id: generateId(),
                        fromStatus: comp.status,
                        toStatus: componentStatusForm.status,
                        changedAt: new Date().toISOString(),
                        changedBy: currentUser?.username || '',
                        reason: componentStatusForm.reason
                      }
                    ]
                  });

                  const calculateModuleStatus = (components: any[]) => {
                    if (components.length === 0) return '未投产';
                    if (components.every(c => c.status === '正常')) return '正常';
                    if (components.some(c => c.status === '故障')) return '故障';
                    if (components.some(c => c.status === '维修中')) return '维修中';
                    if (components.some(c => c.status === '三防中')) return '三防中';
                    if (components.some(c => c.status === '测试中')) return '测试中';
                    if (components.some(c => c.status === '仿真中')) return '仿真中';
                    if (components.some(c => c.status === '借用中')) return '借用中';
                    if (components.every(c => c.status === '未投产')) return '未投产';
                    if (components.some(c => c.status === '投产中')) return '投产中';
                    return '未投产';
                  };

                  const calculateSystemStatus = (modules: any[]) => {
                    if (modules.length === 0) return '未投产';
                    if (modules.every(m => m.status === '正常')) return '正常';
                    if (modules.some(m => m.status === '故障')) return '故障';
                    if (modules.some(m => m.status === '维修中')) return '维修中';
                    if (modules.some(m => m.status === '三防中')) return '三防中';
                    if (modules.some(m => m.status === '测试中')) return '测试中';
                    if (modules.some(m => m.status === '仿真中')) return '仿真中';
                    if (modules.some(m => m.status === '借用中')) return '借用中';
                    if (modules.some(m => m.status === '投产中')) return '投产中';
                    if (modules.every(m => m.status === '未投产')) return '未投产';
                    return '未投产';
                  };

                  const targetModule = project.modules.find(m => m.id === moduleId);
                  if (targetModule) {
                    const updatedComponents = targetModule.components.map(c =>
                      c.id === comp.id ? { ...c, status: componentStatusForm.status as any } : c
                    );
                    const newModuleStatus = calculateModuleStatus(updatedComponents);
                    const targetSystemId = targetModule.systemId;

                    updateProject(project.id, {
                      modules: project.modules.map(m => {
                        if (m.id === moduleId) {
                          return { ...m, status: newModuleStatus, components: updatedComponents };
                        }
                        return m;
                      }),
                      systems: targetSystemId ? project.systems.map(s => {
                        if (s.id === targetSystemId) {
                          const systemModules = project.modules.map(m =>
                            m.id === moduleId ? { ...m, status: newModuleStatus } : m
                          ).filter(m => m.systemId === targetSystemId);
                          const newSystemStatus = calculateSystemStatus(systemModules);
                          return { ...s, status: newSystemStatus };
                        }
                        return s;
                      }) : project.systems
                    });
                  }

                  showToast('组件状态已更新', 'success');
                  setShowComponentStatusModal(false);
                  setEditingComponent(null);
                  setComponentStatusForm({ status: '', reason: '' });
                }}
                className={`flex-1 py-2 ${t.button} rounded-lg`}
              >
                确认更改
              </button>
            </div>
          </div>
        </div>
      )}

      {showComponentCopyModal && copyingComponent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { setShowComponentCopyModal(false); setCopyingComponent(null); }}>
          <div className={`${t.modalBg} rounded-lg p-6 w-full max-w-md border ${t.modalBorder}`} onClick={(e) => e.stopPropagation()}>
            <h2 className={`text-xl font-semibold mb-4 ${t.text}`}>复制组件</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              const targetModule = project.modules.find(m => m.id === componentCopyForm.moduleId);
              if (!targetModule) return;

              addComponent(project.id, componentCopyForm.moduleId, {
                moduleId: componentCopyForm.moduleId,
                componentNumber: componentCopyForm.componentNumber,
                componentName: copyingComponent.componentName,
                status: '未投产',
                productionOrderNumber: copyingComponent.productionOrderNumber,
                holder: copyingComponent.holder,
                stage: copyingComponent.stage,
                version: copyingComponent.version,
                certificates: { pcb: undefined, assembly: undefined, coating: undefined },
                logs: [{
                  id: generateId(),
                  action: '组件复制',
                  timestamp: new Date().toISOString(),
                  userId: currentUser?.id || '',
                  username: currentUser?.username || '',
                  details: `从组件 ${copyingComponent.componentNumber} (${targetModule.moduleName}) 复制`
                }]
              });
              showToast('组件复制成功', 'success');
              setShowComponentCopyModal(false);
              setCopyingComponent(null);
            }} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>组件名称</label>
                <input
                  type="text"
                  value={copyingComponent.componentName}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input} opacity-60`}
                  disabled
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>目标模块</label>
                <select
                  value={componentCopyForm.moduleId}
                  onChange={(e) => setComponentCopyForm({ ...componentCopyForm, moduleId: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                  required
                >
                  {project.modules.map(m => (
                    <option key={m.id} value={m.id}>{m.moduleNumber} - {m.moduleName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>新组件编号</label>
                <input
                  type="text"
                  value={componentCopyForm.componentNumber}
                  onChange={(e) => setComponentCopyForm({ ...componentCopyForm, componentNumber: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowComponentCopyModal(false); setCopyingComponent(null); }}
                  className={`flex-1 py-2 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-2 ${t.button} rounded-lg`}
                >
                  复制
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDocModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { setShowDocModal(false); setEditingDoc(null); setDocForm({ documentNumber: '', name: '', type: '', stage: 'F阶段', version: 'A' }); }}>
          <div className={`${t.modalBg} rounded-lg p-6 w-full max-w-md border ${t.modalBorder}`} onClick={(e) => e.stopPropagation()}>
            <h2 className={`text-xl font-semibold mb-4 ${t.text}`}>{editingDoc ? '编辑文档' : '新建文档'}</h2>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>文档编号</label>
                <input
                  type="text"
                  value={docForm.documentNumber}
                  onChange={(e) => setDocForm({ ...docForm, documentNumber: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                  required
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>文档名称</label>
                <input
                  type="text"
                  value={docForm.name}
                  onChange={(e) => setDocForm({ ...docForm, name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                  required
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>类型</label>
                <input
                  type="text"
                  value={docForm.type}
                  onChange={(e) => setDocForm({ ...docForm, type: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                  required
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>阶段</label>
                <select
                  value={docForm.stage}
                  onChange={(e) => setDocForm({ ...docForm, stage: e.target.value as ProjectStage })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                >
                  <option value="F阶段">F阶段</option>
                  <option value="C阶段">C阶段</option>
                  <option value="S阶段">S阶段</option>
                  <option value="D阶段">D阶段</option>
                  <option value="P阶段">P阶段</option>
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>版本</label>
                <input
                  type="text"
                  value={docForm.version}
                  onChange={(e) => setDocForm({ ...docForm, version: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                  placeholder="如: v1.0"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-4 mt-4">
              <button
                onClick={() => { setShowDocModal(false); setEditingDoc(null); setDocForm({ documentNumber: '', name: '', type: '', stage: 'F阶段', version: 'A' }); }}
                className={`flex-1 py-2 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}
              >
                取消
              </button>
              <button
                onClick={handleUpdateDocument}
                className={`flex-1 py-2 ${t.button} rounded-lg`}
              >
                {editingDoc ? '保存' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSyncModal && syncTargetSoftware && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowSyncModal(false)}>
          <div className={`${t.modalBg} rounded-lg p-6 w-full max-w-lg border ${t.modalBorder}`} onClick={(e) => e.stopPropagation()}>
            <h2 className={`text-xl font-semibold mb-4 ${t.text}`}>同步软件到组件</h2>
            <div className={`mb-4 p-3 rounded-lg ${t.card} border ${t.border}`}>
              <div className={`font-medium ${t.text}`}>{syncTargetSoftware.name}</div>
              <div className={`text-sm ${t.textSecondary}`}>版本: {syncTargetSoftware.version}</div>
            </div>
            <div className={`mb-4 ${t.textSecondary} text-sm`}>选择要同步的组件:</div>
            <div className={`max-h-60 overflow-y-auto border rounded-lg p-3 ${t.border} mb-4`}>
              {!syncTargetSoftware.adaptedComponentIds || syncTargetSoftware.adaptedComponentIds.length === 0 ? (
                <p className={`text-sm ${t.textMuted}`}>该软件暂无适配组件，请先编辑软件添加适配组件</p>
              ) : (
                <div className="space-y-3">
                  {project.modules.map(module => {
                    const adaptedComps = module.components.filter((comp: any) => syncTargetSoftware.adaptedComponentIds.includes(comp.id));
                    if (adaptedComps.length === 0) return null;
                    return (
                      <div key={module.id}>
                        <div className={`text-xs font-medium ${t.textSecondary} mb-1`}>{module.moduleName}</div>
                        {adaptedComps.map((comp: any) => (
                          <label key={comp.id} className="flex items-center gap-2 py-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={syncComponentIds.includes(comp.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSyncComponentIds([...syncComponentIds, comp.id]);
                                } else {
                                  setSyncComponentIds(syncComponentIds.filter(id => id !== comp.id));
                                }
                              }}
                              className="rounded"
                            />
                            <span className={`text-sm ${t.text}`}>{comp.componentName}</span>
                            <span className={`text-xs ${t.textMuted}`}>({comp.componentNumber})</span>
                          </label>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowSyncModal(false)}
                className={`flex-1 py-2 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSyncSoftwareToComponents}
                disabled={syncComponentIds.length === 0}
                className={`flex-1 py-2 ${t.button} rounded-lg ${syncComponentIds.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                同步 ({syncComponentIds.length})
              </button>
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
            className={`${t.modalBg} rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border ${t.modalBorder}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-xl font-semibold ${t.text}`}>
                {diagramType === 'module' && '模块装配图'}
                {diagramType === 'component' && '组件装配图'}
                {diagramType === 'table' && '组件配套表'}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={handleCopyDiagram}
                  className={`flex items-center gap-2 px-3 py-1.5 ${t.button} rounded-lg text-sm`}
                >
                  <Copy size={14} />
                  复制
                </button>
                <button
                  onClick={() => setShowDiagramModal(false)}
                  className={`p-1.5 ${t.textMuted} hover:${t.text}`}
                >
                  ×
                </button>
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => handleGenerateDiagram('module')}
                className={`px-3 py-1.5 rounded-lg text-sm ${
                  diagramType === 'module' ? 'bg-blue-600 text-white' : `${t.button}`
                }`}
              >
                模块装配图
              </button>
              <button
                onClick={() => handleGenerateDiagram('component')}
                className={`px-3 py-1.5 rounded-lg text-sm ${
                  diagramType === 'component' ? 'bg-green-600 text-white' : `${t.button}`
                }`}
              >
                组件装配图
              </button>
              <button
                onClick={() => handleGenerateDiagram('table')}
                className={`px-3 py-1.5 rounded-lg text-sm ${
                  diagramType === 'table' ? 'bg-purple-600 text-white' : `${t.button}`
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
                {diagramResult && diagramResult[0] && (
                  <>{diagramResult[0].title} - {diagramResult[0].format}</>
                )}
              </span>
              <span>生成时间: {diagramResult && diagramResult[0] ? new Date(diagramResult[0].generatedAt).toLocaleString() : new Date().toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {showDesignModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => { setShowDesignModal(false); setEditingDesignFile(null); }}
        >
          <div
            className={`${t.modalBg} rounded-lg p-6 w-full max-w-md border ${t.modalBorder}`}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className={`text-xl font-semibold mb-4 ${t.text}`}>
              {editingDesignFile ? '编辑设计文件' : '新建设计文件'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>文件名称</label>
                <input
                  type="text"
                  value={designForm.name}
                  onChange={(e) => setDesignForm({ ...designForm, name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                  placeholder="请输入文件名称"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>类型</label>
                <select
                  value={designForm.type}
                  onChange={(e) => setDesignForm({ ...designForm, type: e.target.value as '装配图' | '配套表' })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                >
                  <option value="装配图">装配图</option>
                  <option value="配套表">配套表</option>
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>格式</label>
                <select
                  value={designForm.format}
                  onChange={(e) => setDesignForm({ ...designForm, format: e.target.value as 'AutoCAD' | 'Excel' | 'PDF' })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                >
                  <option value="AutoCAD">AutoCAD</option>
                  <option value="Excel">Excel</option>
                  <option value="PDF">PDF</option>
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>阶段</label>
                <select
                  value={designForm.stage}
                  onChange={(e) => setDesignForm({ ...designForm, stage: e.target.value as ProjectStage })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                >
                  <option value="F阶段">F阶段</option>
                  <option value="C阶段">C阶段</option>
                  <option value="S阶段">S阶段</option>
                  <option value="D阶段">D阶段</option>
                  <option value="P阶段">P阶段</option>
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>版本</label>
                <select
                  value={designForm.version}
                  onChange={(e) => setDesignForm({ ...designForm, version: e.target.value as ProjectVersion })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                >
                  <option value="A版">A版</option>
                  <option value="B版">B版</option>
                  <option value="C版">C版</option>
                  <option value="D版">D版</option>
                  <option value="E版">E版</option>
                  <option value="F版">F版</option>
                  <option value="G版">G版</option>
                  <option value="H版">H版</option>
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${t.textSecondary}`}>适配模块</label>
                <div className={`border rounded-lg p-3 max-h-32 overflow-y-auto ${t.border}`}>
                  {project.modules.length === 0 ? (
                    <p className={`text-sm ${t.textMuted}`}>暂无模块</p>
                  ) : (
                    project.modules.map((module: any) => (
                      <label key={module.id} className="flex items-center gap-2 py-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={designForm.adaptedModuleIds.includes(module.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setDesignForm({ ...designForm, adaptedModuleIds: [...designForm.adaptedModuleIds, module.id] });
                            } else {
                              setDesignForm({ ...designForm, adaptedModuleIds: designForm.adaptedModuleIds.filter(id => id !== module.id) });
                            }
                          }}
                          className="rounded"
                        />
                        <span className={t.text}>{module.moduleName}</span>
                        <span className={`text-xs ${t.textMuted}`}>({module.moduleNumber})</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${t.textSecondary}`}>适配组件</label>
                <div className={`border rounded-lg p-3 max-h-32 overflow-y-auto ${t.border}`}>
                  {project.modules.flatMap((m: any) => m.components).length === 0 ? (
                    <p className={`text-sm ${t.textMuted}`}>暂无组件</p>
                  ) : (
                    project.modules.flatMap((m: any) => m.components).map((comp: any) => (
                      <label key={comp.id} className="flex items-center gap-2 py-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={designForm.adaptedComponentIds.includes(comp.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setDesignForm({ ...designForm, adaptedComponentIds: [...designForm.adaptedComponentIds, comp.id] });
                            } else {
                              setDesignForm({ ...designForm, adaptedComponentIds: designForm.adaptedComponentIds.filter(id => id !== comp.id) });
                            }
                          }}
                          className="rounded"
                        />
                        <span className={t.text}>{comp.componentName}</span>
                        <span className={`text-xs ${t.textMuted}`}>({comp.componentNumber})</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => { setShowDesignModal(false); setEditingDesignFile(null); }}
                className={`flex-1 py-2 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}
              >
                取消
              </button>
              <button
                onClick={() => {
                  if (!designForm.name.trim()) {
                    showToast('请输入文件名称', 'error');
                    return;
                  }
                  if (editingDesignFile) {
                    updateProject(project.id, {
                      designFiles: project.designFiles.map((df) =>
                        df.id === editingDesignFile.id
                          ? { ...df, ...designForm }
                          : df
                      ),
                    });
                    showToast('设计文件已更新', 'success');
                  } else {
                    addDesignFile(project.id, {
                      ...designForm,
                      isAutoGenerated: false,
                      uploadDate: new Date().toLocaleString(),
                    });
                    showToast('设计文件已创建', 'success');
                  }
                  setShowDesignModal(false);
                  setEditingDesignFile(null);
                  setDesignForm({ name: '', type: '装配图', format: 'AutoCAD', stage: project.stage, version: project.version as ProjectVersion, adaptedModuleIds: [], adaptedComponentIds: [] });
                }}
                className={`flex-1 py-2 ${t.button} rounded-lg`}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {showDesignSyncModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => { setShowDesignSyncModal(false); setSyncTargetDesignFile(null); }}
        >
          <div
            className={`${t.modalBg} rounded-lg p-6 w-full max-w-md border ${t.modalBorder}`}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className={`text-xl font-semibold mb-4 ${t.text}`}>同步设计文件</h2>
            {syncTargetDesignFile && (
              <div className="mb-4">
                <p className={`text-sm ${t.textSecondary}`}>将同步文件：</p>
                <p className={`font-medium ${t.text}`}>{syncTargetDesignFile.name}</p>
                <p className={`text-xs ${t.textMuted} mt-1`}>
                  已选 {syncDesignModuleIds.length} 个目标
                </p>
              </div>
            )}
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${t.textSecondary}`}>选择适配模块</label>
              <div className={`border rounded-lg p-3 max-h-32 overflow-y-auto ${t.border}`}>
                {project.modules.filter((m: any) => syncTargetDesignFile?.adaptedModuleIds?.includes(m.id)).length === 0 ? (
                  <p className={`text-sm ${t.textMuted}`}>无适配模块</p>
                ) : (
                  project.modules
                    .filter((m: any) => syncTargetDesignFile?.adaptedModuleIds?.includes(m.id))
                    .map((module: any) => (
                      <label key={module.id} className="flex items-center gap-2 py-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={syncDesignModuleIds.includes(module.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSyncDesignModuleIds([...syncDesignModuleIds, module.id]);
                            } else {
                              setSyncDesignModuleIds(syncDesignModuleIds.filter(id => id !== module.id));
                            }
                          }}
                          className="rounded"
                        />
                        <span className={t.text}>{module.moduleName}</span>
                        <span className={`text-xs ${t.textMuted}`}>({module.moduleNumber})</span>
                      </label>
                    ))
                )}
              </div>
            </div>
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${t.textSecondary}`}>选择适配组件</label>
              <div className={`border rounded-lg p-3 max-h-32 overflow-y-auto ${t.border}`}>
                {project.modules.flatMap((m: any) => m.components).filter((c: any) => syncTargetDesignFile?.adaptedComponentIds?.includes(c.id)).length === 0 ? (
                  <p className={`text-sm ${t.textMuted}`}>无适配组件</p>
                ) : (
                  project.modules.flatMap((m: any) => m.components)
                    .filter((c: any) => syncTargetDesignFile?.adaptedComponentIds?.includes(c.id))
                    .map((comp: any) => (
                      <label key={comp.id} className="flex items-center gap-2 py-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={syncDesignModuleIds.includes(comp.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSyncDesignModuleIds([...syncDesignModuleIds, comp.id]);
                            } else {
                              setSyncDesignModuleIds(syncDesignModuleIds.filter(id => id !== comp.id));
                            }
                          }}
                          className="rounded"
                        />
                        <span className={t.text}>{comp.componentName}</span>
                        <span className={`text-xs ${t.textMuted}`}>({comp.componentNumber})</span>
                      </label>
                    ))
                )}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setShowDesignSyncModal(false); setSyncTargetDesignFile(null); }}
                className={`flex-1 py-2 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}
              >
                取消
              </button>
              <button
                onClick={handleSyncDesignFileToModules}
                disabled={syncDesignModuleIds.length === 0}
                className={`flex-1 py-2 rounded-lg ${
                  syncDesignModuleIds.length === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : t.button
                }`}
              >
                同步 ({syncDesignModuleIds.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新建评审模态框 */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowReviewModal(false)}>
          <div className={`${t.modalBg} rounded-lg p-6 w-full max-w-md border ${t.modalBorder}`} onClick={(e) => e.stopPropagation()}>
            <h2 className={`text-xl font-semibold mb-4 ${t.text}`}>新建评审</h2>
            <form onSubmit={handleCreateReview} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>评审标题 *</label>
                <input
                  type="text"
                  value={reviewForm.title}
                  onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                  placeholder="请输入评审标题"
                  required
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>评审内容 *</label>
                <textarea
                  value={reviewForm.content}
                  onChange={(e) => setReviewForm({ ...reviewForm, content: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                  placeholder="请输入评审内容"
                  rows={4}
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className={`flex-1 py-2 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-2 ${t.button} rounded-lg text-white`}
                >
                  创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 确认删除模态框 */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]" onClick={() => setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} })}>
          <div className={`${t.modalBg} rounded-lg p-6 w-full max-w-sm border ${t.modalBorder}`} onClick={(e) => e.stopPropagation()}>
            <h2 className={`text-xl font-semibold mb-4 ${t.text}`}>{confirmModal.title}</h2>
            <p className={`text-sm ${t.textSecondary} mb-6`}>{confirmModal.message}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} })}
                className={`flex-1 py-2 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}
              >
                取消
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className={`flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600`}
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 添加计划模态框 */}
      {showPlanModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowPlanModal(false)}
        >
          <div
            className={`${t.modalBg} rounded-lg p-6 w-full max-w-md border ${t.modalBorder}`}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className={`text-xl font-semibold mb-4 ${t.text}`}>添加计划目标</h2>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>目标标题</label>
                <input
                  type="text"
                  value={planForm.title}
                  onChange={(e) => setPlanForm({ ...planForm, title: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${t.border} ${t.input} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="输入目标标题"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>目标描述</label>
                <textarea
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${t.border} ${t.input} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="输入目标描述（可选）"
                  rows={3}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>风险项</label>
                <textarea
                  value={planForm.riskItem}
                  onChange={(e) => {
                    const riskValue = e.target.value;
                    setPlanForm({ 
                      ...planForm, 
                      riskItem: riskValue,
                      priority: riskValue.trim() ? '紧急' as const : planForm.priority
                    });
                  }}
                  className={`w-full px-3 py-2 rounded-lg border ${t.border} ${t.input} focus:outline-none focus:ring-2 focus:ring-orange-500 ${planForm.riskItem.trim() ? 'border-orange-500/50 bg-orange-50/30 dark:bg-orange-500/10' : ''}`}
                  placeholder="输入潜在风险内容（填写后将自动设置为紧急优先级）"
                  rows={2}
                />
                {planForm.riskItem.trim() && (
                  <p className="text-xs text-orange-500 mt-1 flex items-center gap-1">
                    <Zap size={12} />
                    已识别风险，优先级已自动调整为"紧急"
                  </p>
                )}
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>截止日期</label>
                <input
                  type="date"
                  value={planForm.dueDate}
                  onChange={(e) => setPlanForm({ ...planForm, dueDate: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${t.border} ${t.input} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>优先级</label>
                <select
                  value={planForm.priority}
                  onChange={(e) => setPlanForm({ ...planForm, priority: e.target.value as any })}
                  className={`w-full px-3 py-2 rounded-lg border ${t.border} ${t.input} focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    planForm.riskItem.trim() ? 'bg-orange-50/50 dark:bg-orange-500/10' : ''
                  }`}
                  disabled={!!planForm.riskItem.trim()}
                >
                  <option value="低">低</option>
                  <option value="中">中</option>
                  <option value="高">高</option>
                  <option value="紧急">紧急</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-4 mt-4">
              <button
                onClick={() => setShowPlanModal(false)}
                className={`flex-1 py-2 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}
              >
                取消
              </button>
              <button
                onClick={() => {
                  if (!planForm.title.trim()) {
                    showToast('请输入目标标题', 'error');
                    return;
                  }
                  const taskDescription = planForm.riskItem.trim()
                    ? `${planForm.description}\n\n⚠️ 风险项：${planForm.riskItem}`
                    : planForm.description;
                  
                  const newTask = {
                    id: generateId(),
                    title: planForm.title,
                    description: taskDescription,
                    riskItem: planForm.riskItem,
                    dueDate: planForm.dueDate,
                    priority: planForm.riskItem.trim() ? '紧急' as const : planForm.priority,
                    status: '未完成' as const,
                    completed: false,
                    createdAt: new Date().toISOString().split('T')[0],
                  };
                  const globalTaskId = addTask({
                    title: planForm.title,
                    description: taskDescription,
                    riskItem: planForm.riskItem,
                    dueDate: planForm.dueDate,
                    priority: planForm.riskItem.trim() ? '紧急' as const : planForm.priority,
                    status: '进行中' as const,
                    projectId: id!,
                    projectName: project.name,
                  });
                  updateProject(id!, {
                    tasks: [...(project.tasks || []), { ...newTask, taskId: globalTaskId }]
                  });
                  showToast('计划目标已添加并同步到任务系统', 'success');
                  setShowPlanModal(false);
                  setPlanForm({ title: '', description: '', riskItem: '', dueDate: '', priority: '中' });
                }}
                className={`flex-1 py-2 ${t.button} rounded-lg`}
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
