import { FileText } from 'lucide-react';
import { useThemeStyles } from '../../../hooks/useThemeStyles';

interface ProjectLog {
  id: string;
  timestamp: string;
  username: string;
  action: string;
  details?: string;
}

interface ProjectLogsProps {
  logs: ProjectLog[];
}

export function ProjectLogs({ logs }: ProjectLogsProps) {
  const t = useThemeStyles();

  if (!logs || logs.length === 0) {
    return (
      <div className={`text-center py-12 ${t.card} rounded-lg border ${t.border}`}>
        <FileText className={`mx-auto ${t.textMuted} mb-4`} size={48} />
        <p className={t.textMuted}>暂无日志</p>
      </div>
    );
  }

  return (
    <div className={`${t.card} rounded-lg shadow-sm overflow-hidden border ${t.border}`}>
      <table className="w-full">
        <thead className={t.tableHeader}>
          <tr>
            <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>时间</th>
            <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>用户</th>
            <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>操作</th>
            <th className={`px-4 py-3 text-left text-sm font-medium ${t.textSecondary}`}>详情</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className={`border-t ${t.border} ${t.hoverBg}`}>
              <td className={`px-4 py-3 ${t.textSecondary}`}>{log.timestamp}</td>
              <td className={`px-4 py-3 ${t.text}`}>{log.username}</td>
              <td className={`px-4 py-3 ${t.text}`}>{log.action}</td>
              <td className={`px-4 py-3 ${t.textSecondary}`}>{log.details || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ProjectLogs;
