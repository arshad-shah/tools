import React from 'react';

interface CustomButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'subtle';
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  loading?: boolean;
}

const CustomButton: React.FC<CustomButtonProps> = ({
  children,
  variant = 'primary',
  fullWidth = false,
  size = 'md',
  leadingIcon,
  trailingIcon,
  loading = false,
  disabled = false,
  className = '',
  ...props
}) => {
  const baseStyles = 'relative rounded-md font-medium transition-all duration-200 focus:outline-none inline-flex items-center justify-center';
  
  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5',
    md: 'text-sm px-4 py-2',
    lg: 'text-base px-5 py-2.5'
  };
  
  const variantStyles = {
    primary: `bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white shadow-sm ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
    outline: `border border-orange-200 hover:bg-orange-50 active:bg-orange-100 text-gray-700 ${disabled ? 'opacity-50 cursor-not-allowed border-gray-200 text-gray-400 hover:bg-transparent' : ''}`,
    subtle: `bg-orange-50 hover:bg-orange-100 active:bg-orange-200 text-orange-700 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`
  };
  
  const widthStyle = fullWidth ? 'w-full' : '';
  
  const buttonClasses = `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${widthStyle} ${className}`;
  
  return (
    <button
      disabled={disabled || loading}
      className={buttonClasses}
      {...props}
    >
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </span>
      )}
      
      <span className={`flex items-center ${loading ? 'opacity-0' : ''}`}>
        {leadingIcon && <span className="mr-2">{leadingIcon}</span>}
        {children}
        {trailingIcon && <span className="ml-2">{trailingIcon}</span>}
      </span>
    </button>
  );
};

// Generate New Button specifically designed for password generation
const GenerateButton: React.FC<Omit<CustomButtonProps, 'variant'>> = (props) => {
  return (
    <CustomButton
      variant="primary"
      className="relative overflow-hidden group"
      {...props}
    >
      <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-orange-600 to-orange-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
      <span className="relative z-10 flex items-center justify-center">
        {props.children}
      </span>
    </CustomButton>
  );
};

// Copy Button specifically designed for copying passwords
const CopyButton: React.FC<CustomButtonProps & { copied: boolean }> = ({ copied, ...props }) => {
  return (
    <CustomButton
      variant="outline"
      className={`transition-all duration-300 ${copied ? 'border-green-200 bg-green-50 text-green-600' : ''}`}
      {...props}
    >
      {props.children}
    </CustomButton>
  );
};

export { CustomButton, GenerateButton, CopyButton };