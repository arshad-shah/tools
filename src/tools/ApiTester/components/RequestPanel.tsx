import React from 'react';
import { Send, Plus } from 'lucide-react';
import { HeaderInput } from './HeaderInput';
import { ParamInput } from './ParamInput';
import { CodeEditor } from './CodeEditor';
import { RequestPanelProps } from '../../../types/ApiTesterTypes';
import { Button } from '../../../components/Button';
import { SelectField } from './SelectField';
import { InputField } from './InputField';

export const RequestPanel: React.FC<RequestPanelProps> = ({
  requestType,
  method,
  url,
  headers,
  params,
  bodyType,
  body,
  graphqlQuery,
  graphqlVariables,
  buildUrl,
  onMethodChange,
  onUrlChange,
  onHeaderChange,
  onAddHeader,
  onRemoveHeader,
  onParamChange,
  onAddParam,
  onRemoveParam,
  onBodyTypeChange,
  onBodyChange,
  onGraphqlQueryChange,
  onGraphqlVariablesChange,
  onSendRequest
}) => {
  const renderRestPanel = () => (
    <>
      <div className="flex space-x-2 mb-4">
        <SelectField
          label="Method"
          value={method}
          onChange={onMethodChange}
          options={[
            { value: 'GET', label: 'GET' },
            { value: 'POST', label: 'POST' },
            { value: 'PUT', label: 'PUT' },
            { value: 'DELETE', label: 'DELETE' },
            { value: 'PATCH', label: 'PATCH' },
            { value: 'HEAD', label: 'HEAD' },
            { value: 'OPTIONS', label: 'OPTIONS' }
          ]}
          className="w-36 flex-none"
        />
        <InputField
          label="URL"
          value={url}
          onChange={onUrlChange}
          placeholder="https://api.example.com/endpoint"
          className="flex-1"
        />
        <div className="flex items-end mb-4">
          <Button onClick={onSendRequest} >
            <Send className="mr-2" />
            Send</Button>
        </div>
      </div>
      
      <div className="mb-6">
        <div className="flex items-center mb-2">
          <h3 className="text-md font-medium">Parameters</h3>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onAddParam} 
            className="ml-auto"
          >
            <Plus className="mr-1" />
            Add
          </Button>
        </div>
        <div className="border border-gray-200 rounded-md p-2 bg-gray-50">
          <div className="text-xs text-gray-500 mb-2">
            URL Preview: <span className="font-mono">{buildUrl()}</span>
          </div>
          {params.map((param, index) => (
            <ParamInput
              key={index}
              param={param}
              index={index}
              onChange={onParamChange}
              onRemove={onRemoveParam}
            />
          ))}
        </div>
      </div>
      
      <div className="mb-6">
        <div className="flex items-center mb-2">
          <h3 className="text-md font-medium">Headers</h3>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onAddHeader} 
            className="ml-auto"
          >
            <Plus className="mr-1" />
            Add
          </Button>
        </div>
        <div className="border border-gray-200 rounded-md p-2 bg-gray-50">
          {headers.map((header, index) => (
            <HeaderInput
              key={index}
              header={header}
              index={index}
              onChange={onHeaderChange}
              onRemove={onRemoveHeader}
            />
          ))}
        </div>
      </div>
      
      {method !== 'GET' && (
        <div>
          <div className="flex items-center mb-2">
            <h3 className="text-md font-medium">Body</h3>
            <div className="ml-auto">
              <select
                value={bodyType}
                onChange={onBodyTypeChange}
                className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="none">None</option>
                <option value="json">JSON</option>
                <option value="form-data">Form Data</option>
                <option value="x-www-form-urlencoded">x-www-form-urlencoded</option>
              </select>
            </div>
          </div>
          
          {bodyType === 'json' && (
            <CodeEditor
              value={body}
              onChange={onBodyChange}
              language="json"
            />
          )}
          
          {bodyType === 'form-data' && (
            <div className="border border-gray-200 rounded-md p-2 bg-gray-50">
              <p className="text-sm text-gray-600 mb-2">
                Enter JSON object representing form data:
              </p>
              <CodeEditor
                value={body}
                onChange={onBodyChange}
                language="json"
              />
            </div>
          )}
          
          {bodyType === 'x-www-form-urlencoded' && (
            <div className="border border-gray-200 rounded-md p-2 bg-gray-50">
              <p className="text-sm text-gray-600 mb-2">
                Enter data in format: key=value&key2=value2
              </p>
              <textarea
                value={body}
                onChange={onBodyChange}
                className="w-full p-2 font-mono text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                rows={5}
                placeholder="key1=value1&key2=value2"
              />
            </div>
          )}
        </div>
      )}
    </>
  );
  
  const renderGraphQLPanel = () => (
    <>
      <div className="flex space-x-2 mb-4">
        <InputField
          label="GraphQL Endpoint"
          value={url}
          onChange={onUrlChange}
          placeholder="https://api.example.com/graphql"
          className="flex-1"
        />
        <div className="flex items-end mb-4">
          <Button onClick={onSendRequest} >
            <Send className="mr-2" />
            Send</Button>
        </div>
      </div>
      
      <div className="mb-6">
        <div className="flex items-center mb-2">
          <h3 className="text-md font-medium">Headers</h3>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onAddHeader} 
            className="ml-auto"
          >
            <Plus className="mr-1" />
            Add
          </Button>
        </div>
        <div className="border border-gray-200 rounded-md p-2 bg-gray-50">
          {headers.map((header, index) => (
            <HeaderInput
              key={index}
              header={header}
              index={index}
              onChange={onHeaderChange}
              onRemove={onRemoveHeader}
            />
          ))}
        </div>
      </div>
      
      <div className="mb-4">
        <h3 className="text-md font-medium mb-2">Query</h3>
        <CodeEditor
          value={graphqlQuery}
          onChange={onGraphqlQueryChange}
          language="graphql"
        />
      </div>
      
      <div>
        <h3 className="text-md font-medium mb-2">Variables</h3>
        <CodeEditor
          value={graphqlVariables}
          onChange={onGraphqlVariablesChange}
          language="json"
        />
      </div>
    </>
  );
  
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      {requestType === 'rest' ? renderRestPanel() : renderGraphQLPanel()}
    </div>
  );
};