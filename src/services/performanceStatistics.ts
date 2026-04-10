export interface PerformanceRecord {
  timestamp: number;
  cpu: number;
  memory: number;
  disk: number;
  fps: number;
  networkOnline: boolean;
}

export interface DailyStats {
  date: string;
  avgCpu: number;
  avgMemory: number;
  avgDisk: number;
  avgFps: number;
  maxCpu: number;
  maxMemory: number;
  maxDisk: number;
  minFps: number;
  recordCount: number;
  alertCount: number;
}

export interface StatisticsConfig {
  maxRecordsPerDay: number;
  maxStorageDays: number;
  samplingInterval: number;
  enabled: boolean;
}

const DEFAULT_CONFIG: StatisticsConfig = {
  maxRecordsPerDay: 288,
  maxStorageDays: 30,
  samplingInterval: 300000,
  enabled: true,
};

const STORAGE_KEY_RECORDS = 'performance_records';
const STORAGE_KEY_CONFIG = 'performance_stats_config';
const STORAGE_KEY_DAILY_STATS = 'performance_daily_stats';

export function getStatisticsConfig(): StatisticsConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (stored) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
    }
  } catch {
    logger.warn('Failed to load statistics config');
  }
  return DEFAULT_CONFIG;
}

export function saveStatisticsConfig(config: Partial<StatisticsConfig>): void {
  try {
    const current = getStatisticsConfig();
    const updated = { ...current, ...config };
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(updated));
  } catch {
    logger.warn('Failed to save statistics config');
  }
}

export function addPerformanceRecord(record: Omit<PerformanceRecord, 'timestamp'>): void {
  const config = getStatisticsConfig();
  if (!config.enabled) return;

  try {
    const fullRecord: PerformanceRecord = {
      ...record,
      timestamp: Date.now(),
    };

    const records = getPerformanceRecords();
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = records.filter(r => {
      const recordDate = new Date(r.timestamp).toISOString().split('T')[0];
      return recordDate === today;
    });

    if (todayRecords.length >= config.maxRecordsPerDay) {
      const oldestIndex = records.findIndex(r => {
        const recordDate = new Date(r.timestamp).toISOString().split('T')[0];
        return recordDate === today;
      });
      if (oldestIndex !== -1) {
        records.splice(oldestIndex, 1);
      }
    }

    records.push(fullRecord);

    const recordsToKeep = records.filter(r => {
      const recordDate = new Date(r.timestamp);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - config.maxStorageDays);
      return recordDate >= cutoff;
    });

    localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(recordsToKeep));

    updateDailyStats(fullRecord);
  } catch (error) {
    logger.warn('Failed to add performance record:', error);
  }
}

export function getPerformanceRecords(days: number = 1): PerformanceRecord[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_RECORDS);
    if (!stored) return [];

    const records: PerformanceRecord[] = JSON.parse(stored);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return records.filter(r => new Date(r.timestamp) >= cutoff);
  } catch {
    return [];
  }
}

export function getAllRecords(): PerformanceRecord[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_RECORDS);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

function updateDailyStats(record: PerformanceRecord): void {
  try {
    const stats = getDailyStats();
    const date = new Date(record.timestamp).toISOString().split('T')[0];

    let dayStats = stats.find(s => s.date === date);

    if (!dayStats) {
      dayStats = {
        date,
        avgCpu: 0,
        avgMemory: 0,
        avgDisk: 0,
        avgFps: 0,
        maxCpu: 0,
        maxMemory: 0,
        maxDisk: 0,
        minFps: 60,
        recordCount: 0,
        alertCount: 0,
      };
      stats.push(dayStats);
    }

    const count = dayStats.recordCount;
    dayStats.avgCpu = (dayStats.avgCpu * count + record.cpu) / (count + 1);
    dayStats.avgMemory = (dayStats.avgMemory * count + record.memory) / (count + 1);
    dayStats.avgDisk = (dayStats.avgDisk * count + record.disk) / (count + 1);
    dayStats.avgFps = (dayStats.avgFps * count + record.fps) / (count + 1);
    dayStats.maxCpu = Math.max(dayStats.maxCpu, record.cpu);
    dayStats.maxMemory = Math.max(dayStats.maxMemory, record.memory);
    dayStats.maxDisk = Math.max(dayStats.maxDisk, record.disk);
    dayStats.minFps = Math.min(dayStats.minFps, record.fps);
    dayStats.recordCount++;

    let alertCount = 0;
    if (record.cpu >= 85 || record.memory >= 85 || record.disk >= 90 || record.fps < 30) {
      alertCount = 1;
    }
    dayStats.alertCount += alertCount;

    const trimmedStats = stats
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 30);

    localStorage.setItem(STORAGE_KEY_DAILY_STATS, JSON.stringify(trimmedStats));
  } catch (error) {
    logger.warn('Failed to update daily stats:', error);
  }
}

export function getDailyStats(): DailyStats[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_DAILY_STATS);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function clearAllStatistics(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_RECORDS);
    localStorage.removeItem(STORAGE_KEY_DAILY_STATS);
  } catch {
    logger.warn('Failed to clear statistics');
  }
}

export function getStatisticsSummary(days: number = 7): {
  totalRecords: number;
  avgCpu: number;
  avgMemory: number;
  avgFps: number;
  alertDays: number;
  peakCpu: number;
  peakMemory: number;
  lowestFps: number;
} {
  const records = getPerformanceRecords(days);

  if (records.length === 0) {
    return {
      totalRecords: 0,
      avgCpu: 0,
      avgMemory: 0,
      avgFps: 0,
      alertDays: 0,
      peakCpu: 0,
      peakMemory: 0,
      lowestFps: 0,
    };
  }

  const sum = records.reduce(
    (acc, r) => ({
      cpu: acc.cpu + r.cpu,
      memory: acc.memory + r.memory,
      fps: acc.fps + r.fps,
    }),
    { cpu: 0, memory: 0, fps: 0 }
  );

  const alertRecords = records.filter(
    r => r.cpu >= 85 || r.memory >= 85 || r.disk >= 90 || r.fps < 30
  );

  const dailyAlerts = new Set(
    alertRecords.map(r => new Date(r.timestamp).toISOString().split('T')[0])
  );

  return {
    totalRecords: records.length,
    avgCpu: Math.round(sum.cpu / records.length),
    avgMemory: Math.round(sum.memory / records.length),
    avgFps: Math.round(sum.fps / records.length),
    alertDays: dailyAlerts.size,
    peakCpu: Math.max(...records.map(r => r.cpu)),
    peakMemory: Math.max(...records.map(r => r.memory)),
    lowestFps: Math.min(...records.map(r => r.fps)),
  };
}
