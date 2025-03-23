import React from 'react';
import { Check } from 'lucide-react';

interface OrangeSwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

const OrangeSwitch: React.FC<OrangeSwitchProps> = ({
  checked,
  onCheckedChange,
  disabled = false
}) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onCheckedChange(!checked)}
      className={`
        relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 
        transition-colors duration-200 ease-in-out focus:outline-none
        ${checked 
          ? 'border-orange-500 bg-orange-500' 
          : 'border-gray-200 bg-gray-200'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <span className="sr-only">{checked ? 'On' : 'Off'}</span>
      <span
        className={`
          ${checked ? 'translate-x-5' : 'translate-x-0'}
          pointer-events-none relative inline-block h-5 w-5 transform rounded-full
          bg-white shadow ring-0 transition duration-200 ease-in-out
        `}
      >
        {checked && (
          <span
            className={`
              absolute inset-0 flex h-full w-full items-center justify-center transition-opacity
              text-orange-500
            `}
          >
            <Check className="h-3 w-3" strokeWidth={3} />
          </span>
        )}
      </span>
    </button>
  );
};

export default OrangeSwitch;