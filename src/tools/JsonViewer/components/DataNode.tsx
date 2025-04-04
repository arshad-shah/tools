/* eslint-disable @typescript-eslint/no-explicit-any */
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../components/tooltip";
import { ChevronRight, ChevronDown, FileText, FolderOpen, Folder, AlertCircle, Info, Copy, ExternalLink } from 'lucide-react';
import { cn } from "../../../lib/utils";
import { Badge } from "../../../components/Badge";
// Helper to get node type icon and color
const getNodeTypeInfo = (data: any) => {
  if (data === null) {
    return { icon: AlertCircle, color: 'text-gray-400', label: 'null' };
  }
  
  if (Array.isArray(data)) {
    return { 
      icon: FolderOpen, 
      color: 'text-cyan-600', 
      label: `Array (${data.length})`
    };
  }
  
  if (typeof data === 'object') {
    return { 
      icon: Folder, 
      color: 'text-cyan-600', 
      label: `Object (${Object.keys(data).length})`
    };
  }
  
  if (typeof data === 'string') {
    return { icon: FileText, color: 'text-teal-600', label: 'string' };
  }
  
  if (typeof data === 'number') {
    return { icon: Info, color: 'text-sky-600', label: 'number' };
  }
  
  if (typeof data === 'boolean') {
    return { icon: Info, color: 'text-indigo-600', label: data ? 'true' : 'false' };
  }
  
  return { icon: FileText, color: 'text-gray-500', label: typeof data };
};

// Format value for display
const formatValue = (value: any): string => {
  if (value === null) return 'null';
  if (typeof value === 'string') return `"${value}"`;
  return String(value);
};

// Individual node component with enhanced styling
const DataNode: React.FC<{
  name: string;
  data: any;
  depth: number;
  onToggle: () => void;
  isExpanded: boolean;
  isMatched: boolean;
  onCopyPath: () => void;
  onCopyValue: () => void;
}> = ({ 
  name, 
  data, 
  depth, 
  onToggle, 
  isExpanded, 
  isMatched,
  onCopyPath,
  onCopyValue 
}) => {
  const { icon: TypeIcon, color, label } = getNodeTypeInfo(data);
  const isExpandable = data !== null && typeof data === 'object';
  const nodeValue = !isExpandable ? formatValue(data) : null;
  
  const ChevronIcon = isExpanded ? ChevronDown : ChevronRight;
  
  return (
    <div 
      className={cn(
        "flex items-center py-1 px-2 rounded-lg transition-colors group",
        isMatched ? "bg-cyan-50 border-l-2 border-cyan-500" : "hover:bg-cyan-50/50",
        depth === 0 && "mt-1"
      )}
      style={{ paddingLeft: `${(depth * 1.25) + 0.5}rem` }}
    >
      {/* Expand/Collapse Button or Spacer */}
      <div className="mr-1 w-4">
        {isExpandable ? (
          <button 
            onClick={onToggle}
            className="w-4 h-4 flex items-center justify-center text-cyan-600 hover:text-cyan-800 hover:bg-cyan-100 rounded transition-colors"
          >
            <ChevronIcon size={14} />
          </button>
        ) : <span className="w-4" />}
      </div>
      
      {/* Node Type Icon */}
      <div className={cn("mr-2", color)}>
        <TypeIcon size={16} />
      </div>
      
      {/* Node Name */}
      <div className="font-mono font-medium text-cyan-900 mr-2">
        {name !== 'root' ? name : ''}
      </div>
      
      {/* Node Type Badge - Only for objects and arrays */}
      {isExpandable && (
        <Badge variant="neutral" className="bg-white/80 text-xs border-cyan-200 text-cyan-700 px-1.5 py-0">
          {label}
        </Badge>
      )}
      
      {/* Value for primitive types */}
      {nodeValue && (
        <div className={cn(
          "font-mono ml-2",
          typeof data === 'string' ? "text-green-600" :
          typeof data === 'number' ? "text-blue-600" :
          typeof data === 'boolean' ? "text-purple-600" : "text-gray-500"
        )}>
          {nodeValue}
        </div>
      )}
      
      {/* Action buttons */}
      <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                onClick={onCopyPath} 
                className="p-1 rounded-md hover:bg-cyan-100 text-cyan-600"
              >
                <ExternalLink size={12} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">Copy path</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                onClick={onCopyValue} 
                className="p-1 rounded-md hover:bg-cyan-100 text-cyan-600"
              >
                <Copy size={12} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">Copy value</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

export default DataNode;