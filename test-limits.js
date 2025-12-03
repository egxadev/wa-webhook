const fs = require('fs');

console.log('=== WhatsApp API Limits Validation ===\n');

try {
  const conversationTree = JSON.parse(fs.readFileSync('conversation-tree.json', 'utf8'));

  let allGood = true;
  const issues = [];

  // Check each state
  for (const [stateName, state] of Object.entries(conversationTree.states)) {
    if (state.type === 'interactive_button') {
      const buttonCount = state.message.buttons.length;
      if (buttonCount > 3) {
        issues.push(`❌ ${stateName}: ${buttonCount} buttons (max 3 allowed)`);
        allGood = false;
      } else {
        console.log(`✅ ${stateName}: ${buttonCount} buttons`);
      }
    } else if (state.type === 'interactive_list') {
      let totalRows = 0;
      for (const section of state.message.lists.sections) {
        totalRows += section.rows.length;
      }
      if (totalRows > 10) {
        issues.push(`❌ ${stateName}: ${totalRows} list items (max 10 allowed)`);
        allGood = false;
      } else {
        console.log(`✅ ${stateName}: ${totalRows} list items`);
      }
    }
  }

  console.log('\n=== Global Keywords ===');
  console.log('Available commands:', Object.keys(conversationTree.keywords).join(', '));

  console.log('\n=== Summary ===');
  if (allGood) {
    console.log('✅ All states comply with WhatsApp API limits!');
    console.log('🎉 Conversation tree is ready for production.');
  } else {
    console.log('❌ Issues found:');
    issues.forEach(issue => console.log(`   ${issue}`));
  }

} catch (error) {
  console.error('❌ Error reading conversation tree:', error.message);
}
