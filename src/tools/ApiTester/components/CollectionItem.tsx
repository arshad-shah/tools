import React, { useState } from 'react';
import { ChevronDown, ChevronRight, MoreHorizontal, Edit, Copy, Trash2 } from 'lucide-react';
import { CollectionItemProps, RequestItemType } from '../../../types/ApiTesterTypes';

export const CollectionItem: React.FC<CollectionItemProps> = ({ 
  item, 
  onSelect, 
  isSelected,
  onEdit,
  onDelete,
  onDuplicate
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [showMenu, setShowMenu] = useState<boolean>(false);
  
  if (item.type === 'folder') {
    return (
      <div>
        <div className="relative">
          <div 
            className="flex items-center p-2 hover:bg-gray-100 cursor-pointer group"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />}
            <span className="font-medium">{item.name}</span>
            
            {/* Only show menu button on hover */}
            {(onEdit || onDelete) && (
              <button 
                className="ml-auto opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 hover:bg-gray-200 rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
              >
                <MoreHorizontal className="h-4 w-4 text-gray-500" />
              </button>
            )}
            
            {/* Dropdown menu */}
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                {onEdit && (
                  <button 
                    className="flex w-full items-center px-4 py-2 text-sm text-left hover:bg-gray-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(item);
                      setShowMenu(false);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2 text-gray-500" />
                    Edit
                  </button>
                )}
                {onDelete && (
                  <button 
                    className="flex w-full items-center px-4 py-2 text-sm text-left hover:bg-gray-100 text-red-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
                        onDelete(item.id, item.type);
                      }
                      setShowMenu(false);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        
        {isOpen && (
          <div className="pl-4 border-l border-gray-200 ml-3">
            {item.children.length === 0 ? (
              <div className="p-2 text-xs text-gray-500 italic">
                No requests in this collection
              </div>
            ) : (
              item.children.map((child) => (
                <CollectionItem 
                  key={child.id} 
                  item={child} 
                  onSelect={onSelect} 
                  isSelected={isSelected}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onDuplicate={onDuplicate}
                />
              ))
            )}
          </div>
        )}
      </div>
    );
  }
  
  // Request item rendering
  const getMethodColor = (method: string): string => {
    switch (method.toUpperCase()) {
      case 'GET': return 'bg-green-500';
      case 'POST': return 'bg-blue-500';
      case 'PUT': return 'bg-yellow-500';
      case 'DELETE': return 'bg-red-500';
      case 'PATCH': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };
  
  return (
    <div className="relative group">
      <div 
        className={`flex items-center p-2 hover:bg-gray-100 cursor-pointer ${
          isSelected === item.id ? 'bg-emerald-50 border-l-2 border-emerald-500' : ''
        }`}
        onClick={() => onSelect(item as RequestItemType)}
      >
        <div className={`w-2 h-2 rounded-full mr-2 ${getMethodColor(item.method)}`} />
        <span className="truncate">{item.name}</span>
        
        {onDuplicate && (
          <button 
            className="ml-auto opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 hover:bg-gray-200 rounded"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
          >
            <MoreHorizontal className="h-4 w-4 text-gray-500" />
          </button>
        )}
      </div>
      
      {/* Dropdown menu for request items */}
      {showMenu && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg py-1 z-10">
          {onEdit && (
            <button 
              className="flex w-full items-center px-4 py-2 text-sm text-left hover:bg-gray-100"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(item);
                setShowMenu(false);
              }}
            >
              <Edit className="h-4 w-4 mr-2 text-gray-500" />
              Edit
            </button>
          )}
          {onDuplicate && (
            <button 
              className="flex w-full items-center px-4 py-2 text-sm text-left hover:bg-gray-100"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate(item as RequestItemType);
                setShowMenu(false);
              }}
            >
              <Copy className="h-4 w-4 mr-2 text-gray-500" />
              Duplicate
            </button>
          )}
          {onDelete && (
            <button 
              className="flex w-full items-center px-4 py-2 text-sm text-left hover:bg-gray-100 text-red-600"
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
                  onDelete(item.id, item.type);
                }
                setShowMenu(false);
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
};