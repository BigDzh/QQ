import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search, Download, RotateCcw, Edit2, Loader2 } from 'lucide-react';
import { useThemeStyles } from '../../../hooks/useThemeStyles';
import { useToast } from '../../../components/Toast';
import { createPreUpdateSnapshot, getRollbackSnapshot } from '../../../services/dataMigration';
import type { ProjectStage } from '../../../types';

interface ProjectHeaderProps {
  project: {
    id: string;
    name: string;
    projectNumber: string;
    stage: ProjectStage;
    version: string;
  };
  globalSearchTerm: string;
  onGlobalSearchChange: (term: string) => void;
  onRollbackModal: (snapshot: any) => void;
  onStageUpdate: (stage: ProjectStage) => Promise<boolean>;
}

export function ProjectHeader({
  project,
  globalSearchTerm,
  onGlobalSearchChange,
  onRollbackModal,
  onStageUpdate,
}: ProjectHeaderProps) {
  const t = useThemeStyles();
  const { showToast } = useToast();
  const [showStageDropdown, setShowStageDropdown] = useState(false);
  const [isUpdatingStage, setIsUpdatingStage] = useState(false);

  const handleCreateBackup = async () => {
    const snapshot = await createPreUpdateSnapshot();
    showToast(`数据快照已创建，包含 ${snapshot.metadata.projectCount || 0} 个项目`, 'success');
  };

  const handleOpenRollback = () => {
    const snapshot = getRollbackSnapshot();
    if (snapshot) {
      onRollbackModal(snapshot);
    } else {
      showToast('暂无可用回滚快照', 'warning');
    }
  };

  const handleStageChange = async (stage: ProjectStage) => {
    if (stage === project.stage) {
      setShowStageDropdown(false);
      return;
    }
    setIsUpdatingStage(true);
    setShowStageDropdown(false);
    try {
      const result = await onStageUpdate(stage);
      if (result) {
        showToast(`项目阶段已更新为 ${stage}`, 'success');
      } else {
        showToast('阶段更新失败', 'error');
      }
    } catch (error) {
      showToast('更新阶段时发生错误', 'error');
    } finally {
      setIsUpdatingStage(false);
    }
  };

  return (
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
              onChange={(e) => onGlobalSearchChange(e.target.value)}
              className={`pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none transition-all ${t.input} w-48`}
            />
          </div>
          <button
            onClick={handleCreateBackup}
            className={`px-3 py-2 border rounded-lg text-sm flex items-center gap-1.5 ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}
            title="创建数据备份"
          >
            <Download size={14} /> 备份
          </button>
          <button
            onClick={handleOpenRollback}
            className={`px-3 py-2 border rounded-lg text-sm flex items-center gap-1.5 ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}
            title="回滚数据"
          >
            <RotateCcw size={14} /> 回滚
          </button>
          <div className="relative">
            <button
              onClick={() => setShowStageDropdown(!showStageDropdown)}
              disabled={isUpdatingStage}
              className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 cursor-pointer transition-all duration-200 ${
                t.stageColors[project.stage as keyof typeof t.stageColors] || t.stageColors.C阶段
              } ${isUpdatingStage ? 'opacity-50 cursor-wait' : 'hover:scale-105 hover:shadow-md'}`}
              title="点击更改项目阶段"
            >
              {isUpdatingStage ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Edit2 size={12} />
              )}
              <span>{project.stage}</span>
            </button>
            {showStageDropdown && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowStageDropdown(false)}
                />
                <div className={`absolute right-0 top-full mt-2 z-50 ${t.card} rounded-lg shadow-xl border ${t.border} py-2 min-w-[140px] animate-in fade-in slide-in-from-top-2 duration-200`}>
                  <div className={`px-3 py-1.5 text-xs ${t.textMuted} border-b ${t.border}`}>
                    选择项目阶段
                  </div>
                  {(['F阶段', 'C阶段', 'S阶段', 'D阶段', 'P阶段'] as const).map((stage) => (
                    <button
                      key={stage}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStageChange(stage);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                        stage === project.stage
                          ? `${t.accentText} font-medium`
                          : `${t.text} hover:${t.hoverBg}`
                      }`}
                    >
                      {stage === project.stage && <span className="w-3.5 h-3.5 rounded-full bg-current" />}
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        t.stageColors[stage as keyof typeof t.stageColors]
                      }`}>
                        {stage}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProjectHeader;
