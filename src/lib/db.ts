import Dexie, { Table } from 'dexie';

// Type definitions
export interface Prompt {
  id: string;
  name: string;
  type: 'single-turn' | 'multi-turn';
  folder?: string;
  description?: string;
  created_at: string;
  updated_at: string;
  versions: Record<string, PromptVersion>;
}

export interface PromptVersion {
  version_id: string;
  text: string;
  variables: Record<string, string>;
  config: {
    temperature: number;
    max_tokens: number;
    top_p: number;
    system_prompt: string;
    model?: string;
  };
  created_at: string;
 
}

export interface Dataset {
  id: string;
  name: string;
  type: 'single-turn' | 'multi-turn';
  folder?: string;
  description?: string;
  created_at: string;
  tags?: string[];
  extraction_prompt?: string;
  entries: DatasetEntry[];
}

export interface DatasetEntry {
  id: string;
  type: 'single-turn' | 'multi-turn';
  title?: string;
  prompt?: string;
  input?: string;
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
  metrics: Record<string, any>;
  reason?:string;
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

export interface Playground {
  id: string;
  prompt_id: string;
  prompt_version: string;
  name: string;
  messages: ConversationMessage[];
  created_at: string;
  updated_at: string;
}

export interface EvaluationPrompt {
  id: string;
  name: string;
  prompt: string;
  created_at: string;
  schema:Record<string, any>;
}

export interface ExtractionPrompt {
  id: string;
  name: string;
  prompt: string;
  created_at: string;
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
  default_evaluation_prompt: string;
  global_extraction_prompt: string;
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
  playgrounds!: Table<Playground>;
  evaluation_prompts!: Table<EvaluationPrompt>;
  extraction_prompts!: Table<ExtractionPrompt>;
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
    
    this.version(2).stores({
      prompts: 'id, name, type, folder, created_at, updated_at',
      datasets: 'id, name, type, folder, created_at, *tags, extraction_prompt',
      evaluation_prompts: 'id, name, created_at',
      extraction_prompts: 'id, name, created_at'
    });
    
    this.version(3).stores({
      prompts: 'id, name, type, folder, created_at, updated_at',
      datasets: 'id, name, type, folder, created_at, *tags, extraction_prompt',
      evaluation_prompts: 'id, name, created_at',
      extraction_prompts: 'id, name, created_at',
      playgrounds: 'id, prompt_id, prompt_version, name, created_at, updated_at'
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
      },
      default_evaluation_prompt: "You are an expert evaluator. Please evaluate the following conversation between a user and an AI assistant. Rate the assistant's performance on a scale of 1-5 for each criterion:\n\n1. Task Completion (1-5): How well did the assistant complete the requested task?\n2. Tone and Empathy (1-5): How appropriate and empathetic was the assistant's tone?\n3. Clarity (1-5): How clear and understandable were the assistant's responses?\n4. Overall Quality (1-5): Overall assessment of the assistant's performance\n\nPlease provide your evaluation in JSON format with scores and a brief reason for each criterion:\n\n{\n  \"task_completion\": {\n    \"score\": X,\n    \"reason\": \"...\"\n  },\n  \"tone_empathy\": {\n    \"score\": X,\n    \"reason\": \"...\"\n  },\n  \"clarity\": {\n    \"score\": X,\n    \"reason\": \"...\"\n  },\n  \"overall_quality\": {\n    \"score\": X,\n    \"reason\": \"...\"\n  }\n}",
      global_extraction_prompt: "You are analyzing a multi-turn conversation between a user and an AI assistant. Extract the following information to create a dataset entry:\n\n1. User's input/query\n2. Assistant's response\n3. Conversation context\n4. Key topics discussed\n5. User's communication style\n6. Expected behavior or outcome\n\nPlease format your response as JSON with the following structure:\n\n{\n  \"user_input\": \"...\",\n  \"assistant_response\": \"...\",\n  \"context\": \"...\",\n  \"topics\": [\"...\"],\n  \"user_style\": \"...\",\n  \"expected_behavior\": \"...\"\n}"
    });
  }
};
