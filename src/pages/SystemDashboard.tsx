import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { useApp } from '../context/AppContext';
import {
  Activity,
  Cpu,
  HardDrive,
  MemoryStick,
  Server,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Settings,
  RefreshCw,
  Zap,
  Database,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  RotateCcw,
  Plus,
  Package,
  Users,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface DashboardWidget {
  id: string;
  type: 'kpi' | 'chart' | 'system-status' | 'quick-actions' | 'recent-activity' | 'alerts';
  title: string;
  visible: boolean;
  order: number;
}

interface KPIData {
  id: string;
  label: string;
  value: number | string;
  previousValue?: number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
  icon: React.ElementType;
  color: string;
  sparklineData?: number[];
}

interface ChartConfig {
  type: 'area' | 'line' | 'bar' | 'pie';
  data: any[];
  dataKey: string;
  nameKey: string;
  colors?: string[];
}

const defaultWidgets: DashboardWidget[] = [
  { id: 'kpi-stats', type: 'kpi', title: '核心指标', visible: true, order: 0 },
  { id: 'system-monitor', type: 'system-status', title: '系统监控', visible: true, order: 1 },
  { id: 'status-breakdown', type: 'chart', title: '状态分布', visible: true, order: 2 },
  { id: 'trend-analysis', type: 'chart', title: '趋势分析', visible: true, order: 3 },
  { id: 'quick-actions', type: 'quick-actions', title: '快捷操作', visible: true, order: 4 },
  { id: 'recent-activity', type: 'recent-activity', title: '最近活动', visible: true, order: 5 },
];

const defaultKPIs: KPIData[] = [
  {
    id: 'projects',
    label: '项目总数',
    value: 0,
    previousValue: 0,
    unit: '个',
    trend: 'stable',
    icon: Activity,
    color: '#3b82f6',
    sparklineData: [0],
  },
  {
    id: 'modules',
    label: '模块数量',
    value: 0,
    previousValue: 0,
    unit: '个',
    trend: 'stable',
    icon: Cpu,
    color: '#8b5cf6',
    sparklineData: [0],
  },
  {
    id: 'components',
    label: '组件数量',
    value: 0,
    previousValue: 0,
    unit: '个',
    trend: 'stable',
    icon: Database,
    color: '#10b981',
    sparklineData: [0],
  },
  {
    id: 'normal-rate',
    label: '健康指数',
    value: 0,
    previousValue: 0,
    unit: '%',
    trend: 'stable',
    icon: CheckCircle,
    color: '#06b6d4',
    sparklineData: [0],
  },
];

const SystemStatusCard: React.FC<{
  label: string;
  value: number;
  unit?: string;
  icon: React.ElementType;
  color: string;
  maxValue?: number;
}> = ({ label, value, unit = '%', icon: Icon, color, maxValue = 100 }) => {
  const [isHovered, setIsHovered] = useState(false);
  const percentage = Math.min((value / maxValue) * 100, 100);

  const getStatusColor = () => {
    if (percentage < 60) return 'bg-green-500';
    if (percentage < 85) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div
      className={`relative p-4 rounded-xl transition-all duration-300 ${
        isHovered ? 'scale-[1.02] shadow-lg' : 'shadow-md'
      }`}
      style={{
        background: `linear-gradient(135deg, var(--card-bg, white) 0%, ${color}08 100%)`,
        border: `1px solid ${color}20`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium opacity-70" style={{ color, textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
          {label}
        </span>
        <Icon size={14} style={{ color }} />
      </div>
      <div className="flex items-end gap-1">
        <span className="text-2xl font-bold" style={{ color, textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
          {typeof value === 'number' ? value.toFixed(1) : value}
        </span>
        <span className="text-xs opacity-70 mb-1" style={{ color, textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
          {unit}
        </span>
      </div>
      <div className="mt-3 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getStatusColor()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

const KPICard: React.FC<{
  kpi: KPIData;
  index: number;
}> = ({ kpi, index }) => {
  const [isHovered, setIsHovered] = useState(false);
  const Icon = kpi.icon;

  const trendIcon = useMemo(() => {
    if (kpi.trend === 'up') return <TrendingUp size={14} className="text-green-500" />;
    if (kpi.trend === 'down') return <TrendingDown size={14} className="text-red-500" />;
    return <Minus size={14} className="text-gray-400" />;
  }, [kpi.trend]);

  const sparklineColor = kpi.color;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-5 transition-all duration-500 cursor-pointer ${
        isHovered ? 'scale-[1.02] shadow-xl' : 'shadow-md'
      }`}
      style={{
        background: `linear-gradient(135deg, var(--card-bg, white) 0%, ${sparklineColor}10 100%)`,
        border: `1px solid ${sparklineColor}25`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className="absolute top-0 right-0 w-20 h-20 rounded-bl-full opacity-15 transition-opacity duration-300"
        style={{ background: `linear-gradient(135deg, ${sparklineColor}40, transparent)` }}
      />

      <div className="flex items-start justify-between relative z-10">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-wider opacity-60" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
            {kpi.label}
          </span>
          <div className="flex items-baseline gap-2">
            <span
              className="text-3xl font-bold transition-all duration-300"
              style={{ color: sparklineColor, textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}
            >
              {typeof kpi.value === 'number' ? kpi.value.toLocaleString() : kpi.value}
            </span>
            {kpi.unit && (
              <span className="text-sm opacity-70" style={{ color: sparklineColor, textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                {kpi.unit}
              </span>
            )}
          </div>
          {kpi.trendValue !== undefined && (
            <div className="flex items-center gap-1">
              {trendIcon}
              <span className="text-xs font-medium" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                {kpi.trendValue > 0 ? '+' : ''}
                {kpi.trendValue}%
              </span>
            </div>
          )}
        </div>
        <div
          className="p-3 rounded-xl transition-all duration-300"
          style={{ backgroundColor: `${sparklineColor}15` }}
        >
          <Icon
            size={24}
            style={{ color: sparklineColor }}
            className={`transition-transform duration-300 ${isHovered ? 'scale-110 rotate-6' : ''}`}
          />
        </div>
      </div>

      {kpi.sparklineData && kpi.sparklineData.length > 1 && (
        <div className="mt-4 h-12">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={kpi.sparklineData.map((v, i) => ({ value: v, index: i }))}>
              <defs>
                <linearGradient id={`sparkline-${kpi.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={sparklineColor} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={sparklineColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={sparklineColor}
                strokeWidth={2}
                fill={`url(#sparkline-${kpi.id})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div
        className="absolute bottom-0 left-0 h-1 w-full transition-all duration-500"
        style={{
          background: `linear-gradient(90deg, ${sparklineColor}, transparent)`,
          transform: isHovered ? 'scaleX(1)' : 'scaleX(0)',
          transformOrigin: 'left',
        }}
      />
    </div>
  );
};

const ChartWidget: React.FC<{
  title: string;
  icon: React.ElementType;
  color: string;
  config: ChartConfig;
  height?: number;
  index?: number;
}> = ({ title, icon: Icon, color, config, height = 250, index = 0 }) => {
  const [isHovered, setIsHovered] = useState(false);

  const renderChart = () => {
    switch (config.type) {
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={config.data}>
              <defs>
                <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              <XAxis dataKey={config.nameKey} stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(17, 24, 39, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: 'white',
                }}
              />
              <Area
                type="monotone"
                dataKey={config.dataKey}
                stroke={color}
                strokeWidth={2}
                fill={`url(#gradient-${title})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={config.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              <XAxis dataKey={config.nameKey} stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(17, 24, 39, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: 'white',
                }}
              />
              <Bar dataKey={config.dataKey} fill={color} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={config.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              <XAxis dataKey={config.nameKey} stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(17, 24, 39, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: 'white',
                }}
              />
              <Line
                type="monotone"
                dataKey={config.dataKey}
                stroke={color}
                strokeWidth={2}
                dot={{ fill: color, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={config.data}
                dataKey={config.dataKey}
                nameKey={config.nameKey}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
              >
                {config.data.map((_entry: any, idx: number) => (
                  <Cell
                    key={`cell-${idx}`}
                    fill={config.colors ? config.colors[idx % config.colors.length] : color}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(17, 24, 39, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: 'white',
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl transition-all duration-500 ${
        isHovered ? 'shadow-2xl' : 'shadow-lg'
      }`}
      style={{
        background: `linear-gradient(145deg, var(--card-bg, white) 0%, ${color}08 100%)`,
        border: `1px solid ${color}20`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="p-4 border-b border-gray-100 dark:border-gray-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: `${color}15` }}
            >
              <Icon size={16} style={{ color }} />
            </div>
            <span className="font-semibold text-sm" style={{ color }}>
              {title}
            </span>
          </div>
        </div>
      </div>
      <div className="p-4">{renderChart()}</div>
    </div>
  );
};

const QuickActionsWidget: React.FC<{
  actions: Array<{
    id: string;
    label: string;
    icon: React.ElementType;
    color: string;
    description?: string;
    path?: string;
  }>;
  onAction?: (actionId: string) => void;
}> = ({ actions, onAction }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {actions.map((action, index) => {
        const Icon = action.icon;
        const content = (
          <button
            key={action.id}
            onClick={() => onAction?.(action.id)}
            className={`relative p-4 rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg group text-left`}
            style={{
              background: `linear-gradient(135deg, var(--card-bg, white) 0%, ${action.color}08 100%)`,
              border: `1px solid ${action.color}25`,
            }}
          >
            <div
              className="p-2 rounded-lg mb-2 w-fit transition-colors duration-300"
              style={{ backgroundColor: `${action.color}15` }}
            >
              <Icon
                size={20}
                style={{ color: action.color }}
                className="group-hover:scale-110 transition-transform"
              />
            </div>
            <span
              className="text-xs font-medium block"
              style={{ color: action.color }}
            >
              {action.label}
            </span>
            {action.description && (
              <span className="text-xs opacity-50 mt-1 block">
                {action.description}
              </span>
            )}
          </button>
        );

        return action.path ? (
          <Link key={action.id} to={action.path}>
            {content}
          </Link>
        ) : (
          <React.Fragment key={action.id}>{content}</React.Fragment>
        );
      })}
    </div>
  );
};

const RecentActivityWidget: React.FC<{
  activities: Array<{
    id: string;
    type: 'create' | 'update' | 'delete' | 'status';
    message: string;
    timestamp: Date;
    icon?: string;
  }>;
}> = ({ activities }) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'create':
        return <CheckCircle size={14} className="text-green-500" />;
      case 'update':
        return <RefreshCw size={14} className="text-blue-500" />;
      case 'delete':
        return <XCircle size={14} className="text-red-500" />;
      case 'status':
        return <Activity size={14} className="text-purple-500" />;
      default:
        return <Clock size={14} className="text-gray-400" />;
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}小时前`;
    return `${Math.floor(hours / 24)}天前`;
  };

  return (
    <div className="space-y-3 max-h-64 overflow-y-auto">
      {activities.length === 0 ? (
        <div className="text-center py-8 opacity-50">
          <Clock size={32} className="mx-auto mb-2 text-gray-400" />
          <p className="text-sm">暂无最近活动</p>
        </div>
      ) : (
        activities.map((activity, index) => (
          <div
            key={activity.id}
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <div className="mt-0.5">{getActivityIcon(activity.type)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.15)' }}>{activity.message}</p>
              <p className="text-xs opacity-60 mt-0.5" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>{formatTime(activity.timestamp)}</p>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

const AlertsWidget: React.FC<{
  alerts: Array<{
    id: string;
    type: 'warning' | 'error' | 'info';
    message: string;
    timestamp: Date;
  }>;
  onDismiss?: (id: string) => void;
}> = ({ alerts, onDismiss }) => {
  const getAlertStyle = (type: string) => {
    switch (type) {
      case 'warning':
        return {
          bg: 'bg-yellow-500/10',
          border: 'border-yellow-500/30',
          icon: <AlertTriangle size={16} className="text-yellow-500" />,
        };
      case 'error':
        return {
          bg: 'bg-red-500/10',
          border: 'border-red-500/30',
          icon: <XCircle size={16} className="text-red-500" />,
        };
      default:
        return {
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/30',
          icon: <Activity size={16} className="text-blue-500" />,
        };
    }
  };

  return (
    <div className="space-y-3">
      {alerts.length === 0 ? (
        <div className="text-center py-6 opacity-50">
          <CheckCircle size={24} className="mx-auto mb-2 text-green-500" />
          <p className="text-sm">暂无警报</p>
        </div>
      ) : (
        alerts.map((alert, index) => {
          const style = getAlertStyle(alert.type);
          return (
            <div
              key={alert.id}
              className={`flex items-start gap-3 p-3 rounded-lg ${style.bg} border ${style.border} transition-all hover:scale-[1.01]`}
            >
              <div className="mt-0.5">{style.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.15)' }}>{alert.message}</p>
                <p className="text-xs opacity-60 mt-1" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                  {alert.timestamp.toLocaleString()}
                </p>
              </div>
              {onDismiss && (
                <button
                  onClick={() => onDismiss(alert.id)}
                  className="p-1 hover:bg-black/10 rounded transition-colors"
                >
                  <XCircle size={14} className="opacity-50" />
                </button>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

interface SystemDashboardProps {
  className?: string;
}

export default function SystemDashboard({ className = '' }: SystemDashboardProps) {
  const { theme } = useTheme();
  const t = useThemeStyles();
  const { projects } = useApp();

  const [widgets, setWidgets] = useState<DashboardWidget[]>(defaultWidgets);
  const [_layoutMode, _setLayoutMode] = useState<'grid' | 'list'>('grid');
  const [showSettings, setShowSettings] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const [systemResources, setSystemResources] = useState({
    cpu: 0,
    memory: 0,
    disk: 0,
    fps: 60,
  });

  const projectStats = useMemo(() => {
    const totalModules = (projects || []).reduce((sum, p) => sum + ((p.modules && Array.isArray(p.modules)) ? p.modules.length : 0), 0);
    const totalComponents = (projects || []).reduce(
      (sum, p) => sum + ((p.modules && Array.isArray(p.modules)) ? p.modules.reduce((s, m) => s + ((m.components && Array.isArray(m.components)) ? m.components.length : 0), 0) : 0),
      0
    );
    const normalComponents = (projects || []).reduce(
      (sum, p) =>
        sum +
        ((p.modules && Array.isArray(p.modules)) ? p.modules.reduce(
          (s, m) => s + ((m.components && Array.isArray(m.components)) ? m.components.filter((c: any) => c.status === '正常').length : 0),
          0
        ) : 0),
      0
    );
    const normalRate = totalComponents > 0 ? Math.round((normalComponents / totalComponents) * 100) : 0;

    return { totalModules, totalComponents, normalRate };
  }, [projects]);

  const [kpis, setKpis] = useState<KPIData[]>([
    {
      id: 'projects',
      label: '项目总数',
      value: (projects || []).length,
      previousValue: (projects || []).length,
      unit: '个',
      trend: 'stable',
      icon: Activity,
      color: '#3b82f6',
      sparklineData: [(projects || []).length],
    },
    {
      id: 'modules',
      label: '模块数量',
      value: projectStats.totalModules,
      previousValue: projectStats.totalModules,
      unit: '个',
      trend: 'stable',
      icon: Package,
      color: '#8b5cf6',
      sparklineData: [projectStats.totalModules],
    },
    {
      id: 'components',
      label: '组件数量',
      value: projectStats.totalComponents,
      previousValue: projectStats.totalComponents,
      unit: '个',
      trend: 'stable',
      icon: Cpu,
      color: '#10b981',
      sparklineData: [projectStats.totalComponents],
    },
    {
      id: 'normal-rate',
      label: '健康指数',
      value: projectStats.normalRate,
      previousValue: projectStats.normalRate,
      unit: '%',
      trend: 'stable',
      icon: CheckCircle,
      color: '#06b6d4',
      sparklineData: [projectStats.normalRate],
    },
  ]);

  useEffect(() => {
    setKpis([
      {
        id: 'projects',
        label: '项目总数',
        value: (projects || []).length,
        previousValue: (projects || []).length,
        unit: '个',
        trend: 'stable',
        icon: Activity,
        color: '#3b82f6',
        sparklineData: [(projects || []).length],
      },
      {
        id: 'modules',
        label: '模块数量',
        value: projectStats.totalModules,
        previousValue: projectStats.totalModules,
        unit: '个',
        trend: 'stable',
        icon: Package,
        color: '#8b5cf6',
        sparklineData: [projectStats.totalModules],
      },
      {
        id: 'components',
        label: '组件数量',
        value: projectStats.totalComponents,
        previousValue: projectStats.totalComponents,
        unit: '个',
        trend: 'stable',
        icon: Cpu,
        color: '#10b981',
        sparklineData: [projectStats.totalComponents],
      },
      {
        id: 'normal-rate',
        label: '健康指数',
        value: projectStats.normalRate,
        previousValue: projectStats.normalRate,
        unit: '%',
        trend: 'stable',
        icon: CheckCircle,
        color: '#06b6d4',
        sparklineData: [projectStats.normalRate],
      },
    ]);
  }, [projects, projectStats]);

  const [activities] = useState([
    { id: '1', type: 'create' as const, message: '创建了新项目 "XX系统"', timestamp: new Date(Date.now() - 300000) },
    { id: '2', type: 'update' as const, message: '更新了模块状态', timestamp: new Date(Date.now() - 1800000) },
    { id: '3', type: 'status' as const, message: '组件状态变更为正常', timestamp: new Date(Date.now() - 3600000) },
  ]);
  const [alerts] = useState<Array<{ id: string; type: 'warning' | 'error' | 'info'; message: string; timestamp: Date }>>([]);

  const quickActions = [
    { id: 'new-project', label: '新建项目', icon: Plus, color: '#3b82f6', description: '创建新项目', path: '/projects' },
    { id: 'tasks', label: '任务管理', icon: CheckCircle, color: '#8b5cf6', description: '查看任务', path: '/tasks' },
    { id: 'backup', label: '数据备份', icon: Database, color: '#10b981', description: '备份数据', path: '/backups' },
    { id: 'users', label: '用户管理', icon: Users, color: '#6b7280', description: '管理用户', path: '/users' },
  ];

  const updateSystemResources = useCallback(() => {
    const memory = (performance as any).memory;
    let memoryPercent = 35;
    if (memory) {
      memoryPercent = Math.round(
        (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
      );
    }

    setSystemResources({
      cpu: Math.random() * 30 + 10,
      memory: memoryPercent,
      disk: Math.random() * 20 + 5,
      fps: Math.round(55 + Math.random() * 10),
    });

    setKpis((prev) =>
      prev.map((kpi) => ({
        ...kpi,
        sparklineData: [...(kpi.sparklineData || []), Math.random() * 20 + 80].slice(-10),
      }))
    );

    setLastUpdate(new Date());
  }, []);

  useEffect(() => {
    updateSystemResources();
    const interval = setInterval(updateSystemResources, 5000);
    return () => clearInterval(interval);
  }, [updateSystemResources]);

  const toggleWidgetVisibility = (widgetId: string) => {
    setWidgets((prev) =>
      prev.map((w) =>
        w.id === widgetId ? { ...w, visible: !w.visible } : w
      )
    );
  };

  const resetWidgets = () => {
    setWidgets(defaultWidgets);
  };

  const visibleWidgets = useMemo(
    () => widgets.filter((w) => w.visible).sort((a, b) => a.order - b.order),
    [widgets]
  );

  const statusBreakdownConfig: ChartConfig = {
    type: 'pie',
    data: [
      { name: '正常', value: 45 },
      { name: '故障', value: 5 },
      { name: '维修中', value: 3 },
      { name: '测试中', value: 7 },
    ],
    dataKey: 'value',
    nameKey: 'name',
    colors: ['#10b981', '#ef4444', '#f97316', '#3b82f6'],
  };

  const trendData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map((day) => ({
      name: day,
      value: Math.floor(Math.random() * 50) + 30,
    }));
  }, []);

  const trendConfig: ChartConfig = {
    type: 'area',
    data: trendData,
    dataKey: 'value',
    nameKey: 'name',
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${t.text}`} style={{ textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>系统概览</h1>
          <p className={`text-sm ${t.textSecondary} mt-1`}>
            实时监控系统状态 · 最后更新: {lastUpdate.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={updateSystemResources}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
              theme === 'cyberpunk'
                ? 'bg-white/5 hover:bg-white/10 text-cyan-400'
                : 'hover:bg-gray-100 dark:hover:bg-white/10'
            }`}
            title="刷新数据"
          >
            <RefreshCw size={14} className={t.textSecondary} />
            <span className={`text-sm ${t.textSecondary}`}>刷新</span>
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
              showSettings
                ? 'bg-blue-500/10 border border-blue-500/30'
                : theme === 'cyberpunk'
                  ? 'bg-white/5 hover:bg-white/10'
                  : 'hover:bg-gray-100 dark:hover:bg-white/10'
            }`}
          >
            <Settings size={14} className={showSettings ? 'text-blue-400' : t.textSecondary} />
            <span className={`text-sm ${showSettings ? 'text-blue-400' : t.textSecondary}`}>
              布局设置
            </span>
          </button>
        </div>
      </div>

      {showSettings && (
        <div
          className={`p-4 rounded-xl border ${
            theme === 'cyberpunk'
              ? 'bg-white/5 border-white/10'
              : 'bg-white/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
          }`}
        >
          <div className="flex flex-wrap items-center gap-4">
            <span className={`text-sm font-medium ${t.textSecondary}`}>显示组件:</span>
            {widgets.map((widget) => (
              <button
                key={widget.id}
                onClick={() => toggleWidgetVisibility(widget.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
                  widget.visible
                    ? 'bg-green-500/10 text-green-500 border border-green-500/30'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 border border-transparent'
                }`}
              >
                {widget.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                {widget.title}
              </button>
            ))}
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={resetWidgets}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-all ${
                  theme === 'cyberpunk'
                    ? 'bg-white/5 hover:bg-white/10 text-gray-400'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500'
                }`}
              >
                <RotateCcw size={14} />
                重置
              </button>
            </div>
          </div>
        </div>
      )}

      {visibleWidgets.find((w) => w.id === 'kpi-stats') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi, index) => (
            <KPICard key={kpi.id} kpi={kpi} index={index} />
          ))}
        </div>
      )}

      {visibleWidgets.find((w) => w.id === 'system-monitor') && (
        <div
          className="rounded-2xl p-6 shadow-lg"
          style={{
            background: `linear-gradient(145deg, var(--card-bg, white) 0%, #8b5cf610 100%)`,
            border: '1px solid #8b5cf620',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Server size={18} className="text-purple-500" />
              </div>
              <h2 className="font-semibold" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>系统资源监控</h2>
            </div>
            <div className="flex items-center gap-2 text-xs opacity-60" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.15)' }}>
              <span>每5秒自动更新</span>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SystemStatusCard
              label="CPU 使用率"
              value={systemResources.cpu}
              icon={Cpu}
              color="#3b82f6"
            />
            <SystemStatusCard
              label="内存 使用率"
              value={systemResources.memory}
              icon={MemoryStick}
              color="#8b5cf6"
            />
            <SystemStatusCard
              label="磁盘 使用率"
              value={systemResources.disk}
              icon={HardDrive}
              color="#10b981"
            />
            <SystemStatusCard
              label="帧率 FPS"
              value={systemResources.fps}
              icon={Zap}
              color="#f59e0b"
              maxValue={60}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {visibleWidgets.find((w) => w.id === 'status-breakdown') && (
          <ChartWidget
            title="状态分布"
            icon={PieChart}
            color="#8b5cf6"
            config={statusBreakdownConfig}
            index={0}
          />
        )}

        {visibleWidgets.find((w) => w.id === 'trend-analysis') && (
          <ChartWidget
            title="趋势分析"
            icon={TrendingUp}
            color="#10b981"
            config={trendConfig}
            index={1}
          />
        )}
      </div>

      {visibleWidgets.find((w) => w.id === 'quick-actions') && (
        <div
          className="rounded-2xl p-6 shadow-lg"
          style={{
            background: `linear-gradient(145deg, var(--card-bg, white) 0%, #3b82f610 100%)`,
            border: '1px solid #3b82f620',
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Zap size={18} className="text-blue-500" />
            </div>
            <h2 className="font-semibold" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>快捷操作</h2>
          </div>
          <QuickActionsWidget actions={quickActions} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {visibleWidgets.find((w) => w.id === 'recent-activity') && (
          <div
            className="rounded-2xl p-6 shadow-lg"
            style={{
              background: `linear-gradient(145deg, var(--card-bg, white) 0%, #06b6d410 100%)`,
              border: '1px solid #06b6d420',
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-cyan-500/10">
                <Clock size={18} className="text-cyan-500" />
              </div>
              <h2 className="font-semibold">最近活动</h2>
            </div>
            <RecentActivityWidget activities={activities} />
          </div>
        )}

        {visibleWidgets.find((w) => w.id === 'alerts') && (
          <div
            className="rounded-2xl p-6 shadow-lg"
            style={{
              background: `linear-gradient(145deg, var(--card-bg, white) 0%, #ef444410 100%)`,
              border: '1px solid #ef444420',
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-red-500/10">
                <AlertTriangle size={18} className="text-red-500" />
              </div>
              <h2 className="font-semibold" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>系统警报</h2>
            </div>
            <AlertsWidget alerts={alerts} />
          </div>
        )}
      </div>
    </div>
  );
}
