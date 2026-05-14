import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: 
    | "success" 
    | "warning" 
    | "danger" 
    | "neutral" 
    | "primary"
    | "secondary"
    | "info"
    | "error"
    | "default";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variant = "neutral", 
  size = "md",
  className = "" 
}) => {
  const baseStyles =
    "inline-flex items-center rounded-full font-medium border";

  const sizeStyles = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm", 
    lg: "px-4 py-1.5 text-base"
  };

  const variantStyles = {
    // Original variants
    success: "bg-green-50 text-green-700 border-green-200",
    warning: "bg-yellow-50 text-yellow-700 border-yellow-200",
    danger: "bg-red-50 text-red-700 border-red-200",
    neutral: "bg-gray-50 text-gray-700 border-gray-200",
    
    // Additional variants
    primary: "bg-pink-50 text-pink-700 border-pink-200",
    secondary: "bg-purple-50 text-purple-700 border-purple-200",
    info: "bg-blue-50 text-blue-700 border-blue-200",
    error: "bg-red-50 text-red-700 border-red-200", // Alias for danger
    default: "bg-slate-50 text-slate-700 border-slate-200",
  };

  return (
    <span className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
};