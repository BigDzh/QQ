import { useState } from 'react';
import { Play, CheckCircle, Package, FileText, ArrowRightLeft } from 'lucide-react';
import { useToast } from '../components/Toast';

const testProjects = [
  {
    id: 'proj-001',
    name: '航天器控制系统',
    projectNumber: 'AAC-2024-001',
    stage: 'D阶段' as const,
    version: 'v2.0',
    categories: ['控制类', '通信类', '电源类', '传感类'],
    modules: [
      {
        id: 'mod-001',
        projectId: 'proj-001',
        productionOrderNumber: 'PO-2024-001',
        moduleNumber: 'M-CPU-001',
        moduleName: '中央处理器模块',
        category: '控制类',
        holder: '张三',
        status: '正常' as const,
        stage: 'D阶段',
        version: 'v1.2',
        productionNumber: 'PN-100',
        components: [
          {
            id: 'comp-001',
            moduleId: 'mod-001',
            componentNumber: 'CPU-001',
            componentName: '高性能CPU芯片',
            productionOrderNumber: 'PO-2024-001',
            holder: '张三',
            status: '正常' as const,
            stage: 'D阶段',
            version: 'v1.0',
            logs: [],
            statusChanges: [],
            certificates: { pcb: '已签署', assembly: '已签署', coating: '未签署', final: '未签署' } as any,
            burnedSoftware: [
              { id: 'sw-001', softwareId: 'sw-001', softwareName: '飞控软件', softwareVersion: 'v3.2.1', burnedAt: '2024-03-15', burnedBy: '张三' }
            ]
          },
          {
            id: 'comp-002',
            moduleId: 'mod-001',
            componentNumber: 'MEM-001',
            componentName: '存储器模块',
            productionOrderNumber: 'PO-2024-001',
            holder: '李四',
            status: '正常' as const,
            stage: 'D阶段',
            version: 'v1.0',
            logs: [],
            statusChanges: [],
            certificates: { pcb: '已签署', assembly: '已签署', coating: '已签署', final: '已签署' } as any,
            burnedSoftware: []
          },
          {
            id: 'comp-003',
            moduleId: 'mod-001',
            componentNumber: 'PWR-001',
            componentName: '电源管理芯片',
            productionOrderNumber: 'PO-2024-001',
            holder: '王五',
            status: '故障' as const,
            stage: 'D阶段',
            version: 'v1.0',
            logs: [],
            statusChanges: [],
            certificates: { pcb: '已签署', assembly: '未签署', coating: '未签署', final: '未签署' } as any,
            burnedSoftware: []
          }
        ],
        logs: [],
        statusChanges: []
      },
      {
        id: 'mod-002',
        projectId: 'proj-001',
        productionOrderNumber: 'PO-2024-002',
        moduleNumber: 'M-COM-001',
        moduleName: '通信模块',
        category: '通信类',
        holder: '李四',
        status: '投产中' as const,
        stage: 'D阶段',
        version: 'v1.1',
        productionNumber: 'PN-050',
        components: [
          {
            id: 'comp-004',
            moduleId: 'mod-002',
            componentNumber: 'RF-001',
            componentName: '射频收发器',
            productionOrderNumber: 'PO-2024-002',
            holder: '李四',
            status: '测试中' as const,
            stage: 'D阶段',
            version: 'v1.0',
            logs: [],
            statusChanges: [],
            certificates: {},
            burnedSoftware: []
          },
          {
            id: 'comp-005',
            moduleId: 'mod-002',
            componentNumber: 'MODEM-001',
            componentName: '调制解调器',
            productionOrderNumber: 'PO-2024-002',
            holder: '李四',
            status: '正常' as const,
            stage: 'D阶段',
            version: 'v1.0',
            logs: [],
            statusChanges: [],
            certificates: {},
            burnedSoftware: []
          }
        ],
        logs: [],
        statusChanges: []
      },
      {
        id: 'mod-003',
        projectId: 'proj-001',
        productionOrderNumber: 'PO-2024-003',
        moduleNumber: 'M-PWR-001',
        moduleName: '电源模块',
        category: '电源类',
        holder: '王五',
        status: '正常' as const,
        stage: 'P阶段',
        version: 'v2.0',
        productionNumber: 'PN-030',
        components: [
          {
            id: 'comp-006',
            moduleId: 'mod-003',
            componentNumber: 'BATT-001',
            componentName: '锂电池组',
            productionOrderNumber: 'PO-2024-003',
            holder: '王五',
            status: '正常' as const,
            stage: 'P阶段',
            version: 'v2.0',
            logs: [],
            statusChanges: [],
            certificates: {},
            burnedSoftware: []
          }
        ],
        logs: [],
        statusChanges: []
      },
      {
        id: 'mod-004',
        projectId: 'proj-001',
        productionOrderNumber: 'PO-2024-004',
        moduleNumber: 'M-SEN-001',
        moduleName: '传感器模块',
        category: '传感类',
        holder: '赵六',
        status: '维修中' as const,
        stage: 'D阶段',
        version: 'v1.0',
        productionNumber: 'PN-020',
        components: [
          {
            id: 'comp-007',
            moduleId: 'mod-004',
            componentNumber: 'GPS-001',
            componentName: 'GPS定位模块',
            productionOrderNumber: 'PO-2024-004',
            holder: '赵六',
            status: '维修中' as const,
            stage: 'D阶段',
            version: 'v1.0',
            logs: [],
            statusChanges: [],
            certificates: {},
            burnedSoftware: []
          },
          {
            id: 'comp-008',
            moduleId: 'mod-004',
            componentNumber: 'IMU-001',
            componentName: '惯性测量单元',
            productionOrderNumber: 'PO-2024-004',
            holder: '赵六',
            status: '仿真中' as const,
            stage: 'D阶段',
            version: 'v1.0',
            logs: [],
            statusChanges: [],
            certificates: {},
            burnedSoftware: []
          }
        ],
        logs: [],
        statusChanges: []
      }
    ],
    documents: [
      { id: 'doc-001', documentNumber: 'DOC-2024-001', name: '系统设计说明书', type: '设计文档', stage: 'F阶段' as const, status: '已完成' as const },
      { id: 'doc-002', documentNumber: 'DOC-2024-002', name: '接口定义文档', type: '设计文档', stage: 'F阶段' as const, status: '已完成' as const },
      { id: 'doc-003', documentNumber: 'DOC-2024-003', name: '需求规格说明书', type: '需求文档', stage: 'F阶段' as const, status: '已完成' as const },
      { id: 'doc-004', documentNumber: 'DOC-2024-004', name: '系统架构设计', type: '设计文档', stage: 'C阶段' as const, status: '已完成' as const },
      { id: 'doc-005', documentNumber: 'DOC-2024-005', name: '详细设计报告', type: '设计文档', stage: 'C阶段' as const, status: '已完成' as const },
      { id: 'doc-006', documentNumber: 'DOC-2024-006', name: '测试大纲', type: '测试文档', stage: 'C阶段' as const, status: '未完成' as const },
      { id: 'doc-007', documentNumber: 'DOC-2024-007', name: '模块测试报告', type: '测试文档', stage: 'S阶段' as const, status: '未完成' as const },
      { id: 'doc-008', documentNumber: 'DOC-2024-008', name: '系统测试报告', type: '测试文档', stage: 'S阶段' as const, status: '未完成' as const },
      { id: 'doc-009', documentNumber: 'DOC-2024-009', name: '集成测试报告', type: '测试文档', stage: 'D阶段' as const, status: '已完成' as const },
      { id: 'doc-010', documentNumber: 'DOC-2024-010', name: '验收测试大纲', type: '验收文档', stage: 'D阶段' as const, status: '已完成' as const },
      { id: 'doc-011', documentNumber: 'DOC-2024-011', name: '验收标准', type: '验收文档', stage: 'P阶段' as const, status: '未完成' as const },
      { id: 'doc-012', documentNumber: 'DOC-2024-012', name: '用户手册', type: '验收文档', stage: 'P阶段' as const, status: '未完成' as const }
    ],
    software: [
      { id: 'sw-001', name: '飞控软件', version: 'v3.2.1', stage: 'D阶段' as const, status: '已完成' as const, md5: 'A1B2C3D4E5F6', adaptedComponentIds: ['comp-001', 'comp-002'], adaptedComponents: [{ id: 'comp-001', name: '高性能CPU芯片' }, { id: 'comp-002', name: '惯性测量单元' }] },
      { id: 'sw-002', name: '通信协议栈', version: 'v2.1.0', stage: 'D阶段' as const, status: '已完成' as const, md5: 'F6E5D4C3B2A1', adaptedComponentIds: ['comp-003'], adaptedComponents: [{ id: 'comp-003', name: '高速通信模块' }] },
      { id: 'sw-003', name: '电源管理软件', version: 'v1.5.0', stage: 'P阶段' as const, status: '已完成' as const, md5: '1234567890AB', adaptedComponentIds: ['comp-004'], adaptedComponents: [{ id: 'comp-004', name: '电源管理模块' }] },
      { id: 'sw-004', name: '传感器融合算法', version: 'v1.0.0', stage: 'D阶段' as const, status: '未完成' as const, md5: '', adaptedComponentIds: [], adaptedComponents: [] }
    ],
    designFiles: [],
    logs: [],
    createdAt: '2024-01-15T08:00:00Z'
  },
  {
    id: 'proj-002',
    name: '卫星数据处理系统',
    projectNumber: 'SDS-2024-001',
    stage: 'C阶段' as const,
    version: 'v1.0',
    categories: ['处理类', '存储类'],
    modules: [
      {
        id: 'mod-005',
        projectId: 'proj-002',
        productionOrderNumber: '',
        moduleNumber: 'M-DSP-001',
        moduleName: '数字信号处理器',
        category: '处理类',
        holder: '孙七',
        status: '未投产' as const,
        stage: 'C阶段',
        version: 'v1.0',
        productionNumber: '',
        components: [],
        logs: [],
        statusChanges: []
      }
    ],
    documents: [],
    software: [],
    designFiles: [],
    logs: [],
    createdAt: '2024-02-20T10:00:00Z'
  }
];

