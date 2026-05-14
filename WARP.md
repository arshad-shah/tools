# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a React/TypeScript tools dashboard application - a collection of development and productivity utilities built as individual tools within a unified web application. The project uses Vite for bundling, Tailwind CSS for styling, and implements a modular plugin-like architecture where each tool is a self-contained component.

## Key Development Commands

### Package Management
- **Install dependencies**: `pnpm install` (project uses pnpm as package manager)
- **Add dependency**: `pnpm add <package>`
- **Add dev dependency**: `pnpm add -D <package>`

### Development Server
- **Start development server**: `pnpm dev`
- **Preview production build**: `pnpm preview`

### Build & Quality
- **Build for production**: `pnpm build` (runs TypeScript compilation then Vite build)
- **Type checking**: `tsc -b` (TypeScript compilation step)
- **Lint code**: `pnpm lint`

## Architecture Overview

### Tool Registration System
The application uses a sophisticated tool registration system with lazy loading:

1. **Tool Definitions** (`src/data/ToolDefinitions.ts`): Central registry where all tools are defined with metadata (name, description, icon, category, etc.)
2. **Tool Registry** (`src/registry/ToolRegistry.ts`): Singleton manager that handles lazy loading of tool components
3. **Tool Constants** (`src/constants.ts`): Centralized tool IDs used throughout the application

### Core Components
- **App.tsx**: Main router that dynamically generates routes for each tool
- **Dashboard.tsx**: Homepage displaying all available tools with search/filtering
- **ToolLayout.tsx**: Shared layout wrapper providing consistent UI for all tools
- **Individual Tools**: Located in `src/tools/[ToolName]/` directories

### Adding New Tools
To add a new tool, you need to:
1. Create component in `src/tools/[ToolName]/[ToolName].tsx`
2. Add tool definition to `TOOL_DEFINITIONS` array in `src/data/ToolDefinitions.ts`
3. Register component in `src/registry/ToolRegistry.ts`
4. Add tool ID constant to `src/constants.ts`

Tools must implement the `ToolProps` interface and accept a `definition` prop.

### State Management
- **Individual Tool State**: Most tools use local React state
- **Pomodoro Tool**: Uses Redux Toolkit with Redux Persist for timer functionality
- **Favorites & Preferences**: Stored in localStorage

### Styling & UI
- **Tailwind CSS v4**: Primary styling framework
- **Framer Motion**: Animation library for smooth transitions
- **Radix UI**: Accessible component primitives
- **Lucide React**: Icon library

### Key Directories
- `src/tools/`: Individual tool implementations (each tool has its own directory)
- `src/components/`: Shared UI components
- `src/types/`: TypeScript type definitions
- `src/data/`: Static data and configurations
- `src/registry/`: Tool registration and management

## Development Patterns

### Tool Structure
Each tool typically follows this structure:
```
src/tools/ToolName/
├── ToolName.tsx          # Main component
├── components/           # Tool-specific components
├── hooks/               # Custom hooks (if needed)
├── utils/               # Utility functions
└── types/               # Tool-specific types
```

### Component Props
All tool components receive a `ToolProps` object containing the tool's metadata definition.

### Routing
- Dashboard: `/`
- Individual tools: `/{tool-id}`
- 404 handling for invalid routes

### Error Handling
- Global error boundary for app-level errors
- Tool-specific error boundaries for individual tool failures
- Graceful fallbacks with retry mechanisms

## Technology Stack

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS v4
- **Animation**: Framer Motion
- **State**: Redux Toolkit (Pomodoro), React state (others)
- **Routing**: React Router DOM v7
- **Icons**: Lucide React
- **UI Components**: Radix UI primitives
- **Package Manager**: pnpm

## CI/CD
GitHub Actions workflow (`.github/workflows/main.yml`) automatically builds and deploys to a `build` branch on pushes to `master`.
