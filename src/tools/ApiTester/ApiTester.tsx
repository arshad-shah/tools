/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { Save } from 'lucide-react';
import { RequestPanel } from './components/RequestPanel';
import { ResponsePanel } from './components/ResponsePanel';
import { Sidebar } from './components/SideBar';
import { SaveRequestModal } from './components/SaveRequestModal';
import { NewCollectionModal } from './components/NewCollectionModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { 
  RequestItemType, 
  ParamType, 
  HeaderType, 
  ResponseType,
  BodyType,
  CollectionType,
  FolderItemType
} from '../../types/ApiTesterTypes';
import { useLocalStorage } from '../../hooks/useLocalStorage.hook';
import { Button } from '../../components/Button';
import { EmptyRequestState } from './components/EmptyRequestState';

const ApiTester: React.FC = () => {
  // Request state
  const [requestType, setRequestType] = useState<'rest' | 'graphql'>('rest');
  const [method, setMethod] = useState<string>('GET');
  const [url, setUrl] = useState<string>('');
  const [headers, setHeaders] = useState<HeaderType[]>([{ key: '', value: '' }]);
  const [params, setParams] = useState<ParamType[]>([{ key: '', value: '', enabled: true }]);
  const [bodyType, setBodyType] = useState<BodyType>('none');
  const [body, setBody] = useState<string>('');
  const [graphqlQuery, setGraphqlQuery] = useState<string>('');
  const [graphqlVariables, setGraphqlVariables] = useState<string>('');
  
  // Response state
  const [response, setResponse] = useState<ResponseType | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // UI state
  const [sidebarActive, setSidebarActive] = useState<boolean>(true);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [saveModalOpen, setSaveModalOpen] = useState<boolean>(false);
  const [saveName, setSaveName] = useState<string>('');
  const [newCollectionModalOpen, setNewCollectionModalOpen] = useState<boolean>(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('');
  
  // Collections state with localStorage persistence
  const [collections, setCollections] = useLocalStorage<CollectionType[]>(
    'apiTesterCollections',
    [
      {
        id: '1',
        type: 'folder',
        name: 'My Collection',
        children: [
          { id: '2', type: 'request', name: 'Get Users', method: 'GET', url: 'https://jsonplaceholder.typicode.com/users' },
          { id: '3', type: 'request', name: 'Create User', method: 'POST', url: 'https://jsonplaceholder.typicode.com/users' }
        ]
      }
    ]
  );

  // Headers management
  const handleAddHeader = (): void => {
    setHeaders([...headers, { key: '', value: '' }]);
  };
  
  const handleRemoveHeader = (index: number): void => {
    const newHeaders = [...headers];
    newHeaders.splice(index, 1);
    setHeaders(newHeaders);
  };
  
  const handleHeaderChange = (index: number, field: string, value: string): void => {
    const newHeaders = [...headers];
    newHeaders[index] = { ...newHeaders[index], [field]: value };
    setHeaders(newHeaders);
  };
  
  // Parameters management
  const handleAddParam = (): void => {
    setParams([...params, { key: '', value: '', enabled: true }]);
  };
  
  const handleRemoveParam = (index: number): void => {
    const newParams = [...params];
    newParams.splice(index, 1);
    setParams(newParams);
  };
  
  const handleParamChange = (index: number, field: string, value: any): void => {
    const newParams = [...params];
    newParams[index] = { ...newParams[index], [field]: value };
    setParams(newParams);
  };
  
  // Build URL with query parameters
  const buildUrl = (): string => {
    try {
      const parsedUrl = new URL(url);
      const enabledParams = params.filter(p => p.enabled && p.key.trim());
      
      enabledParams.forEach(param => {
        parsedUrl.searchParams.append(param.key, param.value);
      });
      
      return parsedUrl.toString();
    } catch {
      return url; // Return original if not a valid URL
    }
  };
  
  // Request handling
  const handleSendRequest = async (): Promise<void> => {
    if (!url) {
      alert("Please enter a URL");
      return;
    }
    
    setIsLoading(true);
    const startTime = performance.now();
    
    try {
      let response: ResponseType;
      
      if (requestType === 'rest') {
        // Prepare headers
        const headerObj: Record<string, string> = {};
        headers.forEach(header => {
          if (header.key.trim() && header.value.trim()) {
            headerObj[header.key.trim()] = header.value.trim();
          }
        });
        
        // Prepare request URL with query parameters for GET requests
        let requestUrl = url;
        if (method === 'GET') {
          requestUrl = buildUrl();
        }
        
        // Prepare request body for non-GET requests
        let requestBody: any = undefined;
        if (method !== 'GET' && bodyType === 'json' && body.trim()) {
          try {
            requestBody = JSON.parse(body);
            headerObj['Content-Type'] = 'application/json';
          } catch {
            alert("Invalid JSON in request body");
            setIsLoading(false);
            return;
          }
        } else if (method !== 'GET' && bodyType === 'x-www-form-urlencoded') {
          const formData = new URLSearchParams();
          // Assume body is in format key=value&key2=value2
          body.split('&').forEach(pair => {
            const [key, value] = pair.split('=');
            if (key) formData.append(key, value || '');
          });
          requestBody = formData;
          headerObj['Content-Type'] = 'application/x-www-form-urlencoded';
        } else if (method !== 'GET' && bodyType === 'form-data') {
          const formData = new FormData();
          // For form-data, we would need proper form inputs
          // This is a simplified implementation
          try {
            const formObj = JSON.parse(body);
            Object.entries(formObj).forEach(([key, value]) => {
              formData.append(key, String(value));
            });
          } catch {
            alert("Invalid form data format. Use JSON object for now.");
            setIsLoading(false);
            return;
          }
          requestBody = formData;
          // Don't set Content-Type for FormData - browser will set it with boundary
        }
        
        // Make the actual REST API call
        const fetchResponse = await fetch(requestUrl, {
          method: method,
          headers: headerObj,
          body: requestBody
        });
        
        // Process response
        const responseHeaders: Record<string, string> = {};
        fetchResponse.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });
        
        let responseData: any;
        const contentType = fetchResponse.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          responseData = await fetchResponse.json();
        } else {
          responseData = await fetchResponse.text();
        }
        
        response = {
          status: fetchResponse.status,
          statusText: fetchResponse.statusText,
          time: Math.round(performance.now() - startTime),
          headers: responseHeaders,
          data: responseData
        };
      } else { // GraphQL
        // Prepare headers
        const headerObj: Record<string, string> = {
          'Content-Type': 'application/json'
        };
        
        headers.forEach(header => {
          if (header.key.trim() && header.value.trim()) {
            headerObj[header.key.trim()] = header.value.trim();
          }
        });
        
        // Prepare GraphQL request
        let variables: Record<string, unknown> = {};
        if (graphqlVariables.trim()) {
          try {
            variables = JSON.parse(graphqlVariables);
          } catch {
            alert("Invalid JSON in GraphQL variables");
            setIsLoading(false);
            return;
          }
        }
        
        const graphqlRequest = {
          query: graphqlQuery,
          variables: variables
        };
        
        // Make the actual GraphQL API call
        const fetchResponse = await fetch(url, {
          method: 'POST',
          headers: headerObj,
          body: JSON.stringify(graphqlRequest)
        });
        
        // Process response
        const responseHeaders: Record<string, string> = {};
        fetchResponse.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });
        
        const responseData = await fetchResponse.json();
        
        response = {
          status: fetchResponse.status,
          statusText: fetchResponse.statusText,
          time: Math.round(performance.now() - startTime),
          headers: responseHeaders,
          data: responseData
        };
      }
      
      setResponse(response);
    } catch (error: unknown) {
      // Handle network errors
      setResponse({
        status: 0,
        statusText: 'Network Error',
        time: Math.round(performance.now() - startTime),
        headers: {},
        data: { error: (error instanceof Error ? error.message : "Failed to connect to the server") }
      });
      console.error("API Request failed:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Collection management
  const handleSelectRequest = (request: RequestItemType): void => {
    setSelectedRequest(request.id);
    
    // Load all request details
    if (request.requestType) {
      setRequestType(request.requestType as 'rest' | 'graphql');
    }
    
    setMethod(request.method);
    setUrl(request.url);
    
    // Load headers if available
    if (request.headers && Array.isArray(request.headers)) {
      setHeaders(request.headers.length > 0 ? [...request.headers] : [{ key: '', value: '' }]);
    }
    
    // Load params if available
    if (request.params && Array.isArray(request.params)) {
      setParams(request.params.length > 0 ? [...request.params] : [{ key: '', value: '', enabled: true }]);
    }
    
    // Load body settings if available
    if (request.bodyType) {
      setBodyType(request.bodyType as BodyType);
    }
    
    if (request.body !== undefined) {
      setBody(request.body);
    }
    
    // Load GraphQL settings if available
    if (request.graphqlQuery !== undefined) {
      setGraphqlQuery(request.graphqlQuery);
    }
    
    if (request.graphqlVariables !== undefined) {
      setGraphqlVariables(request.graphqlVariables);
    }
  };
  
const handleSaveRequest = (): void => {
    if (!saveName) {
      alert("Please enter a name for your request");
      return;
    }
    
    // Create new request object with all current settings
    const newRequest: RequestItemType = {
      id: Date.now().toString(), // Generate unique ID
      type: 'request',
      name: saveName,
      method: method,
      url: url,
      requestType: requestType,
      headers: [...headers],
      params: [...params],
      bodyType: bodyType,
      body: body,
      graphqlQuery: graphqlQuery,
      graphqlVariables: graphqlVariables,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    // Find the target collection to add the request to
    const targetCollectionId = selectedCollectionId || (collections.length > 0 ? collections[0].id : null);
    
    if (!targetCollectionId) {
      alert("No collection available to save to. Please create a collection first.");
      return;
    }
    
    const newCollections = [...collections];
    
    // Helper function to add request to the right collection (supports nested collections)
    const addRequestToCollection = (items: (RequestItemType | FolderItemType)[]) => {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type === 'folder' && item.id === targetCollectionId) {
          item.children = [...item.children, newRequest];
          return true;
        } else if (item.type === 'folder') {
          if (addRequestToCollection(item.children)) {
            return true;
          }
        }
      }
      return false;
    };
    
    // Try to add the request to the selected collection
    if (addRequestToCollection(newCollections)) {
      setCollections(newCollections);
      setSelectedRequest(newRequest.id);
    } else {
      // Fallback to first collection if target not found
      if (newCollections.length > 0) {
        newCollections[0].children = [...newCollections[0].children, newRequest];
        setCollections(newCollections);
        setSelectedRequest(newRequest.id);
      }
    }
  };
  const handleCreateCollection = (name: string): void => {
    const newCollection: CollectionType = {
      id: Date.now().toString(),
      type: 'folder',
      name: name,
      children: []
    };
    
    const newCollections = [...collections, newCollection];
    setCollections(newCollections);
  };

  const handleCreateNewRequest = () => {
    // Create new blank request and select it
    const newRequest: RequestItemType = {
      id: Date.now().toString(),
      type: 'request',
      name: 'New Request',
      method: 'GET',
      url: '',
      requestType: 'rest'
    };
    
    // Add to first collection if it exists
    if (collections.length > 0) {
      const newCollections = [...collections];
      newCollections[0].children = [...newCollections[0].children, newRequest];
      setCollections(newCollections);
      
      // Reset form and select the new request
      setMethod('GET');
      setUrl('');
      setHeaders([{ key: '', value: '' }]);
      setParams([{ key: '', value: '', enabled: true }]);
      setBodyType('none');
      setBody('');
      setGraphqlQuery('');
      setGraphqlVariables('');
      setSelectedRequest(newRequest.id);
    } else {
      // If no collections exist, prompt to create one
      setNewCollectionModalOpen(true);
    }
  };
  
  return (
    <ErrorBoundary>
      <div className="flex flex-col h-screen bg-gray-50 align-middle justify-center">
        
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          {sidebarActive && (
            <Sidebar 
              collections={collections}
              selectedRequest={selectedRequest}
              onSelectRequest={handleSelectRequest}
              onCreateRequest={handleCreateNewRequest}
              onCreateCollection={() => setNewCollectionModalOpen(true)}
              onDelete={(itemId, type) => {
                if (type === 'request') {
                  const newCollections = [...collections];
                  const requestIndex = newCollections[0].children.findIndex(r => r.id === itemId);
                  if (requestIndex !== -1) {
                    newCollections[0].children.splice(requestIndex, 1);
                    setCollections(newCollections);
                    setSelectedRequest(null);
                  }
                }else if (type === 'folder') {
                  const newCollections = collections.filter(c => c.id !== itemId);
                  setCollections(newCollections);
                }
            }}
            
            />
          )}
          
          {/* Main Content */}
          {
            selectedRequest ?
            
            (<div className="flex-1 overflow-hidden flex flex-col">
            {/* Tab Controls */}
            <div className="bg-gray-100 border-b border-gray-200 p-2 flex space-x-2">
              <Button 
                variant={requestType === 'rest' ? 'primary' : 'outline'} 
                size="sm" 
                onClick={() => setRequestType('rest')}
              >
                REST
              </Button>
              <Button 
                variant={requestType === 'graphql' ? 'primary' : 'outline'} 
                size="sm" 
                onClick={() => setRequestType('graphql')}
              >
                GraphQL
              </Button>
              <div className="ml-auto flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setSaveModalOpen(true)}
                >
                    <Save className="mr-2" />
                  Save
                </Button>
                <Button
                  variant={sidebarActive ? 'secondary' : 'outline'} 
                  size="sm" 
                  onClick={() => setSidebarActive(!sidebarActive)}
                >
                  {sidebarActive ? 'Hide Collections' : 'Show Collections'}
                </Button>
              </div>
            </div>
            
            {/* Main Request Form Area */}
            <div className="flex-1 overflow-y-auto p-4">
              <RequestPanel
                requestType={requestType}
                method={method}
                url={url}
                headers={headers}
                params={params}
                bodyType={bodyType}
                body={body}
                graphqlQuery={graphqlQuery}
                graphqlVariables={graphqlVariables}
                buildUrl={buildUrl}
                onMethodChange={(e) => setMethod(e.target.value)}
                onUrlChange={(e) => setUrl(e.target.value)}
                onHeaderChange={handleHeaderChange}
                onAddHeader={handleAddHeader}
                onRemoveHeader={handleRemoveHeader}
                onParamChange={handleParamChange}
                onAddParam={handleAddParam}
                onRemoveParam={handleRemoveParam}
                onBodyTypeChange={(e) => setBodyType(e.target.value as BodyType)}
                onBodyChange={(e) => setBody(e.target.value)}
                onGraphqlQueryChange={(e) => setGraphqlQuery(e.target.value)}
                onGraphqlVariablesChange={(e) => setGraphqlVariables(e.target.value)}
                onSendRequest={handleSendRequest}
              />
              
              <ResponsePanel 
                response={response} 
                isLoading={isLoading} 
              />
            </div>
          </div>): (
            <EmptyRequestState />
          )}
        </div>
        
        <SaveRequestModal
          isOpen={saveModalOpen}
          onClose={() => setSaveModalOpen(false)}
          onSave={handleSaveRequest}
          name={saveName}
          setName={setSaveName}
          collections={collections}
          selectedCollection={selectedCollectionId}
          setSelectedCollection={setSelectedCollectionId}
        />
        
        <NewCollectionModal
          isOpen={newCollectionModalOpen}
          onClose={() => setNewCollectionModalOpen(false)}
          onSave={handleCreateCollection}
        />
      </div>
    </ErrorBoundary>
  );
};

export default ApiTester;