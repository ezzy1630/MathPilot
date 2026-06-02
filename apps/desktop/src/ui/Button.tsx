import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  icon?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  iconOnly?: boolean
}

const variantClass: Record<Variant, string> = {
  primary: 'mp-btn-primary',
  secondary: 'mp-btn-secondary',
  ghost: 'mp-btn-ghost',
  danger: 'mp-btn-danger',
}

export function Button({
  variant = 'secondary',
  icon,
  size = 'md',
  loading = false,
  iconOnly = false,
  className = '',
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      className={`mp-btn ${variantClass[variant]} mp-btn-${size} ${iconOnly ? 'mp-btn-icon-only' : ''} ${className}`.trim()}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {icon}
      {!iconOnly && <span className={loading ? 'mp-btn-label-loading' : undefined}>{children}</span>}
    </button>
  )
}
