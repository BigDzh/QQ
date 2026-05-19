import { useState, useCallback } from 'react';
import { X, BookOpen, ChevronRight, ChevronLeft, Check, HelpCircle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useThemeStyles } from '../../hooks/useThemeStyles';

interface QuickStartGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

interface GuideStep {
  id: number;
  title: string;
  description: string;
  icon: string;
  details?: string[];
}

const GUIDE_STEPS: GuideStep[] = [
  {
    id: 1,
    title: '创建第一个项目',
    description: '点击"新建项目"按钮，填写项目名称和编号开始',
    icon: '📁',
    details: [
      '项目名称应简洁明了',
      '项目编号用于系统唯一标识',
      '选择项目当前阶段 (F/C/S/D/P)',
    ],
  },
  {
    id: 2,
    title: '添加系统和模块',
    description: '在项目详情中创建系统，然后在系统下添加模块',
    icon: '🔧',
    details: [
      '系统是项目的二级组织单位',
      '模块是具体的组件容器',
      '每个模块有独立的状态和版本',
    ],
  },
  {
    id: 3,
    title: '管理组件和证书',
    description: '为模块添加组件，并管理各类证书',
    icon: '📋',
    details: [
      '组件是系统的基本组成单位',
      '支持印制板、电装、三防、装配证书',
      '证书可追溯签署状态和时间',
    ],
  },
  {
    id: 4,
    title: '使用任务管理',
    description: '创建和跟踪项目任务，自动处理故障',
    icon: '✅',
    details: [
      '任务可关联组件和文档',
      '故障自动创建处理任务',
      '支持优先级和截止日期',
    ],
  },
  {
    id: 5,
    title: '数据备份与恢复',
    description: '定期备份项目数据，确保数据安全',
    icon: '💾',
    details: [
      '支持一键备份到本地',
      '可导出/导入JSON格式',
      '建议设置定期备份提醒',
    ],
  },
];

const FAQ_ITEMS = [
  {
    question: '如何切换主题？',
    answer: '点击侧边栏底部用户名，在下拉菜单中选择"切换主题"',
  },
  {
    question: '快捷键有哪些？',
    answer: '按 Ctrl+H 可打开快捷键帮助，常用快捷键包括 Ctrl+K 全局搜索、Ctrl+B 切换侧边栏',
  },
  {
    question: '如何导出数据？',
    answer: '在备份管理页面可以导出所有数据的 JSON 文件，也可导出审计日志',
  },
  {
    question: '组件状态如何自动计算？',
    answer: '系统根据模块和组件的状态自动计算，高优先级状态（故障 > 维修中 > 三防中）会覆盖低优先级',
  },
];

