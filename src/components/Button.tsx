import React, { ButtonHTMLAttributes, forwardRef, ReactNode } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "secondary"
    | "outline"
    | "danger"
    | "success"
    | "warning"
    | "info"
    | "link"
    | "ghost";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = "",
      variant = "primary",
      size = "md",
      isLoading = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const baseStyles = [
      "inline-flex items-center justify-center font-semibold rounded-lg",
      "transition-all duration-150 ease-in-out",
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
      "disabled:cursor-not-allowed disabled:opacity-60",
      "cursor-pointer", // Added cursor pointer
      "relative",
      "select-none",
    ].join(" ");

    const variants = {
      primary: [
        "bg-indigo-600 text-white border border-transparent",
        "hover:bg-indigo-700",
        "active:bg-indigo-800",
        "focus-visible:ring-indigo-500",
        "shadow-sm hover:shadow-md",
        "disabled:bg-indigo-400 disabled:hover:bg-indigo-400",
      ].join(" "),
      secondary: [
        "bg-white text-gray-900 border border-gray-300",
        "hover:bg-gray-50 hover:border-gray-400",
        "active:bg-gray-100",
        "focus-visible:ring-gray-500",
        "shadow-sm hover:shadow",
        "disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-200",
      ].join(" "),
      outline: [
        "bg-transparent border-2 border-indigo-600 text-indigo-600",
        "hover:bg-indigo-50 hover:border-indigo-700 hover:text-indigo-700",
        "active:bg-indigo-100 active:border-indigo-800 active:text-indigo-800",
        "focus-visible:ring-indigo-500",
        "disabled:border-indigo-300 disabled:text-indigo-300 disabled:hover:bg-transparent",
      ].join(" "),
      danger: [
        "bg-red-600 text-white border border-transparent",
        "hover:bg-red-700",
        "active:bg-red-800",
        "focus-visible:ring-red-500",
        "shadow-sm hover:shadow-md",
        "disabled:bg-red-400 disabled:hover:bg-red-400",
      ].join(" "),
      success: [
        "bg-emerald-600 text-white border border-transparent",
        "hover:bg-emerald-700",
        "active:bg-emerald-800",
        "focus-visible:ring-emerald-500",
        "shadow-sm hover:shadow-md",
        "disabled:bg-emerald-400 disabled:hover:bg-emerald-400",
      ].join(" "),
      warning: [
        "bg-amber-500 text-white border border-transparent",
        "hover:bg-amber-600",
        "active:bg-amber-700",
        "focus-visible:ring-amber-400",
        "shadow-sm hover:shadow-md",
        "disabled:bg-amber-300 disabled:hover:bg-amber-300",
      ].join(" "),
      info: [
        "bg-cyan-500 text-white border border-transparent",
        "hover:bg-cyan-600",
        "active:bg-cyan-700",
        "focus-visible:ring-cyan-400",
        "shadow-sm hover:shadow-md",
        "disabled:bg-cyan-300 disabled:hover:bg-cyan-300",
      ].join(" "),
      link: [
        "bg-transparent text-indigo-600 border border-transparent p-0 h-auto",
        "hover:text-indigo-700 hover:underline",
        "active:text-indigo-800",
        "focus-visible:ring-indigo-500 focus-visible:rounded",
        "disabled:text-indigo-400 disabled:hover:no-underline",
      ].join(" "),
      ghost: [
        "bg-transparent text-gray-700 border border-transparent",
        "hover:bg-gray-100 hover:text-gray-900",
        "active:bg-gray-200",
        "focus-visible:ring-gray-500",
        "disabled:text-gray-400 disabled:hover:bg-transparent",
      ].join(" "),
    };

    const sizes = {
      sm: "h-8 px-3 text-sm",
      md: "h-10 px-4 text-sm",
      lg: "h-12 px-6 text-base",
      icon: "h-10 w-10 p-0",
    };

    // Icon size mapping based on button size
    const getIconSize = (buttonSize: string) => {
      const iconSizes = {
        sm: "w-4 h-4",
        md: "w-4 h-4", 
        lg: "w-5 h-5",
        icon: "w-5 h-5"
      };
      return iconSizes[buttonSize as keyof typeof iconSizes] || "w-4 h-4";
    };

    // Get proper spacing between elements
    const getSpacing = (buttonSize: string) => {
      if (buttonSize === 'icon') return "";
      
      const baseGap = {
        sm: "gap-1.5",
        md: "gap-2",
        lg: "gap-2.5"
      }[buttonSize] || "gap-2";
      
      return baseGap;
    };

    const iconSize = getIconSize(size);
    const spacing = getSpacing(size);

    // Render icon with proper sizing - removed the wrapper span that was causing positioning issues
    const renderIcon = (icon: ReactNode) => {
      if (!icon) return null;
      return icon;
    };

    // Loading spinner component
    const LoadingSpinner = () => (
      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          className="animate-spin h-4 w-4"
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

    // Override size for link variant to prevent fixed height
    const sizeClasses = variant === 'link' ? '' : sizes[size];

    return (
      <button
        ref={ref}
        className={`
          ${baseStyles}
          ${variants[variant]}
          ${sizeClasses}
          ${fullWidth ? "w-full" : ""}
          ${className}
        `.trim()}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <LoadingSpinner />}
        <span
          className={`flex items-center justify-center ${spacing} ${
            isLoading ? "opacity-0" : "opacity-100"
          }`}
        >
          {leftIcon && (
            <span className={`${iconSize} flex-shrink-0`}>
              {renderIcon(leftIcon)}
            </span>
          )}
          {children && (
            <span className={size === 'icon' && !isLoading ? 'sr-only' : ''}>
              {children}
            </span>
          )}
          {rightIcon && (
            <span className={`${iconSize} flex-shrink-0`}>
              {renderIcon(rightIcon)}
            </span>
          )}
        </span>
      </button>
    );
  },
);

Button.displayName = "Button";