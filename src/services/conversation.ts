import { 
  generateFallbackResponse, 
  analyzeUserIntent, 
  generateSuggestedResponses,
  FallbackContext,
  FallbackResponse 
} from './openai';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sessionId: string;
}

export interface ConversationSession {
  sessionId: string;
  messages: ConversationMessage[];
  parameters: Record<string, any>;
  lastActivity: Date;
  fallbackCount: number;
}

export class Conversation {
  private sessionId: string;
  private session: ConversationSession;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.session = {
      sessionId,
      messages: [],
      parameters: {},
      lastActivity: new Date(),
      fallbackCount: 0
    };
  }

  /**
   * Add a message to the conversation history
   */
  addMessage(role: 'user' | 'assistant', content: string): void {
    const message: ConversationMessage = {
      role,
      content,
      timestamp: new Date(),
      sessionId: this.sessionId
    };

    this.session.messages.push(message);
    this.session.lastActivity = new Date();
  }

  /**
   * Get conversation history for OpenAI context
   */
  getConversationHistory(): Array<{ role: 'user' | 'assistant'; content: string }> {
    return this.session.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }

  /**
   * Update session parameters
   */
  updateParameters(parameters: Record<string, any>): void {
    this.session.parameters = { ...this.session.parameters, ...parameters };
  }

  /**
   * Get current session parameters
   */
  getParameters(): Record<string, any> {
    return this.session.parameters;
  }

  /**
   * Handle fallback using OpenAI when Dialogflow can't process the request
   */
  async fallback(parameters?: Record<string, any>): Promise<{
    ok: boolean;
    response?: FallbackResponse;
    intent?: string;
    confidence?: number;
  }> {
    try {
      // Update parameters if provided
      if (parameters) {
        this.updateParameters(parameters);
      }

      // Get the last user message from conversation history
      const lastUserMessage = this.session.messages
        .filter(msg => msg.role === 'user')
        .pop();

      if (!lastUserMessage) {
        return {
          ok: false,
          response: {
            success: false,
            message: "No user message found in conversation history."
          }
        };
      }

      // Increment fallback count
      this.session.fallbackCount++;

      // Create fallback context
      const fallbackContext: FallbackContext = {
        sessionId: this.sessionId,
        userMessage: lastUserMessage.content,
        conversationHistory: this.getConversationHistory(),
        parameters: this.session.parameters
      };

      // Analyze user intent using OpenAI
      const intentAnalysis = await analyzeUserIntent(
        lastUserMessage.content,
        this.session.parameters
      );

      // Generate fallback response using OpenAI
      const fallbackResponse = await generateFallbackResponse(fallbackContext);

      // Generate suggested responses for better user experience
      const suggestedResponses = await generateSuggestedResponses(
        lastUserMessage.content,
        fallbackContext
      );

      // Add the fallback response to conversation history
      if (fallbackResponse.success) {
        this.addMessage('assistant', fallbackResponse.message);
      }

      // Enhanced fallback response with suggestions
      const enhancedResponse: FallbackResponse = {
        ...fallbackResponse,
        suggestedActions: [
          ...(fallbackResponse.suggestedActions || []),
          'provide_suggestions'
        ]
      };

      return {
        ok: fallbackResponse.success,
        response: enhancedResponse,
        intent: intentAnalysis.intent,
        confidence: intentAnalysis.confidence
      };

    } catch (error) {
      console.error('Conversation fallback error:', error);
      
      return {
        ok: false,
        response: {
          success: false,
          message: "I'm experiencing technical difficulties. Please try again or contact support."
        }
      };
    }
  }

  /**
   * Get conversation statistics
   */
  getStats(): {
    messageCount: number;
    userMessageCount: number;
    assistantMessageCount: number;
    fallbackCount: number;
    lastActivity: Date;
  } {
    return {
      messageCount: this.session.messages.length,
      userMessageCount: this.session.messages.filter(msg => msg.role === 'user').length,
      assistantMessageCount: this.session.messages.filter(msg => msg.role === 'assistant').length,
      fallbackCount: this.session.fallbackCount,
      lastActivity: this.session.lastActivity
    };
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.session.messages = [];
    this.session.fallbackCount = 0;
    this.session.lastActivity = new Date();
  }

  /**
   * Assign contact to conversation (for CRM integration)
   */
  async assignContact(contactId: string): Promise<boolean> {
    try {
      // Update session parameters with contact information
      this.updateParameters({
        contactId,
        assignedAt: new Date().toISOString()
      });

      // Add system message about contact assignment
      this.addMessage('assistant', `Contact ${contactId} has been assigned to this conversation.`);
      
      return true;
    } catch (error) {
      console.error('Failed to assign contact:', error);
      return false;
    }
  }

  /**
   * Get conversation summary for reporting
   */
  getSummary(): {
    sessionId: string;
    duration: number;
    messageCount: number;
    fallbackCount: number;
    parameters: Record<string, any>;
  } {
    const now = new Date();
    const duration = now.getTime() - this.session.lastActivity.getTime();
    
    return {
      sessionId: this.sessionId,
      duration: Math.round(duration / 1000), // Duration in seconds
      messageCount: this.session.messages.length,
      fallbackCount: this.session.fallbackCount,
      parameters: this.session.parameters
    };
  }
}