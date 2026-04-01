import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Play, Pause, Trash2, Plus, Edit, Move, X, CheckCircle,
  Clock, AlertCircle, Settings, Copy, Link2, Unlink, AlertTriangle,
  Gauge, Users, ArrowRight, ChevronDown, ChevronRight, Save, Database,
  Bell
} from 'lucide-react';
import { useToast } from '../components/Toast';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { ConfirmModal } from '../components/ui/Modal';

export interface StepInput {
  name: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'file' | 'date';
  required: boolean;
  defaultValue?: any;
  options?: string[];
  description?: string;
}

export interface StepOutput {
  name: string;
  type: 'text' | 'number' | 'boolean' | 'file' | 'json' | 'select';
  description?: string;
  options?: string[];
  required?: boolean;
}

export interface StepDependency {
  stepId: string;
  condition: 'completed' | 'failed' | 'any';
}

export interface StepException {
  type?: 'retry' | 'skip' | 'abort' | 'fallback';
  maxRetries?: number;
  fallbackStepId?: string;
  notification?: string;
}

export interface StepExecution {
  priority: number;
  timeout?: number;
  retryCount?: number;
  assignedTo?: string;
  resourceTags?: string[];
}

export interface Step {
  id: string;
  name: string;
  description?: string;
  type: 'task' | 'delay' | 'condition' | 'notification' | 'approval' | 'data';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  config: any;
  input?: StepInput[];
  output?: StepOutput[];
  dependsOn?: StepDependency[];
  execution?: StepExecution;
  exception?: StepException;
  executionTime?: number;
  errorMessage?: string;
  assignee?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  steps: Step[];
  status: 'draft' | 'running' | 'paused' | 'completed' | 'failed';
  createdAt: number;
  updatedAt: number;
  version?: number;
}

