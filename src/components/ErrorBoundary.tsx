import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showErrorDetails?: boolean;
  enableRetry?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  isExpanded: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, isExpanded: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined, isExpanded: false });
  };

  handleReload = () => {
    window.location.reload();
  };

  toggleExpanded = () => {
    this.setState((prev) => ({ isExpanded: !prev.isExpanded }));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full border border-gray-100">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-red-100 rounded-xl">
                <AlertTriangle className="text-red-500" size={32} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">出错了</h1>
                <p className="text-sm text-gray-500">应用程序遇到了一个意外错误</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  错误信息
                </span>
                <button
                  onClick={this.toggleExpanded}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                  aria-label={this.state.isExpanded ? '收起详情' : '展开详情'}
                >
                  {this.state.isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>

              <p className="text-sm text-gray-700 font-mono bg-white p-3 rounded-lg border border-gray-200">
                {this.state.error?.message || '未知错误'}
              </p>

              {this.state.isExpanded && this.state.errorInfo && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                    组件堆栈
                  </p>
                  <pre className="text-xs text-gray-600 font-mono bg-white p-3 rounded-lg border border-gray-200 overflow-x-auto max-h-40">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              {this.props.enableRetry !== false && (
                <button
                  onClick={this.handleReset}
                  className="flex items-center justify-center gap-2 py-3 px-4 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium"
                >
                  <RefreshCw size={18} />
                  重试
                </button>
              )}

              <button
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
              >
                <RefreshCw size={18} />
                刷新页面
              </button>

              <a
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = '/';
                }}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition-colors font-medium border border-gray-200"
              >
                <Home size={18} />
                返回首页
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

interface AsyncErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error) => void;
}

interface AsyncErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class AsyncErrorBoundary extends Component<AsyncErrorBoundaryProps, AsyncErrorBoundaryState> {
  constructor(props: AsyncErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): AsyncErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error('AsyncErrorBoundary caught an error:', error);
    if (this.props.onError) {
      this.props.onError(error);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-6 bg-red-50 rounded-xl border border-red-100">
          <AlertTriangle className="text-red-400 mb-3" size={24} />
          <p className="text-sm text-red-600 mb-3 text-center">
            {this.state.error?.message || '加载失败'}
          </p>
          <button
            onClick={this.handleReset}
            className="text-sm text-red-600 hover:text-red-700 font-medium"
          >
            重试
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}