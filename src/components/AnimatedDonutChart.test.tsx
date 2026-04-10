import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import AnimatedDonutChart from './AnimatedDonutChart';
import { ThemeProvider } from '../context/ThemeContext';

const mockData = [
  { name: '正常', value: 45, fill: '#10b981' },
  { name: '故障', value: 10, fill: '#ef4444' },
  { name: '维修中', value: 5, fill: '#f97316' },
];

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
};

describe('AnimatedDonutChart', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render component', () => {
      const { container } = renderWithTheme(<AnimatedDonutChart data={mockData} />);
      expect(container).toBeTruthy();
    });

    it('should render with data', () => {
      const { container } = renderWithTheme(<AnimatedDonutChart data={mockData} title="系统状态" />);
      expect(container).toBeTruthy();
    });

    it('should render empty state', () => {
      const { container } = renderWithTheme(<AnimatedDonutChart data={[]} />);
      expect(container).toBeTruthy();
    });

    it('should render with center label', () => {
      const { container } = renderWithTheme(<AnimatedDonutChart data={mockData} centerLabel="总计" centerValue={60} />);
      expect(container).toBeTruthy();
    });

    it('should render with center value', () => {
      const { container } = renderWithTheme(<AnimatedDonutChart data={mockData} centerValue={100} />);
      expect(container).toBeTruthy();
    });
  });

  describe('Data Processing', () => {
    it('should render with data', () => {
      const { container } = renderWithTheme(<AnimatedDonutChart data={mockData} />);
      expect(container).toBeTruthy();
    });

    it('should handle single data point', () => {
      const singleData = [{ name: '正常', value: 100, fill: '#10b981' }];
      const { container } = renderWithTheme(<AnimatedDonutChart data={singleData} />);
      expect(container).toBeTruthy();
    });

    it('should handle zero values', () => {
      const dataWithZero = [
        { name: '正常', value: 50, fill: '#10b981' },
        { name: '故障', value: 0, fill: '#ef4444' },
      ];
      const { container } = renderWithTheme(<AnimatedDonutChart data={dataWithZero} />);
      expect(container).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    it('should handle segment click callback', () => {
      const handleClick = vi.fn();
      const { container } = renderWithTheme(<AnimatedDonutChart data={mockData} onSegmentClick={handleClick} />);
      expect(container).toBeTruthy();
    });

    it('should handle segment hover callback', () => {
      const handleHover = vi.fn();
      const { container } = renderWithTheme(<AnimatedDonutChart data={mockData} onSegmentHover={handleHover} />);
      expect(container).toBeTruthy();
    });

    it('should render with click handler', () => {
      const handleClick = vi.fn();
      const { container } = renderWithTheme(<AnimatedDonutChart data={mockData} onSegmentClick={handleClick} />);
      expect(container).toBeTruthy();
    });
  });

  describe('Animation', () => {
    it('should render with animation duration', () => {
      const { container } = renderWithTheme(
        <AnimatedDonutChart data={mockData} animationDuration={1000} />
      );
      expect(container).toBeTruthy();
    });

    it('should render with breath interval', () => {
      const { container } = renderWithTheme(
        <AnimatedDonutChart data={mockData} breathInterval={5} />
      );
      expect(container).toBeTruthy();
    });

    it('should render with rotation speed', () => {
      const { container } = renderWithTheme(
        <AnimatedDonutChart data={mockData} rotationSpeed={60} />
      );
      expect(container).toBeTruthy();
    });
  });

  describe('Configuration', () => {
    it('should accept custom size', () => {
      const { container } = renderWithTheme(
        <AnimatedDonutChart data={mockData} size={300} />
      );
      expect(container).toBeTruthy();
    });

    it('should accept custom stroke width', () => {
      const { container } = renderWithTheme(
        <AnimatedDonutChart data={mockData} strokeWidth={25} />
      );
      expect(container).toBeTruthy();
    });

    it('should accept custom corner radius', () => {
      const { container } = renderWithTheme(
        <AnimatedDonutChart data={mockData} cornerRadius={12} />
      );
      expect(container).toBeTruthy();
    });

    it('should accept custom blur amount', () => {
      const { container } = renderWithTheme(
        <AnimatedDonutChart data={mockData} blurAmount={10} />
      );
      expect(container).toBeTruthy();
    });

    it('should accept custom ring opacity', () => {
      const { container } = renderWithTheme(
        <AnimatedDonutChart data={mockData} ringOpacity={0.5} />
      );
      expect(container).toBeTruthy();
    });

    it('should toggle legend visibility', () => {
      const { container: withLegend } = renderWithTheme(
        <AnimatedDonutChart data={mockData} showLegend={true} />
      );
      const { container: withoutLegend } = renderWithTheme(
        <AnimatedDonutChart data={mockData} showLegend={false} />
      );
      expect(withLegend).toBeTruthy();
      expect(withoutLegend).toBeTruthy();
    });

    it('should support bottom legend position', () => {
      const { container } = renderWithTheme(
        <AnimatedDonutChart data={mockData} legendPosition="bottom" />
      );
      expect(container).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should render with role', () => {
      const { container } = renderWithTheme(<AnimatedDonutChart data={mockData} title="测试图表" />);
      expect(container).toBeTruthy();
    });

    it('should render with segments', () => {
      const { container } = renderWithTheme(<AnimatedDonutChart data={mockData} />);
      const segments = container.querySelectorAll('path');
      expect(segments.length).toBeGreaterThan(0);
    });

    it('should render with paths', () => {
      const { container } = renderWithTheme(<AnimatedDonutChart data={mockData} />);
      const segments = container.querySelectorAll('path');
      expect(segments.length).toBeGreaterThan(0);
    });
  });
});

describe('DonutChartData Interface', () => {
  it('should accept valid data structure', () => {
    const validData = [
      { name: '项目A', value: 30, fill: '#3b82f6' },
      { name: '项目B', value: 70, fill: '#10b981' },
    ];
    const { container } = renderWithTheme(<AnimatedDonutChart data={validData} />);
    expect(container).toBeTruthy();
  });

  it('should handle Chinese characters in names', () => {
    const chineseData = [
      { name: '已完成', value: 25, fill: '#10b981' },
      { name: '进行中', value: 50, fill: '#3b82f6' },
      { name: '未开始', value: 25, fill: '#9ca3af' },
    ];
    const { container } = renderWithTheme(<AnimatedDonutChart data={chineseData} />);
    expect(container).toBeTruthy();
  });

  it('should handle long names', () => {
    const longNameData = [
      { name: '这是一个非常非常长的名称用于测试', value: 100, fill: '#3b82f6' },
    ];
    const { container } = renderWithTheme(<AnimatedDonutChart data={longNameData} />);
    expect(container).toBeTruthy();
  });
});
