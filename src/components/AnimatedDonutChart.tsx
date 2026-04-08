import React, { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';

interface DonutChartData {
  name: string;
  value: number;
  fill: string;
}

interface AnimatedDonutChartProps {
  data: DonutChartData[];
  size?: number;
  strokeWidth?: number;
  animationDuration?: number;
  showLegend?: boolean;
  legendPosition?: 'right' | 'bottom';
  title?: string;
  centerLabel?: string;
  centerValue?: number;
  cornerRadius?: number;
  ringOpacity?: number;
  blurAmount?: number;
  breathInterval?: number;
  onSegmentClick?: (segment: DonutChartData | null) => void;
  onSegmentHover?: (segment: DonutChartData | null) => void;
}

const THEME_CONTRAST_STYLES = {
  anime: {
    textPrimary: '#831843',
    textSecondary: '#581c87',
    textMuted: '#a21caf',
    centerValueBg: 'rgba(255,255,255,0.9)',
    legendValue: '#10b981',
  },
  dark: {
    textPrimary: '#ffffff',
    textSecondary: '#f3f4f6',
    textMuted: '#d1d5db',
    centerValueBg: 'rgba(0,0,0,0.3)',
    legendValue: '#10b981',
  },
  cyberpunk: {
    textPrimary: '#ffffff',
    textSecondary: '#cffafe',
    textMuted: '#67e8f9',
    centerValueBg: 'rgba(10,10,15,0.7)',
    legendValue: '#10b981',
  },
  linear: {
    textPrimary: '#ffffff',
    textSecondary: '#f3f4f6',
    textMuted: '#d1d5db',
    centerValueBg: 'rgba(13,13,15,0.7)',
    legendValue: '#86efac',
  },
  cosmos: {
    textPrimary: '#ffffff',
    textSecondary: '#cffafe',
    textMuted: '#67e8f9',
    centerValueBg: 'rgba(10,1,24,0.7)',
    legendValue: '#10b981',
  },
  classical: {
    textPrimary: '#1c1917',
    textSecondary: '#44403c',
    textMuted: '#57534e',
    centerValueBg: 'rgba(255,255,255,0.9)',
    legendValue: '#15803d',
  },
  minimal: {
    textPrimary: '#030712',
    textSecondary: '#1f2937',
    textMuted: '#374151',
    centerValueBg: 'rgba(255,255,255,0.95)',
    legendValue: '#15803d',
  },
} as const;

type ThemeKey = keyof typeof THEME_CONTRAST_STYLES;

interface SegmentData extends DonutChartData {
  startAngle: number;
  endAngle: number;
  percentage: number;
}

const MemoizedSegment: React.FC<MemoizedSegmentProps> = memo(({
  segment,
  index,
  center,
  outerRadius: _outerRadius,
  innerRadius: _innerRadius,
  isAnimating,
  animationProgress,
  isHovered,
  isSelected,
  blurAmount: _blurAmount,
  describeArcForFilled,
  onHover,
  onClick,
  hasBlur = true,
  cornerRadius = 8,
}) => {
  const displayedEndAngle = segment.startAngle + (segment.endAngle - segment.startAngle) * animationProgress;
  const path = describeArcForFilled(segment.startAngle, displayedEndAngle);
  const delay = index * 80;

  return (
    <g key={`segment-${index}`}>
      <path
        d={path}
        fill={`url(#donut-gradient-${index}-${segment.name.replace(/\s/g, '')})`}
        opacity={isAnimating ? 0 : (isHovered || isSelected ? 1 : 0.85)}
        filter={isHovered || isSelected ? 'url(#donut-glow)' : (hasBlur ? 'url(#donut-blur-edge)' : 'none')}
        style={{
          cursor: 'pointer',
          transition: `all 0.3s ease-out ${delay}ms`,
          transform: isHovered || isSelected ? 'scale(1.03)' : 'scale(1)',
          transformOrigin: `${center}px ${center}px`,
        }}
        strokeWidth={2}
        stroke={hasBlur ? `${segment.fill}30` : 'transparent'}
        strokeLinejoin={hasBlur ? 'round' : 'miter'}
        onClick={() => onClick(index)}
        onMouseEnter={() => onHover(index)}
        onMouseLeave={() => onHover(null)}
        role="button"
        aria-label={`${segment.name}: ${segment.value} (${Math.round(segment.percentage * 100)}%)`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick(index);
          }
        }}
      />
      {(isHovered || isSelected) && !isAnimating && (
        <path
          d={path}
          fill="none"
          stroke={segment.fill}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.8}
          style={{
            pointerEvents: 'none',
            transform: 'scale(1.02)',
            transformOrigin: `${center}px ${center}px`,
          }}
        />
      )}
    </g>
  );
});

