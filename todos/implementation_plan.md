# Implementation Plan: Generic Prompt Evaluation System

## 1. Overview
This document outlines the step-by-step implementation plan to build the Generic Prompt Evaluation System as specified in `todos/evaltodo.md`.

## 2. Phase 1: Foundation & Database
**Goal**: Ensure data models support the new requirements for multi-turn simulation and generic evaluation schemas.

### Task 1.1: Database Schema Update (`src/lib/db.ts`)
- **Action**: Update `DatasetEntry` interface.
- **Changes**:
  - Add `expected_behavior?: string;` (for single-turn reference).
  - Add `extractedPrompt?: string;` (for multi-turn user simulation context).
- **Note**: Ensure `Dexie` schema versioning is handled if this affects indexed fields (likely just stored data, so purely interface update might suffice if not indexing these new fields).

## 3. Phase 2: Shared Simulation Logic
**Goal**: Extract the existing multi-turn simulation logic from `MultiChat.tsx` into a reusable hook so it can be used by both the Playground and the Evaluation Runner.

### Task 2.1: Create `useMultiTurnSimulation` Hook
- **Input**:
  - `assistantConfig` (Model, Temp, System Prompt)
  - `userConfig` (Model, Temp, Persona/User Behavior)
  - `maxTurns`
  - `initialMessage` (optional)
- **Output**:
  - `startSimulation(datasetEntry)`
  - `currentConversation` (State)
  - `isSimulating` (Boolean)
- **Logic**:
  - Extract `runAssistantTurn` and `runUserTurn` from `MultiChat.tsx`.
  - Ensure it handles the "Stop" signals (`[END]`, etc.) robustly.
  - Return the full `Conversation` object upon completion.

### Task 2.2: Refactor `MultiChat.tsx`
- **Action**: Replace the internal logic in `MultiChat.tsx` with calls to `useMultiTurnSimulation`.
- **Verify**: Ensure the Playground still works as expected.

## 4. Phase 3: Generic Evaluation Engine
**Goal**: Implement the core runner that executes prompts (single or multi-turn) and then judges them using a dynamic schema.

### Task 3.1: Implement `EvaluationRunner` Service
- **Location**: `src/services/EvaluationRunner.ts` (or similar).
- **Logic**:
  1.  **Execution Step**:
      - For **Single-turn**: Call LLM once using `generateText`.
      - For **Multi-turn**: Use `useMultiTurnSimulation` to generate a full conversation.
      - Save the resulting `Conversation` to DB.
  2.  **Evaluation Step** (The "Judge"):
      - Fetch the selected `EvaluationPrompt` (containing `prompt_text` and `schema`).
      - Construct the Judge's input prompt: (`EvaluationPrompt` + `Conversation/Output` + `Reference/ExpectedBehavior`).
      - Call the Judge LLM.
      - **Critical**: Parse the JSON output dynamically. Do NOT hardcode `task_completion`, `tone`, etc.
      - Validate against the defined `schema` (types check).
  3.  **Persistence**:
      - Save to `EvalResult`.
      - Store the raw JSON output in a `data` feature field, keeping the `metrics` field for numeric values that can be aggregated easily.

## 5. Phase 4: Aggregation Engine
**Goal**: Transform raw evaluation results into human-readable summaries.

### Task 4.1: Implement `AggregationService`
- **Location**: `src/services/AggregationService.ts`
- **Input**: List of `EvalResult`s + `EvaluationSchema`.
- **Output**: Aggregated Metrics Object.
- **Logic**:
  - Iterate through keys in the Schema.
  - **Number**: Calculate Avg, Min, Max, P90.
  - **Boolean**: Calculate True/False counts and percentages.
  - **Enum/String**: Calculate frequency distribution (top values).
  - Ignore long text fields for aggregation.

## 6. Phase 5: UI Implementation (The 4 Layers)
**Goal**: visualize the data.

### Task 5.1: Layer 1 - Overview (`Evaluations.tsx` -> `ResultsTab`)
- **Components**:
  - `ScoreCard`: Displays aggregate metrics (e.g., "Accuracy: 85%", "Avg Tone: 4.2").
  - Use `AggregationService` to derive these numbers on the fly from the filtered results.

### Task 5.2: Layer 2 - Distribution
- **Components**:
  - `MetricHistogram`: Bar chart showing distribution of scores (1-5) or boolean outcomes.
  - Show this inside the expanded view of a metric card.

### Task 5.3: Layer 3 - Outliers
- **Components**:
  - `OutlierTable`: A filtered list of `EvalResult`s where scores are low or booleans are false.
  - "Worst Performers" section.

### Task 5.4: Layer 4 - Raw Detail
- **Components**:
  - `EvalTraceView`: unique view to see:
    - Input (Prompt/Dataset).
    - Output (Conversation/Response).
    - Judge's Reasoning.
    - Raw JSON scores.

## 7. Execution Order
1.  **Database**: Update `db.ts` (Low effort, high impact blocker).
2.  **Refactor**: Extract `useMultiTurnSimulation` (Medium effort).
3.  **Engine**: Build the generic Runner (High effort).
4.  **Aggregation**: Build the math logic (Low effort).
5.  **UI**: Build the visualization layers (High effort).

Awaiting approval to begin with **Task 1.1 (Database)** and **Task 2.1 (Simulation Hook)**.
