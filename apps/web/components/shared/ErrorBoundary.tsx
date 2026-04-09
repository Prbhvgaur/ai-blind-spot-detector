"use client";

import { Component, type ReactNode } from "react";

export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="border border-critical/40 bg-critical/10 p-6 font-mono text-sm text-red-200">
          Something broke while rendering this view.
        </div>
      );
    }

    return this.props.children;
  }
}

