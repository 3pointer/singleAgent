# Chatground Development Guide

## Commands
- `pnpm dev` - Start development server with turbo
- `pnpm build` - Build for production
- `pnpm lint` - Run ESLint and Biome linting
- `pnpm lint:fix` - Fix linting issues 
- `pnpm format` - Format code with Biome
- `pnpm db:migrate` - Run database migrations
- `pnpm db:studio` - Open Drizzle Studio for database management

## Code Style Guidelines
- **TypeScript**: Use strict mode with proper type annotations
- **Formatting**: Single quotes, 2 space indentation, 80 chars line width
- **Imports**: Group imports by type (React, libraries, components, types)
- **Components**: Use functional React components with proper TypeScript typing
- **State Management**: Use React hooks for state management
- **Error Handling**: Use try/catch for async operations
- **Naming**: 
  - Components: PascalCase
  - Functions/variables: camelCase
  - Files: kebab-case for components, camelCase for utilities
- **Styling**: Use Tailwind CSS with shadcn/ui components
- **UI Components**: Leverage shadcn/ui component library