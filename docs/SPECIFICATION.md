# PromptEval - Technical Specification

## Project Summary

**PromptEval** is a comprehensive prompt testing and evaluation platform designed to streamline the development, testing, and optimization of AI prompts. The platform provides a complete workflow from prompt creation to automated evaluation using datasets and custom evaluation criteria.

## System Architecture

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    PromptEval Platform                      │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React + TypeScript)                             │
│  ├── UI Layer (shadcn/ui + Tailwind)                      │
│  ├── State Management (Zustand + React Query)             │
│  └── Business Logic (Components + Hooks)                  │
├─────────────────────────────────────────────────────────────┤
│  Data Layer (IndexedDB via Dexie)                          │
│  ├── Prompts & Versions                                    │
│  ├── Datasets & Entries                                    │
│  ├── Conversations & Evaluations                          │
│  └── Settings & Configuration                             │
├─────────────────────────────────────────────────────────────┤
│  AI Integration Layer                                      │
│  ├── OpenAI API (Primary)                                 │
│  ├── Anthropic API (Secondary)                            │
│  └── AI SDK (Vercel)                                      │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Frontend** | React | 18.3.1 | UI Framework |
| **Language** | TypeScript | 5.8.3 | Type Safety |
| **Build Tool** | Vite | 5.4.19 | Development & Build |
| **UI Library** | shadcn/ui | Latest | Component Library |
| **Styling** | Tailwind CSS | 3.4.17 | CSS Framework |
| **State** | Zustand | 5.0.8 | Global State |
| **Data** | Dexie | 4.2.1 | Client Database |
| **AI** | AI SDK | 5.0.68 | LLM Integration |
| **Icons** | Lucide React | 0.462.0 | Icon Library |

## Feature Specifications

### 1. Prompt Management System

#### 1.1 Prompt Creation & Editing
**Status: ✅ Implemented**

**Requirements:**
- Create prompts with multiple versions
- Support for system and user prompts
- Model configuration per version
- Real-time editing with auto-save
- Version comparison and management

**Technical Implementation:**
```typescript
interface Prompt {
  id: string;
  name: string;
  folder?: string;
  description?: string;
  created_at: string;
  updated_at: string;
  versions: Record<string, PromptVersion>;
}

interface PromptVersion {
  version_id: string;
  text: string;
  config: {
    temperature: number;
    max_tokens: number;
    top_p: number;
    system_prompt: string;
    model?: string;
  };
  created_at: string;
  scores?: {
    avg_score?: number;
    accuracy?: number;
    empathy?: number;
    clarity?: number;
  };
}
```

**UI Components:**
- `Prompts.tsx` - Main interface
- Sidebar with prompt list
- Tabbed editor (Editor, Playground, Auto Chat, Results)
- Configuration panel

#### 1.2 Version Control
**Status: ✅ Implemented**

**Features:**
- Multiple versions per prompt
- Independent configuration per version
- Version comparison
- Clone version functionality

### 2. Dataset Management System

#### 2.1 Dataset Creation & Management
**Status: ✅ Implemented**

**Requirements:**
- Support for single-turn and multi-turn datasets
- Metadata management (name, description, tags)
- Entry management with CRUD operations
- Search and filtering capabilities
- Import/export functionality (UI ready)

**Technical Implementation:**
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

**UI Components:**
- `Datasets.tsx` - Main interface
- `DatasetEntryDialog.tsx` - Entry creation/editing
- `DatasetMetadataDialog.tsx` - Metadata management
- Search and filter controls

#### 2.2 Entry Types

**Single-Turn Entries:**
- User input
- Expected behavior
- Optional title and description

**Multi-Turn Entries:**
- Conversation history
- User behavior simulation
- System context
- Expected outcomes

### 3. Evaluation System

#### 3.1 Automated Evaluation
**Status: ✅ Implemented**

**Requirements:**
- Run evaluations against datasets
- Custom evaluation criteria
- Progress tracking
- Results analysis and visualization
- Cost tracking and optimization

**Technical Implementation:**
```typescript
interface Evaluation {
  id: string;
  conversation_id: string;
  prompt_id: string;
  prompt_version: string;
  dataset_entry_id: string;
  eval_type: 'single-turn' | 'multi-turn';
  metrics: Record<string, number>;
  model_config: {
    model: string;
    temperature: number;
    max_tokens: number;
    top_p: number;
  };
  prompt: string;
}

interface EvalResult {
  id: string;
  conversation_id: string;
  prompt_id: string;
  dataset_entry_id: string;
  eval_type: 'single-turn' | 'multi-turn';
  metrics: Record<string, number>;
  reason: string;
  timestamp: string;
  cost?: {
    eval_tokens: number;
    cost_estimate: number;
  };
}
```

