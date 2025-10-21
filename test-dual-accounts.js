// Test script to verify dual account creation
const { DatabaseService } = require('./lib/database');

async function testDualAccounts() {
  try {
    console.log('🧪 Testing dual account creation...\n');
    
    const testEmail = 'test@gmail.com';
    
    // Step 1: Simulate demo sign-in (add user to demo company)
    console.log('1️⃣ Adding user to demo company...');
    const demoResult = await DatabaseService.addUserToDemoCompany(testEmail, 'Test User');
    console.log('Demo user created:', {
      email: demoResult.user.email,
      company: demoResult.company.name,
      isNewUser: demoResult.isNewUser
    });
    
    // Step 2: Check if user exists in their own domain
    console.log('\n2️⃣ Checking if user exists in own domain (gmail.com)...');
    const existingUser = await DatabaseService.findUserByEmailAndCompanyDomain(testEmail);
    console.log('User in own domain:', existingUser ? 'EXISTS' : 'NOT EXISTS');
    
    // Step 3: Try to create real company
    console.log('\n3️⃣ Creating real company for user...');
    const realCompany = await DatabaseService.findOrCreateCompany(testEmail, 'Test Gmail Company');
    console.log('Real company created:', {
      id: realCompany.id,
      name: realCompany.name
    });
    
    // Step 4: Try to create user in real company
    console.log('\n4️⃣ Creating user in real company...');
    const realUser = await DatabaseService.findOrCreateUser(testEmail, 'Test User', realCompany.id);
    console.log('Real user created:', {
      id: realUser.id,
      email: realUser.email,
      company_id: realUser.company_id
    });
    
    // Step 5: Verify both accounts exist
    console.log('\n5️⃣ Verifying both accounts exist...');
    
    // Check demo account
    const demoCheck = await DatabaseService.query(
      'SELECT u.*, c.name as company_name FROM users u JOIN companies c ON u.company_id = c.id WHERE u.email = $1 AND c.name LIKE $2',
      [testEmail, '%HireGenAI%']
    );
    
    // Check real account  
    const realCheck = await DatabaseService.query(
      'SELECT u.*, c.name as company_name FROM users u JOIN companies c ON u.company_id = c.id WHERE u.email = $1 AND c.name NOT LIKE $2',
      [testEmail, '%HireGenAI%']
    );
    
    console.log('Demo account exists:', demoCheck.length > 0);
    console.log('Real account exists:', realCheck.length > 0);
    
    if (demoCheck.length > 0 && realCheck.length > 0) {
      console.log('\n✅ SUCCESS: Both accounts exist!');
      console.log('Demo:', demoCheck[0].company_name);
      console.log('Real:', realCheck[0].company_name);
    } else {
      console.log('\n❌ FAILED: Both accounts do not exist');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run test
testDualAccounts();
