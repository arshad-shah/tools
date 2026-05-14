const Button: React.FC<{
  onClick?: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  title?: string;
  'aria-pressed'?: boolean;
}> = ({ 
  onClick, 
  children, 
  variant = 'secondary', 
  size = 'md', 
  disabled = false, 
  className = '', 
  title,
  'aria-pressed': ariaPressed
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-violet-400/50';
  
  const variants = {
    primary: 'bg-violet-500 hover:bg-violet-600 text-white shadow-lg shadow-violet-500/25',
    secondary: 'bg-white/10 hover:bg-white/20 text-white border border-white/20',
    success: 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25',
    danger: 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25',
    ghost: 'hover:bg-white/10 text-white'
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-pressed={ariaPressed}
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${disabled ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''} ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;