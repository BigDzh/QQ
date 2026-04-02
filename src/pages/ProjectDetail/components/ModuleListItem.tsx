import React, { memo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Trash2, Edit2, ChevronRight } from 'lucide-react';
import type { Module } from '../../../types';
import { useThemeStyles } from '../../../hooks/useThemeStyles';

interface ModuleListItemProps {
  module: Module;
  onDelete: (moduleId: string) => void;
  onEdit: (module: Module) => void;
  onCopy: (module: Module, newNumber: string) => void;
  t: ReturnType<typeof useThemeStyles>;
}

const CATEGORY_COLOR_MAP: Record<string, string> = {
  '控制类': 'bg-cyan-500',
  '通信类': 'bg-violet-500',
  '电源类': 'bg-amber-500',
  '传感类': 'bg-pink-500',
};

const ModuleListItem = memo(function ModuleListItem({
  module,
  onDelete,
  onEdit,
  onCopy,
  t,
}: ModuleListItemProps) {
  const handleCopy = useCallback(() => {
    const numMatch = module.moduleNumber.match(/\d+/);
    const newNumber = numMatch
      ? module.moduleNumber.replace(/\d+$/, (parseInt(numMatch[0]) + 1).toString().padStart(numMatch[0].length, '0'))
      : module.moduleNumber + '-1';
    onCopy(module, newNumber);
  }, [module, onCopy]);

  return (
    <div
      className={`flex items-center justify-between px-4 py-3 ${t.hoverBg} transition ${t.border}`}
    >
      <div className="flex flex-col gap-1 flex-1">
        <div className="flex items-center gap-2">
          <Link to={`/modules/${module.id}`} className={`font-medium ${t.text} hover:underline whitespace-nowrap`}>
            {module.moduleName}
          </Link>
          <span className={`text-sm ${t.textMuted}`}>{module.moduleNumber}</span>
          <span className={`px-2 py-1 rounded text-xs ${
            t.statusColors[module.status as keyof typeof t.statusColors] || t.statusColors['故障']
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
          onClick={handleCopy}
          className="action-btn action-btn-sm action-btn-outline"
          title="复制模块"
        >
          <Copy size={14} />
        </button>
        <button
          onClick={() => onEdit(module)}
          className="action-btn action-btn-sm action-btn-outline"
          title="编辑模块"
        >
          <Edit2 size={14} />
        </button>
        <button
          onClick={() => onDelete(module.id)}
          className="action-btn action-btn-sm action-btn-danger"
          title="删除模块"
        >
          <Trash2 size={14} />
        </button>
        <Link
          to={`/modules/${module.id}`}
          className="action-btn action-btn-sm action-btn-outline"
          title="查看详情"
        >
          <ChevronRight size={14} />
        </Link>
      </div>
    </div>
  );
});

export default ModuleListItem;
