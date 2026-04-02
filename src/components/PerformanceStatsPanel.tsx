import { useState } from 'react';
import {
  BarChart3,
  Activity,
  Cpu,
  MemoryStick,
  Trash2,
  Download,
  AlertTriangle,
  CheckCircle,
  Calendar,
  LineChart,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useThemeStyles } from '../hooks/useThemeStyles';
import {
  getStatisticsSummary,
  getDailyStats,
  getPerformanceRecords,
  clearAllStatistics,
} from '../services/performanceStatistics';

interface PerformanceStatsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PerformanceStatsPanel({ isOpen, onClose }: PerformanceStatsPanelProps) {
  const { isDark, isCyberpunk } = useTheme();
  const t = useThemeStyles();
  const [activeTab, setActiveTab] = useState<'summary' | 'daily' | 'history'>('summary');
  const [isExporting, setIsExporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const summary = getStatisticsSummary(7);
  const dailyStats = getDailyStats();
  const recentRecords = getPerformanceRecords(3);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const records = getPerformanceRecords(30);
      const csv = [
        '时间,CPU%,内存%,磁盘%,FPS,网络',
        ...records.map(r =>
          `${new Date(r.timestamp).toISOString()},${r.cpu},${r.memory},${r.disk},${r.fps},${r.networkOnline ? '在线' : '离线'}`
        ),
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `performance_stats_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  const handleClear = () => {
    if (confirm('确定要清除所有历史统计数据吗？此操作不可撤销。')) {
      setIsClearing(true);
      clearAllStatistics();
      setTimeout(() => setIsClearing(false), 500);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const formatDateTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const MiniBarChart = ({ value, max = 100, color }: { value: number; max?: number; color: string }) => {
    const height = (value / max) * 100;
    return (
      <div className="w-8 flex flex-col items-center">
        <div className="w-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex flex-col-reverse">
          <div
            className={`${color} rounded-full transition-all`}
            style={{ height: `${height}%` }}
          />
        </div>
        <span className="text-xs mt-1 font-medium text-gray-600 dark:text-gray-400">{value}</span>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className={`w-full max-w-2xl max-h-[85vh] rounded-xl shadow-2xl ${t.card} ${t.border} flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between px-5 py-4 border-b ${t.border}`}>
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className={isCyberpunk ? 'text-cyan-400' : 'text-blue-500'} />
            <h2 className={`font-semibold ${t.text}`}>性能统计</h2>
            <span className="text-xs text-gray-500">最近7天</span>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
          >
            ✕
          </button>
        </div>

        <div className={`flex border-b ${t.border}`}>
          {(['summary', 'daily', 'history'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'text-cyan-500 border-b-2 border-cyan-500'
                  : `${t.textSecondary} hover:text-gray-700 dark:hover:text-gray-300`
              }`}
            >
              {tab === 'summary' && '概览'}
              {tab === 'daily' && '每日'}
              {tab === 'history' && '历史'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'summary' && (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-3">
                <StatCard
                  icon={<Cpu size={16} className="text-red-500" />}
                  label="平均CPU"
                  value={`${summary.avgCpu}%`}
                  sub={isCyberpunk ? `峰值 ${summary.peakCpu}%` : undefined}
                  trend={summary.avgCpu > 70 ? 'high' : summary.avgCpu > 40 ? 'medium' : 'low'}
                />
                <StatCard
                  icon={<MemoryStick size={16} className="text-orange-500" />}
                  label="平均内存"
                  value={`${summary.avgMemory}%`}
                  sub={isCyberpunk ? `峰值 ${summary.peakMemory}%` : undefined}
                  trend={summary.avgMemory > 80 ? 'high' : summary.avgMemory > 50 ? 'medium' : 'low'}
                />
                <StatCard
                  icon={<Activity size={16} className="text-green-500" />}
                  label="平均FPS"
                  value={summary.avgFps.toString()}
                  sub={isCyberpunk ? `最低 ${summary.lowestFps}` : undefined}
                  trend={summary.avgFps > 50 ? 'low' : summary.avgFps > 30 ? 'medium' : 'high'}
                />
              </div>

              <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle size={14} className="text-green-500" />
                  <span className={`text-sm font-medium ${t.text}`}>统计数据</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between">
                    <span className={t.textSecondary}>总记录数</span>
                    <span className={t.text}>{summary.totalRecords} 条</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={t.textSecondary}>告警天数</span>
                    <span className={t.text}>{summary.alertDays} 天</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={t.textSecondary}>采样周期</span>
                    <span className={t.text}>5分钟</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={t.textSecondary}>存储天数</span>
                    <span className={t.text}>30天</span>
                  </div>
                </div>
              </div>

              {summary.alertDays > 0 && (
                <div className={`p-4 rounded-xl ${isDark ? 'bg-amber-900/20 border border-amber-800' : 'bg-amber-50 border border-amber-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={14} className="text-amber-500" />
                    <span className={`text-sm font-medium ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                      性能告警提醒
                    </span>
                  </div>
                  <p className={`text-xs ${isDark ? 'text-amber-300' : 'text-amber-600'}`}>
                    过去7天有 {summary.alertDays} 天出现性能告警。建议检查是否有后台进程占用资源。
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'daily' && (
            <div className="space-y-3">
              {dailyStats.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Calendar size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">暂无每日统计数据</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {dailyStats.map((day) => {
                    const dayOfWeek = ['日', '一', '二', '三', '四', '五', '六'][new Date(day.date).getDay()];
                    return (
                      <div
                        key={day.date}
                        className={`p-3 rounded-lg ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100'} transition-colors`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-gray-400" />
                            <span className={`text-sm font-medium ${t.text}`}>
                              {formatDate(day.date)}
                            </span>
                            <span className="text-xs text-gray-500">周{dayOfWeek}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            {day.alertCount > 0 && (
                              <span className="flex items-center gap-1 text-amber-500">
                                <AlertTriangle size={12} /> {day.alertCount}次
                              </span>
                            )}
                            <span className={t.textSecondary}>{day.recordCount}条</span>
                          </div>
                        </div>
                        <div className="flex items-end gap-4">
                          <div className="flex flex-col items-center">
                            <MiniBarChart value={Math.round(day.avgCpu)} color="bg-red-400" />
                            <span className="text-xs text-gray-500 mt-1">CPU</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <MiniBarChart value={Math.round(day.avgMemory)} color="bg-orange-400" />
                            <span className="text-xs text-gray-500 mt-1">内存</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <MiniBarChart value={Math.round(day.avgDisk)} color="bg-purple-400" />
                            <span className="text-xs text-gray-500 mt-1">磁盘</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <MiniBarChart value={day.avgFps} max={60} color="bg-green-400" />
                            <span className="text-xs text-gray-500 mt-1">FPS</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3">
              {recentRecords.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <LineChart size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">暂无历史记录</p>
                </div>
              ) : (
                <div className={`rounded-lg border ${t.border} overflow-hidden`}>
                  <table className="w-full text-xs">
                    <thead className={isDark ? 'bg-gray-800' : 'bg-gray-50'}>
                      <tr>
                        <th className={`px-3 py-2 text-left ${t.text}`}>时间</th>
                        <th className={`px-3 py-2 text-right ${t.text}`}>CPU</th>
                        <th className={`px-3 py-2 text-right ${t.text}`}>内存</th>
                        <th className={`px-3 py-2 text-right ${t.text}`}>磁盘</th>
                        <th className={`px-3 py-2 text-right ${t.text}`}>FPS</th>
                        <th className={`px-3 py-2 text-right ${t.text}`}>网络</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {recentRecords.slice(0, 50).map((record, index) => (
                        <tr
                          key={record.timestamp}
                          className={index % 2 === 0 ? (isDark ? 'bg-white/[0.02]' : 'bg-gray-50/50') : ''}
                        >
                          <td className={`px-3 py-2 ${t.text}`}>
                            {formatDateTime(record.timestamp)}
                          </td>
                          <td className={`px-3 py-2 text-right ${record.cpu >= 85 ? 'text-red-500 font-medium' : t.textSecondary}`}>
                            {record.cpu}%
                          </td>
                          <td className={`px-3 py-2 text-right ${record.memory >= 85 ? 'text-orange-500 font-medium' : t.textSecondary}`}>
                            {record.memory}%
                          </td>
                          <td className={`px-3 py-2 text-right ${t.textSecondary}`}>
                            {record.disk}%
                          </td>
                          <td className={`px-3 py-2 text-right ${record.fps < 30 ? 'text-red-500 font-medium' : t.textSecondary}`}>
                            {record.fps}
                          </td>
                          <td className={`px-3 py-2 text-right`}>
                            <span className={record.networkOnline ? 'text-green-500' : 'text-gray-400'}>
                              {record.networkOnline ? '●' : '○'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={`flex items-center justify-between px-5 py-3 border-t ${t.border}`}>
          <button
            onClick={handleClear}
            disabled={isClearing}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              isDark
                ? 'text-red-400 hover:bg-red-500/20'
                : 'text-red-600 hover:bg-red-50'
            }`}
          >
            <Trash2 size={14} />
            {isClearing ? '清除中...' : '清除数据'}
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              isCyberpunk
                ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
                : isDark
                  ? 'bg-white/10 text-white hover:bg-white/20'
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
            }`}
          >
            <Download size={14} />
            {isExporting ? '导出中...' : '导出CSV'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  trend?: 'high' | 'medium' | 'low';
}

function StatCard({ icon, label, value, sub, trend = 'low' }: StatCardProps) {
  const { isDark } = useTheme();
  const t = useThemeStyles();

  const trendColors = {
    high: 'text-red-500',
    medium: 'text-yellow-500',
    low: 'text-green-500',
  };

  const trendBgColors = {
    high: isDark ? 'bg-red-900/30' : 'bg-red-50',
    medium: isDark ? 'bg-yellow-900/30' : 'bg-yellow-50',
    low: isDark ? 'bg-green-900/30' : 'bg-green-50',
  };

  return (
    <div className={`p-4 rounded-xl ${trendBgColors[trend]}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className={`text-xs ${t.textSecondary}`}>{label}</span>
      </div>
      <div className={`text-2xl font-bold ${trendColors[trend]}`}>{value}</div>
      {sub && <div className={`text-xs ${t.textSecondary} mt-1`}>{sub}</div>}
    </div>
  );
}
