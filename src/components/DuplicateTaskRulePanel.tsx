import React, { useState, useEffect } from 'react';
import { Settings, X, Plus, Trash2, Edit, ToggleLeft, ToggleRight, Save } from 'lucide-react';
import type { DuplicateRule, DuplicateMatchField } from '../types/duplicateTask';
import { DEFAULT_DUPLICATE_RULE } from '../types/duplicateTask';

interface DuplicateTaskRulePanelProps {
  isOpen: boolean;
  onClose: () => void;
  rules: DuplicateRule[];
  onCreateRule: (rule: Partial<DuplicateRule>) => void;
  onUpdateRule: (id: string, updates: Partial<DuplicateRule>) => void;
  onDeleteRule: (id: string) => void;
  onToggleRule: (id: string) => void;
}

const MATCH_FIELD_OPTIONS: { value: DuplicateMatchField; label: string }[] = [
  { value: 'title', label: '任务标题' },
  { value: 'description', label: '任务描述' },
  { value: 'priority', label: '优先级' },
  { value: 'dueDate', label: '截止日期' },
  { value: 'all', label: '全部字段' },
];

export const DuplicateTaskRulePanel: React.FC<DuplicateTaskRulePanelProps> = ({
  isOpen,
  onClose,
  rules,
  onCreateRule,
  onUpdateRule,
  onDeleteRule,
  onToggleRule,
}) => {
  const [editingRule, setEditingRule] = useState<DuplicateRule | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<Partial<DuplicateRule>>(DEFAULT_DUPLICATE_RULE);

  useEffect(() => {
    if (isOpen) {
      setEditingRule(null);
      setIsCreating(false);
      setFormData(DEFAULT_DUPLICATE_RULE);
    }
  }, [isOpen]);

  const handleCreate = () => {
    setIsCreating(true);
    setEditingRule(null);
    setFormData(DEFAULT_DUPLICATE_RULE);
  };

  const handleEdit = (rule: DuplicateRule) => {
    setIsCreating(false);
    setEditingRule(rule);
    setFormData({ ...rule });
  };

  const handleSave = () => {
    if (isCreating) {
      onCreateRule(formData);
    } else if (editingRule) {
      onUpdateRule(editingRule.id, formData);
    }
    setIsCreating(false);
    setEditingRule(null);
    setFormData(DEFAULT_DUPLICATE_RULE);
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingRule(null);
    setFormData(DEFAULT_DUPLICATE_RULE);
  };

  const handleFieldToggle = (field: DuplicateMatchField) => {
    const currentFields = formData.matchFields || [];
    if (currentFields.includes(field)) {
      setFormData({
        ...formData,
        matchFields: currentFields.filter(f => f !== field),
      });
    } else {
      setFormData({
        ...formData,
        matchFields: [...currentFields, field],
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 w-full max-w-2xl shadow-xl max-h-[80vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <Settings size={20} />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">重复任务规则管理</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
          >
            <X size={18} />
          </button>
        </div>

        {(isCreating || editingRule) ? (
          <div className="flex-1 overflow-y-auto space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                规则名称
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="输入规则名称"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                匹配字段
              </label>
              <div className="flex flex-wrap gap-2">
                {MATCH_FIELD_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    onClick={() => handleFieldToggle(option.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      (formData.matchFields || []).includes(option.value)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                匹配方式: {(formData.matchFieldsOperator || 'or') === 'and' ? '全部匹配' : '任意匹配'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  重复次数阈值
                </label>
                <input
                  type="number"
                  min="2"
                  max="100"
                  value={formData.duplicateCountThreshold || 2}
                  onChange={e => setFormData({ ...formData, duplicateCountThreshold: parseInt(e.target.value) || 2 })}
                  className="w-full px-4 py-2.5 rounded-xl text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  时间窗口（天）
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={formData.timeWindowDays || 30}
                  onChange={e => setFormData({ ...formData, timeWindowDays: parseInt(e.target.value) || 30 })}
                  className="w-full px-4 py-2.5 rounded-xl text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.keepNewest ?? true}
                  onChange={e => setFormData({ ...formData, keepNewest: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-blue-500 checkbox-interactive"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">保留最新创建的任务</span>
              </label>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.requireConfirmation ?? true}
                  onChange={e => setFormData({ ...formData, requireConfirmation: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-blue-500 checkbox-interactive"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">删除前需要确认</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                删除操作
              </label>
              <select
                value={formData.deletionAction || 'move_to_trash'}
                onChange={e => setFormData({ ...formData, deletionAction: e.target.value as 'move_to_trash' | 'permanent_delete' })}
                className="w-full px-4 py-2.5 rounded-xl text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="move_to_trash">移至回收站（可恢复）</option>
                <option value="permanent_delete">永久删除</option>
              </select>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleCancel}
                className="flex-1 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2"
              >
                <Save size={14} />
                {isCreating ? '创建规则' : '保存修改'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                共 {rules.length} 条规则，{rules.filter(r => r.enabled).length} 条启用
              </p>
              <button
                onClick={handleCreate}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 rounded-lg text-xs font-medium text-white"
              >
                <Plus size={14} />
                新建规则
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
              {rules.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  暂无规则，点击上方按钮创建
                </div>
              ) : (
                rules.map(rule => (
                  <div
                    key={rule.id}
                    className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${
                          rule.enabled ? 'text-gray-900 dark:text-white' : 'text-gray-400'
                        }`}>
                          {rule.name}
                        </span>
                        {!rule.enabled && (
                          <span className="px-2 py-0.5 rounded text-xs bg-gray-200 dark:bg-gray-600 text-gray-500">
                            已禁用
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onToggleRule(rule.id)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            rule.enabled
                              ? 'text-green-500 hover:bg-green-50 dark:hover:bg-green-500/10'
                              : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
                          }`}
                          title={rule.enabled ? '禁用规则' : '启用规则'}
                        >
                          {rule.enabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                        </button>
                        <button
                          onClick={() => handleEdit(rule)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                          title="编辑规则"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('确定要删除这条规则吗？')) {
                              onDeleteRule(rule.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                          title="删除规则"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span>匹配字段: {rule.matchFields.join(', ')}</span>
                      <span className="text-gray-300">|</span>
                      <span>阈值: {rule.duplicateCountThreshold}次</span>
                      <span className="text-gray-300">|</span>
                      <span>窗口: {rule.timeWindowDays}天</span>
                      <span className="text-gray-300">|</span>
                      <span>{rule.keepNewest ? '保留最新' : '保留最旧'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
