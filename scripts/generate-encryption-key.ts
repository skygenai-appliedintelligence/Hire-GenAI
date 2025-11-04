/**
 * Generate a secure encryption key for storing sensitive data
 * Run this script to generate a new ENCRYPTION_KEY for your .env.local
 * 
 * Usage: npx tsx scripts/generate-encryption-key.ts
 */

import { generateEncryptionKey } from '../lib/encryption'

console.log('\n🔐 Generating secure encryption key...\n')

const key = generateEncryptionKey()

console.log('✅ Encryption key generated successfully!\n')
console.log('Add this to your .env.local file:\n')
console.log('─'.repeat(60))
console.log(`ENCRYPTION_KEY=${key}`)
console.log('─'.repeat(60))
console.log('\n⚠️  IMPORTANT:')
console.log('   • Keep this key secret and secure')
console.log('   • Never commit it to version control')
console.log('   • Store it in a secure location (e.g., password manager)')
console.log('   • If you lose this key, encrypted data cannot be recovered')
console.log('   • Use the same key across all environments for the same database\n')
