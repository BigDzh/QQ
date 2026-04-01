import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Package, CheckCircle, XCircle, AlertTriangle, Shield, TestTube, Cpu, Clock } from 'lucide-react';
import type { Component, ComponentStatus } from '../types';
import { useThemeStyles } from '../hooks/useThemeStyles';

interface ModuleStatusBoardProps {
  components: Component[];
  moduleName: string;
  moduleId: string;
  projectId: string;
  canEdit?: boolean;
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

interface TooltipPosition {
  x: number;
  y: number;
}

interface TooltipState {
  visible: boolean;
  component: Component | null;
  position: TooltipPosition;
}

const CURSOR_OFFSET = 8;
const TOOLTIP_WIDTH = 288;
const TOOLTIP_HEIGHT = 340;

export default function ModuleStatusBoard({ components, moduleName, moduleId, projectId, canEdit = false, onComponentClick }: ModuleStatusBoardProps) {
  const t = useThemeStyles();
  const [tooltipState, setTooltipState] = useState<TooltipState>({
    visible: false,
    component: null,
    position: { x: 0, y: 0 }
  });
  const [isHoveringTooltip, setIsHoveringTooltip] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentComponentRef = useRef<Component | null>(null);
  const mousePositionRef = useRef<TooltipPosition>({ x: 0, y: 0 });

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

  const clearAllTimeouts = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }
  }, []);

  const calculateTooltipPosition = useCallback((mouseX: number, mouseY: number): TooltipPosition => {
    const padding = 10;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = mouseX + CURSOR_OFFSET;
    let y = mouseY + CURSOR_OFFSET;

    if (x + TOOLTIP_WIDTH > viewportWidth - padding) {
      x = mouseX - TOOLTIP_WIDTH - CURSOR_OFFSET;
    }

    if (y + TOOLTIP_HEIGHT > viewportHeight - padding) {
      y = mouseY - TOOLTIP_HEIGHT - CURSOR_OFFSET;
    }

    if (x < padding) {
      x = padding;
    }
    if (y < padding) {
      y = padding;
    }

    return { x, y };
  }, []);

  const handleMouseEnter = useCallback((e: React.MouseEvent, component: Component) => {
    clearAllTimeouts();

    currentComponentRef.current = component;
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    mousePositionRef.current = { x: mouseX, y: mouseY };

    const position = calculateTooltipPosition(mouseX, mouseY);

    showTimeoutRef.current = setTimeout(() => {
      setTooltipState({
        visible: true,
        component,
        position
      });
    }, 50);
  }, [clearAllTimeouts, calculateTooltipPosition]);

  const handleMouseMove = useCallback((e: React.MouseEvent, component: Component) => {
    if (tooltipState.visible && currentComponentRef.current?.id === component.id) {
      mousePositionRef.current = { x: e.clientX, y: e.clientY };
      const position = calculateTooltipPosition(e.clientX, e.clientY);
      setTooltipState(prev => ({
        ...prev,
        position
      }));
    }
  }, [tooltipState.visible, calculateTooltipPosition]);

  const handleMouseLeave = useCallback(() => {
    clearAllTimeouts();

    if (!isHoveringTooltip) {
      hideTimeoutRef.current = setTimeout(() => {
        setTooltipState(prev => ({
          ...prev,
          visible: false
        }));
        currentComponentRef.current = null;
      }, 50);
    }
  }, [clearAllTimeouts, isHoveringTooltip]);

  const handleTooltipMouseEnter = useCallback(() => {
    setIsHoveringTooltip(true);
    clearAllTimeouts();
  }, [clearAllTimeouts]);

  const handleTooltipMouseLeave = useCallback(() => {
    setIsHoveringTooltip(false);
    hideTimeoutRef.current = setTimeout(() => {
      setTooltipState(prev => ({
        ...prev,
        visible: false
      }));
      currentComponentRef.current = null;
    }, 50);
  }, [clearAllTimeouts]);

  useEffect(() => {
    return () => {
      clearAllTimeouts();
    };
  }, [clearAllTimeouts]);

  const ComponentCard = ({ component, canEdit }: { component: Component; canEdit: boolean }) => {
    const config = STATUS_CONFIG[component.status] || STATUS_CONFIG['未投产'];
    const Icon = config.icon;

    return (
      <div
        className={`relative p-3 rounded-lg border ${config.borderColor} ${config.bgColor} ${canEdit ? 'cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg' : 'cursor-default'} ${config.glowColor}`}
        onMouseEnter={(e) => handleMouseEnter(e, component)}
        onMouseMove={(e) => handleMouseMove(e, component)}
        onMouseLeave={handleMouseLeave}
        onClick={() => canEdit && onComponentClick?.(component)}
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
        <div className="mt-1 flex items-center justify-between">
          <span className={`text-xs ${t.textMuted} truncate`}>
            {component.status}
          </span>
          {canEdit && (
            <span className={`text-xs ${t.textMuted} opacity-60`}>
              点击修改
            </span>
          )}
        </div>
      </div>
    );
  };

  const { visible, component: hoveredComponent, position } = tooltipState;
  const config = hoveredComponent ? STATUS_CONFIG[hoveredComponent.status] || STATUS_CONFIG['未投产'] : null;
  const Icon = config?.icon;

  const getCreatedTime = () => {
    if (!hoveredComponent?.logs || hoveredComponent.logs.length === 0) return null;
    const sortedLogs = [...hoveredComponent.logs].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    return sortedLogs[0]?.timestamp;
  };

  const getLastLogTime = () => {
    if (!hoveredComponent?.logs || hoveredComponent.logs.length === 0) return null;
    const sortedLogs = [...hoveredComponent.logs].sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    return sortedLogs[0]?.timestamp;
  };

  const createdTime = getCreatedTime();
  const lastLogTime = getLastLogTime();

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
            const statusConfig = STATUS_CONFIG[status as ComponentStatus];
            if (!statusConfig) return null;
            return (
              <div
                key={status}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${statusConfig.bgColor} ${statusConfig.color} border ${statusConfig.borderColor}`}
              >
                <statusConfig.icon size={12} />
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
              <ComponentCard key={component.id} component={component} canEdit={canEdit} />
            ))}
          </div>
        )}
      </div>

      {visible && hoveredComponent && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{
            left: position.x,
            top: position.y
          }}
        >
          <div
            className="pointer-events-auto"
            onMouseEnter={handleTooltipMouseEnter}
            onMouseLeave={handleTooltipMouseLeave}
          >
            <div
              className={`${t.card} border ${t.border} rounded-xl shadow-2xl p-4 w-72 backdrop-blur-xl`}
              style={{
                animation: 'tooltipFadeIn 0.12s ease-out forwards',
              }}
            >
              <div className="flex items-start gap-3 mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                {Icon && <Icon size={20} className={config?.color} />}
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold ${t.text} truncate`} title={hoveredComponent.componentName}>
                    {hoveredComponent.componentName}
                  </div>
                  <div className={`text-xs ${t.textMuted} mt-0.5`}>
                    {hoveredComponent.componentNumber}
                  </div>
                </div>
                <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${config?.bgColor} ${config?.color} border ${config?.borderColor}`}>
                  {hoveredComponent.status}
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  <div className={`text-xs ${t.textMuted}`}>类型</div>
                  <div className={`text-xs font-medium ${t.text} truncate`}>
                    {hoveredComponent.stage || '未分类'}
                  </div>

                  <div className={`text-xs ${t.textMuted}`}>版本</div>
                  <div className={`text-xs font-medium ${t.text}`}>
                    {hoveredComponent.version || '-'}
                  </div>

                  <div className={`text-xs ${t.textMuted}`}>生产指令号</div>
                  <div className={`text-xs font-medium ${t.text} truncate`}>
                    {hoveredComponent.productionOrderNumber || '-'}
                  </div>

                  <div className={`text-xs ${t.textMuted}`}>负责人</div>
                  <div className={`text-xs font-medium ${t.text} truncate`}>
                    {hoveredComponent.holder || '-'}
                  </div>

                  {hoveredComponent.borrower && (
                    <>
                      <div className={`text-xs ${t.textMuted}`}>借用人</div>
                      <div className={`text-xs font-medium ${t.text} truncate`}>
                        {hoveredComponent.borrower}
                      </div>
                    </>
                  )}

                  {hoveredComponent.repairOrderNumber && (
                    <>
                      <div className={`text-xs ${t.textMuted}`}>维修单号</div>
                      <div className={`text-xs font-medium ${t.text} truncate`}>
                        {hoveredComponent.repairOrderNumber}
                      </div>
                    </>
                  )}

                  {hoveredComponent.protectionOrderNumber && (
                    <>
                      <div className={`text-xs ${t.textMuted}`}>三防单号</div>
                      <div className={`text-xs font-medium ${t.text} truncate`}>
                        {hoveredComponent.protectionOrderNumber}
                      </div>
                    </>
                  )}

                  {createdTime && (
                    <>
                      <div className={`text-xs ${t.textMuted}`}>创建时间</div>
                      <div className={`text-xs font-medium ${t.text}`}>
                        {new Date(createdTime).toLocaleString('zh-CN', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </>
                  )}

                  {lastLogTime && (
                    <>
                      <div className={`text-xs ${t.textMuted}`}>更新时间</div>
                      <div className={`text-xs font-medium ${t.text}`}>
                        {new Date(lastLogTime).toLocaleString('zh-CN', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </>
                  )}
                </div>

                {hoveredComponent.statusChanges && hoveredComponent.statusChanges.length > 0 && (
                  <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className={`text-xs ${t.textMuted} mb-1.5`}>状态变更历史</div>
                    <div className={`text-xs ${t.text} ${t.emptyBg} rounded-lg p-2 max-h-20 overflow-y-auto space-y-1`}>
                      {hoveredComponent.statusChanges.slice(-3).reverse().map((change: any, idx: number) => (
                        <div key={change.id || idx} className="text-xs">
                          <span className="text-gray-400">{new Date(change.changedAt).toLocaleDateString('zh-CN')}: </span>
                          <span className={t.text}>{change.fromStatus}</span>
                          <span className="text-gray-400"> → </span>
                          <span className={t.text}>{change.toStatus}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {hoveredComponent.logs && hoveredComponent.logs.length > 0 && (
                  <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className={`text-xs ${t.textMuted} mb-1.5`}>最近日志</div>
                    <div className={`text-xs ${t.text} ${t.emptyBg} rounded-lg p-2 max-h-16 overflow-y-auto`}>
                      {hoveredComponent.logs[hoveredComponent.logs.length - 1]?.action || '无'}
                    </div>
                  </div>
                )}

                {hoveredComponent.burnedSoftware && hoveredComponent.burnedSoftware.length > 0 && (
                  <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className={`text-xs ${t.textMuted} mb-1.5`}>烧录软件</div>
                    <div className={`text-xs ${t.text} ${t.emptyBg} rounded-lg p-2`}>
                      {hoveredComponent.burnedSoftware[hoveredComponent.burnedSoftware.length - 1]?.softwareName} ({hoveredComponent.burnedSoftware[hoveredComponent.burnedSoftware.length - 1]?.softwareVersion})
                    </div>
                  </div>
                )}
              </div>

              <div className={`mt-3 pt-2 border-t border-gray-200 dark:border-gray-700 text-center text-xs ${t.textSecondary}`}>
                {canEdit ? (
                  hoveredComponent.status === '未投产' ? '👆 点击卡片编辑投产' : '👆 点击卡片更改状态（需填写原因）'
                ) : (
                  '👁️ 查看组件详情'
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes tooltipFadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
