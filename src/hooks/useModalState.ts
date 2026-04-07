import { useState } from 'react';
import type { ProjectStage, ProjectVersion, ModuleStatus } from '../types';
import type { DiagramCard } from '../services/designDiagramService';
import type { DataSnapshot } from '../services/dataMigration';

export interface SystemForm {
  systemNumber: string;
  systemName: string;
  productionOrderNumber: string;
  holder: string;
  status: '未投产' | '投产中' | '正常' | '维修中' | '三防中' | '测试中' | '仿真中' | '故障';
  stage: ProjectStage;
  version: string;
}

export interface SoftwareForm {
  name: string;
  version: string;
  adaptedComponentIds: string[];
}

export interface PlanForm {
  title: string;
  description: string;
  riskItem: string;
  dueDate: string;
  priority: '低' | '中' | '高' | '紧急';
}

export interface DocForm {
  documentNumber: string;
  name: string;
  type: string;
  stage: ProjectStage;
  version: string;
}

export interface DesignForm {
  name: string;
  type: '装配图' | '配套表';
  format: 'AutoCAD' | 'Excel' | 'PDF';
  stage: ProjectStage;
  version: ProjectVersion;
  adaptedModuleIds: string[];
  adaptedComponentIds: string[];
}

export interface ModuleForm {
  moduleNumber: string;
  moduleName: string;
  category: string;
  productionOrderNumber: string;
  holder: string;
  status: '未投产' | '投产中' | '正常' | '维修中' | '三防中' | '测试中' | '仿真中' | '故障';
  stage: ProjectStage;
  version: string;
}

export interface ModuleEditForm {
  moduleNumber: string;
  moduleName: string;
  category: string;
  systemId: string;
  systemNumber: string;
  systemName: string;
  productionOrderNumber: string;
  holder: string;
  status: ModuleStatus;
  stage: ProjectStage;
  version: string;
  systemSearch?: string;
}

export interface ComponentEditForm {
  componentName: string[];
  componentNumber: string;
  productionOrderNumber: string;
  stage: string;
  version: string;
  moduleId: string;
  holder: string[];
  repairOrderNumber: string;
  protectionOrderNumber: string;
}

export interface ReviewForm {
  title: string;
  content: string;
  systemName?: string;
}

export interface ComponentCopyForm {
  moduleId: string;
  componentNumber: string;
}

export interface ComponentStatusForm {
  status: string;
  reason: string;
}

export interface ComponentForm {
  componentNumber: string;
  componentName: string;
  productionOrderNumber: string;
  holder: string;
  status: '未投产' | '投产中' | '正常' | '维修中' | '三防中' | '测试中' | '仿真中' | '借用中' | '故障';
  stage: ProjectStage;
  version: string;
  repairOrderNumber: string;
  protectionOrderNumber: string;
}

