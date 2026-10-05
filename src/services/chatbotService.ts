import { apiFetch } from './httpClient';

const isDevelopment = import.meta.env.DEV;
const CHATBOT_BASE_URL = isDevelopment ? 'http://localhost:8091' : '';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  user_id: number;
  user_role: string;
}

export interface ChatResponse {
  reply: string;
}

export const chatbotAPI = {
  sendMessage: async (request: ChatRequest): Promise<ChatResponse> => {
    return apiFetch<ChatResponse>(`${CHATBOT_BASE_URL}/chat`, {
      method: 'POST',
      body: request,
      timeoutMs: 300000,
    });
  },

  healthCheck: async (): Promise<boolean> => {
    try {
      await apiFetch(`${CHATBOT_BASE_URL}/health`);
      return true;
    } catch {
      return false;
    }
  },
};
