import express from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { ConversationService } from './services/conversationService';

// Load environment variables from .env file
dotenv.config();

// Message type interfaces
interface TextMessage {
  type: 'text';
  text: string;
}

interface ListRow {
  id: string;
  title: string;
  description: string;
}

interface ListSection {
  title: string;
  rows: ListRow[];
}

interface InteractiveListMessage {
  type: 'list';
  interactive: {
    body: string;
    lists: {
      button: string;
      sections: ListSection[];
    };
  };
}

interface InteractiveButton {
  id: string;
  title: string;
}

interface InteractiveButtonMessage {
  type: 'button';
  interactive: {
    body: string;
    buttons: InteractiveButton[];
  };
}

type MessageType = TextMessage | InteractiveListMessage | InteractiveButtonMessage;

const app = express();
const PORT = process.env.PORT || 3000;

// Qontak API configuration
const QONTAK_BASE_URL = process.env.QONTAK_BASE_URL || 'https://service-chat.qontak.com/api/open/v1';
const QONTAK_ACCESS_TOKEN = process.env.QONTAK_ACCESS_TOKEN;

// Gemini AI configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY || '' });

// Conversation service
const conversationService = new ConversationService();

// AI Response Generation Service
async function generateAIResponse(customerMessage: string, context?: string): Promise<string> {
  try {
    if (!GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY not configured, using fallback responses');
      return getFallbackResponse(customerMessage);
    }

    const prompt = context ?
      `${context}\n\nUser message: "${customerMessage}"\n\nPlease provide a helpful response in Indonesian.` :
      `User message: "${customerMessage}"

Please provide a helpful, friendly response in Indonesian language. Keep responses concise and engaging.`;

    const response = await genAI.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
    });

    const text = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text || '';

    console.log('=== AI Generated Response ===');
    console.log('Input:', customerMessage);
    console.log('Context:', context?.substring(0, 100) + '...');
    console.log('Output:', text.substring(0, 100) + '...');
    console.log('==============================');

    return text.trim();
  } catch (error) {
    console.error('=== Error generating AI response ===');
    console.error('Error:', error);
    console.error('====================================');
    return getFallbackResponse(customerMessage);
  }
}

// Fallback responses when AI is not available
function getFallbackResponse(customerMessage: string): string {
  const lowerText = customerMessage.toLowerCase();

  if (lowerText.includes('halo') || lowerText.includes('hi')) {
    return 'Halo! Selamat datang. Ada yang bisa saya bantu?';
  } else if (lowerText.includes('tes') || lowerText.includes('test')) {
    return 'Test berhasil! Webhook service berfungsi dengan baik.';
  } else if (lowerText.includes('help') || lowerText.includes('bantuan')) {
    return 'Silakan beri tahu saya bagaimana saya bisa membantu Anda hari ini.';
  } else {
    return 'Terima kasih atas pesan Anda! Saya akan membantu Anda segera.';
  }
}

