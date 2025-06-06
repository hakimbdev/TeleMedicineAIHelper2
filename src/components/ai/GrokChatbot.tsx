import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  RefreshCw,
  AlertTriangle,
  Info,
  Trash2,
  Copy,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { grokClient, GrokMessage } from '../../services/grokApi';
import { formatDistanceToNow } from 'date-fns';

interface ChatMessage extends GrokMessage {
  id: string;
  isTyping?: boolean;
}

interface GrokChatbotProps {
  className?: string;
  onMessageSent?: (message: string) => void;
  onResponseReceived?: (response: string) => void;
}

const GrokChatbot: React.FC<GrokChatbotProps> = ({
  className = '',
  onMessageSent,
  onResponseReceived,
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize chat
  useEffect(() => {
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      role: 'assistant',
      content: `Hello ${user?.name || 'there'}! I'm your AI medical assistant powered by Grok 3. I'm here to help answer your health questions and provide general medical information. 

Please remember that I'm not a substitute for professional medical advice. For serious health concerns, always consult with a healthcare provider.

How can I assist you today?`,
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  }, [user?.name]);

  const addMessage = (message: Omit<ChatMessage, 'id'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage.id;
  };

  const updateMessage = (id: string, updates: Partial<ChatMessage>) => {
    setMessages(prev => prev.map(msg => 
      msg.id === id ? { ...msg, ...updates } : msg
    ));
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    onMessageSent?.(userMessage);

    // Add user message
    addMessage({
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    });

    setIsLoading(true);
    setIsTyping(true);

    try {
      // Add typing indicator
      const typingId = addMessage({
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isTyping: true,
      });

      // Stream response from Grok
      let fullResponse = '';
      for await (const chunk of grokClient.streamMessage(userMessage)) {
        fullResponse = chunk;
        updateMessage(typingId, {
          content: chunk,
          isTyping: false,
        });
      }

      onResponseReceived?.(fullResponse);
    } catch (error) {
      console.error('Error sending message to Grok:', error);
      addMessage({
        role: 'assistant',
        content: 'I apologize, but I encountered an error while processing your message. Please try again or contact support if the issue persists.',
        timestamp: new Date(),
      });
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    grokClient.clearHistory();
    setMessages([]);
    // Re-add welcome message
    const welcomeMessage: ChatMessage = {
      id: 'welcome_new',
      role: 'assistant',
      content: `Chat cleared! I'm ready to help with your health questions. What would you like to know?`,
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    // Could add a toast notification here
  };

  const modelInfo = grokClient.getModelInfo();

  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Sparkles className="h-8 w-8 text-purple-600" />
            {modelInfo.available && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Grok 3 AI Assistant</h3>
            <p className="text-sm text-gray-600">
              {modelInfo.available ? 'Connected to xAI' : 'Demo Mode'} • Medical AI Helper
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={clearChat}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Clear chat"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Model Status */}
      {!modelInfo.available && (
        <div className="p-3 bg-yellow-50 border-b border-yellow-200">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-yellow-800">
              Running in demo mode. Configure VITE_GROK_API_TOKEN for full functionality.
            </span>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className="flex items-start space-x-2">
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0 mt-1">
                    {message.isTyping ? (
                      <RefreshCw className="h-4 w-4 text-purple-600 animate-spin" />
                    ) : (
                      <Bot className="h-4 w-4 text-purple-600" />
                    )}
                  </div>
                )}
                <div className="flex-1">
                  <div className="whitespace-pre-wrap">
                    {message.isTyping ? (
                      <div className="flex items-center space-x-1">
                        <span>Thinking</span>
                        <div className="flex space-x-1">
                          <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    ) : (
                      message.content
                    )}
                  </div>
                  {message.timestamp && !message.isTyping && (
                    <div className="flex items-center justify-between mt-2">
                      <div className={`text-xs ${
                        message.role === 'user' ? 'text-blue-200' : 'text-gray-500'
                      }`}>
                        {formatDistanceToNow(message.timestamp, { addSuffix: true })}
                      </div>
                      {message.role === 'assistant' && (
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => copyMessage(message.content)}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                            title="Copy message"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {message.role === 'user' && (
                  <div className="flex-shrink-0 mt-1">
                    <User className="h-4 w-4 text-blue-200" />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center space-x-2">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me about your health concerns..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={isLoading}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span>Send</span>
          </button>
        </div>
        
        {/* Disclaimer */}
        <div className="mt-2 flex items-center space-x-2 text-xs text-gray-500">
          <Info className="h-3 w-3" />
          <span>AI responses are for informational purposes only. Consult healthcare professionals for medical advice.</span>
        </div>
      </div>
    </div>
  );
};

export default GrokChatbot;
