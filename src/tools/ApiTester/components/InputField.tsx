import React from 'react';

interface InputFieldProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  type?: string;
  helpText?: string;
  error?: string;
  required?: boolean;
  id?: string;
  icon?: React.FC<{ className?: string }>;
  autoComplete?: string;
  disabled?: boolean;
}

export const InputField: React.FC<InputFieldProps> = ({ 
  label, 
  value, 
  onChange, 
  placeholder, 
  className = "",
  type = "text",
  helpText,
  error,
  required = false,
  id,
  icon: Icon,
  autoComplete,
  disabled = false
}) => {
  const fieldId = id || `input-${label.toLowerCase().replace(/\s+/g, '-')}`;
  
  return (
    <div className={`mb-4 ${className}`}>
      <label 
        htmlFor={fieldId}
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="h-5 w-5 text-gray-400" />
          </div>
        )}
        
        <input
          type={type}
          id={fieldId}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
            Icon ? 'pl-10' : ''
          } ${
            error ? 'border-red-300' : 'border-gray-300'
          } ${
            disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
          }`}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            error ? `${fieldId}-error` : 
            helpText ? `${fieldId}-description` : 
            undefined
          }
          required={required}
          autoComplete={autoComplete}
          disabled={disabled}
        />
      </div>
      
      {helpText && !error && (
        <p 
          id={`${fieldId}-description`}
          className="mt-1 text-sm text-gray-500"
        >
          {helpText}
        </p>
      )}
      
      {error && (
        <p 
          id={`${fieldId}-error`}
          className="mt-1 text-sm text-red-600"
        >
          {error}
        </p>
      )}
    </div>
  );
};