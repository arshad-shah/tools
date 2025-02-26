import React from 'react';
import { Info, Lock, ShieldAlert, KeyRound, Shield, Server } from 'lucide-react';

interface SecurityCardProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  variant?: 'blue' | 'purple';
}

const SecurityCard = ({ icon, title, children, variant = 'blue' }: SecurityCardProps) => {
  const styles = {
    blue: {
      bg: 'bg-gradient-to-br from-blue-50 to-sky-50',
      border: 'border-blue-100',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      title: 'text-blue-900',
      text: 'text-blue-800'
    },
    purple: {
      bg: 'bg-gradient-to-br from-purple-50 to-indigo-50',
      border: 'border-purple-100',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      title: 'text-purple-900',
      text: 'text-purple-800'
    }
  };

  const style = styles[variant];

  return (
    <div className={`rounded-xl border ${style.border} ${style.bg} overflow-hidden`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${style.iconBg} ${style.iconColor}`}>
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

const SecurityPoint = ({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) => (
  <div className="flex items-start gap-2 mt-3">
    <div className="mt-1 text-purple-600">
      {icon}
    </div>
    <p className="text-sm text-purple-800">
      {children}
    </p>
  </div>
);

const SecurityInfo = () => {
  return (
    <div className="space-y-4">
      <SecurityCard 
        icon={<Info className="w-5 h-5" />} 
        title="About These Estimates"
      >
        These calculations assume the attacker knows the exact password length and character set used. 
        In reality, passwords are often harder to crack due to additional security measures like rate 
        limiting, account lockouts, and salted hashes.
      </SecurityCard>
      
      <SecurityCard 
        icon={<Lock className="w-5 h-5" />} 
        title="Quantum Computing & Password Security"
        variant="purple"
      >
        <p>
          While quantum computers may eventually provide speedups for password cracking, 
          the security of your password primarily depends on:
        </p>

        <SecurityPoint icon={<Shield className="w-4 h-4" />}>
          The cryptographic algorithms used to store and transmit it
        </SecurityPoint>

        <SecurityPoint icon={<KeyRound className="w-4 h-4" />}>
          The overall length and randomness of the password
        </SecurityPoint>

        <SecurityPoint icon={<Server className="w-4 h-4" />}>
          How the password is protected against offline attacks
        </SecurityPoint>

        <div className="mt-4 p-3 bg-white/50 rounded-lg border border-purple-100">
          <div className="flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-purple-600 mt-0.5" />
            <p className="text-sm text-purple-900">
              For maximum security, use this generator to create long, random passwords 
              and ensure they're stored using modern password hashing algorithms (like Argon2id).
            </p>
          </div>
        </div>
      </SecurityCard>
    </div>
  );
};

export default SecurityInfo;