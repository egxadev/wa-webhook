const fs = require('fs');

console.log('=== Conversation Tree Validation ===');

try {
  const tree = JSON.parse(fs.readFileSync('conversation-tree.json', 'utf8'));
  console.log('Total states:', Object.keys(tree.states).length);
  console.log('Initial state:', tree.states[tree.initial_state].type);
  console.log('Greeting buttons:', tree.states.greeting.message.buttons.length);
  console.log('Silverstream options:', tree.states.silverstream_menu.message.lists.sections.reduce((sum, section) => sum + section.rows.length, 0));
  console.log('Stimel options:', tree.states.stimel_menu.message.lists.sections.reduce((sum, section) => sum + section.rows.length, 0));
  console.log('Akusehat options:', tree.states.akusehat_menu.message.lists.sections.reduce((sum, section) => sum + section.rows.length, 0));
  console.log('✅ Conversation tree updated for SilverStream health products');
} catch (error) {
  console.error('❌ Error:', error.message);
}