const testTasks = [
  {
    id: 'task-001',
    title: '完成飞控软件v3.2.1版本测试',
    description: '完成所有测试用例的执行和问题修复',
    priority: '紧急' as const,
    status: '进行中' as const,
    dueDate: '2024-04-01',
    createdAt: '2024-03-01T08:00:00Z'
  },
  {
    id: 'task-002',
    title: '提交电源模块验收材料',
    description: '准备P阶段验收所需的所有文档和测试报告',
    priority: '高' as const,
    status: '进行中' as const,
    dueDate: '2024-04-15',
    createdAt: '2024-03-05T10:00:00Z'
  },
  {
    id: 'task-003',
    title: '采购传感器备件',
    description: 'IMU传感器库存不足，需要补充',
    priority: '中' as const,
    status: '已完成' as const,
    dueDate: '2024-03-20',
    createdAt: '2024-03-01T08:00:00Z',
    completedAt: '2024-03-18T15:00:00Z'
  },
  {
    id: 'task-004',
    title: '更新项目文档',
    description: '整理项目所有技术文档',
    priority: '低' as const,
    status: '已过期' as const,
    dueDate: '2024-03-10',
    createdAt: '2024-02-28T08:00:00Z'
  }
];

const testBorrowRecords = [
  {
    id: 'borrow-001',
    itemType: 'component' as const,
    itemId: 'comp-001',
    itemName: '高性能CPU芯片 (CPU-001)',
    borrower: '张三',
    borrowDate: '2024-03-15T09:00:00Z',
    expectedReturnDate: '2024-03-20',
    actualReturnDate: '',
    status: '借用中' as const,
    notes: '用于测试验证'
  },
  {
    id: 'borrow-002',
    itemType: 'module' as const,
    itemId: 'mod-002',
    itemName: '通信模块 (M-COM-001)',
    borrower: '李四',
    borrowDate: '2024-03-10T14:00:00Z',
    expectedReturnDate: '2024-03-17',
    actualReturnDate: '2024-03-16T10:00:00Z',
    status: '已归还' as const,
    notes: '已归还'
  }
];

