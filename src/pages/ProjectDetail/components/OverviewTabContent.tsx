import React, { useMemo, useState, memo } from 'react';
import { useThemeStyles } from '../../../hooks/useThemeStyles';
import {
  FileText, Monitor, Package, CheckCircle, AlertTriangle, Settings, Cpu,
  TrendingUp, TrendingDown, Minus, Zap, Clock, Calendar, Trash2
} from 'lucide-react';
import AnimatedDonutChart from '../../../components/AnimatedDonutChart';

interface Project {
  id: string;
  name: string;
  stage: string;
  systems: any[];
  modules: any[];
  documents: any[];
  software: any[];
  tasks: any[];
}

interface Stats {
  totalModules: number;
  totalComponents: number;
  normalRate: number;
  faultRate: number;
  documentsCompleted: number;
  documentsTotal: number;
  softwareCompleted: number;
  softwareTotal: number;
  moduleStatusStats: Record<string, number>;
  categoryStats: Record<string, { moduleCount: number; componentCount: number }>;
  systemStatusStats: Record<string, number>;
  componentStatusStats: Record<string, number>;
}

interface OverviewTabContentProps {
  project: Project;
  stats: Stats;
  onAddPlan: () => void;
  onUpdateTask: (taskId: string, updates: any) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleTaskComplete: (task: any) => void;
}

const statusColors: Record<string, string> = {
  '正常': '#10b981',
  '故障': '#ef4444',
  '维修中': '#f97316',
  '测试中': '#3b82f6',
  '未投产': '#6b7280',
  '三防中': '#a855f7',
  '仿真中': '#06b6d4',
};

const priorityColors: Record<string, string> = {
  '紧急': '#ef4444',
  '高': '#f97316',
  '中': '#3b82f6',
  '低': '#9ca3af',
};

const stageColors: Record<string, string> = {
  'F阶段': '#ec4899',
  'C阶段': '#3b82f6',
  'S阶段': '#eab308',
  'D阶段': '#f97316',
  'P阶段': '#22c55e',
};

const HeroSection: React.FC<{ project: Project; stats: Stats }> = ({ project, stats }) => {
  const t = useThemeStyles();
  const stageColor = stageColors[project.stage as keyof typeof stageColors] || '#6b7280';

  const overallProgress = useMemo(() => {
    const total = stats.totalComponents || 1;
    const normalCount = Math.round((stats.normalRate / 100) * total);
    return Math.round((normalCount / total) * 100);
  }, [stats]);

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-6 transition-all duration-500"
      style={{
        background: `linear-gradient(145deg, var(--card-bg) 0%, ${stageColor}08 100%)`,
        border: `1px solid ${stageColor}20`,
      }}
    >
      <div className="relative z-10">
      </div>
    </div>
  );
};

interface KPICardProps {
  label: string;
  value: number | string;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
  icon: React.ElementType;
  color: string;
  delay?: number;
}

