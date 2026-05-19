import { useMemo, useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Edit2,
  Package, Hash, Settings, X, Save, Check, Search,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTransfer } from '../components/TransferProgress';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { useProjectState } from '../hooks/useProjectState';
import { useModalState } from '../hooks/useModalState';
import { useProjectHandlers } from '../hooks/useProjectHandlers';
import type { ProjectStage, Module, ModuleStatus, Component, System, Document, Software } from '../types';
import { getDefaultStageForEntity } from '../services/stageConfig';
import {
  ModuleModal,
  SystemModal,
  SystemSearchSelect,
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
  ComponentEditPanel,
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
  ProjectHeader,
  GlobalSearchResults,
} from './ProjectDetail/components';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { getProject, currentUser } = useApp();
  const transferHooks = useTransfer();
  const t = useThemeStyles();

  const projectState = useProjectState();
  const modalState = useModalState();

  const project = getProject(id!);

  const {
    activeTab, globalSearchTerm, setGlobalSearchTerm,
    showStageDropdown, setShowStageDropdown,
    isUpdatingStage,
    filterCategory, setFilterCategory,
    filterType, setFilterType,
    filterStage, setFilterStage,
    filterVersion, setFilterVersion,
    confirmModal,
    closeConfirmModal,
    resetFilters,
  } = projectState;

  const {
    showModuleModal, setShowModuleModal,
    showCategoryModal, setShowCategoryModal,
    newCategory, setNewCategory,
    showSystemModal, setShowSystemModal,
    editingSystem, setEditingSystem,
    systemForm, setSystemForm,
    systemTemplate, setSystemTemplate,
    isCopyingSystem,
    showSoftwareModal, setShowSoftwareModal,
    editingSoftware, setEditingSoftware,
    softwareForm, setSoftwareForm,
    showPlanModal, setShowPlanModal,
    planForm,
    showDocModal, setShowDocModal,
    editingDoc, setEditingDoc,
    docForm, setDocForm,
    showDesignModal, setShowDesignModal,
    editingDesignFile, setEditingDesignFile,
    designForm,
    showDiagramModal,
    diagramType,
    diagramResult,
    diagramText,
    showReviewModal, setShowReviewModal,
    reviewForm, setReviewForm,
    showSyncModal, setShowSyncModal,
    syncTargetSoftware, setSyncTargetSoftware,
    syncComponentIds, setSyncComponentIds,
    showDesignSyncModal, setShowDesignSyncModal,
    syncTargetDesignFile, setSyncTargetDesignFile,
    syncDesignModuleIds,
    showVersionModal, setShowVersionModal,
    editingVersionSoftware, setEditingVersionSoftware,
    versionInput, setVersionInput,
    showRollbackModal, setShowRollbackModal,
    rollbackSnapshot, setRollbackSnapshot,
    rollbackConfirmText, setRollbackConfirmText,
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
    componentTemplate,
    isCopyingComponent,
    showModuleEditModal,
    showModuleEditConfirm,
    setShowModuleEditConfirm,
    editingModule, setEditingModule,
    moduleEditForm,
    setModuleEditForm,
    setShowModuleEditModal,
    showFileConflictModal, setShowFileConflictModal,
    fileConflictInfo,
  } = modalState;

  const allComponents = useMemo<Component[]>(() => {
    if (!project) return [];
    const modules = project.modules || [];
    const seen = new Set<string>();
    const comps: Component[] = [];
    modules.forEach((m: Module) => {
      (m.components || []).forEach((comp: Component) => {
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
    const totalComponents = modules.reduce((sum: number, m: Module) => sum + (m.components?.length || 0), 0);
    const normalComponents = modules.reduce(
      (sum: number, m: Module) => sum + (m.components?.filter((c: Component) => c.status === '正常').length || 0), 0
    );
    const faultComponents = modules.reduce(
      (sum: number, m: Module) => sum + (m.components?.filter((c: Component) => c.status === '故障').length || 0), 0
    );
    const documentsCompleted = documents.filter((d: Document) => d.status === '已完成').length;
    const softwareCompleted = software.filter((s: Software) => s.status === '已完成').length;

    const moduleStatusStats = modules.reduce((acc: Record<string, number>, m: Module) => {
      acc[m.status] = (acc[m.status] || 0) + 1;
      return acc;
    }, {});

    const categoryStats = modules.reduce((acc: Record<string, { moduleCount: number; componentCount: number }>, m: Module) => {
      if (!acc[m.category]) acc[m.category] = { moduleCount: 0, componentCount: 0 };
      acc[m.category].moduleCount += 1;
      acc[m.category].componentCount += m.components?.length || 0;
      return acc;
    }, {});

    const systemStatusStats = systems.reduce((acc: Record<string, number>, s: System) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    }, {});

    const componentStatusStats = modules.reduce((acc: Record<string, number>, m: Module) => {
      (m.components || []).forEach((c: Component) => {
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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <OverviewTabContent
            project={project as any}
            stats={stats as any}
            onAddPlan={() => setShowPlanModal(true)}
            onUpdateTask={() => {}}
            onDeleteTask={handlers.handleTaskDelete}
            onToggleTaskComplete={handlers.handleTaskToggleComplete as any}
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
            onModuleStatusChange={handlers.handleModuleStatusChange}
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
            onEditSystem={handlers.handleSystemEdit as any}
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
            <ReviewManager
              projectId={project.id}
              reviews={(project.reviews || []) as any}
              categories={project.categories}
              canEdit={canEdit}
              currentUser={currentUser ? { username: currentUser.username, id: currentUser.id } : null}
              onAddReview={handlers.handleOpenAddReview}
              onOpenAddReviewModal={handlers.handleOpenAddReview}
              onUpdateReview={() => {}}
              onAddCategory={handlers.handleAddReviewCategory}
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
            onUploadSoftware={handlers.handleUploadSoftware}
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
            onCreateDocuments={handlers.handleCreateDocumentsFromImport as any}
            projectStage={project.stage}
          />
        );
      case 'design':
        return (
          <DesignFiles
            projectId={project.id}
            designFiles={(project.designFiles || []) as any}
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
            onSync={(file: any) => handlers.handleUpdateDesignFileSync(file)}
            onDelete={handlers.handleDeleteDesignFile}
            onClearAll={handlers.handleClearAllDesignFiles}
            onCreateSingle={handlers.handleCreateSingleDesignDiagrams}
            onVersionUpdate={(file: any) => handlers.handleVersionUpdateDesignFile(file)}
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

    const handleSystemSelect = (systemId: string, systemNumber: string, systemName: string) => {
      setModuleEditForm({
        ...moduleEditForm,
        systemId: systemId,
        systemNumber: systemNumber,
        systemName: systemName,
        systemSearch: ''
      });
    };

    const handleClearSystemSelection = () => {
      setModuleEditForm({
        ...moduleEditForm,
        systemId: '',
        systemNumber: '',
        systemName: '',
        systemSearch: ''
      });
    };

    const handleConfirmEdit = () => {
      setShowModuleEditConfirm(false);
      handlers.handleUpdateModule();
    };

    return (
      <>
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setShowModuleEditModal(false); setEditingModule(null); }}>
          <div className={`${t.modalBg} rounded-2xl p-6 w-full max-w-2xl border ${t.modalBorder} max-h-[90vh] overflow-y-auto shadow-2xl`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-amber-200/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-200/50">
                  <Edit2 size={20} className="text-white" />
                </div>
                <div>
                  <h2 className={`text-xl font-bold ${t.text}`}>编辑模块</h2>
                  <p className={`text-xs ${t.textMuted} mt-0.5`}>{editingModule.moduleNumber}</p>
                </div>
              </div>
              <button
                onClick={() => { setShowModuleEditModal(false); setEditingModule(null); }}
                className={`p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 ${t.textSecondary} transition-colors`}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); setShowModuleEditConfirm(true); }} className="space-y-6">
              <div className="bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-900/10 dark:to-orange-900/10 rounded-xl p-5 border border-amber-200/40">
                <h3 className={`text-sm font-semibold ${t.text} mb-4 flex items-center gap-2`}>
                  <Package size={16} className="text-amber-600" />
                  基本信息
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${t.textSecondary}`}>
                      模块名称 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={moduleEditForm.moduleName}
                      onChange={(e) => setModuleEditForm({ ...moduleEditForm, moduleName: e.target.value })}
                      className={`w-full px-4 py-2.5 border rounded-xl focus:border-amber-400 focus:ring-2 focus:ring-amber-200 ${t.input} transition-all`}
                      placeholder="请输入模块名称"
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${t.textSecondary}`}>
                      模块编号 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={moduleEditForm.moduleNumber}
                      onChange={(e) => setModuleEditForm({ ...moduleEditForm, moduleNumber: e.target.value })}
                      className={`w-full px-4 py-2.5 border rounded-xl focus:border-amber-400 focus:ring-2 focus:ring-amber-200 ${t.input} transition-all`}
                      placeholder="如: M001"
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${t.textSecondary}`}>
                      种类 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={moduleEditForm.category}
                      onChange={(e) => setModuleEditForm({ ...moduleEditForm, category: e.target.value })}
                      className={`w-full px-4 py-2.5 border rounded-xl focus:border-amber-400 focus:ring-2 focus:ring-amber-200 ${t.input} transition-all`}
                    >
                      <option value="">请选择种类</option>
                      {project.categories?.filter((c: string) => c !== '全部').map((cat: string) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-white/50 dark:bg-gray-800/50 rounded-xl p-5 border border-gray-200/60 dark:border-gray-700/60">
                <h3 className={`text-sm font-semibold ${t.text} mb-4 flex items-center gap-2`}>
                  <Hash size={16} className="text-gray-500" />
                  生产信息
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${t.textSecondary}`}>生产指令号</label>
                    <input
                      type="text"
                      value={moduleEditForm.productionOrderNumber}
                      onChange={(e) => setModuleEditForm({ ...moduleEditForm, productionOrderNumber: e.target.value })}
                      className={`w-full px-4 py-2.5 border rounded-xl focus:border-amber-400 focus:ring-2 focus:ring-amber-200 ${t.input} transition-all`}
                      placeholder="请输入生产指令号"
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${t.textSecondary}`}>负责人</label>
                    <input
                      type="text"
                      value={moduleEditForm.holder}
                      onChange={(e) => setModuleEditForm({ ...moduleEditForm, holder: e.target.value })}
                      className={`w-full px-4 py-2.5 border rounded-xl focus:border-amber-400 focus:ring-2 focus:ring-amber-200 ${t.input} transition-all`}
                      placeholder="请输入负责人姓名"
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${t.textSecondary}`}>版本</label>
                    <input
                      type="text"
                      value={moduleEditForm.version}
                      onChange={(e) => setModuleEditForm({ ...moduleEditForm, version: e.target.value })}
                      className={`w-full px-4 py-2.5 border rounded-xl focus:border-amber-400 focus:ring-2 focus:ring-amber-200 ${t.input} transition-all`}
                      placeholder="如: v1.0"
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${t.textSecondary}`}>阶段</label>
                    <select
                      value={moduleEditForm.stage}
                      onChange={(e) => setModuleEditForm({ ...moduleEditForm, stage: e.target.value as ProjectStage })}
                      className={`w-full px-4 py-2.5 border rounded-xl focus:border-amber-400 focus:ring-2 focus:ring-amber-200 ${t.input} transition-all`}
                    >
                      <option value="F阶段">F阶段</option>
                      <option value="C阶段">C阶段</option>
                      <option value="S阶段">S阶段</option>
                      <option value="D阶段">D阶段</option>
                      <option value="P阶段">P阶段</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-white/50 dark:bg-gray-800/50 rounded-xl p-5 border border-gray-200/60 dark:border-gray-700/60">
                <h3 className={`text-sm font-semibold ${t.text} mb-4 flex items-center gap-2`}>
                  <Settings size={16} className="text-gray-500" />
                  关联系统
                </h3>
                <SystemSearchSelect
                  systems={systems}
                  currentSystemId={moduleEditForm.systemId || ''}
                  onSelect={handleSystemSelect}
                  onClearSelection={handleClearSystemSelection}
                />

                {moduleEditForm.systemId && (
                  <div className={`mt-4 p-4 rounded-xl ${t.emptyBg}`}>
                    <div className="text-xs space-y-1">
                      <div className={`${t.textSecondary}`}>系统编号: <span className={t.text}>{moduleEditForm.systemNumber || '-'}</span></div>
                      <div className={`${t.textSecondary}`}>系统名称: <span className={t.text}>{moduleEditForm.systemName || '-'}</span></div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModuleEditModal(false); setEditingModule(null); }}
                  className={`flex-1 py-3 border-2 rounded-xl ${t.border} ${t.textSecondary} hover:${t.hoverBg} transition-all flex items-center justify-center gap-2 font-medium`}
                >
                  <X size={18} />
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl font-semibold transition-all hover:shadow-lg cursor-pointer bg-gradient-to-r from-amber-600 via-orange-500 to-red-500 hover:from-amber-500 hover:via-orange-400 hover:to-red-400 text-white shadow-lg shadow-amber-200/50 hover:shadow-amber-300/50 flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  保存修改
                </button>
              </div>
            </form>
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
      <ProjectHeader
        project={project}
        globalSearchTerm={globalSearchTerm}
        onGlobalSearchChange={setGlobalSearchTerm}
        onRollbackModal={(snapshot) => {
          setRollbackSnapshot(snapshot as any);
          setShowRollbackModal(true);
        }}
        onStageUpdate={handlers.handleStageUpdate}
      />
      <GlobalSearchResults
        searchTerm={globalSearchTerm}
        results={handlers.getSearchResults()}
        onClose={() => setGlobalSearchTerm('')}
      />
      <TabNavigation activeTab={activeTab} onTabChange={projectState.setActiveTab} />
      {renderTabContent()}

      <ModuleModal
        show={showModuleModal}
        onClose={() => setShowModuleModal(false)}
        onSubmit={(e) => handlers.handleCreateModule(e, modalState.moduleForm as any)}
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
          editingSystem={editingSystem!}
          systemTemplate={systemTemplate ?? undefined}
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
          onVersionInputChange={(v: string) => modalState.setVersionInput(v)}
          onIncrement={() => modalState.setVersionInput(handlers.incrementVersion(editingVersionSoftware.version))}
          onUpdate={(version: string) => handlers.handleVersionUpdate(editingVersionSoftware, version)}
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
          onSync={() => handlers.handleSyncSoftwareToComponents(syncTargetSoftware, syncComponentIds)}
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
          modules={project.modules || []}
          components={project.modules.flatMap(m => m.components || [])}
          editingDesignFile={editingDesignFile!}
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
        <ComponentEditPanel
          show={showComponentEditModal}
          onClose={() => { setShowComponentEditModal(false); setEditingComponent(null); }}
          onCancel={() => { setShowComponentEditModal(false); setEditingComponent(null); }}
          onSubmit={handlers.handleComponentEditSubmit}
          component={editingComponent}
          module={project.modules.find((m: Module) => m.id === editingComponent.moduleId) as Module || {
            id: '',
            moduleName: '未知模块',
            moduleNumber: '',
            components: [],
            stage: 'C阶段' as ProjectStage,
            version: 'v1.0',
            status: '未投产' as ModuleStatus,
            projectId: project.id,
            category: '',
          } as unknown as Module}
          modules={project.modules}
          project={project}
          form={{ ...componentEditForm, status: editingComponent.status, stage: (componentEditForm.stage as ProjectStage) || 'C阶段' }}
          onChange={(field: string, value: string) => setComponentEditForm((prev: any) => ({ ...prev, [field]: value }))}
          errors={{}}
        />
      )}

      {showComponentStatusModal && editingComponentStatus && (
        <ComponentStatusModal
          show={showComponentStatusModal}
          onClose={() => { setShowComponentStatusModal(false); setEditingComponent(null); setComponentStatusForm({ status: '', reason: '' }); }}
          component={editingComponentStatus}
          form={componentStatusForm}
          onChange={(form) => modalState.setComponentStatusForm(form)}
          onSubmit={handlers.handleComponentStatusSubmit}
        />
      )}

      {showComponentCopyModal && copyingComponent && (
        <ComponentCopyModal
          show={showComponentCopyModal}
          onClose={() => { setShowComponentCopyModal(false); setCopyingComponent(null); }}
          copyingComponent={copyingComponent}
          form={componentCopyForm}
          onChange={(form: any) => modalState.setComponentCopyForm(form)}
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
          editingComponent={editingComponent!}
          componentTemplate={componentTemplate ?? undefined}
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
          onChange={(value: string) => setNewCategory(value)}
          existingCategories={project.categories as any}
        />
      )}

      {confirmModal.show && (
        <ConfirmModal
          show={confirmModal.show}
          title={confirmModal.title}
          message={confirmModal.message}
          onClose={closeConfirmModal}
          onCancel={closeConfirmModal}
          onConfirm={confirmModal.onConfirm}
        />
      )}

      {showFileConflictModal && fileConflictInfo && (
        <FileConflictModal
          show={showFileConflictModal}
          conflict={{
            fileName: fileConflictInfo.newFile.name,
            fileSize: fileConflictInfo.newFile.size || 0,
            fileType: fileConflictInfo.newFile.type,
            uploadDate: new Date().toLocaleString('zh-CN'),
            existingFileName: fileConflictInfo.existingFile.name,
            existingFileSize: fileConflictInfo.existingFile.size || 0,
            existingFileUploadDate: (fileConflictInfo.existingFile as any).uploadDate || '',
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