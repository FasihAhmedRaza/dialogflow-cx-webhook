const express = require('express');
const router = express.Router();

// Import the enhanced webhook handler
const { handleWebhook } = require('../src/webhook-handler');

// Middleware to parse JSON bodies
router.use(express.json({ limit: '10mb' }));

// Main Dialogflow webhook endpoint
router.post('/dialogflow', async (req, res) => {
    try {
        console.log('New Dialogflow webhook request received...');
        console.log('Tag:', req.body.fulfillmentInfo?.tag);
        console.log('Session:', req.body.sessionInfo?.session);
        
        // Use the enhanced webhook handler
        await handleWebhook(req, res);
        
    } catch (error) {
        console.error('Route error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to process webhook request'
        });
    }
});

// Health check endpoint
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'Dialogflow CX Webhook with OpenAI Integration'
    });
});

// Test endpoint for OpenAI fallback
router.post('/test-fallback', async (req, res) => {
    try {
        const { message, sessionId } = req.body;
        
        if (!message) {
            return res.status(400).json({
                error: 'Missing message parameter'
            });
        }

        // Test the OpenAI fallback functionality
        const { generateFallbackResponse } = require('../src/services/openai');
        
        const fallbackResponse = await generateFallbackResponse({
            sessionId: sessionId || 'test-session',
            userMessage: message,
            parameters: {}
        });

        res.json({
            success: true,
            fallbackResponse,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Test fallback error:', error);
        res.status(500).json({
            error: 'Test fallback failed',
            message: error.message
        });
    }
});

// Conversation stats endpoint
router.get('/conversation/:sessionId/stats', (req, res) => {
    try {
        const { sessionId } = req.params;
        
        // This would typically come from a database or session store
        // For now, return mock data
        res.json({
            sessionId,
            messageCount: 0,
            userMessageCount: 0,
            assistantMessageCount: 0,
            fallbackCount: 0,
            lastActivity: new Date().toISOString()
        });

    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({
            error: 'Failed to get conversation stats'
        });
    }
});

module.exports = {
    router
};