MemoizedSegment.displayName = 'MemoizedSegment';

const CenterContent: React.FC<{
  hoveredSegment: SegmentData | null;
  selectedSegment: SegmentData | null;
  breathPhase: number;
  centerValue: number | undefined;
  total: number;
  centerLabel: string;
  fontSize: number;
  textPrimary: string;
  textSecondary: string;
}> = memo(({
  hoveredSegment,
  selectedSegment,
  breathPhase,
  centerValue,
  total,
  centerLabel,
  fontSize,
  textPrimary,
  textSecondary,
}) => {
  const activeSegment = hoveredSegment || selectedSegment;

  if (activeSegment) {
    return (
      <>
        <span
          className="font-bold transition-all duration-300"
          style={{
            color: activeSegment.fill,
            fontSize: fontSize * 0.8,
            transform: `scale(${1 + Math.sin(breathPhase) * 0.05})`,
            textShadow: `0 1px 3px rgba(0,0,0,0.5), 0 0 8px ${activeSegment.fill}40`,
            lineHeight: 1.2,
          }}
        >
          {activeSegment.value}
        </span>
        <span
          className="font-semibold transition-all duration-300"
          style={{
            color: textPrimary,
            fontSize: fontSize * 0.35,
            textShadow: `0 1px 3px rgba(0,0,0,0.4)`,
            lineHeight: 1.2,
            marginTop: '2px',
          }}
        >
          {activeSegment.name}
        </span>
        <span
          className="transition-all duration-300"
          style={{
            color: textSecondary,
            fontSize: fontSize * 0.3,
            textShadow: `0 1px 2px rgba(0,0,0,0.3)`,
            lineHeight: 1.2,
          }}
        >
          {Math.round(activeSegment.percentage * 100)}%
        </span>
      </>
    );
  }

  return (
    <>
      <span
        className="font-bold transition-all duration-300"
        style={{
          color: textPrimary,
          fontSize: fontSize,
          transform: `scale(${1 + Math.sin(breathPhase) * 0.03})`,
          textShadow: '0 1px 4px rgba(0,0,0,0.5)',
          lineHeight: 1.2,
        }}
      >
        {centerValue ?? total}
      </span>
      <span
        className="font-medium transition-all duration-300"
        style={{
          color: textSecondary,
          fontSize: fontSize * 0.35,
          textShadow: '0 1px 3px rgba(0,0,0,0.4)',
          lineHeight: 1.2,
          marginTop: '2px',
        }}
      >
        {centerLabel}
      </span>
    </>
  );
});

CenterContent.displayName = 'CenterContent';

