import * as fs from 'fs';
import * as path from 'path';

interface ConversationState {
  type: 'text' | 'interactive_button' | 'interactive_list';
  message: any;
  transitions: { [key: string]: string };
  fallback?: string;
  end_conversation?: boolean;
}

interface ConversationTree {
  version: string;
  description: string;
  initial_state: string;
  states: { [key: string]: ConversationState };
  keywords: { [key: string]: string };
  fallback_responses: {
    unknown_input: string;
    error: string;
  };
}

interface ConversationMessage {
  timestamp: Date;
  userInput: string;
  aiResponse?: string;
  state: string;
}

export class ConversationService {
  private conversationTree: ConversationTree;
  private userStates: Map<string, string> = new Map();
  private conversationHistory: Map<string, ConversationMessage[]> = new Map();
  private readonly MAX_HISTORY_LENGTH = 10;

  constructor() {
    this.conversationTree = this.loadConversationTree();
  }

  private loadConversationTree(): ConversationTree {
    try {
      const filePath = path.join(process.cwd(), 'conversation-tree.json');
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading conversation tree:', error);
      throw new Error('Failed to load conversation tree');
    }
  }

  /**
   * Get initial state for new conversation
   */
  getInitialState(): ConversationState {
    return this.conversationTree.states[this.conversationTree.initial_state];
  }

  /**
   * Get current state for user
   */
  getUserState(userId: string): ConversationState {
    const currentStateKey = this.userStates.get(userId) || this.conversationTree.initial_state;
    return this.conversationTree.states[currentStateKey];
  }

  /**
   * Process user input and return next state
   */
  processUserInput(userId: string, userInput: string): ConversationState {
    const currentState = this.getUserState(userId);
    const lowerInput = userInput.toLowerCase().trim();

    // Check for keyword matches first
    const keywordState = this.conversationTree.keywords[lowerInput];
    if (keywordState) {
      this.userStates.set(userId, keywordState);
      const newState = this.conversationTree.states[keywordState];
      this.addToHistory(userId, userInput, keywordState);
      return newState;
    }

    // Check for transition matches
    const transitionState = currentState.transitions[lowerInput];
    if (transitionState) {
      this.userStates.set(userId, transitionState);
      const newState = this.conversationTree.states[transitionState];
      this.addToHistory(userId, userInput, transitionState);
      return newState;
    }

    // Check for partial matches in transitions
    for (const [key, state] of Object.entries(currentState.transitions)) {
      if (lowerInput.includes(key) || key.includes(lowerInput)) {
        this.userStates.set(userId, state);
        const newState = this.conversationTree.states[state];
        this.addToHistory(userId, userInput, state);
        return newState;
      }
    }

    // Use fallback if available
    if (currentState.fallback) {
      const fallbackState = this.conversationTree.states[currentState.fallback];
      if (fallbackState) {
        this.userStates.set(userId, currentState.fallback);
        this.addToHistory(userId, userInput, currentState.fallback);
        return fallbackState;
      }
    }

    // Return unknown input response
    this.addToHistory(userId, userInput, 'unknown_input');
    return {
      type: 'text',
      message: this.conversationTree.fallback_responses.unknown_input,
      transitions: {
        'menu': this.conversationTree.initial_state,
        'bantuan': this.conversationTree.initial_state
      },
      fallback: this.conversationTree.initial_state
    };
  }

  /**
   * Reset user conversation to initial state
   */
  resetUserState(userId: string): void {
    this.userStates.delete(userId);
  }

  /**
   * Check if conversation should end
   */
  shouldEndConversation(userId: string): boolean {
    const currentState = this.getUserState(userId);
    return currentState.end_conversation === true;
  }

  /**
   * Get all available transitions for current state
   */
  getAvailableTransitions(userId: string): string[] {
    const currentState = this.getUserState(userId);
    return Object.keys(currentState.transitions);
  }

  /**
   * Add message to conversation history
   */
  addToHistory(userId: string, userInput: string, state: string, aiResponse?: string): void {
    if (!this.conversationHistory.has(userId)) {
      this.conversationHistory.set(userId, []);
    }

    const history = this.conversationHistory.get(userId)!;
    history.push({
      timestamp: new Date(),
      userInput,
      aiResponse,
      state
    });

    // Keep only last MAX_HISTORY_LENGTH messages
    if (history.length > this.MAX_HISTORY_LENGTH) {
      history.splice(0, history.length - this.MAX_HISTORY_LENGTH);
    }
  }

  /**
   * Get conversation history for user
   */
  getConversationHistory(userId: string): ConversationMessage[] {
    return this.conversationHistory.get(userId) || [];
  }

  /**
   * Get conversation context for AI
   */
  getConversationContext(userId: string): string {
    const history = this.getConversationHistory(userId);
    if (history.length === 0) return "";

    const recentMessages = history.slice(-5); // Get last 5 messages for context
    const contextParts = recentMessages.map(msg =>
      `User: ${msg.userInput}${msg.aiResponse ? `\nAI: ${msg.aiResponse}` : ''}`
    );

    return `Conversation History:\n${contextParts.join('\n\n')}\n\n`;
  }

  /**
   * Get enhanced AI context combining state context and conversation history
   */
  getEnhancedAIContext(userId: string, stateContext?: string): string {
    const historyContext = this.getConversationContext(userId);
    const currentState = this.getUserState(userId);
    const stateName = this.userStates.get(userId) || this.conversationTree.initial_state;

    let context = `Current Conversation State: ${stateName}\n`;
    context += `State Type: ${currentState.type}\n\n`;

    if (stateContext) {
      context += `Specific Context: ${stateContext}\n\n`;
    }

    if (historyContext) {
      context += historyContext;
    }

    context += `Instructions: Berikan respons yang membantu, informatif, dan dalam bahasa Indonesia. Pertahankan konteks percakapan dan tawarkan bantuan lebih lanjut jika relevan.`;

    return context;
  }

  /**
   * Clear conversation history for user
   */
  clearConversationHistory(userId: string): void {
    this.conversationHistory.delete(userId);
  }

  /**
   * Get conversation tree info
   */
  getConversationInfo(): { version: string; description: string; totalStates: number } {
    return {
      version: this.conversationTree.version,
      description: this.conversationTree.description,
      totalStates: Object.keys(this.conversationTree.states).length
    };
  }
}
