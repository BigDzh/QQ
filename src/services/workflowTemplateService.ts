import { Step, Workflow } from '../pages/WorkflowDetail';

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  steps: Omit<Step, 'id' | 'createdAt' | 'updatedAt'>[];
}

export const projectLifecycleTemplate: WorkflowTemplate = {
  id: 'project_lifecycle',
  name: '项目全生命周期管理',
  description: '从需求评审到设计、生产、验证、试验、验收的完整项目流程',
  category: '项目管理',
  steps: [
    {
      name: '需求收集与分析',
      description: '收集项目利益相关方的需求，进行初步分析和整理',
      type: 'task',
      status: 'pending',
      config: {
        requirementSources: ['客户访谈', '问卷调查', '市场调研'],
        output: '需求文档v1.0'
      },
      input: [
        { name: '项目背景', type: 'text', required: true, description: '项目背景介绍' },
        { name: '利益相关方', type: 'select', required: true, options: ['客户', '管理层', '研发', '市场'], description: '主要利益相关方列表' }
      ],
      output: [
        { name: '需求文档', type: 'file', description: '初步需求文档' },
        { name: '需求评审状态', type: 'select', options: ['待评审', '评审中', '已通过', '需修改'] }
      ],
      dependsOn: [],
      execution: { priority: 3, timeout: 0, retryCount: 0, resourceTags: ['需求分析'] },
      exception: { type: 'retry', maxRetries: 2 }
    },
    {
      name: '需求评审会议',
      description: '组织需求评审会议，确认需求的完整性、合理性和可执行性',
      type: 'approval',
      status: 'pending',
      config: {
       评审方式: '线下会议',
       评审材料: ['需求文档', '初步设计方案'],
       参与人员: ['产品经理', '技术负责人', '客户代表']
      },
      input: [
        { name: '需求文档', type: 'file', required: true, description: '待评审需求文档' },
        { name: '评审时间', type: 'date', required: true, description: '计划评审时间' }
      ],
      output: [
        { name: '评审意见', type: 'text', description: '评审会议意见' },
        { name: '评审结论', type: 'select', options: ['通过', '不通过', '有条件通过'], required: true }
      ],
      dependsOn: [{ stepId: 'step_placeholder_1', condition: 'completed' }],
      execution: { priority: 2, timeout: 7200, retryCount: 0, assignedTo: '产品经理', resourceTags: ['评审'] },
      exception: { type: 'fallback', fallbackStepId: '', notification: '需求评审未通过，请检查需求文档' }
    },
    {
      name: '系统设计',
      description: '完成系统架构设计、详细设计和接口定义',
      type: 'task',
      status: 'pending',
      config: {
       设计阶段: ['架构设计', '详细设计', '接口定义'],
       输出文档: ['架构图', '时序图', '接口文档']
      },
      input: [
        { name: '需求文档', type: 'file', required: true, description: '已确认的需求文档' },
        { name: '技术选型', type: 'select', required: true, options: ['Java', 'Python', 'Go', 'Node.js'], description: '技术栈选择' }
      ],
      output: [
        { name: '架构设计文档', type: 'file', description: '系统架构设计文档' },
        { name: '接口文档', type: 'json', description: 'API接口定义' },
        { name: '设计评审状态', type: 'select', options: ['待评审', '评审中', '已通过'] }
      ],
      dependsOn: [{ stepId: 'step_placeholder_2', condition: 'completed' }],
      execution: { priority: 3, timeout: 0, retryCount: 0, assignedTo: '技术负责人', resourceTags: ['设计', '架构'] },
      exception: { type: 'retry', maxRetries: 3 }
    },
    {
      name: '设计评审',
      description: '技术评审委员会对系统设计进行全面评审',
      type: 'approval',
      status: 'pending',
      config: {
       评审级别: '技术评审委员会',
       评审标准: ['架构合理性', '可扩展性', '安全性', '性能预期']
      },
      input: [
        { name: '设计文档', type: 'file', required: true },
        { name: '风险评估报告', type: 'file', required: true }
      ],
      output: [
        { name: '评审结论', type: 'select', options: ['通过', '有条件通过', '不通过'], required: true },
        { name: '修改建议', type: 'text' }
      ],
      dependsOn: [{ stepId: 'step_placeholder_3', condition: 'completed' }],
      execution: { priority: 1, timeout: 14400, retryCount: 0, resourceTags: ['评审'] },
      exception: { type: 'fallback', notification: '设计评审未通过，需要修改后重新评审' }
    },
    {
      name: '生产制造',
      description: '根据确认的设计方案进行产品生产和制造',
      type: 'task',
      status: 'pending',
      config: {
       生产阶段: ['原材料采购', '生产加工', '组装测试', '成品检验'],
       质量标准: 'ISO9001'
      },
      input: [
        { name: '生产图纸', type: 'file', required: true },
        { name: 'BOM清单', type: 'file', required: true, description: '物料清单' },
        { name: '工艺要求', type: 'text', required: true }
      ],
      output: [
        { name: '生产进度报告', type: 'text' },
        { name: '质检报告', type: 'file' },
        { name: '不良率', type: 'number', description: '产品不良率百分比' }
      ],
      dependsOn: [{ stepId: 'step_placeholder_4', condition: 'completed' }],
      execution: { priority: 4, timeout: 0, retryCount: 1, assignedTo: '生产负责人', resourceTags: ['生产', '制造'] },
      exception: { type: 'retry', maxRetries: 2 }
    },
    {
      name: '功能验证',
      description: '对生产完成的产品进行功能验证测试',
      type: 'task',
      status: 'pending',
      config: {
       验证标准: ['功能完整性', '性能指标', '安全要求'],
       测试用例数: 100
      },
      input: [
        { name: '产品样品', type: 'file', required: true },
        { name: '验证计划', type: 'file', required: true },
        { name: '测试设备', type: 'select', required: true, options: ['自动化测试台', '手动测试设备', '仿真环境'] }
      ],
      output: [
        { name: '验证报告', type: 'file' },
        { name: '测试通过率', type: 'number', description: '测试用例通过率' },
        { name: '缺陷列表', type: 'json' }
      ],
      dependsOn: [{ stepId: 'step_placeholder_5', condition: 'completed' }],
      execution: { priority: 3, timeout: 28800, retryCount: 0, assignedTo: '测试工程师', resourceTags: ['测试', '验证'] },
      exception: { type: 'retry', maxRetries: 2 }
    },
    {
      name: '试验测试',
      description: '进行更全面的试验测试，包括可靠性、环境适应性等',
      type: 'task',
      status: 'pending',
      config: {
       试验类型: ['可靠性试验', '环境试验', '寿命试验', '安全试验'],
       试验标准: ['GB/T', 'IEC', 'ISO']
      },
      input: [
        { name: '试验大纲', type: 'file', required: true },
        { name: '样品数量', type: 'number', required: true, description: '试验样品数量' },
        { name: '试验设备清单', type: 'file', required: true }
      ],
      output: [
        { name: '试验报告', type: 'file' },
        { name: '试验结论', type: 'select', options: ['通过', '部分通过', '未通过'] },
        { name: '问题清单', type: 'json' }
      ],
      dependsOn: [{ stepId: 'step_placeholder_6', condition: 'completed' }],
      execution: { priority: 2, timeout: 604800, retryCount: 0, resourceTags: ['试验'] },
      exception: { type: 'fallback', notification: '试验发现问题，请查看问题清单' }
    },
    {
      name: '验收评审',
      description: '最终验收评审，确认产品满足所有要求',
      type: 'approval',
      status: 'pending',
      config: {
       验收依据: ['合同要求', '技术协议', '验收标准'],
       验收方式: '多部门联合验收'
      },
      input: [
        { name: '设计文档', type: 'file', required: true },
        { name: '验证报告', type: 'file', required: true },
        { name: '试验报告', type: 'file', required: true },
        { name: '生产记录', type: 'file', required: true }
      ],
      output: [
        { name: '验收证书', type: 'file' },
        { name: '验收结论', type: 'select', options: ['通过', '有条件通过', '不通过'], required: true },
        { name: '遗留问题清单', type: 'json' }
      ],
      dependsOn: [{ stepId: 'step_placeholder_7', condition: 'completed' }],
      execution: { priority: 1, timeout: 86400, retryCount: 0, resourceTags: ['验收'] },
      exception: { type: 'abort', notification: '验收未通过，工作流终止' }
    },
    {
      name: '项目结项通知',
      description: '向所有相关方发送项目完成通知',
      type: 'notification',
      status: 'pending',
      config: {
       通知方式: ['邮件', '企业微信', '短信'],
       通知对象: ['项目团队', '客户', '管理层']
      },
      input: [
        { name: '验收结论', type: 'select', options: ['通过', '有条件通过'], required: true },
        { name: '项目总结', type: 'text', required: true }
      ],
      output: [
        { name: '发送状态', type: 'select', options: ['已发送', '发送中', '发送失败'] }
      ],
      dependsOn: [{ stepId: 'step_placeholder_8', condition: 'completed' }],
      execution: { priority: 5, timeout: 3600, retryCount: 3, resourceTags: ['通知'] },
      exception: { type: 'retry', maxRetries: 5 }
    }
  ]
};