**Evaluation Pipeline:**
1. **Configuration**: Select dataset, prompt, and evaluation parameters
2. **Generation**: Generate conversations using the prompt
3. **Evaluation**: Evaluate conversations using custom criteria
4. **Analysis**: Parse and store evaluation results
5. **Reporting**: Display results in tabular format

**Default Evaluation Criteria:**
- Task completion (1-5)
- Tone and empathy (1-5)
- Clarity (1-5)
- Overall quality (1-5)

#### 3.2 Custom Evaluators
**Status: ✅ Implemented**

**Features:**
- Custom evaluation prompts
- Different models for generation vs evaluation
- JSON-based result parsing
- Configurable evaluation criteria

### 4. Dashboard & Analytics

#### 4.1 Overview Dashboard
**Status: ✅ Implemented**

**Metrics:**
- Total prompts count
- Total versions count
- Average evaluation scores
- Recent evaluation activity

**Features:**
- Quick action buttons
- Recent prompts table
- Performance summaries
- Navigation shortcuts

### 5. Settings & Configuration

#### 5.1 API Key Management
**Status: ✅ Implemented**

**Supported Providers:**
- OpenAI (Primary)
- Anthropic (Secondary)

**Security:**
- Client-side storage in IndexedDB
- No server-side storage
- User-controlled key management

#### 5.2 Model Configuration
**Status: ✅ Implemented**

**Settings:**
- Default model parameters
- Dataset generator configuration
- Evaluation model settings
- Storage management

### 6. Multi-Chat Simulator

#### 6.1 LLM-vs-LLM Testing
**Status: 🚧 Placeholder Implementation**

**Planned Features:**
- Two LLM conversation simulation
- User behavior simulation
- Conversation recording and analysis
- Step-by-step conversation control

**Current State:**
- UI mockup implemented
- Configuration cards ready
- Missing: Actual conversation logic

## Data Models

### Core Entities

#### Prompt Entity
```typescript
interface Prompt {
  id: string;                    // Unique identifier
  name: string;                  // Display name
  folder?: string;               // Organization folder
  description?: string;          // Optional description
  created_at: string;            // Creation timestamp
  updated_at: string;            // Last modification timestamp
  versions: Record<string, PromptVersion>; // Version history
}
```

#### Dataset Entity
```typescript
interface Dataset {
  id: string;                    // Unique identifier
  name: string;                  // Display name
  type: 'single-turn' | 'multi-turn'; // Dataset type
  folder?: string;               // Organization folder
  description?: string;          // Optional description
  created_at: string;            // Creation timestamp
  tags?: string[];               // Categorization tags
  entries: DatasetEntry[];       // Test cases
}
```

#### Conversation Entity
```typescript
interface Conversation {
  id: string;                    // Unique identifier
  prompt_id: string;             // Associated prompt
  prompt_version: string;        // Prompt version used
  model: string;                 // LLM model used
  type: 'manual' | 'auto_eval'; // Generation type
  messages: ConversationMessage[]; // Message history
  metadata: {
    context?: string;
    status?: string;
    dataset_ref?: string;
    turn_count?: number;
    date: string;
    user_profile_extracted?: boolean;
    simulated_user?: boolean;
  };
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    latency: number;
    cost_estimate: number;
  };
}
```

### Database Schema

#### IndexedDB Tables
```typescript
// Dexie database schema
export class PromptEvalDB extends Dexie {
  prompts!: Table<Prompt>;
  datasets!: Table<Dataset>;
  conversations!: Table<Conversation>;
  evaluations!: Table<Evaluation>;
  eval_results!: Table<EvalResult>;
  playground_sessions!: Table<PlaygroundSession>;
  settings!: Table<Settings>;
}
```

#### Indexes
- `prompts`: `id, name, folder, created_at, updated_at`
- `datasets`: `id, name, type, folder, created_at, *tags`
- `conversations`: `id, prompt_id, prompt_version, model, type`
- `evaluations`: `id, conversation_id, prompt_id, prompt_version, dataset_entry_id`
- `eval_results`: `id, conversation_id, prompt_id, dataset_entry_id, timestamp`
- `playground_sessions`: `id, prompt_id, prompt_version, model, timestamp`
- `settings`: `id`

