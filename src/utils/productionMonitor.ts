interface MonitorErrorEvent {
  id: string;
  timestamp: number;
  type: 'error' | 'warning' | 'unhandled' | 'promise';
  message: string;
  stack?: string;
  source?: string;
  lineno?: number;
  colno?: number;
  url: string;
  userAgent: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

interface PerformanceEntry {
  timestamp: number;
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

interface PerformanceObserverEntry {
  processingStart?: number;
  duration?: number;
  hadRecentInput?: boolean;
  value?: number;
  responseStart?: number;
  startTime: number;
}

interface MonitoringConfig {
  enabled: boolean;
  environment: 'development' | 'staging' | 'production';
  maxErrors: number;
  sampleRate: number; // 0-1
  endpoint?: string;
  consoleCapture: boolean;
  performanceMonitoring: boolean;
}

const DEFAULT_CONFIG: MonitoringConfig = {
  enabled: process.env.NODE_ENV === 'production',
  environment: (process.env.NODE_ENV as MonitoringConfig['environment']) || 'development',
  maxErrors: 100,
  sampleRate: 1.0,
  consoleCapture: false,
  performanceMonitoring: true,
};

class ProductionMonitor {
  private config: MonitoringConfig;
  private errors: MonitorErrorEvent[] = [];
  private performanceEntries: PerformanceEntry[] = [];
  private sessionId: string;
  private userId: string | null = null;
  private isInitialized: boolean = false;

  constructor(config: Partial<MonitoringConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  init(userId?: string): void {
    if (!this.config.enabled) return;

    this.userId = userId || null;
    this.isInitialized = true;

    // Capture uncaught errors
    window.addEventListener('error', this.handleGlobalError);
    
    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);

    // Capture console errors if enabled
    if (this.config.consoleCapture) {
      this.captureConsole();
    }

    // Start performance monitoring if enabled
    if (this.config.performanceMonitoring) {
      this.startPerformanceMonitoring();
    }

    console.log('[ProductionMonitor] Initialized', { sessionId: this.sessionId });
  }

  destroy(): void {
    window.removeEventListener('error', this.handleGlobalError);
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);

    this.errors = [];
    this.performanceEntries = [];
    this.isInitialized = false;
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  // Error handling methods
  private handleGlobalError = (event: ErrorEvent): void => {
    if (!this.shouldSample()) return;

    const error: MonitorErrorEvent = {
      id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type: 'error',
      message: event.message || 'Unknown error',
      stack: event.error?.stack,
      source: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      url: window.location.href,
      userAgent: navigator.userAgent,
      userId: this.userId || undefined,
    };

    this.captureError(error);
  };

  private handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
    if (!this.shouldSample()) return;

    const error: MonitorErrorEvent = {
      id: `promise_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type: 'promise',
      message: event.reason?.message || String(event.reason) || 'Unhandled promise rejection',
      stack: event.reason?.stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      userId: this.userId || undefined,
    };

    this.addError(error);
  };

  captureError(error: Error | string | MonitorErrorEvent, metadata?: Record<string, any>): void {
    if (!this.isInitialized || !this.shouldSample()) return;

    let errorObj: MonitorErrorEvent;

    if (typeof error === 'object' && 'id' in error && 'timestamp' in error) {
      errorObj = error as MonitorErrorEvent;
    } else {
      errorObj = {
        id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        type: 'error',
        message: typeof error === 'string' ? error : error.message,
        stack: error instanceof Error ? error.stack : undefined,
        url: window.location.href,
        userAgent: navigator.userAgent,
        userId: this.userId || undefined,
        metadata,
      };
    }

    this.addError(errorObj);
  }

  private addError(error: MonitorErrorEvent): void {

    // Trim to max size
    if (this.errors.length > this.config.maxErrors) {
      this.errors.shift();
    }

    this.errors.push(error);

    // Send to remote endpoint if configured
    if (this.config.endpoint) {
      this.sendToEndpoint(error);
    }
  }

  captureWarning(message: string, metadata?: Record<string, any>): void {
    const warning: MonitorErrorEvent = {
      id: `warn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type: 'warning',
      message,
      url: window.location.href,
      userAgent: navigator.userAgent,
      userId: this.userId || undefined,
      metadata,
    };

    this.errors.push(warning);
  }

  getErrors(): MonitorErrorEvent[] {
    return [...this.errors];
  }

  clearErrors(): void {
    this.errors = [];
  }

  // Performance monitoring methods
  private startPerformanceMonitoring(): void {
    // Observe Core Web Vitals
    if ('PerformanceObserver' in window) {
      try {
        // LCP (Largest Contentful Paint)
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordPerformance('LCP', entry.startTime, this.rateLCP(entry.startTime));
          }
        }).observe({ type: 'largest-contentful-paint', buffered: true });

        // FID (First Input Delay)
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordPerformance('FID', ((entry as unknown as PerformanceObserverEntry).processingStart ?? 0) - entry.startTime, this.rateFID((entry as unknown as PerformanceObserverEntry).duration || 0));
          }
        }).observe({ type: 'first-input', buffered: true });

        // CLS (Cumulative Layout Shift)
        let clsValue = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as unknown as PerformanceObserverEntry).hadRecentInput) {
              clsValue += (entry as unknown as PerformanceObserverEntry).value || 0;
            }
          }
          this.recordPerformance('CLS', clsValue, this.rateCLS(clsValue));
        }).observe({ type: 'layout-shift', buffered: true });

        // TTFB (Time to First Byte)
        const navigation = performance.getEntriesByType('navigation')[0] as unknown as PerformanceObserverEntry;
        if (navigation?.responseStart) {
          this.recordPerformance('TTFB', navigation.responseStart, this.rateTTFB(navigation.responseStart));
        }
      } catch {
        console.warn('[ProductionMonitor] Performance monitoring not fully supported');
      }
    }
  }

  recordPerformance(name: string, value: number, rating: PerformanceEntry['rating']): void {
    const entry: PerformanceEntry = {
      timestamp: Date.now(),
      name,
      value,
      rating,
    };

    this.performanceEntries.push(entry);

    // Keep only last 100 entries
    if (this.performanceEntries.length > 100) {
      this.performanceEntries.shift();
    }
  }

  getPerformanceMetrics(): PerformanceEntry[] {
    return [...this.performanceEntries];
  }

  getCoreWebVitals(): {
    lcp?: PerformanceEntry;
    fid?: PerformanceEntry;
    cls?: PerformanceEntry;
    ttfb?: PerformanceEntry;
  } {
    const metrics: ReturnType<typeof this.getCoreWebVitals> = {};

    for (const entry of this.performanceEntries) {
      switch (entry.name) {
        case 'LCP':
          metrics.lcp = entry;
          break;
        case 'FID':
          metrics.fid = entry;
          break;
        case 'CLS':
          metrics.cls = entry;
          break;
        case 'TTFB':
          metrics.ttfb = entry;
          break;
      }
    }

    return metrics;
  }

  // Rating functions for Core Web Vitals
  private rateLCP(value: number): PerformanceEntry['rating'] {
    if (value <= 2500) return 'good';
    if (value <= 4000) return 'needs-improvement';
    return 'poor';
  }

  private rateFID(value: number): PerformanceEntry['rating'] {
    if (value <= 100) return 'good';
    if (value <= 300) return 'needs-improvement';
    return 'poor';
  }

  private rateCLS(value: number): PerformanceEntry['rating'] {
    if (value <= 0.1) return 'good';
    if (value <= 0.25) return 'needs-improvement';
    return 'poor';
  }

  private rateTTFB(value: number): PerformanceEntry['rating'] {
    if (value <= 800) return 'good';
    if (value <= 1800) return 'needs-improvement';
    return 'poor';
  }

  // Utility methods
  private shouldSample(): boolean {
    return Math.random() < this.config.sampleRate;
  }

  private async sendToEndpoint(error: MonitorErrorEvent): Promise<void> {
    if (!this.config.endpoint) return;

    try {
      await fetch(this.config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...error,
          session: this.sessionId,
          config: this.config.environment,
        }),
      });
    } catch {
      // Silent fail for reporting
    }
  }

  private captureConsole(): void {
    const originalError = console.error;
    const originalWarn = console.warn;

    console.error = (...args: any[]) => {
      this.captureWarning(`[Console Error]: ${args.join(' ')}`);
      originalError.apply(console, args);
    };

    console.warn = (...args: any[]) => {
      this.captureWarning(`[Console Warning]: ${args.join(' ')}`);
      originalWarn.apply(console, args);
    };
  }

  generateReport(): {
    sessionInfo: {
      sessionId: string;
      startTime: number;
      duration: number;
      totalErrors: number;
    };
    errors: MonitorErrorEvent[];
    coreWebVitals: ReturnType<ProductionMonitor['getCoreWebVitals']>;
    summary: {
      errorCount: number;
      warningCount: number;
      averageLCP: number | null;
      averageFID: number | null;
      averageCLS: number | null;
    };
  } {
    const now = Date.now();

    const errorCount = this.errors.filter(e => e.type === 'error').length;
    const warningCount = this.errors.filter(e => e.type === 'warning').length;

    const coreWebVitals = this.getCoreWebVitals();

    return {
      sessionInfo: {
        sessionId: this.sessionId,
        startTime: this.sessionId ? parseInt(this.sessionId.split('-')[0]) : now,
        duration: now - (this.sessionId ? parseInt(this.sessionId.split('-')[0]) : now),
        totalErrors: this.errors.length,
      },
      errors: [...this.errors],
      coreWebVitals,
      summary: {
        errorCount,
        warningCount,
        averageLCP: coreWebVitals.lcp?.value ?? null,
        averageFID: coreWebVitals.fid?.value ?? null,
        averageCLS: coreWebVitals.cls?.value ?? null,
      },
    };
  }
}

// Singleton instance
let monitorInstance: ProductionMonitor | null = null;

export function initProductionMonitor(config?: Partial<MonitoringConfig>, userId?: string): ProductionMonitor {
  if (!monitorInstance) {
    monitorInstance = new ProductionMonitor(config);
  }
  
  monitorInstance.init(userId);
  return monitorInstance;
}

export function getProductionMonitor(): ProductionMonitor {
  if (!monitorInstance) {
    monitorInstance = new ProductionMonitor();
  }
  return monitorInstance;
}

export function destroyProductionMonitor(): void {
  if (monitorInstance) {
    monitorInstance.destroy();
    monitorInstance = null;
  }
}
