import { useState } from 'react';

interface WelcomeScreenProps {
  onComplete: () => void;
  onSkip: () => void;
}

const steps = [
  {
    title: '项目生命周期管理',
    description: '完整管理项目从创建到归档的全生命周期，支持多级模块、组件和系统架构',
    icon: '📁',
  },
  {
    title: '任务协同工作流',
    description: '任务分配、进度跟踪、自动提醒，支持工作流审批和状态流转',
    icon: '✅',
  },
  {
    title: '借还管理系统',
    description: '文档、软件、硬件资产的借还追踪，到期提醒和逾期处理',
    icon: '🔄',
  },
  {
    title: '数据安全与备份',
    description: '多级权限控制、操作审计日志、自动化备份策略，保障数据安全',
    icon: '🔒',
  },
];

export default function WelcomeScreen({ onComplete, onSkip }: WelcomeScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('welcome_screen_completed', 'true');
    onComplete();
  };

  const handleSkip = () => {
    localStorage.setItem('welcome_screen_completed', 'true');
    onSkip();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: '48px 40px',
          maxWidth: 560,
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 25px 80px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚀</div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#1a1a2e' }}>
            欢迎使用 QQ Export 管理系统
          </h1>
          <p style={{ margin: '12px 0 0', color: '#666', fontSize: 15 }}>
            快速了解系统的核心功能
          </p>
        </div>

        <div
          style={{
            background: 'linear-gradient(135deg, #f8f9ff 0%, #eef1ff 100%)',
            borderRadius: 12,
            padding: '28px 24px',
            marginBottom: 28,
            textAlign: 'center',
            minHeight: 140,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ fontSize: 52, marginBottom: 16 }}>{steps[currentStep].icon}</div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#1a1a2e' }}>
            {steps[currentStep].title}
          </h2>
          <p style={{ margin: '10px 0 0', color: '#555', fontSize: 14, lineHeight: 1.6, maxWidth: 400 }}>
            {steps[currentStep].description}
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 8,
            justifyContent: 'center',
            marginBottom: 24,
          }}
        >
          {steps.map((_, index) => (
            <div
              key={index}
              style={{
                width: index === currentStep ? 28 : 10,
                height: 10,
                borderRadius: 5,
                background: index === currentStep ? '#4f46e5' : '#d1d5db',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
              }}
              onClick={() => setCurrentStep(index)}
            />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          {currentStep > 0 && (
            <button
              onClick={handlePrev}
              style={{
                flex: 1,
                padding: '12px 20px',
                border: '1px solid #d1d5db',
                borderRadius: 8,
                background: '#fff',
                color: '#374151',
                fontSize: 15,
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              上一步
            </button>
          )}
          <button
            onClick={handleNext}
            style={{
              flex: 1,
              padding: '12px 20px',
              border: 'none',
              borderRadius: 8,
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              color: '#fff',
              fontSize: 15,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {currentStep === steps.length - 1 ? '开始使用' : '下一步'}
          </button>
          <button
            onClick={handleSkip}
            style={{
              padding: '12px 18px',
              border: 'none',
              borderRadius: 8,
              background: 'transparent',
              color: '#9ca3af',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            跳过
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <span style={{ color: '#9ca3af', fontSize: 12 }}>
            {currentStep + 1} / {steps.length}
          </span>
        </div>
      </div>
    </div>
  );
}
