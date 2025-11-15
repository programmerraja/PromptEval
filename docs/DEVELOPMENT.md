# PromptEval - Development Documentation

## Project Overview

**PromptEval** is a comprehensive prompt testing and evaluation platform built with modern web technologies. It provides a complete workflow for creating, testing, and evaluating AI prompts using datasets and automated evaluation systems.

## Technology Stack

### Frontend Framework
- **React 18.3.1** - Modern React with hooks and functional components
- **TypeScript 5.8.3** - Type-safe development
- **Vite 5.4.19** - Fast build tool and development server

### UI Framework
- **shadcn/ui** - Modern, accessible component library
- **Radix UI** - Headless UI primitives for accessibility
- **Tailwind CSS 3.4.17** - Utility-first CSS framework
- **Lucide React** - Beautiful icon library

### State Management
- **Zustand 5.0.8** - Lightweight state management
- **React Query (TanStack Query) 5.83.0** - Server state management and caching

### Database & Storage
- **Dexie 4.2.1** - IndexedDB wrapper for client-side storage
- **dexie-react-hooks 4.2.0** - React hooks for Dexie

### AI Integration
- **AI SDK 5.0.68** - Vercel AI SDK for LLM integration
- **@ai-sdk/openai 2.0.52** - OpenAI provider for AI SDK

### Development Tools
- **ESLint 9.32.0** - Code linting
- **TypeScript ESLint 8.38.0** - TypeScript-specific linting rules
- **PostCSS 8.5.6** - CSS processing
- **Autoprefixer 10.4.21** - CSS vendor prefixing

## Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # shadcn/ui components
│   ├── AppSidebar.tsx   # Main navigation sidebar
│   ├── DatasetEntryDialog.tsx    # Dataset entry creation/editing
│   └── DatasetMetadataDialog.tsx # Dataset metadata management
├── hooks/               # Custom React hooks
│   ├── use-mobile.tsx   # Mobile detection hook
│   └── use-toast.ts     # Toast notification hook
├── lib/                 # Utility libraries
│   ├── db.ts           # Database schema and operations
│   └── utils.ts        # General utilities
├── pages/              # Main application pages
│   ├── Dashboard.tsx   # Overview and statistics
│   ├── Prompts.tsx     # Prompt management
│   ├── Datasets.tsx    # Dataset management
│   ├── Evaluations.tsx # Evaluation configuration and results
│   ├── MultiChat.tsx   # LLM-vs-LLM testing (placeholder)
│   ├── Settings.tsx    # Application settings
│   └── NotFound.tsx    # 404 page
├── stores/             # State management
│   └── useAppStore.ts  # Global application state
├── App.tsx             # Main application component
├── main.tsx           # Application entry point
└── index.css          # Global styles
```

## Core Features

### 1. Prompt Management (`/prompts`)
**Status: ✅ Fully Implemented**

- **Prompt Creation**: Create new prompts with versioning system
- **Version Control**: Multiple versions per prompt with independent configurations
- **Configuration Management**: Temperature, max tokens, top-p, model selection
- **System Prompt Support**: Separate system and user prompt sections
- **Real-time Editing**: Live editing with auto-save functionality
- **Prompt Organization**: Folder-based organization (UI ready, backend pending)

**Key Components:**
- `Prompts.tsx` - Main prompt management interface
- Prompt versioning system with independent configurations
- Rich text editing with syntax highlighting

### 2. Dataset Management (`/datasets`)
**Status: ✅ Fully Implemented**

- **Dataset Creation**: Create single-turn and multi-turn datasets
- **Entry Management**: Add, edit, delete dataset entries
- **Metadata Management**: Name, description, tags, type classification
- **Multi-turn Support**: Conversation-based test cases with user behavior simulation
- **Search & Filter**: Filter by type (single/multi-turn) and search by name/tags
- **Import/Export**: UI ready for data import/export functionality

**Key Components:**
- `Datasets.tsx` - Main dataset management interface
- `DatasetEntryDialog.tsx` - Entry creation/editing modal
- `DatasetMetadataDialog.tsx` - Dataset metadata management

**Data Models:**
```typescript
interface Dataset {
  id: string;
  name: string;
  type: 'single-turn' | 'multi-turn';
  folder?: string;
  description?: string;
  created_at: string;
  tags?: string[];
  entries: DatasetEntry[];
}

