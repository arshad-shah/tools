const StatCard: React.FC<{ 
  label: string; 
  value: number | string; 
  color: string; 
  icon?: React.ReactNode 
}> = ({ label, value, color, icon }) => (
  <div className="flex items-center space-x-3 p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
    <div className={`w-3 h-3 rounded-full ${color}`}></div>
    {icon && <div className="text-white/70">{icon}</div>}
    <div>
      <div className="text-sm text-white/70">{label}</div>
      <div className="text-lg font-bold text-white">{value}</div>
    </div>
  </div>
);

export default StatCard;