const LegendItem: React.FC<{
  segment: SegmentData;
  index: number;
  isHovered: boolean;
  isSelected: boolean;
  isAnimating: boolean;
  cornerRadius: number;
  onHover: (index: number | null) => void;
  onClick: (index: number) => void;
  textPrimary: string;
  textSecondary: string;
}> = memo(({
  segment,
  index,
  isHovered,
  isSelected,
  isAnimating,
  cornerRadius,
  onHover,
  onClick,
  textPrimary,
  textSecondary,
}) => {
  const delay = index * 60 + 400;

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 cursor-pointer transition-all duration-300"
      style={{
        backgroundColor: isSelected ? `${segment.fill}20` : (isHovered ? `${segment.fill}12` : 'transparent'),
        border: `2px solid ${isSelected ? segment.fill : (isHovered ? `${segment.fill}60` : 'transparent')}`,
        borderRadius: `${cornerRadius}px`,
        opacity: isAnimating ? 0 : 1,
        transform: `translateX(${isAnimating ? '-8px' : '0'}) scale(${isSelected ? 1.02 : 1})`,
        transitionDelay: `${delay}ms`,
        boxShadow: isSelected ? `0 0 12px ${segment.fill}40` : 'none',
      }}
      onClick={() => onClick(index)}
      onMouseEnter={() => onHover(index)}
      onMouseLeave={() => onHover(null)}
      role="button"
      aria-label={`${segment.name}: ${segment.value}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(index);
        }
      }}
    >
      <div
        className="w-3 h-3 flex-shrink-0"
        style={{
          backgroundColor: segment.fill,
          borderRadius: `${cornerRadius}px`,
          boxShadow: isHovered || isSelected ? `0 0 8px ${segment.fill}80` : `0 0 4px ${segment.fill}40`,
          transform: `scale(${isHovered || isSelected ? 1.2 : 1})`,
          transition: 'transform 0.2s ease-out, box-shadow 0.2s ease-out',
        }}
      />
      <div className="flex flex-col min-w-0 flex-1">
        <span
          className="text-xs font-semibold truncate"
          style={{ color: textPrimary, textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}
          title={segment.name}
        >
          {segment.name}
        </span>
        <div className="flex items-center gap-1">
          <span className="text-xs font-bold" style={{ color: segment.fill, textShadow: '0 1px 2px rgba(0,0,0,0.15)' }}>
            {segment.value}
          </span>
          <span className="text-xs opacity-80" style={{ color: textSecondary, textShadow: '0 1px 2px rgba(0,0,0,0.15)' }}>
            ({Math.round(segment.percentage * 100)}%)
          </span>
        </div>
      </div>
    </div>
  );
});

LegendItem.displayName = 'LegendItem';

const AnimatedDonutChart: React.FC<AnimatedDonutChartProps> = memo(({
  data,
  size = 200,
  strokeWidth = 20,
  animationDuration = 1800,
  showLegend = true,
  legendPosition = 'right',
  title,
  centerLabel = '总计',
  centerValue,
  cornerRadius = 8,
  ringOpacity = 0.3,
  blurAmount = 8,
  breathInterval = 3,
  onSegmentClick,
  onSegmentHover,
}) => {
  const { theme } = useTheme();
  const [isAnimating, setIsAnimating] = useState(true);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<number | null>(null);
  const [breathPhase, setBreathPhase] = useState(0);

  const themeContrast = THEME_CONTRAST_STYLES[theme as ThemeKey] || THEME_CONTRAST_STYLES.dark;

  const svgSize = size + 20;
  const center = svgSize / 2;
  const outerRadius = (size - strokeWidth) / 2;
  const innerRadius = outerRadius - strokeWidth;

  const fontSize = Math.max(20, Math.min(size * 0.18, 36));

  const total = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data]);

  const segments = useMemo<SegmentData[]>(() => {
    if (total === 0) return [];
    let currentAngle = -90;
    return data.map((item) => {
      const percentage = item.value / total;
      const angleSpan = percentage * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angleSpan;
      currentAngle = endAngle;
      return { ...item, startAngle, endAngle, percentage };
    });
  }, [data, total]);

  const legendColumns = useMemo(() => Math.ceil(Math.sqrt(segments.length)), [segments.length]);

  const animationRef = useRef<number | null>(null);
  const breathRef = useRef<number | null>(null);

  useEffect(() => {
    setIsAnimating(true);
    setAnimationProgress(0);
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setAnimationProgress(easeOut);
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [data, animationDuration]);

  useEffect(() => {
    if (isAnimating) return;
    let lastTime = performance.now();
    const duration = breathInterval * 1000;

    const breathe = (currentTime: number) => {
      const delta = currentTime - lastTime;
      lastTime = currentTime;
      setBreathPhase((prev) => (prev + (delta / duration) * 2 * Math.PI) % (2 * Math.PI));
      breathRef.current = requestAnimationFrame(breathe);
    };

    breathRef.current = requestAnimationFrame(breathe);
    return () => {
      if (breathRef.current) cancelAnimationFrame(breathRef.current);
    };
  }, [isAnimating, breathInterval]);

  const describeArcForFilled = useCallback((startAngle: number, endAngle: number): string => {
    const gap = 2;
    const gapStartAngle = startAngle + gap;
    const gapEndAngle = endAngle - gap;

    if (gapEndAngle <= gapStartAngle) {
      const midAngle = (startAngle + endAngle) / 2;
      const x = center + outerRadius * Math.cos((midAngle * Math.PI) / 180);
      const y = center + outerRadius * Math.sin((midAngle * Math.PI) / 180);
      return `M ${x} ${y} L ${x} ${y}`;
    }

    const angleSpan = endAngle - startAngle - gap * 2;

    if (segments.length === 1 && angleSpan >= 355) {
      const r = outerRadius;
      const innerR = innerRadius;
      const gapDeg = 3;

      const p1x = center + r * Math.cos(((-90 + gapDeg) * Math.PI) / 180);
      const p1y = center + r * Math.sin(((-90 + gapDeg) * Math.PI) / 180);
      const p2x = center + r * Math.cos(((270 - gapDeg) * Math.PI) / 180);
      const p2y = center + r * Math.sin(((270 - gapDeg) * Math.PI) / 180);
      const p3x = center + innerR * Math.cos(((270 - gapDeg) * Math.PI) / 180);
      const p3y = center + innerR * Math.sin(((270 - gapDeg) * Math.PI) / 180);
      const p4x = center + innerR * Math.cos(((-90 + gapDeg) * Math.PI) / 180);
      const p4y = center + innerR * Math.sin(((-90 + gapDeg) * Math.PI) / 180);

      return `M ${p1x} ${p1y} A ${r} ${r} 0 1 1 ${p2x} ${p2y} L ${p3x} ${p3y} A ${innerR} ${innerR} 0 1 0 ${p4x} ${p4y} Z`;
    }

    const outerStartAngle = gapStartAngle;
    const outerEndAngle = gapEndAngle;
    const innerStartAngle = gapEndAngle;
    const innerEndAngle = gapStartAngle;

    const outerStart = {
      x: center + outerRadius * Math.cos((outerStartAngle * Math.PI) / 180),
      y: center + outerRadius * Math.sin((outerStartAngle * Math.PI) / 180),
    };
    const outerEnd = {
      x: center + outerRadius * Math.cos((outerEndAngle * Math.PI) / 180),
      y: center + outerRadius * Math.sin((outerEndAngle * Math.PI) / 180),
    };
    const innerEnd = {
      x: center + innerRadius * Math.cos((innerEndAngle * Math.PI) / 180),
      y: center + innerRadius * Math.sin((innerEndAngle * Math.PI) / 180),
    };
    const innerStart = {
      x: center + innerRadius * Math.cos((innerStartAngle * Math.PI) / 180),
      y: center + innerRadius * Math.sin((innerStartAngle * Math.PI) / 180),
    };

    const largeArcFlag = angleSpan > 180 ? 1 : 0;

    return [
      'M', outerStart.x, outerStart.y,
      'A', outerRadius, outerRadius, 0, largeArcFlag, 1, outerEnd.x, outerEnd.y,
      'L', innerStart.x, innerStart.y,
      'A', innerRadius, innerRadius, 0, largeArcFlag, 0, innerEnd.x, innerEnd.y,
      'Z'
    ].join(' ');
  }, [center, outerRadius, innerRadius, segments.length]);

  const handleSegmentClick = useCallback((index: number) => {
    const newSelected = selectedSegment === index ? null : index;
    setSelectedSegment(newSelected);
    onSegmentClick?.(newSelected !== null ? segments[newSelected] : null);
  }, [selectedSegment, segments, onSegmentClick]);

  const handleSegmentHover = useCallback((index: number | null) => {
    setHoveredSegment(index);
    onSegmentHover?.(index !== null ? segments[index] : null);
  }, [segments, onSegmentHover]);

  const breathScale = 1 + Math.sin(breathPhase) * 0.015;
  const breathGlow = 0.15 + Math.sin(breathPhase) * 0.1;

  const activeSegment = hoveredSegment !== null ? segments[hoveredSegment] : (selectedSegment !== null ? segments[selectedSegment] : null);

  const renderChart = () => {
    if (total === 0) {
      return (
        <div
          className="relative flex items-center justify-center"
          style={{ width: svgSize, height: svgSize }}
          role="img"
          aria-label="无数据"
        >
          <svg width={svgSize} height={svgSize}>
            <circle
              cx={center}
              cy={center}
              r={outerRadius - strokeWidth / 2}
              fill="none"
              stroke="var(--border-color, #e2e8f0)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              opacity="0.15"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold" style={{ color: themeContrast.textPrimary }}>0</span>
            <span className="text-xs" style={{ color: themeContrast.textSecondary }}>暂无数据</span>
          </div>
        </div>
      );
    }

    return (
      <div
        className="relative flex items-center justify-center"
        style={{ width: svgSize, height: svgSize }}
        role="img"
        aria-label={`环形图: ${title || '数据分布'}`}
      >
        <svg
          width={svgSize}
          height={svgSize}
          style={{ overflow: 'visible', display: 'block' }}
          aria-hidden="true"
        >
          <defs>
            {segments.map((seg, i) => (
              <linearGradient
                key={`gradient-${i}`}
                id={`donut-gradient-${i}-${seg.name.replace(/\s/g, '')}`}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor={seg.fill} />
                <stop offset="100%" stopColor={seg.fill} stopOpacity="0.7" />
              </linearGradient>
            ))}
            <filter id="donut-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation={blurAmount} result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="donut-blur" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation={blurAmount / 2} />
            </filter>
            <filter id="donut-blur-edge" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation={blurAmount * 0.75} result="edgeBlur" />
              <feMorphology operator="dilate" radius="1" result="dilated" />
              <feGaussianBlur stdDeviation={1} result="softEdge" />
              <feMerge>
                <feMergeNode in="softEdge" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <circle
            cx={center}
            cy={center}
            r={outerRadius}
            fill={`rgba(0,0,0,${ringOpacity * breathGlow})`}
            filter="url(#donut-blur)"
            className="transition-all duration-1000"
            style={{ opacity: breathGlow }}
            aria-hidden="true"
          />

          <g
            style={{
              transformOrigin: `${center}px ${center}px`,
            }}
            aria-hidden="true"
          >
            <g style={{
              transform: `scale(${breathScale})`,
              transformOrigin: `${center}px ${center}px`,
              transition: 'transform 0.1s linear',
            }}>
              {segments.map((seg, index) => (
                <MemoizedSegment
                  key={`segment-${index}`}
                  segment={seg}
                  index={index}
                  center={center}
                  outerRadius={outerRadius}
                  innerRadius={innerRadius}
                  isAnimating={isAnimating}
                  animationProgress={animationProgress}
                  isHovered={hoveredSegment === index}
                  isSelected={selectedSegment === index}
                  blurAmount={blurAmount}
                  describeArcForFilled={describeArcForFilled}
                  onHover={handleSegmentHover}
                  onClick={handleSegmentClick}
                  hasBlur={true}
                  cornerRadius={cornerRadius}
                />
              ))}
            </g>
          </g>
        </svg>

        <div
          className="absolute flex flex-col items-center justify-center pointer-events-none"
          style={{
            width: size,
            height: size,
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
          aria-live="polite"
        >
          <CenterContent
            hoveredSegment={activeSegment}
            selectedSegment={selectedSegment !== null ? segments[selectedSegment] : null}
            breathPhase={breathPhase}
            centerValue={centerValue}
            total={total}
            centerLabel={centerLabel}
            fontSize={fontSize}
            textPrimary={themeContrast.textPrimary}
            textSecondary={themeContrast.textSecondary}
          />
        </div>
      </div>
    );
  };

  const renderLegend = () => {
    if (total === 0 || !showLegend) return null;

    const rows: SegmentData[][] = [];
    for (let i = 0; i < segments.slice(0, 6).length; i += legendColumns) {
      rows.push(segments.slice(0, 6).slice(i, i + legendColumns));
    }

    return (
      <div
        className="flex flex-col gap-2 flex-1"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${legendColumns}, 1fr)`,
          gap: '8px',
        }}
        role="list"
        aria-label="图例"
      >
        {rows.map((row, rowIndex) => (
          <div key={`row-${rowIndex}`} className="contents">
            {row.map((seg) => {
              const absoluteIndex = segments.indexOf(seg);
              return (
                <LegendItem
                  key={`legend-${absoluteIndex}`}
                  segment={seg}
                  index={absoluteIndex}
                  isHovered={hoveredSegment === absoluteIndex}
                  isSelected={selectedSegment === absoluteIndex}
                  isAnimating={isAnimating}
                  cornerRadius={cornerRadius}
                  onHover={handleSegmentHover}
                  onClick={handleSegmentClick}
                  textPrimary={themeContrast.textPrimary}
                  textSecondary={themeContrast.textSecondary}
                />
              );
            })}
          </div>
        ))}
        {segments.length > 6 && (
          <div
            className="text-xs px-2 py-1 text-center col-span-full"
            style={{ color: themeContrast.textSecondary }}
          >
            +{segments.length - 6} 更多
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col" role="figure" aria-label={title || '环形图'}>
      {title && (
        <h4
          className="text-sm font-semibold mb-3 text-center"
          style={{ color: themeContrast.textSecondary }}
        >
          {title}
        </h4>
      )}
      {legendPosition === 'bottom' ? (
        <div className="flex flex-col items-center gap-4">
          {renderChart()}
          {renderLegend()}
        </div>
      ) : (
        <div className="flex items-center gap-5 flex-wrap justify-center">
          {renderChart()}
          {renderLegend()}
        </div>
      )}
    </div>
  );
});

AnimatedDonutChart.displayName = 'AnimatedDonutChart';

export default AnimatedDonutChart;
export type { DonutChartData, AnimatedDonutChartProps };