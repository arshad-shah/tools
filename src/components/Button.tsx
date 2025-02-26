import { ButtonHTMLAttributes, forwardRef } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | 'primary'
    | 'secondary'
    | 'outline'
    | 'danger'
    | 'success'
    | 'warning'
    | 'info'
    | 'link'
    | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = '',
      variant = 'primary',
      size = 'md',
      isLoading = false,
      fullWidth = false,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles = [
      'inline-flex items-center justify-center rounded-lg font-medium',
      'transition-all duration-200 ease-in-out',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'relative overflow-hidden',
      'active:scale-95 transform',
    ].join(' ');

    const variants = {
      primary: [
        'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white',
        'hover:from-indigo-700 hover:to-indigo-800',
        'active:from-indigo-800 active:to-indigo-900',
        'focus-visible:ring-indigo-500',
        'shadow-md hover:shadow-lg',
        'disabled:from-indigo-400 disabled:to-indigo-500',
      ].join(' '),
      secondary: [
        'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-900',
        'hover:from-gray-200 hover:to-gray-300',
        'active:from-gray-300 active:to-gray-400',
        'focus-visible:ring-gray-400',
        'shadow-sm hover:shadow',
        'border border-gray-200',
      ].join(' '),
      outline: [
        'border-2 border-indigo-600 text-indigo-600',
        'hover:bg-indigo-50 hover:border-indigo-700 hover:text-indigo-700',
        'active:bg-indigo-100 active:border-indigo-800 active:text-indigo-800',
        'focus-visible:ring-indigo-500',
      ].join(' '),
      danger: [
        'bg-gradient-to-r from-red-600 to-red-700 text-white',
        'hover:from-red-700 hover:to-red-800',
        'active:from-red-800 active:to-red-900',
        'focus-visible:ring-red-500',
        'shadow-md hover:shadow-lg',
        'disabled:from-red-400 disabled:to-red-500',
      ].join(' '),
      success: [
        'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white',
        'hover:from-emerald-700 hover:to-emerald-800',
        'active:from-emerald-800 active:to-emerald-900',
        'focus-visible:ring-emerald-500',
        'shadow-md hover:shadow-lg',
        'disabled:from-emerald-400 disabled:to-emerald-500',
      ].join(' '),
      warning: [
        'bg-gradient-to-r from-amber-500 to-amber-600 text-white',
        'hover:from-amber-600 hover:to-amber-700',
        'active:from-amber-700 active:to-amber-800',
        'focus-visible:ring-amber-400',
        'shadow-md hover:shadow-lg',
        'disabled:from-amber-300 disabled:to-amber-400',
      ].join(' '),
      info: [
        'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white',
        'hover:from-cyan-600 hover:to-cyan-700',
        'active:from-cyan-700 active:to-cyan-800',
        'focus-visible:ring-cyan-400',
        'shadow-md hover:shadow-lg',
        'disabled:from-cyan-300 disabled:to-cyan-400',
      ].join(' '),
      link: [
        'text-indigo-600 hover:text-indigo-700 hover:underline',
        'active:text-indigo-800',
        'focus-visible:ring-indigo-500',
        'disabled:text-indigo-400',
      ].join(' '),
      ghost: [
        'text-gray-700 bg-transparent hover:bg-gray-100 hover:text-gray-900',
        'active:bg-gray-200',
        'focus-visible:ring-gray-400',
        'disabled:text-gray-400',
        'hover:shadow-sm',
      ].join(' '),
    };

    const sizes = {
      sm: 'h-8 px-3 text-sm gap-1.5 min-w-[4rem]',
      md: 'h-10 px-4 text-base gap-2 min-w-[5rem]',
      lg: 'h-12 px-6 text-lg gap-2.5 min-w-[6rem]',
      icon: 'h-10 w-10 p-2',
    };

    // Loading spinner SVG component
    const LoadingSpinner = () => (
      <div className="absolute inset-0 flex items-center justify-center bg-inherit">
        <svg
          className="animate-spin h-5 w-5"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
    );

    // Ripple effect styles
    const rippleStyles =
      !isLoading && variant !== 'link'
        ? [
            "after:content-['']",
            'after:absolute after:inset-0',
            'after:rounded-lg',
            'after:transition-[transform,opacity]',
            'after:duration-500',
            'after:bg-white/20',
            'after:opacity-0',
            'after:scale-x-75',
            'hover:after:opacity-100',
            'hover:after:scale-x-100',
            'active:after:opacity-0',
            'active:after:scale-x-95',
            'after:origin-center',
          ].join(' ')
        : '';

    return (
      <button
        ref={ref}
        className={`
          ${baseStyles}
          ${variants[variant]}
          ${sizes[size]}
          ${fullWidth ? 'w-full' : ''}
          ${isLoading ? 'text-transparent relative' : ''}
          ${rippleStyles}
          ${className}
        `}
        disabled={disabled || isLoading}
        {...props}
      >
        <span
          className={`flex items-center justify-center gap-2 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        >
          {children}
        </span>
        {isLoading && <LoadingSpinner />}
      </button>
    );
  }
);

Button.displayName = 'Button';
