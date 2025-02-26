# How to Add a New Tool

This guide explains the simple process for adding a new tool to the dashboard.

## Step 1: Create the Tool Component

Create a new file in the `src/tools` directory for your tool component:

```tsx
// src/tools/YourNewTool.tsx

import React from 'react';
import { ToolProps } from '../types/ToolTypes';

const YourNewTool: React.FC<ToolProps> = ({ definition }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-8">
        <definition.icon size={24} className="text-blue-400" />
        <h2 className="text-2xl font-bold">{definition.name}</h2>
      </div>
      
      <p className="text-gray-300 mb-6">{definition.description}</p>
      
      {/* Your tool content here */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <p>Your amazing new tool content goes here!</p>
      </div>
    </div>
  );
};

export default YourNewTool;
```

## Step 2: Add Your Tool Definition

Add your tool's metadata to the `TOOL_DEFINITIONS` array in `src/data/ToolDefinitions.ts`:

```tsx
// In src/data/ToolDefinitions.ts

import { Calculator } from 'lucide-react';  // Import the icon you want to use

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  // ... existing tools
  
  {
    id: 'your-tool-id',           // Used for routing - must be URL-friendly
    name: 'Your Tool Name',        // Display name
    description: 'What your tool does', // Short description
    icon: Calculator,              // Lucide icon
    color: 'bg-indigo-500',        // Tailwind color class
    enabled: true,                 // Available immediately
    category: 'utility',           // Tool category
    version: '1.0.0',              // Optional version
  }
];
```

## Step 3: Register Your Tool Component

Register your tool component in the registry by adding it to `src/registry/ToolRegistry.ts`:

```tsx
// In src/registry/ToolRegistry.ts

import YourNewTool from '../tools/YourNewTool';

// Add your tool to the registry
toolRegistry.register('your-tool-id', YourNewTool);

// Or update the bulk registration:
toolRegistry.registerTools({
  'color-tester': ColorTester,
  'json-viewer': JsonViewer,
  'password-generator': PasswordGenerator,
  'pomodoro-timer': PomodoroTimer,
  'your-tool-id': YourNewTool,
});
```

That's it! Your tool will now automatically:

1. Appear on the dashboard
2. Have a dedicated route at `/your-tool-id`
3. Use the shared layout with navigation
4. Be searchable

## Best Practices

1. **Keep tool components focused**: Each tool should do one thing well
2. **Use shared UI components**: Create reusable components for common patterns
3. **Follow naming conventions**: Use consistent naming patterns
4. **Add proper TypeScript types**: Ensure type safety in your components
5. **Use React hooks effectively**: For state management and side effects

## Example: Calculator Tool

Here's a complete example of adding a calculator tool:

```tsx
// src/tools/Calculator.tsx
import React, { useState } from 'react';
import { ToolProps } from '../types/ToolTypes';

const Calculator: React.FC<ToolProps> = ({ definition }) => {
  const [num1, setNum1] = useState<string>('0');
  const [num2, setNum2] = useState<string>('0');
  const [operation, setOperation] = useState<string>('+');
  const [result, setResult] = useState<number>(0);

  const calculate = () => {
    const a = parseFloat(num1);
    const b = parseFloat(num2);
    
    switch (operation) {
      case '+': setResult(a + b); break;
      case '-': setResult(a - b); break;
      case '*': setResult(a * b); break;
      case '/': setResult(b !== 0 ? a / b : NaN); break;
      default: setResult(0);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-8">
        <definition.icon size={24} className="text-blue-400" />
        <h2 className="text-2xl font-bold">{definition.name}</h2>
      </div>
      
      <div className="bg-gray-800 p-6 rounded-lg">
        <div className="grid grid-cols-1 gap-4">
          <input
            type="number"
            value={num1}
            onChange={(e) => setNum1(e.target.value)}
            className="p-2 bg-gray-700 text-white rounded"
          />
          
          <select
            value={operation}
            onChange={(e) => setOperation(e.target.value)}
            className="p-2 bg-gray-700 text-white rounded"
          >
            <option value="+">+</option>
            <option value="-">-</option>
            <option value="*">×</option>
            <option value="/">÷</option>
          </select>
          
          <input
            type="number"
            value={num2}
            onChange={(e) => setNum2(e.target.value)}
            className="p-2 bg-gray-700 text-white rounded"
          />
          
          <button
            onClick={calculate}
            className="p-2 bg-blue-600 text-white rounded"
          >
            Calculate
          </button>
          
          <div className="p-4 bg-gray-900 rounded text-white text-xl text-center">
            Result: {isNaN(result) ? 'Error' : result}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calculator;
```

Then add it to both the tool definitions and registry as described above.