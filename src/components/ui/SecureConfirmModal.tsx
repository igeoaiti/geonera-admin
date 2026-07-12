import { createContext, useContext, useState, ReactNode } from 'react'
import { ShieldAlert, X } from 'lucide-react'
import { clsx } from 'clsx'
import { setActionSecret } from '@/lib/api'

interface ConfirmOptions {
  title?: string
  message?: string
  actionLabel?: string
  onConfirm: () => void
}

interface SecureConfirmContextType {
  requireConfirmation: (options: ConfirmOptions) => void
}

const SecureConfirmContext = createContext<SecureConfirmContextType | null>(null)

export function useSecureConfirm() {
  const ctx = useContext(SecureConfirmContext)
  if (!ctx) throw new Error('useSecureConfirm must be used within SecureConfirmProvider')
  return ctx
}

export function SecureConfirmProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [options, setOptions] = useState<ConfirmOptions | null>(null)

  const requireConfirmation = (opts: ConfirmOptions) => {
    setOptions(opts)
    setInput('')
    setIsOpen(true)
  }

  const handleClose = () => {
    setIsOpen(false)
    setOptions(null)
    setInput('')
    // We do NOT clear setActionSecret('') here because the mutation might still be in-flight
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.length > 0 && options) {
      setActionSecret(input)
      options.onConfirm()
      handleClose()
    }
  }

  const isMatch = input.length === 40 // SHA1 is 40 characters
  const isError = input.length > 0 && input.length !== 40

  return (
    <SecureConfirmContext.Provider value={{ requireConfirmation }}>
      {children}
      
      {isOpen && options && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-[420px] max-w-[90vw] overflow-hidden rounded-2xl border border-rose-500/20 bg-white dark:bg-[#071628] shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col border-b border-rose-500/20 bg-rose-500/5 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                  <ShieldAlert size={20} className={clsx(isMatch ? 'text-emerald-500' : '')} />
                  <h3 className="font-semibold tracking-wide">{options.title || 'Security Confirmation Required'}</h3>
                </div>
                <button
                  onClick={handleClose}
                  className="rounded-lg p-1 text-slate-400 hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              {options.message && (
                <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                  {options.message}
                </p>
              )}
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Enter SHA1 Authorization Key
              </label>
              <input
                type="text"
                autoFocus
                placeholder="Enter 40-character SHA1 hash..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className={clsx(
                  "w-full rounded-xl border bg-slate-50 dark:bg-[#040E1C] px-4 py-3 font-mono text-sm shadow-inner outline-none transition-all",
                  isMatch
                    ? "border-emerald-500/50 text-emerald-600 dark:text-emerald-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                    : isError
                    ? "border-rose-500/50 text-rose-600 dark:text-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10"
                    : "border-slate-300 dark:border-sky-900/40 text-slate-800 dark:text-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10"
                )}
              />
              
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 rounded-xl border border-slate-300 dark:border-sky-900/30 bg-white dark:bg-[#071628] px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isMatch}
                  className="flex-1 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {options.actionLabel || 'Confirm Action'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SecureConfirmContext.Provider>
  )
}
