import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorType: 'chunk_load' | 'generic' | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorType: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Check if it's a chunk loading error (common in lazy loading after redeploy)
    const isChunkError = error.message.includes('Failed to fetch dynamically imported module') || 
                        error.message.includes('Loading chunk') ||
                        error.name === 'ChunkLoadError';
    
    return { 
      hasError: true, 
      errorType: isChunkError ? 'chunk_load' : 'generic' 
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    
    // If it's a chunk load error, we can try to auto-reload once
    const isChunkError = error.message.includes('Failed to fetch dynamically imported module') || 
                        error.message.includes('Loading chunk') ||
                        error.name === 'ChunkLoadError';

    if (isChunkError) {
      const lastReload = localStorage.getItem('last_chunk_error_reload');
      const now = Date.now();
      
      // Only auto-reload if we haven't reloaded in the last 10 seconds to avoid loops
      if (!lastReload || now - parseInt(lastReload) > 10000) {
        localStorage.setItem('last_chunk_error_reload', now.toString());
        window.location.reload();
      }
    }
  }

  public render() {
    if (this.state.hasError) {
      if (this.state.errorType === 'chunk_load') {
        return (
          <div className="min-h-screen bg-[#F5F2ED] flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 bg-[#2D5A27]/10 rounded-full flex items-center justify-center mb-6">
              <RefreshCw className="w-10 h-10 text-[#2D5A27] animate-spin" />
            </div>
            <h1 className="text-xl font-black text-[#4A3728] mb-2">नया अपडेट उपलब्ध है</h1>
            <p className="text-sm text-gray-500 mb-8 max-w-xs mx-auto">
              हम App को ताज़ा कर रहे हैं ताकि आप सभी नए फीचर्स का उपयोग कर सकें।
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-[#2D5A27] text-white px-8 py-3 rounded-2xl font-black shadow-lg"
            >
              अभी Refresh करें
            </button>
          </div>
        );
      }

      return (
        <div className="min-h-screen bg-[#F5F2ED] flex flex-col items-center justify-center p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-xl font-black text-[#4A3728] mb-2">क्षमा करें, कुछ गलत हो गया</h1>
          <p className="text-sm text-gray-500 mb-8 max-w-xs mx-auto">
            App लोड करने में समस्या आई है। कृपया एक बार Refresh करें।
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-[#2D5A27] text-white px-8 py-3 rounded-2xl font-black shadow-lg"
          >
            Refresh करें
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
