import React, { useState } from 'react';
import { CheckCircle, Trash2, Edit, Zap, Clock, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/Toast';
import { useTheme } from '../context/ThemeContext';
import type { Task, TaskStatus, Module, Component } from '../types';

const themeConfig = {
  minimal: {
    priorityColors: {
      低: 'bg-gray-100 text-gray-600',
      中: 'bg-blue-50 text-blue-600',
      高: 'bg-orange-50 text-orange-600',
      紧急: 'bg-red-50 text-red-600',
    },
    statusColors: {
      进行中: 'bg-blue-50 text-blue-600',
      已完成: 'bg-green-50 text-green-600',
      已过期: 'bg-red-50 text-red-600',
    },
    card: 'bg-white border-gray-200 hover:border-gray-300',
    statsCard: 'bg-white border-gray-200',
    text: 'text-gray-900',
    textSecondary: 'text-gray-500',
    accent: 'bg-gray-900 hover:bg-gray-800',
    modalBg: 'bg-white',
    modalBorder: 'border-gray-200',
    emptyBg: 'bg-white',
    border: 'border-gray-200',
  },
  light: {
    priorityColors: {
      低: 'bg-gray-100 text-gray-600',
      中: 'bg-blue-50 text-blue-600',
      高: 'bg-orange-50 text-orange-600',
      紧急: 'bg-red-50 text-red-600',
    },
    statusColors: {
      进行中: 'bg-blue-50 text-blue-600',
      已完成: 'bg-green-50 text-green-600',
      已过期: 'bg-red-50 text-red-600',
    },
    card: 'bg-white border-gray-100 hover:border-gray-200',
    statsCard: 'bg-white border-gray-100',
    text: 'text-gray-900',
    textSecondary: 'text-gray-500',
    accent: 'bg-blue-600 hover:bg-blue-500',
    modalBg: 'bg-white',
    modalBorder: 'border-gray-200',
    emptyBg: 'bg-white',
    border: 'border-gray-200',
  },
  dark: {
    priorityColors: {
      低: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
      中: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      高: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      紧急: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    },
    statusColors: {
      进行中: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      已完成: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      已过期: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
    },
    card: 'bg-gray-800 border-gray-700 hover:border-gray-600',
    statsCard: 'bg-gray-800 border-gray-700',
    text: 'text-white',
    textSecondary: 'text-gray-400',
    accent: 'bg-blue-600 hover:bg-blue-500',
    modalBg: 'bg-gray-800',
    modalBorder: 'border-gray-700',
    emptyBg: 'bg-gray-800',
    border: 'border-gray-700',
  },
  cyberpunk: {
    priorityColors: {
      低: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
      中: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      高: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      紧急: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    },
    statusColors: {
      进行中: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      已完成: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      已过期: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
    },
    card: 'bg-[#161b22] border-white/5 hover:border-cyan-500/30',
    statsCard: 'bg-[#161b22] border-white/5',
    text: 'text-white',
    textSecondary: 'text-gray-500',
    accent: 'bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:opacity-90',
    modalBg: 'bg-[#161b22]',
    modalBorder: 'border-white/10',
    emptyBg: 'bg-[#161b22]',
    border: 'border-white/10',
  },
  linear: {
    priorityColors: {
      低: 'bg-gray-500/10 text-gray-400 border border-gray-500/20',
      中: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      高: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
      紧急: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
    },
    statusColors: {
      进行中: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      已完成: 'bg-green-500/10 text-green-400 border border-green-500/20',
      已过期: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
    },
    card: 'bg-[#141416] border-[#2c2c30] hover:border-[#3c3c40]',
    statsCard: 'bg-[#141416] border-[#2c2c30]',
    text: 'text-[#ededef]',
    textSecondary: 'text-[#8a8a8e]',
    accent: 'bg-[#5e6ad2] hover:bg-[#4b5ab8]',
    modalBg: 'bg-[#141416]',
    modalBorder: 'border-[#2c2c30]',
    emptyBg: 'bg-[#141416]',
    border: 'border-[#2c2c30]',
  },
  anime: {
    priorityColors: {
      低: 'bg-pink-500/10 text-pink-400 border border-pink-500/20',
      中: 'bg-violet-500/10 text-violet-400 border border-violet-500/20',
      高: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
      紧急: 'bg-red-500/10 text-red-400 border border-red-500/20',
    },
    statusColors: {
      进行中: 'bg-violet-500/10 text-violet-400 border border-violet-500/20',
      已完成: 'bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20',
      已过期: 'bg-red-500/10 text-red-400 border border-red-500/20',
    },
    card: 'bg-[#1a1625] border-pink-500/20 hover:border-pink-500/40',
    statsCard: 'bg-[#1a1625] border-pink-500/20',
    text: 'text-white',
    textSecondary: 'text-pink-300/70',
    accent: 'bg-gradient-to-r from-pink-500 to-violet-500 hover:opacity-90',
    modalBg: 'bg-[#1a1625]',
    modalBorder: 'border-pink-500/20',
    emptyBg: 'bg-[#1a1625]',
    border: 'border-pink-500/20',
  },
  cosmos: {
    priorityColors: {
      低: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
      中: 'bg-violet-500/10 text-violet-400 border border-violet-500/20',
      高: 'bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20',
      紧急: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
    },
    statusColors: {
      进行中: 'bg-violet-500/10 text-violet-400 border border-violet-500/20',
      已完成: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      已过期: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
    },
    card: 'bg-indigo-900/40 border-purple-500/30 hover:border-purple-500/50',
    statsCard: 'bg-indigo-900/40 border-purple-500/30',
    text: 'text-white',
    textSecondary: 'text-purple-200',
    accent: 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:opacity-90',
    modalBg: 'bg-indigo-950/95',
    modalBorder: 'border-purple-500/30',
    emptyBg: 'bg-indigo-900/40',
    border: 'border-purple-500/30',
  },
  classical: {
    priorityColors: {
      低: 'bg-stone-100 text-stone-600 border border-stone-200',
      中: 'bg-amber-50 text-amber-600 border border-amber-200',
      高: 'bg-orange-50 text-orange-600 border border-orange-200',
      紧急: 'bg-red-50 text-red-600 border border-red-200',
    },
    statusColors: {
      进行中: 'bg-amber-50 text-amber-600 border border-amber-200',
      已完成: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
      已过期: 'bg-red-50 text-red-600 border border-red-200',
    },
    card: 'bg-white/80 border-amber-200/60 hover:border-amber-300/80',
    statsCard: 'bg-white/80 border-amber-200/60',
    text: 'text-stone-800',
    textSecondary: 'text-stone-600',
    accent: 'bg-gradient-to-r from-amber-600 to-orange-500 hover:opacity-90',
    modalBg: 'bg-white/95',
    modalBorder: 'border-amber-200/60',
    emptyBg: 'bg-white/80',
    border: 'border-amber-200/60',
  },
};

export default function TaskManagement() {
  const { tasks, addTask, updateTask, deleteTask, currentUser, projects, updateModule, updateComponent } = useApp();
  const { showToast } = useToast();
  const { theme } = useTheme();
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

  const t = themeConfig[theme] || themeConfig.dark;
  const isCyberpunk = theme === 'cyberpunk';
  const isDark = !theme || theme === 'dark' || theme === 'cyberpunk' || theme === 'linear' || theme === 'anime';

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
      addTask(formData);
      showToast('任务创建成功', 'success');
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
    if (confirm('确定要删除这个任务吗？')) {
      deleteTask(id);
      showToast('任务删除成功', 'success');
    }
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
          <div key={stat.label} className={`${t.statsCard} rounded-xl p-4 relative overflow-hidden`}>
            {isCyberpunk && (
              <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-br ${
                index === 0 ? 'from-gray-500/10' : index === 1 ? 'from-blue-500/10' : index === 2 ? 'from-emerald-500/10' : 'from-rose-500/10'
              } to-transparent rounded-bl-full`} />
            )}
            <div className={`text-xs ${t.textSecondary} mb-1`}>{stat.label}</div>
            <div className={`text-3xl font-bold ${getStatColor(index)}`}>{stat.value}</div>
          </div>
        ))}
      </div>

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
        {canEdit && (
          <button
            onClick={() => {
              setEditingTask(null);
              setFormData({ title: '', description: '', priority: '中', status: '进行中', dueDate: '' });
              setShowModal(true);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all ${
              isCyberpunk 
                ? 'bg-gradient-to-r from-cyan-500 to-fuchsia-500 shadow-lg shadow-cyan-500/25 hover:opacity-90' 
                : t.accent
            }`}
          >
            <Zap size={14} />
            新建任务
          </button>
        )}
      </div>

      {filteredTasks.length === 0 ? (
        <div className={`text-center py-16 ${t.emptyBg} rounded-2xl border ${t.border}`}>
          <div className={`w-14 h-14 mx-auto mb-3 rounded-xl flex items-center justify-center ${
            isDark ? 'bg-white/10' : 'bg-gray-100'
          }`}>
            <Zap className={isDark ? 'text-gray-500' : 'text-gray-300'} size={28} />
          </div>
          <p className={`${t.textSecondary} text-sm`}>暂无任务</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task) => (
            <div key={task.id} className={`group rounded-xl border transition-all ${t.card}`}>
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
                  <div className={`text-sm font-medium ${task.status === '已完成' ? 'line-through text-gray-500' : t.text}`}>
                    {task.title}
                  </div>
                  {task.description && (
                    <div className={`text-xs ${t.textSecondary} mt-1 truncate`}>{task.description}</div>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-2 py-0.5 rounded text-xs border ${
                      t.priorityColors[task.priority as keyof typeof t.priorityColors]
                    }`}>
                      {task.priority}
                    </span>
                    {task.dueDate && (
                      <span className={`text-xs flex items-center gap-1 ${t.textSecondary}`}>
                        <Clock size={10} />
                        截止: {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                    t.statusColors[task.status as keyof typeof t.statusColors]
                  }`}>
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
          <div className={`${t.modalBg} border ${t.modalBorder} rounded-2xl p-6 w-full max-w-md shadow-xl ${
            isCyberpunk ? 'shadow-fuchsia-500/10' : ''
          }`} onClick={(e) => e.stopPropagation()}>
            <h2 className={`text-lg font-semibold ${t.text} mb-5`}>{editingTask ? '编辑任务' : '新建任务'}</h2>
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
                    : t.accent
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
          <div className={`${t.modalBg} border ${t.modalBorder} rounded-2xl p-6 w-full max-w-md shadow-xl ${
            isCyberpunk ? 'shadow-fuchsia-500/10' : ''
          }`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-3 rounded-xl ${isCyberpunk ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600'}`}>
                <AlertTriangle size={24} />
              </div>
              <h2 className={`text-lg font-semibold ${t.text}`}>更改模块状态</h2>
            </div>
            
            <div className={`p-4 rounded-xl mb-4 ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
              <div className={`text-sm ${t.textSecondary} mb-2`}>故障模块信息</div>
              <div className={`text-sm font-medium ${t.text} mb-1`}>名称：{pendingFaultTask.module.moduleName}</div>
              <div className={`text-sm ${t.text} mb-1`}>编号：{pendingFaultTask.module.moduleNumber}</div>
              <div className={`text-sm ${t.text}`}>当前状态：<span className="text-red-500">故障</span></div>
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
                    : t.accent
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
          <div className={`${t.modalBg} border ${t.modalBorder} rounded-2xl p-6 w-full max-w-md shadow-xl ${
            isCyberpunk ? 'shadow-fuchsia-500/10' : ''
          }`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-3 rounded-xl ${isCyberpunk ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600'}`}>
                <AlertTriangle size={24} />
              </div>
              <h2 className={`text-lg font-semibold ${t.text}`}>更改组件状态</h2>
            </div>
            
            <div className={`p-4 rounded-xl mb-4 ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
              <div className={`text-sm ${t.textSecondary} mb-2`}>故障组件信息</div>
              <div className={`text-sm font-medium ${t.text} mb-1`}>名称：{pendingFaultComponent.component.componentName}</div>
              <div className={`text-sm ${t.text} mb-1`}>编号：{pendingFaultComponent.component.componentNumber}</div>
              <div className={`text-sm ${t.text} mb-1`}>所属模块：{pendingFaultComponent.module.moduleName}</div>
              <div className={`text-sm ${t.text}`}>当前状态：<span className="text-red-500">故障</span></div>
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
                    : t.accent
                }`}
              >
                确认更改
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
