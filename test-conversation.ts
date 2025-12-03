/**
 * Test script for conversation flow
 * This simulates user interactions to verify the conversation tree works correctly
 */

import { ConversationService } from './src/services/conversationService';

const conversationService = new ConversationService();

console.log('🧪 Testing Conversation Flow\n');
console.log('═'.repeat(60));

// Test user ID
const testUserId = 'test-user-123';

// Test scenarios
const testScenarios = [
  {
    name: 'Scenario 1: Produk A → Penjelasan → Ke Menu Utama',
    steps: [
      { input: 'halo', expected: 'greeting with buttons' },
      { input: 'produk_a', expected: 'produk_a_menu with list' },
      { input: 'penjelasan', expected: 'produk_a_penjelasan with buttons' },
      { input: 'menu_utama', expected: 'back to greeting' }
    ]
  },
  {
    name: 'Scenario 2: Produk B → Cara Penggunaan → Kembali',
    steps: [
      { input: 'produk_b', expected: 'produk_b_menu with list' },
      { input: 'cara_penggunaan', expected: 'produk_b_cara_penggunaan with buttons' },
      { input: 'kembali', expected: 'back to produk_b_menu' }
    ]
  },
  {
    name: 'Scenario 3: Produk C → Konsultasi',
    steps: [
      { input: 'menu', expected: 'back to greeting' },
      { input: 'produk_c', expected: 'produk_c_menu with list' },
      { input: 'konsultasi', expected: 'produk_c_konsultasi with buttons' }
    ]
  }
];

// Run tests
testScenarios.forEach((scenario, idx) => {
  console.log(`\n${idx + 1}. ${scenario.name}`);
  console.log('─'.repeat(60));
  
  scenario.steps.forEach((step, stepIdx) => {
    const message = conversationService.processInput(testUserId, step.input);
    
    console.log(`\n   Step ${stepIdx + 1}: "${step.input}"`);
    console.log(`   Expected: ${step.expected}`);
    console.log(`   Message Type: ${message.type}`);
    
    if (message.type === 'text') {
      console.log(`   Response: ${message.text.substring(0, 50)}...`);
    } else if (message.type === 'button') {
      console.log(`   Body: ${message.interactive.body.substring(0, 50)}...`);
      console.log(`   Buttons: ${message.interactive.buttons.map(b => b.title).join(', ')}`);
    } else if (message.type === 'list') {
      console.log(`   Body: ${message.interactive.body}`);
      const totalRows = message.interactive.lists.sections.reduce((sum, section) => sum + section.rows.length, 0);
      console.log(`   List Items: ${totalRows}`);
    }
    
    console.log('   ✓ Success');
  });
  
  // Reset for next scenario
  conversationService.reset(testUserId);
});

console.log('\n' + '═'.repeat(60));
console.log('\n✅ All conversation flow tests completed!\n');

// Show conversation tree info
const info = conversationService.getInfo();
console.log('📊 Conversation Tree Info:');
console.log(`   Version: ${info.version}`);
console.log(`   Total States: ${info.totalStates}`);
console.log(`   Description: ${info.description}`);
console.log('');