export function useModalState() {
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategory, setNewCategory] = useState('');

  const [showSystemModal, setShowSystemModal] = useState(false);
  const [editingSystem, setEditingSystem] = useState<any>(null);
  const [systemForm, setSystemForm] = useState<SystemForm>({
    systemNumber: '', systemName: '', productionOrderNumber: '', holder: '',
    status: '未投产', stage: 'C阶段', version: 'v1.0',
  });
  const [systemTemplate, setSystemTemplate] = useState<any>(null);
  const [isCopyingSystem, setIsCopyingSystem] = useState(false);

  const [showSoftwareModal, setShowSoftwareModal] = useState(false);
  const [editingSoftware, setEditingSoftware] = useState<any>(null);
  const [softwareForm, setSoftwareForm] = useState<SoftwareForm>({ name: '', version: '', adaptedComponentIds: [] });

  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planForm, setPlanForm] = useState<PlanForm>({
    title: '', description: '', riskItem: '', dueDate: '', priority: '中',
  });

  const [showDocModal, setShowDocModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<any>(null);
  const [docForm, setDocForm] = useState<DocForm>({
    documentNumber: '', name: '', type: '', stage: 'F阶段', version: 'A',
  });
  const [docPage, setDocPage] = useState(1);
  const DOC_PAGE_SIZE = 20;

  const [showDesignModal, setShowDesignModal] = useState(false);
  const [editingDesignFile, setEditingDesignFile] = useState<any>(null);
  const [designForm, setDesignForm] = useState<DesignForm>({
    name: '', type: '装配图', format: 'AutoCAD', stage: 'F阶段',
    version: 'A版', adaptedModuleIds: [], adaptedComponentIds: [],
  });

  const [showDiagramModal, setShowDiagramModal] = useState(false);
  const [diagramType, setDiagramType] = useState<'module' | 'component' | 'table'>('module');
  const [diagramResult, setDiagramResult] = useState<DiagramCard[]>([]);
  const [diagramText, setDiagramText] = useState('');

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewForm, setReviewForm] = useState<ReviewForm>({ title: '', content: '' });

  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncTargetSoftware, setSyncTargetSoftware] = useState<any>(null);
  const [syncComponentIds, setSyncComponentIds] = useState<string[]>([]);

  const [showDesignSyncModal, setShowDesignSyncModal] = useState(false);
  const [syncTargetDesignFile, setSyncTargetDesignFile] = useState<any>(null);
  const [syncDesignModuleIds, setSyncDesignModuleIds] = useState<string[]>([]);

  const [showVersionModal, setShowVersionModal] = useState(false);
  const [editingVersionSoftware, setEditingVersionSoftware] = useState<any>(null);
  const [versionInput, setVersionInput] = useState('');

  const [showRollbackModal, setShowRollbackModal] = useState(false);
  const [rollbackSnapshot, setRollbackSnapshot] = useState<DataSnapshot | null>(null);
  const [rollbackConfirmText, setRollbackConfirmText] = useState('');

  const [showComponentEditModal, setShowComponentEditModal] = useState(false);
  const [editingComponent, setEditingComponent] = useState<any>(null);
  const [componentEditForm, setComponentEditForm] = useState<ComponentEditForm>({
    componentName: [], componentNumber: '', productionOrderNumber: '',
    stage: '', version: '', moduleId: '', holder: [],
    repairOrderNumber: '', protectionOrderNumber: '',
  });

  const [showComponentStatusModal, setShowComponentStatusModal] = useState(false);
  const [componentStatusForm, setComponentStatusForm] = useState<ComponentStatusForm>({ status: '', reason: '' });

  const [showComponentCopyModal, setShowComponentCopyModal] = useState(false);
  const [copyingComponent, setCopyingComponent] = useState<any>(null);
  const [componentCopyForm, setComponentCopyForm] = useState<ComponentCopyForm>({ moduleId: '', componentNumber: '' });

  const [showComponentModal, setShowComponentModal] = useState(false);
  const [addingComponent, setAddingComponent] = useState<any>(null);
  const [componentForm, setComponentForm] = useState<ComponentForm>({
    componentNumber: '', componentName: '', productionOrderNumber: '', holder: '',
    status: '未投产', stage: 'C阶段', version: 'A',
    repairOrderNumber: '', protectionOrderNumber: '',
  });
  const [componentTemplate, setComponentTemplate] = useState<any>(null);
  const [isCopyingComponent, setIsCopyingComponent] = useState(false);

  const [showModuleEditModal, setShowModuleEditModal] = useState(false);
  const [showModuleEditConfirm, setShowModuleEditConfirm] = useState(false);
  const [editingModule, setEditingModule] = useState<any>(null);
  const [moduleForm, setModuleForm] = useState<ModuleForm>({
    moduleNumber: '', moduleName: '', category: '', productionOrderNumber: '',
    holder: '', status: '未投产', stage: 'C阶段', version: 'v1.0',
  });
  const [moduleEditForm, setModuleEditForm] = useState<ModuleEditForm>({
    moduleNumber: '', moduleName: '', category: '',
    systemId: '', systemNumber: '', systemName: '',
    productionOrderNumber: '', holder: '',
    status: '未投产', stage: 'C阶段', version: 'v1.0',
  });

  const [showFileConflictModal, setShowFileConflictModal] = useState(false);
  const [fileConflictInfo, setFileConflictInfo] = useState<{
    reviewId: string;
    category: string;
    existingFile: any;
    newFile: any;
    resolve: (action: 'replace' | 'keep') => void;
  } | null>(null);

  const resetModuleForm = (): ModuleForm => ({
    moduleNumber: '', moduleName: '', category: '', productionOrderNumber: '',
    holder: '', status: '未投产', stage: 'C阶段', version: 'v1.0',
  });

  const resetSystemForm = (): SystemForm => ({
    systemNumber: '', systemName: '', productionOrderNumber: '', holder: '',
    status: '未投产', stage: 'C阶段', version: 'v1.0',
  });

  return {
    showModuleModal, setShowModuleModal,
    showCategoryModal, setShowCategoryModal,
    newCategory, setNewCategory,
    showSystemModal, setShowSystemModal,
    editingSystem, setEditingSystem,
    systemForm, setSystemForm,
    systemTemplate, setSystemTemplate,
    isCopyingSystem, setIsCopyingSystem,
    showSoftwareModal, setShowSoftwareModal,
    editingSoftware, setEditingSoftware,
    softwareForm, setSoftwareForm,
    showPlanModal, setShowPlanModal,
    planForm, setPlanForm,
    showDocModal, setShowDocModal,
    editingDoc, setEditingDoc,
    docForm, setDocForm,
    docPage, setDocPage,
    DOC_PAGE_SIZE,
    showDesignModal, setShowDesignModal,
    editingDesignFile, setEditingDesignFile,
    designForm, setDesignForm,
    showDiagramModal, setShowDiagramModal,
    diagramType, setDiagramType,
    diagramResult, setDiagramResult,
    diagramText, setDiagramText,
    showReviewModal, setShowReviewModal,
    reviewForm, setReviewForm,
    showSyncModal, setShowSyncModal,
    syncTargetSoftware, setSyncTargetSoftware,
    syncComponentIds, setSyncComponentIds,
    showDesignSyncModal, setShowDesignSyncModal,
    syncTargetDesignFile, setSyncTargetDesignFile,
    syncDesignModuleIds, setSyncDesignModuleIds,
    showVersionModal, setShowVersionModal,
    editingVersionSoftware, setEditingVersionSoftware,
    versionInput, setVersionInput,
    showRollbackModal, setShowRollbackModal,
    rollbackSnapshot, setRollbackSnapshot,
    rollbackConfirmText, setRollbackConfirmText,
    showComponentEditModal, setShowComponentEditModal,
    editingComponent, setEditingComponent,
    componentEditForm, setComponentEditForm,
    showComponentStatusModal, setShowComponentStatusModal,
    componentStatusForm, setComponentStatusForm,
    showComponentCopyModal, setShowComponentCopyModal,
    copyingComponent, setCopyingComponent,
    componentCopyForm, setComponentCopyForm,
    showComponentModal, setShowComponentModal,
    addingComponent, setAddingComponent,
    componentForm, setComponentForm,
    componentTemplate, setComponentTemplate,
    isCopyingComponent, setIsCopyingComponent,
    showModuleEditModal, setShowModuleEditModal,
    showModuleEditConfirm, setShowModuleEditConfirm,
    editingModule, setEditingModule,
    moduleForm, setModuleForm,
    moduleEditForm, setModuleEditForm,
    showFileConflictModal, setShowFileConflictModal,
    fileConflictInfo, setFileConflictInfo,
    resetModuleForm,
    resetSystemForm,
  };
}

export type ModalState = ReturnType<typeof useModalState>;