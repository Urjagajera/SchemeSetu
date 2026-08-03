import groqClient from './lib/groqClient.js';

async function testConnection() {
  console.log('Testing Groq connection...');
  try {
    const response = await groqClient.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: "Translate 'Hello' to Gujarati. Return only the translated word."
        }
      ]
    });

    console.log('\n--- Groq Response Success ---');
    console.log('Model Used:   ', response.model);
    console.log('Raw Response: ', response.choices[0]?.message?.content);
    console.log('-----------------------------\n');
    console.log('Smoke test passed successfully!');
  } catch (err) {
    console.error('\n--- Groq Response Failure ---');
    console.error('Error Name:   ', err.name);
    console.error('Error Message:', err.message);
    console.error('-----------------------------\n');
    process.exit(1);
  }
}

testConnection();
