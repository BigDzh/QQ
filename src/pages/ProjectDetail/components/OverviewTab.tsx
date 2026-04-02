import { useThemeStyles } from '../../../hooks/useThemeStyles';
import { Package, Monitor, FileText, Download } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  stage: string;
  systems: any[];
  modules: any[];
  documents: any[];
  software: any[];
}

interface OverviewTabProps {
  project: Project;
  stats: {
    totalModules: number;
    totalComponents: number;
    normalRate: number;
    faultRate: number;
    documentsCompleted: number;
    documentsTotal: number;
    softwareCompleted: number;
    softwareTotal: number;
    moduleStatusStats: Record<string, number>;
    systemStatusStats: Record<string, number>;
  };
}

export function OverviewTab({ project, stats }: OverviewTabProps) {
  const t = useThemeStyles();

  const statCards = [
    { label: '项目阶段', value: project.stage, icon: FileText, color: 'text-blue-400' },
    { label: '系统总数', value: project.systems.length, icon: Monitor, color: 'text-emerald-400' },
    { label: '模块总数 / 正常率', value: `${stats.totalModules} / ${stats.normalRate}%`, icon: Package, color: 'text-emerald-400' },
    { label: '组件总数 / 故障率', value: `${stats.totalComponents} / ${stats.faultRate}%`, icon: Package, color: 'text-red-400' },
  ];

  const systemStatusColors: Record<string, string> = {
    '正常': 'bg-emerald-500',
    '故障': 'bg-red-500',
    '维修中': 'bg-yellow-500',
    '测试中': 'bg-blue-500',
    '未投产': 'bg-gray-500',
  };

  const moduleStatusColors: Record<string, string> = {
    '正常': 'bg-emerald-500',
    '故障': 'bg-red-500',
    '维修中': 'bg-yellow-500',
    '三防中': 'bg-purple-500',
    '测试中': 'bg-blue-500',
    '仿真中': 'bg-cyan-500',
    '未投产': 'bg-gray-500',
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {statCards.map((card, index) => (
          <div key={index} className={`${t.card} rounded-lg shadow-sm p-6 border ${t.border}`}>
            <div className={`text-sm ${t.textMuted} mb-1`}>{card.label}</div>
            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`${t.card} rounded-xl shadow-md p-6 border ${t.border}`}>
          <h3 className={`text-lg font-semibold ${t.text} mb-4 flex items-center gap-2`}>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            系统状态
          </h3>
          <div className="space-y-3">
            {Object.entries(stats.systemStatusStats).length === 0 ? (
              <p className={`text-sm ${t.textMuted}`}>暂无系统</p>
            ) : (
              Object.entries(stats.systemStatusStats).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${systemStatusColors[status] || 'bg-gray-500'}`} />
                    <span className={`text-sm ${t.text}`}>{status}</span>
                  </div>
                  <span className={`text-sm font-medium ${t.text}`}>{count}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={`${t.card} rounded-xl shadow-md p-6 border ${t.border}`}>
          <h3 className={`text-lg font-semibold ${t.text} mb-4 flex items-center gap-2`}>
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            模块状态
          </h3>
          <div className="space-y-3">
            {Object.entries(stats.moduleStatusStats).length === 0 ? (
              <p className={`text-sm ${t.textMuted}`}>暂无模块</p>
            ) : (
              Object.entries(stats.moduleStatusStats).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${moduleStatusColors[status] || 'bg-gray-500'}`} />
                    <span className={`text-sm ${t.text}`}>{status}</span>
                  </div>
                  <span className={`text-sm font-medium ${t.text}`}>{count}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={`${t.card} rounded-xl shadow-md p-6 border ${t.border}`}>
          <h3 className={`text-lg font-semibold ${t.text} mb-4 flex items-center gap-2`}>
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            文档进度
          </h3>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm ${t.textSecondary}`}>已完成</span>
            <span className={`text-sm font-medium ${t.text}`}>{stats.documentsCompleted} / {stats.documentsTotal}</span>
          </div>
          <div className={`w-full h-2 rounded-full ${t.emptyBg}`}>
            <div
              className="h-2 rounded-full bg-purple-500 transition-all"
              style={{ width: stats.documentsTotal > 0 ? `${(stats.documentsCompleted / stats.documentsTotal) * 100}%` : '0%' }}
            />
          </div>
        </div>

        <div className={`${t.card} rounded-xl shadow-md p-6 border ${t.border}`}>
          <h3 className={`text-lg font-semibold ${t.text} mb-4 flex items-center gap-2`}>
            <span className="w-2 h-2 rounded-full bg-cyan-500" />
            软件进度
          </h3>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm ${t.textSecondary}`}>已完成</span>
            <span className={`text-sm font-medium ${t.text}`}>{stats.softwareCompleted} / {stats.softwareTotal}</span>
          </div>
          <div className={`w-full h-2 rounded-full ${t.emptyBg}`}>
            <div
              className="h-2 rounded-full bg-cyan-500 transition-all"
              style={{ width: stats.softwareTotal > 0 ? `${(stats.softwareCompleted / stats.softwareTotal) * 100}%` : '0%' }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
