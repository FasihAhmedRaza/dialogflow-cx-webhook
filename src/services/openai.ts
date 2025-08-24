import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface FallbackContext {
  sessionId: string;
  userMessage: string;
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  parameters?: Record<string, any>;
  intent?: string;
}

export interface FallbackResponse {
  success: boolean;
  message: string;
  confidence?: number;
  suggestedActions?: string[];
}

/**
 * Generate a fallback response using OpenAI when Dialogflow can't handle the request
 */
export async function generateFallbackResponse(
  context: FallbackContext
): Promise<FallbackResponse> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return {
        success: false,
        message: "I'm sorry, I'm having trouble processing your request right now. Please try again later.",
      };
    }

    // Build the conversation context for OpenAI
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `You are a helpful customer service assistant for a data recovery company. 
        Your role is to help customers when the main system can't understand their request.
        
        Guidelines:
        - Be polite, professional, and helpful
        - If you can help with their request, provide a clear response
        - If you can't help, politely redirect them to human support
        - Keep responses concise but informative
        - If they're asking about data recovery, shipping, or project status, try to help
        - Always maintain a helpful tone
        
        Current session: ${context.sessionId}`
      }
    ];

    // Add conversation history if available
    if (context.conversationHistory && context.conversationHistory.length > 0) {
      // Limit history to last 10 messages to avoid token limits
      const recentHistory = context.conversationHistory.slice(-10);
      messages.push(...recentHistory);
    }

    // Add the current user message
    messages.push({
      role: 'user',
      content: context.userMessage
    });

    // Generate response from OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
      max_tokens: 150,
      temperature: 0.7,
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
    });

    const response = completion.choices[0]?.message?.content;

    if (!response) {
      return {
        success: false,
        message: "I'm sorry, I couldn't generate a response. Please try rephrasing your question.",
      };
    }

    return {
      success: true,
      message: response,
      confidence: 0.8, // OpenAI responses are generally confident
      suggestedActions: ['continue_conversation', 'escalate_to_human']
    };

  } catch (error) {
    console.error('OpenAI fallback error:', error);
    
    return {
      success: false,
      message: "I'm experiencing technical difficulties. Please contact our support team for assistance.",
    };
  }
}

/**
 * Analyze user intent using OpenAI for better fallback handling
 */
export async function analyzeUserIntent(
  userMessage: string,
  context?: Record<string, any>
): Promise<{
  intent: string;
  confidence: number;
  entities: Record<string, any>;
}> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return {
        intent: 'unknown',
        confidence: 0,
        entities: {}
      };
    }

    const prompt = `Analyze this user message and extract the intent and key information:
    
    User message: "${userMessage}"
    Context: ${JSON.stringify(context || {})}
    
    Please respond with a JSON object containing:
    - intent: a brief description of what the user wants
    - confidence: a number between 0 and 1
    - entities: key information extracted (phone, email, project name, etc.)
    
    Response format:
    {
      "intent": "string",
      "confidence": 0.95,
      "entities": {}
    }`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
      temperature: 0.3,
    });

    const response = completion.choices[0]?.message?.content;
    
    if (response) {
      try {
        const parsed = JSON.parse(response);
        return {
          intent: parsed.intent || 'unknown',
          confidence: parsed.confidence || 0,
          entities: parsed.entities || {}
        };
      } catch (parseError) {
        console.error('Failed to parse OpenAI intent analysis:', parseError);
      }
    }

    return {
      intent: 'unknown',
      confidence: 0,
      entities: {}
    };

  } catch (error) {
    console.error('OpenAI intent analysis error:', error);
    return {
      intent: 'unknown',
      confidence: 0,
      entities: {}
    };
  }
}

/**
 * Generate suggested responses for common fallback scenarios
 */
export async function generateSuggestedResponses(
  userMessage: string,
  context: FallbackContext
): Promise<string[]> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return [
        "Could you please rephrase your question?",
        "I'm not sure I understand. Can you provide more details?",
        "Would you like to speak with a human representative?"
      ];
    }

    const prompt = `Based on this user message: "${userMessage}"
    
    Generate 3 helpful, professional responses that could help clarify or assist the user.
    Make them conversational and helpful.
    
    Respond with just the 3 responses, one per line, no numbering or formatting.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content;
    
    if (response) {
      return response.split('\n').filter(line => line.trim().length > 0).slice(0, 3);
    }

    return [
      "Could you please rephrase your question?",
      "I'm not sure I understand. Can you provide more details?",
      "Would you like to speak with a human representative?"
    ];

  } catch (error) {
    console.error('OpenAI suggested responses error:', error);
    return [
      "Could you please rephrase your question?",
      "I'm not sure I understand. Can you provide more details?",
      "Would you like to speak with a human representative?"
    ];
  }
}