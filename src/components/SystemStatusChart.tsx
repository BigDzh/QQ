import type { Component, ComponentStatus } from '../types';

interface SystemStatusChartProps {
  components: Component[];
}

const STATUS_COLORS: Record<ComponentStatus, string> = {
  '正常': '#10b981',
  '故障': '#ef4444',
  '维修中': '#f97316',
  '三防中': '#a855f7',
  '测试中': '#eab308',
  '仿真中': '#06b6d4',
  '借用中': '#3b82f6',
  '投产中': '#3b82f6',
  '未投产': '#6b7280',
};

export default function SystemStatusChart({ components }: SystemStatusChartProps) {
  const getStatusStats = () => {
    const stats: Record<ComponentStatus, number> = {} as Record<ComponentStatus, number>;
    components.forEach(c => {
      stats[c.status] = (stats[c.status] || 0) + 1;
    });
    return stats;
  };

  const stats = getStatusStats();
  const total = components.length;

  const getArcPath = (startAngle: number, endAngle: number, outerRadius: number, innerRadius: number) => {
    const startOuter = {
      x: 50 + outerRadius * Math.cos(startAngle),
      y: 50 + outerRadius * Math.sin(startAngle),
    };
    const endOuter = {
      x: 50 + outerRadius * Math.cos(endAngle),
      y: 50 + outerRadius * Math.sin(endAngle),
    };
    const startInner = {
      x: 50 + innerRadius * Math.cos(endAngle),
      y: 50 + innerRadius * Math.sin(endAngle),
    };
    const endInner = {
      x: 50 + innerRadius * Math.cos(startAngle),
      y: 50 + innerRadius * Math.sin(startAngle),
    };

    const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;

    return `M ${startOuter.x} ${startOuter.y} A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${endOuter.x} ${endOuter.y} L ${startInner.x} ${startInner.y} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${endInner.x} ${endInner.y} Z`;
  };

  const outerRadius = 9;
  const innerRadius = 5;

  let currentAngle = -Math.PI / 2;
  const arcs: { path: string; color: string }[] = [];

  Object.entries(stats).forEach(([status, count]) => {
    if (count > 0 && total > 0) {
      const angleSpan = (count / total) * 2 * Math.PI;
      const endAngle = currentAngle + angleSpan;
      const path = getArcPath(currentAngle, endAngle, outerRadius, innerRadius);
      arcs.push({
        path,
        color: STATUS_COLORS[status as ComponentStatus] || '#6b7280',
      });
      currentAngle = endAngle;
    }
  });

  if (total === 0) {
    return (
      <svg width="18" height="18" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={outerRadius} fill="none" stroke="#e5e7eb" strokeWidth="10" />
      </svg>
    );
  }

  return (
    <svg width="18" height="18" viewBox="0 0 100 100">
      {arcs.map((arc, index) => (
        <path
          key={index}
          d={arc.path}
          fill={arc.color}
        />
      ))}
    </svg>
  );
}
