import React, { useState } from 'react';
import { Package, CheckCircle, XCircle, AlertTriangle, Shield, TestTube, Cpu, Clock } from 'lucide-react';
import type { Component, ComponentStatus } from '../types';
import { useThemeStyles } from '../hooks/useThemeStyles';

interface ModuleStatusBoardProps {
  components: Component[];
  moduleName: string;
  onComponentClick?: (component: Component) => void;
}

interface StatusConfig {
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  glowColor: string;
  label: string;
}

const STATUS_CONFIG: Record<ComponentStatus, StatusConfig> = {
  '正常': {
    icon: CheckCircle,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    glowColor: 'shadow-green-500/20',
    label: '正常'
  },
  '故障': {
    icon: XCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    glowColor: 'shadow-red-500/20',
    label: '故障'
  },
  '维修中': {
    icon: AlertTriangle,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    glowColor: 'shadow-orange-500/20',
    label: '维修中'
  },
  '三防中': {
    icon: Shield,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    glowColor: 'shadow-purple-500/20',
    label: '三防中'
  },
  '测试中': {
    icon: TestTube,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    glowColor: 'shadow-yellow-500/20',
    label: '测试中'
  },
  '仿真中': {
    icon: Cpu,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    glowColor: 'shadow-cyan-500/20',
    label: '仿真中'
  },
  '借用中': {
    icon: Clock,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    glowColor: 'shadow-blue-500/20',
    label: '借用中'
  },
  '投产中': {
    icon: Package,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    glowColor: 'shadow-blue-500/20',
    label: '投产中'
  },
  '未投产': {
    icon: Package,
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/30',
    glowColor: 'shadow-gray-500/20',
    label: '未投产'
  },
};

