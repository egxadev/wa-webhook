import * as fs from 'fs';
import * as path from 'path';
import { ConversationTree, ConversationState, Message, MessageType } from '../types';

/**
 * Service for managing conversation flow based on conversation tree
 */
export class ConversationService {
  private tree: ConversationTree;
  private userStates: Map<string, string> = new Map();

  constructor() {
    this.tree = this.loadConversationTree();
  }

  /**
   * Load conversation tree from JSON file
   */
  private loadConversationTree(): ConversationTree {
    try {
      const filePath = path.join(process.cwd(), 'conversation-tree.json');
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to load conversation tree:', error);
      throw new Error('Cannot initialize conversation service');
    }
  }

  /**
   * Process user input and get response message
   */
  processInput(userId: string, userInput: string): Message {
    const normalizedInput = this.normalizeInput(userInput);
    
    // Check global keywords first
    const keywordState = this.checkKeyword(normalizedInput);
    if (keywordState) {
      this.userStates.set(userId, keywordState);
      return this.convertStateToMessage(keywordState);
    }

    // Get current state and check for transitions
    const currentStateKey = this.getCurrentStateKey(userId);
    const currentState = this.tree.states[currentStateKey];

    // Check exact match
    if (currentState.transitions[normalizedInput]) {
      const nextStateKey = currentState.transitions[normalizedInput];
      this.userStates.set(userId, nextStateKey);
      return this.convertStateToMessage(nextStateKey);
    }

    // Check partial match
    const partialMatch = this.findPartialMatch(normalizedInput, currentState.transitions);
    if (partialMatch) {
      this.userStates.set(userId, partialMatch);
      return this.convertStateToMessage(partialMatch);
    }

    // Use fallback or return to current state
    const fallbackStateKey = currentState.fallback || currentStateKey;
    return this.convertStateToMessage(fallbackStateKey);
  }

  /**
   * Reset user conversation state
   */
  reset(userId: string): void {
    this.userStates.delete(userId);
  }

  /**
   * Get conversation tree info
   */
  getInfo(): { version: string; description: string; totalStates: number } {
    return {
      version: this.tree.version,
      description: this.tree.description,
      totalStates: Object.keys(this.tree.states).length
    };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Normalize user input for matching
   */
  private normalizeInput(input: string): string {
    // Extract first line only (for list responses with descriptions)
    const firstLine = input.split('\n')[0];
    return firstLine.toLowerCase().trim();
  }

  /**
   * Get current state key for user
   */
  private getCurrentStateKey(userId: string): string {
    return this.userStates.get(userId) || this.tree.initial_state;
  }

  /**
   * Check if input matches any global keyword
   */
  private checkKeyword(input: string): string | null {
    return this.tree.keywords[input] || null;
  }

  /**
   * Find partial match in transitions
   */
  private findPartialMatch(input: string, transitions: Record<string, string>): string | null {
    for (const [key, stateKey] of Object.entries(transitions)) {
      if (input.includes(key) || key.includes(input)) {
        return stateKey;
      }
    }
    return null;
  }

  /**
   * Convert conversation state to message format
   */
  private convertStateToMessage(stateKey: string): Message {
    const state = this.tree.states[stateKey];

    if (!state) {
      // Return error fallback if state not found
      return {
        type: MessageType.TEXT,
        text: this.tree.fallback_responses.error
      };
    }

    switch (state.type) {
      case 'text':
        return {
          type: MessageType.TEXT,
          text: state.message.text || state.message
        };

      case 'interactive_button':
        return {
          type: MessageType.BUTTON,
          interactive: state.message
        };

      case 'interactive_list':
        return {
          type: MessageType.LIST,
          interactive: state.message
        };

      default:
        console.error('Unknown state type:', state.type);
        return {
          type: MessageType.TEXT,
          text: this.tree.fallback_responses.error
        };
    }
  }
}
