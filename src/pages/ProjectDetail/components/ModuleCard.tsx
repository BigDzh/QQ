import React, { memo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Copy, Trash2, Edit2, ChevronRight } from 'lucide-react';
import type { Module, ModuleStatus, ProjectStage } from '../../../types';
import { useThemeStyles } from '../../../hooks/useThemeStyles';
import { generateId } from '../../../utils/auth';

interface ModuleCardProps {
  module: Module;
  projectId: string;
  index: number;
  onDelete: (moduleId: string) => void;
  onEdit: (module: Module) => void;
  onCopy: (module: Module, newNumber: string) => void;
  t: ReturnType<typeof useThemeStyles>;
}

const ModuleCard = memo(function ModuleCard({
  module,
  projectId,
  index,
  onDelete,
  onEdit,
  onCopy,
  t,
}: ModuleCardProps) {
  const navigate = useNavigate();

  const handleCopy = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const numMatch = module.moduleNumber.match(/\d+/);
    const num = numMatch ? parseInt(numMatch[0]) + 1 : 1;
    const prefix = numMatch ? module.moduleNumber.slice(0, numMatch.index) : module.moduleNumber;
    const suffix = numMatch ? module.moduleNumber.slice(numMatch.index! + numMatch[0].length) : '';
    const newNumber = prefix + num + suffix;
    onCopy(module, newNumber);
  }, [module, onCopy]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('确定要删除该模块吗？')) {
      onDelete(module.id);
    }
  }, [module.id, onDelete]);

  const handleEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(module);
  }, [module, onEdit]);

  const handleCardClick = useCallback(() => {
    navigate(`/modules/${module.id}`);
  }, [navigate, module.id]);

  const total = module.components.length;
  const normalCount = module.components.filter(c => c.status === '正常').length;
  const faultCount = module.components.filter(c => c.status === '故障').length;
  const normalRatio = total > 0 ? (normalCount / total) * 100 : 0;
  const faultRatio = total > 0 ? (faultCount / total) * 100 : 0;
  const statusBg = module.status === '正常' ? 'bg-green-100 dark:bg-green-500/30' :
    module.status === '故障' ? 'bg-red-100 dark:bg-red-500/30' :
    'bg-gray-100 dark:bg-gray-500/30';

  return (
    <div
      onClick={handleCardClick}
      className={`${t.card} rounded-lg shadow-sm p-4 hover:shadow-md transition border cursor-pointer ${t.border}`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span className={`font-semibold ${t.text} whitespace-nowrap`}>
            {module.moduleName}
          </span>
          <span className={`text-sm ${t.textMuted}`}>{module.moduleNumber}</span>
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
          onClick={handleCopy}
          className="action-btn action-btn-sm action-btn-outline"
          title="复制模块"
        >
          <Copy size={14} />
        </button>
        <button
          onClick={handleEdit}
          className="action-btn action-btn-sm action-btn-outline"
          title="编辑模块"
        >
          <Edit2 size={14} />
        </button>
        <button
          onClick={handleDelete}
          className="action-btn action-btn-sm action-btn-danger"
          title="删除模块"
        >
          <Trash2 size={14} />
        </button>
        <button
          onClick={handleCardClick}
          className="action-btn action-btn-sm action-btn-outline"
          title="查看详情"
        >
          <ChevronRight size={14} />
        </button>
        <span className={`text-sm ${t.textMuted} ml-auto`}>{module.components.length} 组件</span>
      </div>
    </div>
  );
});

export default ModuleCard;