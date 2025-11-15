# PromptEval - Feature Implementation Task

## Overview
Based on the todo list and codebase analysis, this document outlines the implementation approach for the key features that need to be built. The main focus is on enhancing the prompt management system, improving the playground functionality, and implementing a comprehensive evaluation system.

## Current State Analysis

### ✅ Already Implemented
- Basic prompt management with versioning
- Dataset management (single-turn and multi-turn)
- Basic evaluation system
- Playground with A/B testing
- Database schema with IndexedDB
- UI framework with shadcn/ui

### 🚧 Needs Implementation/Enhancement
- Prompt type selection (single-turn vs multi-turn)
- Enhanced playground with dataset integration
- Improved evaluation system with custom prompts
- Variable substitution system improvements
- Dataset extraction from conversations

## Implementation Plan

### Phase 1: Prompt Management Enhancements

#### 1.1 Prompt Type Selection
**Current Issue**: No distinction between single-turn and multi-turn prompts during creation
**Solution**: Add prompt type selection during creation

**Implementation Steps**:
1. Update `Prompt` interface to include `type` field
2. Modify prompt creation dialog to include type selection
3. Update database schema to include type field
4. Add type-based filtering in prompt list

**Files to Modify**:
- `src/lib/db.ts` - Add type field to Prompt interface
- `src/pages/Prompts.tsx` - Add type selection in creation dialog
- Database migration for existing prompts

**Code Changes**:
```typescript
// In db.ts
export interface Prompt {
  id: string;
  name: string;
  type: 'single-turn' | 'multi-turn'; // NEW FIELD
  folder?: string;
  description?: string;
  created_at: string;
  updated_at: string;
  versions: Record<string, PromptVersion>;
}
```

#### 1.2 Variable Substitution System
**Current Issue**: Variable deletion allowed in playground, should be controlled from prompt
**Solution**: Improve variable management system

**Implementation Steps**:
1. Add variable definition in prompt versions
2. Create variable management interface
3. Update playground to use defined variables only
4. Add variable validation system

**Files to Modify**:
- `src/lib/db.ts` - Add variables field to PromptVersion
- `src/components/VariableEditor.tsx` - Enhance variable management
- `src/components/Playground.tsx` - Update variable handling

### Phase 2: Playground Enhancements

#### 2.1 Dataset Integration
**Current Issue**: No way to add playground conversations to datasets
**Solution**: Add "Add to Dataset" functionality

**Implementation Steps**:
1. Add "Add to Dataset" button in playground
2. Create dataset selection dialog
3. Implement conversation to dataset entry conversion
4. Handle single-turn vs multi-turn conversion

**Files to Create/Modify**:
- `src/components/AddToDatasetDialog.tsx` - New component
- `src/components/PlaygroundChat.tsx` - Add dataset integration
- `src/lib/datasetUtils.ts` - New utility functions

#### 2.2 Multi-turn Dataset Extraction
**Current Issue**: Need prompt to extract dataset from multi-turn conversations
**Solution**: Add global extraction prompt + per-dataset override capability

**Implementation Steps**:
1. Add global extraction prompt field to settings
2. Add per-dataset extraction prompt override capability
3. Create extraction prompt editor (global + per-dataset)
4. Implement conversation analysis using extraction prompt
5. Generate dataset entries from analyzed conversations

**Files to Create/Modify**:
- `src/components/ExtractionPromptEditor.tsx` - New component
- `src/pages/Settings.tsx` - Add global extraction prompt settings
- `src/pages/Datasets.tsx` - Add per-dataset extraction prompt override
- `src/lib/extractionUtils.ts` - New utility functions

### Phase 3: Evaluation System Enhancements

#### 3.1 Custom Evaluation Prompts
**Current Issue**: Limited evaluation criteria, need custom prompts
**Solution**: Add one default evaluation prompt + ability for users to add custom ones

**Implementation Steps**:
1. Create default evaluation prompt in settings
2. Create evaluation prompt management interface for custom prompts
3. Add evaluation prompt selection in evaluation setup
4. Update evaluation pipeline to use selected prompts
5. Allow users to create/edit custom evaluation prompts

**Files to Create/Modify**:
- `src/components/EvaluationPromptManager.tsx` - New component
- `src/pages/Evaluations.tsx` - Add evaluation prompt selection
- `src/pages/Settings.tsx` - Add default evaluation prompt
- `src/lib/evaluationUtils.ts` - New utility functions

#### 3.2 Enhanced Evaluation Results
**Current Issue**: Basic evaluation results display
**Solution**: Improve results visualization and analysis

**Implementation Steps**:
1. Add charts and graphs for evaluation results
2. Implement result comparison between versions
3. Add export functionality for results
4. Create evaluation history tracking

**Files to Create/Modify**:
- `src/components/EvaluationResults.tsx` - Enhanced results display
- `src/components/EvaluationCharts.tsx` - New chart components
- `src/lib/chartUtils.ts` - New utility functions

### Phase 4: Database Schema Updates

#### 4.1 New Tables and Fields
**Required Changes**:
1. Add `type` field to prompts table
2. Add `variables` field to prompt versions (simple key-value)
3. Add evaluation prompts table (custom user prompts)
4. Add extraction prompts table (global + per-dataset)
5. Add extraction_prompt field to datasets table

**Database Migration**:
```typescript
// Version 2 schema
this.version(2).stores({
  prompts: 'id, name, type, folder, created_at, updated_at',
  prompt_versions: 'version_id, prompt_id, text, variables, created_at',
  evaluation_prompts: 'id, name, prompt, created_at',
  extraction_prompts: 'id, name, prompt, created_at',
  datasets: 'id, name, type, folder, created_at, *tags, extraction_prompt',
  // ... existing tables
});

// Update settings to include default evaluation prompt
interface Settings {
  // ... existing fields
  default_evaluation_prompt: string;
  global_extraction_prompt: string;
}
```

