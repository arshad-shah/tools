// Part 1: Interfaces and Utility Components
import React from 'react';
// Interfaces
export interface RegexTemplate {
  name: string;
  pattern: string;
  description: string;
  category: 'web' | 'validation' | 'format' | 'common';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface Match {
  text: string;
  index: number;
  length: number;
  groups: string[] | null;
}

export interface Flags {
  global: boolean;
  ignoreCase: boolean;
  multiline: boolean;
  sticky: boolean;
  unicode: boolean;
}

export interface Theme {
  bg: string;
  text: string;
  textSecondary: string;
  border: string;
  sidebar: string;
  input: string;
  highlight: string;
  buttonPrimary: string;
  buttonSecondary: string;
  flagActive: string;
  flagInactive: string;
  card: string;
  codeBlock: string;
  matchHighlight: string;
  gradient: string;
  headerGradient: string;
  accentColor: string;
}

// Badge component for visual enhancements
export const Badge: React.FC<{
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'default';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}> = ({ children, variant = 'default', size = 'md', icon }) => {
  // Dynamic color classes based on variant
  const variantClasses = {
    success: "bg-gradient-to-r from-green-500 to-emerald-600 text-white",
    warning: "bg-gradient-to-r from-amber-400 to-orange-500 text-white",
    error: "bg-gradient-to-r from-red-500 to-rose-600 text-white",
    info: "bg-gradient-to-r from-blue-400 to-indigo-500 text-white",
    default: "bg-gradient-to-r from-slate-400 to-slate-500 text-white",
  };
  
  // Size classes
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5",
  };
  
  return (
    <span className={`inline-flex items-center rounded-full font-medium shadow-sm ${variantClasses[variant]} ${sizeClasses[size]}`}>
      {icon && <span className="mr-1">{icon}</span>}
      {children}
    </span>
  );
};

// Card component for consistent styling
export const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
  theme: Theme;
  hover?: boolean;
}> = ({ children, className = "", theme, hover = false }) => {
  return (
    <div 
      className={`${theme.card} border ${theme.border} rounded-lg shadow-sm 
      ${hover ? 'transition-all duration-300 hover:shadow-lg hover:translate-y-[-2px]' : ''} 
      ${className}`}
    >
      {children}
    </div>
  );
};

// Button component for consistent styling
export const Button: React.FC<{
  children?: React.ReactNode;
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  className?: string;
  theme: Theme;
  title?: string;
}> = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'md', 
  icon, 
  className = "",
  theme,
  title
}) => {
  // Variant classes
  const variantClasses = {
    primary: `${theme.buttonPrimary} text-white`,
    secondary: `${theme.buttonSecondary} ${theme.text}`,
    outline: `bg-transparent border ${theme.border} ${theme.text} hover:bg-opacity-10 hover:bg-gray-500`,
    ghost: `bg-transparent ${theme.text} hover:bg-opacity-10 hover:bg-gray-500`,
  };
  
  // Size classes
  const sizeClasses = {
    sm: "text-xs px-2 py-1 rounded",
    md: "text-sm px-3 py-2 rounded-md",
    lg: "text-base px-4 py-2 rounded-md",
  };
  
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center font-medium transition-all duration-200 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      title={title}
    >
      {icon && <span className={children ? "mr-1.5" : ""}>{icon}</span>}
      {children}
    </button>
  );
};