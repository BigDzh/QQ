import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CheckCircle, Trash2, Edit, Zap, Clock, AlertTriangle, Copy, Trash, History, X, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/Toast';
import { useTheme } from '../context/ThemeContext';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { useDuplicateTaskManager } from '../hooks/useDuplicateTaskManager';
import { DuplicateTaskRulePanel } from '../components/DuplicateTaskRulePanel';
import { TrashManagementPanel } from '../components/TrashManagementPanel';
import { ConfirmModal } from '../components/ui/Modal';
import type { Task, TaskStatus, Module, Component } from '../types';
import {
  markPageLoaded,
  getPageRefreshState,
  setPendingTaskData,
  getAndClearPendingTask,
  isDuplicateSubmission,
} from '../hooks/usePageRefreshDetection';
import { duplicateTaskService } from '../services/duplicateTaskService';

const taskThemeExt = {
  priorityColors: {
    低: { light: 'bg-gray-100 text-gray-600', dark: 'bg-gray-500/20 text-gray-300 border border-gray-500/30', cyberpunk: 'bg-gray-500/20 text-gray-300 border border-gray-500/30' },
    中: { light: 'bg-blue-50 text-blue-600', dark: 'bg-blue-500/20 text-blue-300 border border-blue-500/30', cyberpunk: 'bg-blue-500/20 text-cyan-300 border border-cyan-500/30' },
    高: { light: 'bg-orange-50 text-orange-600', dark: 'bg-orange-500/20 text-orange-300 border border-orange-500/30', cyberpunk: 'bg-orange-500/20 text-orange-300 border border-orange-500/30' },
    紧急: { light: 'bg-red-50 text-red-600', dark: 'bg-red-500/20 text-red-300 border border-red-500/30', cyberpunk: 'bg-red-500/20 text-rose-300 border border-rose-500/30' },
  },
  taskStatusColors: {
    进行中: { light: 'bg-blue-50 text-blue-600', dark: 'bg-blue-500/20 text-blue-300 border border-blue-500/30', cyberpunk: 'bg-blue-500/20 text-cyan-300 border border-cyan-500/30' },
    已完成: { light: 'bg-green-50 text-green-600', dark: 'bg-green-500/20 text-green-300 border border-green-500/30', cyberpunk: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' },
    已过期: { light: 'bg-red-50 text-red-600', dark: 'bg-red-500/20 text-red-300 border border-red-500/30', cyberpunk: 'bg-red-500/20 text-rose-300 border border-rose-500/30' },
  },
};

export default function TaskManagement() {
  const { tasks, addTask, updateTask, deleteTask, currentUser, projects, updateModule, updateComponent } = useApp();
  const { showToast } = useToast();
  const { theme } = useTheme();
  const baseStyles = useThemeStyles();
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<'all' | TaskStatus>('all');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: '中' as '低' | '中' | '高' | '紧急',
    status: '进行中' as '进行中' | '已完成' | '已过期',
    dueDate: '',
  });
  const [showModuleStatusModal, setShowModuleStatusModal] = useState(false);
  const [pendingFaultTask, setPendingFaultTask] = useState<{ task: Task; module: Module } | null>(null);
  const [newModuleStatus, setNewModuleStatus] = useState<Module['status']>('正常');
  const [showComponentStatusModal, setShowComponentStatusModal] = useState(false);
  const [pendingFaultComponent, setPendingFaultComponent] = useState<{ task: Task; component: Component; module: Module } | null>(null);
  const [newComponentStatus, setNewComponentStatus] = useState<Component['status']>('正常');
  const [showDuplicateRulePanel, setShowDuplicateRulePanel] = useState(false);
  const [showTrashPanel, setShowTrashPanel] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<Array<{
    ruleId: string;
    matchKey: string;
    tasks: Array<{ task: Task; isNewest: boolean; isProtected: boolean; matchScore: number }>;
  }>>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; taskId: string | null }>({
    isOpen: false,
    taskId: null,
  });
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState<{ isOpen: boolean; ruleName: string; count: number; ruleId: string }>({
    isOpen: false,
    ruleName: '',
    count: 0,
    ruleId: '',
  });
  const [pageRefreshDetected, setPageRefreshDetected] = useState(false);
  const [blockedTaskMessage, setBlockedTaskMessage] = useState<string | null>(null);
  const submissionTokenRef = useRef<string | null>(null);
  const isInitializedRef = useRef(false);

  const {
    rules,
    trashItems,
    historyItems,
    createRule,
    updateRule,
    deleteRule,
    toggleRule,
    findDuplicates,
    deleteTasks,
    restoreTask,
    permanentlyDelete,
    emptyTrash,
    cleanupExpired,
    checkDuplicate,
    updateTaskCache,
  } = useDuplicateTaskManager();

  const isCyberpunk = theme === 'cyberpunk';
  const isDark = !theme || theme === 'dark' || theme === 'cyberpunk' || theme === 'linear' || theme === 'anime' || theme === 'cosmos';

  const getTaskPriorityColor = (priority: string) => {
    const mode = isCyberpunk ? 'cyberpunk' : isDark ? 'dark' : 'light';
    return taskThemeExt.priorityColors[priority as keyof typeof taskThemeExt.priorityColors]?.[mode] || taskThemeExt.priorityColors['中'][mode];
  };

  const getTaskStatusColor = (status: string) => {
    const mode = isCyberpunk ? 'cyberpunk' : isDark ? 'dark' : 'light';
    return taskThemeExt.taskStatusColors[status as keyof typeof taskThemeExt.taskStatusColors]?.[mode] || taskThemeExt.taskStatusColors['进行中'][mode];
  };

  useEffect(() => {
    updateTaskCache(tasks);
  }, [tasks, updateTaskCache]);

  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    markPageLoaded();

    const { isPageRefresh, pendingTaskData } = getPageRefreshState();
    if (isPageRefresh && pendingTaskData) {
      setPageRefreshDetected(true);
      setBlockedTaskMessage(
        `检测到页面刷新事件，已阻止重复任务创建。\n如果您在刷新前正在创建任务 "${pendingTaskData.title || '未知'}"，该任务已存在于系统中。`
      );
      getAndClearPendingTask();
      setTimeout(() => {
        setPageRefreshDetected(false);
        setBlockedTaskMessage(null);
      }, 8000);
    }
  }, []);

  const filteredTasks = tasks.filter((task) => {
    // 状态筛选
    if (filter !== 'all' && task.status !== filter) return false;
    
    return true;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTask) {
      updateTask(editingTask.id, formData);
      showToast('任务更新成功', 'success');
    } else {
      const token = submissionTokenRef.current;
      if (token) {
        const tokenValid = duplicateTaskService.consumeSubmissionToken(token);
        if (!tokenValid) {
          showToast('检测到重复提交，已阻止任务创建。请刷新页面后重试。', 'error');
          submissionTokenRef.current = null;
          return;
        }
      }

      const duplicateCheck = checkDuplicate(formData);
      if (duplicateCheck.isDuplicate && duplicateCheck.duplicateTask) {
        showToast(`检测到重复任务: "${duplicateCheck.duplicateTask.title}"，请修改任务名称或内容`, 'warning');
        submissionTokenRef.current = null;
        return;
      }

      setPendingTaskData({ title: formData.title, description: formData.description });
      addTask(formData);
      showToast('任务创建成功', 'success');
      submissionTokenRef.current = null;
    }
    setShowModal(false);
    setEditingTask(null);
    setFormData({ title: '', description: '', priority: '中', status: '进行中', dueDate: '' });
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      priority: task.priority as '低' | '中' | '高' | '紧急',
      status: task.status as '进行中' | '已完成' | '已过期',
      dueDate: task.dueDate || '',
    });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    setDeleteConfirm({ isOpen: true, taskId: id });
  };

  const handleConfirmDelete = () => {
    if (deleteConfirm.taskId) {
      deleteTask(deleteConfirm.taskId);
      showToast('任务删除成功', 'success');
    }
    setDeleteConfirm({ isOpen: false, taskId: null });
  };

  const handleConfirmBatchDelete = () => {
    const group = duplicateGroups.find(g => g.ruleId === batchDeleteConfirm.ruleId);
    if (!group) {
      setBatchDeleteConfirm({ isOpen: false, ruleName: '', count: 0, ruleId: '' });
      return;
    }

    const taskIds = group.tasks
      .filter(ti => !ti.isNewest && !ti.isProtected)
      .map(ti => ti.task.id);

    if (taskIds.length > 0) {
      const result = deleteTasks(tasks, batchDeleteConfirm.ruleId, taskIds, currentUser?.username || 'user');
      result.deletedTaskIds.forEach(taskId => deleteTask(taskId));
      showToast(`已删除 ${result.deletedCount} 个重复任务`, 'success');
      const newGroups = findDuplicates(tasks.filter(t => t.status !== '已完成' && !result.deletedTaskIds.includes(t.id)));
      setDuplicateGroups(newGroups);
      if (newGroups.length === 0) {
        setShowDuplicateModal(false);
      }
    }
    setBatchDeleteConfirm({ isOpen: false, ruleName: '', count: 0, ruleId: '' });
  };

  const handleToggleComplete = (task: Task) => {
    const newStatus = task.status === '已完成' ? '进行中' : '已完成';
    
    if (newStatus === '已完成' && task.title.includes('故障处理')) {
      const match = task.title.match(/\(([^)]+)\)/);
      if (match) {
        const idOrNumber = match[1];
        
        let module = projects
          .flatMap((p) => p.modules)
          .find((m) => m.moduleNumber === idOrNumber || m.moduleName === idOrNumber);
        
        let component: Component | undefined;
        
        if (!module) {
          for (const project of projects) {
            for (const mod of project.modules) {
              const comp = mod.components.find((c) => c.componentNumber === idOrNumber || c.componentName === idOrNumber);
              if (comp) {
                component = comp;
                module = mod;
                break;
              }
            }
            if (component) break;
          }
        }
        
        if (component && component.status === '故障') {
          setPendingFaultComponent({ task, component, module: module! });
          setNewComponentStatus('正常');
          setShowComponentStatusModal(true);
          return;
        }
        
        if (module && module.status === '故障') {
          setPendingFaultTask({ task, module });
          setNewModuleStatus('正常');
          setShowModuleStatusModal(true);
          return;
        }
      }
    }
    
    updateTask(task.id, { 
      status: newStatus,
      completedAt: newStatus === '已完成' ? new Date().toISOString() : undefined,
    });
    showToast(newStatus === '已完成' ? '任务已完成' : '任务已恢复', 'success');
  };

  const handleConfirmModuleStatusChange = () => {
    if (!pendingFaultTask) return;
    
    const { task, module } = pendingFaultTask;
    const project = projects.find((p) => p.modules.some((m) => m.id === module.id));
    
    if (project) {
      updateModule(project.id, module.id, {
        status: newModuleStatus,
      });
      
      updateTask(task.id, { 
        status: '已完成',
        completedAt: new Date().toISOString(),
      });
      
      showToast(`模块 ${module.moduleName} 状态已更改为 ${newModuleStatus}，任务已完成`, 'success');
      setShowModuleStatusModal(false);
      setPendingFaultTask(null);
    }
  };

  const handleConfirmComponentStatusChange = () => {
    if (!pendingFaultComponent) return;
    
    const { task, component, module } = pendingFaultComponent;
    const project = projects.find((p) => p.modules.some((m) => m.id === module.id));
    
    if (project) {
      updateComponent(project.id, module.id, component.id, {
        status: newComponentStatus,
      });
      
      updateTask(task.id, { 
        status: '已完成',
        completedAt: new Date().toISOString(),
      });
      
      showToast(`组件 ${component.componentName} 状态已更改为 ${newComponentStatus}，任务已完成`, 'success');
      setShowComponentStatusModal(false);
      setPendingFaultComponent(null);
    }
  };

  const canEdit = currentUser?.role !== 'viewer';

  const stats = {
    total: tasks.length,
    ongoing: tasks.filter((t) => t.status === '进行中').length,
    completed: tasks.filter((t) => t.status === '已完成').length,
    overdue: tasks.filter((t) => t.status === '已过期').length,
  };

  const getStatColor = (index: number) => {
    const colors = [
      isCyberpunk ? 'text-white' : 'text-gray-900',
      'text-blue-400',
      'text-emerald-400',
      'text-rose-400'
    ];
    return colors[index];
  };

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: '总任务', value: stats.total },
          { label: '进行中', value: stats.ongoing },
          { label: '已完成', value: stats.completed },
          { label: '已过期', value: stats.overdue },
        ].map((stat, index) => (
          <div key={stat.label} className={`${baseStyles.card} rounded-xl p-4 relative overflow-hidden`}>
            {isCyberpunk && (
              <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-br ${
                index === 0 ? 'from-gray-500/10' : index === 1 ? 'from-blue-500/10' : index === 2 ? 'from-emerald-500/10' : 'from-rose-500/10'
              } to-transparent rounded-bl-full`} />
            )}
            <div className={`text-xs ${baseStyles.textSecondary} mb-1`}>{stat.label}</div>
            <div className={`text-3xl font-bold ${getStatColor(index)}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      {pageRefreshDetected && blockedTaskMessage && (
        <div className="mb-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50">
          <div className="flex items-start gap-3">
            <RefreshCw size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-1">
                重复创建已阻止
              </h4>
              <p className="text-xs text-amber-600 dark:text-amber-400 whitespace-pre-line">
                {blockedTaskMessage}
              </p>
            </div>
            <button
              onClick={() => {
                setPageRefreshDetected(false);
                setBlockedTaskMessage(null);
              }}
              className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-500"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <div className="flex flex-col gap-2 flex-1">
          <div className={`flex gap-1 p-1 rounded-xl ${isDark ? 'bg-white/5 border border-white/5' : 'bg-white border border-gray-200'}`}>
            {(['all', '进行中', '已完成', '已过期'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filter === status
                    ? isCyberpunk
                      ? 'bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white shadow-lg shadow-cyan-500/25'
                      : isDark
                        ? 'bg-white/10 text-white'
                        : 'bg-gray-900 text-white'
                    : isDark
                      ? 'text-gray-400 hover:text-white hover:bg-white/5'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {status === 'all' ? '全部' : status}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const groups = findDuplicates(tasks.filter(t => t.status !== '已完成'));
              setDuplicateGroups(groups);
              setShowDuplicateModal(true);
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
              isDark
                ? 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                : 'bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200'
            }`}
          >
            <Copy size={14} />
            查重
          </button>
          <button
            onClick={() => setShowTrashPanel(true)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
              isDark
                ? 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                : 'bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200'
            }`}
          >
            <History size={14} />
            {trashItems.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-xs">
                {trashItems.length}
              </span>
            )}
            回收站
          </button>
          {currentUser?.role === 'admin' && (
            <button
              onClick={() => setShowDuplicateRulePanel(true)}
              className={`p-2 rounded-xl transition-all ${
                isCyberpunk
                  ? 'text-gray-500 hover:text-cyan-400 hover:bg-white/5'
                  : isDark
                    ? 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
              title="重复任务规则管理"
            >
              <Zap size={16} />
            </button>
          )}
          {canEdit && (
            <button
              onClick={() => {
                setEditingTask(null);
                setFormData({ title: '', description: '', priority: '中', status: '进行中', dueDate: '' });
                submissionTokenRef.current = duplicateTaskService.generateSubmissionToken(formData);
                setShowModal(true);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all ${
                isCyberpunk
                  ? 'bg-gradient-to-r from-cyan-500 to-fuchsia-500 shadow-lg shadow-cyan-500/25 hover:opacity-90'
                  : baseStyles.accent
              }`}
            >
              <Zap size={14} />
              新建任务
            </button>
          )}
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <div className={`text-center py-16 ${baseStyles.emptyBg} rounded-2xl border ${baseStyles.border}`}>
          <div className={`w-14 h-14 mx-auto mb-3 rounded-xl flex items-center justify-center ${
            isDark ? 'bg-white/10' : 'bg-gray-100'
          }`}>
            <Zap className={isDark ? 'text-gray-500' : 'text-gray-300'} size={28} />
          </div>
          <p className={`${baseStyles.textSecondary} text-sm`}>暂无任务</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task) => (
            <div key={task.id} className={`group rounded-xl border transition-all ${baseStyles.card}`}>
              <div className="flex items-center gap-4 p-4">
                <button
                  onClick={() => handleToggleComplete(task)}
                  className={`p-2 rounded-xl transition-all ${
                    task.status === '已完成' 
                      ? isCyberpunk ? 'bg-emerald-500/20 text-emerald-400' : isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-green-100 text-green-600'
                      : isCyberpunk 
                        ? 'bg-white/5 text-gray-500 hover:text-emerald-400 hover:bg-emerald-500/10'
                        : isDark
                          ? 'bg-white/5 text-gray-500 hover:text-emerald-400 hover:bg-white/10'
                          : 'bg-gray-100 text-gray-400 hover:text-green-600 hover:bg-green-50'
                  }`}
                >
                  <CheckCircle size={20} />
                </button>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${task.status === '已完成' ? 'line-through text-gray-500' : baseStyles.text}`}>
                    {task.title}
                  </div>
                  {task.description && (
                    <div className={`text-xs ${baseStyles.textSecondary} mt-1 truncate`}>{task.description}</div>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-2 py-0.5 rounded text-xs border ${getTaskPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    {task.dueDate && (
                      <span className={`text-xs flex items-center gap-1 ${baseStyles.textSecondary}`}>
                        <Clock size={10} />
                        截止: {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${getTaskStatusColor(task.status)}`}>
                    {task.status}
                  </span>
                  {canEdit && (
                    <div className={`flex gap-1 ${isDark ? 'opacity-0 group-hover:opacity-100' : ''} transition-opacity`}>
                      <button onClick={() => handleEdit(task)} className={`p-2 rounded-lg transition-colors ${
                        isCyberpunk 
                          ? 'text-gray-500 hover:text-cyan-400 hover:bg-white/5' 
                          : isDark
                            ? 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                      }`}>
                        <Edit size={14} />
                      </button>
                      <button onClick={() => handleDelete(task.id)} className={`p-2 rounded-lg transition-colors ${
                        isCyberpunk 
                          ? 'text-gray-500 hover:text-rose-400 hover:bg-white/5' 
                          : isDark
                            ? 'text-gray-500 hover:text-red-400 hover:bg-white/5'
                            : 'text-gray-400 hover:text-red-600 hover:bg-gray-100'
                      }`}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className={`${baseStyles.modalBg} border ${baseStyles.modalBorder} rounded-2xl p-6 w-full max-w-md shadow-xl ${
            isCyberpunk ? 'shadow-fuchsia-500/10' : ''
          }`} onClick={(e) => e.stopPropagation()}>
            <h2 className={`text-lg font-semibold ${baseStyles.text} mb-5`}>{editingTask ? '编辑任务' : '新建任务'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>任务标题</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className={`w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none transition-colors ${
                    isCyberpunk 
                      ? 'bg-white/5 border border-white/10 text-white focus:border-cyan-500/50' 
                      : isDark
                        ? 'bg-white/5 border border-white/10 text-white'
                        : 'border border-gray-200 text-gray-900'
                  }`}
                  required
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={`w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none transition-colors ${
                    isCyberpunk 
                      ? 'bg-white/5 border border-white/10 text-white focus:border-cyan-500/50' 
                      : isDark
                        ? 'bg-white/5 border border-white/10 text-white'
                        : 'border border-gray-200 text-gray-900'
                  }`}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>优先级</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as '低' | '中' | '高' | '紧急' })}
                    className={`w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none transition-colors ${
                      isCyberpunk 
                        ? 'bg-white/5 border border-white/10 text-white focus:border-cyan-500/50' 
                        : isDark
                          ? 'bg-white/5 border border-white/10 text-white'
                          : 'border border-gray-200 text-gray-900'
                    }`}
                  >
                    <option value="低">低</option>
                    <option value="中">中</option>
                    <option value="高">高</option>
                    <option value="紧急">紧急</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>状态</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
                    className={`w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none transition-colors ${
                      isCyberpunk 
                        ? 'bg-white/5 border border-white/10 text-white focus:border-cyan-500/50' 
                        : isDark
                          ? 'bg-white/5 border border-white/10 text-white'
                          : 'border border-gray-200 text-gray-900'
                    }`}
                  >
                    <option value="进行中">进行中</option>
                    <option value="已完成">已完成</option>
                    <option value="已过期">已过期</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>截止日期</label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className={`w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none transition-colors ${
                    isCyberpunk 
                      ? 'bg-white/5 border border-white/10 text-white focus:border-cyan-500/50' 
                      : isDark
                        ? 'bg-white/5 border border-white/10 text-white'
                        : 'border border-gray-200 text-gray-900'
                  }`}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className={`flex-1 py-2.5 border rounded-xl text-sm font-medium transition-colors ${
                  isDark 
                    ? 'border-white/10 text-gray-400 hover:bg-white/5 hover:text-white' 
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}>
                  取消
                </button>
                <button type="submit" className={`flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity ${
                  isCyberpunk 
                    ? 'bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:opacity-90' 
                    : baseStyles.accent
                }`}>
                  {editingTask ? '保存' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModuleStatusModal && pendingFaultTask && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowModuleStatusModal(false)}>
          <div className={`${baseStyles.modalBg} border ${baseStyles.modalBorder} rounded-2xl p-6 w-full max-w-md shadow-xl ${
            isCyberpunk ? 'shadow-fuchsia-500/10' : ''
          }`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-3 rounded-xl ${isCyberpunk ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600'}`}>
                <AlertTriangle size={24} />
              </div>
              <h2 className={`text-lg font-semibold ${baseStyles.text}`}>更改模块状态</h2>
            </div>
            
            <div className={`p-4 rounded-xl mb-4 ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
              <div className={`text-sm ${baseStyles.textSecondary} mb-2`}>故障模块信息</div>
              <div className={`text-sm font-medium ${baseStyles.text} mb-1`}>名称：{pendingFaultTask.module.moduleName}</div>
              <div className={`text-sm ${baseStyles.text} mb-1`}>编号：{pendingFaultTask.module.moduleNumber}</div>
              <div className={`text-sm ${baseStyles.text}`}>当前状态：<span className="text-red-500">故障</span></div>
            </div>

            <div className="mb-5">
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
                请选择新的模块状态
              </label>
              <select
                value={newModuleStatus}
                onChange={(e) => setNewModuleStatus(e.target.value as Module['status'])}
                className={`w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none transition-colors ${
                  isCyberpunk 
                    ? 'bg-white/5 border border-white/10 text-white focus:border-cyan-500/50' 
                    : isDark
                      ? 'bg-white/5 border border-white/10 text-white'
                      : 'border border-gray-200 text-gray-900'
                }`}
              >
                <option value="正常">正常</option>
                <option value="维修中">维修中</option>
                <option value="三防中">三防中</option>
                <option value="测试中">测试中</option>
                <option value="仿真中">仿真中</option>
                <option value="借用中">借用中</option>
                <option value="未投产">未投产</option>
                <option value="投产中">投产中</option>
              </select>
            </div>

            <div className={`p-4 rounded-xl mb-5 ${isCyberpunk ? 'bg-blue-500/10 border border-blue-500/20' : isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-100'}`}>
              <div className={`text-xs ${isCyberpunk ? 'text-blue-300' : isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                <span className="font-medium">提示：</span>
                完成此任务前，请先更改模块状态。更改后任务将自动标记为已完成。
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={() => setShowModuleStatusModal(false)} 
                className={`flex-1 py-2.5 border rounded-xl text-sm font-medium transition-colors ${
                  isDark 
                    ? 'border-white/10 text-gray-400 hover:bg-white/5 hover:text-white' 
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                取消
              </button>
              <button 
                type="button" 
                onClick={handleConfirmModuleStatusChange} 
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity ${
                  isCyberpunk 
                    ? 'bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:opacity-90' 
                    : baseStyles.accent
                }`}
              >
                确认更改
              </button>
            </div>
          </div>
        </div>
      )}

      {showComponentStatusModal && pendingFaultComponent && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowComponentStatusModal(false)}>
          <div className={`${baseStyles.modalBg} border ${baseStyles.modalBorder} rounded-2xl p-6 w-full max-w-md shadow-xl ${
            isCyberpunk ? 'shadow-fuchsia-500/10' : ''
          }`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-3 rounded-xl ${isCyberpunk ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600'}`}>
                <AlertTriangle size={24} />
              </div>
              <h2 className={`text-lg font-semibold ${baseStyles.text}`}>更改组件状态</h2>
            </div>
            
            <div className={`p-4 rounded-xl mb-4 ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
              <div className={`text-sm ${baseStyles.textSecondary} mb-2`}>故障组件信息</div>
              <div className={`text-sm font-medium ${baseStyles.text} mb-1`}>名称：{pendingFaultComponent.component.componentName}</div>
              <div className={`text-sm ${baseStyles.text} mb-1`}>编号：{pendingFaultComponent.component.componentNumber}</div>
              <div className={`text-sm ${baseStyles.text} mb-1`}>所属模块：{pendingFaultComponent.module.moduleName}</div>
              <div className={`text-sm ${baseStyles.text}`}>当前状态：<span className="text-red-500">故障</span></div>
            </div>

            <div className="mb-5">
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
                请选择新的组件状态
              </label>
              <select
                value={newComponentStatus}
                onChange={(e) => setNewComponentStatus(e.target.value as Component['status'])}
                className={`w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none transition-colors ${
                  isCyberpunk 
                    ? 'bg-white/5 border border-white/10 text-white focus:border-cyan-500/50' 
                    : isDark
                      ? 'bg-white/5 border border-white/10 text-white'
                      : 'border border-gray-200 text-gray-900'
                }`}
              >
                <option value="正常">正常</option>
                <option value="维修中">维修中</option>
                <option value="三防中">三防中</option>
                <option value="测试中">测试中</option>
                <option value="仿真中">仿真中</option>
                <option value="借用中">借用中</option>
                <option value="未投产">未投产</option>
                <option value="投产中">投产中</option>
              </select>
            </div>

            <div className={`p-4 rounded-xl mb-5 ${isCyberpunk ? 'bg-blue-500/10 border border-blue-500/20' : isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-100'}`}>
              <div className={`text-xs ${isCyberpunk ? 'text-blue-300' : isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                <span className="font-medium">提示：</span>
                完成此任务前，请先更改组件状态。更改后任务将自动标记为已完成。
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={() => setShowComponentStatusModal(false)} 
                className={`flex-1 py-2.5 border rounded-xl text-sm font-medium transition-colors ${
                  isDark 
                    ? 'border-white/10 text-gray-400 hover:bg-white/5 hover:text-white' 
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                取消
              </button>
              <button 
                type="button" 
                onClick={handleConfirmComponentStatusChange} 
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity ${
                  isCyberpunk 
                    ? 'bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:opacity-90' 
                    : baseStyles.accent
                }`}
              >
                确认更改
              </button>
            </div>
          </div>
        </div>
      )}

      <DuplicateTaskRulePanel
        isOpen={showDuplicateRulePanel}
        onClose={() => setShowDuplicateRulePanel(false)}
        rules={rules}
        onCreateRule={createRule}
        onUpdateRule={updateRule}
        onDeleteRule={deleteRule}
        onToggleRule={toggleRule}
      />

      <TrashManagementPanel
        isOpen={showTrashPanel}
        onClose={() => setShowTrashPanel(false)}
        trashItems={trashItems}
        historyItems={historyItems}
        onRestore={restoreTask}
        onPermanentDelete={permanentlyDelete}
        onEmptyTrash={emptyTrash}
        onCleanupExpired={cleanupExpired}
      />

      {showDuplicateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowDuplicateModal(false)}>
          <div className={`${baseStyles.modalBg} border ${baseStyles.modalBorder} rounded-2xl p-6 w-full max-w-2xl shadow-xl max-h-[80vh] overflow-hidden flex flex-col`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
                  <Copy size={20} />
                </div>
                <h2 className={`text-lg font-semibold ${baseStyles.text}`}>重复任务检测</h2>
              </div>
              <button
                onClick={() => setShowDuplicateModal(false)}
                className={`p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${baseStyles.textSecondary}`}
              >
                <X size={18} />
              </button>
            </div>

            {duplicateGroups.length === 0 ? (
              <div className="text-center py-12">
                <Copy size={48} className={`mx-auto mb-4 ${baseStyles.textSecondary} opacity-30`} />
                <p className={baseStyles.textSecondary}>未检测到重复任务</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-4">
                <p className="text-sm text-gray-500">共发现 {duplicateGroups.length} 组重复任务</p>
                {duplicateGroups.map((group, groupIndex) => {
                  const rule = rules.find(r => r.id === group.ruleId);
                  return (
                    <div key={groupIndex} className={`p-4 rounded-xl border ${baseStyles.border}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className={`text-sm font-medium ${baseStyles.text}`}>
                            规则: {rule?.name || '未知规则'}
                          </h4>
                          <p className="text-xs text-gray-500">
                            匹配字段: {group.matchKey}
                          </p>
                        </div>
                        {rule?.enabled && (
                          <button
                            onClick={() => {
                              const taskIds = group.tasks.filter(t => !t.isNewest && !t.isProtected).map(t => t.task.id);
                              if (taskIds.length > 0) {
                                setBatchDeleteConfirm({
                                  isOpen: true,
                                  ruleName: rule.name,
                                  count: taskIds.length,
                                  ruleId: group.ruleId,
                                });
                              }
                            }}
                            className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg flex items-center gap-1"
                          >
                            <Trash size={12} />
                            清理重复
                          </button>
                        )}
                      </div>
                      <div className="space-y-2">
                        {group.tasks.map((taskInfo, taskIndex) => (
                          <div
                            key={taskInfo.task.id}
                            className={`flex items-center justify-between p-3 rounded-lg ${
                              taskInfo.isNewest
                                ? 'bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20'
                                : 'bg-gray-50 dark:bg-gray-700/50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                taskInfo.isNewest
                                  ? 'bg-green-500 text-white'
                                  : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                              }`}>
                                {taskIndex + 1}
                              </span>
                              <div>
                                <p className={`text-sm font-medium ${baseStyles.text} ${taskInfo.isNewest ? '' : 'line-through opacity-60'}`}>
                                  {taskInfo.task.title}
                                </p>
                                <p className="text-xs text-gray-500">
                                  创建于 {new Date(taskInfo.task.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {taskInfo.isNewest && (
                                <span className="px-2 py-0.5 bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 text-xs rounded">
                                  保留
                                </span>
                              )}
                              {taskInfo.isProtected && (
                                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs rounded">
                                  受保护
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, taskId: null })}
        onConfirm={handleConfirmDelete}
        title="删除任务"
        message="确定要删除这个任务吗？此操作不可撤销。"
        confirmText="删除"
        cancelText="取消"
        variant="danger"
      />

      <ConfirmModal
        isOpen={batchDeleteConfirm.isOpen}
        onClose={() => setBatchDeleteConfirm({ isOpen: false, ruleName: '', count: 0, ruleId: '' })}
        onConfirm={handleConfirmBatchDelete}
        title="批量删除重复任务"
        message={`确定要按照规则"${batchDeleteConfirm.ruleName}"删除 ${batchDeleteConfirm.count} 个重复任务吗？此操作不可撤销。`}
        confirmText="删除"
        cancelText="取消"
        variant="danger"
      />
    </div>
  );
}