const KPICard: React.FC<KPICardProps> = ({
  label,
  value,
  unit,
  trend,
  trendValue,
  icon: Icon,
  color,
  delay = 0,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-5 transition-all duration-300 cursor-pointer ${
        isHovered ? 'shadow-lg -translate-y-0.5' : 'shadow-md'
      }`}
      style={{
        background: `linear-gradient(145deg, var(--card-bg) 0%, ${color}08 100%)`,
        border: `1px solid ${color}20`,
        animation: `fadeInUp 0.5s ease-out ${delay}ms both`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className="absolute top-0 right-0 w-20 h-20 rounded-bl-full opacity-10 transition-opacity duration-300"
        style={{ background: `linear-gradient(135deg, ${color}40, transparent)` }}
      />

      <div className="flex items-start justify-between relative z-10">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider opacity-60" style={{ color }}>
            {label}
          </span>
          <div className="flex items-baseline gap-1.5">
            <span
              className="text-3xl font-bold transition-all duration-300"
              style={{ color }}
            >
              {typeof value === 'number' ? value.toLocaleString() : value}
            </span>
            {unit && (
              <span className="text-sm font-medium opacity-60" style={{ color }}>
                {unit}
              </span>
            )}
          </div>
          {trendValue !== undefined && (
            <div className="flex items-center gap-1 mt-1">
              {trend === 'up' && <TrendingUp size={12} className="text-green-500" />}
              {trend === 'down' && <TrendingDown size={12} className="text-red-500" />}
              {trend === 'stable' && <Minus size={12} className="text-gray-400" />}
              <span className={`text-xs font-semibold ${
                trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-400'
              }`}>
                {trendValue > 0 ? '+' : ''}{trendValue}%
              </span>
            </div>
          )}
        </div>
        <div
          className="p-3 rounded-xl transition-all duration-300"
          style={{
            backgroundColor: `${color}15`,
            transform: isHovered ? 'scale(1.05) rotate(3deg)' : 'scale(1)',
          }}
        >
          <Icon size={22} style={{ color }} />
        </div>
      </div>

      <div
        className="absolute bottom-0 left-0 h-[3px] w-full transition-all duration-500"
        style={{
          background: `linear-gradient(90deg, ${color}, transparent)`,
          transform: isHovered ? 'scaleX(1)' : 'scaleX(0)',
          transformOrigin: 'left',
        }}
      />
    </div>
  );
};

interface ChartCardProps {
  title: string;
  icon: React.ElementType;
  color: string;
  data: any[];
  isEmpty: boolean;
  emptyMessage: string;
  chartData: any[];
  animationDelay: number;
  centerLabel?: string;
  centerValue?: number;
}

const ChartCard: React.FC<ChartCardProps> = ({
  title,
  icon: Icon,
  color,
  data,
  isEmpty,
  emptyMessage,
  chartData,
  animationDelay,
  centerLabel = '总计',
  centerValue,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl transition-all duration-500 ${
        isHovered ? 'shadow-xl' : 'shadow-lg'
      }`}
      style={{
        background: `linear-gradient(145deg, var(--card-bg) 0%, ${color}06 100%)`,
        border: `1px solid ${color}15`,
        animation: `fadeInUp 0.6s ease-out ${animationDelay}ms both`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className="absolute inset-0 opacity-5 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle at center, ${color}30, transparent 70%)`,
          opacity: isHovered ? 10 : 5,
        }}
      />

      <div className="relative z-10 p-5">
        <div className="flex items-center justify-between mb-4">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{
              backgroundColor: `${color}12`,
              border: `1px solid ${color}25`,
            }}
          >
            <Icon size={14} style={{ color }} />
            <span className="font-semibold text-sm" style={{ color }}>{title}</span>
          </div>
        </div>

        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-10 opacity-60">
            <div className="text-4xl mb-2">📊</div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{emptyMessage}</p>
          </div>
        ) : (
          <div className="flex items-center justify-center" style={{ minHeight: '180px' }}>
            <AnimatedDonutChart
              data={chartData}
              size={160}
              strokeWidth={16}
              animationDuration={1200}
              centerLabel={centerLabel}
              centerValue={centerValue}
            />
          </div>
        )}
      </div>
    </div>
  );
};

