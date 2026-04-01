import { useState, useEffect, useCallback, useRef } from 'react';
import {
  addPerformanceRecord,
  getPerformanceRecords,
  getDailyStats,
  getStatisticsSummary,
  clearAllStatistics,
  getStatisticsConfig,
  saveStatisticsConfig,
  type PerformanceRecord,
  type DailyStats,
  type StatisticsConfig,
} from '../services/performanceStatistics';

const SAMPLING_INTERVAL = 5 * 60 * 1000;

export function usePerformanceStatistics() {
  const [isEnabled, setIsEnabled] = useState(() => getStatisticsConfig().enabled);
  const [summary, setSummary] = useState(() => getStatisticsSummary(7));
  const [dailyStats, setDailyStats] = useState<DailyStats[]>(() => getDailyStats());
  const [recentRecords, setRecentRecords] = useState<PerformanceRecord[]>(() => getPerformanceRecords(1));
  const lastSampleTime = useRef<number>(0);

  const recordMetrics = useCallback(
    (metrics: { cpu: number; memory: number; disk: number; fps: number; networkOnline: boolean }) => {
      if (!isEnabled) return;

      const now = Date.now();
      if (now - lastSampleTime.current < SAMPLING_INTERVAL) return;

      lastSampleTime.current = now;
      addPerformanceRecord(metrics);
      setSummary(getStatisticsSummary(7));
      setDailyStats(getDailyStats());
      setRecentRecords(getPerformanceRecords(1));
    },
    [isEnabled]
  );

  const toggleEnabled = useCallback(() => {
    const newEnabled = !isEnabled;
    setIsEnabled(newEnabled);
    saveStatisticsConfig({ enabled: newEnabled });
  }, [isEnabled]);

  const refresh = useCallback(() => {
    setSummary(getStatisticsSummary(7));
    setDailyStats(getDailyStats());
    setRecentRecords(getPerformanceRecords(1));
  }, []);

  const clear = useCallback(() => {
    clearAllStatistics();
    setSummary(getStatisticsSummary(7));
    setDailyStats(getDailyStats());
    setRecentRecords(getPerformanceRecords(1));
  }, []);

  useEffect(() => {
    const interval = setInterval(refresh, 60000);
    return () => clearInterval(interval);
  }, [refresh]);

  return {
    isEnabled,
    summary,
    dailyStats,
    recentRecords,
    recordMetrics,
    toggleEnabled,
    refresh,
    clear,
  };
}
