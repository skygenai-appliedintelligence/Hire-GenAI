// Simple database test
const { DatabaseService } = require('./lib/database');

async function testDB() {
  try {
    console.log('Testing database connection...');
    
    // Test if we can create an OTP challenge
    const result = await DatabaseService.createOtpChallenge('test@example.com', 'signup');
    console.log('✅ Database working! OTP challenge created:', result.challenge.id);
    
  } catch (error) {
    console.log('❌ Database issue:', error.message);
    
    if (error.message.includes('relation') && error.message.includes('does not exist')) {
      console.log('\n🔧 Need to create database tables first.');
      console.log('Copy the SQL from scripts/database-schema.sql and run it in your Neon console.');
    }
  }
}

testDB();
