'use client';

import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  children: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      iconPosition = 'left',
      children,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles = `
      inline-flex items-center justify-center gap-2 font-medium rounded-xl
      transition-all duration-200 active:scale-[0.98] disabled:opacity-50
      disabled:pointer-events-none focus:outline-none focus:ring-2
      focus:ring-forensic-highlight/50 focus:ring-offset-2 focus:ring-offset-forensic-dark
    `;

    const variants = {
      primary: `
        bg-gradient-to-r from-forensic-highlight to-pink-600 text-white
        hover:from-pink-600 hover:to-forensic-highlight shadow-lg shadow-forensic-highlight/25
      `,
      secondary: `
        bg-forensic-mid border border-gray-600 text-white
        hover:bg-forensic-accent hover:border-gray-500
      `,
      ghost: `
        bg-transparent text-gray-400 hover:text-white hover:bg-white/5
      `,
      danger: `
        bg-red-600/20 border border-red-500/50 text-red-400
        hover:bg-red-600/30 hover:border-red-500
      `,
    };

    const sizes = {
      sm: 'text-sm px-3 py-1.5',
      md: 'text-sm px-4 py-2.5',
      lg: 'text-base px-6 py-3',
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <Spinner />
        ) : (
          <>
            {icon && iconPosition === 'left' && icon}
            {children}
            {icon && iconPosition === 'right' && icon}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
