import { ButtonHTMLAttributes } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'gold' | 'outline' | 'ghost'
  loading?: boolean
}

export function Button({ variant = 'gold', loading, children, className = '', disabled, ...props }: Props) {
  const base = 'inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    gold: 'gold-gradient text-black hover:opacity-90',
    outline: 'border border-[var(--border-strong)] text-[var(--text)] hover:border-[var(--border-strong)] hover:bg-[var(--overlay)]',
    ghost: 'text-[var(--muted)] hover:text-[var(--text)]',
  }
  return (
    <button className={`${base} ${variants[variant]} ${className}`} disabled={disabled ?? loading} {...props}>
      {loading && <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
      {children}
    </button>
  )
}