export function QuickStartGuide({ isOpen, onClose, onComplete }: QuickStartGuideProps) {
  const { isDark, isCyberpunk, isAnime, isCosmos } = useTheme();
  const t = useThemeStyles();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [showFaq, setShowFaq] = useState(false);
  const [guideKey, setGuideKey] = useState('guide');

  const isCompleted = completedSteps.size === GUIDE_STEPS.length;

  const getAccentColor = () => {
    if (isCyberpunk) return { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-400/30', active: 'bg-cyan-500/20', hover: 'hover:bg-cyan-500/10' };
    if (isAnime) return { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-400/30', active: 'bg-pink-500/20', hover: 'hover:bg-pink-500/10' };
    if (isCosmos) return { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-400/30', active: 'bg-violet-500/20', hover: 'hover:bg-violet-500/10' };
    return { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-400/30', active: 'bg-blue-500/20', hover: 'hover:bg-blue-500/10' };
  };

  const accent = getAccentColor();

  const handleNext = useCallback(() => {
    if (currentStep < GUIDE_STEPS.length - 1) {
      setCompletedSteps((prev) => new Set(prev).add(GUIDE_STEPS[currentStep].id));
      setCurrentStep((prev) => prev + 1);
      setGuideKey((prev) => `${prev}-next`);
    }
  }, [currentStep]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      setGuideKey((prev) => `${prev}-prev`);
    }
  }, [currentStep]);

  const handleStepClick = useCallback((index: number) => {
    setCurrentStep(index);
    setGuideKey((prev) => `${prev}-step`);
  }, []);

  const handleComplete = useCallback(() => {
    setCompletedSteps(new Set(GUIDE_STEPS.map((s) => s.id)));
    localStorage.setItem('quick_start_completed', 'true');
    onComplete?.();
    onClose();
  }, [onComplete, onClose]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[var(--z-top-layer)]"
      onClick={handleClose}
    >
      <div
        className={`${t.card} border ${t.border} rounded-2xl w-[560px] max-h-[85vh] overflow-hidden flex flex-col shadow-xl backdrop-blur-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className={`p-2 ${accent.bg} rounded-xl`}>
              <BookOpen className={`${accent.text}`} size={20} />
            </div>
            <h2 className={`text-lg font-semibold ${t.text}`}>快速入门指南</h2>
          </div>
          <button
            onClick={handleClose}
            className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors ${accent.text}`}
            aria-label="关闭"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex">
          <div className={`w-48 py-4 px-3 border-r ${t.border}`}>
            <nav className="space-y-1">
              {GUIDE_STEPS.map((step, index) => {
                const isActive = currentStep === index;
                const isCompleted = completedSteps.has(step.id);
                const getNavItemClass = () => {
                  if (isActive) return `${accent.active} ${accent.text} font-medium`;
                  if (isCompleted) return `${accent.text} opacity-90`;
                  return isDark ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900';
                };
                return (
                  <button
                    key={step.id}
                    onClick={() => handleStepClick(index)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${getNavItemClass()}`}
                  >
                    <span className="text-lg">{step.icon}</span>
                    <span className="text-sm flex-1 truncate">{step.title}</span>
                    {isCompleted && (
                      <Check size={14} className={accent.text} />
                    )}
                  </button>
                );
              })}
            </nav>

            <div className={`mt-6 pt-4 border-t ${t.border}`}>
              <button
                onClick={() => setShowFaq(!showFaq)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                  showFaq
                    ? `${accent.active} ${accent.text}`
                    : isDark ? 'text-gray-300 hover:text-white hover:bg-white/5' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <HelpCircle size={16} />
                <span className="text-sm">常见问题</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-6">
            {!showFaq ? (
              <div key={guideKey} className="animate-fade-in">
                <div className="flex items-start gap-4 mb-6">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${accent.active}`}>
                    {GUIDE_STEPS[currentStep].icon}
                  </div>
                  <div className="flex-1">
                    <h3 className={`text-lg font-semibold ${t.text} mb-1`}>
                      {GUIDE_STEPS[currentStep].id}. {GUIDE_STEPS[currentStep].title}
                    </h3>
                    <p className={`text-sm ${t.textSecondary}`}>
                      {GUIDE_STEPS[currentStep].description}
                    </p>
                  </div>
                </div>

                {GUIDE_STEPS[currentStep].details && (
                  <div className={`rounded-xl p-4 mb-6 ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                    <h4 className={`text-sm font-medium ${t.text} mb-3`}>操作提示</h4>
                    <ul className="space-y-2">
                      {GUIDE_STEPS[currentStep].details?.map((detail, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <ChevronRight
                            size={14}
                            className={`mt-0.5 flex-shrink-0 ${accent.text}`}
                          />
                          <span className={`text-sm ${t.textSecondary}`}>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {GUIDE_STEPS.map((_, index) => (
                      <div
                        key={index}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          index === currentStep
                            ? accent.text.replace('text-', 'bg-')
                            : index < currentStep
                            ? `${accent.text.replace('text-', 'bg-')}/50`
                            : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                  <span className={`text-xs ${t.textSecondary}`}>
                    {currentStep + 1} / {GUIDE_STEPS.length}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className={`text-sm font-medium ${t.text}`}>常见问题</h3>
                {FAQ_ITEMS.map((faq, index) => (
                  <div
                    key={index}
                    className={`rounded-xl p-4 ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <HelpCircle
                        size={14}
                        className={`mt-0.5 flex-shrink-0 ${accent.text}`}
                      />
                      <span className={`text-sm font-medium ${t.text}`}>{faq.question}</span>
                    </div>
                    <p className={`text-sm ${t.textSecondary} pl-6`}>{faq.answer}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={`flex items-center justify-between px-6 py-4 border-t ${t.border}`}>
          <button
            onClick={handleComplete}
            disabled={!isCompleted && completedSteps.size === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${accent.text} ${accent.hover}`}
          >
            {isCompleted ? <Check size={16} /> : null}
            {isCompleted ? '已完成入门指南' : '跳过'}
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${accent.text} ${accent.hover}`}
            >
              <ChevronLeft size={16} />
              上一步
            </button>
            {currentStep < GUIDE_STEPS.length - 1 ? (
              <button
                onClick={handleNext}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all text-white bg-gradient-to-r ${isCyberpunk ? 'from-cyan-500 to-fuchsia-500 hover:opacity-90' : isAnime ? 'from-pink-500 to-fuchsia-500 hover:opacity-90' : isCosmos ? 'from-violet-600 to-fuchsia-600 hover:opacity-90' : 'from-blue-500 to-blue-600 hover:bg-blue-600'}`}
              >
                下一步
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all text-white bg-gradient-to-r ${isCyberpunk ? 'from-cyan-500 to-fuchsia-500 hover:opacity-90' : isAnime ? 'from-pink-500 to-fuchsia-500 hover:opacity-90' : isCosmos ? 'from-violet-600 to-fuchsia-600 hover:opacity-90' : 'from-blue-500 to-blue-600 hover:bg-blue-600'}`}
              >
                <Check size={16} />
                完成
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuickStartGuide;