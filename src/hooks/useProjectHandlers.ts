import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateId } from '../utils/auth';
import { compressFolderToZip, downloadBlob, generateZipFilename } from '../utils/compression';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/Toast';
import { useTransfer } from '../components/TransferProgress';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { calculateFileMD5Async } from '../utils/md5';
import {
  generateDesignDiagrams,
  generateSingleModuleAssemblyForCAD,
  generateSingleComponentAssemblyForCAD,
  generateSingleComponentTableForExcel,
  type DiagramCard
} from '../services/designDiagramService';
import { createPreUpdateSnapshot, rollbackData, getRollbackSnapshot, type DataSnapshot } from '../services/dataMigration';
import { downloadFile, saveFileInChunks } from '../services/database';
import {
  logProjectCreate,
  logProjectUpdate,
  logProjectStageChange,
  logProjectDelete,
  logModuleInterfaceChange,
  logModuleConfigModify,
  logModuleDependencyAdjust,
  logModuleLifecycle,
  logComponentCreate,
  logComponentUpdate,
  logComponentDestroy,
  logComponentStateChange,
  logSystemConfigChange,
  logCrossModuleChange,
} from '../services/logger';
import type { ProjectStage, ProjectVersion, ModuleStatus, Module, Component, ComponentStatus } from '../types';
import type { ModalState } from './useModalState';
import type { ProjectState } from './useProjectState';

function incrementComponentNumber(originalNumber: string): string {
  if (!originalNumber) return '1';
  const match = originalNumber.match(/^(.*?)(\d+)(\D*)$/);
  if (!match) return originalNumber + '1';
  const [, prefix, numStr, suffix] = match;
  const num = parseInt(numStr, 10) + 1;
  const newNumStr = num.toString().padStart(numStr.length, '0');
  return prefix + newNumStr + suffix;
}

