// Grok 3 AI Configuration
export const GROK_CONFIG = {
  // API Configuration
  API_TOKEN: import.meta.env.VITE_GROK_API_TOKEN || '',
  BASE_URL: 'https://api.x.ai/v1',
  
  // Model Configuration
  MODEL: 'grok-beta',
  
  // API Endpoints
  ENDPOINTS: {
    CHAT: '/chat/completions',
    MODELS: '/models',
  },
  
  // Request Configuration
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Authorization': '',
  },
  
  // Chat Configuration
  CHAT_SETTINGS: {
    max_tokens: 1000,
    temperature: 0.7,
    top_p: 0.9,
    stream: true,
    presence_penalty: 0.1,
    frequency_penalty: 0.1,
  },
  
  // Medical Context System Prompt
  MEDICAL_SYSTEM_PROMPT: `You are a helpful AI medical assistant integrated into a telemedicine platform. Your role is to:

1. Provide general health information and education
2. Help users understand medical concepts and terminology
3. Offer wellness and preventive care guidance
4. Assist with medication information (general, not prescriptive)
5. Support mental health and wellness discussions

IMPORTANT DISCLAIMERS:
- You are NOT a replacement for professional medical advice
- Always recommend consulting healthcare providers for diagnosis and treatment
- Do not provide specific medical diagnoses or treatment recommendations
- Encourage users to seek immediate medical attention for emergencies
- Be empathetic and supportive while maintaining professional boundaries

Guidelines:
- Use clear, accessible language
- Provide evidence-based information when possible
- Ask clarifying questions to better understand user needs
- Offer multiple perspectives when appropriate
- Be culturally sensitive and inclusive
- Maintain patient privacy and confidentiality

Remember: Your goal is to educate, support, and guide users toward appropriate medical care, not to replace it.`,

  // Rate Limiting
  RATE_LIMIT: {
    requests_per_minute: 60,
    requests_per_hour: 1000,
  },
};

// Validate Grok configuration
export const validateGrokConfig = (): boolean => {
  return !!(GROK_CONFIG.API_TOKEN && GROK_CONFIG.API_TOKEN.length > 0);
};

// Get Grok headers with authentication
export const getGrokHeaders = (): Record<string, string> => {
  return {
    ...GROK_CONFIG.DEFAULT_HEADERS,
    'Authorization': `Bearer ${GROK_CONFIG.API_TOKEN}`,
  };
};

// Check if Grok is available
export const isGrokAvailable = (): boolean => {
  return validateGrokConfig();
};

// Get model information
export const getGrokModelInfo = () => ({
  name: GROK_CONFIG.MODEL,
  provider: 'xAI',
  description: 'Grok 3 - Advanced AI model by xAI',
  capabilities: [
    'Natural language understanding',
    'Medical knowledge base',
    'Conversational AI',
    'Real-time responses',
    'Context awareness'
  ],
});

export default GROK_CONFIG;
