import React from 'react';
import { Monitor, Server, Cpu, Shield, Clock } from 'lucide-react';

interface CrackTimeCardProps {
  icon: React.ReactNode;
  title: string;
  time: string;
  speed: string;
  strength: number;
}

const CrackTimeCard: React.FC<CrackTimeCardProps> = ({ icon, title, time, speed, strength }) => {
  const getGradient = (strength: number): string => {
    if (strength < 0.3) return 'from-red-50 to-red-100 border-red-200';
    if (strength < 0.6) return 'from-amber-50 to-amber-100 border-amber-200';
    if (strength < 0.8) return 'from-orange-50 to-orange-100 border-orange-200';
    return 'from-green-50 to-green-100 border-green-200';
  };

  const getTimeColor = (strength: number): string => {
    if (strength < 0.3) return 'text-red-700';
    if (strength < 0.6) return 'text-amber-700';
    if (strength < 0.8) return 'text-orange-700';
    return 'text-green-700';
  };

  // Determine if time is "very secure"
  const isVerySecure = time.includes('trillion') || 
                      time.includes('quadrillion') || 
                      time.includes('infinite');

  return (
    <div className={`relative overflow-hidden rounded-xl border bg-gradient-to-br ${getGradient(strength)} p-4 transition-all duration-300 hover:shadow-md`}>
      <div className="flex items-start gap-4">
        <div className="p-2 rounded-full bg-white/80 backdrop-blur-sm shadow-sm">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900">{title}</h4>
          <p className={`mt-1 text-lg font-semibold ${getTimeColor(strength)} flex items-center gap-1`}>
            {time}
            {isVerySecure && (
              <Shield className="w-4 h-4 inline-block ml-1" />
            )}
          </p>
          <p className="mt-1 text-xs text-gray-600">
            {speed}
          </p>
        </div>
      </div>
    </div>
  );
};

interface CrackTimeDisplayProps {
  crackTimes: {
    desktop: string;
    distributed: string;
    quantum: string;
  };
  strength: number;
}

const CrackTimeDisplay: React.FC<CrackTimeDisplayProps> = ({ crackTimes, strength }) => {
  return (
    <div className="bg-white rounded-xl p-5 border border-orange-100 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-orange-500" />
        <h3 className="text-lg font-semibold text-gray-900">Time to Crack</h3>
        <div className="h-px flex-1 bg-gradient-to-r from-orange-200 to-transparent"></div>
      </div>
      
      <div className="grid gap-3">
        <CrackTimeCard
          icon={<Monitor className="w-5 h-5 text-gray-700" />}
          title="Standard PC"
          time={crackTimes.desktop}
          speed="1 billion guesses per second"
          strength={strength}
        />
        
        <CrackTimeCard
          icon={<Server className="w-5 h-5 text-gray-700" />}
          title="Distributed Cloud System"
          time={crackTimes.distributed}
          speed="1 trillion guesses per second"
          strength={strength}
        />
        
        <CrackTimeCard
          icon={<Cpu className="w-5 h-5 text-gray-700" />}
          title="Quantum Computer"
          time={crackTimes.quantum}
          speed="1 quadrillion guesses per second"
          strength={strength}
        />
      </div>

      <div className="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-100 text-sm text-gray-700">
        <div className="flex items-start gap-2">
          <div className="mt-0.5 text-orange-500 flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-xs">
            These calculations assume the attacker knows the password's structure. 
            In reality, most systems have additional protections like rate limiting, 
            account lockouts, and multi-factor authentication that make password cracking 
            much more difficult.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CrackTimeDisplay;