"use client";

import React from "react";

type SafeRenderBoundaryProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

type SafeRenderBoundaryState = {
  hasError: boolean;
};

export class SafeRenderBoundary extends React.Component<
  SafeRenderBoundaryProps,
  SafeRenderBoundaryState
> {
  state: SafeRenderBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("SafeRenderBoundary caught an error", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }

    return this.props.children;
  }
}