## Technical Implementation Details

### 1. Prompt Type Selection Implementation

**Component Structure**:
```typescript
interface PromptCreationDialog {
  name: string;
  description: string;
  type: 'single-turn' | 'multi-turn';
  // ... other fields
}
```

**UI Flow**:
1. User clicks "Create New Prompt"
2. Dialog opens with type selection (radio buttons)
3. Type selection affects subsequent form fields
4. Save with type information

**Evaluation Page Behavior Based on Type**:
- **Single-turn prompts**: 
  - Show single input field for user message
  - Generate single response
  - Evaluate single response against expected behavior
  - Support placeholder mapping for variables
- **Multi-turn prompts**:
  - Show conversation interface
  - Generate multi-turn conversation
  - Evaluate entire conversation
  - Use extraction prompt to convert conversation to dataset format

### 2. Variable Management System

**Data Structure**:
```typescript
interface Variable {
  name: string;
  value: string;
}

interface PromptVersion {
  // ... existing fields
  variables: Record<string, string>; // Simple key-value pairs
}
```

**UI Components**:
- Simple variable editor (key-value pairs)
- Variable preview in playground
- Variable substitution in prompts

### 3. Dataset Integration

**Conversion Logic**:
```typescript
// Single-turn conversion
const convertToSingleTurn = (conversation: ConversationMessage[]) => {
  const userMessage = conversation.find(m => m.role === 'user');
  const assistantMessage = conversation.find(m => m.role === 'assistant');
  
  return {
    input: userMessage?.content || '',
    expected_behavior: assistantMessage?.content || '',
    // ... other fields
  };
};

// Multi-turn conversion
const convertToMultiTurn = (conversation: ConversationMessage[]) => {
  return {
    conversation: conversation,
    // ... other fields
  };
};
```

### 4. Evaluation System Architecture

**Evaluation Pipeline**:
1. **Setup**: Select prompt, dataset, evaluation prompt
2. **Generation**: Generate conversations using selected prompt
3. **Evaluation**: Evaluate using custom evaluation prompt
4. **Analysis**: Parse and store results
5. **Display**: Show results with charts and metrics

**Custom Evaluation Prompts**:
```typescript
interface EvaluationPrompt {
  id: string;
  name: string;
  prompt: string;
  created_at: string;
}

// Settings will have default evaluation prompt
interface Settings {
  // ... existing fields
  default_evaluation_prompt: string;
  global_extraction_prompt: string;
}
```

## File Structure Changes

### New Files to Create:
```
src/
├── components/
│   ├── AddToDatasetDialog.tsx
│   ├── ExtractionPromptEditor.tsx
│   ├── EvaluationPromptManager.tsx
│   ├── EvaluationResults.tsx
│   ├── EvaluationCharts.tsx
│   └── PromptTypeSelector.tsx
├── lib/
│   ├── datasetUtils.ts
│   ├── extractionUtils.ts
│   ├── evaluationUtils.ts
│   └── chartUtils.ts
└── hooks/
    ├── useEvaluation.ts
    └── useDatasetConversion.ts
```

### Files to Modify:
```
src/
├── lib/db.ts (schema updates)
├── pages/Prompts.tsx (type selection)
├── pages/Evaluations.tsx (custom prompts)
├── pages/Settings.tsx (default evaluation + global extraction prompts)
├── pages/Datasets.tsx (per-dataset extraction prompt override)
├── components/Playground.tsx (dataset integration)
├── components/PlaygroundChat.tsx (add to dataset)
└── components/VariableEditor.tsx (simple key-value)
```

## Implementation Timeline

### Week 1: Database & Core Infrastructure
- [ ] Update database schema
- [ ] Add prompt type selection
- [ ] Implement variable management system
- [ ] Create utility functions

### Week 2: Playground Enhancements
- [ ] Add dataset integration
- [ ] Implement conversation to dataset conversion
- [ ] Add extraction prompt system
- [ ] Enhance variable editor

### Week 3: Evaluation System
- [ ] Add custom evaluation prompts
- [ ] Implement enhanced evaluation pipeline
- [ ] Create results visualization
- [ ] Add export functionality

### Week 4: Testing & Polish
- [ ] Comprehensive testing
- [ ] UI/UX improvements
- [ ] Performance optimization
- [ ] Documentation updates

## Clarifications Received

1. **Prompt Type Behavior**: Based on the type, we will handle differently on eval page and other places as needed
2. **Variable System**: Simple key-value system
3. **Dataset Extraction**: Global extraction prompt + per-dataset override capability
4. **Evaluation Prompts**: One default evaluation prompt + ability for users to add custom ones
5. **Backward Compatibility**: No backward compatibility needed - we can create new and delete old data

## Success Criteria

- [ ] Users can create single-turn and multi-turn prompts with clear distinction
- [ ] Playground conversations can be easily added to datasets
- [ ] Custom evaluation prompts provide flexible evaluation criteria
- [ ] Variable system is intuitive and prevents accidental deletions
- [ ] Evaluation results are comprehensive and actionable
- [ ] All existing functionality remains intact
- [ ] Performance is maintained or improved

## Risk Mitigation

1. **Database Migration**: Test migration thoroughly with existing data
2. **UI Complexity**: Keep new features optional and intuitive
3. **Performance**: Monitor bundle size and runtime performance
4. **Data Migration**: Since no backward compatibility needed, we can clean up old data
5. **User Experience**: Maintain consistent UI patterns and interactions
