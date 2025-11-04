/**
 * Test script to verify service account key encryption
 * Run: npx tsx scripts/test-service-account-encryption.ts
 */

import { createOpenAIProject } from '../lib/openai-projects'
import { createServiceAccount } from '../lib/openai-service-accounts'
import { encrypt, decrypt } from '../lib/encryption'

async function testServiceAccountEncryption() {
  console.log('\n🧪 Testing Service Account Key Encryption...\n')
  console.log('='.repeat(60))

  // Test 1: Create a test project
  console.log('\n📦 Step 1: Creating test OpenAI project...')
  const testCompanyName = `Test Company ${Date.now()}`
  const project = await createOpenAIProject(testCompanyName, 'Test project for encryption verification')

  if (!project?.id) {
    console.error('❌ Failed to create test project')
    return
  }

  console.log(`✅ Project created: ${project.id}`)

  // Test 2: Create service account
  console.log('\n🔑 Step 2: Creating service account...')
  const serviceAccount = await createServiceAccount(project.id)

  if (!serviceAccount?.api_key) {
    console.error('❌ Failed to create service account or extract API key')
    return
  }

  console.log(`✅ Service account created: ${serviceAccount.id}`)
  console.log(`✅ API key extracted: ${serviceAccount.api_key.substring(0, 20)}...`)

  // Test 3: Encrypt the credentials
  console.log('\n🔒 Step 3: Encrypting credentials...')
  const encryptedProjectId = encrypt(project.id)
  const encryptedApiKey = encrypt(serviceAccount.api_key)

  console.log(`✅ Project ID encrypted: ${encryptedProjectId.substring(0, 40)}...`)
  console.log(`✅ API key encrypted: ${encryptedApiKey.substring(0, 40)}...`)

  // Test 4: Decrypt and verify
  console.log('\n🔓 Step 4: Decrypting and verifying...')
  const decryptedProjectId = decrypt(encryptedProjectId)
  const decryptedApiKey = decrypt(encryptedApiKey)

  const projectIdMatch = decryptedProjectId === project.id
  const apiKeyMatch = decryptedApiKey === serviceAccount.api_key

  console.log(`${projectIdMatch ? '✅' : '❌'} Project ID decryption: ${projectIdMatch ? 'SUCCESS' : 'FAILED'}`)
  console.log(`${apiKeyMatch ? '✅' : '❌'} API key decryption: ${apiKeyMatch ? 'SUCCESS' : 'FAILED'}`)

  // Test 5: Verify encrypted format
  console.log('\n📊 Step 5: Verifying encrypted format...')
  const projectIdParts = encryptedProjectId.split(':')
  const apiKeyParts = encryptedApiKey.split(':')

  console.log(`Project ID parts: ${projectIdParts.length} (should be 3: iv:authTag:data)`)
  console.log(`API key parts: ${apiKeyParts.length} (should be 3: iv:authTag:data)`)

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📋 TEST SUMMARY\n')
  console.log(`Project Creation:        ${project?.id ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`Service Account:         ${serviceAccount?.api_key ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`API Key Extraction:      ${serviceAccount?.api_key ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`Project ID Encryption:   ${encryptedProjectId ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`API Key Encryption:      ${encryptedApiKey ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`Project ID Decryption:   ${projectIdMatch ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`API Key Decryption:      ${apiKeyMatch ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`Encrypted Format:        ${projectIdParts.length === 3 && apiKeyParts.length === 3 ? '✅ PASS' : '❌ FAIL'}`)

  const allTestsPassed = project?.id && serviceAccount?.api_key && projectIdMatch && apiKeyMatch && 
                         projectIdParts.length === 3 && apiKeyParts.length === 3

  console.log('\n' + '='.repeat(60))
  if (allTestsPassed) {
    console.log('🎉 ALL TESTS PASSED! Service account encryption is working correctly.\n')
  } else {
    console.log('❌ SOME TESTS FAILED! Please check the errors above.\n')
  }
}

// Run the test
testServiceAccountEncryption().catch(console.error)
