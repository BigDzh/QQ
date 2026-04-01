export type ComponentStatus = '正常' | '故障' | '维修中' | '三防中' | '测试中' | '仿真中' | '未投产' | '借用中' | '投产中';

export type SystemStatus = '未投产' | '投产中' | '正常' | '维修中' | '三防中' | '测试中' | '仿真中' | '借用中' | '故障';

export function calculateModuleStatus(components: { status: string }[]): ComponentStatus {
  if (components.length === 0) return '未投产';

  const statusPriority: Record<string, number> = {
    '故障': 1,
    '维修中': 2,
    '三防中': 3,
    '测试中': 4,
    '投产中': 5,
    '仿真中': 6,
    '借用中': 7,
    '正常': 8,
    '未投产': 9,
  };

  const sorted = [...components].sort((a, b) => {
    const priorityA = statusPriority[a.status] ?? 99;
    const priorityB = statusPriority[b.status] ?? 99;
    return priorityA - priorityB;
  });

  return sorted[0].status as ComponentStatus;
}

export function calculateSystemStatus(modules: { status: string }[]): SystemStatus {
  if (modules.length === 0) return '未投产';

  const statusPriority: Record<string, number> = {
    '故障': 1,
    '维修中': 2,
    '三防中': 3,
    '测试中': 4,
    '投产中': 5,
    '仿真中': 6,
    '借用中': 7,
    '正常': 8,
    '未投产': 9,
  };

  const sorted = [...modules].sort((a, b) => {
    const priorityA = statusPriority[a.status] ?? 99;
    const priorityB = statusPriority[b.status] ?? 99;
    return priorityA - priorityB;
  });

  return sorted[0].status as SystemStatus;
}
