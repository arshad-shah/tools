// components/DataPreview.tsx
import React from 'react';
import { Code, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './uiComponents';
import * as DataUtils from '../utils';
import { GeneratedDataItem } from '../../../types/RandomDataGeneratorTypes';

interface DataPreviewProps {
  generatedData: GeneratedDataItem[] | null;
  showJson: boolean;
  onToggleView: () => void;
  onDownloadJson: () => void;
}

const DataPreview: React.FC<DataPreviewProps> = ({
  generatedData,
  showJson,
  onToggleView,
  onDownloadJson
}) => {
  return (
    <Card className="w-full md:w-1/2">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Generated Data</CardTitle>
        
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleView}
            className={`p-2 rounded-md ${showJson ? 'bg-rose-100 text-rose-600' : 'bg-gray-100 text-gray-600'} hover:bg-rose-100 hover:text-rose-600 transition-colors`}
            title={showJson ? "Show Table View" : "Show JSON View"}
            aria-label={showJson ? "Show Table View" : "Show JSON View"}
          >
            <Code size={18} />
          </button>
          
          <button
            onClick={onDownloadJson}
            disabled={!generatedData}
            className={`p-2 rounded-md ${!generatedData ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-rose-100 text-rose-600 hover:bg-rose-200'} transition-colors`}
            title="Download JSON"
            aria-label="Download JSON"
          >
            <Download size={18} />
          </button>
        </div>
      </CardHeader>
      
      <CardContent className="h-[calc(100vh-16rem)] overflow-auto">
        {!generatedData ? (
          <EmptyState />
        ) : showJson ? (
          <JsonView data={generatedData} />
        ) : (
          <TableView data={generatedData} />
        )}
      </CardContent>
    </Card>
  );
};

const EmptyState: React.FC = () => (
  <div className="h-full flex flex-col items-center justify-center text-gray-400 p-6">
    <div className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center mb-4">
      <Download size={24} className="text-gray-300" />
    </div>
    <p className="text-center">No data generated yet. Define your schema and click "Generate".</p>
  </div>
);

const JsonView: React.FC<{ data: GeneratedDataItem[] }> = ({ data }) => (
  <pre className="bg-gray-50 p-4 rounded-lg overflow-auto text-sm h-full font-mono text-gray-800">
    {JSON.stringify(data, null, 2)}
  </pre>
);

const TableView: React.FC<{ data: GeneratedDataItem[] }> = ({ data }) => {
  const flattenedData = DataUtils.flattenData(data);
  const headers = DataUtils.getAllHeaders(flattenedData);
  
  return (
    <div className="overflow-x-auto">
      {data.length > 0 && (
        <div className="text-sm text-gray-500 mb-2">
          <span className="font-medium">Note:</span> Complex nested objects are shown as simplified strings in table view. Switch to JSON view for complete structure.
        </div>
      )}
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {headers.map((header) => (
              <th 
                key={header} 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {flattenedData.map((item, idx) => (
            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              {headers.map((header) => (
                <td key={header} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 overflow-hidden max-w-xs truncate">
                  {item[header] !== undefined ? (
                    typeof item[header] === 'boolean' 
                      ? item[header] ? 'true' : 'false'
                      : String(item[header])
                  ) : (
                    <span className="text-gray-300 italic">null</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataPreview;