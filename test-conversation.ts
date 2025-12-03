import { ConversationService } from './dist/services/conversationService.js';

console.log('=== Conversation Tree Test ===');

try {
  const conversationService = new ConversationService();

  console.log('Info:', conversationService.getConversationInfo());
  console.log('Initial State Type:', conversationService.getInitialState().type);

  // Test user flow
  const testUserId = 'test-user-123';
  console.log('\n=== Testing User Flow ===');

  // Get initial state
  let state = conversationService.getUserState(testUserId);
  console.log('Initial state for new user:', state.type);

  // Process "menu" command
  state = conversationService.processUserInput(testUserId, 'menu');
  console.log('After "menu" command:', state.type);

  // Process "destinasi" selection
  state = conversationService.processUserInput(testUserId, 'destinasi');
  console.log('After "destinasi" selection:', state.type);

  // Process "bali" selection
  state = conversationService.processUserInput(testUserId, 'bali');
  console.log('After "bali" selection:', state.type);

  // Reset user
  conversationService.resetUserState(testUserId);
  console.log('After reset, user state should be initial again');

  console.log('=== Test Completed Successfully ===');
} catch (error) {
  console.error('Test Failed:', error);
  console.log('=== Test Failed ===');
}
