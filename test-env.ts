import dotenv from 'dotenv';

dotenv.config();

console.log('=== Environment Variables Test ===');
console.log('QONTAK_ACCESS_TOKEN:', process.env.QONTAK_ACCESS_TOKEN);
console.log('QONTAK_BASE_URL:', process.env.QONTAK_BASE_URL);
console.log('CHATBOT_ACCESS_TOKEN:', process.env.CHATBOT_ACCESS_TOKEN);
console.log('===================================');
