const { PrismaClient } = require('@prisma/client');

async function checkDatabase() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Checking database connection...');
    
    // Test basic connection
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connected');
    
    // Check if required tables exist
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('companies', 'users', 'otp_challenges', 'sessions', 'email_identities')
      ORDER BY table_name;
    `;
    
    console.log('\n📋 Existing tables:');
    tables.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    const requiredTables = ['companies', 'users', 'otp_challenges', 'sessions', 'email_identities'];
    const existingTables = tables.map(t => t.table_name);
    const missingTables = requiredTables.filter(t => !existingTables.includes(t));
    
    if (missingTables.length > 0) {
      console.log('\n❌ Missing tables:', missingTables.join(', '));
      console.log('You need to create the database schema first.');
    } else {
      console.log('\n✅ All required tables exist!');
    }
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