interface TaskCardProps {
  task: any;
  onToggleComplete: (task: any) => void;
  onDelete: (taskId: string) => void;
  index: number;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onToggleComplete, onDelete, index }) => {
  const [isHovered, setIsHovered] = useState(false);
  const priorityColor = priorityColors[task.priority as keyof typeof priorityColors] || '#9ca3af';

  return (
    <div
      className={`flex items-center gap-3 p-4 rounded-xl transition-all duration-200 ${
        isHovered ? 'shadow-md' : ''
      }`}
      style={{
        backgroundColor: isHovered ? 'var(--hover-bg)' : 'transparent',
        borderLeft: `4px solid ${priorityColor}`,
        marginLeft: '-16px',
        paddingLeft: '20px',
        animation: `fadeInUp 0.3s ease-out ${index * 50}ms both`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        onClick={() => onToggleComplete(task)}
        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
          task.status === '已完成' ? 'border-green-500 bg-green-500' : 'border-gray-300 hover:border-green-500'
        }`}
      >
        {task.status === '已完成' && <CheckCircle size={12} className="text-white" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`font-medium ${task.status === '已完成' ? 'line-through opacity-60' : ''}`}
            style={{ color: 'var(--text-primary)' }}
          >
            {task.title}
          </span>
          <span
            className="px-2 py-0.5 rounded text-xs font-semibold"
            style={{
              backgroundColor: `${priorityColor}15`,
              color: priorityColor,
            }}
          >
            {task.priority === '紧急' ? '紧急' :
             task.priority === '高' ? '高' :
             task.priority === '中' ? '中' : '低'}
          </span>
          {task.status === '已完成' && (
            <span
              className="px-2 py-0.5 rounded text-xs font-semibold"
              style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}
            >
              已完成
            </span>
          )}
          {task.riskItem && (
            <span
              className="px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1"
              style={{ backgroundColor: '#fef3c7', color: '#d97706' }}
            >
              <AlertTriangle size={10} />
              风险项
            </span>
          )}
        </div>
        {task.description && (
          <p className="text-sm mt-1 opacity-70" style={{ color: 'var(--text-secondary)' }}>
            {task.description.split('⚠️')[0].trim()}
          </p>
        )}
        {task.dueDate && (
          <p className="text-xs mt-1 flex items-center gap-1 opacity-60" style={{ color: 'var(--text-secondary)' }}>
            <Calendar size={10} />
            截止日期：{task.dueDate}
          </p>
        )}
      </div>

      <div className={`flex items-center gap-1 transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
        <button
          onClick={() => onDelete(task.id)}
          className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
        >
          <Trash2 size={14} className="text-red-500" />
        </button>
      </div>
    </div>
  );
};

const QuickActionButton: React.FC<{
  icon: React.ElementType;
  label: string;
  color: string;
  onClick?: () => void;
  delay: number;
}> = ({ icon: Icon, label, color, onClick, delay }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-300"
      style={{
        background: isHovered ? `linear-gradient(145deg, var(--card-bg) 0%, ${color}12 100%)` : 'var(--card-bg)',
        border: `1px solid ${isHovered ? color : 'var(--border-color)'}30`,
        transform: isHovered ? 'scale(1.02)' : 'scale(1)',
        boxShadow: isHovered ? `0 8px 24px ${color}15` : 'var(--shadow-sm)',
        animation: `fadeInUp 0.4s ease-out ${delay}ms both`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className="p-2.5 rounded-lg transition-all duration-300"
        style={{
          backgroundColor: `${color}15`,
          transform: isHovered ? 'rotate(5deg) scale(1.1)' : 'rotate(0) scale(1)',
        }}
      >
        <Icon size={20} style={{ color }} />
      </div>
      <span className="text-xs font-medium" style={{ color }}>{label}</span>
    </button>
  );
};

interface ChartCardProps {
  title: string;
  icon: React.ElementType;
  color: string;
  data: any[];
  isEmpty: boolean;
  emptyMessage: string;
  chartData: any[];
  animationDelay: number;
  centerLabel?: string;
  centerValue?: number;
}

interface DonutChartItem {
  name: string;
  value: number;
  fill: string;
}

const DonutChartGrid: React.FC<{
  children: React.ReactNode[];
}> = memo(({ children }) => {
  return (
    <div
      className="grid gap-5"
      style={{
        gridTemplateColumns: 'repeat(2, 1fr)',
        gridTemplateRows: 'repeat(2, 1fr)',
        minHeight: '420px',
      }}
      role="group"
      aria-label="环形图数据可视化区域"
    >
      {children}
    </div>
  );
});

DonutChartGrid.displayName = 'DonutChartGrid';

interface ChartCardComponentProps extends ChartCardProps {
  onSegmentClick?: (segment: DonutChartItem | null) => void;
  onSegmentHover?: (segment: DonutChartItem | null) => void;
}

const ChartCardComponent: React.FC<ChartCardComponentProps> = memo(({
  title,
  icon: Icon,
  color,
  isEmpty,
  emptyMessage,
  chartData,
  animationDelay,
  centerLabel = '总计',
  centerValue,
  onSegmentClick,
  onSegmentHover,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  return (
    <article
      className={`relative overflow-hidden rounded-2xl transition-all duration-500 flex flex-col cursor-pointer ${
        isPressed ? 'scale-[0.98]' : isHovered ? 'shadow-xl scale-[1.01]' : 'shadow-lg'
      }`}
      style={{
        background: `linear-gradient(145deg, var(--card-bg) 0%, ${color}06 100%)`,
        border: `1px solid ${isHovered ? color : 'transparent'}30`,
        animation: `fadeInUp 0.6s ease-out ${animationDelay}ms both`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setIsPressed(false); }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      role="figure"
      aria-label={`${title}数据卡片`}
    >
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle at center, ${color}20, transparent 70%)`,
          opacity: isHovered ? 1 : 0,
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 p-5 flex flex-col h-full">
        <header className="flex items-center justify-between mb-3">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300"
            style={{
              backgroundColor: `${color}12`,
              border: `1px solid ${color}25`,
              transform: isHovered ? 'scale(1.02)' : 'scale(1)',
            }}
          >
            <Icon
              size={14}
              style={{ color }}
              aria-hidden="true"
            />
            <h3 className="font-semibold text-sm" style={{ color }}>
              {title}
            </h3>
          </div>

          <div
            className="flex items-center gap-1 transition-opacity duration-300"
            style={{ opacity: isHovered ? 1 : 0 }}
            aria-hidden="true"
          >
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {chartData.length} 项
            </span>
          </div>
        </header>

        <div
          className="flex-1 flex items-center justify-center transition-transform duration-300"
          style={{ minHeight: '160px', transform: isHovered ? 'scale(1.02)' : 'scale(1)' }}
        >
          {isEmpty ? (
            <div
              className="flex flex-col items-center justify-center opacity-60 transition-opacity duration-300"
              role="status"
              aria-label={emptyMessage}
            >
              <div className="text-4xl mb-2" aria-hidden="true">📊</div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {emptyMessage}
              </p>
            </div>
          ) : (
            <AnimatedDonutChart
              data={chartData}
              size={140}
              strokeWidth={14}
              animationDuration={1200}
              centerLabel={centerLabel}
              centerValue={centerValue}
              onSegmentClick={onSegmentClick}
              onSegmentHover={onSegmentHover}
              aria-hidden="false"
            />
          )}
        </div>

        <footer
          className="mt-3 pt-3 border-t transition-opacity duration-300"
          style={{
            borderColor: `${color}15`,
            opacity: isHovered ? 1 : 0.6,
          }}
          aria-hidden="true"
        >
          <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span>{centerLabel}: {centerValue ?? 0}</span>
            <span>点击扇区查看详情</span>
          </div>
        </footer>
      </div>
    </article>
  );
});

ChartCardComponent.displayName = 'ChartCardComponent';

const FixedChartCard: React.FC<ChartCardProps> = (props) => {
  return <ChartCardComponent {...props} />;
};

FixedChartCard.displayName = 'FixedChartCard';

export function OverviewTabContent({
  project,
  stats,
  onAddPlan,
  onUpdateTask,
  onDeleteTask,
  onToggleTaskComplete,
}: OverviewTabContentProps) {
  const t = useThemeStyles();

  const systemChartData = useMemo(() =>
    Object.entries(stats.systemStatusStats)
      .filter(([_, count]) => count > 0)
      .map(([name, value]) => ({ name, value, fill: statusColors[name] || '#6b7280' })),
    [stats.systemStatusStats]
  );

  const categoryChartData = useMemo(() => {
    const categoryColors = ['#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#84cc16'];
    return Object.entries(stats.categoryStats)
      .map(([name, data], index) => ({
        name,
        value: data.moduleCount,
        fill: categoryColors[index % categoryColors.length]
      }));
  }, [stats.categoryStats]);

  const moduleChartData = useMemo(() =>
    Object.entries(stats.moduleStatusStats)
      .filter(([_, count]) => count > 0)
      .map(([name, value]) => ({ name, value, fill: statusColors[name] || '#6b7280' })),
    [stats.moduleStatusStats]
  );

  const componentChartData = useMemo(() =>
    Object.entries(stats.componentStatusStats)
      .filter(([_, count]) => count > 0)
      .map(([name, value]) => ({ name, value, fill: statusColors[name] || '#6b7280' })),
    [stats.componentStatusStats]
  );

  const tasks = project.tasks || [];
  const completedTasks = tasks.filter((t: any) => t.status === '已完成').length;
  const pendingTasks = tasks.length - completedTasks;

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a: any, b: any) => {
      if (a.status === '已完成' && b.status !== '已完成') return 1;
      if (a.status !== '已完成' && b.status === '已完成') return -1;
      const priorityOrder = { '紧急': 0, '高': 1, '中': 2, '低': 3 };
      return (priorityOrder[a.priority as keyof typeof priorityOrder] || 3) -
             (priorityOrder[b.priority as keyof typeof priorityOrder] || 3);
    });
  }, [tasks]);

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <HeroSection project={project} stats={stats} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="系统总数"
          value={(project.systems || []).length}
          icon={Monitor}
          color="#3b82f6"
          delay={0}
        />
        <KPICard
          label="模块总数"
          value={stats.totalModules}
          icon={Package}
          color="#8b5cf6"
          delay={100}
        />
        <KPICard
          label="组件总数"
          value={stats.totalComponents}
          icon={Cpu}
          color="#10b981"
          delay={200}
        />
        <KPICard
          label="正常率"
          value={stats.normalRate}
          unit="%"
          icon={CheckCircle}
          color="#06b6d4"
          trend="up"
          trendValue={2.5}
          delay={300}
        />
      </div>

      <div className="grid grid-cols-2 gap-5" style={{ minHeight: '420px' }}>
        <FixedChartCard
          title="系统状态"
          icon={Monitor}
          color="#10b981"
          data={systemChartData}
          isEmpty={systemChartData.length === 0}
          emptyMessage="暂无系统数据"
          chartData={systemChartData}
          animationDelay={400}
          centerLabel="系统"
          centerValue={(project.systems || []).length}
        />

        <FixedChartCard
          title="模块种类"
          icon={Package}
          color="#06b6d4"
          data={categoryChartData}
          isEmpty={categoryChartData.length === 0}
          emptyMessage="暂无种类数据"
          chartData={categoryChartData}
          animationDelay={500}
          centerLabel="种类"
          centerValue={Object.keys(stats.categoryStats).length}
        />

        <FixedChartCard
          title="模块状态"
          icon={Settings}
          color="#8b5cf6"
          data={moduleChartData}
          isEmpty={moduleChartData.length === 0}
          emptyMessage="暂无模块数据"
          chartData={moduleChartData}
          animationDelay={600}
          centerLabel="模块"
          centerValue={stats.totalModules}
        />

        <FixedChartCard
          title="组件状态"
          icon={Cpu}
          color="#ef4444"
          data={componentChartData}
          isEmpty={componentChartData.length === 0}
          emptyMessage="暂无组件数据"
          chartData={componentChartData}
          animationDelay={700}
          centerLabel="组件"
          centerValue={stats.totalComponents}
        />
      </div>

      <div
        className="relative overflow-hidden rounded-2xl shadow-lg transition-all duration-500"
        style={{
          background: 'linear-gradient(145deg, var(--card-bg) 0%, #3b82f608 100%)',
          border: '1px solid #3b82f615',
          animation: 'fadeInUp 0.6s ease-out 800ms both',
        }}
      >
        <div
          className="absolute inset-0 opacity-5"
          style={{ background: 'radial-gradient(circle at top right, #3b82f630, transparent 60%)' }}
        />

        <div className="relative z-10 p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl" style={{ backgroundColor: '#3b82f615' }}>
                <FileText size={18} style={{ color: '#3b82f6' }} />
              </div>
              <div>
                <h3 className={`font-semibold text-base ${t.text}`}>
                  项目计划
                </h3>
                <p className="text-xs opacity-60" style={{ color: 'var(--text-secondary)' }}>
                  {completedTasks} 已完成 / {pendingTasks} 进行中
                </p>
              </div>
            </div>
            <button
              onClick={onAddPlan}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                boxShadow: '0 4px 14px rgba(59, 130, 246, 0.3)',
              }}
            >
              <span className="text-base leading-none">+</span>
              添加计划
            </button>
          </div>

          {sortedTasks.length > 0 ? (
            <div className="space-y-1">
              {sortedTasks.map((task: any, index: number) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggleComplete={onToggleTaskComplete}
                  onDelete={onDeleteTask}
                  index={index}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 opacity-60">
              <span className="text-4xl mb-2">📋</span>
              <p style={{ color: 'var(--text-secondary)' }}>暂无计划目标</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                点击右上角按钮添加新计划
              </p>
            </div>
          )}
        </div>
      </div>

      <div
        className="rounded-2xl p-5 shadow-lg"
        style={{
          background: 'linear-gradient(145deg, var(--card-bg) 0%, #8b5cf608 100%)',
          border: '1px solid #8b5cf615',
          animation: 'fadeInUp 0.6s ease-out 900ms both',
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-purple-500/10">
            <Zap size={16} className="text-purple-500" />
          </div>
          <h3 className={`font-semibold text-sm ${t.text}`}>快捷操作</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickActionButton icon={Package} label="新建模块" color="#8b5cf6" delay={0} />
          <QuickActionButton icon={FileText} label="任务管理" color="#3b82f6" delay={100} />
          <QuickActionButton icon={Monitor} label="系统管理" color="#10b981" delay={200} />
          <QuickActionButton icon={Settings} label="项目设置" color="#6b7280" delay={300} />
        </div>
      </div>
    </div>
  );
}

export default OverviewTabContent;