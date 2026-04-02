import { useState, useCallback, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useThemeStyles } from '../../hooks/useThemeStyles';
import { Button } from '../ui/Button';
import {
  Sparkles,
  Rocket,
  Shield,
  Database,
  FileText,
  GitBranch,
  Settings,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  Zap,
  Clock,
  Users,
  Layers,
  Star
} from 'lucide-react';

interface WelcomeScreenProps {
  onComplete: () => void;
  onSkip: () => void;
}

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

interface Step {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const FEATURES: Feature[] = [
  {
    icon: <Layers className="w-6 h-6" />,
    title: '系统化管理',
    description: '项目、系统、模块、组件层级分明，轻松管理全生命周期',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: <GitBranch className="w-6 h-6" />,
    title: '流程追溯',
    description: '完整记录每个组件的状态变更历史，追溯无忧',
    color: 'from-violet-500 to-purple-500',
  },
  {
    icon: <FileText className="w-6 h-6" />,
    title: '证书管理',
    description: '自动管理印制板、电装、三防、装配等各类证书',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    icon: <Database className="w-6 h-6" />,
    title: '数据安全',
    description: '本地存储结合备份恢复机制，保障数据万无一失',
    color: 'from-orange-500 to-amber-500',
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: '借用管理',
    description: '组件借用归还流程清晰，记录完整可查',
    color: 'from-pink-500 to-rose-500',
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: '任务驱动',
    description: '任务自动关联组件，故障处理流程自动化',
    color: 'from-yellow-500 to-orange-500',
  },
];

const SETUP_STEPS: Step[] = [
  {
    id: 1,
    title: '创建项目',
    description: '点击"新建项目"按钮，填写项目名称和编号开始',
    icon: <Rocket className="w-5 h-5" />,
  },
  {
    id: 2,
    title: '添加系统和模块',
    description: '在项目详情中创建系统，然后在系统下添加模块',
    icon: <Layers className="w-5 h-5" />,
  },
  {
    id: 3,
    title: '管理组件',
    description: '为模块添加组件，并管理各类证书和状态',
    icon: <GitBranch className="w-5 h-5" />,
  },
  {
    id: 4,
    title: '开始使用',
    description: '完成基础配置后即可开始正常使用所有功能',
    icon: <Sparkles className="w-5 h-5" />,
  },
];

export function WelcomeScreen({ onComplete, onSkip }: WelcomeScreenProps) {
  const [currentView, setCurrentView] = useState<'welcome' | 'features' | 'setup'>('welcome');
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  const { isDark, isCyberpunk, isAnime, isCosmos } = useTheme();
  const t = useThemeStyles();

  useEffect(() => {
    requestAnimationFrame(() => {
      setMounted(true);
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    });
  }, []);

  const getAccentColors = useCallback(() => {
    if (isCyberpunk) {
      return {
        primary: 'from-cyan-400 to-fuchsia-400',
        secondary: 'cyan',
        glow: 'shadow-cyan-500/30',
        bg: 'bg-cyan-500/10',
        text: 'text-cyan-400',
        border: 'border-cyan-400/30',
      };
    }
    if (isAnime) {
      return {
        primary: 'from-pink-400 to-violet-400',
        secondary: 'pink',
        glow: 'shadow-pink-500/30',
        bg: 'bg-pink-500/10',
        text: 'text-pink-400',
        border: 'border-pink-400/30',
      };
    }
    if (isCosmos) {
      return {
        primary: 'from-violet-400 to-fuchsia-400',
        secondary: 'violet',
        glow: 'shadow-violet-500/30',
        bg: 'bg-violet-500/10',
        text: 'text-violet-400',
        border: 'border-violet-400/30',
      };
    }
    if (isDark) {
      return {
        primary: 'from-blue-400 to-blue-600',
        secondary: 'blue',
        glow: 'shadow-blue-500/30',
        bg: 'bg-blue-500/10',
        text: 'text-blue-400',
        border: 'border-blue-400/30',
      };
    }
    return {
      primary: 'from-primary-400 to-primary-600',
      secondary: 'primary',
      glow: 'shadow-primary-500/30',
      bg: 'bg-primary-500/10',
      text: 'text-primary-600',
      border: 'border-primary-400/30',
    };
  }, [isCyberpunk, isAnime, isCosmos, isDark]);

  const accent = getAccentColors();

  const handleNext = useCallback(() => {
    if (currentView === 'welcome') {
      setCurrentView('features');
    } else if (currentView === 'features') {
      setCurrentView('setup');
    } else if (currentView === 'setup') {
      if (currentStep < SETUP_STEPS.length - 1) {
        setCurrentStep((prev) => prev + 1);
      } else {
        localStorage.setItem('welcome_screen_completed', 'true');
        onComplete();
      }
    }
  }, [currentView, currentStep, onComplete]);

  const handlePrevious = useCallback(() => {
    if (currentView === 'features') {
      setCurrentView('welcome');
    } else if (currentView === 'setup') {
      if (currentStep > 0) {
        setCurrentStep((prev) => prev - 1);
      } else {
        setCurrentView('features');
      }
    }
  }, [currentView, currentStep]);

  const handleSkip = useCallback(() => {
    localStorage.setItem('welcome_screen_completed', 'true');
    onSkip();
  }, [onSkip]);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      handleSkip();
    }, 300);
  }, [handleSkip]);

  const renderWelcomeView = () => (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 py-12 animate-fade-in">
      <div className={`relative mb-8`}>
        <div className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${accent.primary} flex items-center justify-center shadow-2xl ${accent.glow} animate-pulse`}>
          <Shield className="w-12 h-12 text-white" />
        </div>
        <div className={`absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br ${accent.primary} flex items-center justify-center shadow-lg ${accent.glow}`}>
          <Star className="w-4 h-4 text-white" fill="white" />
        </div>
      </div>

      <h1 className={`text-3xl font-bold ${t.text} mb-3`}>
        欢迎使用
      </h1>
      <h2 className={`text-2xl font-bold ${t.text} mb-4`}>
        项目全生命周期管理系统
      </h2>
      <p className={`text-base ${t.textSecondary} max-w-md mb-8`}>
        轻松管理项目全生命周期，实现组件状态追踪、证书管理和任务流程自动化
      </p>

      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Clock className="w-4 h-4" />
        <span>预计设置时间：2 分钟</span>
      </div>
    </div>
  );

  const renderFeaturesView = () => (
    <div className="flex flex-col h-full px-8 py-6">
      <div className="text-center mb-6">
        <h2 className={`text-xl font-bold ${t.text} mb-2`}>核心功能</h2>
        <p className={`text-sm ${t.textSecondary}`}>探索系统的主要功能特性</p>
      </div>

      <div className="flex-1 overflow-auto grid grid-cols-2 gap-3 content-start">
        {FEATURES.map((feature, index) => (
          <div
            key={index}
            className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'} border ${t.border} hover:border-opacity-50 transition-all duration-200 group cursor-default`}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
              <div className="text-white">
                {feature.icon}
              </div>
            </div>
            <h3 className={`font-semibold ${t.text} text-sm mb-1`}>{feature.title}</h3>
            <p className={`text-xs ${t.textSecondary} leading-relaxed`}>{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSetupView = () => (
    <div className="flex flex-col h-full px-8 py-6">
      <div className="text-center mb-6">
        <h2 className={`text-xl font-bold ${t.text} mb-2`}>快速开始</h2>
        <p className={`text-sm ${t.textSecondary}`}>按照以下步骤完成初始设置</p>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-4 mb-6">
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${accent.primary} flex items-center justify-center shadow-lg ${accent.glow}`}>
            {SETUP_STEPS[currentStep].icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-medium ${accent.text}`}>步骤 {currentStep + 1} / {SETUP_STEPS.length}</span>
              <div className="flex gap-1">
                {SETUP_STEPS.map((_, index) => (
                  <div
                    key={index}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      index === currentStep
                        ? accent.text.replace('text-', 'bg-')
                        : index < currentStep
                        ? `${accent.text.replace('text-', 'bg-')}/50`
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  />
                ))}
              </div>
            </div>
            <h3 className={`text-lg font-bold ${t.text}`}>{SETUP_STEPS[currentStep].title}</h3>
          </div>
        </div>

        <div className={`flex-1 rounded-xl p-5 ${isDark ? 'bg-white/5' : 'bg-gray-50'} border ${t.border} mb-6`}>
          <p className={`text-sm ${t.textSecondary} leading-relaxed`}>
            {SETUP_STEPS[currentStep].description}
          </p>

          {currentStep === 0 && (
            <div className={`mt-4 p-3 rounded-lg ${accent.bg} border ${accent.border}`}>
              <p className={`text-xs ${accent.text} font-medium`}>
                💡 提示：项目名称应简洁明了，项目编号用于系统唯一标识
              </p>
            </div>
          )}

          {currentStep === 1 && (
            <div className={`mt-4 p-3 rounded-lg ${accent.bg} border ${accent.border}`}>
              <p className={`text-xs ${accent.text} font-medium`}>
                💡 提示：系统是项目的二级组织单位，模块是具体的组件容器
              </p>
            </div>
          )}

          {currentStep === 2 && (
            <div className={`mt-4 p-3 rounded-lg ${accent.bg} border ${accent.border}`}>
              <p className={`text-xs ${accent.text} font-medium`}>
                💡 提示：每个模块有独立的状态和版本，证书可追溯签署状态
              </p>
            </div>
          )}

          {currentStep === 3 && (
            <div className={`mt-4 p-3 rounded-lg ${accent.bg} border ${accent.border}`}>
              <p className={`text-xs ${accent.text} font-medium`}>
                🎉 恭喜！您已完成初始设置，可以开始正常使用系统了
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-center gap-2">
          {SETUP_STEPS.map((step, index) => (
            <button
              key={step.id}
              onClick={() => setCurrentStep(index)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${
                index === currentStep
                  ? `bg-gradient-to-br ${accent.primary} shadow-md`
                  : index < currentStep
                  ? `${accent.text} opacity-60 hover:opacity-100`
                  : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );

  const getProgressPercent = () => {
    if (currentView === 'welcome') return 0;
    if (currentView === 'features') return 33;
    if (currentView === 'setup') {
      return 66 + (currentStep / SETUP_STEPS.length) * 34;
    }
    return 0;
  };

  return (
    <div
      className={`fixed inset-0 z-[var(--z-top-layer)] transition-all duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        className={`absolute inset-0 backdrop-blur-xl ${
          isCyberpunk
            ? 'bg-[#0a0a0f]/90'
            : isAnime
            ? 'bg-gradient-to-br from-pink-100/90 via-purple-100/90 to-cyan-100/90'
            : isCosmos
            ? 'bg-[#0a0118]/90'
            : isDark
            ? 'bg-gray-900/90'
            : 'bg-white/90'
        }`}
      />

      <div className="absolute inset-0 overflow-hidden">
        <div className={`absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-gradient-to-br ${accent.primary} opacity-5 blur-3xl animate-slow-rotate`} />
        <div className={`absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-gradient-to-br ${accent.primary} opacity-5 blur-3xl animate-slow-rotate`} style={{ animationDirection: 'reverse' }} />
      </div>

      <div className={`relative h-full flex items-center justify-center p-4 transition-all duration-500 ${mounted ? 'scale-100' : 'scale-95'}`}>
        <div
          className={`relative w-full max-w-2xl max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl border ${t.border} backdrop-blur-2xl ${
            isCyberpunk
              ? 'bg-[#12121a]/95'
              : isAnime
              ? 'bg-white/95'
              : isCosmos
              ? 'bg-[#0d1b2a]/95'
              : isDark
              ? 'bg-gray-800/95'
              : 'bg-white/95'
          }`}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent" />

          <button
            onClick={handleClose}
            className={`absolute top-4 right-4 z-10 p-2 rounded-xl transition-all duration-200 ${
              isDark
                ? 'hover:bg-white/10 text-gray-400 hover:text-white'
                : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
            }`}
            aria-label="关闭"
          >
            <X size={20} />
          </button>

          <div className="absolute top-4 left-4 w-32">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${accent.primary} flex items-center justify-center`}>
                <Settings className="w-4 h-4 text-white" />
              </div>
              <span className={`text-xs font-medium ${t.textSecondary}`}>v2.19</span>
            </div>
          </div>

          <div className="h-1 bg-gray-100 dark:bg-gray-700/50 mt-14 mx-4 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${accent.primary} transition-all duration-500 ease-out rounded-full`}
              style={{ width: `${getProgressPercent()}%` }}
            />
          </div>

          <div className="h-[calc(100%-120px)]">
            {currentView === 'welcome' && renderWelcomeView()}
            {currentView === 'features' && renderFeaturesView()}
            {currentView === 'setup' && renderSetupView()}
          </div>

          <div className={`h-20 px-6 flex items-center justify-between border-t ${t.border} bg-gradient-to-t ${
            isDark ? 'bg-gray-800/50' : 'bg-gray-50/50'
          }`}>
            <div className="flex items-center gap-3">
              {currentView !== 'welcome' ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrevious}
                  leftIcon={currentView === 'setup' && currentStep > 0 ? <ChevronLeft size={16} /> : undefined}
                >
                  {currentView === 'setup' && currentStep === 0 ? '返回' : '上一步'}
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkip}
                >
                  跳过
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-400">
              {currentView === 'welcome' && (
                <span className="flex items-center gap-1">
                  <Sparkles size={14} className={accent.text} />
                  <span>产品介绍</span>
                </span>
              )}
              {currentView === 'features' && (
                <span className="flex items-center gap-1">
                  <Star size={14} className={accent.text} />
                  <span>核心功能</span>
                </span>
              )}
              {currentView === 'setup' && (
                <span className="flex items-center gap-1">
                  <Rocket size={14} className={accent.text} />
                  <span>快速开始</span>
                </span>
              )}
            </div>

            <Button
              variant="gradient"
              size="sm"
              onClick={handleNext}
              rightIcon={
                currentView === 'setup' && currentStep === SETUP_STEPS.length - 1 ? (
                  <Check size={16} />
                ) : (
                  <ChevronRight size={16} />
                )
              }
              gradientDirection={isCyberpunk || isAnime || isCosmos ? 'r' : 'l'}
            >
              {currentView === 'welcome'
                ? '了解更多'
                : currentView === 'features'
                ? '开始设置'
                : currentStep === SETUP_STEPS.length - 1
                ? '完成'
                : '下一步'}
            </Button>
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
        {['welcome', 'features', 'setup'].map((view, index) => {
          const viewIndex = ['welcome', 'features', 'setup'].indexOf(currentView);
          return (
            <div
              key={view}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === viewIndex
                  ? `bg-gradient-to-br ${accent.primary} shadow-md`
                  : index < viewIndex
                  ? `${accent.text} opacity-60`
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}

export default WelcomeScreen;