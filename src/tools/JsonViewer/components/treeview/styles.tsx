export const NodeStyles = {
  container: (isPrimitive: boolean) => `
    relative rounded-xl shadow-lg transition-all duration-200 
    ${isPrimitive 
      ? 'bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700' 
      : 'bg-gradient-to-br from-blue-900 to-indigo-900 border border-blue-700'
    }
    hover:shadow-xl hover:scale-105
  `,
  
  indicator: (isObject: boolean) => `
    w-2 h-2 rounded-full
    ${isObject ? 'bg-yellow-400' : 'bg-green-400'}
  `,
  
  content: (isPrimitive: boolean) => `
    ${isPrimitive ? 'text-emerald-400' : 'text-blue-300'}
    text-sm font-mono rounded-lg
    ${isPrimitive ? 'bg-gray-800/50' : 'bg-blue-950/50'}
    p-2 backdrop-blur-sm
  `,
  
  handle: "w-3 h-3 bg-blue-400 border-2 border-blue-600"
};

export const FlowStyles = {
  container: "h-screen w-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900",
  
  minimap: "bg-gray-800/80 rounded-lg border border-gray-700",
  
  controls: "bg-gray-800/80 border border-gray-700 rounded-lg p-2",
  
  background: "opacity-5"
};