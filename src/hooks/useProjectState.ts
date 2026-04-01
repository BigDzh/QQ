import { useState } from 'react';
import type { TabId } from '../pages/ProjectDetail/components';

export interface ConfirmModalState {
  show: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

export function useProjectState() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [showStageDropdown, setShowStageDropdown] = useState(false);
  const [isUpdatingStage, setIsUpdatingStage] = useState(false);
  const [filterCategory, setFilterCategory] = useState<'all' | 'module' | 'component' | 'table'>('all');
  const [filterType, setFilterType] = useState<'all' | 'assembly' | 'table'>('all');
  const [filterStage, setFilterStage] = useState<string>('');
  const [filterVersion, setFilterVersion] = useState<string>('');
  const [selectedDocStageFilter, setSelectedDocStageFilter] = useState<string | null>(null);
  const [uploadingDesignFile, setUploadingDesignFile] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    show: false, title: '', message: '', onConfirm: () => {}
  });

  const openConfirmModal = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ show: true, title, message, onConfirm });
  };

  const closeConfirmModal = () => {
    setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
  };

  const resetFilters = () => {
    setFilterCategory('all');
    setFilterType('all');
    setFilterStage('');
    setFilterVersion('');
  };

  return {
    activeTab, setActiveTab,
    globalSearchTerm, setGlobalSearchTerm,
    showStageDropdown, setShowStageDropdown,
    isUpdatingStage, setIsUpdatingStage,
    filterCategory, setFilterCategory,
    filterType, setFilterType,
    filterStage, setFilterStage,
    filterVersion, setFilterVersion,
    selectedDocStageFilter, setSelectedDocStageFilter,
    uploadingDesignFile, setUploadingDesignFile,
    confirmModal, setConfirmModal,
    openConfirmModal, closeConfirmModal,
    resetFilters,
  };
}

export type ProjectState = ReturnType<typeof useProjectState>;