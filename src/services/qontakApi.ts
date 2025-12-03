import axios, { AxiosInstance } from 'axios';
import {
  QontakApiConfig,
  Message,
  MessageType,
  ListSection,
  InteractiveButton
} from '../types';

/**
 * Service for communicating with Qontak WhatsApp API
 */
export class QontakApiService {
  private client: AxiosInstance;

  constructor(config: QontakApiConfig) {
    this.client = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Send text message to WhatsApp
   */
  async sendTextMessage(roomId: string, text: string): Promise<boolean> {
    try {
      const response = await this.client.post('/messages/whatsapp/bot', {
        room_id: roomId,
        type: 'text',
        text
      });

      console.log('✓ Text message sent successfully');
      return true;
    } catch (error) {
      this.handleError('Error sending text message', error);
      return false;
    }
  }

  /**
   * Send interactive button message to WhatsApp
   */
  async sendButtonMessage(
    roomId: string,
    body: string,
    buttons: InteractiveButton[]
  ): Promise<boolean> {
    try {
      const response = await this.client.post('/messages/whatsapp/interactive_message/bot', {
        room_id: roomId,
        type: 'button',
        interactive: {
          body,
          buttons
        }
      });

      console.log('✓ Button message sent successfully');
      return true;
    } catch (error) {
      this.handleError('Error sending button message', error);
      return false;
    }
  }

  /**
   * Send interactive list message to WhatsApp
   */
  async sendListMessage(
    roomId: string,
    body: string,
    buttonText: string,
    sections: ListSection[]
  ): Promise<boolean> {
    try {
      const response = await this.client.post('/messages/whatsapp/interactive_message/bot', {
        room_id: roomId,
        type: 'list',
        interactive: {
          body,
          lists: {
            button: buttonText,
            sections
          }
        }
      });

      console.log('✓ List message sent successfully');
      return true;
    } catch (error) {
      this.handleError('Error sending list message', error);
      return false;
    }
  }

  /**
   * Unified method to send any message type
   */
  async sendMessage(roomId: string, message: Message): Promise<boolean> {
    switch (message.type) {
      case MessageType.TEXT:
        return await this.sendTextMessage(roomId, message.text);

      case MessageType.BUTTON:
        return await this.sendButtonMessage(
          roomId,
          message.interactive.body,
          message.interactive.buttons
        );

      case MessageType.LIST:
        return await this.sendListMessage(
          roomId,
          message.interactive.body,
          message.interactive.lists.button,
          message.interactive.lists.sections
        );

      default:
        console.error('Unknown message type:', message);
        return false;
    }
  }

  /**
   * Handle API errors with proper logging
   */
  private handleError(message: string, error: any): void {
    console.error(`✗ ${message}`);
    if (axios.isAxiosError(error)) {
      console.error('API Error:', error.response?.data || error.message);
      console.error('Status:', error.response?.status);
    } else {
      console.error('Error:', error);
    }
  }
}
