import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorReportingWindow extends Window {
  errorReporting?: {
    captureException: (error: Error, info: Record<string, unknown>) => void;
  };
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, resetError: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorBoundary] Caught an error:', error, errorInfo);
    }

    // Call custom error handler
    this.props.onError?.(error, errorInfo);

    // Report to error monitoring service (if available)
    if (typeof window !== 'undefined' && (window as ErrorReportingWindow).errorReporting) {
      try {
        (window as ErrorReportingWindow).errorReporting?.captureException(error, { extra: errorInfo });
      } catch {
        // Ignore reporting errors
      }
    }
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const { fallback } = this.props;

      // Custom fallback
      if (fallback) {
        if (typeof fallback === 'function') {
          return fallback(this.state.error!, this.handleReset);
        }
        return fallback;
      }

      // Default fallback UI
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          padding: '40px',
          background: '#fff3f3',
          border: '1px solid #ffcccc',
          borderRadius: '8px',
          margin: '20px',
        }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '16px',
          }}>
            ⚠️
          </div>
          
          <h2 style={{
            color: '#d32f2f',
            marginBottom: '12px',
            fontSize: '24px',
            fontWeight: 600,
          }}>
            出现了一些问题
          </h2>

          <p style={{
            color: '#666',
            textAlign: 'center',
            maxWidth: '500px',
            marginBottom: '24px',
            lineHeight: 1.5,
          }}>
            {this.state.error?.message || '应用程序遇到了意外错误'}
          </p>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{
              width: '100%',
              maxWidth: '600px',
              marginBottom: '16px',
              textAlign: 'left',
            }}>
              <summary
                style={{
                  cursor: 'pointer',
                  color: '#999',
                  userSelect: 'none',
                }}
              >
                查看详细错误信息（仅开发环境）
              </summary>
              
              <pre style={{
                marginTop: '12px',
                padding: '12px',
                background: '#f5f5f5',
                borderRadius: '4px',
                overflow: 'auto',
                fontSize: '12px',
                lineHeight: 1.4,
                maxHeight: '200px',
              }}>
                {this.state.error.toString()}
                {'\n\n'}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={this.handleReset}
              style={{
                padding: '10px 24px',
                background: '#1976d2',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                transition: 'background 0.2s',
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#1565c0'}
              onMouseOut={(e) => e.currentTarget.style.background = '#1976d2'}
            >
              重试
            </button>
            
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 24px',
                background: '#757575',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                transition: 'background 0.2s',
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#616161'}
              onMouseOut={(e) => e.currentTarget.style.background = '#757575'}
            >
              刷新页面
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC wrapper for easier usage
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ErrorBoundaryProps['fallback'],
  onError?: ErrorBoundaryProps['onError']
): React.FC<P> {
  const WithErrorBoundary: React.FC<P> = (props) => (
    <ErrorBoundary fallback={fallback} onError={onError}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  const displayName =
    WrappedComponent.displayName || WrappedComponent.name || 'Component';
  WithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;

  return WithErrorBoundary;
}

export default ErrorBoundary;
