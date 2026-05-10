"use client";
import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="error-state">
            <AlertTriangle size={40} />
            <h3>Something went wrong</h3>
            <p>{this.state.error?.message || "Failed to load data"}</p>
            <button
              className="filter-btn active"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
            >
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}

// Inline error state for fetch failures (not React errors)
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="error-state">
      <AlertTriangle size={40} />
      <h3>Failed to load data</h3>
      <p>{message}</p>
      {onRetry && (
        <button className="filter-btn active" onClick={onRetry}>
          <RefreshCw size={14} style={{ marginRight: 6 }} /> Retry
        </button>
      )}
    </div>
  );
}
