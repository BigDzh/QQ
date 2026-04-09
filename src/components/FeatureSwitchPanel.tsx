import React, { useCallback } from 'react';
import { Globe, X, Check, AlertCircle } from 'lucide-react';
import { useLowPerformanceMode } from '../context/LowPerformanceModeContext';
import type { FeatureToggle } from '../types/lowPerformanceMode';

interface FeatureSwitchPanelProps {
  isVisible: boolean;
  onClose: () => void;
}

const categoryLabels = {
  core: { name: '核心功能', description: '系统基础功能，无法关闭' },
  enhanced: { name: '增强功能', description: '可优化性能的增强功能' },
  optional: { name: '可选功能', description: '可完全手动控制开关' },
};

const categoryColors = {
  core: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-500', badge: 'bg-amber-500/20 text-amber-400' },
  enhanced: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-500', badge: 'bg-blue-500/20 text-blue-400' },
  optional: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-500', badge: 'bg-purple-500/20 text-purple-400' },
};

const resourceCostLabels = {
  none: { text: '无消耗', color: 'text-gray-400' },
  low: { text: '低消耗', color: 'text-green-400' },
  medium: { text: '中消耗', color: 'text-yellow-400' },
  high: { text: '高消耗', color: 'text-red-400' },
};

export default function FeatureSwitchPanel({ isVisible, onClose }: FeatureSwitchPanelProps) {
  const {
    mode,
    features,
    featureOverrides,
    setFeatureOverride,
    clearFeatureOverride,
    clearAllFeatureOverrides,
    getEffectiveFeatureState,
  } = useLowPerformanceMode();

  const handleToggle = useCallback((feature: FeatureToggle) => {
    const currentState = getEffectiveFeatureState(feature);
    setFeatureOverride(feature.id, !currentState);
  }, [getEffectiveFeatureState, setFeatureOverride]);

  const handleClearOverride = useCallback((featureId: string) => {
    clearFeatureOverride(featureId);
  }, [clearFeatureOverride]);

  const handleClearAll = useCallback(() => {
    clearAllFeatureOverrides();
  }, [clearAllFeatureOverrides]);

  if (!isVisible) return null;

  const categories = ['core', 'enhanced', 'optional'] as const;
  const enabledCount = features.filter(f => getEffectiveFeatureState(f)).length;
  const overrideCount = Object.keys(featureOverrides).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-xl shadow-2xl border border-gray-700/50 w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50 bg-gray-800/50">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-base font-semibold text-white">功能开关控制</h2>
              <p className="text-xs text-gray-400">
                当前模式: <span className={mode === 'high' ? 'text-green-400' : 'text-yellow-400'}>{mode === 'high' ? '高性能' : '低性能'}</span>
                {' · '}
                已启用 {enabledCount}/{features.length} 项功能
                {overrideCount > 0 && <span className="text-cyan-400"> (含 {overrideCount} 项手动调整)</span>}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(80vh-120px)] space-y-4">
          {mode === 'low' && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-400">低性能模式提示</p>
                <p className="text-xs text-yellow-400/80 mt-1">
                  当前处于低性能模式，核心功能正常运行。增强功能和可选功能默认关闭，但您可以手动开启需要的项目。
                  手动开启的功能将不受性能模式影响持续运行。
                </p>
              </div>
            </div>
          )}

          {categories.map(category => {
            const categoryFeatures = features.filter(f => f.category === category);
            const colors = categoryColors[category];
            const label = categoryLabels[category];

            return (
              <div key={category} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${colors.text}`}>{label.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${colors.badge}`}>{label.description}</span>
                </div>
                <div className="space-y-1">
                  {categoryFeatures.map(feature => {
                    const isEnabled = getEffectiveFeatureState(feature);
                    const hasOverride = featureOverrides[feature.id] !== undefined;
                    const costLabel = resourceCostLabels[feature.resourceCost];

                    return (
                      <div
                        key={feature.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                          isEnabled
                            ? `${colors.bg} border-${colors.text.replace('text-', '')}/30`
                            : 'bg-gray-800/50 border-gray-700/30'
                        }`}
                      >
                        <button
                          onClick={() => handleToggle(feature)}
                          className={`w-10 h-6 rounded-full transition-colors relative ${
                            isEnabled ? 'bg-green-500' : 'bg-gray-600'
                          }`}
                          disabled={category === 'core'}
                        >
                          <span
                            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                              isEnabled ? 'translate-x-5' : 'translate-x-1'
                            }`}
                          />
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${isEnabled ? 'text-white' : 'text-gray-400'}`}>
                              {feature.name}
                            </span>
                            {hasOverride && (
                              <button
                                onClick={() => handleClearOverride(feature.id)}
                                className="text-xs text-cyan-400 hover:text-cyan-300 underline"
                              >
                                恢复默认
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate">{feature.description}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-xs ${costLabel.color}`}>{costLabel.text}</span>
                          {hasOverride && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400">
                              手动
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700/50 bg-gray-800/50">
          <p className="text-xs text-gray-500">
            核心功能无法关闭，仅增强功能和可选功能可手动控制
          </p>
          {overrideCount > 0 && (
            <button
              onClick={handleClearAll}
              className="text-xs px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
            >
              清除所有手动调整
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
