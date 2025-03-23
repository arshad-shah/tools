import React from 'react';
import { Info, Lock, ShieldAlert, KeyRound, Shield, Server, Lightbulb } from 'lucide-react';

interface SecurityCardProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  variant?: 'orange' | 'amber';
}

const SecurityCard: React.FC<SecurityCardProps> = ({ icon, title, children, variant = 'orange' }) => {
  const styles = {
    orange: {
      bg: 'bg-gradient-to-br from-orange-50 to-amber-50',
      border: 'border-orange-100',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      title: 'text-orange-900',
      text: 'text-orange-800'
    },
    amber: {
      bg: 'bg-gradient-to-br from-amber-50 to-yellow-50',
      border: 'border-amber-100',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      title: 'text-amber-900',
      text: 'text-amber-800'
    }
  };

  const style = styles[variant];

  return (
    <div className={`rounded-xl border ${style.border} ${style.bg} overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-full ${style.iconBg} ${style.iconColor}`}>
            {icon}
          </div>
          <div>
            <h4 className={`text-sm font-semibold ${style.title} mb-2`}>
              {title}
            </h4>
            <div className={`text-sm ${style.text}`}>
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface SecurityPointProps {
  icon: React.ReactNode;
  children: React.ReactNode;
}

const SecurityPoint: React.FC<SecurityPointProps> = ({ icon, children }) => (
  <div className="flex items-start gap-2 mt-3">
    <div className="mt-0.5 text-amber-600 flex-shrink-0">
      {icon}
    </div>
    <p className="text-sm text-amber-800">
      {children}
    </p>
  </div>
);

const SecurityTip: React.FC<{children: React.ReactNode}> = ({ children }) => (
  <div className="mt-3 flex items-start gap-2 p-3 bg-white/50 rounded-lg border border-amber-100">
    <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
    <p className="text-sm text-gray-700">{children}</p>
  </div>
);

const SecurityInfo: React.FC = () => {
  return (
    <div className="space-y-4">
      <SecurityCard 
        icon={<Info className="w-5 h-5" />} 
        title="About Password Security"
        variant="orange"
      >
        <p>
          Password security is about more than just complexity. A good password should be:
        </p>
        
        <ul className="mt-2 space-y-1 list-inside list-disc text-orange-800">
          <li>Unique (not used on other sites)</li>
          <li>Long (12+ characters)</li>
          <li>Mixed character types</li>
          <li>Not based on personal information</li>
        </ul>
        
        <SecurityTip>
          Consider using a password manager to generate and store unique passwords for each site you use.
        </SecurityTip>
      </SecurityCard>
      
      <SecurityCard 
        icon={<Lock className="w-5 h-5" />} 
        title="Advanced Password Protection"
        variant="amber"
      >
        <p>
          Modern security measures go beyond just the password. For optimal protection:
        </p>

        <SecurityPoint icon={<Shield className="w-4 h-4" />}>
          Enable two-factor authentication (2FA) whenever available
        </SecurityPoint>

        <SecurityPoint icon={<KeyRound className="w-4 h-4" />}>
          Use hardware security keys for critical accounts
        </SecurityPoint>

        <SecurityPoint icon={<Server className="w-4 h-4" />}>
          Regularly check for data breaches at haveibeenpwned.com
        </SecurityPoint>

        <div className="mt-4 p-3 bg-white/50 rounded-lg border border-amber-100">
          <div className="flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-900">
              For maximum security, combine this strong password with multi-factor authentication
              and securely store it in a password manager.
            </p>
          </div>
        </div>
      </SecurityCard>
    </div>
  );
};

export default SecurityInfo;