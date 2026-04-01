import React from 'react';
import { X, Database, Clock, HardDrive } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useThemeStyles } from '../../hooks/useThemeStyles';
import { useBackupReminder } from '../../hooks/useBackupReminder';

interface BackupReminderToastProps {
  onBackup?: () => void;
}

export function BackupReminderToast({ onBackup }: BackupReminderToastProps) {
  const { theme, isDark, isCyberpunk } = useTheme();
  const t = useThemeStyles();
  const { shouldRemind, timeSinceLastBackup, triggerBackup, dismissReminder } =
    useBackupReminder({
      checkInterval: 60000,
      enabled: true,
    });

  const handleBackup = async () => {
    const success = await triggerBackup();
    if (success) {
      onBackup?.();
    }
  };

  if (!shouldRemind) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-[var(--z-toast)]">
      <div
        className={`flex items-start gap-4 px-5 py-4 rounded-2xl border shadow-2xl backdrop-blur-md animate-slide-in ${
          isCyberpunk
            ? 'bg-amber-500/10 border-amber-400/30'
            : isDark
            ? 'bg-amber-500/10 border-amber-500/30'
            : 'bg-amber-50 border-amber-200'
        }`}
      >
        <div
          className={`p-2 rounded-xl ${
            isCyberpunk ? 'bg-amber-500/20' : 'bg-amber-100'
          }`}
        >
          <Database
            size={20}
            className={
              isCyberpunk ? 'text-amber-400' : isDark ? 'text-amber-400' : 'text-amber-600'
            }
          />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-semibold ${t.text} mb-1`}>备份提醒</h4>
          <div className={`flex items-center gap-2 text-xs ${t.textSecondary}`}>
            <Clock size={12} />
            <span>距离上次备份: {timeSinceLastBackup}</span>
          </div>
          <div className={`flex items-center gap-2 text-xs mt-1 ${t.textSecondary}`}>
            <HardDrive size={12} />
            <span>建议定期备份以保护数据安全</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={handleBackup}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              isCyberpunk
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90'
                : isDark
                ? 'bg-amber-600 text-white hover:bg-amber-500'
                : 'bg-amber-500 text-white hover:bg-amber-600'
            }`}
          >
            立即备份
          </button>
          <button
            onClick={dismissReminder}
            className={`p-2 rounded-lg text-xs transition-colors ${
              isCyberpunk
                ? 'text-amber-400 hover:bg-amber-500/10'
                : isDark
                ? 'text-amber-400 hover:bg-amber-500/10'
                : 'text-amber-600 hover:bg-amber-100'
            }`}
          >
            稍后提醒
          </button>
        </div>

        <button
          onClick={dismissReminder}
          className={`p-1 rounded-lg transition-colors ${
            isCyberpunk
              ? 'text-amber-400 hover:bg-amber-500/10'
              : isDark
              ? 'text-gray-400 hover:bg-white/5'
              : 'text-gray-400 hover:bg-gray-100'
          }`}
          aria-label="关闭"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

export default BackupReminderToast;