export default function TestDataInitializer() {
  const { showToast } = useToast();
  const [initialized, setInitialized] = useState(false);

  const handleInitData = () => {
    localStorage.removeItem('projects');
    localStorage.removeItem('tasks');
    localStorage.removeItem('borrow_records');
    localStorage.setItem('projects', JSON.stringify(testProjects));
    localStorage.setItem('tasks', JSON.stringify(testTasks));
    localStorage.setItem('borrow_records', JSON.stringify(testBorrowRecords));
    setInitialized(true);
    showToast('测试数据初始化成功！', 'success');
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  const getStats = () => {
    const projects = testProjects;
    const modules = projects.reduce((sum, p) => sum + p.modules.length, 0);
    const components = projects.reduce((sum, p) => sum + p.modules.reduce((s, m) => s + m.components.length, 0), 0);
    return { projects: projects.length, modules, components, tasks: testTasks.length, borrowRecords: testBorrowRecords.length };
  };

  const stats = getStats();

  if (initialized) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-green-600">测试数据已初始化</h2>
          <p className="text-gray-500 mt-2">请刷新页面查看测试数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">测试数据初始化</h1>
        <p className="text-gray-500">点击下方按钮初始化完整的测试数据</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">将创建以下测试数据：</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.projects}</div>
              <div className="text-sm text-gray-500">项目</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.modules}</div>
              <div className="text-sm text-gray-500">模块</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="p-2 bg-green-100 rounded-lg">
              <Package className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.components}</div>
              <div className="text-sm text-gray-500">组件</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="p-2 bg-orange-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.tasks}</div>
              <div className="text-sm text-gray-500">任务</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="p-2 bg-cyan-100 rounded-lg">
              <ArrowRightLeft className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.borrowRecords}</div>
              <div className="text-sm text-gray-500">借用记录</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-yellow-800 mb-2">⚠️ 注意</h3>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• 初始化将覆盖现有的项目、任务和借用记录数据</li>
          <li>• 初始化后需要刷新页面才能看到新数据</li>
          <li>• 这是测试数据，仅供功能演示使用</li>
        </ul>
      </div>

      <button
        onClick={handleInitData}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
      >
        <Play className="w-5 h-5" />
        初始化测试数据
      </button>
    </div>
  );
}
