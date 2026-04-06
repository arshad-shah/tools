import { Braces, Brackets } from "lucide-react";

const ObjectRenderer: React.FC<{
  data: unknown;
  depth?: number;
  maxDepth?: number;
}> = ({ data, depth = 0, maxDepth = 3 }) => {
  if (data === null || data === undefined) {
    return <span className="text-gray-400 italic">null</span>;
  }

  if (typeof data === 'string') {
    return <span className="text-green-700">"{data}"</span>;
  }

  if (typeof data === 'number') {
    return <span className="text-blue-600">{data}</span>;
  }

  if (typeof data === 'boolean') {
    return <span className="text-purple-600">{data ? 'true' : 'false'}</span>;
  }

  if (Array.isArray(data)) {
    if (depth >= maxDepth) {
      return (
        <span className="text-gray-500 italic">
          <Brackets className="w-3 h-3 inline mr-1" />
          Array[{data.length}]
        </span>
      );
    }

    return (
      <div className="space-y-1">
        <div className="flex items-center text-gray-600">
          <Brackets className="w-4 h-4 mr-1" />
          <span className="text-sm font-medium">Array ({data.length} items)</span>
        </div>
        <div className="ml-4 pl-4 border-l-2 border-gray-100 space-y-1">
          {data.map((item, index) => (
            <div key={index} className="flex items-start">
              <span className="text-gray-400 text-sm mr-2 mt-1">{index}:</span>
              <ObjectRenderer data={item} depth={depth + 1} maxDepth={maxDepth} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data as Record<string, unknown>);
    
    if (depth >= maxDepth) {
      return (
        <span className="text-gray-500 italic">
          <Braces className="w-3 h-3 inline mr-1" />
          Object[{entries.length} keys]
        </span>
      );
    }

    return (
      <div className="space-y-1">
        <div className="flex items-center text-gray-600">
          <Braces className="w-4 h-4 mr-1" />
          <span className="text-sm font-medium">Object ({entries.length} properties)</span>
        </div>
        <div className="ml-4 pl-4 border-l-2 border-gray-100 space-y-1">
          {entries.map(([key, value]) => (
            <div key={key} className="flex items-start">
              <span className="text-pink-600 text-sm mr-2 mt-1 font-mono">"{key}":</span>
              <ObjectRenderer data={value} depth={depth + 1} maxDepth={maxDepth} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <span className="text-gray-600">{String(data)}</span>;
};

export default ObjectRenderer;