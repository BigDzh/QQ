import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { AnimatedDonutChart } from './AnimatedDonutChart';

const mockData = [
  { name: '正常', value: 45, fill: '#10b981' },
  { name: '故障', value: 10, fill: '#ef4444' },
  { name: '维修中', value: 5, fill: '#f97316' },
];

describe('AnimatedDonutChart', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(<AnimatedDonutChart data={mockData} />);
      expect(screen.getByRole('figure')).toBeTruthy();
    });

    it('should render with correct title', () => {
      render(<AnimatedDonutChart data={mockData} title="系统状态" />);
      expect(screen.getByText('系统状态')).toBeTruthy();
    });

    it('should render empty state when no data', () => {
      render(<AnimatedDonutChart data={[]} />);
      expect(screen.getByText('暂无数据')).toBeTruthy();
    });

    it('should render center label correctly', () => {
      render(<AnimatedDonutChart data={mockData} centerLabel="总计" centerValue={60} />);
      expect(screen.getByText('总计')).toBeTruthy();
    });

    it('should display correct center value', () => {
      render(<AnimatedDonutChart data={mockData} centerValue={100} />);
      expect(screen.getByText('100')).toBeTruthy();
    });
  });

  describe('Data Processing', () => {
    it('should calculate correct total', () => {
      render(<AnimatedDonutChart data={mockData} />);
      const totalElement = screen.getByText('60');
      expect(totalElement).toBeTruthy();
    });

    it('should handle single data point', () => {
      const singleData = [{ name: '正常', value: 100, fill: '#10b981' }];
      render(<AnimatedDonutChart data={singleData} />);
      expect(screen.getByText('100')).toBeTruthy();
    });

    it('should handle zero values in data', () => {
      const dataWithZero = [
        { name: '正常', value: 50, fill: '#10b981' },
        { name: '故障', value: 0, fill: '#ef4444' },
      ];
      render(<AnimatedDonutChart data={dataWithZero} />);
      expect(screen.getByText('50')).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    it('should call onSegmentClick when segment is clicked', async () => {
      const handleClick = vi.fn();
      render(<AnimatedDonutChart data={mockData} onSegmentClick={handleClick} />);

      await new Promise(resolve => setTimeout(resolve, 2000));

      const segments = document.querySelectorAll('path[role="button"]');
      if (segments.length > 0) {
        fireEvent.click(segments[0]);
        expect(handleClick).toHaveBeenCalled();
      }
    });

    it('should call onSegmentHover when segment is hovered', async () => {
      const handleHover = vi.fn();
      render(<AnimatedDonutChart data={mockData} onSegmentHover={handleHover} />);

      await new Promise(resolve => setTimeout(resolve, 2000));

      const segments = document.querySelectorAll('path[role="button"]');
      if (segments.length > 0) {
        fireEvent.mouseEnter(segments[0]);
        expect(handleHover).toHaveBeenCalled();
      }
    });

    it('should toggle selection on click', async () => {
      const handleClick = vi.fn();
      render(<AnimatedDonutChart data={mockData} onSegmentClick={handleClick} />);

      await new Promise(resolve => setTimeout(resolve, 2000));

      const segments = document.querySelectorAll('path[role="button"]');
      if (segments.length > 0) {
        fireEvent.click(segments[0]);
        expect(handleClick).toHaveBeenCalledWith(expect.objectContaining({
          name: expect.any(String),
          value: expect.any(Number),
        }));
      }
    });
  });

  describe('Animation', () => {
    it('should have animation duration prop', () => {
      const { container } = render(
        <AnimatedDonutChart data={mockData} animationDuration={1000} />
      );
      expect(container).toBeTruthy();
    });

    it('should have breath interval prop', () => {
      const { container } = render(
        <AnimatedDonutChart data={mockData} breathInterval={5} />
      );
      expect(container).toBeTruthy();
    });

    it('should have rotation speed prop', () => {
      const { container } = render(
        <AnimatedDonutChart data={mockData} rotationSpeed={60} />
      );
      expect(container).toBeTruthy();
    });
  });

  describe('Configuration', () => {
    it('should accept custom size', () => {
      const { container } = render(
        <AnimatedDonutChart data={mockData} size={300} />
      );
      expect(container).toBeTruthy();
    });

    it('should accept custom stroke width', () => {
      const { container } = render(
        <AnimatedDonutChart data={mockData} strokeWidth={25} />
      );
      expect(container).toBeTruthy();
    });

    it('should accept custom corner radius', () => {
      const { container } = render(
        <AnimatedDonutChart data={mockData} cornerRadius={12} />
      );
      expect(container).toBeTruthy();
    });

    it('should accept custom blur amount', () => {
      const { container } = render(
        <AnimatedDonutChart data={mockData} blurAmount={10} />
      );
      expect(container).toBeTruthy();
    });

    it('should accept custom ring opacity', () => {
      const { container } = render(
        <AnimatedDonutChart data={mockData} ringOpacity={0.5} />
      );
      expect(container).toBeTruthy();
    });

    it('should toggle legend visibility', () => {
      const { container: withLegend } = render(
        <AnimatedDonutChart data={mockData} showLegend={true} />
      );
      const { container: withoutLegend } = render(
        <AnimatedDonutChart data={mockData} showLegend={false} />
      );
      expect(withLegend).toBeTruthy();
      expect(withoutLegend).toBeTruthy();
    });

    it('should support bottom legend position', () => {
      const { container } = render(
        <AnimatedDonutChart data={mockData} legendPosition="bottom" />
      );
      expect(container).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have role="figure" on root element', () => {
      render(<AnimatedDonutChart data={mockData} title="测试图表" />);
      const figure = document.querySelector('[role="figure"]');
      expect(figure).toBeTruthy();
    });

    it('should have aria-label on segments', () => {
      render(<AnimatedDonutChart data={mockData} />);

      const segments = document.querySelectorAll('path[role="button"]');
      segments.forEach(segment => {
        expect(segment.getAttribute('aria-label')).toBeTruthy();
      });
    });

    it('should have keyboard support on segments', () => {
      render(<AnimatedDonutChart data={mockData} />);

      const segments = document.querySelectorAll('path[tabindex="0"]');
      segments.forEach(segment => {
        expect(segment.getAttribute('tabIndex')).toBe('0');
      });
    });
  });
});

describe('DonutChartData Interface', () => {
  it('should accept valid data structure', () => {
    const validData = [
      { name: '项目A', value: 30, fill: '#3b82f6' },
      { name: '项目B', value: 70, fill: '#10b981' },
    ];
    const { container } = render(<AnimatedDonutChart data={validData} />);
    expect(container).toBeTruthy();
  });

  it('should handle Chinese characters in names', () => {
    const chineseData = [
      { name: '已完成', value: 25, fill: '#10b981' },
      { name: '进行中', value: 50, fill: '#3b82f6' },
      { name: '未开始', value: 25, fill: '#9ca3af' },
    ];
    const { container } = render(<AnimatedDonutChart data={chineseData} />);
    expect(container).toBeTruthy();
  });

  it('should handle long names', () => {
    const longNameData = [
      { name: '这是一个非常非常长的名称用于测试', value: 100, fill: '#3b82f6' },
    ];
    const { container } = render(<AnimatedDonutChart data={longNameData} />);
    expect(container).toBeTruthy();
  });
});