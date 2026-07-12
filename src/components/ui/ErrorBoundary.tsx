import React, { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex h-full min-h-[150px] w-full flex-col items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/5 p-6 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400">
            <AlertTriangle size={20} />
          </div>
          <h4 className="mt-3 font-semibold text-slate-800 dark:text-sky-100">Panel Execution Failed</h4>
          <p className="mt-1 max-w-xs text-xs text-slate-400 dark:text-slate-500">
            {this.state.error?.message ?? 'An unexpected render error occurred inside this card.'}
          </p>
          <button
            onClick={this.handleReset}
            className="interactive-element mt-4 flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-sky-50 dark:bg-[#030C18] px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-sky-100 dark:hover:bg-slate-700 dark:bg-sky-950 hover:text-slate-800 dark:hover:text-slate-200 dark:text-sky-100"
          >
            <RefreshCw size={12} />
            Reset State
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
