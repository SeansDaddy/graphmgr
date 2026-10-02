import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 my-6 bg-white border border-rose-200 rounded-2xl shadow-sm text-center max-w-xl mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {this.props.fallbackTitle || '页面组件加载提示'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {this.state.error?.message || '组件渲染遇到轻微异常，已为您隔离保护'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>重新加载视图</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
