import { useState, useEffect, useCallback } from 'react';
import {
  startMemoryMonitoring,
  stopMemoryMonitoring,
  getPerformanceReport,
  checkForMemoryLeaks,
} from '../utils/memoryMonitor';

interface PerformanceDashboardWindow extends Window {
  openPerformanceDashboard?: () => void;
}

interface PerformanceDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PerformanceDashboard({ isOpen, onClose }: PerformanceDashboardProps) {
  const [report, setReport] = useState<ReturnType<typeof getPerformanceReport> | null>(null);
  const [leakCheck, setLeakCheck] = useState<ReturnType<typeof checkForMemoryLeaks> | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval] = useState(5000);

  useEffect(() => {
    if (isOpen) {
      startMemoryMonitoring(refreshInterval);
      updateData();

      let intervalId: ReturnType<typeof setInterval> | null = null;
      if (autoRefresh) {
        intervalId = setInterval(updateData, refreshInterval);
      }

      return () => {
        if (intervalId) clearInterval(intervalId);
        stopMemoryMonitoring();
      };
    } else {
      stopMemoryMonitoring();
    }
  }, [isOpen, autoRefresh, refreshInterval]);

  const updateData = useCallback(() => {
    try {
      const newReport = getPerformanceReport();
      setReport(newReport);
      
      const leakResult = checkForMemoryLeaks();
      setLeakCheck(leakResult);
    } catch (error) {
      console.error('Failed to fetch performance data:', error);
    }
  }, []);

  if (!isOpen || !report) return null;

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'normal': return '#4caf50';
      case 'warning': return '#ff9800';
      case 'critical': return '#f44336';
      default: return '#999';
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        maxWidth: '900px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f5f5f5',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>
              📊 性能监控面板
            </h2>
            <p style={{ margin: '4px 0 0', color: '#666', fontSize: '14px' }}>
              实时性能指标与内存使用情况
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              <span style={{ fontSize: '14px' }}>自动刷新</span>
            </label>

            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#666',
                padding: '4px 8px',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          {/* Summary Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
          }}>
            <MetricCard
              title="当前内存"
              value={`${formatBytes(report.summary.currentMemoryMB * 1024 * 1024)}`}
              status={report.summary.currentMemoryMB > 100 ? 'warning' : 'normal'}
            />
            
            <MetricCard
              title="平均内存"
              value={`${formatBytes(report.summary.averageMemoryMB * 1024 * 1024)}`}
              status="normal"
            />
            
            <MetricCard
              title="峰值内存"
              value={`${formatBytes(report.summary.peakMemoryMB * 1024 * 1024)}`}
              status={report.summary.peakMemoryMB > 120 ? 'warning' : 'normal'}
            />
            
            <MetricCard
              title="监控时长"
              value={report.summary.monitoringDuration}
              status="normal"
            />
          </div>

          {/* Memory Leak Detection */}
          {leakCheck && (
            <div style={{
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '24px',
              border: `1px solid ${leakCheck.isLeaking ? '#ff9800' : '#4caf50'}`,
              background: leakCheck.isLeaking ? '#fff3e0' : '#e8f5e9',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '18px' }}>
                  {leakCheck.isLeaking ? '⚠️' : '✅'}
                </span>
                <strong>{leakCheck.isLeaking ? '检测到内存泄漏风险' : '内存状态正常'}</strong>
              </div>
              
              {leakCheck.isLeaking && (
                <p style={{ margin: '4px 0 0', color: '#666', fontSize: '14px' }}>
                  泄漏速率: {formatBytes(leakCheck.leakRate)}/s | 置信度: {leakCheck.confidence.toFixed(1)}%
                </p>
              )}
              
              {!leakCheck.isLeaking && (
                <p style={{ margin: '4px 0 0', color: '#666', fontSize: '14px' }}>
                  未检测到明显的内存泄漏迹象
                </p>
              )}
            </div>
          )}

          {/* Detailed Metrics */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 600 }}>
              详细指标
            </h3>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '12px',
            }}>
              {report.metrics.map((metric, index) => (
                <div key={index} style={{
                  padding: '12px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '6px',
                  background: '#fafafa',
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '4px',
                  }}>
                    <span style={{ fontWeight: 500, color: '#333' }}>
                      {metric.name}
                    </span>
                    <span style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: getStatusColor(metric.status),
                    }} />
                  </div>
                  
                  <div style={{ fontSize: '20px', fontWeight: 600, color: '#1976d2' }}>
                    {metric.name.includes('Count') || metric.name === 'componentCount'
                      ? metric.value
                      : formatBytes(metric.value)
                    }
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '4px',
                    fontSize: '12px',
                    color: '#999',
                  }}>
                    <span>趋势: {metric.trend === 'up' ? '↑' : metric.trend === 'down' ? '↓': '→'}</span>
                    <span>阈值: {metric.name.includes('Count') 
                      ? `${metric.threshold}`
                      : formatBytes(metric.threshold)
                    }</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          {report.recommendations.length > 0 && (
            <div>
              <h3 style={{ margin: '0 0 12px', fontSize: '18px', fontWeight: 600 }}>
                💡 优化建议 ({report.recommendations.length})
              </h3>
              
              <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
              }}>
                {report.recommendations.map((rec, index) => (
                  <li key={index} style={{
                    padding: '10px 12px',
                    marginBottom: '8px',
                    background: '#fff3cd',
                    borderLeft: '3px solid #ffc107',
                    borderRadius: '4px',
                    fontSize: '14px',
                    lineHeight: 1.5,
                  }}>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f5f5f5',
        }}>
          <div style={{ fontSize: '13px', color: '#999' }}>
            最后更新: {new Date().toLocaleTimeString()}
          </div>
          
          <button
            onClick={updateData}
            style={{
              padding: '8px 20px',
              background: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            🔄 刷新数据
          </button>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  status,
}: {
  title: string;
  value: string;
  status: 'normal' | 'warning' | 'critical';
}) {
  const colors = {
    normal: { bg: '#e8f5e9', border: '#4caf50' },
    warning: { bg: '#fff3e0', border: '#ff9800' },
    critical: { bg: '#ffebee', border: '#f44336' },
  };

  return (
    <div style={{
      padding: '16px',
      borderRadius: '8px',
      background: colors[status].bg,
      borderLeft: `4px solid ${colors[status].border}`,
    }}>
      <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>
        {title}
      </div>
      <div style={{ fontSize: '22px', fontWeight: 600, color: '#333' }}>
        {value}
      </div>
    </div>
  );
}

// Hook for easy integration
export function usePerformanceMonitor() {
  const [isOpen, setIsOpen] = useState(false);

  const openMonitor = useCallback(() => setIsOpen(true), []);
  const closeMonitor = useCallback(() => setIsOpen(false), []);

  const PerformancePanel = useCallback(
    () => (
      <PerformanceDashboard isOpen={isOpen} onClose={closeMonitor} />
    ),
    [isOpen, closeMonitor]
  );

  return {
    isOpen,
    openMonitor,
    closeMonitor,
    PerformancePanel,
  };
}

// Global shortcut to open dashboard (Ctrl+Shift+P)
if (typeof window !== 'undefined') {
  (window as PerformanceDashboardWindow).openPerformanceDashboard = () => {
    // This can be connected to a global state management solution
    console.log('[Performance Monitor] Dashboard requested');
  };
}

export default PerformanceDashboard;
