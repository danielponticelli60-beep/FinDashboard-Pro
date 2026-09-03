import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Label shown in the fallback UI, e.g. "Dashboard" or "Transazioni". */
  fallbackLabel: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.fallbackLabel}]`, error, info.componentStack);
  }

  private reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="w-full rounded-xl border border-rose-500/30 bg-rose-500/5 p-6 flex flex-col items-center text-center gap-3">
        <AlertTriangle className="w-8 h-8 text-rose-400" />
        <div>
          <p className="text-sm font-semibold text-rose-300">
            Si è verificato un errore in "{this.props.fallbackLabel}"
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Il resto dell'app continua a funzionare. I tuoi dati locali non sono stati modificati.
          </p>
          {error.message && (
            <p className="text-[11px] text-slate-500 mt-2 font-mono break-all">{error.message}</p>
          )}
        </div>
        <button
          onClick={this.reset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-slate-100 border border-slate-800 transition text-xs"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Riprova</span>
        </button>
      </div>
    );
  }
}
