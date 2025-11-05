require('dotenv').config({path:'.env.local'});
const { Client } = require('pg');

async function testConnection() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('📦 Testing database connection...');
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
    console.log('URL starts with:', process.env.DATABASE_URL?.substring(0, 50) + '...');

    await client.connect();
    console.log('✅ Database connected successfully!');

    // Test a simple query
    const result = await client.query('SELECT 1 as test');
    console.log('✅ Query executed successfully:', result.rows[0]);

  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
  } finally {
    await client.end();
  }
}

testConnection();
