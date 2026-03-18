import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="text-red-500" size={32} />
              <h1 className="text-xl font-semibold text-gray-800">出现错误</h1>
            </div>
            <p className="text-gray-600 mb-4">
              应用程序遇到了一个意外错误。请尝试刷新页面或重置应用状态。
            </p>
            {this.state.error && (
              <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                <p className="text-sm text-red-700 font-mono">{this.state.error.message}</p>
              </div>
            )}
            <button
              onClick={this.handleReset}
              className="flex items-center justify-center gap-2 w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <RefreshCw size={18} />
              重试
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
