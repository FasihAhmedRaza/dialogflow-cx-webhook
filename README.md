# Dialogflow CX Webhook with OpenAI Integration

This is an enhanced webhook for **Dialogflow CX** that integrates OpenAI's GPT models to provide intelligent fallback responses when the main system can't handle user requests.

## Features

- **OpenAI Integration**: Uses GPT-3.5-turbo for intelligent fallback responses
- **Conversation Management**: Tracks conversation history and context
- **Intent Analysis**: Analyzes user intent using OpenAI for better understanding
- **Smart Fallbacks**: Provides contextual responses based on conversation history
- **Session Management**: Maintains conversation state across requests
- **Monitoring**: Built-in conversation statistics and reporting

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Dialogflow    │───▶│   Webhook        │───▶│   OpenAI API    │
│   CX            │    │   Handler        │    │   (GPT-3.5)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │   Conversation   │
                       │   Service        │
                       └──────────────────┘
```

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd dialogflow-cx-webhook
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your OpenAI API key:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   PORT=5000
   NODE_ENV=development
   ```

4. **Build the TypeScript code**
   ```bash
   npm run build
   ```

5. **Start the server**
   ```bash
   npm start
   ```

## Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `OPENAI_API_KEY` | Your OpenAI API key | Yes | - |
| `PORT` | Server port | No | 5000 |
| `NODE_ENV` | Environment mode | No | development |
| `OPENAI_MODEL` | OpenAI model to use | No | gpt-3.5-turbo |
| `OPENAI_MAX_TOKENS` | Maximum tokens for responses | No | 150 |
| `OPENAI_TEMPERATURE` | Response creativity (0-1) | No | 0.7 |

### OpenAI Model Configuration

The system is configured to use GPT-3.5-turbo with the following settings:
- **Max Tokens**: 150 (configurable)
- **Temperature**: 0.7 (balanced creativity)
- **Presence Penalty**: 0.1 (reduces repetition)
- **Frequency Penalty**: 0.1 (encourages diverse responses)

## Usage

### Basic Webhook Integration

1. **Set up Dialogflow CX webhook**
   - URL: `https://your-domain.com/dialogflow`
   - Method: POST

2. **Configure webhook tags**
   - `create_project`: Handle project creation
   - `get_status`: Check project status
   - `fallback`: Trigger OpenAI fallback
   - Any unknown tag will automatically use OpenAI fallback

### API Endpoints

#### Main Webhook
```
POST /dialogflow
```
Handles all Dialogflow CX webhook requests.

#### Health Check
```
GET /health
```
Returns service health status.

#### Test Fallback
```
POST /test-fallback
Body: { "message": "test message", "sessionId": "optional" }
```
Test the OpenAI fallback functionality.

#### Conversation Stats
```
GET /conversation/:sessionId/stats
```
Get conversation statistics for a session.

## How It Works

### 1. Request Processing
When a webhook request comes in:
1. The system extracts the tag and parameters
2. Routes to appropriate handler based on tag
3. If tag is unknown or fails, triggers OpenAI fallback

### 2. OpenAI Fallback
The fallback system:
1. Analyzes user intent using OpenAI
2. Generates contextual response based on conversation history
3. Provides suggested actions for better user experience
4. Maintains conversation context for future interactions

### 3. Conversation Management
- Tracks all user and assistant messages
- Maintains session parameters
- Provides conversation statistics and summaries
- Supports contact assignment for CRM integration

## Example Responses

### Successful Fallback
```json
{
  "fulfillment_response": {
    "messages": [
      {
        "text": {
          "text": ["I understand you're asking about data recovery services. Let me help you with that."]
        }
      }
    ]
  },
  "session_info": {
    "session": "projects/xxx/locations/xxx/agents/xxx/sessions/xxx",
    "parameters": {
      "fallback_handled": true,
      "openai_intent": "data_recovery_inquiry",
      "openai_confidence": 0.85
    }
  }
}
```

### Error Handling
```json
{
  "fulfillment_response": {
    "messages": [
      {
        "text": {
          "text": ["I'm experiencing technical difficulties. Please try again or contact support."]
        }
      }
    ]
  },
  "session_info": {
    "session": "projects/xxx/locations/xxx/agents/xxx/sessions/xxx",
    "parameters": {
      "error": "fallback_failed",
      "fallback_handled": false
    }
  }
}
```

## Customization

### Adding New Tags
1. Add new case in `reply()` method in `webhook-handler.ts`
2. Implement the handler method
3. Add fallback support for error cases

### Modifying OpenAI Prompts
Edit the system prompts in `src/services/openai.ts`:
- `generateFallbackResponse()`: Main fallback response generation
- `analyzeUserIntent()`: Intent analysis
- `generateSuggestedResponses()`: Response suggestions

### Conversation Context
Modify the conversation context in `src/services/conversation.ts`:
- Add new message types
- Extend session parameters
- Customize conversation flow

## Monitoring and Analytics

### Built-in Metrics
- Message count (user/assistant)
- Fallback usage frequency
- Conversation duration
- Session parameters

### Logging
The system logs:
- All webhook requests
- Fallback triggers
- OpenAI API calls
- Error conditions
- Conversation statistics

## Troubleshooting

### Common Issues

1. **OpenAI API Key Error**
   - Ensure `OPENAI_API_KEY` is set in `.env`
   - Verify API key is valid and has sufficient credits

2. **TypeScript Build Errors**
   - Run `npm run build` to check for compilation errors
   - Ensure all dependencies are installed

3. **Webhook Timeout**
   - OpenAI API calls may take time
   - Consider reducing `max_tokens` for faster responses
   - Implement request timeout handling

### Debug Mode
Enable debug logging:
```env
ENABLE_DEBUG_LOGGING=true
LOG_LEVEL=debug
```

## Development

### Project Structure
```
src/
├── services/
│   ├── openai.ts          # OpenAI integration
│   └── conversation.ts    # Conversation management
├── webhook-handler.ts     # Main webhook logic
└── index.js              # Entry point

routes/
└── dialogflow_route.js   # Express routes

controllers/               # Legacy controllers (can be removed)
```

### Adding New Features
1. Create new service in `src/services/`
2. Add corresponding interface definitions
3. Update webhook handler
4. Add tests and documentation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

ISC License

## Support

For issues and questions:
- Check the troubleshooting section
- Review the logs for error details
- Contact the development team

---

**Note**: This enhanced webhook provides intelligent fallback responses using OpenAI, making your Dialogflow CX bot more capable of handling unexpected user inputs while maintaining conversation context and providing helpful responses.