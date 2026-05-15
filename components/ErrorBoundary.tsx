'use client';

import React from 'react';

interface State { error: Error | null }

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[F1 App Error]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="text-4xl">⚠️</div>
          <div className="text-xl font-bold text-[#e10600]">Error en la aplicación</div>
          <div className="text-gray-400 text-sm max-w-sm font-mono bg-[#1a1a1a] p-3 rounded-lg text-left break-all">
            {this.state.error.message}
          </div>
          <button
            onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            className="mt-2 px-6 py-3 bg-[#e10600] text-white font-bold rounded-lg hover:bg-red-700 transition-colors"
          >
            Recargar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
