import { create } from 'zustand';

interface AppState {
  currentPromptId: string | null;
  currentDatasetId: string | null;
  currentConversationId: string | null;
  sidebarCollapsed: boolean;
  setCurrentPromptId: (id: string | null) => void;
  setCurrentDatasetId: (id: string | null) => void;
  setCurrentConversationId: (id: string | null) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentPromptId: null,
  currentDatasetId: null,
  currentConversationId: null,
  sidebarCollapsed: false,
  setCurrentPromptId: (id) => set({ currentPromptId: id }),
  setCurrentDatasetId: (id) => set({ currentDatasetId: id }),
  setCurrentConversationId: (id) => set({ currentConversationId: id }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
}));