// Function to send text message to Qontak
async function sendTextMessage(roomId: string, text: string) {
  try {
    const response = await axios.post(
      `${QONTAK_BASE_URL}/messages/whatsapp/bot`,
      {
        room_id: roomId,
        type: "text",
        text: text
      },
      {
        headers: {
          'Authorization': `Bearer ${QONTAK_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('=== Text Message sent to Qontak ===');
    console.log('Response:', response.data);
    console.log('===================================');

    return response.data;
  } catch (error) {
    console.error('=== Error sending text message to Qontak ===');
    if (axios.isAxiosError(error)) {
      console.error('Error:', error.response?.data || error.message);
    } else {
      console.error('Error:', error);
    }
    console.error('===========================================');
    return null;
  }
}

// Function to send interactive list message to Qontak
async function sendInteractiveListMessage(roomId: string, body: string, buttonText: string, sections: ListSection[]) {
  try {
    const response = await axios.post(
      `${QONTAK_BASE_URL}/messages/whatsapp/interactive_message/bot`,
      {
        room_id: roomId,
        type: "list",
        interactive: {
          body: body,
          lists: {
            button: buttonText,
            sections: sections
          }
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${QONTAK_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('=== Interactive List Message sent to Qontak ===');
    console.log('Response:', response.data);
    console.log('===============================================');

    return response.data;
  } catch (error) {
    console.error('=== Error sending interactive list message to Qontak ===');
    if (axios.isAxiosError(error)) {
      console.error('Error:', error.response?.data || error.message);
    } else {
      console.error('Error:', error);
    }
    console.error('=====================================================');
    return null;
  }
}

// Function to send interactive button message to Qontak
async function sendInteractiveButtonMessage(roomId: string, body: string, buttons: InteractiveButton[]) {
  try {
    const response = await axios.post(
      `${QONTAK_BASE_URL}/messages/whatsapp/interactive_message/bot`,
      {
        room_id: roomId,
        type: "button",
        interactive: {
          body: body,
          buttons: buttons
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${QONTAK_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('=== Interactive Button Message sent to Qontak ===');
    console.log('Response:', response.data);
    console.log('=================================================');

    return response.data;
  } catch (error) {
    console.error('=== Error sending interactive button message to Qontak ===');
    if (axios.isAxiosError(error)) {
      console.error('Error:', error.response?.data || error.message);
    } else {
      console.error('Error:', error);
    }
    console.error('=======================================================');
    return null;
  }
}

// Unified function to send different types of messages
async function sendMessage(roomId: string, message: MessageType) {
  switch (message.type) {
    case 'text':
      return await sendTextMessage(roomId, message.text);
    case 'list':
      return await sendInteractiveListMessage(
        roomId,
        message.interactive.body,
        message.interactive.lists.button,
        message.interactive.lists.sections
      );
    case 'button':
      return await sendInteractiveButtonMessage(
        roomId,
        message.interactive.body,
        message.interactive.buttons
      );
    default:
      console.error('Unsupported message type:', message);
      return null;
  }
}

app.use(bodyParser.json());

app.post('/webhook', async (req, res) => {
  console.log('=== Webhook Received ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('========================');

  // Check if this is a customer message
  const webhookData = req.body;
  if (webhookData.data_event === 'receive_message_from_customer' &&
      webhookData.webhook_event === 'message_interaction' &&
      webhookData.participant_type === 'customer') {

    console.log('=== Customer message detected, sending auto-response ===');

    // Extract room_id and customer text
    const roomId = webhookData.room_id;
    const customerText = webhookData.text || '';

    // Use conversation service to generate response
    const userId = webhookData.room_id; // Use room_id as user identifier
    const conversationState = conversationService.processUserInput(userId, customerText);
    const currentStateKey = conversationService['userStates'].get(userId) || 'greeting';

    // Convert conversation state to message format
    if (conversationState.type === 'text') {
      const textMessage: TextMessage = {
        type: 'text',
        text: conversationState.message
      };
      await sendMessage(roomId, textMessage);

    } else if (conversationState.type === 'interactive_button') {
      const buttonMessage: InteractiveButtonMessage = {
        type: 'button',
        interactive: conversationState.message
      };
      await sendMessage(roomId, buttonMessage);

    } else if (conversationState.type === 'interactive_list') {
      const listMessage: InteractiveListMessage = {
        type: 'list',
        interactive: conversationState.message
      };
      await sendMessage(roomId, listMessage);

    } else if (conversationState.type === 'ai_generated') {
      // Handle AI-generated responses with enhanced context
      const baseContext = conversationState.message.context || "User sedang dalam percakapan dengan bot wisata Indonesia.";
      const enhancedContext = conversationService.getEnhancedAIContext(userId, baseContext);
      const aiResponse = await generateAIResponse(customerText, enhancedContext);

      // Save AI response to conversation history
      const currentStateKey = conversationService['userStates'].get(userId) || 'greeting';
      conversationService.addToHistory(userId, customerText, currentStateKey, aiResponse);

      const textMessage: TextMessage = {
        type: 'text',
        text: aiResponse
      };
      await sendMessage(roomId, textMessage);
    }

    // Check if conversation should end
    if (conversationService.shouldEndConversation(userId)) {
      console.log(`=== Conversation ended for user ${userId} ===`);
    }
  }

  res.status(200).json({ status: 'ok', message: 'Webhook received successfully' });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

app.get('/conversation-info', (req, res) => {
  const info = conversationService.getConversationInfo();
  res.status(200).json({
    status: 'success',
    data: info
  });
});

app.post('/reset-conversation/:userId', (req, res) => {
  const { userId } = req.params;
  conversationService.resetUserState(userId);
  res.status(200).json({
    status: 'success',
    message: `Conversation reset for user ${userId}`
  });
});

app.listen(PORT, () => {
  console.log(`Webhook service running on port ${PORT}`);
  console.log(`Webhook endpoint: http://localhost:${PORT}/webhook`);
});
