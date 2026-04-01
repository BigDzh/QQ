import React, { useState, useEffect } from 'react';
import { Settings, RotateCcw, Save, X } from 'lucide-react';
import type { SortingConfig, UrgencyLevel } from '../types/taskSorting';

interface SortingConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: SortingConfig;
  onSave: (config: SortingConfig) => void;
}

const URGENCY_LEVELS: UrgencyLevel[] = ['极高', '高', '中', '低'];

const DEFAULT_CONFIG: SortingConfig = {
  urgencyWeights: {
    '极高': 100,
    '高': 75,
    '中': 50,
    '低': 25,
  },
  timeDecayFactor: 0.001,
};

export const SortingConfigPanel: React.FC<SortingConfigPanelProps> = ({
  isOpen,
  onClose,
  currentConfig,
  onSave,
}) => {
  const [localConfig, setLocalConfig] = useState<SortingConfig>(currentConfig);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalConfig(currentConfig);
    setHasChanges(false);
  }, [currentConfig, isOpen]);

  const handleWeightChange = (level: UrgencyLevel, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      setLocalConfig(prev => ({
        ...prev,
        urgencyWeights: {
          ...prev.urgencyWeights,
          [level]: numValue,
        },
      }));
      setHasChanges(true);
    }
  };

  const handleTimeDecayChange = (value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 0.01) {
      setLocalConfig(prev => ({
        ...prev,
        timeDecayFactor: numValue,
      }));
      setHasChanges(true);
    }
  };

  const handleSave = () => {
    onSave(localConfig);
    setHasChanges(false);
    onClose();
  };

  const handleReset = () => {
    setLocalConfig(DEFAULT_CONFIG);
    setHasChanges(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <Settings size={20} />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">排序配置</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">紧急程度权重</h3>
            <div className="space-y-2">
              {URGENCY_LEVELS.map(level => (
                <div key={level} className="flex items-center gap-3">
                  <span className="w-16 text-sm text-gray-600 dark:text-gray-400">{level}</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={localConfig.urgencyWeights[level]}
                    onChange={e => handleWeightChange(level, e.target.value)}
                    className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={localConfig.urgencyWeights[level]}
                    onChange={e => handleWeightChange(level, e.target.value)}
                    className="w-14 px-2 py-1 text-sm text-center border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">时间衰减因子</h3>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="10"
                step="0.001"
                value={localConfig.timeDecayFactor * 1000}
                onChange={e => handleTimeDecayChange((parseFloat(e.target.value) / 1000).toString())}
                className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <input
                type="number"
                min="0"
                max="0.01"
                step="0.001"
                value={localConfig.timeDecayFactor}
                onChange={e => handleTimeDecayChange(e.target.value)}
                className="w-20 px-2 py-1 text-sm text-center border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              值越大，截止时间临近的任务优先级提升越快
            </p>
          </div>

          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">优先级公式</h3>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <code className="text-xs text-gray-600 dark:text-gray-300">
                综合分数 = 紧急分数 × 0.7 + 时间分数 × 0.3
              </code>
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>紧急分数 =</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">紧急权重 × 优先级系数</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>时间分数 =</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">e^(-衰减因子 × 剩余小时数) × 100</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <RotateCcw size={14} />
            重置
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-xl text-sm font-medium text-white transition-colors"
          >
            <Save size={14} />
            保存
          </button>
        </div>
      </div>
    </div>
  );
};
