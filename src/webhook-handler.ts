import { Conversation } from './services/conversation';
import { generateFallbackResponse, analyzeUserIntent } from './services/openai';

export interface DialogflowBody<T = any> {
  fulfillmentInfo: {
    tag: string;
  };
  sessionInfo: {
    session: string;
    parameters: T;
  };
  text?: string;
  languageCode?: string;
}

export interface DialogFlowWebhookResponse {
  fulfillment_response: {
    messages: Array<{
      text: {
        text: string[];
      };
    }>;
  };
  session_info: {
    session: string;
    parameters: Record<string, any>;
  };
}

export interface SalvageDataAgentParameters {
  new_contact_full_name?: string;
  new_contact_device_type?: string;
  new_contact_problem_description?: string;
  new_contact_email?: string;
  new_contact_phone?: string;
  new_contact_zip_code?: string;
  new_contact_address?: string;
  projectname?: string;
  relatedTo?: string;
  [key: string]: any;
}

export class EnhancedDialogflowWebhook {
  private convo: Conversation;
  private session: string;
  private sessionId: string;
  private parameters: SalvageDataAgentParameters;
  private tag: string;
  private userMessage: string;

  constructor(body: DialogflowBody<SalvageDataAgentParameters>) {
    this.tag = body.fulfillmentInfo.tag;
    this.parameters = body.sessionInfo.parameters;
    this.session = body.sessionInfo.session;
    this.userMessage = body.text || '';
    
    const parts = body.sessionInfo.session.split("/");
    this.sessionId = parts[parts.length - 1] ?? body.sessionInfo.session;
    this.convo = new Conversation(this.sessionId);
    
    // Add user message to conversation history
    if (this.userMessage) {
      this.convo.addMessage('user', this.userMessage);
    }
  }

  private respond(
    parameters: Partial<SalvageDataAgentParameters> = {},
    messages: string[] = []
  ): DialogFlowWebhookResponse {
    // Add assistant messages to conversation history
    messages.forEach(message => {
      this.convo.addMessage('assistant', message);
    });

    return {
      fulfillment_response: {
        messages: messages.map((text) => ({ text: { text: [text] } })),
      },
      session_info: { session: this.session, parameters },
    };
  }

  /**
   * Enhanced fallback handling with OpenAI integration
   */
  private async handleFallback(): Promise<DialogFlowWebhookResponse> {
    try {
      console.log('Handling fallback with OpenAI integration...');
      
      // Use the conversation service fallback method
      const fallbackResult = await this.convo.fallback(this.parameters);
      
      if (fallbackResult.ok && fallbackResult.response) {
        const messages = [fallbackResult.response.message];
        
        // Add suggested actions if available
        if (fallbackResult.response.suggestedActions?.includes('provide_suggestions')) {
          messages.push("If you need further assistance, please contact our support team.");
        }
        
        return this.respond(
          {
            fallback_handled: true,
            openai_intent: fallbackResult.intent,
            openai_confidence: fallbackResult.confidence,
            ...this.parameters
          },
          messages
        );
      } else {
        // Fallback to basic response if OpenAI fails
        return this.respond(
          { fallback_handled: false },
          [
            "I'm sorry, I'm having trouble understanding your request.",
            "Could you please rephrase your question or contact our support team for assistance."
          ]
        );
      }
    } catch (error) {
      console.error('Fallback handling error:', error);
      
      return this.respond(
        { fallback_handled: false, error: 'fallback_failed' },
        [
          "I'm experiencing technical difficulties.",
          "Please try again later or contact our support team."
        ]
      );
    }
  }

  /**
   * Handle unknown tags with OpenAI fallback
   */
  private async handleUnknownTag(): Promise<DialogFlowWebhookResponse> {
    console.log(`Unknown tag: ${this.tag}, using OpenAI fallback`);
    return this.handleFallback();
  }

  /**
   * Enhanced project creation with fallback support
   */
  private async createProject(): Promise<DialogFlowWebhookResponse> {
    try {
      // Your existing createProject logic here
      // This is a placeholder - implement your actual project creation logic
      
      return this.respond(
        { project_created: true },
        [
          "Project created successfully.",
          "A recovery advisor will be assigned to your case."
        ]
      );
    } catch (error) {
      console.error('Project creation error:', error);
      return this.handleFallback();
    }
  }

  /**
   * Enhanced project status with fallback support
   */
  private async getStatus(): Promise<DialogFlowWebhookResponse> {
    try {
      if (!this.parameters.projectname) {
        return this.respond(
          { error: 'missing_project_name' },
          [
            "I need a project name to check the status.",
            "Could you please provide your project number or case ID?"
          ]
        );
      }

      // Your existing status logic here
      // This is a placeholder - implement your actual status checking logic
      
      return this.respond(
        { status_checked: true },
        [
          `Status checked for project: ${this.parameters.projectname}`,
          "Your project is currently being processed."
        ]
      );
    } catch (error) {
      console.error('Status check error:', error);
      return this.handleFallback();
    }
  }

  /**
   * Main response handler with enhanced fallback
   */
  async reply(): Promise<DialogFlowWebhookResponse> {
    try {
      // Update conversation parameters
      this.convo.updateParameters(this.parameters);

      switch (this.tag) {
        case "create_project":
          return await this.createProject();

        case "get_status":
          return await this.getStatus();

        case "fallback":
        case "default_fallback":
          return await this.handleFallback();

        default:
          // For unknown tags, use OpenAI fallback
          return await this.handleUnknownTag();
      }
    } catch (error) {
      console.error('Webhook reply error:', error);
      
      // Final fallback if everything else fails
      return this.respond(
        { error: 'webhook_error', fallback_handled: true },
        [
          "I'm experiencing technical difficulties.",
          "Please try again later or contact our support team."
        ]
      );
    }
  }

  /**
   * Get conversation statistics for monitoring
   */
  getConversationStats() {
    return this.convo.getStats();
  }

  /**
   * Get conversation summary for reporting
   */
  getConversationSummary() {
    return this.convo.getSummary();
  }
}

/**
 * Main webhook handler function
 */
export async function handleWebhook(
  req: any,
  res: any
): Promise<void> {
  try {
    // Load environment variables
    require('dotenv').config();
    
    const webhook = new EnhancedDialogflowWebhook(req.body);
    const response = await webhook.reply();
    
    // Log conversation stats for monitoring
    const stats = webhook.getConversationStats();
    console.log('Conversation stats:', stats);
    
    res.status(200).json(response);
  } catch (error) {
    console.error('Webhook handler error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process webhook request'
    });
  }
}