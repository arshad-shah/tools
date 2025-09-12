import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "./Badge";
import { useState } from "react";

const Accordion: React.FC<{
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string;
}> = ({ title, children, icon, defaultOpen = false, badge }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 text-left flex items-center justify-between transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center">
          {icon && <span className="mr-2 text-gray-600">{icon}</span>}
          <span className="font-medium text-gray-900">{title}</span>
          {badge && (
            <Badge variant="neutral" className="ml-2">
              {badge}
            </Badge>
          )}
        </div>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-500" />
        )}
      </button>
      {isOpen && (
        <div className="p-4 bg-white border-t border-gray-100">
          {children}
        </div>
      )}
    </div>
  );
};


export default Accordion;