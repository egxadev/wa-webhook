/**
 * Type definitions for WhatsApp Webhook Service
 */

// ============================================================================
// Message Types
// ============================================================================

export enum MessageType {
  TEXT = 'text',
  BUTTON = 'button',
  LIST = 'list'
}

export interface TextMessage {
  type: MessageType.TEXT;
  text: string;
}

export interface InteractiveButton {
  id: string;
  title: string;
}

export interface InteractiveButtonMessage {
  type: MessageType.BUTTON;
  interactive: {
    body: string;
    buttons: InteractiveButton[];
  };
}

export interface ListRow {
  id: string;
  title: string;
  description: string;
}

export interface ListSection {
  title: string;
  rows: ListRow[];
}

export interface InteractiveListMessage {
  type: MessageType.LIST;
  interactive: {
    body: string;
    lists: {
      button: string;
      sections: ListSection[];
    };
  };
}

export type Message = TextMessage | InteractiveButtonMessage | InteractiveListMessage;

// ============================================================================
// Conversation Tree Types
// ============================================================================

export interface ConversationState {
  type: 'text' | 'interactive_button' | 'interactive_list';
  message: any;
  transitions: Record<string, string>;
  fallback?: string;
  end_conversation?: boolean;
}

export interface ConversationTree {
  version: string;
  description: string;
  initial_state: string;
  states: Record<string, ConversationState>;
  keywords: Record<string, string>;
  fallback_responses: {
    unknown_input: string;
    error: string;
  };
}

// ============================================================================
// Webhook Payload Types
// ============================================================================

export interface WebhookPayload {
  data_event: string;
  webhook_event: string;
  participant_type: string;
  room_id: string;
  text?: string;
  customer_phone?: string;
  customer_name?: string;
}

// ============================================================================
// API Types
// ============================================================================

export interface QontakApiConfig {
  baseUrl: string;
  accessToken: string;
}

export interface SendMessageRequest {
  room_id: string;
  type: string;
  text?: string;
  interactive?: {
    body: string;
    buttons?: InteractiveButton[];
    lists?: {
      button: string;
      sections: ListSection[];
    };
  };
}

export interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// ============================================================================
// Form Session Types
// ============================================================================

export interface FormField {
  name: string;
  question: string;
  type?: 'text' | 'choice';
  choices?: string[];
  validation?: (value: string) => boolean;
  errorMessage?: string;
}

export interface FormSession {
  userId: string;
  formType: string;
  currentStep: number;
  data: Record<string, any>;
  startedAt: Date;
  lastActivityAt: Date;
}

export interface PurchaseInquiryData {
  tipePembeli: 'perusahaan' | 'individu';
  nama: string;
  umur: number;
  jenisKelamin: 'L' | 'P';
  kota: string;
  tujuanPembelian: 'end_user' | 'qty_banyak' | 'online' | 'kerjasama_bisnis';
}

// ============================================================================
// FAQ Types
// ============================================================================

export interface FAQQuestion {
  id: string;
  question: string;  // Max 24 chars for list title
  answer: string;
}

export type ProductType = 'silverstream' | 'stimel' | 'akusehat';
