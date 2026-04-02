import { useThemeStyles } from '../../../hooks/useThemeStyles';

export type TabId = 'overview' | 'systems' | 'modules' | 'components' | 'design' | 'reviews' | 'logs' | 'documents' | 'software';

interface Tab {
  id: TabId;
  label: string;
}

interface TabNavigationProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const t = useThemeStyles();

  const tabs: Tab[] = [
    { id: 'overview', label: '概览' },
    { id: 'systems', label: '系统管理' },
    { id: 'modules', label: '模块管理' },
    { id: 'components', label: '组件管理' },
    { id: 'design', label: '设计管理' },
    { id: 'reviews', label: '评审管理' },
    { id: 'software', label: '软件管理' },
    { id: 'documents', label: '文档管理' },
    { id: 'logs', label: '项目日志' },
  ];

  return (
    <div className={`flex gap-2 mb-6 border-b ${t.border}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-2 -mb-px border-b-2 transition ${
            activeTab === tab.id
              ? `border-cyan-500 ${t.text}`
              : `border-transparent ${t.textSecondary} hover:${t.text}`
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export default TabNavigation;