## API Integration

### AI SDK Integration

#### OpenAI Provider
```typescript
import { createOpenAI } from "@ai-sdk/openai";

const openai = createOpenAI({ apiKey });
const { text } = await generateText({
  model: openai(model),
  messages: [...],
  temperature,
  topP
});
```

#### Supported Models
- GPT-4o-mini (Default)
- GPT-4o
- GPT-3.5-turbo
- Claude-3 (via Anthropic)

### Error Handling
- API key validation
- Rate limiting handling
- Network error recovery
- User-friendly error messages

## User Interface Specifications

### Design System

#### Color Palette
- Primary: HSL-based color system
- Secondary: Muted tones for backgrounds
- Accent: Highlight colors for actions
- Success/Warning/Destructive: Status colors

#### Typography
- Font family: System fonts (Inter, -apple-system, sans-serif)
- Scale: Consistent sizing scale
- Hierarchy: Clear heading and body text distinction

#### Components
- **Cards**: Information containers
- **Tables**: Data display and interaction
- **Forms**: Input controls and validation
- **Modals**: Overlay dialogs
- **Navigation**: Sidebar and breadcrumbs

### Responsive Design
- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Collapsible sidebar for mobile
- Touch-friendly interactions

### Accessibility
- ARIA labels and roles
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode support

## Performance Specifications

### Loading Performance
- **Initial Load**: < 3 seconds
- **Route Navigation**: < 500ms
- **Database Queries**: < 100ms
- **AI API Calls**: < 5 seconds

### Memory Usage
- **Base Application**: < 50MB
- **With Large Datasets**: < 200MB
- **Memory Leaks**: None detected

### Browser Compatibility
- **Chrome**: 88+
- **Firefox**: 85+
- **Safari**: 14+
- **Edge**: 88+

## Security Specifications

### Data Security
- **Client-side Storage**: All data stored in IndexedDB
- **API Keys**: Encrypted storage in browser
- **No Server**: No server-side data storage
- **User Control**: Complete user data ownership

### Privacy
- **Local Processing**: All data processing client-side
- **No Tracking**: No analytics or tracking
- **Data Export**: User-controlled data export
- **Data Deletion**: Complete data removal capability

## Deployment Specifications

### Build Process
```bash
# Development
npm run dev

# Production build
npm run build

# Preview
npm run preview
```

### Output
- **Static Files**: Optimized for CDN delivery
- **Code Splitting**: Route-based splitting
- **Asset Optimization**: Minified and compressed
- **Bundle Size**: < 2MB total

### Hosting Requirements
- **Static Hosting**: Any static file host
- **HTTPS**: Required for IndexedDB
- **No Server**: No backend requirements
- **CDN**: Recommended for performance

## Testing Specifications

### Test Coverage (Planned)
- **Unit Tests**: Component logic
- **Integration Tests**: User workflows
- **E2E Tests**: Complete user journeys
- **Performance Tests**: Load and stress testing

### Quality Assurance
- **TypeScript**: Compile-time type checking
- **ESLint**: Code quality enforcement
- **Prettier**: Code formatting consistency
- **Manual Testing**: User acceptance testing

## Future Enhancements

### Phase 2 Features
1. **Multi-Chat Implementation**: Complete LLM-vs-LLM simulation
2. **Advanced Analytics**: Charts and performance visualization
3. **Collaboration**: Multi-user support and sharing
4. **API Integration**: REST API for external integrations

### Phase 3 Features
1. **Advanced Evaluation**: Custom evaluation metrics
2. **Prompt Templates**: Pre-built prompt libraries
3. **Batch Operations**: Bulk dataset operations
4. **Offline Support**: Service worker implementation

### Technical Debt
1. **Error Boundaries**: React error boundary implementation
2. **Loading States**: Comprehensive loading state management
3. **Testing**: Complete test coverage
4. **Documentation**: API and user documentation

## Success Metrics

### Performance Metrics
- **Page Load Time**: < 3 seconds
- **Time to Interactive**: < 5 seconds
- **Database Query Time**: < 100ms
- **AI Response Time**: < 5 seconds

### User Experience Metrics
- **Task Completion Rate**: > 95%
- **Error Rate**: < 1%
- **User Satisfaction**: > 4.5/5
- **Feature Adoption**: > 80%

### Technical Metrics
- **Code Coverage**: > 90%
- **Bundle Size**: < 2MB
- **Memory Usage**: < 200MB
- **Browser Compatibility**: 100% on supported browsers
