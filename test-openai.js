// Test script for OpenAI integration
require('dotenv').config();

const { generateFallbackResponse, analyzeUserIntent, generateSuggestedResponses } = require('./src/services/openai');

async function testOpenAIIntegration() {
    console.log('🧪 Testing OpenAI Integration...\n');

    try {
        // Test 1: Generate fallback response
        console.log('1️⃣ Testing fallback response generation...');
        const fallbackResponse = await generateFallbackResponse({
            sessionId: 'test-session-123',
            userMessage: 'I need help with my data recovery project',
            parameters: {
                projectname: 'PROJ-001',
                new_contact_email: 'test@example.com'
            }
        });
        
        console.log('✅ Fallback Response:', fallbackResponse);
        console.log('');

        // Test 2: Analyze user intent
        console.log('2️⃣ Testing intent analysis...');
        const intentAnalysis = await analyzeUserIntent(
            'Can you tell me the status of my hard drive recovery?',
            { projectname: 'PROJ-001' }
        );
        
        console.log('✅ Intent Analysis:', intentAnalysis);
        console.log('');

        // Test 3: Generate suggested responses
        console.log('3️⃣ Testing suggested responses...');
        const suggestions = await generateSuggestedResponses(
            'I lost my data, what should I do?',
            {
                sessionId: 'test-session-123',
                userMessage: 'I lost my data, what should I do?',
                parameters: {}
            }
        );
        
        console.log('✅ Suggested Responses:');
        suggestions.forEach((suggestion, index) => {
            console.log(`   ${index + 1}. ${suggestion}`);
        });
        console.log('');

        // Test 4: Test with different user message
        console.log('4️⃣ Testing with different user message...');
        const fallbackResponse2 = await generateFallbackResponse({
            sessionId: 'test-session-456',
            userMessage: 'How much does data recovery cost?',
            parameters: {
                new_contact_device_type: 'Hard Disk Drive'
            }
        });
        
        console.log('✅ Fallback Response 2:', fallbackResponse2);
        console.log('');

        console.log('🎉 All tests completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        
        if (error.message.includes('API key')) {
            console.log('\n💡 Make sure you have set OPENAI_API_KEY in your .env file');
        }
    }
}

// Run the test
if (require.main === module) {
    testOpenAIIntegration();
}

module.exports = { testOpenAIIntegration };