"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[Uncaught Client Exception Caught]:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="shell min-h-[50vh] grid place-items-center py-12 text-center">
          <div className="glass-card max-w-md p-8 border border-white/10 space-y-4">
            <h2 className="text-xl font-bold text-white">Something went wrong</h2>
            <p className="text-xs text-zinc-400">
              A temporary client-side error occurred. Your session is safe.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false });
                window.location.reload();
              }}
              className="px-5 py-2.5 rounded-xl brand-gradient font-bold text-white text-xs"
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
