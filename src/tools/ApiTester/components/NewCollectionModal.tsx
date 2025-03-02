import React, { useState } from 'react';
import { X, FolderPlus } from 'lucide-react';
import { NewCollectionModalProps } from '../../../types/ApiTesterTypes';
import { Button } from '../../../components/Button';

export const NewCollectionModal: React.FC<NewCollectionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  description,
  setDescription
}) => {
  const [name, setName] = useState<string>('');
  const [localDescription, setLocalDescription] = useState<string>(description || '');
  
  if (!isOpen) return null;
  
  const handleSave = () => {
    if (!name.trim()) {
      alert("Please enter a collection name");
      return;
    }
    
    // Update description if external state is provided
    if (setDescription) {
      setDescription(localDescription);
    }
    
    onSave(name);
    
    // Reset form
    setName('');
    setLocalDescription('');
    //close modal
    onClose();
  };
  
  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">Create New Collection</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Collection Name*</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Collection"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            autoFocus
            required
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={setDescription ? description : localDescription}
            onChange={(e) => {
              if (setDescription) {
                setDescription(e.target.value);
              } else {
                setLocalDescription(e.target.value);
              }
            }}
            placeholder="Optional description"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            rows={3}
          />
        </div>
        
        <div className="flex justify-end space-x-2">
          <Button 
            variant="outline" 
            onClick={() => {
              onClose();
              setName('');
              setLocalDescription('');
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
          >
            <FolderPlus className="mr-2" />
            Create
          </Button>
        </div>
      </div>
    </div>
  );
};