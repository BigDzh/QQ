export type StatusType =
  | 'project'
  | 'module'
  | 'component'
  | 'system'
  | 'software'
  | 'document'
  | 'task'
  | 'general';

export type StatusLevel = 'normal' | 'warning' | 'critical' | 'info' | 'inactive';

export interface StatusColorConfig {
  bg: string;
  text: string;
  border: string;
  label: string;
}

const STATUS_COLORS: Record<string, Record<StatusLevel, StatusColorConfig>> = {
  project: {
    normal: {
      bg: 'bg-blue-50 dark:bg-blue-500/10',
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-500/30',
      label: '正常',
    },
    warning: {
      bg: 'bg-yellow-50 dark:bg-yellow-500/10',
      text: 'text-yellow-600 dark:text-yellow-400',
      border: 'border-yellow-200 dark:border-yellow-500/30',
      label: '警告',
    },
    critical: {
      bg: 'bg-red-50 dark:bg-red-500/10',
      text: 'text-red-600 dark:text-red-400',
      border: 'border-red-200 dark:border-red-500/30',
      label: '故障',
    },
    info: {
      bg: 'bg-slate-50 dark:bg-slate-500/10',
      text: 'text-slate-600 dark:text-slate-400',
      border: 'border-slate-200 dark:border-slate-500/30',
      label: '信息',
    },
    inactive: {
      bg: 'bg-gray-50 dark:bg-gray-500/10',
      text: 'text-gray-500 dark:text-gray-400',
      border: 'border-gray-200 dark:border-gray-500/30',
      label: '未投产',
    },
  },
  module: {
    normal: {
      bg: 'bg-green-50 dark:bg-green-500/10',
      text: 'text-green-600 dark:text-green-400',
      border: 'border-green-200 dark:border-green-500/30',
      label: '正常',
    },
    warning: {
      bg: 'bg-yellow-50 dark:bg-yellow-500/10',
      text: 'text-yellow-600 dark:text-yellow-400',
      border: 'border-yellow-200 dark:border-yellow-500/30',
      label: '维修中',
    },
    critical: {
      bg: 'bg-red-50 dark:bg-red-500/10',
      text: 'text-red-600 dark:text-red-400',
      border: 'border-red-200 dark:border-red-500/30',
      label: '故障',
    },
    info: {
      bg: 'bg-amber-50 dark:bg-amber-500/10',
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-500/30',
      label: '测试中',
    },
    inactive: {
      bg: 'bg-gray-50 dark:bg-gray-500/10',
      text: 'text-gray-500 dark:text-gray-400',
      border: 'border-gray-200 dark:border-gray-500/30',
      label: '未投产',
    },
  },
  component: {
    normal: {
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-500/30',
      label: '正常',
    },
    warning: {
      bg: 'bg-orange-50 dark:bg-orange-500/10',
      text: 'text-orange-600 dark:text-orange-400',
      border: 'border-orange-200 dark:border-orange-500/30',
      label: '借用中',
    },
    critical: {
      bg: 'bg-rose-50 dark:bg-rose-500/10',
      text: 'text-rose-600 dark:text-rose-400',
      border: 'border-rose-200 dark:border-rose-500/30',
      label: '故障',
    },
    info: {
      bg: 'bg-cyan-50 dark:bg-cyan-500/10',
      text: 'text-cyan-600 dark:text-cyan-400',
      border: 'border-cyan-200 dark:border-cyan-500/30',
      label: '三防中',
    },
    inactive: {
      bg: 'bg-gray-50 dark:bg-gray-500/10',
      text: 'text-gray-500 dark:text-gray-400',
      border: 'border-gray-200 dark:border-gray-500/30',
      label: '未投产',
    },
  },
  system: {
    normal: {
      bg: 'bg-indigo-50 dark:bg-indigo-500/10',
      text: 'text-indigo-600 dark:text-indigo-400',
      border: 'border-indigo-200 dark:border-indigo-500/30',
      label: '正常',
    },
    warning: {
      bg: 'bg-violet-50 dark:bg-violet-500/10',
      text: 'text-violet-600 dark:text-violet-400',
      border: 'border-violet-200 dark:border-violet-500/30',
      label: '仿真中',
    },
    critical: {
      bg: 'bg-red-50 dark:bg-red-500/10',
      text: 'text-red-600 dark:text-red-400',
      border: 'border-red-200 dark:border-red-500/30',
      label: '故障',
    },
    info: {
      bg: 'bg-purple-50 dark:bg-purple-500/10',
      text: 'text-purple-600 dark:text-purple-400',
      border: 'border-purple-200 dark:border-purple-500/30',
      label: '投产中',
    },
    inactive: {
      bg: 'bg-gray-50 dark:bg-gray-500/10',
      text: 'text-gray-500 dark:text-gray-400',
      border: 'border-gray-200 dark:border-gray-500/30',
      label: '未投产',
    },
  },
  software: {
    normal: {
      bg: 'bg-teal-50 dark:bg-teal-500/10',
      text: 'text-teal-600 dark:text-teal-400',
      border: 'border-teal-200 dark:border-teal-500/30',
      label: '已完成',
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-500/10',
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-500/30',
      label: '开发中',
    },
    critical: {
      bg: 'bg-orange-50 dark:bg-orange-500/10',
      text: 'text-orange-600 dark:text-orange-400',
      border: 'border-orange-200 dark:border-orange-500/30',
      label: '待确认',
    },
    info: {
      bg: 'bg-sky-50 dark:bg-sky-500/10',
      text: 'text-sky-600 dark:text-sky-400',
      border: 'border-sky-200 dark:border-sky-500/30',
      label: '测试中',
    },
    inactive: {
      bg: 'bg-gray-50 dark:bg-gray-500/10',
      text: 'text-gray-500 dark:text-gray-400',
      border: 'border-gray-200 dark:border-gray-500/30',
      label: '未完成',
    },
  },
  task: {
    normal: {
      bg: 'bg-green-50 dark:bg-green-500/10',
      text: 'text-green-600 dark:text-green-400',
      border: 'border-green-200 dark:border-green-500/30',
      label: '已完成',
    },
    warning: {
      bg: 'bg-yellow-50 dark:bg-yellow-500/10',
      text: 'text-yellow-600 dark:text-yellow-400',
      border: 'border-yellow-200 dark:border-yellow-500/30',
      label: '进行中',
    },
    critical: {
      bg: 'bg-red-50 dark:bg-red-500/10',
      text: 'text-red-600 dark:text-red-400',
      border: 'border-red-200 dark:border-red-500/30',
      label: '紧急',
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-500/10',
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-500/30',
      label: '待处理',
    },
    inactive: {
      bg: 'bg-gray-50 dark:bg-gray-500/10',
      text: 'text-gray-500 dark:text-gray-400',
      border: 'border-gray-200 dark:border-gray-500/30',
      label: '已取消',
    },
  },
  general: {
    normal: {
      bg: 'bg-green-50 dark:bg-green-500/10',
      text: 'text-green-600 dark:text-green-400',
      border: 'border-green-200 dark:border-green-500/30',
      label: '正常',
    },
    warning: {
      bg: 'bg-yellow-50 dark:bg-yellow-500/10',
      text: 'text-yellow-600 dark:text-yellow-400',
      border: 'border-yellow-200 dark:border-yellow-500/30',
      label: '警告',
    },
    critical: {
      bg: 'bg-red-50 dark:bg-red-500/10',
      text: 'text-red-600 dark:text-red-400',
      border: 'border-red-200 dark:border-red-500/30',
      label: '严重',
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-500/10',
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-500/30',
      label: '信息',
    },
    inactive: {
      bg: 'bg-gray-50 dark:bg-gray-500/10',
      text: 'text-gray-500 dark:text-gray-400',
      border: 'border-gray-200 dark:border-gray-500/30',
      label: '未激活',
    },
  },
};

