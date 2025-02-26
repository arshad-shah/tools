/* eslint-disable @typescript-eslint/no-explicit-any */
const StatsCard = ({ icon: Icon, label, value, subtext, gradient = '' }: {
  icon: React.FC<any>;
  label: string;
  value: string | number;
  subtext?: string;
  gradient?: string;
}) => (
  <div className={`relative overflow-hidden bg-white rounded-xl p-5 hover:shadow-lg 
                   transition-all duration-300 group ${gradient}`}>
    <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-5 
                    transition-opacity duration-300 from-violet-500 to-fuchsia-500" />
    <div className="relative">
      <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
        <div className="p-2 rounded-lg bg-violet-50 text-violet-500">
          <Icon className="w-4 h-4" />
        </div>
        <span className="font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-800 mb-1">{value}</p>
      {subtext && (
        <p className="text-sm text-gray-500">{subtext}</p>
      )}
    </div>
  </div>
);


export default StatsCard;