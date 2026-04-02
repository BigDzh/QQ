import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Search, Download, RotateCcw, Edit2, CheckCircle, Loader2, Plus,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/Toast';
import { useTransfer } from '../components/TransferProgress';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { useProjectState } from '../hooks/useProjectState';
import { useModalState } from '../hooks/useModalState';
import { useProjectHandlers } from '../hooks/useProjectHandlers';
import type { ProjectStage, Module } from '../types';
import { getDefaultStageForEntity, STAGE_OPTIONS } from '../services/stageConfig';
import {
  ModuleModal,
  SystemModal,
  ComponentModal,
  DocModal,
  DesignModal,
  ConfirmModal,
  ReviewModal,
  SoftwareModal,
  PlanModal,
  DiagramModal,
  VersionModal,
  SyncModal,
  RollbackModal,
  ComponentEditModal,
  ComponentStatusModal,
  ComponentCopyModal,
  CategoryModal,
  DesignSyncModal,
  FileConflictModal,
  TabNavigation,
  OverviewTabContent,
  ModuleList,
  SystemList,
  ComponentList,
  ReviewManager,
  SoftwareList,
  DocumentList,
  DesignFiles,
  ProjectLogs,
} from './ProjectDetail/components';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { getProject, currentUser } = useApp();
  const { showToast } = useToast();
  const transferHooks = useTransfer();
  const t = useThemeStyles();

  const projectState = useProjectState();
  const modalState = useModalState();

  const project = getProject(id!);

  const {
    activeTab, globalSearchTerm, setGlobalSearchTerm,
    showStageDropdown, setShowStageDropdown,
    isUpdatingStage, setIsUpdatingStage,
    filterCategory, setFilterCategory,
    filterType, setFilterType,
    filterStage, setFilterStage,
    filterVersion, setFilterVersion,
    confirmModal, setConfirmModal,
    openConfirmModal, closeConfirmModal,
    resetFilters,
  } = projectState;

  const {
    showModuleModal, setShowModuleModal,
    showCategoryModal, setShowCategoryModal,
    newCategory, setNewCategory,
    showSystemModal, setShowSystemModal,
    editingSystem,
    systemForm,
    systemTemplate,
    isCopyingSystem,
    showSoftwareModal, setShowSoftwareModal,
    editingSoftware,
    softwareForm,
    showPlanModal, setShowPlanModal,
    planForm,
    showDocModal, setShowDocModal,
    editingDoc,
    docForm,
    docPage,
    showDesignModal, setShowDesignModal,
    editingDesignFile,
    designForm,
    showDiagramModal,
    diagramType,
    diagramResult,
    diagramText,
    showReviewModal, setShowReviewModal,
    reviewForm,
    showSyncModal,
    syncTargetSoftware,
    syncComponentIds,
    showDesignSyncModal,
    syncTargetDesignFile,
    syncDesignModuleIds,
    showVersionModal,
    editingVersionSoftware,
    versionInput,
    showRollbackModal,
    rollbackSnapshot,
    rollbackConfirmText,
    showComponentEditModal, setShowComponentEditModal,
    editingComponent, setEditingComponent,
    componentEditForm,
    setComponentEditForm,
    showComponentStatusModal, setShowComponentStatusModal,
    editingComponent: editingComponentStatus,
    componentStatusForm, setComponentStatusForm,
    showComponentCopyModal, setShowComponentCopyModal,
    copyingComponent, setCopyingComponent,
    componentCopyForm,
    showComponentModal,
    componentForm,
    setComponentForm,
    componentTemplate,
    setComponentTemplate,
    isCopyingComponent,
    showModuleEditModal,
    showModuleEditConfirm,
    setShowModuleEditConfirm,
    editingModule,
    moduleForm,
    moduleEditForm,
    setModuleEditForm,
    setShowModuleEditModal,
    showFileConflictModal, setShowFileConflictModal,
    fileConflictInfo,
  } = modalState;

  const allComponents = useMemo(() => {
    if (!project) return [];
    const modules = project.modules || [];
    const seen = new Set<string>();
    const comps: any[] = [];
    modules.forEach((m: any) => {
      (m.components || []).forEach((comp: any) => {
        if (!seen.has(comp.componentName)) {
          seen.add(comp.componentName);
          comps.push(comp);
        }
      });
    });
    return comps;
  }, [project]);

  const stats = useMemo(() => {
    if (!project) return null;
    const modules = project.modules || [];
    const systems = project.systems || [];
    const documents = project.documents || [];
    const software = project.software || [];
    const totalModules = modules.length;
    const totalComponents = modules.reduce((sum: number, m: any) => sum + (m.components?.length || 0), 0);
    const normalComponents = modules.reduce(
      (sum: number, m: any) => sum + (m.components?.filter((c: any) => c.status === '正常').length || 0), 0
    );
    const faultComponents = modules.reduce(
      (sum: number, m: any) => sum + (m.components?.filter((c: any) => c.status === '故障').length || 0), 0
    );
    const documentsCompleted = documents.filter((d: any) => d.status === '已完成').length;
    const softwareCompleted = software.filter((s: any) => s.status === '已完成').length;

    const moduleStatusStats = modules.reduce((acc: Record<string, number>, m: any) => {
      acc[m.status] = (acc[m.status] || 0) + 1;
      return acc;
    }, {});

    const categoryStats = modules.reduce((acc: Record<string, { moduleCount: number; componentCount: number }>, m: any) => {
      if (!acc[m.category]) acc[m.category] = { moduleCount: 0, componentCount: 0 };
      acc[m.category].moduleCount += 1;
      acc[m.category].componentCount += m.components?.length || 0;
      return acc;
    }, {});

    const systemStatusStats = systems.reduce((acc: Record<string, number>, s: any) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    }, {});

    const componentStatusStats = modules.reduce((acc: Record<string, number>, m: any) => {
      (m.components || []).forEach((c: any) => {
        acc[c.status] = (acc[c.status] || 0) + 1;
      });
      return acc;
    }, {});

    return {
      totalModules, totalComponents,
      normalRate: totalComponents > 0 ? Math.round((normalComponents / totalComponents) * 100) : 0,
      faultRate: totalComponents > 0 ? Math.round((faultComponents / totalComponents) * 100) : 0,
      documentsCompleted, documentsTotal: documents.length,
      softwareCompleted, softwareTotal: software.length,
      moduleStatusStats, categoryStats, systemStatusStats, componentStatusStats,
    };
  }, [project]);

  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'manager';

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

  const handlers = useProjectHandlers(project, modalState, projectState, transferHooks);

  const StageDropdown = ({
    stage,
    isUpdating,
    onToggle,
    onStageSelect,
    showDropdown,
    onDropdownClose,
  }: {
    stage: string;
    isUpdating: boolean;
    onToggle: () => void;
    onStageSelect: (stage: ProjectStage) => void;
    showDropdown: boolean;
    onDropdownClose: () => void;
  }) => {
    const stages: ProjectStage[] = ['F阶段', 'C阶段', 'S阶段', 'D阶段', 'P阶段'];
    return (
      <div className="relative">
        <button
          onClick={onToggle}
          disabled={isUpdating}
          className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 cursor-pointer transition-all duration-200 ${
            t.stageColors[stage as keyof typeof t.stageColors] || t.stageColors.C阶段
          } ${isUpdating ? 'opacity-50 cursor-wait' : 'hover:scale-105 hover:shadow-md'}`}
          title="点击更改项目阶段"
        >
          {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <Edit2 size={12} />}
          <span>{stage}</span>
        </button>
        {showDropdown && (
          <>
            <div className="fixed inset-0 z-40" onClick={onDropdownClose} />
            <div className={`absolute right-0 top-full mt-2 z-50 ${t.card} rounded-lg shadow-xl border ${t.border} py-2 min-w-[140px] animate-in fade-in slide-in-from-top-2 duration-200`}>
              <div className={`px-3 py-1.5 text-xs ${t.textMuted} border-b ${t.border}`}>选择项目阶段</div>
              {stages.map((s) => (
                <button
                  key={s}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (s === stage) { onDropdownClose(); return; }
                    onStageSelect(s);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${s === stage ? `${t.accentText} font-medium` : `${t.text} hover:${t.hoverBg}`}`}
                >
                  {s === stage && <CheckCircle size={14} />}
                  <span className={`px-2 py-0.5 rounded text-xs ${t.stageColors[s as keyof typeof t.stageColors]}`}>{s}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  const renderHeader = () => (
    <div className="mb-6">
      <Link to="/projects" className={`flex items-center gap-2 ${t.textSecondary} hover:${t.text} mb-4`}>
        <ArrowLeft size={20} /> 返回项目列表
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
              type="text" placeholder="搜索..."
              value={globalSearchTerm}
              onChange={(e) => setGlobalSearchTerm(e.target.value)}
              className={`pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none transition-all ${t.input} w-48`}
            />
          </div>
          <button
            onClick={handlers.handleCreateSnapshot}
            className={`px-3 py-2 border rounded-lg text-sm flex items-center gap-1.5 ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}
            title="创建数据备份"
          >
            <Download size={14} /> 备份
          </button>
          <button
            onClick={handlers.handleOpenRollbackModal}
            className={`px-3 py-2 border rounded-lg text-sm flex items-center gap-1.5 ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}
            title="回滚数据"
          >
            <RotateCcw size={14} /> 回滚
          </button>
          <StageDropdown
            stage={project.stage}
            isUpdating={isUpdatingStage}
            onToggle={() => setShowStageDropdown(!showStageDropdown)}
            onStageSelect={handlers.handleStageUpdate}
            showDropdown={showStageDropdown}
            onDropdownClose={() => setShowStageDropdown(false)}
          />
        </div>
      </div>
    </div>
  );

  const renderSearchResults = () => {
    if (!globalSearchTerm) return null;
    const results = handlers.getSearchResults();
    if (results.length === 0) {
      return (
        <div className={`relative z-50 mb-4 text-sm ${t.textMuted} p-4 ${t.card} rounded-lg border ${t.border}`}>
          未找到相关结果
        </div>
      );
    }
    return (
      <div className={`relative z-50 mb-4 p-4 ${t.card} rounded-lg border ${t.border} max-h-64 overflow-y-auto shadow-lg`}>
        <div className={`text-sm ${t.textMuted} mb-2`}>找到 {results.length} 个结果</div>
        <div className="space-y-2">
          {results.map((result, index) => (
            <Link
              key={`${result.type}-${result.id}-${index}`}
              to={result.url}
              onClick={() => setGlobalSearchTerm('')}
              className={`flex items-center justify-between p-2 rounded ${t.hoverBg}`}
            >
              <div className="flex items-center gap-2">
                <span className={`text-sm ${t.text}`}>{result.name}</span>
                <span className={`text-xs ${t.textMuted}`}>{result.number}</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded ${t.badge}`}>{result.type}</span>
            </Link>
          ))}
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <OverviewTabContent
            project={project}
            stats={stats}
            onAddPlan={() => setShowPlanModal(true)}
            onUpdateTask={() => {}}
            onDeleteTask={handlers.handleTaskDelete}
            onToggleTaskComplete={handlers.handleTaskToggleComplete}
          />
        );
      case 'modules':
        return (
          <ModuleList
            projectId={project.id}
            modules={project.modules || []}
            categories={project.categories || []}
            canEdit={canEdit}
            onAddModule={() => setShowModuleModal(true)}
            onEditModule={handlers.handleModuleEdit}
            onDeleteModule={handlers.handleModuleDelete}
            onCopyModule={handlers.handleModuleCopy}
            onBatchUpdateStage={handlers.handleBatchUpdateModuleStage}
            onBatchUpdateVersion={handlers.handleBatchUpdateModuleVersion}
            onBatchDelete={handlers.handleBatchDeleteModule}
          />
        );
      case 'systems':
        return (
          <SystemList
            projectId={project.id}
            systems={project.systems || []}
            modules={project.modules || []}
            canEdit={canEdit}
            onAddSystem={handlers.handleOpenSystemModal}
            onEditSystem={handlers.handleSystemEdit}
            onDeleteSystem={handlers.handleSystemDelete}
            onBatchDeleteSystems={handlers.handleBatchDeleteSystem}
            onBatchUpdateStatus={handlers.handleBatchUpdateSystemStatus}
          />
        );
      case 'components':
        return (
          <ComponentList
            modules={project.modules || []}
            canEdit={canEdit}
            onAddComponent={handlers.handleOpenComponentModal}
            onEditComponent={handlers.handleComponentEdit}
            onDeleteComponent={handlers.handleComponentDelete}
            onCopyComponent={handlers.handleComponentCopy}
            onStatusChange={handlers.handleComponentStatusChange}
            onStatusChangeWithReason={handlers.handleStatusChangeWithReason}
            onBatchDeleteComponents={handlers.handleBatchDeleteComponent}
            onBatchUpdateStatus={handlers.handleBatchUpdateComponentStatus}
            onBatchUpdateStage={handlers.handleBatchUpdateComponentStage}
            onBatchUpdateVersion={handlers.handleBatchUpdateComponentVersion}
          />
        );
      case 'reviews':
        return (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-semibold ${t.text}`}>评审管理</h2>
              {canEdit && (
                <button
                  onClick={handlers.handleOpenAddReview}
                  className={`flex items-center gap-2 px-4 py-2 ${t.button} rounded-lg text-white`}
                >
                  <Plus size={18} />
                  新建评审
                </button>
              )}
            </div>
            <ReviewManager
              projectId={project.id}
              reviews={project.reviews || []}
              categories={project.categories}
              canEdit={canEdit}
              currentUser={currentUser ? { username: currentUser.username, id: currentUser.id } : null}
              onAddReview={handlers.handleOpenAddReview}
              onUpdateReview={() => {}}
              onDeleteReview={handlers.handleDeleteReview}
              onReviewAction={handlers.handleReviewAction}
              onUploadFiles={handlers.handleReviewFileUploadWithDrag}
              onDeleteFile={handlers.handleDeleteReviewFile}
              onDeleteCategory={handlers.handleDeleteReviewCategory}
              onDownloadFile={handlers.handleDownloadReviewFile}
              onDownloadCategory={handlers.handleDownloadReviewCategoryFiles}
              onDownloadAll={handlers.handleDownloadReviewFolder}
            />
          </div>
        );
      case 'software':
        return (
          <SoftwareList
            projectId={project.id}
            software={project.software || []}
            modules={project.modules || []}
            canEdit={canEdit}
            onAddSoftware={handlers.handleOpenAddSoftware}
            onEditSoftware={handlers.handleOpenEditSoftware}
            onSaveSoftware={handlers.handleSaveSoftware}
            onDeleteSoftware={handlers.handleDeleteSoftware}
            onUpdateVersion={(soft) => {
              modalState.setEditingVersionSoftware(soft);
              modalState.setVersionInput(handlers.incrementVersion(soft.version));
              modalState.setShowVersionModal(true);
            }}
            onSyncSoftware={(soft) => {
              modalState.setSyncTargetSoftware(soft);
              modalState.setSyncComponentIds(soft.adaptedComponentIds || []);
              modalState.setShowSyncModal(true);
            }}
            onSyncToComponents={handlers.handleSyncSoftwareToComponents}
            onDownloadSoftware={handlers.handleDownloadSoftware}
            onUploadSoftware={() => {}}
            onVersionUpdate={handlers.handleVersionUpdate}
          />
        );
      case 'documents':
        return (
          <DocumentList
            projectId={project.id}
            documents={project.documents || []}
            canEdit={canEdit}
            onAddDocument={handlers.handleOpenAddDocument}
            onEditDocument={handlers.handleOpenEditDocument}
            onDeleteDocument={handlers.handleDeleteDocument}
            onUploadDocument={handlers.handleUploadDocument}
            onDownloadDocument={handlers.handleDownloadDocument}
            onCreateDocuments={handlers.handleCreateDocumentsFromImport}
            projectStage={project.stage}
          />
        );
      case 'design':
        return (
          <DesignFiles
            projectId={project.id}
            designFiles={project.designFiles || []}
            modules={project.modules || []}
            canEdit={canEdit}
            filterCategory={filterCategory}
            filterType={filterType}
            filterStage={filterStage}
            filterVersion={filterVersion}
            onFilterCategoryChange={setFilterCategory}
            onFilterTypeChange={setFilterType}
            onFilterStageChange={setFilterStage}
            onFilterVersionChange={setFilterVersion}
            onResetFilters={resetFilters}
            onAutoGenerate={handlers.handleAutoGenerateDesignDiagrams}
            onUpload={handlers.handleUploadDesignFile}
            onSync={handlers.handleUpdateDesignFileSync}
            onDelete={handlers.handleDeleteDesignFile}
            onCreateSingle={handlers.handleCreateSingleDesignDiagrams}
            onVersionUpdate={handlers.handleVersionUpdateDesignFile}
          />
        );
      case 'logs':
        return <ProjectLogs logs={project.logs || []} />;
      default:
        return null;
    }
  };

  const renderModuleEditModal = () => {
    if (!showModuleEditModal || !editingModule) return null;

    const systems = project.systems || [];

    const handleConfirmEdit = () => {
      setShowModuleEditConfirm(false);
      handlers.handleUpdateModule();
    };

    return (
      <>
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { setShowModuleEditModal(false); setEditingModule(null); }}>
          <div className={`${t.modalBg} rounded-lg p-6 w-full max-w-lg border ${t.modalBorder} max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
            <h2 className={`text-xl font-semibold mb-4 ${t.text}`}>编辑模块</h2>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>模块编号 *</label>
                <input type="text" value={moduleEditForm.moduleNumber}
                  onChange={(e) => setModuleEditForm({ ...moduleEditForm, moduleNumber: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`} placeholder="如: M-001" required />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>模块名称 *</label>
                <input type="text" value={moduleEditForm.moduleName}
                  onChange={(e) => setModuleEditForm({ ...moduleEditForm, moduleName: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`} required />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>关联系统</label>
                <div className={`p-3 rounded-lg border ${t.border} max-h-48 overflow-y-auto`}>
                  <input
                    type="text"
                    placeholder="搜索系统名称或编号..."
                    className={`w-full px-3 py-2 border rounded-lg ${t.input} mb-2`}
                    onChange={(e) => {
                      const searchValue = e.target.value.toLowerCase();
                      setModuleEditForm(prev => ({ ...prev, systemSearch: searchValue }));
                    }}
                  />
                  <div className="space-y-1">
                    <label className={`flex items-center gap-2 p-2 rounded cursor-pointer ${moduleEditForm.systemId === '' ? 'bg-blue-100 dark:bg-blue-900/40' : ''} hover:bg-gray-100 dark:hover:bg-gray-700`}>
                      <input
                        type="radio"
                        name="systemSelection"
                        checked={moduleEditForm.systemId === ''}
                        onChange={() => setModuleEditForm({ ...moduleEditForm, systemId: '', systemNumber: '', systemName: '', systemSearch: '' })}
                        className="w-4 h-4"
                      />
                      <span className={t.text}>无关联系统</span>
                    </label>
                    {systems.filter((s: any) => {
                      const search = (moduleEditForm as any).systemSearch || '';
                      return !search || s.systemName.toLowerCase().includes(search.toLowerCase()) || s.systemNumber.toLowerCase().includes(search.toLowerCase());
                    }).map((sys: any) => (
                      <label key={sys.id} className={`flex items-center gap-2 p-2 rounded cursor-pointer ${moduleEditForm.systemId === sys.id ? 'bg-blue-100 dark:bg-blue-900/40' : ''} hover:bg-gray-100 dark:hover:bg-gray-700`}>
                        <input
                          type="radio"
                          name="systemSelection"
                          checked={moduleEditForm.systemId === sys.id}
                          onChange={() => setModuleEditForm({ ...moduleEditForm, systemId: sys.id, systemNumber: sys.systemNumber, systemName: sys.systemName, systemSearch: '' })}
                          className="w-4 h-4"
                        />
                        <span className={t.text}>{sys.systemName}</span>
                        <span className={`text-xs ${t.textMuted}`}>({sys.systemNumber})</span>
                      </label>
                    ))}
                  </div>
                </div>
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
                <input type="text" value={moduleEditForm.productionOrderNumber}
                  onChange={(e) => setModuleEditForm({ ...moduleEditForm, productionOrderNumber: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`} placeholder="如: PRD-001" />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>负责人</label>
                <input type="text" value={moduleEditForm.holder}
                  onChange={(e) => setModuleEditForm({ ...moduleEditForm, holder: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>阶段</label>
                  <select value={moduleEditForm.stage}
                    onChange={(e) => setModuleEditForm({ ...moduleEditForm, stage: e.target.value as ProjectStage })}
                    className={`w-full px-3 py-2 border rounded-lg ${t.input}`}>
                    <option value="F阶段">F阶段</option><option value="C阶段">C阶段</option><option value="S阶段">S阶段</option><option value="D阶段">D阶段</option><option value="P阶段">P阶段</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>版本</label>
                  <input type="text" value={moduleEditForm.version}
                    onChange={(e) => setModuleEditForm({ ...moduleEditForm, version: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg ${t.input}`} placeholder="如: v1.0" />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setShowModuleEditModal(false); setEditingModule(null); }}
                  className={`flex-1 py-2 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}>取消</button>
                <button type="button" onClick={() => setShowModuleEditConfirm(true)}
                  className={`flex-1 py-2 ${t.button} rounded-lg`}>保存修改</button>
              </div>
            </div>
          </div>
        </div>
        <ConfirmModal
          show={showModuleEditConfirm}
          title="确认修改"
          message={`确定要修改模块 "${editingModule.moduleName}" 的信息吗？`}
          onConfirm={handleConfirmEdit}
          onCancel={() => setShowModuleEditConfirm(false)}
          type="info"
          confirmText="确认"
          cancelText="取消"
        />
      </>
    );
  };

  return (
    <div>
      {renderHeader()}
      {renderSearchResults()}
      <TabNavigation activeTab={activeTab} onTabChange={projectState.setActiveTab} />
      {renderTabContent()}

      <ModuleModal
        show={showModuleModal}
        onClose={() => setShowModuleModal(false)}
        onSubmit={(e) => handlers.handleCreateModule(e, modalState.moduleForm)}
        form={modalState.moduleForm}
        onChange={(field, value) => modalState.setModuleForm({ ...modalState.moduleForm, [field]: value })}
        categories={project.categories}
        mode="create"
      />

      {renderModuleEditModal()}

      {showSystemModal && (
        <SystemModal
          show={showSystemModal}
          onClose={() => {
            setShowSystemModal(false);
            setEditingSystem(null);
            setSystemTemplate(null);
            setSystemForm(modalState.resetSystemForm());
          }}
          onSubmit={handlers.handleCreateSystem}
          form={systemForm}
          onChange={handlers.handleSystemFormChange}
          editingSystem={editingSystem}
          systemTemplate={systemTemplate}
          onSelectTemplate={handlers.handleSelectTemplate}
          onClearTemplate={handlers.handleClearTemplate}
          existingSystems={project.systems}
          isCopying={isCopyingSystem}
        />
      )}

      {showSoftwareModal && (
        <SoftwareModal
          show={showSoftwareModal}
          onClose={() => { setShowSoftwareModal(false); setEditingSoftware(null); setSoftwareForm({ name: '', version: '', adaptedComponentIds: [] }); }}
          onSubmit={handlers.handleCreateSoftware}
          form={softwareForm}
          onChange={handlers.handleSoftwareFormChange}
          components={allComponents}
          editingSoftware={editingSoftware}
        />
      )}

      {showVersionModal && editingVersionSoftware && (
        <VersionModal
          show={showVersionModal}
          onClose={() => { setShowVersionModal(false); setEditingVersionSoftware(null); setVersionInput(''); }}
          software={editingVersionSoftware}
          versionInput={versionInput}
          onVersionInputChange={modalState.setVersionInput}
          onIncrement={() => modalState.setVersionInput(handlers.incrementVersion(editingVersionSoftware.version))}
          onUpdate={(version) => handlers.handleVersionUpdate(editingVersionSoftware, version)}
        />
      )}

      {showSyncModal && syncTargetSoftware && (
        <SyncModal
          show={showSyncModal}
          onClose={() => { setShowSyncModal(false); setSyncTargetSoftware(null); setSyncComponentIds([]); }}
          software={syncTargetSoftware}
          syncComponentIds={syncComponentIds}
          onSyncComponentIdsChange={modalState.setSyncComponentIds}
          modules={project.modules}
          onSync={handlers.handleSyncSoftwareToComponents}
        />
      )}

      {showDocModal && (
        <DocModal
          show={showDocModal}
          onClose={() => { setShowDocModal(false); setEditingDoc(null); setDocForm({ documentNumber: '', name: '', type: '', stage: getDefaultStageForEntity('document'), version: 'A' }); }}
          onSubmit={handlers.handleUpdateDocument}
          form={docForm}
          onChange={handlers.handleDocFormChange}
          editingDoc={editingDoc}
        />
      )}

      {showDesignModal && (
        <DesignModal
          show={showDesignModal}
          onClose={() => { setShowDesignModal(false); setEditingDesignFile(null); }}
          onSubmit={handlers.handleDesignFileSubmit}
          form={designForm}
          onChange={handlers.handleDesignFormChange}
          modules={project.modules}
          editingDesignFile={editingDesignFile}
        />
      )}

      {showDesignSyncModal && (
        <DesignSyncModal
          show={showDesignSyncModal}
          onClose={() => { setShowDesignSyncModal(false); setSyncTargetDesignFile(null); }}
          targetFile={syncTargetDesignFile}
          syncModuleIds={syncDesignModuleIds}
          onSyncModuleIdsChange={modalState.setSyncDesignModuleIds}
          modules={project.modules}
          onSync={handlers.handleSyncDesignFileToModules}
        />
      )}

      {showDiagramModal && (
        <DiagramModal
          show={showDiagramModal}
          onClose={() => modalState.setShowDiagramModal(false)}
          type={diagramType}
          text={diagramText}
          result={diagramResult}
          onTypeChange={handlers.handleGenerateDiagram}
          onCopy={handlers.handleCopyDiagram}
        />
      )}

      {showReviewModal && (
        <ReviewModal
          show={showReviewModal}
          onClose={() => { setShowReviewModal(false); setReviewForm({ title: '', content: '' }); }}
          onSubmit={handlers.handleCreateReview}
          form={reviewForm}
          onChange={handlers.handleReviewFormChange}
          systems={project.systems}
        />
      )}

      {showPlanModal && (
        <PlanModal
          show={showPlanModal}
          onClose={() => setShowPlanModal(false)}
          form={planForm}
          onChange={handlers.handlePlanFormChange}
          onSubmit={handlers.handlePlanSubmit}
        />
      )}

      {showComponentEditModal && editingComponent && (
        <ComponentEditModal
          show={showComponentEditModal}
          onClose={() => { setShowComponentEditModal(false); setEditingComponent(null); }}
          editingComponent={editingComponent}
          form={componentEditForm}
          onChange={setComponentEditForm}
          modules={project.modules}
          onSubmit={handlers.handleComponentEditSubmit}
        />
      )}

      {showComponentStatusModal && editingComponentStatus && (
        <ComponentStatusModal
          show={showComponentStatusModal}
          onClose={() => { setShowComponentStatusModal(false); setEditingComponent(null); setComponentStatusForm({ status: '', reason: '' }); }}
          component={editingComponentStatus}
          form={componentStatusForm}
          onChange={modalState.setComponentStatusForm}
          onSubmit={handlers.handleComponentStatusSubmit}
        />
      )}

      {showComponentCopyModal && copyingComponent && (
        <ComponentCopyModal
          show={showComponentCopyModal}
          onClose={() => { setShowComponentCopyModal(false); setCopyingComponent(null); }}
          copyingComponent={copyingComponent}
          form={componentCopyForm}
          onChange={modalState.setComponentCopyForm}
          modules={project.modules}
          onSubmit={handlers.handleComponentCopySubmit}
        />
      )}

      {showComponentModal && (
        <ComponentModal
          show={showComponentModal}
          onClose={() => {
            modalState.setShowComponentModal(false);
            modalState.setAddingComponent(null);
            modalState.setComponentTemplate(null);
            modalState.setIsCopyingComponent(false);
            modalState.setComponentForm({
              componentNumber: '', componentName: '', productionOrderNumber: '', holder: '',
              status: '未投产', stage: getDefaultStageForEntity('component'), version: 'A',
              repairOrderNumber: '', protectionOrderNumber: '',
            });
          }}
          onSubmit={handlers.handleComponentSubmit}
          form={componentForm}
          onChange={handlers.handleComponentFormChange}
          editingComponent={editingComponent}
          componentTemplate={componentTemplate}
          onSelectTemplate={handlers.handleSelectComponentTemplate}
          onClearTemplate={handlers.handleClearComponentTemplate}
          existingComponents={allComponents}
          isCopying={isCopyingComponent}
        />
      )}

      {showRollbackModal && rollbackSnapshot && (
        <RollbackModal
          show={showRollbackModal}
          snapshot={rollbackSnapshot}
          confirmText={rollbackConfirmText}
          onConfirmTextChange={modalState.setRollbackConfirmText}
          onClose={() => { setShowRollbackModal(false); setRollbackSnapshot(null); setRollbackConfirmText(''); }}
          onConfirm={handlers.handleRollback}
        />
      )}

      {showCategoryModal && (
        <CategoryModal
          show={showCategoryModal}
          onClose={() => { setShowCategoryModal(false); setNewCategory(''); }}
          onSubmit={handlers.handleAddCategory}
          newCategory={newCategory}
          onChange={setNewCategory}
          existingCategories={project.categories}
        />
      )}

      {confirmModal.show && (
        <ConfirmModal
          show={confirmModal.show}
          title={confirmModal.title}
          message={confirmModal.message}
          onClose={closeConfirmModal}
          onConfirm={confirmModal.onConfirm}
        />
      )}

      {showFileConflictModal && fileConflictInfo && (
        <FileConflictModal
          show={showFileConflictModal}
          conflict={{
            fileName: fileConflictInfo.newFile.name,
            fileSize: fileConflictInfo.newFile.size,
            fileType: fileConflictInfo.newFile.type,
            uploadDate: new Date().toLocaleString('zh-CN'),
            existingFileName: fileConflictInfo.existingFile.name,
            existingFileSize: fileConflictInfo.existingFile.size,
            existingFileUploadDate: fileConflictInfo.existingFile.uploadDate,
          }}
          onReplace={() => {
            fileConflictInfo.resolve('replace');
            setShowFileConflictModal(false);
          }}
          onKeepExisting={() => {
            fileConflictInfo.resolve('keep');
            setShowFileConflictModal(false);
          }}
          onCancel={() => setShowFileConflictModal(false)}
          onApplyToAll={(action) => {
            fileConflictInfo.resolve(action);
            setShowFileConflictModal(false);
            handlers.handleReviewFileUploadWithDrag(
              fileConflictInfo.reviewId,
              null,
              fileConflictInfo.category,
              action
            );
          }}
        />
      )}
    </div>
  );
}