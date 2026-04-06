# GitHub Copilot Instructions for Tools Dashboard

## Architecture Overview

This is a React + TypeScript utility dashboard with a **plugin-style architecture** where each tool is a self-contained module. The app uses:

- **Vite** for build tooling with `pnpm` package manager
- **React Router** for routing with lazy-loaded components
- **TailwindCSS** for styling with Radix UI primitives
- **Tool Registry pattern** for dynamic component loading

## Key Architecture Patterns

### 3-Step Tool Integration
Every new tool requires exactly 3 files to be modified:

1. **Create component**: `src/tools/ToolName/ToolName.tsx`
2. **Add definition**: `src/data/ToolDefinitions.ts` 
3. **Register component**: `src/registry/ToolRegistry.ts`

### Tool Component Structure
All tools must follow this contract:
```tsx
import { ToolProps } from '../types/ToolTypes';

const YourTool: React.FC<ToolProps> = ({ definition }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-8">
        <definition.icon size={24} className="text-blue-400" />
        <h2 className="text-2xl font-bold">{definition.name}</h2>
      </div>
      {/* Tool content */}
    </div>
  );
};
```

### Lazy Loading Registry
The `ToolRegistry.ts` uses dynamic imports for code splitting:
```tsx
[TOOL_IDS.YOUR_TOOL]: () => import('../tools/YourTool/YourTool')
```

## File Organization Conventions

### Tool Structure
Complex tools use this folder pattern:
```
src/tools/ToolName/
├── ToolName.tsx          # Main component
├── components/           # Tool-specific UI components
├── hooks/               # Tool-specific React hooks  
├── utils/               # Tool utility functions
└── types/               # Tool-specific TypeScript types (if complex)
```

### Shared Resources
- `src/constants.ts` - Tool IDs as constants (prevents typos)
- `src/types/ToolTypes.ts` - Core interfaces for tool system
- `src/components/` - Shared UI components (Button, Card, etc.)
- `src/lib/utils.ts` - Shared utility functions

## Development Workflows

### Adding a New Tool
1. Add ID to `TOOL_IDS` in `src/constants.ts`
2. Create tool definition in `src/data/ToolDefinitions.ts`
3. Create component in `src/tools/ToolName/`
4. Register in `src/registry/ToolRegistry.ts`

### Running the App
- **Dev server**: `pnpm dev` (Vite dev server on port 5173)
- **Build**: `pnpm build` (TypeScript + Vite build)
- **Lint**: `pnpm lint` (ESLint with TypeScript rules)

## Project-Specific Conventions

### Tool Categories
Use predefined categories: `'design' | 'development' | 'security' | 'productivity' | 'utility' | 'science' | 'ai'`

### Icons and Colors
- Icons: Use **Lucide React** icons only
- Colors: Use **TailwindCSS** `bg-{color}-500` format for consistency
- Example: `icon: Calculator, color: "bg-amber-500"`

### State Management Patterns

#### Local State (Default)
Most tools use React's `useState` for temporary data that doesn't need persistence.

#### Persistent State with useLocalStorage Hook
Tools that need to save user data use the custom `useLocalStorage` hook:
```tsx
import { useLocalStorage } from '../../hooks/useLocalStorage.hook';

const [collections, setCollections] = useLocalStorage<CollectionType[]>(
  'apiTesterCollections', // localStorage key
  defaultValue
);
```

#### Direct localStorage Usage
Some tools use direct localStorage for specific needs:
```tsx
// Dashboard favorites
localStorage.setItem('favoriteTools', JSON.stringify(favorites));

// Calculator history/memory 
localStorage.setItem('calcHistory', JSON.stringify(calculationHistory));
localStorage.setItem('memories', JSON.stringify(memories));
```

#### Redux + Persistence (Pomodoro Only)
The Pomodoro timer uses Redux Toolkit with Redux Persist:
```tsx
// Wrapped with Provider and PersistGate
<Provider store={store}>
  <PersistGate loading={null} persistor={persistor}>
```

### Storage Keys by Tool
- `favoriteTools` - Dashboard starred tools
- `apiTesterCollections` - API Tester saved requests
- `calcHistory`, `savedCalculations`, `memories` - Calculator data
- `darkMode` - Log Parser theme preference

### Styling Patterns
- **Dark theme** with slate color palette as primary
- **Gradient backgrounds**: `bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800`
- **Glass morphism**: Use `backdrop-filter: blur()` for modern UI effects
- **Consistent spacing**: `space-y-6` for vertical rhythm

## Error Handling
- `ErrorBoundary` wraps the entire app
- `ToolErrorBoundary` for individual tool failures
- Tools should handle their own input validation and edge cases

## Integration Points

### Router Integration
Tools are automatically routed at `/{tool-id}` based on `ToolDefinitions.ts`. The `App.tsx` dynamically generates routes.

### Shared UI Components
Leverage existing components in `src/components/`:
- `Button`, `Card`, `Badge` for basic UI
- `Switch`, `Slider`, `Select` for form controls
- `Progress`, `LoadingFallback` for feedback

### External Libraries
Common libraries already included:
- `mathjs` - Mathematical calculations
- `crypto-js` - Cryptographic functions
- `papaparse` - CSV parsing
- `framer-motion` - Animations
- `qrcode.react` - QR code generation