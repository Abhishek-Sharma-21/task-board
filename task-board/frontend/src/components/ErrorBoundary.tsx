import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-page text-text-primary p-6 font-sans">
          <div className="max-w-md w-full border-2 border-danger/40 bg-surface p-6 rounded-sm shadow-theme-xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto text-xl font-bold font-mono">
              !
            </div>
            <h2 className="text-xl font-black uppercase text-text-primary tracking-tight">
              Something went wrong
            </h2>
            <p className="text-xs text-text-muted font-mono leading-relaxed">
              An unexpected application error occurred. You can reload the page to restore the application state.
            </p>
            {this.state.error?.message && (
              <div className="p-3 bg-surface-hover border border-border text-[11px] font-mono text-text-secondary text-left rounded-sm truncate">
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={this.handleReload}
              className="w-full bg-primary hover:bg-primary-hover text-white text-xs font-mono font-bold uppercase tracking-wider py-2.5 rounded-sm transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
