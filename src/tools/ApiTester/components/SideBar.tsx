import React, { useState } from 'react';
import { Plus, FolderPlus, Search,X } from 'lucide-react';
import { SidebarProps, CollectionType, FolderItemType } from '../../../types/ApiTesterTypes';
import { CollectionItem } from './CollectionItem';
import { Button } from '../../../components/Button';

export const Sidebar: React.FC<SidebarProps> = ({
  collections,
  selectedRequest,
  onSelectRequest,
  onCreateRequest,
  onCreateCollection,
  onEditCollection,
  onDelete
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'collections' | 'history' | 'favorites'>('collections');
  
  // Enhanced functionality: Search through collections
  const filterCollections = (collections: CollectionType[], term: string): CollectionType[] => {
    if (!term.trim()) return collections;
    
    return collections.map(collection => {
      // Deep clone the collection to avoid modifying the original
      const filteredCollection: CollectionType = {
        ...collection,
        children: []
      };
      
      // Filter children (requests and folders)
      collection.children.forEach(item => {
        if (item.type === 'request') {
          // Check if request matches search term
          if (
            item.name.toLowerCase().includes(term.toLowerCase()) ||
            item.url.toLowerCase().includes(term.toLowerCase()) ||
            (item.description && item.description.toLowerCase().includes(term.toLowerCase()))
          ) {
            filteredCollection.children.push(item);
          }
        } else if (item.type === 'folder') {
          // Recursively filter the folder
          const filteredFolder = filterCollections([item as FolderItemType], term)[0];
          if (filteredFolder.children.length > 0 || 
              filteredFolder.name.toLowerCase().includes(term.toLowerCase())) {
            filteredCollection.children.push(filteredFolder);
          }
        }
      });
      
      return filteredCollection;
    }).filter(collection => 
      collection.children.length > 0 || 
      collection.name.toLowerCase().includes(term.toLowerCase())
    );
  };
  
  const filteredCollections = filterCollections(collections, searchTerm);
  
  // Enhanced: Quick clear search button
  const renderSearchInput = () => (
    <div className="relative">
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search requests..."
        className="w-full px-3 py-2 pl-9 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
      />
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
      {searchTerm && (
        <button 
          className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
          onClick={() => setSearchTerm('')}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
  
  // Enhanced: Add tabs for different views
  const renderTabs = () => (
    <div className="flex border-b border-gray-200 mb-2">
      <button
        className={`px-3 py-2 text-sm font-medium ${
          activeTab === 'collections' 
            ? 'text-emerald-600 border-b-2 border-emerald-500' 
            : 'text-gray-500 hover:text-gray-700'
        }`}
        onClick={() => setActiveTab('collections')}
      >
        Collections
      </button>
      <button
        className={`px-3 py-2 text-sm font-medium ${
          activeTab === 'history' 
            ? 'text-emerald-600 border-b-2 border-emerald-500' 
            : 'text-gray-500 hover:text-gray-700'
        }`}
        onClick={() => setActiveTab('history')}
      >
        History
      </button>
      <button
        className={`px-3 py-2 text-sm font-medium ${
          activeTab === 'favorites' 
            ? 'text-emerald-600 border-b-2 border-emerald-500' 
            : 'text-gray-500 hover:text-gray-700'
        }`}
        onClick={() => setActiveTab('favorites')}
      >
        Favorites
      </button>
    </div>
  );
  
  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200 space-y-2">
        <Button
          onClick={onCreateRequest} 
          className="w-full" 
        >
            <Plus className="mr-2" />
          New Request
        </Button>
        <Button
          variant="outline"
          onClick={onCreateCollection}
          className="w-full"
        >
            <FolderPlus className="mr-2" />
          New Collection
        </Button>
      </div>
      
      <div className="p-2">
        {renderSearchInput()}
      </div>
      
      <div className="p-2 pb-0">
        {renderTabs()}
      </div>
      
      <div className="overflow-y-auto flex-1">
        {activeTab === 'collections' && (
          <>
            {filteredCollections.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                {searchTerm ? 'No matching requests found' : 'No collections yet'}
              </div>
            ) : (
              filteredCollections.map(collection => (
                <CollectionItem 
                  key={collection.id} 
                  item={collection} 
                  onSelect={onSelectRequest} 
                  isSelected={selectedRequest}
                  onEdit={onEditCollection ? 
                    (item) => item.type === 'folder' && onEditCollection(item as CollectionType) : 
                    undefined
                  }
                  onDelete={onDelete}
                  onDuplicate={(item) => {
                    if ((item as unknown as FolderItemType).type === 'folder') {
                      onCreateCollection();
                    } else {
                      onCreateRequest();
                    }
                  }}
                />
              ))
            )}
          </>
        )}
        
        {activeTab === 'history' && (
          <div className="p-4 text-center text-gray-500 text-sm">
            Request history will appear here
          </div>
        )}
        
        {activeTab === 'favorites' && (
          <div className="p-4 text-center text-gray-500 text-sm">
            Favorite requests will appear here
          </div>
        )}
      </div>
      
      {/* Bottom area for environment selector (enhanced feature) */}
      <div className="border-t border-gray-200 p-2">
        <select
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
        >
          <option value="default">No Environment</option>
          <option value="dev">Development</option>
          <option value="staging">Staging</option>
          <option value="prod">Production</option>
        </select>
      </div>
    </div>
  );
};