import React from 'react';
import { Monitor, Server, Cpu } from 'lucide-react';

interface CrackTimeCardProps {
  icon: React.ReactNode;
  title: string;
  time: string;
  speed: string;
  strength: number;
}

const CrackTimeCard = ({ icon, title, time, speed, strength }: CrackTimeCardProps) => {
  const getGradient = (strength: number) => {
    if (strength < 0.3) return 'from-red-50 to-red-100';
    if (strength < 0.6) return 'from-yellow-50 to-yellow-100';
    if (strength < 0.8) return 'from-blue-50 to-blue-100';
    return 'from-green-50 to-green-100';
  };

  const getTimeColor = (strength: number) => {
    if (strength < 0.3) return 'text-red-700';
    if (strength < 0.6) return 'text-yellow-700';
    if (strength < 0.8) return 'text-blue-700';
    return 'text-green-700';
  };

  return (
    <div className={`relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br ${getGradient(strength)} p-4`}>
      <div className="flex items-start gap-4">
        <div className="p-2 rounded-lg bg-white/80 backdrop-blur-sm">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900">{title}</h4>
          <p className={`mt-1 text-lg font-semibold ${getTimeColor(strength)}`}>
            {time}
          </p>
          <p className="mt-1 text-sm text-gray-600">
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

const CrackTimeDisplay = ({ crackTimes, strength }: CrackTimeDisplayProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-900">Time to Crack</h3>
        <div className="h-px flex-1 bg-gradient-to-r from-gray-200 to-transparent"></div>
      </div>
      
      <div className="grid gap-3">
        <CrackTimeCard
          icon={<Monitor className="w-5 h-5 text-gray-700" />}
          title="Desktop PC"
          time={crackTimes.desktop}
          speed="1 billion guesses per second"
          strength={strength}
        />
        
        <CrackTimeCard
          icon={<Server className="w-5 h-5 text-gray-700" />}
          title="Distributed System"
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
    </div>
  );
};

export default CrackTimeDisplay;