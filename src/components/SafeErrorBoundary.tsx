import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class SafeErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[SafeErrorBoundary] Uncaught React Error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 my-4 bg-red-50/90 border border-red-200 rounded-3xl text-red-950 space-y-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-100 rounded-xl shrink-0 text-red-700">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-black text-red-900">
                {this.props.fallbackTitle || 'इस सेक्शन को प्रदर्शित करने में समस्या आई'}
              </h3>
              <p className="text-xs text-red-800 leading-relaxed font-medium">
                घबराएं नहीं, आपका बाकी एडमिन पैनल सुरक्षित है। कृपया नीचे दिए गए बटन से पुनः लोड करें।
              </p>
              {this.state.error?.message && (
                <div className="mt-2 p-2.5 bg-white/80 border border-red-100 rounded-xl font-mono text-[11px] text-red-600 select-all">
                  {this.state.error.message}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-98 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>दोबारा लोड करें</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default SafeErrorBoundary;
