// Chatbot Service — calls the Arogya Chatbot backend

const isDevelopment = import.meta.env.DEV;
const CHATBOT_BASE_URL = isDevelopment ? '' : 'http://localhost:8090';

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
    const url = `${CHATBOT_BASE_URL}/chat`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      let errorMessage = `Chatbot error: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorMessage;
      } catch { /* ignore */ }
      throw new Error(errorMessage);
    }

    return response.json();
  },

  healthCheck: async (): Promise<boolean> => {
    try {
      const url = `${CHATBOT_BASE_URL}/health`;
      const response = await fetch(url);
      return response.ok;
    } catch {
      return false;
    }
  },
};
