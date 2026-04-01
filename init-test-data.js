// 测试数据初始化脚本
// 请在浏览器控制台中执行此脚本

(function initTestData() {
  const testProjects = [
    {
      id: 'proj-001',
      name: '航天器控制系统',
      projectNumber: 'AAC-2024-001',
      stage: 'D阶段',
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
          status: '正常',
          stage: 'D阶段',
          version: 'v1.2',
          components: [
            {
              id: 'comp-001',
              moduleId: 'mod-001',
              componentNumber: 'CPU-001',
              componentName: '高性能CPU芯片',
              productionOrderNumber: 'PO-2024-001',
              holder: '张三',
              status: '正常',
              stage: 'D阶段',
              version: 'v1.0',
              logs: [],
              statusChanges: [],
              certificates: { pcb: '已签署', assembly: '已签署', coating: '未签署' },
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
              status: '正常',
              stage: 'D阶段',
              version: 'v1.0',
              logs: [],
              statusChanges: [],
              certificates: { pcb: '已签署', assembly: '已签署', coating: '已签署' },
              burnedSoftware: []
            },
            {
              id: 'comp-003',
              moduleId: 'mod-001',
              componentNumber: 'PWR-001',
              componentName: '电源管理芯片',
              productionOrderNumber: 'PO-2024-001',
              holder: '王五',
              status: '故障',
              stage: 'D阶段',
              version: 'v1.0',
              logs: [],
              statusChanges: [],
              certificates: { pcb: '已签署', assembly: '未签署', coating: '未签署' },
              burnedSoftware: []
            }
          ],
          logs: [],
          statusChanges: [],
          assemblyCertificate: { status: '已签署', signedAt: '2024-03-10', signedBy: '张三' }
        },
        {
          id: 'mod-002',
          projectId: 'proj-001',
          productionOrderNumber: 'PO-2024-002',
          moduleNumber: 'M-COM-001',
          moduleName: '通信模块',
          category: '通信类',
          holder: '李四',
          status: '投产中',
          stage: 'D阶段',
          version: 'v1.1',
          components: [
            {
              id: 'comp-004',
              moduleId: 'mod-002',
              componentNumber: 'RF-001',
              componentName: '射频收发器',
              productionOrderNumber: 'PO-2024-002',
              holder: '李四',
              status: '测试中',
              stage: 'D阶段',
              version: 'v1.0',
              logs: [],
              statusChanges: [],
              certificates: { pcb: '未签署', assembly: '未签署', coating: '未签署' },
              burnedSoftware: []
            },
            {
              id: 'comp-005',
              moduleId: 'mod-002',
              componentNumber: 'MODEM-001',
              componentName: '调制解调器',
              productionOrderNumber: 'PO-2024-002',
              holder: '李四',
              status: '正常',
              stage: 'D阶段',
              version: 'v1.0',
              logs: [],
              statusChanges: [],
              certificates: { pcb: '已签署', assembly: '已签署', coating: '未签署' },
              burnedSoftware: []
            }
          ],
          logs: [],
          statusChanges: [],
          assemblyCertificate: { status: '未签署' }
        },
        {
          id: 'mod-003',
          projectId: 'proj-001',
          productionOrderNumber: 'PO-2024-003',
          moduleNumber: 'M-PWR-001',
          moduleName: '电源模块',
          category: '电源类',
          holder: '王五',
          status: '正常',
          stage: 'P阶段',
          version: 'v2.0',
          components: [
            {
              id: 'comp-006',
              moduleId: 'mod-003',
              componentNumber: 'BATT-001',
              componentName: '锂电池组',
              productionOrderNumber: 'PO-2024-003',
              holder: '王五',
              status: '正常',
              stage: 'P阶段',
              version: 'v2.0',
              logs: [],
              statusChanges: [],
              certificates: { pcb: '已签署', assembly: '已签署', coating: '已签署' },
              burnedSoftware: []
            }
          ],
          logs: [],
          statusChanges: [],
          assemblyCertificate: { status: '已签署', signedAt: '2024-03-12', signedBy: '王五' }
        },
        {
          id: 'mod-004',
          projectId: 'proj-001',
          productionOrderNumber: 'PO-2024-004',
          moduleNumber: 'M-SEN-001',
          moduleName: '传感器模块',
          category: '传感类',
          holder: '赵六',
          status: '维修中',
          stage: 'D阶段',
          version: 'v1.0',
          components: [
            {
              id: 'comp-007',
              moduleId: 'mod-004',
              componentNumber: 'GPS-001',
              componentName: 'GPS定位模块',
              productionOrderNumber: 'PO-2024-004',
              holder: '赵六',
              status: '维修中',
              stage: 'D阶段',
              version: 'v1.0',
              logs: [],
              statusChanges: [],
              certificates: { pcb: '已签署', assembly: '已签署', coating: '未签署' },
              burnedSoftware: []
            },
            {
              id: 'comp-008',
              moduleId: 'mod-004',
              componentNumber: 'IMU-001',
              componentName: '惯性测量单元',
              productionOrderNumber: 'PO-2024-004',
              holder: '赵六',
              status: '仿真中',
              stage: 'D阶段',
              version: 'v1.0',
              logs: [],
              statusChanges: [],
              certificates: { pcb: '已签署', assembly: '未签署', coating: '未签署' },
              burnedSoftware: []
            }
          ],
          logs: [],
          statusChanges: [],
          assemblyCertificate: { status: '未签署' }
        }
      ],
      systems: [
        {
          id: 'sys-001',
          systemNumber: 'SYS-001',
          systemName: '姿态控制系统',
          productionOrderNumber: 'INS-2024-001',
          holder: '张三',
          status: '正常',
          stage: 'D阶段',
          version: 'v1.0'
        },
        {
          id: 'sys-002',
          systemNumber: 'SYS-002',
          systemName: '通信系统',
          productionOrderNumber: 'INS-2024-002',
          holder: '李四',
          status: '投产中',
          stage: 'D阶段',
          version: 'v1.0'
        }
      ],
      documents: [
        { id: 'doc-001', name: '系统设计说明书', type: '设计文档', stage: 'D阶段', status: '已完成' },
        { id: 'doc-002', name: '接口定义文档', type: '设计文档', stage: 'D阶段', status: '已完成' },
        { id: 'doc-003', name: '测试大纲', type: '测试文档', stage: 'D阶段', status: '未完成' },
        { id: 'doc-004', name: '验收标准', type: '验收文档', stage: 'P阶段', status: '未完成' }
      ],
      software: [
        { id: 'sw-001', name: '飞控软件', version: 'v3.2.1', stage: 'D阶段', status: '已完成', md5: 'A1B2C3D4E5F6' },
        { id: 'sw-002', name: '通信协议栈', version: 'v2.1.0', stage: 'D阶段', status: '已完成', md5: 'F6E5D4C3B2A1' },
        { id: 'sw-003', name: '电源管理软件', version: 'v1.5.0', stage: 'P阶段', status: '已完成', md5: '1234567890AB' },
        { id: 'sw-004', name: '传感器融合算法', version: 'v1.0.0', stage: 'D阶段', status: '未完成', md5: '' }
      ],
      designFiles: [],
      logs: [],
      createdAt: '2024-01-15T08:00:00Z'
    },
    {
      id: 'proj-002',
      name: '卫星数据处理系统',
      projectNumber: 'SDS-2024-001',
      stage: 'C阶段',
      version: 'v1.0',
      categories: ['处理类', '存储类'],
      modules: [
        {
          id: 'mod-005',
          projectId: 'proj-002',
          productionOrderNumber: 'PO-2024-010',
          moduleNumber: 'M-DSP-001',
          moduleName: '数字信号处理器',
          category: '处理类',
          holder: '孙七',
          status: '未投产',
          stage: 'C阶段',
          version: 'v1.0',
          components: [],
          logs: [],
          statusChanges: [],
          assemblyCertificate: { status: '未签署' }
        }
      ],
      systems: [],
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
      priority: '紧急',
      status: '进行中',
      dueDate: '2024-04-01',
      createdAt: '2024-03-01T08:00:00Z'
    },
    {
      id: 'task-002',
      title: '提交电源模块验收材料',
      description: '准备P阶段验收所需的所有文档和测试报告',
      priority: '高',
      status: '进行中',
      dueDate: '2024-04-15',
      createdAt: '2024-03-05T10:00:00Z'
    },
    {
      id: 'task-003',
      title: '采购传感器备件',
      description: 'IMU传感器库存不足，需要补充',
      priority: '中',
      status: '已完成',
      dueDate: '2024-03-20',
      createdAt: '2024-03-01T08:00:00Z',
      completedAt: '2024-03-18T15:00:00Z'
    },
    {
      id: 'task-004',
      title: '更新项目文档',
      description: '整理项目所有技术文档',
      priority: '低',
      status: '已过期',
      dueDate: '2024-03-10',
      createdAt: '2024-02-28T08:00:00Z'
    }
  ];

  const testBorrowRecords = [
    {
      id: 'borrow-001',
      itemType: 'component',
      itemId: 'comp-001',
      itemName: '高性能CPU芯片 (CPU-001)',
      borrower: '张三',
      borrowDate: '2024-03-15T09:00:00Z',
      expectedReturnDate: '2024-03-20',
      actualReturnDate: '',
      status: '借用中',
      notes: '用于测试验证'
    },
    {
      id: 'borrow-002',
      itemType: 'module',
      itemId: 'mod-002',
      itemName: '通信模块 (M-COM-001)',
      borrower: '李四',
      borrowDate: '2024-03-10T14:00:00Z',
      expectedReturnDate: '2024-03-17',
      actualReturnDate: '2024-03-16T10:00:00Z',
      status: '已归还',
      notes: '已归还'
    }
  ];

  // 保存到localStorage
  localStorage.setItem('projects', JSON.stringify(testProjects));
  localStorage.setItem('tasks', JSON.stringify(testTasks));
  localStorage.setItem('borrow_records', JSON.stringify(testBorrowRecords));

  console.log('✅ 测试数据初始化完成！');
  console.log('📊 项目数量:', testProjects.length);
  console.log('📦 模块数量:', testProjects.reduce((sum, p) => sum + p.modules.length, 0));
  console.log('🔧 组件数量:', testProjects.reduce((sum, p) => sum + p.modules.reduce((s, m) => s + m.components.length, 0), 0));
  console.log('📝 任务数量:', testTasks.length);
  console.log('📋 借用记录:', testBorrowRecords.length);
  console.log('🖥️ 系统数量:', testProjects.reduce((sum, p) => sum + (p.systems?.length || 0), 0));

  return '测试数据初始化成功！';
})();