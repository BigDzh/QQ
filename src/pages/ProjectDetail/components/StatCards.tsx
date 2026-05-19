import { FileText, Monitor, Package } from 'lucide-react';
import { useThemeStyles } from '../../../hooks/useThemeStyles';

interface StatCardsProps {
  projectStage: string;
  systemCount: number;
  totalModules: number;
  normalRate: number;
  totalComponents: number;
  faultRate: number;
}

export function StatCards({
  projectStage,
  systemCount,
  totalModules,
  normalRate,
  totalComponents,
  faultRate,
}: StatCardsProps) {
  const t = useThemeStyles();

  const statCards = [
    { label: '项目阶段', value: projectStage, icon: FileText, color: 'text-blue-400' },
    { label: '系统总数', value: systemCount, icon: Monitor, color: 'text-emerald-400' },
    { label: '模块总数 / 正常率', value: `${totalModules} / ${normalRate}%`, icon: Package, color: 'text-emerald-400' },
    { label: '组件总数 / 故障率', value: `${totalComponents} / ${faultRate}%`, icon: Package, color: 'text-red-400' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {statCards.map((card, index) => (
        <div key={index} className={`${t.card} rounded-lg shadow-sm p-6 border ${t.border}`}>
          <div className={`text-sm ${t.textMuted} mb-1`}>{card.label}</div>
          <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
        </div>
      ))}
    </div>
  );
}

export default StatCards;
