import ObjectRenderer from "./ObjectRenderer";

const ClaimCard: React.FC<{
  label: string;
  value: unknown;
  icon: React.ReactNode;
  variant?: 'default' | 'warning' | 'success';
}> = ({ label, value, icon, variant = 'default' }) => {
  const variants = {
    default: 'border-gray-200 bg-white',
    warning: 'border-orange-200 bg-orange-50',
    success: 'border-green-200 bg-green-50'
  };
  
  return (
    <div className={`${variants[variant]} rounded-lg border p-4 hover:shadow-md transition-shadow`}>
      <div className="flex items-start">
        <div className="flex-shrink-0 p-2 bg-pink-100 text-pink-600 rounded-lg mr-3">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            {label}
          </div>
          <div className="text-sm">
            <ObjectRenderer data={value} />
          </div>
        </div>
      </div>
    </div>
  );
};
export default ClaimCard;