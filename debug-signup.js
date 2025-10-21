// Debug script to see what happens during signup
const { DatabaseService } = require('./lib/database');

async function debugSignup() {
  try {
    const testEmail = 'test123@gmail.com';
    
    console.log('🔍 Debug: Testing signup flow...\n');
    
    // Step 1: Add user to demo company first
    console.log('1️⃣ Adding user to demo company...');
    const demoResult = await DatabaseService.addUserToDemoCompany(testEmail, 'Test User');
    console.log('✅ Demo user created:', {
      userId: demoResult.user.id,
      email: demoResult.user.email,
      companyId: demoResult.company.id,
      companyName: demoResult.company.name
    });
    
    // Step 2: Check what findUserByEmailAndCompanyDomain returns
    console.log('\n2️⃣ Checking findUserByEmailAndCompanyDomain...');
    const domainCheck = await DatabaseService.findUserByEmailAndCompanyDomain(testEmail);
    console.log('Domain check result:', domainCheck ? 'USER FOUND' : 'USER NOT FOUND');
    if (domainCheck) {
      console.log('Found user in company:', domainCheck.companies.name);
    }
    
    // Step 3: Try to create company for gmail.com domain
    console.log('\n3️⃣ Trying to create company for gmail.com...');
    try {
      const newCompany = await DatabaseService.findOrCreateCompany(testEmail, 'Test Gmail Company');
      console.log('✅ Company created:', {
        id: newCompany.id,
        name: newCompany.name
      });
      
      // Step 4: Try to create user in new company
      console.log('\n4️⃣ Trying to create user in new company...');
      const newUser = await DatabaseService.findOrCreateUser(testEmail, 'Test User', newCompany.id);
      console.log('✅ User created in new company:', {
        id: newUser.id,
        email: newUser.email,
        companyId: newUser.company_id
      });
      
      // Step 5: Check final state
      console.log('\n5️⃣ Final verification...');
      const allUsers = await DatabaseService.query(
        'SELECT u.id, u.email, u.company_id, c.name as company_name FROM users u JOIN companies c ON u.company_id = c.id WHERE u.email = $1',
        [testEmail]
      );
      
      console.log('Total accounts for', testEmail + ':', allUsers.length);
      allUsers.forEach((user, index) => {
        console.log(`Account ${index + 1}:`, {
          company: user.company_name,
          companyId: user.company_id
        });
      });
      
    } catch (companyError) {
      console.error('❌ Company creation failed:', companyError.message);
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run debug
debugSignup();
