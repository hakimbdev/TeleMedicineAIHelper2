import { GROK_CONFIG, getGrokHeaders, validateGrokConfig } from '../config/grok';

// Types for Grok API
export interface GrokMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export interface GrokChatRequest {
  model: string;
  messages: GrokMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
  presence_penalty?: number;
  frequency_penalty?: number;
}

export interface GrokChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface GrokStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason?: string;
  }[];
}

// Demo responses for when Grok is not available
const DEMO_RESPONSES = [
  "I'm here to help with your health questions! While I can provide general information, please remember to consult with healthcare professionals for specific medical advice.",
  "That's a great question about health and wellness. Let me share some general information that might be helpful.",
  "I understand your concern. Based on general medical knowledge, here's what I can tell you about this topic.",
  "Thank you for reaching out. I'm designed to provide educational health information and support.",
  "I appreciate you sharing that with me. Let me provide some general guidance on this health topic.",
];

class GrokApiClient {
  private baseUrl: string;
  private useDemo: boolean;
  private conversationHistory: GrokMessage[] = [];

  constructor() {
    this.baseUrl = GROK_CONFIG.BASE_URL;
    this.useDemo = !validateGrokConfig();
    
    if (this.useDemo) {
      console.warn('Grok API token not found. Using demo mode.');
    }

    // Initialize with system prompt
    this.conversationHistory = [{
      role: 'system',
      content: GROK_CONFIG.MEDICAL_SYSTEM_PROMPT,
      timestamp: new Date(),
    }];
  }

  // Send a chat message to Grok
  async sendMessage(message: string): Promise<string> {
    if (this.useDemo) {
      return this.getDemoResponse(message);
    }

    try {
      // Add user message to history
      const userMessage: GrokMessage = {
        role: 'user',
        content: message,
        timestamp: new Date(),
      };
      this.conversationHistory.push(userMessage);

      const requestBody: GrokChatRequest = {
        model: GROK_CONFIG.MODEL,
        messages: this.conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        ...GROK_CONFIG.CHAT_SETTINGS,
        stream: false, // For now, use non-streaming
      };

      const response = await fetch(`${this.baseUrl}${GROK_CONFIG.ENDPOINTS.CHAT}`, {
        method: 'POST',
        headers: getGrokHeaders(),
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Grok API error: ${response.status} ${response.statusText}`);
      }

      const data: GrokChatResponse = await response.json();
      const assistantMessage = data.choices[0]?.message?.content || 'I apologize, but I couldn\'t generate a response at this time.';

      // Add assistant response to history
      this.conversationHistory.push({
        role: 'assistant',
        content: assistantMessage,
        timestamp: new Date(),
      });

      return assistantMessage;
    } catch (error) {
      console.error('Grok API error:', error);
      return this.getDemoResponse(message);
    }
  }

  // Stream chat response (for real-time typing effect)
  async *streamMessage(message: string): AsyncGenerator<string, void, unknown> {
    if (this.useDemo) {
      const response = this.getDemoResponse(message);
      // Simulate streaming by yielding chunks
      const words = response.split(' ');
      for (let i = 0; i < words.length; i++) {
        yield words.slice(0, i + 1).join(' ');
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      return;
    }

    try {
      // Add user message to history
      const userMessage: GrokMessage = {
        role: 'user',
        content: message,
        timestamp: new Date(),
      };
      this.conversationHistory.push(userMessage);

      const requestBody: GrokChatRequest = {
        model: GROK_CONFIG.MODEL,
        messages: this.conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        ...GROK_CONFIG.CHAT_SETTINGS,
        stream: true,
      };

      const response = await fetch(`${this.baseUrl}${GROK_CONFIG.ENDPOINTS.CHAT}`, {
        method: 'POST',
        headers: getGrokHeaders(),
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Grok API error: ${response.status} ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      let fullResponse = '';
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim());

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed: GrokStreamChunk = JSON.parse(data);
                const content = parsed.choices[0]?.delta?.content || '';
                if (content) {
                  fullResponse += content;
                  yield fullResponse;
                }
              } catch (e) {
                // Skip invalid JSON chunks
                continue;
              }
            }
          }
        }

        // Add final response to history
        if (fullResponse) {
          this.conversationHistory.push({
            role: 'assistant',
            content: fullResponse,
            timestamp: new Date(),
          });
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error('Grok streaming error:', error);
      const fallbackResponse = this.getDemoResponse(message);
      yield fallbackResponse;
    }
  }

  // Get demo response when Grok is not available
  private getDemoResponse(message: string): string {
    const baseResponse = DEMO_RESPONSES[Math.floor(Math.random() * DEMO_RESPONSES.length)];
    
    // Add some context-aware responses
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('pain') || lowerMessage.includes('hurt')) {
      return `${baseResponse} Pain can have many causes, and it's important to have persistent or severe pain evaluated by a healthcare provider. In the meantime, rest, ice/heat therapy, and over-the-counter pain relievers may provide temporary relief, but please follow package directions and consult a doctor if pain persists.`;
    }
    
    if (lowerMessage.includes('fever') || lowerMessage.includes('temperature')) {
      return `${baseResponse} Fever is often a sign that your body is fighting an infection. Stay hydrated, rest, and monitor your temperature. Seek medical attention if fever is high (over 103°F/39.4°C), persistent, or accompanied by severe symptoms.`;
    }
    
    if (lowerMessage.includes('medication') || lowerMessage.includes('medicine')) {
      return `${baseResponse} When it comes to medications, it's crucial to follow your healthcare provider's instructions and read all labels carefully. Never share medications with others, and always inform your doctor about all medications and supplements you're taking to avoid interactions.`;
    }
    
    return `${baseResponse} If you have specific health concerns, I recommend discussing them with a qualified healthcare provider who can give you personalized advice based on your medical history and current situation.`;
  }

  // Clear conversation history
  clearHistory(): void {
    this.conversationHistory = [{
      role: 'system',
      content: GROK_CONFIG.MEDICAL_SYSTEM_PROMPT,
      timestamp: new Date(),
    }];
  }

  // Get conversation history
  getHistory(): GrokMessage[] {
    return this.conversationHistory.filter(msg => msg.role !== 'system');
  }

  // Check if Grok is available
  isAvailable(): boolean {
    return !this.useDemo;
  }

  // Get model info
  getModelInfo() {
    return {
      name: GROK_CONFIG.MODEL,
      provider: 'xAI',
      available: this.isAvailable(),
      mode: this.useDemo ? 'demo' : 'live',
    };
  }
}

// Export singleton instance
export const grokClient = new GrokApiClient();
export default GrokApiClient;
