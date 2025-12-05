import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { ConversationService } from './services/conversationService';
import { QontakApiService } from './services/qontakApi';
import { WebhookPayload } from './types';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize services
const conversationService = new ConversationService();
const qontakApi = new QontakApiService({
  baseUrl: process.env.QONTAK_BASE_URL || 'https://service-chat.qontak.com/api/open/v1',
  accessToken: process.env.QONTAK_ACCESS_TOKEN || ''
});

// Middleware
app.use(bodyParser.json());

// ============================================================================
// Routes
// ============================================================================

/**
 * Webhook endpoint - Receives messages from Qontak
 */
app.post('/webhook', async (req, res) => {
  try {
    const payload: WebhookPayload = req.body;
    
    console.log('\n=== Webhook Received ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('========================');

    // Only process customer messages
    if (!isCustomerMessage(payload)) {
      return res.status(200).json({ status: 'ok', message: 'Not a customer message' });
    }

    // Extract data
    const roomId = payload.room_id;
    const userInput = payload.text || '';
    const userId = roomId; // Use room_id as user identifier

    console.log(`User ${userId}: "${userInput}"`);

    // Process conversation
    const responseMessage = conversationService.processInput(userId, userInput);
    
    // Send response
    const sent = await qontakApi.sendMessage(roomId, responseMessage);
    
    if (sent) {
      console.log('→ Response sent successfully\n');
    } else {
      console.error('✗ Failed to send response\n');
    }

    res.status(200).json({ status: 'ok', message: 'Processed successfully' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

/**
 * Get conversation tree info
 */
app.get('/conversation-info', (req, res) => {
  const info = conversationService.getInfo();
  res.status(200).json({
    status: 'success',
    data: info
  });
});

/**
 * Reset conversation for specific user
 */
app.post('/reset-conversation/:userId', (req, res) => {
  const { userId } = req.params;
  conversationService.reset(userId);
  res.status(200).json({
    status: 'success',
    message: `Conversation reset for user ${userId}`
  });
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if webhook payload is a customer message
 */
function isCustomerMessage(payload: WebhookPayload): boolean {
  return (
    payload.data_event === 'receive_message_from_customer' &&
    payload.webhook_event === 'message_interaction' &&
    payload.participant_type === 'customer'
  );
}

// ============================================================================
// Start Server
// ============================================================================

app.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  WhatsApp Webhook Service Started     ║');
  console.log('╚════════════════════════════════════════╝');
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📍 Webhook: http://localhost:${PORT}/webhook`);
  console.log(`💚 Health: http://localhost:${PORT}/health`);
  console.log(`📊 Info: http://localhost:${PORT}/conversation-info\n`);
  
  const treeInfo = conversationService.getInfo();
  console.log('📋 Conversation Tree Info:');
  console.log(`   Version: ${treeInfo.version}`);
  console.log(`   States: ${treeInfo.totalStates}`);
  console.log(`   Description: ${treeInfo.description}\n`);
});
