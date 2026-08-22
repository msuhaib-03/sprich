import { InputHTMLAttributes, forwardRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, Props>(({ label, error, className = '', type, ...props }, ref) => {
  const isPassword = type === 'password'
  const [visible, setVisible] = useState(false)

  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-[var(--text-soft)]">{label}</label>}
      <div className="relative">
        <input
          ref={ref}
          type={isPassword && visible ? 'text' : type}
          className={`w-full px-4 py-3 rounded-xl bg-[var(--track)] border ${error ? 'border-red-500/60' : 'border-[var(--border)]'} text-[var(--text)] placeholder-[#555] focus:outline-none focus:border-[#d4a843]/60 transition-colors text-sm ${isPassword ? 'pr-11' : ''} ${className}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            tabIndex={-1}
            aria-label={visible ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-[var(--faint)] hover:text-[var(--text)] transition-colors"
          >
            {visible ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        )}
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  )
})
Input.displayName = 'Input'
