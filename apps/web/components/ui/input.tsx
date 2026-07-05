import { InputHTMLAttributes, forwardRef } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, Props>(({ label, error, className = '', ...props }, ref) => (
  <div className="flex flex-col gap-1.5">
    {label && <label className="text-sm font-medium text-[var(--text-soft)]">{label}</label>}
    <input
      ref={ref}
      className={`w-full px-4 py-3 rounded-xl bg-[var(--track)] border ${error ? 'border-red-500/60' : 'border-[var(--border)]'} text-[var(--text)] placeholder-[#555] focus:outline-none focus:border-[#d4a843]/60 transition-colors text-sm ${className}`}
      {...props}
    />
    {error && <p className="text-red-400 text-xs">{error}</p>}
  </div>
))
Input.displayName = 'Input'