interface DatasetEntry {
  id: string;
  type: 'single-turn' | 'multi-turn';
  title?: string;
  input?: string;
  expected_behavior?: string;
  system_context?: string;
  user_behavior?: {
    style?: string;
    formality?: string;
    goal?: string;
    data?: Record<string, any>;
  };
  conversation?: ConversationMessage[];
  created_at: string;
}
```

### 3. Evaluation System (`/evaluations`)
**Status: ✅ Fully Implemented**

- **Automated Evaluation**: Run evaluations against datasets using LLM evaluators
- **Custom Evaluators**: Configurable evaluation prompts and models
- **Progress Tracking**: Real-time progress monitoring during evaluation runs
- **Results Analysis**: Comprehensive results table with metrics
- **Multi-model Support**: Support for different models for generation and evaluation
- **Cost Tracking**: Token usage and cost estimation

**Key Features:**
- Single-turn and multi-turn evaluation support
- Customizable evaluation criteria (task completion, tone, clarity, overall quality)
- JSON-based evaluation result parsing
- Conversation generation and evaluation pipeline
- Error handling and recovery

**Evaluation Pipeline:**
1. Load dataset and prompt configuration
2. Generate conversations using the prompt
3. Evaluate conversations using custom evaluator
4. Parse and store evaluation results
5. Display results in tabular format

### 4. Dashboard (`/`)
**Status: ✅ Fully Implemented**

- **Overview Statistics**: Total prompts, versions, average scores
- **Recent Activity**: Latest prompts and their performance
- **Quick Actions**: Create prompts, run evaluations, import datasets
- **Performance Metrics**: Average scores and evaluation history

### 5. Settings (`/settings`)
**Status: ✅ Fully Implemented**

- **API Key Management**: Secure storage of OpenAI and Anthropic API keys
- **Model Configuration**: Default models and parameters
- **Dataset Generator Config**: Settings for automated dataset generation
- **Storage Management**: Data export/import and cleanup utilities

### 6. Multi-Chat Simulator (`/multi-chat`)
**Status: 🚧 Placeholder Implementation**

- **Current State**: UI mockup with configuration cards
- **Planned Features**: LLM-vs-LLM conversation simulation
- **Missing Implementation**: Actual conversation logic and model integration

## Database Schema

The application uses IndexedDB via Dexie for client-side storage with the following tables:

### Tables
- **prompts**: Prompt definitions with versioning
- **datasets**: Dataset metadata and entries
- **conversations**: Generated conversation logs
- **evaluations**: Evaluation configurations
- **eval_results**: Evaluation results and metrics
- **playground_sessions**: Interactive testing sessions
- **settings**: Application configuration

### Key Relationships
- Prompts have multiple versions
- Datasets contain multiple entries
- Conversations link to prompts and dataset entries
- Evaluation results link to conversations and prompts

## State Management

### Global State (Zustand)
```typescript
interface AppState {
  currentPromptId: string | null;
  currentDatasetId: string | null;
  currentConversationId: string | null;
  sidebarCollapsed: boolean;
  // ... setters
}
```

### Local State
- Component-level state for forms and UI interactions
- React Query for server state and caching
- Dexie hooks for database operations

## API Integration

### AI SDK Integration
- **OpenAI Provider**: Primary LLM provider
- **Anthropic Support**: Ready for Claude integration
- **Streaming Support**: Built-in streaming capabilities
- **Error Handling**: Comprehensive error management

### API Key Management
- Secure client-side storage
- Environment-based configuration
- User-configurable API keys

## Development Workflow

### Getting Started
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Code Quality
- **TypeScript**: Strict type checking enabled
- **ESLint**: Comprehensive linting rules
- **Prettier**: Code formatting (via editor integration)
- **Component Architecture**: Reusable, composable components

### Performance Optimizations
- **Code Splitting**: Route-based code splitting
- **Lazy Loading**: Component lazy loading where appropriate
- **Memoization**: React.memo and useMemo for expensive operations
- **Database Indexing**: Optimized IndexedDB queries

## Security Considerations

### Client-Side Security
- API keys stored in IndexedDB (client-side only)
- No sensitive data in localStorage
- Input validation and sanitization
- XSS protection via React's built-in escaping

### Data Privacy
- All data stored locally in browser
- No external data transmission except to configured AI providers
- User controls all data export/import

## Browser Compatibility

### Supported Browsers
- Chrome 88+
- Firefox 85+
- Safari 14+
- Edge 88+

### Required Features
- IndexedDB support
- ES2020+ JavaScript features
- CSS Grid and Flexbox
- Web Components (for Radix UI)

## Deployment

### Build Process
```bash
npm run build
```

### Output
- Static files in `dist/` directory
- Optimized bundles with code splitting
- Asset optimization and minification

### Hosting
- Compatible with any static hosting service
- No server-side requirements
- CDN-friendly architecture

## Future Enhancements

### Planned Features
1. **Multi-Chat Implementation**: Complete LLM-vs-LLM simulation
2. **Advanced Analytics**: Charts and performance visualization
3. **Collaboration**: Multi-user support and sharing
4. **API Integration**: REST API for external integrations
5. **Advanced Evaluation**: Custom evaluation metrics and criteria
6. **Prompt Templates**: Pre-built prompt templates
7. **Batch Operations**: Bulk dataset and prompt operations

### Technical Debt
1. **Error Boundaries**: Implement React error boundaries
2. **Loading States**: Improve loading state management
3. **Offline Support**: Service worker for offline functionality
4. **Testing**: Unit and integration test coverage
5. **Documentation**: API documentation and user guides

## Contributing

### Code Style
- Follow existing TypeScript patterns
- Use functional components with hooks
- Implement proper error handling
- Add JSDoc comments for complex functions

### Component Guidelines
- Use shadcn/ui components when possible
- Implement proper accessibility attributes
- Follow mobile-first responsive design
- Use consistent naming conventions

### Database Guidelines
- Use proper TypeScript interfaces
- Implement proper error handling
- Use transactions for multi-table operations
- Add proper indexing for performance
