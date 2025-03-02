import React from 'react';
import {  FileText, Plus } from 'lucide-react';
import { Button } from '../../../components/Button';

interface EmptyRequestStateProps {
  onCreateRequest?: () => void;
}

export const EmptyRequestState: React.FC<EmptyRequestStateProps> = ({ onCreateRequest }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="bg-emerald-50 p-6 rounded-full mb-4">
        <FileText className="h-12 w-12 text-emerald-500" />
      </div>
      <h3 className="text-xl font-medium text-gray-800 mb-2">No Request Selected</h3>
      <p className="text-gray-500 mb-6 max-w-md">
        Select a request from the sidebar or create a new request to get started with testing your API endpoints.
      </p>
      {onCreateRequest && (
        <div className="flex space-x-4">
          <Button
            onClick={onCreateRequest} 
          >
            <Plus className="mr-2" />
            Create New Request
          </Button>
          <Button 
            variant="outline"
            onClick={() => {
              // Demo request with placeholder values
              onCreateRequest();
              // You would then populate with sample data
            }}
          >
            Try a Sample Request
          </Button>
        </div>
      )}
      
      <div className="mt-8 border-t border-gray-100 pt-6 w-full max-w-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Tips:</h4>
        <ul className="text-sm text-gray-600 space-y-2">
          <li className="flex items-start">
            <span className="text-emerald-500 mr-2">•</span>
            Use the <strong>Send</strong> button to make API requests
          </li>
          <li className="flex items-start">
            <span className="text-emerald-500 mr-2">•</span>
            Save requests to collections for easy access later
          </li>
          <li className="flex items-start">
            <span className="text-emerald-500 mr-2">•</span>
            Toggle between REST and GraphQL modes in the top toolbar
          </li>
        </ul>
      </div>
    </div>
  );
};