export function useProjectHandlers(
  project: any,
  modalState: ModalState,
  projectState: ProjectState,
  transferHooks: {
    startTransfer: ReturnType<typeof useTransfer>['startTransfer'];
    updateProgress: ReturnType<typeof useTransfer>['updateProgress'];
    completeTransfer: ReturnType<typeof useTransfer>['completeTransfer'];
    failTransfer: ReturnType<typeof useTransfer>['failTransfer'];
  }
) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const t = useThemeStyles();
  const { startTransfer, updateProgress, completeTransfer, failTransfer } = transferHooks;

  const {
    addModule, addComponent, deleteModule, deleteComponent,
    addSystem, updateSystem, deleteSystem, updateProject, updateComponent,
    deleteDocument, addDesignFile, deleteDesignFile, updateDesignFile,
    addTask, updateTask, deleteTask, currentUser, forceSyncProject,
  } = useApp();

  const getCurrentUser = useCallback(() => ({
    id: currentUser?.id || null,
    username: currentUser?.username || '系统',
  }), [currentUser?.id, currentUser?.username]);

  const {
    setShowStageDropdown, setIsUpdatingStage,
  } = projectState;

  const {
    setSystemForm, setEditingSystem, setSystemTemplate,
    setShowSystemModal, setSoftwareForm, setEditingSoftware,
    setShowSoftwareModal, setEditingDoc, setDocForm,
    setShowDocModal, setEditingDesignFile, setDesignForm,
    setShowDesignModal, setDiagramResult, setShowDiagramModal,
    setDiagramText, setDiagramType, setShowPlanModal,
    setPlanForm, setReviewForm, setShowReviewModal,
    setShowSyncModal, setSyncTargetSoftware, setSyncComponentIds,
    setShowDesignSyncModal, setSyncTargetDesignFile, setSyncDesignModuleIds,
    setShowVersionModal, setEditingVersionSoftware, setVersionInput,
    setShowRollbackModal, setRollbackSnapshot, setRollbackConfirmText,
    setShowComponentEditModal, setEditingComponent, setComponentEditForm,
    setShowComponentStatusModal, setComponentStatusForm,
    setShowComponentCopyModal, setCopyingComponent, setComponentCopyForm,
    setShowModuleEditModal, setEditingModule, setModuleEditForm,
    resetSystemForm,
  } = modalState;

  const incrementVersion = useCallback((version: string): string => {
    const parts = version.split('.');
    if (parts.length >= 3) {
      const patch = parseInt(parts[2]) || 0;
      parts[2] = (patch + 1).toString();
      return parts.join('.');
    }
    return version + '.1';
  }, []);

  const updateProjectStage = useCallback(async (projectId: string, stage: ProjectStage): Promise<boolean> => {
    try {
      updateProject(projectId, { stage });
      return true;
    } catch {
      return false;
    }
  }, [updateProject]);

  const handleOpenSystemModal = useCallback(() => {
    if (project.systems && project.systems.length > 0) {
      const sortedSystems = [...project.systems].sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
      const latestSystem = sortedSystems[0];
      setSystemForm({
        systemNumber: '',
        systemName: latestSystem.systemName,
        productionOrderNumber: latestSystem.productionOrderNumber || '',
        holder: latestSystem.holder || '',
        status: '未投产',
        stage: latestSystem.stage,
        version: latestSystem.version || 'v1.0',
      });
      setSystemTemplate(latestSystem);
    } else {
      setSystemForm({
        systemNumber: '', systemName: '', productionOrderNumber: '',
        holder: '', status: '未投产', stage: project.stage, version: 'v1.0',
      });
      setSystemTemplate(null);
    }
    setEditingSystem(null);
    setShowSystemModal(true);
  }, [project, setSystemForm, setSystemTemplate, setEditingSystem, setShowSystemModal]);

  const handleGenerateDiagram = useCallback((type: 'module' | 'component' | 'table') => {
    const cards = generateDesignDiagrams(project);
    const typeMap: Record<typeof type, string> = {
      'module': 'module-assembly',
      'component': 'component-assembly',
      'table': 'component-table'
    };
    const targetCard = cards.find(c => c.type === typeMap[type]);
    if (targetCard) {
      setDiagramResult([targetCard]);
      setDiagramText(targetCard.content);
      setDiagramType(type);
      setShowDiagramModal(true);
    }
  }, [project, setDiagramResult, setDiagramText, setDiagramType, setShowDiagramModal]);

  const handleAutoGenerateDesignDiagrams = useCallback(() => {
    const cards = generateDesignDiagrams(project, project.designFiles);

    cards.forEach((card) => {
      const cardModuleId = card.id.includes('::')
        ? card.id.split('::')[1]
        : null;

      const fileType = card.type === 'module-assembly' || card.type === 'component-assembly' ? '装配图' : '配套表';
      const category = card.type === 'module-assembly' ? 'module' : 'component';

      const newDesignFile: any = {
        name: card.title,
        type: fileType,
        format: card.format === 'AutoCAD' ? 'AutoCAD' : 'Excel',
        category: category,
        stage: project.stage, version: 'A版', isAutoGenerated: true,
        uploadDate: new Date().toLocaleString(), data: card.content,
        fileSize: card.content ? new Blob([card.content]).size : 0,
      };
      if (cardModuleId) {
        if (card.type === 'module-assembly') newDesignFile.moduleId = cardModuleId;
        else if (card.type === 'component-assembly' || card.type === 'component-table') {
          newDesignFile.componentId = cardModuleId;
        }
      }
      addDesignFile(project.id, newDesignFile);
    });

    if (cards.length === 0) {
      showToast('所有设计文件已存在，无需重复生成', 'info');
    } else {
      setDiagramResult(cards);
      showToast(`已生成并保存 ${cards.length} 个设计图表`, 'success');
    }
  }, [project, addDesignFile, showToast, setDiagramResult]);

  const handleCreateSingleDesignDiagrams = useCallback((options: {
    targetType: 'module' | 'component';
    targetId: string;
    fileType: '装配图' | '配套表';
    format: 'AutoCAD' | 'Excel';
  }) => {
    const { targetType, targetId, fileType, format } = options;

    const findExistingDesignFile = (targetId: string, category: string, fileType: string) => {
      return project.designFiles.find((df: any) =>
        df.isAutoGenerated &&
        df.category === category &&
        ((category === 'module' && df.moduleId === targetId) ||
         (category === 'component' && df.componentId === targetId)) &&
        df.type === fileType
      );
    };

    if (targetType === 'module') {
      const module = project.modules.find((m: any) => m.id === targetId);
      if (!module) {
        showToast('未找到指定模块', 'error');
        return;
      }

      const existingFile = findExistingDesignFile(targetId, 'module', fileType);

      let content = '';
      if (fileType === '装配图') {
        content = generateSingleModuleAssemblyForCAD(module, project);
      }

      if (existingFile) {
        updateDesignFile(project.id, existingFile.id, {
          name: `${module.moduleName} ${fileType}`,
          data: content,
          fileSize: content ? new Blob([content]).size : 0,
          uploadDate: new Date().toLocaleString(),
          version: module.version || existingFile.version,
        });
        showToast(`模块 "${module.moduleName}" 的${fileType}已更新`, 'success');
        return;
      }

      const newDesignFile: any = {
        name: `${module.moduleName} ${fileType}`,
        type: fileType,
        format: 'AutoCAD',
        category: 'module',
        stage: project.stage,
        version: module.version || 'A版',
        isAutoGenerated: true,
        uploadDate: new Date().toLocaleString(),
        data: content,
        fileSize: content ? new Blob([content]).size : 0,
        moduleId: module.id,
      };

      addDesignFile(project.id, newDesignFile);
      showToast(`已为模块 "${module.moduleName}" 创建${fileType}`, 'success');
    } else {
      let targetModule: any = null;
      let component: any = null;

      for (const mod of project.modules) {
        const comp = (mod.components || []).find((c: any) => c.id === targetId);
        if (comp) {
          targetModule = mod;
          component = comp;
          break;
        }
      }

      if (!component || !targetModule) {
        showToast('未找到指定组件', 'error');
        return;
      }

      const existingFile = findExistingDesignFile(targetId, 'component', fileType);

      let content = '';
      if (fileType === '装配图') {
        content = generateSingleComponentAssemblyForCAD(component, targetModule);
      } else {
        content = generateSingleComponentTableForExcel(component, targetModule);
      }

      if (existingFile) {
        updateDesignFile(project.id, existingFile.id, {
          name: `${component.componentName} ${fileType}`,
          data: content,
          fileSize: content ? new Blob([content]).size : 0,
          uploadDate: new Date().toLocaleString(),
          version: component.version || existingFile.version,
        });
        showToast(`组件 "${component.componentName}" 的${fileType}已更新`, 'success');
        return;
      }

      const newDesignFile: any = {
        name: `${component.componentName} ${fileType}`,
        type: fileType,
        format: format,
        category: 'component',
        stage: project.stage,
        version: component.version || 'A版',
        isAutoGenerated: true,
        uploadDate: new Date().toLocaleString(),
        data: content,
        fileSize: content ? new Blob([content]).size : 0,
        moduleId: targetModule.id,
        componentId: component.id,
      };

      addDesignFile(project.id, newDesignFile);
      showToast(`已为组件 "${component.componentName}" 创建${fileType}`, 'success');
    }
  }, [project, addDesignFile, updateDesignFile, showToast]);

  const handleVersionUpdateDesignFile = useCallback((file: any) => {
    if (!file) return;

    const currentVersion = file.version || 'A版';
    const versionLetter = currentVersion.replace(/版$/, '').trim();
    const nextLetter = String.fromCharCode(versionLetter.charCodeAt(0) + 1);
    const newVersion = nextLetter + '版';

    const versionHistory = file.versionHistory || [];
    versionHistory.push({
      version: currentVersion,
      createdAt: file.uploadDate || new Date().toLocaleString(),
      createdBy: 'system',
      note: '版本更新',
    });

    const newDesignFile: any = {
      ...file,
      id: generateId(),
      version: newVersion,
      uploadDate: new Date().toLocaleString(),
      versionHistory: versionHistory,
      isAutoGenerated: true,
    };

    addDesignFile(project.id, newDesignFile);
    showToast(`已为 "${file.name}" 创建新版本 ${newVersion}`, 'success');
  }, [project, addDesignFile, showToast]);

  const handleUploadDesignFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, designFileId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    projectState.setUploadingDesignFile(designFileId);
    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        const existingFile = project.designFiles.find((df: any) => df.id === designFileId);
        if (existingFile) {
          updateDesignFile(project.id, designFileId, {
            data: content, fileSize: file.size,
            uploadDate: new Date().toLocaleString()
          });
          showToast('设计文件已上传', 'success');
        }
      };
      reader.readAsText(file);
    } catch {
      showToast('上传失败', 'error');
    }
    projectState.setUploadingDesignFile(null);
    if (e.target) e.target.value = '';
  }, [project, updateDesignFile, showToast, projectState]);

  const handleSyncDesignFileToModules = useCallback(() => {
    const { syncTargetDesignFile, syncDesignModuleIds } = modalState;
    if (!syncTargetDesignFile || syncDesignModuleIds.length === 0) return;
    let syncedModules = 0, syncedComponents = 0;
    syncDesignModuleIds.forEach(id => {
      const isModule = project.modules.some((m: any) => m.id === id);
      const allComponents = project.modules.flatMap((m: any) => m.components || []);
      const isComponent = allComponents.some((c: any) => c.id === id);
      if (isModule) {
        const module = project.modules.find((m: any) => m.id === id);
        if (module) {
          const existingDesignFile = module.designFiles?.find((df: any) => df.id === syncTargetDesignFile.id);
          if (!existingDesignFile) {
            updateProject(project.id, {
              modules: project.modules.map((m: any) =>
                m.id === id ? { ...m, designFiles: [...(m.designFiles || []), syncTargetDesignFile] } : m
              ),
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
              const existingDesignFile = m.components[compIndex].designFiles?.find(
                (df: any) => df.id === syncTargetDesignFile.id
              );
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
  }, [project, modalState, updateProject, showToast, setShowDesignSyncModal, setSyncTargetDesignFile, setSyncDesignModuleIds]);

  const handleCopyDiagram = useCallback(async () => {
    const { diagramText } = modalState;
    if (diagramText) {
      await navigator.clipboard.writeText(diagramText);
      showToast('已复制到剪贴板', 'success');
    }
  }, [modalState, showToast]);

  const handleCreateModule = useCallback((e: React.FormEvent, moduleForm: any) => {
    e.preventDefault();
    const user = { id: currentUser?.id || null, username: currentUser?.username || '系统' };
    const newModuleState = { projectId: project.id, ...moduleForm, components: [] };
    addModule(project.id, newModuleState);

    logModuleLifecycle(
      moduleForm.id || generateId(),
      moduleForm.moduleName || '新模块',
      user,
      'INIT',
      '创建模块',
      `模块 ${moduleForm.moduleName || '新模块'} 已创建`
    );

    logProjectUpdate(
      project.id,
      project.name,
      user,
      { moduleCount: project.modules?.length || 0 },
      { moduleCount: (project.modules?.length || 0) + 1 },
      `创建新模块: ${moduleForm.moduleName}`
    );

    showToast('模块创建成功', 'success');
    modalState.setShowModuleModal(false);
    modalState.setModuleForm(modalState.resetModuleForm());
  }, [project, addModule, showToast, modalState, currentUser]);

  const handleUpdateModule = useCallback(() => {
    console.log('handleUpdateModule called');
    const { moduleEditForm, editingModule } = modalState;
    const user = { id: currentUser?.id || null, username: currentUser?.username || '系统' };
    console.log('State:', { moduleEditForm, editingModule });
    if (!editingModule) { showToast('编辑模块不存在', 'error'); return; }
    if (!moduleEditForm.moduleNumber.trim()) { showToast('模块编号不能为空', 'error'); return; }
    if (!moduleEditForm.moduleName.trim()) { showToast('模块名称不能为空', 'error'); return; }
    if (moduleEditForm.moduleNumber && !/^[A-Za-z0-9\-_]+$/.test(moduleEditForm.moduleNumber)) {
      showToast('模块编号只能包含字母、数字、连字符和下划线', 'error');
      return;
    }
    if (moduleEditForm.productionOrderNumber && !/^[A-Za-z0-9\-_]+$/.test(moduleEditForm.productionOrderNumber)) {
      showToast('生产指令号只能包含字母、数字、连字符和下划线', 'error');
      return;
    }
    const system = project.systems.find((s: any) => s.id === moduleEditForm.systemId);

    const previousModuleState = {
      moduleNumber: editingModule.moduleNumber,
      moduleName: editingModule.moduleName,
      category: editingModule.category,
      productionOrderNumber: editingModule.productionOrderNumber,
      holder: editingModule.holder,
      stage: editingModule.stage,
      version: editingModule.version,
      systemId: editingModule.systemId,
      systemNumber: editingModule.systemNumber,
      systemName: editingModule.systemName,
    };

    const newModuleState = {
      moduleNumber: moduleEditForm.moduleNumber,
      moduleName: moduleEditForm.moduleName,
      category: moduleEditForm.category,
      productionOrderNumber: moduleEditForm.productionOrderNumber,
      holder: moduleEditForm.holder,
      stage: moduleEditForm.stage,
      version: moduleEditForm.version,
      systemId: moduleEditForm.systemId,
      systemNumber: system?.systemNumber || moduleEditForm.systemNumber,
      systemName: system?.systemName || moduleEditForm.systemName,
    };

    logModuleConfigModify(
      editingModule.id,
      editingModule.moduleName,
      user,
      `更新模块配置: ${editingModule.moduleName} → ${moduleEditForm.moduleName}`,
      '模块信息更新',
      previousModuleState,
      newModuleState
    );

    logProjectUpdate(
      project.id,
      project.name,
      user,
      { modules: project.modules },
      { modules: project.modules },
      `更新模块: ${editingModule.moduleName} → ${moduleEditForm.moduleName}`
    );

    updateProject(project.id, {
      modules: project.modules.map((m: any) =>
        m.id === editingModule.id ? {
          ...m,
          moduleNumber: moduleEditForm.moduleNumber,
          moduleName: moduleEditForm.moduleName,
          category: moduleEditForm.category,
          productionOrderNumber: moduleEditForm.productionOrderNumber || m.productionOrderNumber,
          holder: moduleEditForm.holder || m.holder,
          stage: moduleEditForm.stage,
          version: moduleEditForm.version,
          systemId: moduleEditForm.systemId || m.systemId,
          systemNumber: system?.systemNumber || moduleEditForm.systemNumber,
          systemName: system?.systemName || moduleEditForm.systemName,
        } : m
      ),
    });
    showToast('模块更新成功', 'success');
    modalState.setShowModuleEditModal(false);
    modalState.setEditingModule(null);
  }, [project, modalState, updateProject, showToast, currentUser]);

  const handleCreateSystem = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const user = { id: currentUser?.id || null, username: currentUser?.username || '系统' };
    const { editingSystem, systemForm, systemTemplate, isCopyingSystem } = modalState;
    if (editingSystem) {
      const previousSystemState = {
        systemNumber: editingSystem.systemNumber,
        systemName: editingSystem.systemName,
        productionOrderNumber: editingSystem.productionOrderNumber,
        holder: editingSystem.holder,
        status: editingSystem.status,
        stage: editingSystem.stage,
        version: editingSystem.version,
      };

      updateSystem(project.id, editingSystem.id, systemForm);

      logSystemConfigChange(
        user,
        `系统配置变更: ${editingSystem.systemName} → ${systemForm.systemName}`,
        '更新系统信息',
        previousSystemState,
        systemForm,
        [editingSystem.id]
      );

      showToast('系统已更新', 'success');
    } else {
      modalState.setIsCopyingSystem(true);
      try {
        const newSystemId = addSystem(project.id, {
          projectId: project.id, systemNumber: systemForm.systemNumber, systemName: systemForm.systemName,
          productionOrderNumber: systemForm.productionOrderNumber, holder: systemForm.holder, status: '未投产',
          stage: systemForm.stage, version: systemForm.version,
        });

        logSystemConfigChange(
          user,
          `创建系统: ${systemForm.systemName}`,
          '新建系统',
          {},
          systemForm,
          [newSystemId]
        );

        if (systemTemplate) {
          const templateModules = project.modules.filter((m: any) => m.systemId === systemTemplate.id);
          for (const templateModule of templateModules) {
            const newModuleId = generateId();
            const newModule = {
              ...templateModule, id: newModuleId, systemId: newSystemId,
              productionOrderNumber: systemForm.productionOrderNumber, status: '未投产' as const,
              components: (templateModule.components || []).map((comp: any) => ({
                ...comp, id: generateId(), moduleId: newModuleId,
                productionOrderNumber: systemForm.productionOrderNumber, status: '未投产' as const,
              })),
            };
            addModule(project.id, newModule);
          }
          showToast(`系统创建成功，已复制 ${templateModules.length} 个模块`, templateModules.length > 0 ? 'success' : 'success');
          setTimeout(() => navigate(`/systems/${newSystemId}`), 500);
        } else {
          showToast('系统创建成功', 'success');
          setTimeout(() => navigate(`/systems/${newSystemId}`), 500);
        }
      } catch {
        showToast('系统创建失败', 'error');
      } finally {
        modalState.setIsCopyingSystem(false);
      }
    }
    modalState.setShowSystemModal(false);
    modalState.setEditingSystem(null);
    modalState.setSystemTemplate(null);
    modalState.setSystemForm(modalState.resetSystemForm());
  }, [project, modalState, addSystem, addModule, updateSystem, navigate, showToast, currentUser]);

  const handleCreateSoftware = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const { editingSoftware, softwareForm } = modalState;
    const allComponents = project.modules.flatMap((m: any) => m.components || []);
    const adaptedComponents = allComponents.filter((c: any) => softwareForm.adaptedComponentIds.includes(c.id));
    const adaptedCategories = [...new Set(adaptedComponents
      .map((c: any) => {
        const module = project.modules.find((m: any) => m.components.some((comp: any) => comp.id === c.id));
        return module?.category;
      })
      .filter(Boolean))];
    if (editingSoftware) {
      updateProject(project.id, {
        software: project.software.map((s: any) =>
          s.id === editingSoftware.id ? {
            ...s, name: softwareForm.name, version: softwareForm.version,
            adaptedComponentIds: softwareForm.adaptedComponentIds,
            adaptedComponents: adaptedComponents.map((c: any) => ({ id: c.id, name: c.componentName })),
            adaptedCategories,
          } : s
        ),
      });
      showToast('软件已更新', 'success');
    } else {
      const newSoftware = {
        id: generateId(), name: softwareForm.name, version: softwareForm.version,
        stage: 'C阶段' as ProjectStage, status: '未完成' as const,
        adaptedCategories,
        adaptedComponentTypes: [], adaptedComponentIds: softwareForm.adaptedComponentIds,
        adaptedComponents: adaptedComponents.map((c: any) => ({ id: c.id, name: c.componentName })),
      };
      updateProject(project.id, { software: [...project.software, newSoftware] });
      showToast('软件创建成功', 'success');
    }
    modalState.setShowSoftwareModal(false);
    modalState.setEditingSoftware(null);
    modalState.setSoftwareForm({ name: '', version: '', adaptedComponentIds: [] });
  }, [project, modalState, updateProject, showToast]);

  const handleDeleteSoftware = useCallback((softwareId: string) => {
    projectState.openConfirmModal('确认删除', '确定要删除该软件吗？', () => {
      updateProject(project.id, { software: project.software.filter((s: any) => s.id !== softwareId) });
      showToast('软件已删除', 'success');
      projectState.closeConfirmModal();
    });
  }, [project, updateProject, showToast, projectState]);

  const handleDownloadSoftware = useCallback(async (soft: any) => {
    if (soft.fileUrl) {
      const transferId = startTransfer(soft.fileName || soft.name, soft.fileSize || 0, 'download', 'software');
      updateProgress(transferId, 90);
      try {
        const link = document.createElement('a');
        link.href = soft.fileUrl;
        link.download = soft.fileName || soft.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        completeTransfer(transferId);
        showToast('下载成功', 'success');
      } catch {
        failTransfer(transferId, '下载失败');
        showToast('下载失败', 'error');
      }
      return;
    }
    if (!soft.dbId) { showToast('文件未存储在数据库中', 'error'); return; }
    const transferId = startTransfer(soft.fileName || soft.name, soft.fileSize || 0, 'download', 'software');
    updateProgress(transferId, 50);
    try {
      const result = await downloadFile(soft.dbId, soft.fileName);
      if (!result.blob) {
        updateProgress(transferId, 0);
        failTransfer(transferId, result.error || '文件不存在');
        showToast(result.error || '文件不存在', 'error');
        return;
      }
      if (!result.isValid) {
        updateProgress(transferId, 0);
        failTransfer(transferId, result.error || '文件格式无效');
        showToast(result.error || '文件格式无效', 'error');
        return;
      }
      updateProgress(transferId, 90);
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      completeTransfer(transferId);
      showToast('下载成功', 'success');
    } catch {
      failTransfer(transferId, '下载失败');
      showToast('下载失败', 'error');
    }
  }, [startTransfer, updateProgress, completeTransfer, failTransfer, showToast]);

  const handleUploadSoftware = useCallback(async (softwareId: string, file: File) => {
    const fileId = `soft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    let md5 = '';
    let uploadPercent = 0;

    try {
      updateProject(project.id, {
        software: project.software.map((s: any) =>
          s.id === softwareId ? {
            ...s,
            uploadProgress: 0,
            uploadStage: 'md5',
            status: '上传中',
          } : s
        ),
      });
      forceSyncProject(project.id);

      md5 = await calculateFileMD5Async(file, (progress: any) => {
        uploadPercent = Math.round(progress.percent * 0.3);
        updateProject(project.id, {
          software: project.software.map((s: any) =>
            s.id === softwareId ? { ...s, uploadProgress: uploadPercent } : s
          ),
        });
      });

      updateProject(project.id, {
        software: project.software.map((s: any) =>
          s.id === softwareId ? { ...s, uploadStage: 'uploading', uploadProgress: 30 } : s
        ),
      });
      forceSyncProject(project.id);

      await saveFileInChunks(
        file,
        fileId,
        project.id,
        'software',
        (progress: any) => {
          const realProgress = 30 + Math.round(progress.percent * 0.7);
          updateProject(project.id, {
            software: project.software.map((s: any) =>
              s.id === softwareId ? { ...s, uploadProgress: realProgress } : s
            ),
          });
        }
      );

      updateProject(project.id, {
        software: project.software.map((s: any) =>
          s.id === softwareId ? {
            ...s,
            fileName: file.name,
            fileSize: file.size,
            md5,
            uploadDate: new Date().toISOString(),
            dbId: fileId,
            status: '已完成',
            uploadProgress: 100,
            uploadStage: 'complete',
          } : s
        ),
      });
      forceSyncProject(project.id);

      showToast(`文件 ${file.name} 上传成功`, 'success');
    } catch (e) {
      console.error('Upload failed:', e);
      updateProject(project.id, {
        software: project.software.map((s: any) =>
          s.id === softwareId ? {
            ...s,
            status: '未完成',
            uploadProgress: 0,
            uploadStage: undefined,
          } : s
        ),
      });
      forceSyncProject(project.id);
      showToast('文件上传失败', 'error');
    }
  }, [project, updateProject, forceSyncProject, showToast]);

  const handleOpenSyncModal = useCallback((soft: any) => {
    setSyncTargetSoftware(soft);
    setSyncComponentIds(soft.adaptedComponentIds || []);
    setShowSyncModal(true);
  }, [setSyncTargetSoftware, setSyncComponentIds, setShowSyncModal]);

  const handleSyncSoftwareToComponents = useCallback((software: Software, componentIds: string[]) => {
    if (!software) return;
    componentIds.forEach(compId => {
      project.modules.forEach((module: any) => {
        const comp = module.components.find((c: any) => c.id === compId);
        if (comp) {
          const existingSoftware = comp.burnedSoftware || [];
          const softwareEntry = {
            id: generateId(), softwareId: software.id,
            softwareName: software.name, softwareVersion: software.version,
            burnedAt: new Date().toISOString(), burnedBy: currentUser?.username || '系统',
          };
          const existingIndex = existingSoftware.findIndex((s: any) => s.softwareId === software.id);
          if (existingIndex >= 0) existingSoftware[existingIndex] = softwareEntry;
          else existingSoftware.push(softwareEntry);
          updateComponent(project.id, module.id, compId, {
            burnedSoftware: existingSoftware,
            logs: [...(comp.logs || []), {
              id: generateId(),
              action: `同步软件: ${software.name} v${software.version}`,
              timestamp: new Date().toISOString(),
              userId: currentUser?.id || '',
              username: currentUser?.username || '系统',
            }],
          });
        }
      });
    });
    showToast(`已同步软件到 ${componentIds.length} 个组件`, 'success');
    modalState.setShowSyncModal(false);
    modalState.setSyncTargetSoftware(null);
    modalState.setSyncComponentIds([]);
  }, [project, modalState, updateComponent, currentUser, showToast]);

  const handleUpdateDocument = useCallback(() => {
    const { editingDoc, docForm } = modalState;
    if (!docForm.name.trim()) { showToast('请填写文档名称', 'error'); return; }
    if (editingDoc) {
      updateProject(project.id, {
        documents: project.documents.map((d: any) => d.id === editingDoc.id ? { ...d, ...docForm } : d),
      });
      showToast('文档已更新', 'success');
    } else {
      updateProject(project.id, {
        documents: [...project.documents, {
          id: generateId(), documentNumber: docForm.documentNumber, name: docForm.name,
          type: docForm.type || '设计文档', stage: docForm.stage, status: '未完成' as const,
        }],
      });
      showToast('文档已创建', 'success');
    }
    modalState.setShowDocModal(false);
    modalState.setEditingDoc(null);
    modalState.setDocForm({ documentNumber: '', name: '', type: '', stage: 'F阶段', version: 'A' });
  }, [project, modalState, updateProject, showToast]);

  const handleUploadDocument = useCallback((docId: string, file: File) => {
    const validTypes = ['.doc', '.docx', '.pdf'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const maxSize = 50 * 1024 * 1024;

    if (!validTypes.includes(fileExtension)) {
      showToast('请上传 .doc、.docx 或 .pdf 格式的文件', 'error');
      return;
    }

    if (file.size > maxSize) {
      showToast('文件大小不能超过 50MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const updatedDocuments = project.documents.map((d: any) =>
        d.id === docId
          ? {
              ...d,
              fileName: file.name,
              fileUrl: reader.result as string,
              format: fileExtension,
              fileSize: file.size,
              status: '已完成' as const,
            }
          : d
      );
      updateProject(project.id, { documents: updatedDocuments });
      showToast(`文件 ${file.name} 上传成功`, 'success');
    };
    reader.onerror = () => {
      showToast('文件读取失败', 'error');
    };
    reader.readAsDataURL(file);
  }, [project, updateProject, showToast]);

  const handleDownloadDocument = useCallback((doc: any) => {
    if (!doc.fileUrl) {
      showToast('文件不存在，无法下载', 'error');
      return;
    }
    const link = document.createElement('a');
    link.href = doc.fileUrl;
    link.download = doc.fileName || `${doc.name}.${doc.format || 'doc'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`文件 ${doc.fileName || doc.name} 下载成功`, 'success');
  }, [showToast]);

  const handleCreateDocumentsFromImport = useCallback((newDocuments: any[]) => {
    if (!newDocuments || newDocuments.length === 0) return;
    const documentsToAdd = newDocuments.map((doc: any) => ({
      id: doc.id || generateId(),
      documentNumber: doc.documentNumber || '',
      name: doc.name,
      type: doc.type || '设计文档',
      stage: doc.stage || project.stage,
      version: doc.version || 'A',
      status: '未完成' as const,
    }));
    updateProject(project.id, {
      documents: [...project.documents, ...documentsToAdd],
    });
    showToast(`成功创建 ${documentsToAdd.length} 个文档`, 'success');
  }, [project, updateProject, showToast]);

  const getSearchResults = useCallback(() => {
    const term = projectState.globalSearchTerm.toLowerCase();
    const results: { type: string; id: string; name: string; number: string; url: string }[] = [];
    project.systems.forEach((s: any) => {
      if (s.systemName.toLowerCase().includes(term) || s.systemNumber.toLowerCase().includes(term)) {
        results.push({ type: '系统', id: s.id, name: s.systemName, number: s.systemNumber, url: `#systems` });
      }
    });
    project.modules.forEach((m: any) => {
      if (m.moduleName.toLowerCase().includes(term) || m.moduleNumber.toLowerCase().includes(term)) {
        results.push({ type: '模块', id: m.id, name: m.moduleName, number: m.moduleNumber, url: `/modules/${m.id}` });
      }
      m.components.forEach((c: any) => {
        if (c.componentName.toLowerCase().includes(term) || c.componentNumber.toLowerCase().includes(term)) {
          results.push({ type: '组件', id: c.id, name: c.componentName, number: c.componentNumber, url: `/components/${c.id}` });
        }
      });
    });
    project.documents.forEach((d: any) => {
      if (d.name.toLowerCase().includes(term)) {
        results.push({ type: '文档', id: d.id, name: d.name, number: d.format || '', url: `#documents` });
      }
    });
    project.software.forEach((s: any) => {
      if (s.name.toLowerCase().includes(term) || s.version.toLowerCase().includes(term)) {
        results.push({ type: '软件', id: s.id, name: s.name, number: s.version, url: `/software/${s.id}` });
      }
    });
    return results;
  }, [project, projectState.globalSearchTerm]);

  const handleAddCategory = useCallback(() => {
    const { newCategory } = modalState;
    if (!newCategory.trim()) { showToast('请输入种类名称', 'error'); return; }
    const categories = project.categories || [];
    if (categories.includes(newCategory.trim())) { showToast('该种类已存在', 'error'); return; }
    updateProject(project.id!, { categories: [...categories, newCategory.trim()] });
    showToast('种类添加成功', 'success');
    modalState.setNewCategory('');
    modalState.setShowCategoryModal(false);
  }, [project, modalState, updateProject, showToast]);

  const handleCreateReview = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const { reviewForm } = modalState;
    if (!reviewForm.title.trim() || !reviewForm.content.trim()) {
      showToast('请填写评审标题和内容', 'error');
      return;
    }
    const selectedSystemName = reviewForm.systemName;
    const categories = [...(project.categories || [])];
    if (selectedSystemName && !categories.includes(selectedSystemName)) {
      categories.unshift(selectedSystemName);
    }
    const newReview = {
      id: generateId(), title: reviewForm.title, content: reviewForm.content,
      status: '待评审' as const,
      createdAt: new Date().toLocaleString('zh-CN'), createdBy: currentUser?.username || '未知用户',
      systemName: selectedSystemName,
      categories: categories, files: [],
    };
    updateProject(project.id!, { reviews: [...(project.reviews || []), newReview] });
    showToast('评审创建成功', 'success');
    modalState.setShowReviewModal(false);
    modalState.setReviewForm({ title: '', content: '' });
  }, [project, modalState, updateProject, currentUser, showToast]);

  const handleReviewAction = useCallback((reviewId: string, status: '通过' | '不通过' | '需修改') => {
    if (!project.reviews) return;
    const updatedReviews = project.reviews.map((r: any) =>
      r.id === reviewId ? {
        ...r, status, reviewer: currentUser?.username || '未知用户',
        reviewDate: new Date().toLocaleString('zh-CN'),
      } : r
    );
    updateProject(project.id!, { reviews: updatedReviews });
    showToast(`评审已${status}`, 'success');
  }, [project, updateProject, currentUser, showToast]);

  const handleReviewFileUploadWithDrag = useCallback(async (reviewId: string, files: FileList | null, category?: string, applyToAllAction?: 'replace' | 'keep') => {
    if (!files || files.length === 0) return;
    const targetCategory = category || '未分类';
    const review = (project.reviews || []).find((r: any) => r.id === reviewId);
    if (!review) return;

    const existingFiles = review.files?.filter((f: any) => f.category === targetCategory) || [];
    let successCount = 0;
    let skipCount = 0;
    let replaceCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const existingFile = existingFiles.find((f: any) => f.name === file.name);

      if (existingFile && applyToAllAction === undefined) {
        return new Promise<void>((resolve) => {
          modalState.setFileConflictInfo({
            reviewId,
            category: targetCategory,
            existingFile,
            newFile: { name: file.name, size: file.size, type: file.type },
            resolve: (action: 'replace' | 'keep') => {
              if (action === 'keep') {
                skipCount++;
              } else {
                replaceCount++;
                const reader = new FileReader();
                reader.onload = () => {
                  const newFileData = {
                    id: generateId(),
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    uploadDate: new Date().toLocaleString('zh-CN'),
                    uploadedBy: currentUser?.username || '未知用户',
                    category: targetCategory,
                    dataUrl: reader.result as string,
                  };
                  const updatedReviews = (project.reviews || []).map((r: any) =>
                    r.id === reviewId
                      ? {
                          ...r,
                          files: [...(r.files || []).filter((f: any) => f.id !== existingFile.id), newFileData],
                        }
                      : r
                  );
                  updateProject(project.id!, { reviews: updatedReviews });
                  successCount++;
                  if (successCount + skipCount === files.length) {
                    showToast(`上传完成: ${successCount}个已替换, ${skipCount}个已跳过`, 'success');
                  }
                  resolve();
                };
                reader.readAsDataURL(file);
              }
            },
          });
          modalState.setShowFileConflictModal(true);
        });
      }

      if (existingFile && applyToAllAction === 'keep') {
        skipCount++;
        continue;
      }

      if (existingFile && applyToAllAction === 'replace') {
        replaceCount++;
        const reader = new FileReader();
        await new Promise<void>((res) => {
          reader.onload = () => {
            const newFileData = {
              id: generateId(),
              name: file.name,
              size: file.size,
              type: file.type,
              uploadDate: new Date().toLocaleString('zh-CN'),
              uploadedBy: currentUser?.username || '未知用户',
              category: targetCategory,
              dataUrl: reader.result as string,
            };
            const updatedReviews = (project.reviews || []).map((r: any) =>
              r.id === reviewId
                ? {
                    ...r,
                    files: [...(r.files || []).filter((f: any) => f.id !== existingFile.id), newFileData],
                  }
                : r
            );
            updateProject(project.id!, { reviews: updatedReviews });
            successCount++;
            res();
          };
          reader.readAsDataURL(file);
        });
        continue;
      }

      const reader = new FileReader();
      await new Promise<void>((res) => {
        reader.onload = () => {
          const newFileData = {
            id: generateId(),
            name: file.name,
            size: file.size,
            type: file.type,
            uploadDate: new Date().toLocaleString('zh-CN'),
            uploadedBy: currentUser?.username || '未知用户',
            category: targetCategory,
            dataUrl: reader.result as string,
          };
          const updatedReviews = (project.reviews || []).map((r: any) =>
            r.id === reviewId ? { ...r, files: [...(r.files || []), newFileData] } : r
          );
          updateProject(project.id!, { reviews: updatedReviews });
          successCount++;
          res();
        };
        reader.readAsDataURL(file);
      });
    }

    if (successCount > 0 || skipCount > 0) {
      showToast(`成功上传 ${successCount} 个文件${skipCount > 0 ? `, ${skipCount} 个已跳过` : ''}`, 'success');
    }
  }, [project, updateProject, currentUser, showToast, modalState]);

  const handleDownloadReviewFile = useCallback((reviewId: string, fileId: string) => {
    const review = (project.reviews || []).find((r: any) => r.id === reviewId);
    const file = review?.files?.find((f: any) => f.id === fileId);
    if (!file || !file.dataUrl) return;
    const link = document.createElement('a');
    link.href = file.dataUrl;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`文件 ${file.name} 下载成功`, 'success');
  }, [project, showToast]);

  const handleDownloadReviewFolder = useCallback(async (reviewId: string) => {
    const review = (project.reviews || []).find((r: any) => r.id === reviewId);
    if (!review?.files?.length) { showToast('没有可下载的文件', 'error'); return; }

    try {
      showToast('正在压缩文件夹...', 'info');
      const blob = await compressFolderToZip(review.files, review.title);
      const filename = generateZipFilename(review.title);
      downloadBlob(blob, filename);
      showToast('文件夹下载成功', 'success');
    } catch (error) {
      console.error('Download failed:', error);
      showToast('文件夹下载失败', 'error');
      review.files.forEach((file: any) => {
        if (file.dataUrl) setTimeout(() => {
          const link = document.createElement('a');
          link.href = file.dataUrl!;
          link.download = `${file.category || '未分类'}_${file.name}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }, 100);
      });
      showToast('文件夹下载开始(兼容模式)', 'success');
    }
  }, [project, showToast]);

  const handleDownloadReviewCategoryFiles = useCallback(async (reviewId: string, category: string) => {
    const review = (project.reviews || []).find((r: any) => r.id === reviewId);
    const categoryFiles = review?.files?.filter((f: any) => f.category === category) || [];
    if (!categoryFiles.length) { showToast('该文件夹没有文件', 'error'); return; }

    try {
      showToast('正在压缩文件夹...', 'info');
      const blob = await compressFolderToZip(categoryFiles, `${review.title}_${category}`);
      const filename = generateZipFilename(`${review.title}_${category}`);
      downloadBlob(blob, filename);
      showToast(`${category} 文件夹下载成功`, 'success');
    } catch (error) {
      console.error('Category download failed:', error);
      categoryFiles.forEach((file: any, index: number) => {
        if (file.dataUrl) setTimeout(() => {
          const link = document.createElement('a');
          link.href = file.dataUrl!;
          link.download = file.name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }, index * 100);
      });
      showToast(`${category} 文件夹下载开始(兼容模式)`, 'success');
    }
  }, [project, showToast]);

  const handleDeleteReviewFile = useCallback((reviewId: string, fileId: string) => {
    projectState.openConfirmModal('确认删除', '确定要删除这个文件吗？此操作不可撤销。', () => {
      const updatedReviews = (project.reviews || []).map((r: any) =>
        r.id === reviewId ? { ...r, files: (r.files || []).filter((f: any) => f.id !== fileId) } : r
      );
      updateProject(project.id!, { reviews: updatedReviews });
      showToast('文件已删除', 'success');
      projectState.closeConfirmModal();
    });
  }, [project, updateProject, showToast, projectState]);

  const handleDeleteReviewCategory = useCallback((reviewId: string, category: string) => {
    const categoryFiles = (project.reviews || []).find((r: any) => r.id === reviewId)?.files?.filter((f: any) => f.category === category || f.category.startsWith(`${category}/`)) || [];
    const subcategories = (project.reviews || []).find((r: any) => r.id === reviewId)?.categories?.filter((c: string) => c === category || c.startsWith(`${category}/`)) || [];
    projectState.openConfirmModal('确认删除', `确定要删除 "${category}" 文件夹及其所有子文件夹和文件 (${categoryFiles.length}个文件, ${subcategories.length}个子文件夹) 吗？此操作不可撤销。`, () => {
      const updatedReviews = (project.reviews || []).map((r: any) =>
        r.id === reviewId ? {
          ...r,
          files: (r.files || []).filter((f: any) => f.category !== category && !f.category.startsWith(`${category}/`)),
          categories: (r.categories || []).filter((c: string) => c !== category && !c.startsWith(`${category}/`))
        } : r
      );
      updateProject(project.id!, { reviews: updatedReviews });
      showToast(`${category} 文件夹已删除`, 'success');
      projectState.closeConfirmModal();
    });
  }, [project, updateProject, showToast, projectState]);

  const handleAddReviewCategory = useCallback((reviewId: string, newCategory: string, parentPath?: string) => {
    const fullCategoryPath = parentPath ? `${parentPath}/${newCategory}` : newCategory;
    const updatedReviews = (project.reviews || []).map((r: any) =>
      r.id === reviewId ? { ...r, categories: [...(r.categories || []), fullCategoryPath] } : r
    );
    updateProject(project.id!, { reviews: updatedReviews });
    showToast(`文件夹 "${fullCategoryPath}" 创建成功`, 'success');
  }, [project, updateProject, showToast]);

  const handleDeleteReview = useCallback((reviewId: string) => {
    projectState.openConfirmModal('确认删除评审', '确定要删除这个评审及其所有文件吗？此操作不可撤销。', () => {
      const updatedReviews = (project.reviews || []).filter((r: any) => r.id !== reviewId);
      updateProject(project.id!, { reviews: updatedReviews });
      showToast('评审已删除', 'success');
      projectState.closeConfirmModal();
    });
  }, [project, updateProject, showToast, projectState]);

  const handleModuleEdit = useCallback((module: Module) => {
    modalState.setEditingModule(module);
    modalState.setModuleEditForm({
      moduleNumber: module.moduleNumber || '', moduleName: module.moduleName || '',
      category: module.category || '',
      systemId: module.systemId || '',
      systemNumber: module.systemNumber || '', systemName: module.systemName || '',
      productionOrderNumber: module.productionOrderNumber || '', holder: module.holder || '',
      status: (module.status || '未投产') as ModuleStatus,
      stage: (module.stage || 'C阶段') as ProjectStage,
      version: module.version || 'v1.0',
      systemSearch: '',
    });
    modalState.setShowModuleEditModal(true);
  }, [modalState]);

  const handleModuleDelete = useCallback((moduleId: string) => {
    const user = { id: currentUser?.id || null, username: currentUser?.username || '系统' };
    const moduleToDelete = project.modules.find((m: any) => m.id === moduleId);

    projectState.openConfirmModal('确认删除', '确定要删除该模块吗？', () => {
      if (moduleToDelete) {
        logModuleLifecycle(
          moduleToDelete.id,
          moduleToDelete.moduleName,
          user,
          'DESTROY',
          '删除模块',
          `模块 ${moduleToDelete.moduleName} 已被删除`
        );

        logProjectUpdate(
          project.id,
          project.name,
          user,
          { moduleCount: project.modules?.length || 0 },
          { moduleCount: (project.modules?.length || 0) - 1 },
          `删除模块: ${moduleToDelete.moduleName}`
        );
      }

      deleteModule(project.id, moduleId);
      showToast('模块已删除', 'success');
      projectState.closeConfirmModal();
    });
  }, [project, deleteModule, showToast, projectState, currentUser]);

  const handleModuleCopy = useCallback((module: Module, newNumber: string) => {
    const newModuleId = generateId();
    const copiedComponents = module.components.map((c: any) => ({
      ...c,
      id: generateId(),
      moduleId: newModuleId,
      status: '未投产' as const,
    }));
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
      systemId: module.systemId,
      components: copiedComponents,
    });
    showToast('模块复制成功', 'success');
  }, [project, addModule, showToast]);

  const handleBatchUpdateModuleStage = useCallback(async (moduleIds: string[], stage: ProjectStage) => {
    updateProject(project.id, {
      modules: project.modules.map((m: any) =>
        moduleIds.includes(m.id) ? { ...m, stage } : m
      ),
    });
  }, [project, updateProject]);

  const handleBatchUpdateModuleVersion = useCallback(async (moduleIds: string[], version: string) => {
    updateProject(project.id, {
      modules: project.modules.map((m: any) =>
        moduleIds.includes(m.id) ? { ...m, version } : m
      ),
    });
  }, [project, updateProject]);

  const handleModuleStatusChange = useCallback(async (
    moduleId: string,
    newStatus: string,
    reason: string
  ) => {
    const user = { id: currentUser?.id || null, username: currentUser?.username || '系统' };
    const module = project.modules.find((m: any) => m.id === moduleId);

    if (!module) {
      showToast('模块不存在', 'error');
      return;
    }

    const previousState = {
      status: module.status,
    };

    const newState = {
      status: newStatus,
    };

    logComponentStateChange(
      moduleId,
      module.moduleName,
      user,
      'STATE_CHANGE',
      previousState,
      newState,
      reason,
      'INFO',
      {
        moduleId: module.id,
        moduleNumber: module.moduleNumber,
        systemId: module.systemId,
        systemName: module.systemName,
        previousStatus: module.status,
        newStatus: newStatus,
        timestamp: new Date().toISOString(),
      }
    );

    logModuleConfigModify(
      moduleId,
      module.moduleName,
      user,
      `模块状态变更: ${module.status} → ${newStatus}`,
      reason,
      previousState,
      newState,
      []
    );

    updateProject(project.id, {
      modules: project.modules.map((m: any) =>
        m.id === moduleId ? { ...m, status: newStatus } : m
      ),
    });

    showToast(`模块状态已更新为 ${newStatus}`, 'success');
  }, [project, updateProject, showToast, currentUser]);

  const handleBatchDeleteModule = useCallback(async (moduleIds: string[]) => {
    updateProject(project.id, {
      modules: project.modules.filter((m: any) => !moduleIds.includes(m.id)),
    });
  }, [project, updateProject]);

  const handleComponentEdit = useCallback((component: any) => {
    modalState.setEditingComponent(component);
    const holderArray = component.holder ? (Array.isArray(component.holder) ? component.holder : [component.holder]) : [];
    const nameArray = component.componentName ? (Array.isArray(component.componentName) ? component.componentName : [component.componentName]) : [];
    modalState.setComponentEditForm({
      componentName: nameArray, componentNumber: component.componentNumber,
      productionOrderNumber: component.productionOrderNumber || '', stage: component.stage || '',
      version: component.version || '', moduleId: component.moduleId,
      holder: holderArray, repairOrderNumber: component.repairOrderNumber || '',
      protectionOrderNumber: component.protectionOrderNumber || '',
    });
    modalState.setShowComponentEditModal(true);
  }, [modalState]);

  const handleComponentDelete = useCallback((moduleId: string, componentId: string) => {
    const user = { id: currentUser?.id || null, username: currentUser?.username || '系统' };
    const module = project.modules.find((m: any) => m.id === moduleId);
    const component = module?.components?.find((c: any) => c.id === componentId);

    projectState.openConfirmModal('确认删除', '确定要删除该组件吗？', () => {
      if (component) {
        logComponentDestroy(
          componentId,
          component.componentName,
          user,
          '删除组件',
          component
        );

        logModuleConfigModify(
          moduleId,
          module?.moduleName || '未知模块',
          user,
          `从模块中删除组件: ${component.componentName}`,
          undefined,
          { componentCount: module?.components?.length || 0 },
          { componentCount: Math.max(0, (module?.components?.length || 0) - 1) }
        );
      }

      deleteComponent(project.id, moduleId, componentId);
      showToast('组件已删除', 'success');
      projectState.closeConfirmModal();
    });
  }, [project, deleteComponent, showToast, projectState, currentUser]);

  const handleBatchDeleteComponent = useCallback(async (moduleIdComponentIds: { moduleId: string; componentId: string }[]) => {
    for (const { moduleId, componentId } of moduleIdComponentIds) {
      await deleteComponent(project.id, moduleId, componentId);
    }
    showToast(`成功删除 ${moduleIdComponentIds.length} 个组件`, 'success');
  }, [project.id, deleteComponent, showToast]);

  const handleBatchUpdateComponentStatus = useCallback(async (moduleIdComponentIds: { moduleId: string; componentId: string }[], newStatus: string) => {
    for (const { moduleId, componentId } of moduleIdComponentIds) {
      const module = project.modules.find((m: any) => m.id === moduleId);
      if (module) {
        const updatedComponents = module.components.map((c: any) =>
          c.id === componentId ? { ...c, status: newStatus } : c
        );
        await updateProject(project.id, {
          modules: project.modules.map((m: any) =>
            m.id === moduleId ? { ...m, components: updatedComponents } : m
          )
        });
      }
    }
    showToast(`成功更新 ${moduleIdComponentIds.length} 个组件状态为 "${newStatus}"`, 'success');
  }, [project, updateProject, showToast]);

  const handleBatchUpdateComponentStage = useCallback(async (moduleIdComponentIds: { moduleId: string; componentId: string }[], newStage: string) => {
    for (const { moduleId, componentId } of moduleIdComponentIds) {
      const module = project.modules.find((m: any) => m.id === moduleId);
      if (module) {
        const updatedComponents = module.components.map((c: any) =>
          c.id === componentId ? { ...c, stage: newStage } : c
        );
        await updateProject(project.id, {
          modules: project.modules.map((m: any) =>
            m.id === moduleId ? { ...m, components: updatedComponents } : m
          )
        });
      }
    }
    showToast(`成功更新 ${moduleIdComponentIds.length} 个组件阶段为 "${newStage}"`, 'success');
  }, [project, updateProject, showToast]);

  const handleBatchUpdateComponentVersion = useCallback(async (moduleIdComponentIds: { moduleId: string; componentId: string }[], newVersion: string) => {
    for (const { moduleId, componentId } of moduleIdComponentIds) {
      const module = project.modules.find((m: any) => m.id === moduleId);
      if (module) {
        const updatedComponents = module.components.map((c: any) =>
          c.id === componentId ? { ...c, version: newVersion } : c
        );
        await updateProject(project.id, {
          modules: project.modules.map((m: any) =>
            m.id === moduleId ? { ...m, components: updatedComponents } : m
          )
        });
      }
    }
    showToast(`成功更新 ${moduleIdComponentIds.length} 个组件版本为 "${newVersion}"`, 'success');
  }, [project, updateProject, showToast]);

  const handleComponentStatusUpdate = useCallback((component: any, newStatus: string, reason?: string) => {
    const moduleId = component.moduleId;
    updateComponent(project.id, moduleId, component.id, {
      status: newStatus as any,
      logs: [...(component.logs || []), {
        id: generateId(),
        action: `状态变更：${component.status} → ${newStatus}`,
        timestamp: new Date().toISOString(),
        userId: currentUser?.id || '',
        username: currentUser?.username || '',
        details: reason || '无',
      }],
    });
    showToast('组件状态已更新', 'success');
  }, [project, updateComponent, currentUser, showToast]);

  const handleComponentCopy = useCallback((component: any) => {
    modalState.setCopyingComponent(component);
    const originalNumber = component.componentNumber || '';
    const incrementedNumber = incrementComponentNumber(originalNumber);
    modalState.setComponentCopyForm({ moduleId: component.moduleId, componentNumber: incrementedNumber });
    modalState.setShowComponentCopyModal(true);
  }, [modalState]);

  const handleComponentStatusChange = useCallback((component: any) => {
    modalState.setEditingComponent(component);
    modalState.setComponentStatusForm({ status: component.status, reason: '' });
    modalState.setShowComponentStatusModal(true);
  }, [modalState]);

  const handleSystemEdit = useCallback((system: any) => {
    modalState.setSystemForm({
      systemNumber: system.systemNumber, systemName: system.systemName,
      productionOrderNumber: system.productionOrderNumber, holder: system.holder || '',
      status: system.status, stage: system.stage, version: system.version || 'v1.0',
    });
    modalState.setEditingSystem(system);
    modalState.setShowSystemModal(true);
  }, [modalState]);

  const handleSystemDelete = useCallback((systemId: string) => {
    const user = { id: currentUser?.id || null, username: currentUser?.username || '系统' };
    const systemToDelete = project.systems.find((s: any) => s.id === systemId);

    projectState.openConfirmModal('确认删除', '确定要删除该系统吗？', () => {
      if (systemToDelete) {
        logSystemConfigChange(
          user,
          `删除系统: ${systemToDelete.systemName}`,
          '删除系统',
          systemToDelete,
          {},
          [systemId]
        );
      }

      deleteSystem(project.id, systemId);
      showToast('系统已删除', 'success');
      projectState.closeConfirmModal();
    });
  }, [project, deleteSystem, showToast, projectState, currentUser]);

  const handleBatchDeleteSystem = useCallback(async (systemIds: string[]) => {
    for (const systemId of systemIds) {
      await deleteSystem(project.id, systemId);
    }
    showToast(`成功删除 ${systemIds.length} 个系统`, 'success');
  }, [project.id, deleteSystem, showToast]);

  const handleBatchUpdateSystemStatus = useCallback(async (systemIds: string[], newStatus: string) => {
    const updatedSystems = project.systems.map((s: any) =>
      systemIds.includes(s.id) ? { ...s, status: newStatus } : s
    );
    await updateProject(project.id, { systems: updatedSystems });
    showToast(`成功更新 ${systemIds.length} 个系统状态为 "${newStatus}"`, 'success');
  }, [project, updateProject, showToast]);

  const handleTaskToggleComplete = useCallback((task: any) => {
    const newTask = { ...task, status: '已完成' as const, completedAt: new Date().toISOString().split('T')[0] };
    updateProject(project.id!, {
      tasks: (project.tasks || []).map((t: any) => t.id === task.id ? newTask : t),
    });
    if (task.taskId) updateTask(task.taskId, { status: '已完成', completedAt: new Date().toISOString().split('T')[0] });
    showToast('计划已完成', 'success');
  }, [project, updateProject, updateTask, showToast]);

  const handleTaskDelete = useCallback((taskId: string) => {
    projectState.openConfirmModal('确认删除', '确定要删除该计划吗？', () => {
      const newTasks = (project.tasks || []).filter((t: any) => t.id !== taskId);
      updateProject(project.id!, { tasks: newTasks });
      if (project.tasks?.find((t: any) => t.id === taskId)?.taskId) {
        deleteTask(project.tasks?.find((t: any) => t.id === taskId)?.taskId!);
      }
      showToast('计划已删除', 'success');
      projectState.closeConfirmModal();
    });
  }, [project, updateProject, deleteTask, showToast, projectState]);

  const handleCreateSnapshot = useCallback(async () => {
    const snapshot = await createPreUpdateSnapshot();
    showToast(`数据快照已创建，包含 ${snapshot.metadata.projectCount || 0} 个项目`, 'success');
  }, [showToast]);

  const handleOpenRollbackModal = useCallback(() => {
    const snapshot = getRollbackSnapshot();
    if (snapshot) {
      modalState.setRollbackSnapshot(snapshot);
      modalState.setShowRollbackModal(true);
    } else {
      showToast('暂无可用回滚快照', 'warning');
    }
  }, [modalState, showToast]);

  const handleRollback = useCallback(async () => {
    const { rollbackConfirmText } = modalState;
    if (rollbackConfirmText !== '确认回滚') { showToast('请输入确认文字', 'error'); return; }
    const result = rollbackData();
    if (result.success) {
      showToast(result.message, 'success');
      window.location.reload();
    } else {
      showToast(result.message, 'error');
    }
    modalState.setShowRollbackModal(false);
    modalState.setRollbackSnapshot(null);
    modalState.setRollbackConfirmText('');
  }, [modalState, showToast]);

  const handleComponentEditSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const { componentEditForm, editingComponent } = modalState;
    if (!editingComponent) { showToast('编辑组件不存在', 'error'); return; }
    const selectedNames = Array.isArray(componentEditForm.componentName) ? componentEditForm.componentName.join(', ') : componentEditForm.componentName;
    const selectedHolders = Array.isArray(componentEditForm.holder) ? componentEditForm.holder.join(', ') : componentEditForm.holder;
    const oldModuleId = editingComponent.moduleId;
    const newModuleId = componentEditForm.moduleId;

    if (oldModuleId !== newModuleId) {
      updateComponent(project.id, oldModuleId, editingComponent.id, {
        newModuleId: newModuleId,
        componentName: selectedNames || editingComponent.componentName,
        componentNumber: componentEditForm.componentNumber,
        productionOrderNumber: componentEditForm.productionOrderNumber || undefined,
        stage: componentEditForm.stage || undefined,
        version: componentEditForm.version || undefined,
        holder: selectedHolders || undefined,
        repairOrderNumber: componentEditForm.repairOrderNumber || undefined,
        protectionOrderNumber: componentEditForm.protectionOrderNumber || undefined,
      });
    } else {
      project.modules.forEach((m: any) => {
        const comp = m.components.find((c: any) => c.id === editingComponent.id);
        if (comp) updateComponent(project.id, m.id, editingComponent.id, {
          componentName: selectedNames || comp.componentName,
          componentNumber: componentEditForm.componentNumber,
          productionOrderNumber: componentEditForm.productionOrderNumber || undefined,
          stage: componentEditForm.stage || undefined,
          version: componentEditForm.version || undefined,
          holder: selectedHolders || undefined,
          repairOrderNumber: componentEditForm.repairOrderNumber || undefined,
          protectionOrderNumber: componentEditForm.protectionOrderNumber || undefined,
        });
      });
    }
    showToast('组件已更新', 'success');
    modalState.setShowComponentEditModal(false);
    modalState.setEditingComponent(null);
  }, [project, modalState, updateComponent, showToast]);

  const handleStatusChangeWithReason = useCallback(async (
    componentId: string,
    moduleId: string,
    newStatus: ComponentStatus,
    reason: string
  ): Promise<{ success: boolean; error?: string; errorType?: 'network' | 'permission' | 'validation' | 'unknown' }> => {
    if (currentUser?.role === 'viewer') {
      return {
        success: false,
        error: '您没有权限更改组件状态',
        errorType: 'permission'
      };
    }

    if (!reason.trim()) {
      return {
        success: false,
        error: '请输入状态变更原因',
        errorType: 'validation'
      };
    }

    try {
      const targetModule = project.modules.find((m: any) => m.id === moduleId);
      if (!targetModule) {
        return {
          success: false,
          error: '未找到对应的模块',
          errorType: 'validation'
        };
      }

      const targetComponent = targetModule.components?.find((c: any) => c.id === componentId);
      if (!targetComponent) {
        return {
          success: false,
          error: '未找到对应的组件',
          errorType: 'validation'
        };
      }

      await new Promise((resolve, reject) => {
        setTimeout(() => {
          try {
            updateComponent(project.id, moduleId, componentId, {
              status: newStatus,
              logs: [...(targetComponent.logs || []), {
                id: generateId(),
                action: `状态变更：${targetComponent.status} → ${newStatus}`,
                timestamp: new Date().toISOString(),
                userId: currentUser?.id || '',
                username: currentUser?.username || '',
                details: reason,
              }],
            });
            resolve(true);
          } catch (err) {
            reject(err);
          }
        }, 300);
      });

      showToast('组件状态已更新', 'success');
      return { success: true };
    } catch (error) {
      console.error('Status change error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '状态变更失败，请重试',
        errorType: 'network'
      };
    }
  }, [project, updateComponent, currentUser, showToast]);

  const handleComponentStatusSubmit = useCallback(() => {
    const { componentStatusForm, editingComponent } = modalState;
    if (!componentStatusForm.reason.trim()) { showToast('请输入状态变更原因', 'error'); return; }
    const moduleId = editingComponent.moduleId;
    updateComponent(project.id, moduleId, editingComponent.id, {
      status: componentStatusForm.status as any,
      logs: [...(editingComponent.logs || []), {
        id: generateId(),
        action: `状态变更：${editingComponent.status} → ${componentStatusForm.status}`,
        timestamp: new Date().toISOString(),
        userId: currentUser?.id || '',
        username: currentUser?.username || '',
        details: componentStatusForm.reason,
      }],
    });
    showToast('组件状态已更新', 'success');
    modalState.setShowComponentStatusModal(false);
    modalState.setEditingComponent(null);
    modalState.setComponentStatusForm({ status: '', reason: '' });
  }, [project, modalState, updateComponent, currentUser, showToast]);

  const handleComponentCopySubmit = useCallback(() => {
    const { componentCopyForm, copyingComponent } = modalState;
    const targetModule = project.modules.find((m: any) => m.id === componentCopyForm.moduleId);
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
      repairOrderNumber: copyingComponent.repairOrderNumber || '',
      protectionOrderNumber: copyingComponent.protectionOrderNumber || '',
      certificates: { pcb: undefined, assembly: undefined, coating: undefined },
      logs: [{
        id: generateId(), action: '组件复制', timestamp: new Date().toISOString(),
        userId: currentUser?.id || '', username: currentUser?.username || '',
        details: `从组件 ${copyingComponent.componentNumber} (${targetModule.moduleName}) 复制`,
      }],
    });
    showToast('组件复制成功', 'success');
    modalState.setShowComponentCopyModal(false);
    modalState.setCopyingComponent(null);
  }, [project, modalState, addComponent, currentUser, showToast]);

  const handlePlanSubmit = useCallback(() => {
    const { planForm } = modalState;
    if (!planForm.title.trim()) { showToast('请输入目标标题', 'error'); return; }
    const taskDescription = planForm.riskItem.trim()
      ? `${planForm.description}\n\n⚠️ 风险项：${planForm.riskItem}`
      : planForm.description;
    const newTask = {
      id: generateId(), title: planForm.title, description: taskDescription,
      riskItem: planForm.riskItem, dueDate: planForm.dueDate,
      priority: planForm.riskItem.trim() ? '紧急' as const : planForm.priority,
      status: '未完成' as const, completed: false, createdAt: new Date().toISOString().split('T')[0],
    };
    const globalTaskId = addTask({
      title: planForm.title, description: taskDescription, riskItem: planForm.riskItem,
      dueDate: planForm.dueDate, priority: planForm.riskItem.trim() ? '紧急' as const : planForm.priority,
      status: '进行中' as const, projectId: project.id!, projectName: project.name,
    });
    updateProject(project.id!, { tasks: [...(project.tasks || []), { ...newTask, taskId: globalTaskId }] });
    showToast('计划目标已添加并同步到任务系统', 'success');
    modalState.setShowPlanModal(false);
    modalState.setPlanForm({ title: '', description: '', riskItem: '', dueDate: '', priority: '中' });
  }, [project, modalState, addTask, updateProject, showToast]);

  const handleDesignFileSubmit = useCallback(() => {
    const { editingDesignFile, designForm } = modalState;
    if (!designForm.name.trim()) { showToast('请输入文件名称', 'error'); return; }
    if (editingDesignFile) {
      updateProject(project.id, {
        designFiles: project.designFiles.map((df: any) =>
          df.id === editingDesignFile.id ? { ...df, ...designForm } : df
        ),
      });
      showToast('设计文件已更新', 'success');
    } else {
      addDesignFile(project.id, { ...designForm, isAutoGenerated: false, uploadDate: new Date().toLocaleString() });
      showToast('设计文件已创建', 'success');
    }
    modalState.setShowDesignModal(false);
    modalState.setEditingDesignFile(null);
    modalState.setDesignForm({
      name: '', type: '装配图', format: 'AutoCAD', stage: project.stage,
      version: project.version as ProjectVersion, adaptedModuleIds: [], adaptedComponentIds: [],
    });
  }, [project, modalState, updateProject, addDesignFile, showToast]);

  const handleVersionUpdate = useCallback((software: Software, version: string) => {
    const newSoftware: Software = {
      ...software,
      id: generateId(),
      version,
      status: '未完成',
      uploadDate: undefined,
      completionDate: undefined,
    };
    updateProject(project.id, {
      software: [...project.software, newSoftware],
    });
    showToast(`已创建新版本 ${version}`, 'success');
    modalState.setShowVersionModal(false);
    modalState.setEditingVersionSoftware(null);
    modalState.setVersionInput('');
  }, [project, modalState, updateProject, showToast]);

  const handleSyncDesignOpen = useCallback((file: any) => {
    modalState.setSyncTargetDesignFile(file);
    modalState.setSyncDesignModuleIds([...(file.adaptedModuleIds || []), ...(file.adaptedComponentIds || [])]);
    modalState.setShowDesignSyncModal(true);
  }, [modalState]);

  const handleUpdateDesignFileSync = useCallback((file: any) => {
    if (!file) return;

    const { adaptedModuleIds = [], adaptedComponentIds = [] } = file;
    const designFileToAdd = {
      id: file.id,
      name: file.name,
      type: file.type,
      format: file.format,
      category: file.category,
      stage: file.stage,
      version: file.version,
      uploadDate: file.uploadDate,
      isAutoGenerated: file.isAutoGenerated,
    };

    const updatedModules = project.modules.map((mod: any) => {
      const moduleDesignFiles = mod.designFiles || [];

      if (adaptedModuleIds.includes(mod.id)) {
        if (!moduleDesignFiles.find((df: any) => df.id === file.id)) {
          return { ...mod, designFiles: [...moduleDesignFiles, designFileToAdd] };
        }
      }

      const updatedComponents = mod.components?.map((comp: any) => {
        const compDesignFiles = comp.designFiles || [];
        if (adaptedComponentIds.includes(comp.id)) {
          if (!compDesignFiles.find((df: any) => df.id === file.id)) {
            return { ...comp, designFiles: [...compDesignFiles, designFileToAdd] };
          }
        }
        return comp;
      });

      return { ...mod, components: updatedComponents };
    });

    updateProject(project.id, { modules: updatedModules });
  }, [project, updateProject]);

  const handleDeleteDesignFile = useCallback((fileId: string) => {
    deleteDesignFile(project.id, fileId);
    showToast('设计文件已删除', 'success');
  }, [project, deleteDesignFile, showToast]);

  const handleClearAllDesignFiles = useCallback(() => {
    const files = project.designFiles || [];
    files.forEach((file: any) => {
      deleteDesignFile(project.id, file.id);
    });
    showToast(`已清除 ${files.length} 个设计文件`, 'success');
  }, [project, deleteDesignFile, showToast]);

  const handleDeleteDocument = useCallback((docId: string) => {
    deleteDocument(project.id, docId);
    showToast('文档已删除', 'success');
  }, [project, deleteDocument, showToast]);

  const handleSoftwareFormChange = useCallback((field: string, value: any) => {
    modalState.setSoftwareForm({ ...modalState.softwareForm, [field]: value });
  }, [modalState]);

  const handleDocFormChange = useCallback((field: string, value: any) => {
    modalState.setDocForm({ ...modalState.docForm, [field]: value });
  }, [modalState]);

  const handleDesignFormChange = useCallback((field: string, value: any) => {
    modalState.setDesignForm({ ...modalState.designForm, [field]: value });
  }, [modalState]);

  const handleSystemFormChange = useCallback((field: string, value: any) => {
    modalState.setSystemForm({ ...modalState.systemForm, [field]: value });
  }, [modalState]);

  const handleModuleFormChange = useCallback((field: string, value: any) => {
    modalState.setModuleForm({ ...modalState.moduleForm, [field]: value });
  }, [modalState]);

  const handlePlanFormChange = useCallback((field: string, value: string) => {
    modalState.setPlanForm({ ...modalState.planForm, [field]: value });
  }, [modalState]);

  const handleReviewFormChange = useCallback((field: string, value: any) => {
    modalState.setReviewForm({ ...modalState.reviewForm, [field]: value });
  }, [modalState]);

  const handleOpenAddSoftware = useCallback(() => {
    modalState.setEditingSoftware(null);
    modalState.setSoftwareForm({ name: '', version: '', adaptedComponentIds: [] });
    modalState.setShowSoftwareModal(true);
  }, [modalState]);

  const handleOpenEditSoftware = useCallback((soft: any) => {
    modalState.setEditingSoftware(soft);
    modalState.setSoftwareForm({
      name: soft.name, version: soft.version, adaptedComponentIds: soft.adaptedComponentIds || [],
    });
    modalState.setShowSoftwareModal(true);
  }, [modalState]);

  const handleSaveSoftware = useCallback((software: Software, updates: { name?: string; version?: string; adaptedComponentIds?: string[] }) => {
    const allComponents = project.modules.flatMap((m: any) => m.components || []);
    const adaptedComponents = allComponents
      .filter((c: any) => updates.adaptedComponentIds?.includes(c.id))
      .map((c: any) => ({ id: c.id, name: c.componentName }));

    updateProject(project.id, {
      software: project.software.map((s: any) =>
        s.id === software.id ? {
          ...s, name: updates.name || s.name, version: updates.version || s.version,
          adaptedComponentIds: updates.adaptedComponentIds || s.adaptedComponentIds,
          adaptedComponents: adaptedComponents.length > 0 ? adaptedComponents : s.adaptedComponents,
        } : s
      ),
    });
    showToast('软件已更新', 'success');
  }, [project, updateProject, showToast]);

  const handleOpenAddDocument = useCallback(() => {
    modalState.setEditingDoc(null);
    modalState.setDocForm({ documentNumber: '', name: '', type: '', stage: 'F阶段', version: 'A' });
    modalState.setShowDocModal(true);
  }, [modalState]);

  const handleOpenEditDocument = useCallback((doc: any) => {
    modalState.setEditingDoc(doc);
    modalState.setDocForm({
      documentNumber: doc.documentNumber, name: doc.name, type: doc.type,
      stage: doc.stage, version: (doc as any).version || 'A',
    });
    modalState.setShowDocModal(true);
  }, [modalState]);

  const handleSelectTemplate = useCallback((sys: any) => {
    modalState.setSystemForm({
      systemNumber: '', systemName: sys.systemName, productionOrderNumber: sys.productionOrderNumber,
      holder: sys.holder || '', status: '未投产', stage: sys.stage, version: sys.version || 'v1.0',
    });
    modalState.setSystemTemplate(sys);
  }, [modalState]);

  const handleClearTemplate = useCallback(() => {
    modalState.setSystemForm({
      systemNumber: '', systemName: '', productionOrderNumber: '',
      holder: '', status: '未投产', stage: project.stage, version: 'v1.0',
    });
    modalState.setSystemTemplate(null);
  }, [modalState, project.stage]);

  const handleOpenComponentModal = useCallback(() => {
    const modules = project.modules || [];
    const allComps = modules.flatMap((m: any) => (m.components || []));
    if (allComps.length > 0) {
      const sortedComps = [...allComps].sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
      const latestComp = sortedComps[0];
      modalState.setComponentForm({
        componentNumber: '',
        componentName: latestComp.componentName || '',
        productionOrderNumber: latestComp.productionOrderNumber || '',
        holder: latestComp.holder || '',
        status: '未投产',
        stage: latestComp.stage || 'C阶段',
        version: latestComp.version || 'A',
        repairOrderNumber: latestComp.repairOrderNumber || '',
        protectionOrderNumber: latestComp.protectionOrderNumber || '',
      });
      modalState.setComponentTemplate(latestComp);
    } else {
      modalState.setComponentForm({
        componentNumber: '', componentName: '', productionOrderNumber: '',
        holder: '', status: '未投产', stage: 'C阶段', version: 'A',
        repairOrderNumber: '', protectionOrderNumber: '',
      });
      modalState.setComponentTemplate(null);
    }
    modalState.setAddingComponent(null);
    modalState.setIsCopyingComponent(false);
    modalState.setShowComponentModal(true);
  }, [project, modalState]);

  const handleComponentFormChange = useCallback((field: string, value: any) => {
    modalState.setComponentForm((prev: any) => ({ ...prev, [field]: value }));
  }, [modalState]);

  const handleSelectComponentTemplate = useCallback((comp: any) => {
    modalState.setComponentForm({
      componentNumber: '',
      componentName: comp.componentName || '',
      productionOrderNumber: comp.productionOrderNumber || '',
      holder: comp.holder || '',
      status: '未投产',
      stage: comp.stage || 'C阶段',
      version: comp.version || 'A',
      repairOrderNumber: comp.repairOrderNumber || '',
      protectionOrderNumber: comp.protectionOrderNumber || '',
    });
    modalState.setComponentTemplate(comp);
  }, [modalState]);

  const handleClearComponentTemplate = useCallback(() => {
    modalState.setComponentForm({
      componentNumber: '', componentName: '', productionOrderNumber: '',
      holder: '', status: '未投产', stage: 'C阶段', version: 'A',
      repairOrderNumber: '', protectionOrderNumber: '',
    });
    modalState.setComponentTemplate(null);
  }, [modalState]);

  const handleComponentSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const form = modalState.componentForm;
    if (!form.componentName) {
      showToast('请输入组件名称', 'error');
      return;
    }
    const modules = project.modules || [];
    if (modules.length === 0) {
      showToast('请先创建模块', 'error');
      return;
    }
    let targetModuleId: string;
    if (modules.length === 1) {
      targetModuleId = modules[0].id;
    } else {
      const moduleOptions = modules.map((m: any) => `${m.moduleName} (${m.moduleNumber})`).join(', ');
      const selectedModuleName = prompt(`请输入要添加到的模块名称:\n${moduleOptions}`);
      if (!selectedModuleName) return;
      const matchedModule = modules.find((m: any) =>
        m.moduleName === selectedModuleName || m.moduleNumber === selectedModuleName
      );
      if (!matchedModule) {
        showToast('未找到指定的模块', 'error');
        return;
      }
      targetModuleId = matchedModule.id;
    }
    const template = modalState.componentTemplate;
    const newComponent: any = {
      moduleId: targetModuleId,
      componentNumber: form.componentNumber,
      componentName: form.componentName,
      status: form.status,
      stage: form.stage,
      version: form.version,
      productionOrderNumber: form.productionOrderNumber,
      holder: form.holder,
      repairOrderNumber: form.repairOrderNumber,
      protectionOrderNumber: form.protectionOrderNumber,
      certificates: { pcb: undefined, assembly: undefined, coating: undefined },
      logs: [{
        id: generateId(),
        action: template ? '组件复制' : '组件创建',
        timestamp: new Date().toISOString(),
        userId: currentUser?.id || '',
        username: currentUser?.username || '',
        details: template
          ? `从组件 ${template.componentNumber} (${template.componentName}) 复制`
          : '新建组件',
      }],
    };
    if (template) {
      newComponent.certificates = template.certificates ? { ...template.certificates } : newComponent.certificates;
      newComponent.repairOrderNumber = template.repairOrderNumber || '';
      newComponent.protectionOrderNumber = template.protectionOrderNumber || '';
    }

    const user = { id: currentUser?.id || null, username: currentUser?.username || '系统' };

    logComponentCreate(
      newComponent.id || generateId(),
      form.componentName,
      user,
      template ? `从组件 ${template.componentNumber} 复制` : '新建组件',
      newComponent
    );

    logModuleConfigModify(
      targetModuleId,
      modules.find((m: any) => m.id === targetModuleId)?.moduleName || '未知模块',
      user,
      `在模块中添加组件: ${form.componentName}`,
      undefined,
      { componentCount: (modules.find((m: any) => m.id === targetModuleId)?.components?.length || 0) },
      { componentCount: (modules.find((m: any) => m.id === targetModuleId)?.components?.length || 0) + 1 }
    );

    addComponent(project.id, targetModuleId, newComponent);
    showToast('组件已创建', 'success');
    modalState.setShowComponentModal(false);
    modalState.setAddingComponent(null);
    modalState.setComponentTemplate(null);
    modalState.setIsCopyingComponent(false);
  }, [project, modalState, addComponent, currentUser, showToast]);

  const handleOpenAddReview = useCallback(() => {
    modalState.setReviewForm({ title: '', content: '' });
    modalState.setShowReviewModal(true);
  }, [modalState]);

  const handleStageUpdate = useCallback(async (stage: ProjectStage) => {
    projectState.setShowStageDropdown(false);
    projectState.setIsUpdatingStage(true);
    const user = { id: currentUser?.id || null, username: currentUser?.username || '系统' };

    try {
      const previousStage = project.stage;
      const result = await updateProjectStage(project.id, stage);
      if (result) {
        logProjectStageChange(
          project.id,
          project.name,
          user,
          previousStage,
          stage
        );

        logSystemConfigChange(
          user,
          `项目阶段变更: ${previousStage} → ${stage}`,
          '项目阶段更新',
          { stage: previousStage },
          { stage: stage },
          project.modules.map((m: any) => m.id)
        );

        updateProject(project.id, { stage });
        showToast(`项目阶段已更新为 ${stage}`, 'success');
      } else {
        showToast('阶段更新失败', 'error');
      }
    } catch {
      showToast('更新阶段时发生错误', 'error');
    } finally {
      projectState.setIsUpdatingStage(false);
    }
  }, [project, updateProjectStage, updateProject, showToast, projectState, currentUser]);

  return {
    incrementVersion,
    updateProjectStage,
    handleOpenSystemModal,
    handleGenerateDiagram,
    handleAutoGenerateDesignDiagrams,
    handleUploadDesignFile,
    handleSyncDesignFileToModules,
    handleCopyDiagram,
    handleCreateModule,
    handleUpdateModule,
    handleCreateSystem,
    handleCreateSoftware,
    handleDeleteSoftware,
    handleDownloadSoftware,
    handleUploadSoftware,
    handleOpenSyncModal,
    handleSyncSoftwareToComponents,
    handleUpdateDocument,
    handleUploadDocument,
    handleDownloadDocument,
    handleCreateDocumentsFromImport,
    getSearchResults,
    handleAddCategory,
    handleCreateReview,
    handleReviewAction,
    handleReviewFileUploadWithDrag,
    handleDownloadReviewFile,
    handleDownloadReviewFolder,
    handleDownloadReviewCategoryFiles,
    handleDeleteReviewFile,
    handleDeleteReviewCategory,
    handleAddReviewCategory,
    handleDeleteReview,
    handleModuleEdit,
    handleModuleDelete,
    handleModuleCopy,
    handleBatchUpdateModuleStage,
    handleBatchUpdateModuleVersion,
    handleBatchDeleteModule,
    handleModuleStatusChange,
    handleComponentEdit,
    handleComponentDelete,
    handleComponentStatusUpdate,
    handleComponentCopy,
    handleComponentStatusChange,
    handleBatchDeleteComponent,
    handleBatchUpdateComponentStatus,
    handleBatchUpdateComponentStage,
    handleBatchUpdateComponentVersion,
    handleSystemEdit,
    handleSystemDelete,
    handleBatchDeleteSystem,
    handleBatchUpdateSystemStatus,
    handleTaskToggleComplete,
    handleTaskDelete,
    handleCreateSnapshot,
    handleOpenRollbackModal,
    handleRollback,
    handleComponentEditSubmit,
    handleComponentStatusSubmit,
    handleComponentCopySubmit,
    handlePlanSubmit,
    handleDesignFileSubmit,
    handleVersionUpdate,
    handleSyncDesignOpen,
    handleUpdateDesignFileSync,
    handleDeleteDesignFile,
    handleClearAllDesignFiles,
    handleVersionUpdateDesignFile,
    handleDeleteDocument,
    handleSoftwareFormChange,
    handleDocFormChange,
    handleDesignFormChange,
    handleSystemFormChange,
    handleModuleFormChange,
    handlePlanFormChange,
    handleReviewFormChange,
    handleOpenAddSoftware,
    handleOpenEditSoftware,
    handleSaveSoftware,
    handleOpenAddDocument,
    handleOpenEditDocument,
    handleSelectTemplate,
    handleClearTemplate,
    handleOpenComponentModal,
    handleComponentFormChange,
    handleSelectComponentTemplate,
    handleClearComponentTemplate,
    handleComponentSubmit,
    handleOpenAddReview,
    handleStageUpdate,
    handleStatusChangeWithReason,
  };
}