export default function ModuleStatusBoard({ components, moduleName, onComponentClick }: ModuleStatusBoardProps) {
  const t = useThemeStyles();
  const [hoveredComponent, setHoveredComponent] = useState<Component | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const getStatusStats = () => {
    const stats: Record<ComponentStatus, number> = {} as Record<ComponentStatus, number>;
    components.forEach(c => {
      stats[c.status] = (stats[c.status] || 0) + 1;
    });
    return stats;
  };

  const statusStats = getStatusStats();

  const getOverallHealth = () => {
    if (components.length === 0) return { percentage: 0, label: '无组件' };
    const normalCount = components.filter(c => c.status === '正常').length;
    const percentage = Math.round((normalCount / components.length) * 100);
    let label = '健康';
    if (percentage === 100) label = '全部正常';
    else if (percentage >= 75) label = '良好';
    else if (percentage >= 50) label = '一般';
    else if (percentage > 0) label = '异常';
    else if (percentage === 0) label = '全部故障';
    return { percentage, label };
  };

  const health = getOverallHealth();

  const handleMouseEnter = (e: React.MouseEvent, component: Component) => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top
    });
    setHoveredComponent(component);
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    tooltipTimeoutRef.current = setTimeout(() => {
      setShowTooltip(false);
      setHoveredComponent(null);
    }, 150);
  };

  const handleTooltipMouseEnter = () => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }
  };

  const ComponentCard = ({ component }: { component: Component }) => {
    const config = STATUS_CONFIG[component.status] || STATUS_CONFIG['未投产'];
    const Icon = config.icon;

    return (
      <div
        className={`relative p-3 rounded-lg border ${config.borderColor} ${config.bgColor} cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg ${config.glowColor}`}
        onMouseEnter={(e) => handleMouseEnter(e, component)}
        onMouseLeave={handleMouseLeave}
        onClick={() => onComponentClick?.(component)}
      >
        <div className="flex items-center gap-2">
          <Icon size={16} className={config.color} />
          <div className="flex-1 min-w-0">
            <div className={`text-sm font-medium ${t.text} truncate`} title={component.componentName}>
              {component.componentName}
            </div>
            <div className={`text-xs ${t.textMuted} truncate`}>
              {component.componentNumber}
            </div>
          </div>
        </div>
        <div className={`absolute top-1 right-1 w-2 h-2 rounded-full ${config.color.replace('text-', 'bg-')}`} />
        <div className={`mt-1 text-xs ${t.textMuted} truncate`}>
          {component.status}
        </div>
      </div>
    );
  };

  return (
    <div
      className={`${t.card} rounded-lg border ${t.border} p-4`}
      ref={containerRef}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-lg font-semibold ${t.text} flex items-center gap-2`}>
          <Package size={18} />
          组件状态总览
        </h3>
        <div className="flex items-center gap-2">
          <div className={`text-sm ${t.textSecondary}`}>
            模块: <span className={`font-medium ${t.text}`}>{moduleName}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className={`p-4 rounded-lg border ${t.border} ${t.emptyBg}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm ${t.textSecondary}`}>模块健康度</span>
            <span className={`text-2xl font-bold ${health.percentage === 100 ? 'text-green-500' : health.percentage >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
              {health.percentage}%
            </span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                health.percentage === 100 ? 'bg-green-500' :
                health.percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${health.percentage}%` }}
            />
          </div>
          <div className={`text-xs ${t.textMuted} mt-1`}>{health.label}</div>
        </div>

        <div className={`p-4 rounded-lg border ${t.border} ${t.emptyBg}`}>
          <div className={`text-sm ${t.textSecondary} mb-2`}>组件统计</div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className={`text-xl font-bold ${t.text}`}>{components.length}</div>
              <div className={`text-xs ${t.textMuted}`}>总计</div>
            </div>
            <div>
              <div className={`text-xl font-bold text-green-500`}>{statusStats['正常'] || 0}</div>
              <div className={`text-xs ${t.textMuted}`}>正常</div>
            </div>
            <div>
              <div className={`text-xl font-bold text-red-500`}>{statusStats['故障'] || 0}</div>
              <div className={`text-xs ${t.textMuted}`}>故障</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className={`text-sm ${t.textSecondary} mb-2`}>状态分布</div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(statusStats).map(([status, count]) => {
            const config = STATUS_CONFIG[status as ComponentStatus];
            if (!config) return null;
            return (
              <div
                key={status}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${config.bgColor} ${config.color} border ${config.borderColor}`}
              >
                <config.icon size={12} />
                <span>{status}</span>
                <span className="font-medium">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className={`text-sm ${t.textSecondary} mb-3`}>组件列表</div>
        {components.length === 0 ? (
          <div className={`text-center py-8 ${t.textMuted}`}>
            <Package size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">暂无组件</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {components.map((component) => (
              <ComponentCard key={component.id} component={component} />
            ))}
          </div>
        )}
      </div>

      {hoveredComponent && showTooltip && (
        <div
          className="fixed z-50"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            transform: 'translate(-50%, -100%)'
          }}
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className={`${t.card} border ${t.border} rounded-lg shadow-xl p-3 min-w-48 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200`}>
            <div className={`font-medium ${t.text} mb-2`}>{hoveredComponent.componentName}</div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className={t.textMuted}>编号:</span>
                <span className={t.text}>{hoveredComponent.componentNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className={t.textMuted}>状态:</span>
                <span className={STATUS_CONFIG[hoveredComponent.status]?.color || t.text}>
                  {hoveredComponent.status}
                </span>
              </div>
              {hoveredComponent.productionOrderNumber && (
                <div className="flex justify-between">
                  <span className={t.textMuted}>指令号:</span>
                  <span className={t.text}>{hoveredComponent.productionOrderNumber}</span>
                </div>
              )}
              {hoveredComponent.holder && (
                <div className="flex justify-between">
                  <span className={t.textMuted}>负责人:</span>
                  <span className={t.text}>{hoveredComponent.holder}</span>
                </div>
              )}
              {hoveredComponent.stage && (
                <div className="flex justify-between">
                  <span className={t.textMuted}>阶段:</span>
                  <span className={t.text}>{hoveredComponent.stage}</span>
                </div>
              )}
              {hoveredComponent.version && (
                <div className="flex justify-between">
                  <span className={t.textMuted}>版本:</span>
                  <span className={t.text}>{hoveredComponent.version}</span>
                </div>
              )}
              {hoveredComponent.logs && hoveredComponent.logs.length > 0 && (
                <div className="pt-1 mt-1 border-t border-gray-200 dark:border-gray-700">
                  <div className={t.textMuted}>最近日志:</div>
                  <div className={`${t.text} truncate`}>
                    {hoveredComponent.logs[hoveredComponent.logs.length - 1]?.action}
                  </div>
                </div>
              )}
              <div className={`pt-2 mt-1 border-t border-gray-200 dark:border-gray-700 text-center text-xs ${t.textSecondary}`}>
                {hoveredComponent.status === '未投产' ? '点击卡片编辑投产' : '点击卡片可更改状态'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