export const templates: WorkflowTemplate[] = [
  projectLifecycleTemplate,
  {
    id: 'software_development',
    name: '软件开发流程',
    description: '敏捷开发模式下的软件需求到交付流程',
    category: '软件开发',
    steps: [
      {
        name: '需求池管理',
        type: 'task',
        status: 'pending',
        config: {},
        input: [],
        output: [],
        dependsOn: [],
        execution: { priority: 3, retryCount: 0 },
        exception: { type: 'skip' }
      },
      {
        name: 'Sprint规划',
        type: 'task',
        status: 'pending',
        config: {},
        input: [],
        output: [],
        dependsOn: [],
        execution: { priority: 2, retryCount: 0 },
        exception: { type: 'retry' }
      },
      {
        name: '开发任务执行',
        type: 'task',
        status: 'pending',
        config: {},
        input: [],
        output: [],
        dependsOn: [],
        execution: { priority: 3, retryCount: 0 },
        exception: { type: 'retry' }
      },
      {
        name: '代码评审',
        type: 'approval',
        status: 'pending',
        config: {},
        input: [],
        output: [],
        dependsOn: [],
        execution: { priority: 2, retryCount: 0 },
        exception: { type: 'fallback' }
      },
      {
        name: 'Sprint评审',
        type: 'approval',
        status: 'pending',
        config: {},
        input: [],
        output: [],
        dependsOn: [],
        execution: { priority: 1, retryCount: 0 },
        exception: { type: 'retry' }
      }
    ]
  }
];

export function createWorkflowFromTemplate(template: WorkflowTemplate, customName?: string): Workflow {
  const now = Date.now();
  const stepIdMap = new Map<string, string>();

  const steps = template.steps.map((step, index) => {
    const newId = `step_${now}_${index}_${Math.random().toString(36).substr(2, 9)}`;
    stepIdMap.set(`step_placeholder_${index + 1}`, newId);
    return {
      ...step,
      id: newId,
      createdAt: now,
      updatedAt: now,
      dependsOn: step.dependsOn?.map(dep => ({
        ...dep,
        stepId: stepIdMap.get(dep.stepId) || dep.stepId
      })) || []
    };
  });

  return {
    id: `wf_${now}`,
    name: customName || template.name,
    description: template.description,
    steps,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    version: 1
  };
}

export function getTemplateById(id: string): WorkflowTemplate | undefined {
  return templates.find(t => t.id === id);
}

export function getTemplatesByCategory(category: string): WorkflowTemplate[] {
  return templates.filter(t => t.category === category);
}

export function getAllCategories(): string[] {
  return [...new Set(templates.map(t => t.category))];
}
