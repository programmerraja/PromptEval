import Dexie, { Table } from 'dexie';

// Type definitions
export interface Prompt {
  id: string;
  name: string;
  folder?: string;
  description?: string;
  created_at: string;
  updated_at: string;
  versions: Record<string, PromptVersion>;
}

export interface PromptVersion {
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
    [key: string]: number | undefined;
  };
}

export interface Dataset {
  id: string;
  name: string;
  type: 'single-turn' | 'multi-turn';
  folder?: string;
  description?: string;
  created_at: string;
  tags?: string[];
  entries: DatasetEntry[];
}

export interface DatasetEntry {
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

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface Conversation {
  id: string;
  prompt_id: string;
  prompt_version: string;
  model: string;
  type: 'manual' | 'auto_eval';
  messages: ConversationMessage[];
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

export interface Evaluation {
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

export interface EvalResult {
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

export interface PlaygroundSession {
  id: string;
  prompt_id: string;
  prompt_version: string;
  model: string;
  config: {
    temperature: number;
    max_tokens: number;
    top_p: number;
  };
  messages: ConversationMessage[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    latency: number;
    cost_estimate: number;
  };
  timestamp: string;
  saved_as_version: boolean;
  saved_as_dataset: boolean;
}

export interface Settings {
  id: string;
  dataset_generator_config: {
    model: string;
    temperature: number;
    max_tokens: number;
    top_p: number;
    prompt: string;
  };
  default_model: {
    model: string;
    temperature: number;
    max_tokens: number;
    top_p: number;
  };
  api_keys?: {
    openai?: string;
    anthropic?: string;
    google?: string;
  };
}

// Database
export class PromptEvalDB extends Dexie {
  prompts!: Table<Prompt>;
  datasets!: Table<Dataset>;
  conversations!: Table<Conversation>;
  evaluations!: Table<Evaluation>;
  eval_results!: Table<EvalResult>;
  playground_sessions!: Table<PlaygroundSession>;
  settings!: Table<Settings>;

  constructor() {
    super('PromptEvalDB');
    this.version(1).stores({
      prompts: 'id, name, folder, created_at, updated_at',
      datasets: 'id, name, type, folder, created_at, *tags',
      conversations: 'id, prompt_id, prompt_version, model, type',
      evaluations: 'id, conversation_id, prompt_id, prompt_version, dataset_entry_id',
      eval_results: 'id, conversation_id, prompt_id, dataset_entry_id, timestamp',
      playground_sessions: 'id, prompt_id, prompt_version, model, timestamp',
      settings: 'id'
    });
  }
}

export const db = new PromptEvalDB();

// Initialize default settings
export const initializeSettings = async () => {
  const existingSettings = await db.settings.get('default');
  if (!existingSettings) {
    await db.settings.add({
      id: 'default',
      dataset_generator_config: {
        model: 'gpt-4o-mini',
        temperature: 0.5,
        max_tokens: 100,
        top_p: 0.9,
        prompt: "You are analyzing a user–assistant conversation. Extract the following information:\n1. User's communication style (tone, verbosity, emotion)\n2. Conversational goal (task or intent)\n3. Criteria for success (how to know assistant did a good job)\n4. Example dialogue summary\nReturn JSON:"
      },
      default_model: {
        model: 'gpt-4o-mini',
        temperature: 0.5,
        max_tokens: 100,
        top_p: 0.9
      }
    });
  }
};