export default function WorkflowDetail() {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const t = useThemeStyles();
  const navigate = useNavigate();

  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [editingStep, setEditingStep] = useState<Step | null>(null);
  const [showStepEditModal, setShowStepEditModal] = useState(false);
  const [showStepAddModal, setShowStepAddModal] = useState(false);
  const [showStepDetails, setShowStepDetails] = useState<string | null>(null);
  const [newStepName, setNewStepName] = useState('');
  const [newStepType, setNewStepType] = useState<Step['type']>('task');
  const [draggingStep, setDraggingStep] = useState<string | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'basic' | 'io' | 'dependency' | 'execution' | 'exception'>('basic');
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; type: 'workflow' | 'step' | null; id: string | null }>({
    isOpen: false,
    type: null,
    id: null,
  });

  useEffect(() => {
    const savedWorkflows = localStorage.getItem('workflows');
    if (savedWorkflows) {
      const workflows: Workflow[] = JSON.parse(savedWorkflows);
      const found = workflows.find(w => w.id === id);
      if (found) {
        setWorkflow(found);
      } else {
        showToast('工作流不存在', 'error');
        navigate('/tools');
      }
    } else {
      showToast('工作流不存在', 'error');
      navigate('/tools');
    }
  }, [id, navigate, showToast]);

  const saveWorkflows = (updatedWorkflows: Workflow[]) => {
    localStorage.setItem('workflows', JSON.stringify(updatedWorkflows));
  };

  const updateWorkflow = (updates: Partial<Workflow>) => {
    if (!workflow) return;
    const savedWorkflows = localStorage.getItem('workflows');
    if (savedWorkflows) {
      const workflows: Workflow[] = JSON.parse(savedWorkflows);
      const updated = workflows.map(w => w.id === workflow.id ? { ...w, ...updates, updatedAt: Date.now() } : w);
      saveWorkflows(updated);
      setWorkflow({ ...workflow, ...updates, updatedAt: Date.now() });
    }
  };

  const createDefaultStep = (name: string, type: Step['type']): Step => {
    return {
      id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      type,
      status: 'pending',
      config: {},
      input: [],
      output: [],
      dependsOn: [],
      execution: {
        priority: 5,
        retryCount: 0,
        resourceTags: [],
      },
      exception: {
        type: 'retry',
        maxRetries: 0,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  };

  const handleDeleteWorkflow = () => {
    if (!workflow) return;
    setDeleteConfirm({ isOpen: true, type: 'workflow', id: workflow.id });
  };

  const handleConfirmDelete = () => {
    if (!workflow) return;
    
    if (deleteConfirm.type === 'workflow') {
      const savedWorkflows = localStorage.getItem('workflows');
      if (savedWorkflows) {
        const workflows: Workflow[] = JSON.parse(savedWorkflows);
        const updated = workflows.filter(w => w.id !== workflow.id);
        saveWorkflows(updated);
        showToast('工作流已删除', 'success');
        navigate('/tools');
      }
    } else if (deleteConfirm.type === 'step' && deleteConfirm.id) {
      const updatedSteps = workflow.steps.filter(s => s.id !== deleteConfirm.id);
      updateWorkflow({ steps: updatedSteps });
      showToast('步骤已删除', 'success');
    }
    setDeleteConfirm({ isOpen: false, type: null, id: null });
  };

  const handleAddStep = () => {
    if (!workflow || !newStepName.trim()) {
      showToast('请输入步骤名称', 'error');
      return;
    }
    const newStep = createDefaultStep(newStepName.trim(), newStepType);
    updateWorkflow({ steps: [...workflow.steps, newStep] });
    setNewStepName('');
    setNewStepType('task');
    setShowStepAddModal(false);
    showToast('步骤已添加', 'success');
  };

  const handleUpdateStep = (updatedStep: Step) => {
    if (!workflow) return;
    const updatedSteps = workflow.steps.map(s => s.id === updatedStep.id ? { ...updatedStep, updatedAt: Date.now() } : s);
    updateWorkflow({ steps: updatedSteps });
    setShowStepEditModal(false);
    setEditingStep(null);
    showToast('步骤已更新', 'success');
  };

  const handleDeleteStep = (stepId: string) => {
    if (!workflow) return;
    setDeleteConfirm({ isOpen: true, type: 'step', id: stepId });
  };

  const handleDragStart = (stepId: string) => {
    setDraggingStep(stepId);
  };

  const handleDrop = (targetStepId: string) => {
    if (!workflow || !draggingStep || draggingStep === targetStepId) {
      setDraggingStep(null);
      return;
    }
    const steps = [...workflow.steps];
    const fromIndex = steps.findIndex(s => s.id === draggingStep);
    const toIndex = steps.findIndex(s => s.id === targetStepId);
    const [moved] = steps.splice(fromIndex, 1);
    steps.splice(toIndex, 0, moved);
    updateWorkflow({ steps });
    setDraggingStep(null);
    showToast('步骤顺序已调整', 'success');
  };

  const handleCopyWorkflow = () => {
    if (!workflow) return;
    const copy: Workflow = {
      ...workflow,
      id: `wf_${Date.now()}`,
      name: `${workflow.name} (副本)`,
      status: 'draft',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
      steps: workflow.steps.map(s => ({
        ...s,
        id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })),
    };
    const savedWorkflows = localStorage.getItem('workflows');
    const workflows = savedWorkflows ? JSON.parse(savedWorkflows) : [];
    workflows.push(copy);
    saveWorkflows(workflows);
    showToast('工作流已复制', 'success');
    navigate('/tools');
  };

  const getStepIcon = (type: Step['type']) => {
    switch (type) {
      case 'task': return <Settings size={16} />;
      case 'delay': return <Clock size={16} />;
      case 'condition': return <AlertTriangle size={16} />;
      case 'notification': return <Bell size={16} />;
      case 'approval': return <Users size={16} />;
      case 'data': return <Database size={16} />;
      default: return <Settings size={16} />;
    }
  };

  const getStatusColor = (status: Step['status']) => {
    switch (status) {
      case 'pending': return 'bg-gray-500/20 text-gray-500';
      case 'running': return 'bg-blue-500/20 text-blue-500';
      case 'completed': return 'bg-green-500/20 text-green-500';
      case 'failed': return 'bg-red-500/20 text-red-500';
      case 'skipped': return 'bg-yellow-500/20 text-yellow-500';
      default: return 'bg-gray-500/20 text-gray-500';
    }
  };

  const getStatusText = (status: Step['status']) => {
    switch (status) {
      case 'pending': return '待执行';
      case 'running': return '执行中';
      case 'completed': return '已完成';
      case 'failed': return '失败';
      case 'skipped': return '已跳过';
      default: return status;
    }
  };

  if (!workflow) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin text-gray-400" style={{ width: 32, height: 32 }}>
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" />
            <path d="M12 2C6.47715 2 2 6.47715 2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/tools')}
          className={`p-2 rounded-lg ${t.border} hover:${t.hoverBg}`}
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className={`text-2xl font-bold ${t.text}`}>{workflow.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs px-2 py-0.5 rounded ${
              workflow.status === 'running' ? 'bg-green-500/20 text-green-500' :
              workflow.status === 'completed' ? 'bg-blue-500/20 text-blue-500' :
              workflow.status === 'paused' ? 'bg-yellow-500/20 text-yellow-500' :
              workflow.status === 'failed' ? 'bg-red-500/20 text-red-500' :
              'bg-gray-500/20 text-gray-500'
            }`}>
              {workflow.status === 'running' ? '运行中' :
               workflow.status === 'completed' ? '已完成' :
               workflow.status === 'paused' ? '已暂停' :
               workflow.status === 'failed' ? '失败' : '草稿'}
            </span>
            <span className={`text-xs ${t.textMuted}`}>
              {workflow.steps.length} 个步骤
            </span>
            {workflow.description && (
              <span className={`text-xs ${t.textMuted}`}>
                {workflow.description}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {workflow.status === 'running' ? (
            <button
              onClick={() => updateWorkflow({ status: 'paused' })}
              className={`px-4 py-2 border rounded-lg ${t.border} hover:${t.hoverBg} flex items-center gap-2`}
            >
              <Pause size={16} />
              暂停
            </button>
          ) : workflow.status === 'paused' ? (
            <button
              onClick={() => updateWorkflow({ status: 'running' })}
              className={`px-4 py-2 ${t.button} text-white rounded-lg flex items-center gap-2`}
            >
              <Play size={16} />
              继续
            </button>
          ) : workflow.status === 'draft' ? (
            <button
              onClick={() => updateWorkflow({ status: 'running' })}
              className={`px-4 py-2 ${t.button} text-white rounded-lg flex items-center gap-2`}
            >
              <Play size={16} />
              运行
            </button>
          ) : null}
          <button
            onClick={handleCopyWorkflow}
            className={`p-2 rounded-lg ${t.border} hover:${t.hoverBg}`}
            title="复制工作流"
          >
            <Copy size={16} />
          </button>
          <button
            onClick={handleDeleteWorkflow}
            className={`p-2 rounded-lg ${t.border} hover:bg-red-500/20`}
            title="删除工作流"
          >
            <Trash2 size={16} className="text-red-500" />
          </button>
        </div>
      </div>

      <div className={`${t.card} rounded-lg shadow-sm p-6 border ${t.border}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-lg font-semibold ${t.text}`}>步骤配置</h2>
          <button
            onClick={() => setShowStepAddModal(true)}
            className={`px-4 py-2 ${t.button} text-white rounded-lg flex items-center gap-2`}
          >
            <Plus size={16} />
            添加步骤
          </button>
        </div>

        <div className={`text-xs ${t.textMuted} bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4`}>
          <div className="font-medium text-blue-500 mb-2">步骤分解说明</div>
          <ul className="space-y-1 ml-2">
            <li>• <strong>任务(Task)</strong>：执行具体业务操作</li>
            <li>• <strong>延迟(Delay)</strong>：等待指定时间后继续</li>
            <li>• <strong>条件(Condition)</strong>：根据条件分支执行</li>
            <li>• <strong>通知(Notification)</strong>：发送消息通知</li>
            <li>• <strong>审批(Approval)</strong>：等待人工审批确认</li>
            <li>• <strong>数据(Data)</strong>：数据处理或转换</li>
          </ul>
        </div>

        {workflow.steps.length === 0 ? (
          <div className={`text-center py-12 ${t.textMuted}`}>
            <Settings size={48} className="mx-auto mb-3 opacity-50" />
            <p>暂无步骤，点击上方按钮添加</p>
          </div>
        ) : (
          <div className="space-y-3">
            {workflow.steps.map((step, index) => (
              <div
                key={step.id}
                className={`border rounded-lg overflow-hidden ${t.border} ${
                  step.status === 'running' ? 'border-blue-500/50 bg-blue-500/5' : ''
                } ${step.status === 'failed' ? 'border-red-500/50' : ''}`}
              >
                <div
                  className="flex items-center gap-3 p-3 cursor-pointer"
                  onClick={() => setShowStepDetails(showStepDetails === step.id ? null : step.id)}
                >
                  <Move size={16} className={`cursor-move ${t.textMuted}`} />
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step.type === 'task' ? 'bg-blue-500/20 text-blue-500' :
                    step.type === 'delay' ? 'bg-yellow-500/20 text-yellow-500' :
                    step.type === 'condition' ? 'bg-purple-500/20 text-purple-500' :
                    step.type === 'notification' ? 'bg-green-500/20 text-green-500' :
                    step.type === 'approval' ? 'bg-orange-500/20 text-orange-500' :
                    'bg-cyan-500/20 text-cyan-500'
                  }`}>
                    {index + 1}
                  </span>
                  <div className="flex items-center gap-2 flex-1">
                    {getStepIcon(step.type)}
                    <span className={`font-medium ${t.text}`}>{step.name}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(step.status)}`}>
                    {getStatusText(step.status)}
                  </span>
                  {step.dependsOn && step.dependsOn.length > 0 && (
                    <span className={`text-xs ${t.textMuted} flex items-center gap-1`}>
                      <Link2 size={12} />
                      {step.dependsOn.length}
                    </span>
                  )}
                  {step.execution?.timeout && (
                    <span className={`text-xs ${t.textMuted} flex items-center gap-1`}>
                      <Clock size={12} />
                      {step.execution.timeout}s
                    </span>
                  )}
                  {step.execution?.priority && step.execution.priority !== 5 && (
                    <span className={`text-xs ${t.textMuted} flex items-center gap-1`}>
                      <Gauge size={12} />
                      P{step.execution.priority}
                    </span>
                  )}
                  {showStepDetails === step.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>

                {showStepDetails === step.id && (
                  <div className={`border-t ${t.border} p-4 bg-gray-500/5`}>
                    <div className="flex gap-2 mb-4 border-b pb-2">
                      {(['basic', 'io', 'dependency', 'execution', 'exception'] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveDetailTab(tab)}
                          className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                            activeDetailTab === tab
                              ? `${t.button} text-white`
                              : `${t.border} ${t.textSecondary} hover:${t.hoverBg}`
                          }`}
                        >
                          {tab === 'basic' ? '基本' :
                           tab === 'io' ? '输入/输出' :
                           tab === 'dependency' ? '依赖' :
                           tab === 'execution' ? '执行' : '异常'}
                        </button>
                      ))}
                    </div>

                    {activeDetailTab === 'basic' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>步骤名称</label>
                            <input
                              type="text"
                              value={step.name}
                              onChange={(e) => {
                                const updated = { ...step, name: e.target.value };
                                handleUpdateStep(updated);
                              }}
                              className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                            />
                          </div>
                          <div>
                            <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>步骤类型</label>
                            <select
                              value={step.type}
                              onChange={(e) => {
                                const updated = { ...step, type: e.target.value as Step['type'] };
                                handleUpdateStep(updated);
                              }}
                              className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                            >
                              <option value="task">任务</option>
                              <option value="delay">延迟</option>
                              <option value="condition">条件</option>
                              <option value="notification">通知</option>
                              <option value="approval">审批</option>
                              <option value="data">数据</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>步骤描述</label>
                          <textarea
                            value={step.description || ''}
                            onChange={(e) => {
                              const updated = { ...step, description: e.target.value };
                              handleUpdateStep(updated);
                            }}
                            placeholder="描述此步骤的功能和目的..."
                            className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                            rows={2}
                          />
                        </div>
                        <div>
                          <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>配置参数 (JSON)</label>
                          <textarea
                            value={JSON.stringify(step.config || {}, null, 2)}
                            onChange={(e) => {
                              try {
                                const updated = { ...step, config: JSON.parse(e.target.value) };
                                handleUpdateStep(updated);
                              } catch {}
                            }}
                            className={`w-full px-3 py-2 border rounded-lg ${t.input} font-mono text-sm`}
                            rows={4}
                          />
                        </div>
                      </div>
                    )}

                    {activeDetailTab === 'io' && (
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className={`text-sm font-medium ${t.textSecondary}`}>输入参数</label>
                            <button
                              onClick={() => {
                                const newInput: StepInput = {
                                  name: '',
                                  type: 'text',
                                  required: false,
                                };
                                const updated = { ...step, input: [...(step.input || []), newInput] };
                                handleUpdateStep(updated);
                              }}
                              className={`text-xs px-2 py-1 ${t.button} text-white rounded`}
                            >
                              <Plus size={12} className="inline mr-1" />
                              添加输入
                            </button>
                          </div>
                          <div className="space-y-2">
                            {(step.input || []).map((input, i) => (
                              <div key={i} className={`p-3 rounded-lg ${t.emptyBg}`}>
                                <div className="grid grid-cols-4 gap-2">
                                  <input
                                    type="text"
                                    value={input.name}
                                    onChange={(e) => {
                                      const newInput = [...(step.input || [])];
                                      newInput[i] = { ...input, name: e.target.value };
                                      handleUpdateStep({ ...step, input: newInput });
                                    }}
                                    placeholder="参数名"
                                    className={`px-2 py-1 border rounded ${t.input} text-sm`}
                                  />
                                  <select
                                    value={input.type}
                                    onChange={(e) => {
                                      const newInput = [...(step.input || [])];
                                      newInput[i] = { ...input, type: e.target.value as StepInput['type'] };
                                      handleUpdateStep({ ...step, input: newInput });
                                    }}
                                    className={`px-2 py-1 border rounded ${t.input} text-sm`}
                                  >
                                    <option value="text">文本</option>
                                    <option value="number">数字</option>
                                    <option value="boolean">布尔</option>
                                    <option value="select">选择</option>
                                    <option value="file">文件</option>
                                    <option value="date">日期</option>
                                  </select>
                                  <label className="flex items-center gap-1 text-xs">
                                    <input
                                      type="checkbox"
                                      checked={input.required}
                                      onChange={(e) => {
                                        const newInput = [...(step.input || [])];
                                        newInput[i] = { ...input, required: e.target.checked };
                                        handleUpdateStep({ ...step, input: newInput });
                                      }}
                                      className="rounded"
                                    />
                                    必填
                                  </label>
                                  <button
                                    onClick={() => {
                                      const newInput = (step.input || []).filter((_, idx) => idx !== i);
                                      handleUpdateStep({ ...step, input: newInput });
                                    }}
                                    className="text-red-500 hover:text-red-600"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                                {input.type === 'select' && (
                                  <input
                                    type="text"
                                    value={input.options?.join(', ') || ''}
                                    onChange={(e) => {
                                      const newInput = [...(step.input || [])];
                                      newInput[i] = { ...input, options: e.target.value.split(',').map(s => s.trim()) };
                                      handleUpdateStep({ ...step, input: newInput });
                                    }}
                                    placeholder="选项（逗号分隔）"
                                    className={`w-full mt-2 px-2 py-1 border rounded ${t.input} text-sm`}
                                  />
                                )}
                                <input
                                  type="text"
                                  value={input.description || ''}
                                  onChange={(e) => {
                                    const newInput = [...(step.input || [])];
                                    newInput[i] = { ...input, description: e.target.value };
                                    handleUpdateStep({ ...step, input: newInput });
                                  }}
                                  placeholder="参数描述"
                                  className={`w-full mt-2 px-2 py-1 border rounded ${t.input} text-sm`}
                                />
                              </div>
                            ))}
                            {(!step.input || step.input.length === 0) && (
                              <div className={`text-center py-4 ${t.textMuted} text-sm`}>
                                暂无输入参数
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className={`text-sm font-medium ${t.textSecondary}`}>输出参数</label>
                            <button
                              onClick={() => {
                                const newOutput: StepOutput = {
                                  name: '',
                                  type: 'text',
                                };
                                const updated = { ...step, output: [...(step.output || []), newOutput] };
                                handleUpdateStep(updated);
                              }}
                              className={`text-xs px-2 py-1 ${t.button} text-white rounded`}
                            >
                              <Plus size={12} className="inline mr-1" />
                              添加输出
                            </button>
                          </div>
                          <div className="space-y-2">
                            {(step.output || []).map((output, i) => (
                              <div key={i} className={`p-3 rounded-lg ${t.emptyBg}`}>
                                <div className="grid grid-cols-3 gap-2">
                                  <input
                                    type="text"
                                    value={output.name}
                                    onChange={(e) => {
                                      const newOutput = [...(step.output || [])];
                                      newOutput[i] = { ...output, name: e.target.value };
                                      handleUpdateStep({ ...step, output: newOutput });
                                    }}
                                    placeholder="参数名"
                                    className={`px-2 py-1 border rounded ${t.input} text-sm`}
                                  />
                                  <select
                                    value={output.type}
                                    onChange={(e) => {
                                      const newOutput = [...(step.output || [])];
                                      newOutput[i] = { ...output, type: e.target.value as StepOutput['type'] };
                                      handleUpdateStep({ ...step, output: newOutput });
                                    }}
                                    className={`px-2 py-1 border rounded ${t.input} text-sm`}
                                  >
                                    <option value="text">文本</option>
                                    <option value="number">数字</option>
                                    <option value="boolean">布尔</option>
                                    <option value="file">文件</option>
                                    <option value="json">JSON</option>
                                  </select>
                                  <button
                                    onClick={() => {
                                      const newOutput = (step.output || []).filter((_, idx) => idx !== i);
                                      handleUpdateStep({ ...step, output: newOutput });
                                    }}
                                    className="text-red-500 hover:text-red-600"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            ))}
                            {(!step.output || step.output.length === 0) && (
                              <div className={`text-center py-4 ${t.textMuted} text-sm`}>
                                暂无输出参数
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {activeDetailTab === 'dependency' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-2">
                          <label className={`text-sm font-medium ${t.textSecondary}`}>前置依赖</label>
                          <button
                            onClick={() => {
                              const otherSteps = workflow.steps.filter(s => s.id !== step.id);
                              if (otherSteps.length === 0) {
                                showToast('没有其他可依赖的步骤', 'error');
                                return;
                              }
                              const newDep: StepDependency = {
                                stepId: otherSteps[0].id,
                                condition: 'completed',
                              };
                              const updated = { ...step, dependsOn: [...(step.dependsOn || []), newDep] };
                              handleUpdateStep(updated);
                            }}
                            className={`text-xs px-2 py-1 ${t.button} text-white rounded`}
                          >
                            <Plus size={12} className="inline mr-1" />
                            添加依赖
                          </button>
                        </div>
                        <div className="space-y-2">
                          {(step.dependsOn || []).map((dep, i) => {
                            const depStep = workflow.steps.find(s => s.id === dep.stepId);
                            return (
                              <div key={i} className={`p-3 rounded-lg ${t.emptyBg} flex items-center gap-3`}>
                                <ArrowRight size={16} className={t.textMuted} />
                                <select
                                  value={dep.stepId}
                                  onChange={(e) => {
                                    const newDeps = [...(step.dependsOn || [])];
                                    newDeps[i] = { ...dep, stepId: e.target.value };
                                    handleUpdateStep({ ...step, dependsOn: newDeps });
                                  }}
                                  className={`flex-1 px-2 py-1 border rounded ${t.input} text-sm`}
                                >
                                  <option value="">选择依赖步骤</option>
                                  {workflow.steps.filter(s => s.id !== step.id).map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                  ))}
                                </select>
                                <select
                                  value={dep.condition}
                                  onChange={(e) => {
                                    const newDeps = [...(step.dependsOn || [])];
                                    newDeps[i] = { ...dep, condition: e.target.value as StepDependency['condition'] };
                                    handleUpdateStep({ ...step, dependsOn: newDeps });
                                  }}
                                  className={`px-2 py-1 border rounded ${t.input} text-sm`}
                                >
                                  <option value="completed">完成后</option>
                                  <option value="failed">失败后</option>
                                  <option value="any">任意结果</option>
                                </select>
                                <button
                                  onClick={() => {
                                    const newDeps = (step.dependsOn || []).filter((_, idx) => idx !== i);
                                    handleUpdateStep({ ...step, dependsOn: newDeps });
                                  }}
                                  className="text-red-500 hover:text-red-600"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            );
                          })}
                          {(!step.dependsOn || step.dependsOn.length === 0) && (
                            <div className={`text-center py-4 ${t.textMuted} text-sm`}>
                              无依赖，可直接执行
                            </div>
                          )}
                        </div>
                        <div className={`text-xs ${t.textMuted} bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3`}>
                          <strong>依赖说明：</strong>只有当所有前置依赖步骤满足指定条件后，当前步骤才会执行。
                        </div>
                      </div>
                    )}

                    {activeDetailTab === 'execution' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>
                              <Gauge size={14} className="inline mr-1" />
                              执行优先级 (1-10)
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={step.execution?.priority || 5}
                              onChange={(e) => {
                                const updated = {
                                  ...step,
                                  execution: { ...step.execution, priority: parseInt(e.target.value) || 5 }
                                };
                                handleUpdateStep(updated);
                              }}
                              className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                            />
                          </div>
                          <div>
                            <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>
                              <Clock size={14} className="inline mr-1" />
                              超时时间 (秒，0=不超时)
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={step.execution?.timeout || 0}
                              onChange={(e) => {
                                const updated = {
                                  ...step,
                                  execution: { ...step.execution, timeout: parseInt(e.target.value) || 0 }
                                };
                                handleUpdateStep(updated);
                              }}
                              className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                            />
                          </div>
                        </div>
                        <div>
                          <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>
                            <Users size={14} className="inline mr-1" />
                            分配给
                          </label>
                          <input
                            type="text"
                            value={step.execution?.assignedTo || ''}
                            onChange={(e) => {
                              const updated = {
                                ...step,
                                execution: { ...step.execution, assignedTo: e.target.value }
                              };
                              handleUpdateStep(updated);
                            }}
                            placeholder="输入用户名或角色..."
                            className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                          />
                        </div>
                        <div>
                          <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>
                            资源标签 (逗号分隔)
                          </label>
                          <input
                            type="text"
                            value={step.execution?.resourceTags?.join(', ') || ''}
                            onChange={(e) => {
                              const updated = {
                                ...step,
                                execution: {
                                  ...step.execution,
                                  resourceTags: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                                }
                              };
                              handleUpdateStep(updated);
                            }}
                            placeholder="如: CPU, 内存, 网络..."
                            className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                          />
                        </div>
                        <div>
                          <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>
                            重试次数
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={step.execution?.retryCount || 0}
                            onChange={(e) => {
                              const updated = {
                                ...step,
                                execution: { ...step.execution, retryCount: parseInt(e.target.value) || 0 }
                              };
                              handleUpdateStep(updated);
                            }}
                            className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                          />
                        </div>
                      </div>
                    )}

                    {activeDetailTab === 'exception' && (
                      <div className="space-y-4">
                        <div>
                          <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>异常处理策略</label>
                          <select
                            value={step.exception?.type || 'retry'}
                            onChange={(e) => {
                              const updated = {
                                ...step,
                                exception: { ...step.exception, type: e.target.value as StepException['type'] }
                              };
                              handleUpdateStep(updated);
                            }}
                            className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                          >
                            <option value="retry">重试</option>
                            <option value="skip">跳过</option>
                            <option value="abort">中止工作流</option>
                            <option value="fallback">执行备用步骤</option>
                          </select>
                        </div>
                        {(step.exception?.type === 'retry') && (
                          <div>
                            <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>最大重试次数</label>
                            <input
                              type="number"
                              min="0"
                              value={step.exception?.maxRetries || 0}
                              onChange={(e) => {
                                const updated = {
                                  ...step,
                                  exception: { ...step.exception, maxRetries: parseInt(e.target.value) || 0 }
                                };
                                handleUpdateStep(updated);
                              }}
                              className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                            />
                          </div>
                        )}
                        {(step.exception?.type === 'fallback') && (
                          <div>
                            <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>备用步骤</label>
                            <select
                              value={step.exception?.fallbackStepId || ''}
                              onChange={(e) => {
                                const updated = {
                                  ...step,
                                  exception: { ...step.exception, fallbackStepId: e.target.value }
                                };
                                handleUpdateStep(updated);
                              }}
                              className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                            >
                              <option value="">选择备用步骤</option>
                              {workflow.steps.filter(s => s.id !== step.id).map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        <div>
                          <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>异常通知消息</label>
                          <textarea
                            value={step.exception?.notification || ''}
                            onChange={(e) => {
                              const updated = {
                                ...step,
                                exception: { ...step.exception, notification: e.target.value }
                              };
                              handleUpdateStep(updated);
                            }}
                            placeholder="异常发生时发送的通知内容..."
                            className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                            rows={2}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                      <button
                        onClick={() => handleDeleteStep(step.id)}
                        className={`px-4 py-2 border border-red-500/50 text-red-500 rounded-lg hover:bg-red-500/10`}
                      >
                        删除步骤
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showStepAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className={`${t.card} rounded-lg p-6 w-[480px] border ${t.border}`}>
            <h3 className={`text-lg font-semibold mb-4 ${t.text}`}>添加步骤</h3>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>步骤名称</label>
                <input
                  type="text"
                  value={newStepName}
                  onChange={(e) => setNewStepName(e.target.value)}
                  placeholder="输入步骤名称..."
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>步骤类型</label>
                <select
                  value={newStepType}
                  onChange={(e) => setNewStepType(e.target.value as Step['type'])}
                  className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                >
                  <option value="task">任务 - 执行具体业务操作</option>
                  <option value="delay">延迟 - 等待指定时间</option>
                  <option value="condition">条件 - 根据条件分支</option>
                  <option value="notification">通知 - 发送消息通知</option>
                  <option value="approval">审批 - 等待人工审批</option>
                  <option value="data">数据 - 数据处理转换</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <button
                onClick={() => {
                  setShowStepAddModal(false);
                  setNewStepName('');
                  setNewStepType('task');
                }}
                className={`px-4 py-2 border rounded-lg ${t.border} hover:${t.hoverBg}`}
              >
                取消
              </button>
              <button
                onClick={handleAddStep}
                className={`px-4 py-2 ${t.button} text-white rounded-lg`}
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, type: null, id: null })}
        onConfirm={handleConfirmDelete}
        title={deleteConfirm.type === 'workflow' ? '删除工作流' : '删除步骤'}
        message={deleteConfirm.type === 'workflow' ? '确定要删除此工作流吗？此操作不可撤销。' : '确定要删除此步骤吗？'}
        confirmText="删除"
        cancelText="取消"
        variant="danger"
      />
    </div>
  );
}
