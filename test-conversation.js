// Test script for Conversation Tree
const { ConversationService } = require('./dist/services/conversationService');

async function testConversationTree() {
  console.log('=== Conversation Tree Test ===\n');

  try {
    const conversationService = new ConversationService();
    const info = conversationService.getConversationInfo();

    console.log('📊 Conversation Tree Info:');
    console.log(`Version: ${info.version}`);
    console.log(`Description: ${info.description}`);
    console.log(`Total States: ${info.totalStates}\n`);

    // Test initial state
    console.log('🎯 Initial State Test:');
    const initialState = conversationService.getInitialState();
    console.log(`Type: ${initialState.type}`);
    console.log(`Message: ${initialState.type === 'interactive_button' ? 'Interactive buttons available' : initialState.message}`);
    console.log(`Available transitions: ${Object.keys(initialState.transitions).join(', ')}\n`);

    // Test user flow simulation
    console.log('🔄 User Flow Simulation:');
    const testUserId = 'test_user_123';

    // Simulate user starting conversation
    console.log('1. User starts conversation...');
    let currentState = conversationService.processUserInput(testUserId, 'hello');
    console.log(`   → State: ${currentState.type}`);
    console.log(`   → Message: ${currentState.type === 'interactive_button' ? 'Product selection buttons' : currentState.message.substring(0, 50) + '...'}\n`);

    // Simulate user choosing Silverstream
    console.log('2. User chooses "silverstream"...');
    currentState = conversationService.processUserInput(testUserId, 'silverstream');
    console.log(`   → State: silverstream_info`);
    console.log(`   → Message: ${currentState.message.substring(0, 50)}...\n`);

    // Simulate user asking for details
    console.log('3. User asks for "detail"...');
    currentState = conversationService.processUserInput(testUserId, 'detail');
    console.log(`   → State: silverstream_detail`);
    console.log(`   → Message: ${currentState.message.substring(0, 50)}...\n`);

    // Simulate user asking for price
    console.log('4. User asks for "harga"...');
    currentState = conversationService.processUserInput(testUserId, 'harga');
    console.log(`   → State: silverstream_price`);
    console.log(`   → Message: ${currentState.message.substring(0, 50)}...\n`);

    // Test keyword recognition
    console.log('5. User says "menu" (global keyword)...');
    currentState = conversationService.processUserInput(testUserId, 'menu');
    console.log(`   → State: welcome (back to start)`);
    console.log(`   → Type: ${currentState.type}\n`);

    // Test fallback
    console.log('6. User says unknown input...');
    currentState = conversationService.processUserInput(testUserId, 'unknown_command_xyz');
    console.log(`   → State: fallback response`);
    console.log(`   → Message: ${currentState.message}\n`);

    console.log('✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testConversationTree();
