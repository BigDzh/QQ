import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Settings, RotateCcw, Cpu, MemoryStick, HardDrive, Activity, AlertTriangle } from 'lucide-react';
import { getAlertConfig, saveAlertConfig, type AlertConfig, type AlertThreshold } from '../hooks/usePerformanceAlert';
import { useTheme } from '../context/ThemeContext';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { usePerformanceMode } from '../context/PerformanceModeContext';

interface AlertConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigChange?: (config: AlertConfig) => void;
}

const defaultThresholds: AlertThreshold = {
  cpu: 85,
  memory: 85,
  disk: 90,
  fps: 30,
};

export function AlertConfigPanel({ isOpen, onClose, onConfigChange }: AlertConfigPanelProps) {
  const { isDark, isCyberpunk } = useTheme();
  const t = useThemeStyles();
  const { isHighPerformance, setMode } = usePerformanceMode();
  const [config, setConfig] = useState<AlertConfig>(() => getAlertConfig());

  useEffect(() => {
    if (isOpen) {
      setConfig(getAlertConfig());
    }
  }, [isOpen]);

  const handleToggle = () => {
    const newConfig = { ...config, enabled: !config.enabled };
    setConfig(newConfig);
    saveAlertConfig(newConfig);
    onConfigChange?.(newConfig);
  };

  const handleThresholdChange = (key: keyof AlertThreshold, value: number) => {
    const newConfig = {
      ...config,
      thresholds: { ...config.thresholds, [key]: value },
    };
    setConfig(newConfig);
    saveAlertConfig(newConfig);
    onConfigChange?.(newConfig);
  };

  const handleCooldownChange = (value: number) => {
    const newConfig = { ...config, cooldown: value };
    setConfig(newConfig);
    saveAlertConfig(newConfig);
    onConfigChange?.(newConfig);
  };

  const handleAutoLowToggle = () => {
    const newConfig = { ...config, autoLowPerformance: !config.autoLowPerformance };
    setConfig(newConfig);
    saveAlertConfig(newConfig);
    onConfigChange?.(newConfig);
    if (!config.autoLowPerformance && isHighPerformance) {
      setMode('low');
    }
  };

  const handleReset = () => {
    const defaultConfig: AlertConfig = {
      enabled: true,
      thresholds: defaultThresholds,
      cooldown: 30000,
      autoLowPerformance: false,
    };
    setConfig(defaultConfig);
    saveAlertConfig(defaultConfig);
    onConfigChange?.(defaultConfig);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className={`w-full max-w-md rounded-xl shadow-2xl ${t.card} ${t.border}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between px-5 py-4 border-b ${t.border}`}>
          <div className="flex items-center gap-2">
            <Bell size={18} className={isCyberpunk ? 'text-cyan-400' : 'text-amber-500'} />
            <h2 className={`font-semibold ${t.text}`}>性能告警设置</h2>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {config.enabled ? (
                <Bell size={16} className="text-green-500" />
              ) : (
                <BellOff size={16} className="text-gray-400" />
              )}
              <span className={`text-sm font-medium ${t.text}`}>启用告警</span>
            </div>
            <button
              onClick={handleToggle}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                config.enabled
                  ? 'bg-green-500'
                  : isDark
                    ? 'bg-gray-600'
                    : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  config.enabled ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {config.enabled && (
            <>
              <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Settings size={14} className="text-gray-400" />
                  <span className={`text-xs font-medium ${t.textSecondary}`}>告警阈值</span>
                </div>

                <div className="space-y-4">
                  <ThresholdSlider
                    icon={<Cpu size={14} />}
                    label="CPU使用率"
                    value={config.thresholds.cpu}
                    min={50}
                    max={100}
                    onChange={(v) => handleThresholdChange('cpu', v)}
                    color="text-red-500"
                  />

                  <ThresholdSlider
                    icon={<MemoryStick size={14} />}
                    label="内存使用率"
                    value={config.thresholds.memory}
                    min={50}
                    max={100}
                    onChange={(v) => handleThresholdChange('memory', v)}
                    color="text-orange-500"
                  />

                  <ThresholdSlider
                    icon={<HardDrive size={14} />}
                    label="磁盘使用率"
                    value={config.thresholds.disk}
                    min={50}
                    max={100}
                    onChange={(v) => handleThresholdChange('disk', v)}
                    color="text-purple-500"
                  />

                  <ThresholdSlider
                    icon={<Activity size={14} />}
                    label="最低FPS"
                    value={config.thresholds.fps}
                    min={10}
                    max={60}
                    step={5}
                    onChange={(v) => handleThresholdChange('fps', v)}
                    color="text-blue-500"
                    isLower
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className="text-amber-500" />
                  <span className={`text-sm font-medium ${t.text}`}>自动低性能模式</span>
                </div>
                <button
                  onClick={handleAutoLowToggle}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    config.autoLowPerformance
                      ? 'bg-amber-500'
                      : isDark
                        ? 'bg-gray-600'
                        : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      config.autoLowPerformance ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-sm font-medium ${t.text}`}>告警冷却时间</span>
                  <span className={`text-sm ${t.textSecondary}`}>
                    {config.cooldown / 1000}秒
                  </span>
                </div>
                <input
                  type="range"
                  min={5000}
                  max={60000}
                  step={5000}
                  value={config.cooldown}
                  onChange={(e) => handleCooldownChange(Number(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
                <div className="flex justify-between mt-1">
                  <span className={`text-xs ${t.textSecondary}`}>5秒</span>
                  <span className={`text-xs ${t.textSecondary}`}>60秒</span>
                </div>
              </div>
            </>
          )}

          <button
            onClick={handleReset}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isDark
                ? 'bg-white/10 text-gray-300 hover:bg-white/20'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <RotateCcw size={14} />
            重置为默认
          </button>
        </div>
      </div>
    </div>
  );
}

interface ThresholdSliderProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  color: string;
  isLower?: boolean;
}

function ThresholdSlider({
  icon,
  label,
  value,
  min,
  max,
  step = 5,
  onChange,
  color,
  isLower,
}: ThresholdSliderProps) {
  const { isDark } = useTheme();

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={color}>{icon}</span>
          <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{label}</span>
        </div>
        <div className="flex items-center gap-1">
          {isLower && (
            <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>≤</span>
          )}
          <span className={`text-sm font-medium ${color}`}>{value}</span>
          {isLower ? 'FPS' : '%'}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-cyan-500"
      />
      <div className="flex justify-between mt-1">
        <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{min}</span>
        <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{max}</span>
      </div>
    </div>
  );
}