const DEFAULT_COLORS: StatusColorConfig = {
  bg: 'bg-gray-50 dark:bg-gray-500/10',
  text: 'text-gray-600 dark:text-gray-400',
  border: 'border-gray-200 dark:border-gray-500/30',
  label: '未知',
};

const STATUS_MAP: Record<string, StatusLevel> = {
  '正常': 'normal',
  '故障': 'critical',
  '维修中': 'warning',
  '三防中': 'info',
  '测试中': 'info',
  '仿真中': 'warning',
  '投产中': 'info',
  '借用中': 'warning',
  '未投产': 'inactive',
  '已完成': 'normal',
  '进行中': 'warning',
  '待处理': 'info',
  '紧急': 'critical',
  '已取消': 'inactive',
  '开发中': 'warning',
  '待确认': 'warning',
};

export function getStatusColor(
  status: string,
  type: StatusType = 'general'
): StatusColorConfig {
  const level = STATUS_MAP[status] || 'inactive';
  const typeColors = STATUS_COLORS[type] || STATUS_COLORS.general;
  return typeColors[level] || DEFAULT_COLORS;
}

export function getStatusLabel(status: string, type: StatusType = 'general'): string {
  const config = getStatusColor(status, type);
  return config.label;
}

export function getStatusBadgeClassName(
  status: string,
  type: StatusType = 'general',
  className: string = ''
): string {
  const config = getStatusColor(status, type);
  return `${config.bg} ${config.text} px-2 py-0.5 rounded text-xs font-medium border ${config.border} ${className}`;
}

export function getStatusDotClassName(
  status: string,
  _type: StatusType = 'general',
  className: string = ''
): string {
  const level = STATUS_MAP[status] || 'inactive';
  const dotColors: Record<StatusLevel, string> = {
    normal: 'bg-green-500',
    warning: 'bg-yellow-500',
    critical: 'bg-red-500',
    info: 'bg-blue-500',
    inactive: 'bg-gray-400',
  };
  return `w-2 h-2 rounded-full ${dotColors[level]} ${className}`;
}

export function getPriorityColor(priority: string): StatusColorConfig {
  const priorityMap: Record<string, StatusLevel> = {
    '紧急': 'critical',
    '高': 'warning',
    '中': 'info',
    '低': 'inactive',
  };

  const level = priorityMap[priority] || 'inactive';
  const colors = STATUS_COLORS.general;
  return colors[level];
}

export function getPriorityBadgeClassName(
  priority: string,
  className: string = ''
): string {
  const config = getPriorityColor(priority);
  return `${config.bg} ${config.text} px-2 py-0.5 rounded text-xs font-medium ${className}`;
}

export { STATUS_COLORS, STATUS_MAP };
