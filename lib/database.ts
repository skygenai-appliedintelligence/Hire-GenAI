import crypto from 'crypto'
import { createOpenAIProject } from './openai-projects'
import { createServiceAccount } from './openai-service-accounts'

// Database service for authentication operations using raw SQL
export class DatabaseService {
  // Get database connection from existing prisma instance
  static async query(sql: string, params: any[] = [], retries: number = 3): Promise<any[]> {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured. Please set DATABASE_URL in your .env.local file.')
    }

    let lastError: any

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const { prisma } = await import('./prisma')
        if (!prisma) {
          throw new Error('Prisma client not initialized')
        }
        return await prisma.$queryRawUnsafe(sql, ...params)
      } catch (error: any) {
        lastError = error
        console.error(`Database query attempt ${attempt}/${retries} failed:`, error.message)

        // Check if this is a connection error that we should retry
        const isRetryableError = error.code === 'P1001' ||
          error.message?.includes('Can\'t reach database server') ||
          error.message?.includes('connection') ||
          error.message?.includes('timeout')

        if (!isRetryableError || attempt === retries) {
          throw new Error(`Database connection failed: ${error.message}`)
        }

        // Wait before retrying (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
        console.log(`Retrying database query in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw new Error(`Database connection failed after ${retries} attempts: ${lastError.message}`)
  }

  // Check if database is configured
  static isDatabaseConfigured(): boolean {
    return !!(process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL)
  }

  // Create or find company by email domain
  static async findOrCreateCompany(email: string, companyName?: string) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured. Please set DATABASE_URL in your .env.local file.')
    }

    const domain = email.split('@')[1]

    // Always create a new company for each signup, don't reuse existing ones by domain
    // This ensures each user gets their own company
    const finalCompanyName = companyName || domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1)

    const insertCompanyQuery = `
      INSERT INTO companies (name, status, verified, created_at)
      VALUES ($1, 'active', false, NOW())
      RETURNING *
    `
    const newCompany = await this.query(insertCompanyQuery, [finalCompanyName]) as any[]

    if (newCompany.length === 0) {
      throw new Error('Failed to create company')
    }

    // Add domain mapping
    const insertDomainQuery = `
      INSERT INTO company_domains (company_id, domain)
      VALUES ($1::uuid, $2)
      ON CONFLICT (company_id, domain) DO NOTHING
    `
    await this.query(insertDomainQuery, [newCompany[0].id, domain])

    return newCompany[0]
  }

  // Create company with full signup form data
  static async createCompanyFromSignup(email: string, signupData: {
    companyName: string
    industry?: string
    companySize?: string
    website?: string
    companyDescription?: string
    street?: string
    city?: string
    state?: string
    postalCode?: string
    country?: string
    phone?: string
    legalCompanyName?: string
    taxId?: string
    registrationNumber?: string
  }) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured. Please set DATABASE_URL in your .env.local file.')
    }

    const domain = email.split('@')[1]

    // Use the size_band value from the request or set to null
    const sizeBand = signupData.companySize || null

    // Build headquarters from address fields (legacy field, kept for compatibility)
    const headquartersArray = [
      signupData.street,
      signupData.city,
      signupData.state,
      signupData.postalCode,
      signupData.country
    ].filter(Boolean)
    const headquarters = headquartersArray.length > 0 ? headquartersArray.join(', ') : null

    // Check if company name already exists and make it unique if needed
    let finalCompanyName = signupData.companyName
    const checkNameQuery = `
      SELECT COUNT(*) as count FROM companies WHERE name = $1
    `
    const nameCheck = await this.query(checkNameQuery, [finalCompanyName]) as any[]
    
    if (nameCheck[0].count > 0) {
      // Append domain or timestamp to make name unique
      const timestamp = Date.now()
      finalCompanyName = `${signupData.companyName} (${domain.split('.')[0]}-${timestamp})`
    }

    // Create OpenAI project and service account for the company
    console.log(`[Company Signup] 🔨 Attempting to create OpenAI project for: ${finalCompanyName}`)
    let openaiProjectId: string | null = null
    let openaiServiceAccountKey: string | null = null
    
    try {
      const projectDescription = `Project for ${finalCompanyName}${signupData.industry ? ` - ${signupData.industry}` : ''}`
      console.log(`[Company Signup] 📝 Project description: ${projectDescription}`)
      
      const project = await createOpenAIProject(finalCompanyName, projectDescription)
      console.log(`[Company Signup] 📦 Received project response:`, project)
      
      if (project?.id) {
        // Encrypt the project ID before storing
        const { encrypt } = await import('./encryption')
        openaiProjectId = encrypt(project.id)
        console.log(`[Company Signup] ✅ OpenAI project created and encrypted: ${project.id} for ${finalCompanyName}`)
        
        // Create service account for the project
        console.log(`[Company Signup] 🔑 Creating service account for project: ${project.id}`)
        const serviceAccount = await createServiceAccount(project.id)
        console.log(`[Company Signup] 📦 Received service account response:`, serviceAccount)
        
        if (serviceAccount?.api_key) {
          // Encrypt the API key before storing
          openaiServiceAccountKey = encrypt(serviceAccount.api_key)
          console.log(`[Company Signup] ✅ Service account created and encrypted for project: ${project.id}`)
        } else {
          console.warn(`[Company Signup] ⚠️ Service account creation returned null for project: ${project.id}`)
        }
      } else {
        console.warn(`[Company Signup] ⚠️ OpenAI project creation returned null for ${finalCompanyName}`)
      }
    } catch (error) {
      console.error(`[Company Signup] ❌ Failed to create OpenAI project/service account for ${finalCompanyName}:`, error)
      // Continue with company creation even if OpenAI project fails
    }

    const insertCompanyQuery = `
      INSERT INTO companies (
        name, 
        status, 
        verified, 
        description_md,
        website_url,
        industry,
        size_band,
        headquarters,
        phone_number,
        primary_country,
        legal_company_name,
        tax_id_ein,
        business_registration_number,
        openai_project_id,
        openai_service_account_key,
        created_at
      )
      VALUES ($1, 'active', false, $2, $3, $4, $5::company_size, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
      RETURNING *
    `
    const newCompany = await this.query(insertCompanyQuery, [
      finalCompanyName,
      signupData.companyDescription || null,
      signupData.website || null,
      signupData.industry || null,
      sizeBand,
      headquarters,
      signupData.phone || null,
      signupData.country || null,
      signupData.legalCompanyName || null,
      signupData.taxId || null,
      signupData.registrationNumber || null,
      openaiProjectId,
      openaiServiceAccountKey,
    ]) as any[]

    if (newCompany.length === 0) {
      throw new Error('Failed to create company')
    }

    // Add domain mapping
    const insertDomainQuery = `
      INSERT INTO company_domains (company_id, domain)
      VALUES ($1::uuid, $2)
    `
    await this.query(insertDomainQuery, [newCompany[0].id, domain])

    // Create structured address if address fields are provided
    if (signupData.street && signupData.city && signupData.state && signupData.postalCode && signupData.country) {
      const insertAddressQuery = `
        INSERT INTO company_addresses (
          company_id, 
          address_type, 
          street_address, 
          city, 
          state_province, 
          postal_code, 
          country,
          is_primary
        )
        VALUES ($1::uuid, 'primary', $2, $3, $4, $5, $6, true)
      `
      await this.query(insertAddressQuery, [
        newCompany[0].id,
        signupData.street,
        signupData.city,
        signupData.state,
        signupData.postalCode,
        signupData.country
      ])
    }

    return newCompany[0]
  }

  // Create or find user
  static async findOrCreateUser(email: string, fullName: string, companyId: string, jobTitle?: string, emailVerified?: boolean) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured. Please set DATABASE_URL in your .env.local file.')
    }

    // Check if user exists
    const existingUserQuery = `
      SELECT * FROM users 
      WHERE email = $1 AND company_id = $2::uuid 
      LIMIT 1
    `
    const existingUser = await this.query(existingUserQuery, [email.toLowerCase(), companyId]) as any[]

    if (existingUser.length > 0) {
      return existingUser[0]
    }

    // Create new user
    const insertUserQuery = `
      INSERT INTO users (
        company_id, 
        email, 
        full_name, 
        status, 
        job_title,
        email_verified_at,
        created_at
      )
      VALUES ($1::uuid, $2, $3, 'active', $4, $5::timestamptz, NOW())
      RETURNING *
    `
    const emailVerifiedAt = emailVerified ? new Date().toISOString() : null
    const newUser = await this.query(insertUserQuery, [
      companyId, 
      email.toLowerCase(), 
      fullName,
      jobTitle || null,
      emailVerifiedAt
    ]) as any[]

    if (newUser.length === 0) {
      throw new Error('Failed to create user')
    }

    // Assign default role (admin for first user in company)
    const insertRoleQuery = `
      INSERT INTO user_roles (user_id, role)
      VALUES ($1::uuid, 'admin')
      ON CONFLICT DO NOTHING
    `
    await this.query(insertRoleQuery, [newUser[0].id])

    return newUser[0]
  }

  // Find user by email for login
  static async findUserByEmail(email: string) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured. Please set DATABASE_URL in your .env.local file.')
    }

    const userQuery = `
      SELECT u.*, c.*, ur.role
      FROM users u
      JOIN companies c ON u.company_id = c.id
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      WHERE u.email = $1 AND u.status = 'active'
      LIMIT 1
    `
    const user = await this.query(userQuery, [email.toLowerCase()]) as any[]

    if (user.length === 0) return null
    
    // Structure the response to match expected format
    const userData = user[0]
    return {
      ...userData,
      companies: {
        id: userData.id,
        name: userData.name,
        status: userData.status,
        verified: userData.verified
      }
    }
  }

  // Simple fetch: get user row by email (no joins), returns the latest by created_at
  static async getUserByEmailSimple(email: string) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured. Please set DATABASE_URL in your .env.local file.')
    }

    const q = `
      SELECT * FROM users
      WHERE email = $1
      ORDER BY created_at DESC
      LIMIT 1
    `
    const rows = await this.query(q, [email.toLowerCase()]) as any[]
    return rows.length > 0 ? rows[0] : null
  }

  // Create OTP challenge
  static async createOtpChallenge(email: string, purpose: 'signup' | 'login', principalType?: string, principalId?: string) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured. Please set DATABASE_URL in your .env.local file.')
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const codeHash = await this.hashCode(code)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    let insertChallengeQuery: string
    let params: any[]

    if (principalId) {
      insertChallengeQuery = `
        INSERT INTO otp_challenges (email, principal_type, principal_id, purpose, code_hash, expires_at, max_tries, tries_used, created_at)
        VALUES ($1, $2, $3::uuid, $4, $5, $6::timestamptz, 5, 0, NOW())
        RETURNING *
      `
      params = [
        email.toLowerCase(),
        principalType,
        principalId,
        purpose,
        codeHash,
        expiresAt.toISOString()
      ]
    } else {
      insertChallengeQuery = `
        INSERT INTO otp_challenges (email, principal_type, principal_id, purpose, code_hash, expires_at, max_tries, tries_used, created_at)
        VALUES ($1, $2, NULL, $3, $4, $5::timestamptz, 5, 0, NOW())
        RETURNING *
      `
      params = [
        email.toLowerCase(),
        principalType,
        purpose,
        codeHash,
        expiresAt.toISOString()
      ]
    }
    const challenge = await this.query(insertChallengeQuery, params) as any[]

    if (challenge.length === 0) {
      throw new Error('Failed to create OTP challenge')
    }

    // Log OTP for development
    if (process.env.NODE_ENV === 'development') {
      console.log('\n' + '='.repeat(50))
      console.log('🔐 OTP GENERATED FOR DEVELOPMENT')
      console.log('='.repeat(50))
      console.log(`📧 Email: ${email}`)
      console.log(`🔢 OTP: ${code}`)
      console.log(`⏰ Expires: ${expiresAt.toLocaleString()}`)
      console.log(`🎯 Purpose: ${purpose}`)
      console.log('='.repeat(50) + '\n')
    }

    return { challenge: challenge[0], code }
  }

  // Clean up expired or consumed challenges for an email
  static async cleanupExpiredChallenges(email: string) {
    if (!this.isDatabaseConfigured()) {
      return; // Silently skip if database not configured
    }

    try {
      const cleanupQuery = `
        DELETE FROM otp_challenges 
        WHERE email = $1 AND (expires_at < NOW() OR consumed_at IS NOT NULL)
      `;
      await this.query(cleanupQuery, [email.toLowerCase()]);
      console.log(`🧹 Cleaned up old OTP challenges for ${email}`);
    } catch (error) {
      console.log(`Note: Could not cleanup challenges for ${email}:`, error);
      // Don't throw error, just log it
    }
  }

  // Verify OTP challenge
  static async verifyOtpChallenge(email: string, otp: string, purpose: 'signup' | 'login') {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured. Please set DATABASE_URL in your .env.local file.')
    }

    const codeHash = await this.hashCode(otp)
    
    // Find active challenge
    const findChallengeQuery = `
      SELECT * FROM otp_challenges 
      WHERE email = $1 AND purpose = $2 AND consumed_at IS NULL AND expires_at > NOW()
      ORDER BY created_at DESC 
      LIMIT 1
    `
    const challenge = await this.query(findChallengeQuery, [email.toLowerCase(), purpose]) as any[]

    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('OTP Challenge Search:')
      console.log('Email:', email.toLowerCase())
      console.log('Purpose:', purpose)
      console.log('Found challenges:', challenge.length)
      
      // Check if any challenges exist for this email (regardless of expiry)
      const allChallengesQuery = `SELECT * FROM otp_challenges WHERE email = $1 ORDER BY created_at DESC`
      const allChallenges = await this.query(allChallengesQuery, [email.toLowerCase()]) as any[]
      console.log('All challenges for email:', allChallenges.length)
      if (allChallenges.length > 0) {
        console.log('Latest challenge:', {
          id: allChallenges[0].id,
          purpose: allChallenges[0].purpose,
          expires_at: allChallenges[0].expires_at,
          consumed_at: allChallenges[0].consumed_at,
          created_at: allChallenges[0].created_at
        })
      }
    }

    if (challenge.length === 0) {
      throw new Error('No valid OTP found for this email')
    }

    const challengeRecord = challenge[0]

    // Check if max tries exceeded
    if (challengeRecord.tries_used >= challengeRecord.max_tries) {
      throw new Error('Maximum OTP attempts exceeded')
    }

    // Verify code
    if (challengeRecord.code_hash !== codeHash) {
      // Increment tries
      const incrementTriesQuery = `
        UPDATE otp_challenges 
        SET tries_used = tries_used + 1 
        WHERE id = $1::uuid
      `
      await this.query(incrementTriesQuery, [challengeRecord.id])
      
      // Debug logging in development
      if (process.env.NODE_ENV === 'development') {
        console.log('OTP Verification Failed:')
        console.log('Expected hash:', challengeRecord.code_hash)
        console.log('Received hash:', codeHash)
        console.log('Original OTP:', otp)
      }
      
      throw new Error('Invalid OTP code')
    }

    // Mark as consumed
    const consumeOtpQuery = `
      UPDATE otp_challenges 
      SET consumed_at = NOW() 
      WHERE id = $1::uuid
    `
    await this.query(consumeOtpQuery, [challengeRecord.id])

    return challengeRecord
  }

  // Create email identity
  static async createEmailIdentity(principalType: string, principalId: string, email: string) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured. Please set DATABASE_URL in your .env.local file.')
    }

    const insertIdentityQuery = `
      INSERT INTO email_identities (principal_type, principal_id, email, is_verified, created_at)
      VALUES ($1, $2::uuid, $3, true, NOW())
      RETURNING *
    `
    const identity = await this.query(insertIdentityQuery, [principalType, principalId, email.toLowerCase()]) as any[]

    if (identity.length === 0) {
      throw new Error('Failed to create email identity')
    }

    return identity[0]
  }

  // Create session
  static async createSession(principalType: string, principalId: string) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured. Please set DATABASE_URL in your .env.local file.')
    }

    const refreshToken = this.generateToken()
    const refreshTokenHash = await this.hashCode(refreshToken)
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    const insertSessionQuery = `
      INSERT INTO sessions (principal_type, principal_id, refresh_token_hash, issued_at, expires_at, last_seen_at)
      VALUES ($1, $2::uuid, $3, NOW(), $4::timestamptz, NOW())
      RETURNING *
    `
    const session = await this.query(insertSessionQuery, [
      principalType,
      principalId,
      refreshTokenHash,
      expiresAt.toISOString()
    ]) as any[]

    if (session.length === 0) {
      throw new Error('Failed to create session')
    }

    return { session: session[0], refreshToken }
  }

  // Update user profile
  static async updateUserProfile(userId: string, data: {
    full_name?: string
    phone?: string | null
    timezone?: string
  }) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured. Please set DATABASE_URL in your .env.local file.')
    }

    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (data.full_name !== undefined) {
      updates.push(`full_name = $${paramIndex}`)
      values.push(data.full_name)
      paramIndex++
    }

    // Skip phone and timezone since they don't exist in the users table schema
    // The users table only has: id, company_id, email, full_name, status, created_at

    if (updates.length === 0) {
      throw new Error('No fields to update')
    }

    // Note: users table doesn't have updated_at column, so we skip it
    values.push(userId)

    const updateUserQuery = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}::uuid
      RETURNING *
    `

    console.log('Executing user update query:', updateUserQuery)
    console.log('With values:', values)
    
    const result = await this.query(updateUserQuery, values) as any[]
    
    console.log('Update result:', result)

    if (result.length === 0) {
      // Check if user actually exists
      const checkUserQuery = `SELECT id, email, full_name FROM users WHERE id = $1::uuid`
      const existingUser = await this.query(checkUserQuery, [userId]) as any[]
      console.log('User exists check:', existingUser)
      
      if (existingUser.length === 0) {
        throw new Error(`User with ID ${userId} not found in database`)
      } else {
        throw new Error('User update failed - no rows affected')
      }
    }

    return result[0]
  }

  // Update company information
  static async updateCompany(companyId: string, data: {
    name?: string
    website_url?: string | null
    industry?: string | null
    size_band?: string | null
    description_md?: string | null
    phone?: string | null
    legal_name?: string | null
    tax_id?: string | null
    registration_number?: string | null
  }, addressData?: {
    street?: string
    city?: string
    state?: string
    postal_code?: string
    country?: string
  }) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured. Please set DATABASE_URL in your .env.local file.')
    }

    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex}`)
      values.push(data.name)
      paramIndex++
    }

    if (data.website_url !== undefined) {
      updates.push(`website_url = $${paramIndex}`)
      values.push(data.website_url)
      paramIndex++
    }

    if (data.industry !== undefined) {
      updates.push(`industry = $${paramIndex}`)
      values.push(data.industry)
      paramIndex++
    }

    if (data.size_band !== undefined) {
      updates.push(`size_band = $${paramIndex}::company_size`)
      values.push(data.size_band)
      paramIndex++
    }

    if (data.description_md !== undefined) {
      updates.push(`description_md = $${paramIndex}`)
      values.push(data.description_md)
      paramIndex++
    }

    if (data.phone !== undefined) {
      updates.push(`phone_number = $${paramIndex}`)
      values.push(data.phone)
      paramIndex++
    }

    if (data.legal_name !== undefined) {
      updates.push(`legal_company_name = $${paramIndex}`)
      values.push(data.legal_name)
      paramIndex++
    }

    if (data.tax_id !== undefined) {
      updates.push(`tax_id_ein = $${paramIndex}`)
      values.push(data.tax_id)
      paramIndex++
    }

    if (data.registration_number !== undefined) {
      updates.push(`business_registration_number = $${paramIndex}`)
      values.push(data.registration_number)
      paramIndex++
    }

    if (updates.length === 0 && !addressData) {
      throw new Error('No fields to update')
    }

    // Note: companies table doesn't have updated_at column, so we skip it
    values.push(companyId)

    const updateCompanyQuery = `
      UPDATE companies 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}::uuid
      RETURNING *
    `

    let result: any[] = []
    
    // Update company if there are company fields to update
    if (updates.length > 0) {
      result = await this.query(updateCompanyQuery, values) as any[]
      if (result.length === 0) {
        throw new Error('Company not found')
      }
    }

    // Update or create address if address data is provided and addresses table exists
    if (addressData && Object.keys(addressData).some(key => addressData[key as keyof typeof addressData] !== undefined)) {
      // Check if addresses table exists
      let hasAddressesTable = false
      try {
        const checkTableQuery = `
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'company_addresses'
          );
        `
        const tableCheck = await this.query(checkTableQuery, []) as any[]
        hasAddressesTable = tableCheck[0]?.exists || false
      } catch (e) {
        hasAddressesTable = false
      }

      if (hasAddressesTable) {
        const addressUpdates: string[] = []
        const addressValues: any[] = []
        let addressParamIndex = 1

        if (addressData.street !== undefined) {
          addressUpdates.push(`street_address = $${addressParamIndex}`)
          addressValues.push(addressData.street)
          addressParamIndex++
        }

        if (addressData.city !== undefined) {
          addressUpdates.push(`city = $${addressParamIndex}`)
          addressValues.push(addressData.city)
          addressParamIndex++
        }

        if (addressData.state !== undefined) {
          addressUpdates.push(`state_province = $${addressParamIndex}`)
          addressValues.push(addressData.state)
          addressParamIndex++
        }

        if (addressData.postal_code !== undefined) {
          addressUpdates.push(`postal_code = $${addressParamIndex}`)
          addressValues.push(addressData.postal_code)
          addressParamIndex++
        }

        if (addressData.country !== undefined) {
          addressUpdates.push(`country = $${addressParamIndex}`)
          addressValues.push(addressData.country)
          addressParamIndex++
        }

        if (addressUpdates.length > 0) {
          addressValues.push(companyId)
          
          try {
            // Try to update existing address first
            const updateAddressQuery = `
              UPDATE company_addresses 
              SET ${addressUpdates.join(', ')}
              WHERE company_id = $${addressParamIndex}::uuid AND address_type = 'primary'
              RETURNING *
            `
            
            const addressResult = await this.query(updateAddressQuery, addressValues) as any[]
            
            // If no existing address, create one
            if (addressResult.length === 0) {
              const insertAddressQuery = `
                INSERT INTO company_addresses (company_id, address_type, street_address, city, state_province, postal_code, country)
                VALUES ($${addressParamIndex}::uuid, 'primary', $1, $2, $3, $4, $5)
              `
              await this.query(insertAddressQuery, [
                addressData.street || null,
                addressData.city || null,
                addressData.state || null,
                addressData.postal_code || null,
                addressData.country || null,
                companyId
              ])
            }
          } catch (e) {
            console.warn('Failed to update address data:', e)
            // Continue without failing the entire update
          }
        }
      } else {
        console.warn('Company addresses table does not exist, skipping address update')
      }
    }

    // Return updated company data
    if (result.length > 0) {
      return result[0]
    } else {
      // If only address was updated, fetch the company
      const fetchResult = await this.query('SELECT * FROM companies WHERE id = $1::uuid', [companyId]) as any[]
      return fetchResult[0]
    }
  }

  // Get company information by ID
  static async getCompany(companyId: string) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured. Please set DATABASE_URL in your .env.local file.')
    }

    // First try to check if addresses table exists
    let hasAddressesTable = false
    try {
      const checkTableQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'company_addresses'
        );
      `
      const tableCheck = await this.query(checkTableQuery, []) as any[]
      hasAddressesTable = tableCheck[0]?.exists || false
      console.log('🔍 Addresses table exists:', hasAddressesTable)
      
      // If table exists, check if this company has address data
      if (hasAddressesTable) {
        const checkCompanyAddressQuery = `
          SELECT * FROM company_addresses 
          WHERE company_id = $1::uuid AND address_type = 'primary'
        `
        const addressCheck = await this.query(checkCompanyAddressQuery, [companyId]) as any[]
        console.log('🔍 Company address data:', addressCheck)
        
        // Also check what company IDs exist in the address table
        const allAddressesQuery = `SELECT company_id, street_address, city FROM company_addresses LIMIT 5`
        const allAddresses = await this.query(allAddressesQuery, []) as any[]
        console.log('🔍 All company addresses (sample):', allAddresses)
        console.log('🔍 Current company ID:', companyId)
        
        // If no address data exists for this company, create a sample record
        if (addressCheck.length === 0) {
          console.log('🔧 No address data found, creating sample address for this company...')
          try {
            const insertSampleAddressQuery = `
              INSERT INTO company_addresses (company_id, address_type, street_address, city, state_province, postal_code, country)
              VALUES ($1::uuid, 'primary', 'Electronics City, Hosur Road', 'Bengaluru', 'Karnataka', '560100', 'India')
              ON CONFLICT (company_id, address_type) DO UPDATE SET
                street_address = EXCLUDED.street_address,
                city = EXCLUDED.city,
                state_province = EXCLUDED.state_province,
                postal_code = EXCLUDED.postal_code,
                country = EXCLUDED.country
            `
            await this.query(insertSampleAddressQuery, [companyId])
            console.log('✅ Sample address created for company')
          } catch (insertError) {
            console.log('⚠️ Failed to create sample address:', insertError)
          }
        }
      }
    } catch (e) {
      // If we can't check, assume no addresses table
      hasAddressesTable = false
      console.log('⚠️ Could not check if addresses table exists:', e)
    }

    let getCompanyQuery: string
    if (hasAddressesTable) {
      getCompanyQuery = `
        SELECT 
          c.*,
          a.street_address as street,
          a.city,
          a.state_province as state,
          a.postal_code,
          a.country
        FROM companies c
        LEFT JOIN company_addresses a ON a.company_id = c.id AND a.address_type = 'primary'
        WHERE c.id = $1::uuid
        LIMIT 1
      `
    } else {
      getCompanyQuery = `
        SELECT 
          c.*,
          null as street,
          null as city,
          null as state,
          null as postal_code,
          null as country
        FROM companies c
        WHERE c.id = $1::uuid
        LIMIT 1
      `
    }

    console.log('🔍 Executing query:', getCompanyQuery)
    console.log('🔍 Query parameters:', [companyId])
    
    const result = await this.query(getCompanyQuery, [companyId]) as any[]
    
    console.log('🔍 Query result:', result)

    if (result.length === 0) {
      throw new Error('Company not found')
    }

    const company = result[0]
    console.log('🔍 Company data with address fields:', {
      id: company.id,
      name: company.name,
      street: company.street,
      street_address: company.street_address,
      city: company.city,
      state: company.state,
      state_province: company.state_province,
      postal_code: company.postal_code,
      country: company.country
    })

    return company
  }

  // Update user notification preferences
  static async updateUserNotifications(userId: string, notifications: any) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured. Please set DATABASE_URL in your .env.local file.')
    }

    const updateUserQuery = `
      UPDATE users 
      SET notification_preferences = $1::jsonb
      WHERE id = $2::uuid
      RETURNING *
    `

    const result = await this.query(updateUserQuery, [JSON.stringify(notifications), userId]) as any[]

    if (result.length === 0) {
      throw new Error('User not found')
    }

    return result[0]
  }

  // Get user notification preferences
  static async getUserNotifications(userId: string) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured. Please set DATABASE_URL in your .env.local file.')
    }

    const getUserQuery = `
      SELECT notification_preferences FROM users 
      WHERE id = $1::uuid
    `

    const result = await this.query(getUserQuery, [userId]) as any[]

    if (result.length === 0) {
      throw new Error('User not found')
    }

    return result[0]
  }

  // Helper methods
  private static async hashCode(code: string): Promise<string> {
    return crypto.createHash('sha256').update(code).digest('hex')
  }

  private static generateToken(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  // =========================
  // JOBS
  // =========================
  static async getCompanyIdByName(name: string): Promise<string | null> {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured. Please set DATABASE_URL in your .env.local file.')
    }
    const q = `
      SELECT id
      FROM companies
      WHERE trim(name) ILIKE trim($1)
      LIMIT 1
    `
    const rows = (await this.query(q, [name])) as any[]
    return rows.length > 0 ? rows[0].id : null
  }

  static async createCompanyByName(name: string): Promise<string> {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured. Please set DATABASE_URL in your .env.local file.')
    }
    const q = `
      INSERT INTO companies (name, status, verified, created_at)
      VALUES (trim($1), 'active', false, NOW())
      RETURNING id
    `
    const rows = (await this.query(q, [name])) as any[]
    if (!rows || rows.length === 0) throw new Error('Failed to create company')
    return rows[0].id as string
  }

  static async listJobsByCompanyId(companyId: string, limit = 200): Promise<any[]> {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured. Please set DATABASE_URL in your .env.local file.')
    }
    const q = `
      SELECT j.id, j.title, j.location_text, j.status, j.employment_type, j.level,
             j.salary_min, j.salary_max, j.salary_period, j.auto_schedule_interview, j.created_at,
             COALESCE(u.email, j.created_by_email) as created_by_email
      FROM jobs j
      LEFT JOIN users u ON j.created_by_email = u.id::text
      WHERE j.company_id = $1::uuid
      ORDER BY j.created_at DESC
      LIMIT $2
    `
    const rows = (await this.query(q, [companyId, limit])) as any[]
    return rows
  }

  static async getJobByIdForCompany(jobId: string, companyId: string): Promise<any | null> {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured. Please set DATABASE_URL in your .env.local file.')
    }
    
    // If companyId is 'temp' or invalid, just fetch by jobId without company filter
    const isValidCompanyId = companyId && companyId !== 'temp' && companyId.length > 10
    
    const q = isValidCompanyId 
      ? `
        SELECT id, company_id, title, description_md, location_text, status, employment_type, level,
               education, years_experience_min, years_experience_max,
               technical_skills, domain_knowledge, soft_skills, languages,
               must_have_skills, nice_to_have_skills,
               duties_day_to_day, duties_strategic, stakeholders,
               decision_scope, salary_min, salary_max, salary_period, bonus_incentives,
               perks_benefits, time_off_policy, joining_timeline, travel_requirements,
               visa_requirements, auto_schedule_interview,
               created_by_email, created_at
        FROM jobs
        WHERE id = $1::uuid AND company_id = $2::uuid
        LIMIT 1
      `
      : `
        SELECT id, company_id, title, description_md, location_text, status, employment_type, level,
               education, years_experience_min, years_experience_max,
               technical_skills, domain_knowledge, soft_skills, languages,
               must_have_skills, nice_to_have_skills,
               duties_day_to_day, duties_strategic, stakeholders,
               decision_scope, salary_min, salary_max, salary_period, bonus_incentives,
               perks_benefits, time_off_policy, joining_timeline, travel_requirements,
               visa_requirements, auto_schedule_interview,
               created_by_email, created_at
        FROM jobs
        WHERE id = $1::uuid
        LIMIT 1
      `
    
    const params = isValidCompanyId ? [jobId, companyId] : [jobId]
    const rows = (await this.query(q, params)) as any[]
    return rows.length > 0 ? rows[0] : null
  }

  static async updateJobForCompany(jobId: string, companyId: string, updates: {
    title?: string | null
    description_md?: string | null
    location_text?: string | null
    status?: 'draft' | 'open' | 'on_hold' | 'closed' | 'cancelled' | null
    employment_type?: 'full_time' | 'part_time' | 'contract' | null
    level?: 'intern' | 'junior' | 'mid' | 'senior' | 'lead' | 'principal' | null
    education?: string | null
    years_experience_min?: number | null
    years_experience_max?: number | null
    technical_skills?: string[] | null
    domain_knowledge?: string[] | null
    soft_skills?: string[] | null
    languages?: string[] | null
    must_have_skills?: string[] | null
    nice_to_have_skills?: string[] | null
    duties_day_to_day?: string[] | null
    duties_strategic?: string[] | null
    stakeholders?: string[] | null
    decision_scope?: string | null
    salary_min?: number | null
    salary_max?: number | null
    salary_period?: string | null
    bonus_incentives?: string | null
    perks_benefits?: string[] | null
    time_off_policy?: string | null
    joining_timeline?: string | null
    travel_requirements?: string | null
    visa_requirements?: string | null
    auto_schedule_interview?: boolean | null
  }): Promise<any | null> {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured. Please set DATABASE_URL in your .env.local file.')
    }

    // Helper: convert JS string[] to Postgres text[] literal
    const toPgArray = (arr?: string[] | null): string | null => {
      if (!arr) return null
      if (arr.length === 0) return '{}'
      const escaped = arr.map(s => (s ?? '').replace(/"/g, '\\"')).map(s => `"${s}"`).join(',')
      return `{${escaped}}`
    }

    const sets: string[] = []
    const values: any[] = []
    let i = 1

    if (updates.title !== undefined) { sets.push(`title = $${i++}`); values.push(updates.title) }
    if (updates.description_md !== undefined) { sets.push(`description_md = $${i++}`); values.push(updates.description_md) }
    if (updates.location_text !== undefined) { sets.push(`location_text = $${i++}`); values.push(updates.location_text) }
    if (updates.status !== undefined) { sets.push(`status = $${i++}`); values.push(updates.status) }
    if (updates.employment_type !== undefined) { sets.push(`employment_type = $${i++}::employment_type`); values.push(updates.employment_type) }
    if (updates.level !== undefined) { sets.push(`level = $${i++}::job_level`); values.push(updates.level) }
    if (updates.education !== undefined) { sets.push(`education = $${i++}`); values.push(updates.education) }
    if (updates.years_experience_min !== undefined) { sets.push(`years_experience_min = $${i++}`); values.push(updates.years_experience_min) }
    if (updates.years_experience_max !== undefined) { sets.push(`years_experience_max = $${i++}`); values.push(updates.years_experience_max) }
    if (updates.technical_skills !== undefined) { sets.push(`technical_skills = $${i++}::text[]`); values.push(toPgArray(updates.technical_skills as any)) }
    if (updates.domain_knowledge !== undefined) { sets.push(`domain_knowledge = $${i++}::text[]`); values.push(toPgArray(updates.domain_knowledge as any)) }
    if (updates.soft_skills !== undefined) { sets.push(`soft_skills = $${i++}::text[]`); values.push(toPgArray(updates.soft_skills as any)) }
    if (updates.languages !== undefined) { sets.push(`languages = $${i++}::text[]`); values.push(toPgArray(updates.languages as any)) }
    if (updates.must_have_skills !== undefined) { sets.push(`must_have_skills = $${i++}::text[]`); values.push(toPgArray(updates.must_have_skills as any)) }
    if (updates.nice_to_have_skills !== undefined) { sets.push(`nice_to_have_skills = $${i++}::text[]`); values.push(toPgArray(updates.nice_to_have_skills as any)) }
    if (updates.duties_day_to_day !== undefined) { sets.push(`duties_day_to_day = $${i++}::text[]`); values.push(toPgArray(updates.duties_day_to_day as any)) }
    if (updates.duties_strategic !== undefined) { sets.push(`duties_strategic = $${i++}::text[]`); values.push(toPgArray(updates.duties_strategic as any)) }
    if (updates.stakeholders !== undefined) { sets.push(`stakeholders = $${i++}::text[]`); values.push(toPgArray(updates.stakeholders as any)) }
    if (updates.decision_scope !== undefined) { sets.push(`decision_scope = $${i++}`); values.push(updates.decision_scope) }
    if (updates.salary_min !== undefined) { sets.push(`salary_min = $${i++}`); values.push(updates.salary_min) }
    if (updates.salary_max !== undefined) { sets.push(`salary_max = $${i++}`); values.push(updates.salary_max) }
    if (updates.salary_period !== undefined) { sets.push(`salary_period = $${i++}`); values.push(updates.salary_period) }
    if (updates.bonus_incentives !== undefined) { sets.push(`bonus_incentives = $${i++}`); values.push(updates.bonus_incentives) }
    if (updates.perks_benefits !== undefined) { sets.push(`perks_benefits = $${i++}::text[]`); values.push(toPgArray(updates.perks_benefits as any)) }
    if (updates.time_off_policy !== undefined) { sets.push(`time_off_policy = $${i++}`); values.push(updates.time_off_policy) }
    if (updates.joining_timeline !== undefined) { sets.push(`joining_timeline = $${i++}`); values.push(updates.joining_timeline) }
    if (updates.travel_requirements !== undefined) { sets.push(`travel_requirements = $${i++}`); values.push(updates.travel_requirements) }
    if (updates.visa_requirements !== undefined) { sets.push(`visa_requirements = $${i++}`); values.push(updates.visa_requirements) }
    if (updates.auto_schedule_interview !== undefined) { 
      // Explicitly cast to boolean for PostgreSQL
      const boolValue = updates.auto_schedule_interview === true
      sets.push(`auto_schedule_interview = $${i++}::boolean`); 
      values.push(boolValue)
      console.log('🔧 [DB] Setting auto_schedule_interview to:', boolValue, 'type:', typeof boolValue)
    }

    if (sets.length === 0) return null

    // updated_at may not exist in schema; only set if column exists. We'll skip to avoid errors.
    values.push(jobId)
    values.push(companyId)

    const q = `
      UPDATE jobs
      SET ${sets.join(', ')}
      WHERE id = $${i++}::uuid AND company_id = $${i}::uuid
      RETURNING id, company_id, title, location_text, employment_type, level,
                salary_min, salary_max, salary_period, auto_schedule_interview,
                created_by_email, created_at
    `
    const rows = (await this.query(q, values)) as any[]
    return rows.length > 0 ? rows[0] : null
  }

  static async deleteJobForCompany(jobId: string, companyId: string): Promise<string | null> {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured. Please set DATABASE_URL in your .env.local file.')
    }
    const q = `DELETE FROM jobs WHERE id = $1::uuid AND company_id = $2::uuid RETURNING id`
    const rows = (await this.query(q, [jobId, companyId])) as any[]
    return rows.length > 0 ? rows[0].id : null
  }

  static async companyExists(companyId: string): Promise<boolean> {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured. Please set DATABASE_URL in your .env.local file.')
    }
    const q = `SELECT 1 FROM companies WHERE id = $1::uuid LIMIT 1`
    const rows = (await this.query(q, [companyId])) as any[]
    return rows.length > 0
  }

  static async userExists(userId: string): Promise<boolean> {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured. Please set DATABASE_URL in your .env.local file.')
    }
    // Accept either UUID or email to avoid invalid UUID cast errors
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)
    const q = isUuid
      ? `SELECT 1 FROM users WHERE id = $1::uuid LIMIT 1`
      : `SELECT 1 FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`
    const rows = (await this.query(q, [userId])) as any[]
    return rows.length > 0
  }

  static async createJob(input: {
    company_id?: string | null
    company_name?: string | null
    title: string
    description_md?: string | null
    location_text: string
    employment_type: 'full_time' | 'part_time' | 'contract'
    level?: 'intern' | 'junior' | 'mid' | 'senior' | 'lead' | 'principal' | null
    education?: string | null
    years_experience_min?: number | null
    years_experience_max?: number | null
    technical_skills?: string[] | null
    domain_knowledge?: string[] | null
    soft_skills?: string[] | null
    languages?: string[] | null
    must_have_skills?: string[] | null
    nice_to_have_skills?: string[] | null
    duties_day_to_day?: string[] | null
    duties_strategic?: string[] | null
    stakeholders?: string[] | null
    decision_scope?: string | null
    salary_min?: number | null
    salary_max?: number | null
    salary_period?: 'monthly' | 'yearly' | 'weekly' | 'daily' | null
    salary_currency?: string | null
    bonus_incentives?: string | null
    perks_benefits?: string[] | null
    time_off_policy?: string | null
    joining_timeline?: string | null
    travel_requirements?: string | null
    visa_requirements?: string | null
    is_public?: boolean | null
    created_by_email?: string | null
    screening_questions?: Record<string, any> | null
    status?: 'draft' | 'open' | 'on_hold' | 'closed' | 'cancelled' | null
    auto_schedule_interview?: boolean | null
    resume_screening_enabled?: boolean | null
  }) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured. Please set DATABASE_URL in your .env.local file.')
    }

    // Helper: convert JS string[] to Postgres text[] literal safely (e.g., '{"a","b"}')
    const toPgArray = (arr?: string[] | null): string | null => {
      if (!arr || arr.length === 0) return '{}'
      const norm = arr.map((raw) => {
        let s = String(raw ?? '')
        // Strip surrounding quotes if present (common when client sends already-quoted labels)
        if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
          s = s.slice(1, -1)
        }
        // Normalize whitespace
        s = s.trim()
        // Escape backslashes first, then quotes per Postgres array literal rules
        s = s.replace(/\\/g, '\\\\')
        s = s.replace(/"/g, '\\"')
        return `"${s}"`
      })
      return `{${norm.join(',')}}`
    }

    const q = `
      INSERT INTO jobs (
        company_id, company_name, title, description_md, location_text, employment_type, level, education,
        years_experience_min, years_experience_max,
        technical_skills, domain_knowledge, soft_skills, languages,
        must_have_skills, nice_to_have_skills,
        duties_day_to_day, duties_strategic, stakeholders,
        decision_scope, salary_min, salary_max, salary_period, salary_currency, bonus_incentives,
        perks_benefits, time_off_policy, joining_timeline, travel_requirements, visa_requirements,
        status, auto_schedule_interview, is_public, created_by_email, screening_questions, resume_screening_enabled
      )
      VALUES (
        $1::uuid, $2, $3, $4, $5, $6::employment_type, $7::job_level, $8,
        $9, $10,
        $11::text[], $12::text[], $13::text[], $14::text[],
        $15::text[], $16::text[],
        $17::text[], $18::text[], $19::text[],
        $20, $21, $22, $23::salary_period, $24, $25,
        $26::text[], $27, $28, $29, $30,
        COALESCE($31, 'open'), COALESCE($32, true), COALESCE($33, true), $34, $35::jsonb, COALESCE($36, false)
      )
      RETURNING id
    `

    const params = [
      input.company_id ?? null,
      input.company_name ?? null,
      input.title,
      input.description_md ?? null,
      input.location_text,
      input.employment_type,
      input.level ?? null,
      input.education ?? null,
      input.years_experience_min ?? null,
      input.years_experience_max ?? null,
      toPgArray(input.technical_skills),
      toPgArray(input.domain_knowledge),
      toPgArray(input.soft_skills),
      toPgArray(input.languages),
      toPgArray(input.must_have_skills),
      toPgArray(input.nice_to_have_skills),
      toPgArray(input.duties_day_to_day),
      toPgArray(input.duties_strategic),
      toPgArray(input.stakeholders),
      input.decision_scope ?? null,
      input.salary_min ?? null,
      input.salary_max ?? null,
      input.salary_period ?? null,
      input.salary_currency ?? 'INR', // $24 - salary_currency (defaults to 'INR')
      input.bonus_incentives ?? null,
      toPgArray(input.perks_benefits),
      input.time_off_policy ?? null,
      input.joining_timeline ?? null,
      input.travel_requirements ?? null,
      input.visa_requirements ?? null,
      input.status ?? 'open', // $31 - status (defaults to 'open')
      input.auto_schedule_interview ?? true, // $32
      input.is_public ?? true, // $33
      input.created_by_email ?? null, // $34
      input.screening_questions ? JSON.stringify(input.screening_questions) : null, // $35
      input.resume_screening_enabled ?? false, // $36 - resume_screening_enabled (defaults to false)
    ]

    const rows = (await this.query(q, params)) as any[]
    if (!rows || rows.length === 0) {
      throw new Error('Failed to create job')
    }
    return rows[0]
  }

  static async createJobRounds(jobId: string, rounds: Array<{ seq: number; name: string; duration_minutes: number }>) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured. Please set DATABASE_URL in your .env.local file.')
    }
    if (!rounds || rounds.length === 0) return

    // Insert rounds one-by-one for simplicity in mock/neon
    const q = `
      INSERT INTO job_rounds (job_id, seq, name, duration_minutes)
      VALUES ($1::uuid, $2, $3, $4)
      ON CONFLICT (job_id, seq) DO NOTHING
    `
    for (const r of rounds) {
      await this.query(q, [jobId, r.seq, r.name, r.duration_minutes])
    }
  }

  // Fetch job_rounds for a job (including ids) ordered by seq
  static async getJobRoundsByJobId(jobId: string): Promise<Array<{ id: string; job_id: string; seq: number; name: string; duration_minutes: number }>> {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured. Please set DATABASE_URL in your .env.local file.')
    }
    const q = `
      SELECT id, job_id, seq, name, duration_minutes
      FROM job_rounds
      WHERE job_id = $1::uuid
      ORDER BY seq ASC
    `
    const rows = (await this.query(q, [jobId])) as any[]
    return rows as any
  }

  // NEW FORMAT for questions:
  // { questions: [{ id, question, criterion, weight }, ...] }
  // 
  // OLD FORMAT (backward compatible):
  // { questions: ["q1", "q2"], criteria: ["Technical Skills", ...] }
  //
  // This method accepts either:
  // 1. questionsWithWeight: Array<{ id, question, criterion, weight }> - NEW format
  // 2. questions: string[], criteria: string[] - OLD format (will be transformed)
  static async updateJobRoundConfiguration(
    jobId: string, 
    roundName: string, 
    questions: string[] | Array<{ id: number; question: string; criterion: string; weight: 'high' | 'medium' | 'low' }>, 
    criteria?: string[]
  ): Promise<void> {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured. Please set DATABASE_URL in your .env.local file.')
    }
    
    // Detect format: new (objects with id/question/criterion/weight) or old (string array)
    const isNewFormat = Array.isArray(questions) && questions.length > 0 && 
      typeof questions[0] === 'object' && 'question' in questions[0] && 'criterion' in questions[0]
    
    let configuration: string
    
    if (isNewFormat) {
      // NEW FORMAT: Store questions as array of objects with id, question, criterion, weight
      const questionsWithWeight = questions as Array<{ id: number; question: string; criterion: string; weight: 'high' | 'medium' | 'low' }>
      console.log('📝 Saving NEW FORMAT configuration for:', { jobId, roundName, questionsCount: questionsWithWeight.length })
      
      configuration = JSON.stringify({
        questions: questionsWithWeight
      })
    } else {
      // OLD FORMAT: Transform string array to new format with weight mapping
      const oldQuestions = questions as string[]
      const oldCriteria = criteria || []
      
      console.log('📝 Transforming OLD FORMAT to NEW FORMAT for:', { jobId, roundName, questionsCount: oldQuestions.length, criteriaCount: oldCriteria.length })
      
      // Rule-based weight mapping (deterministic)
      const CRITERION_WEIGHT_MAP: Record<string, 'high' | 'medium' | 'low'> = {
        'Technical Skills': 'high',
        'Problem Solving': 'high',
        'Communication': 'medium',
        'Adaptability / Learning': 'medium',
        'Culture Fit': 'low',
        'Experience': 'medium',
        'Teamwork / Collaboration': 'medium',
        'Leadership': 'medium',
        'Work Ethic / Reliability': 'medium'
      }
      
      // Transform old format to new format
      const transformedQuestions = oldQuestions.map((q, idx) => {
        const criterion = oldCriteria[idx % oldCriteria.length] || 'Technical Skills'
        return {
          id: idx + 1,
          question: q,
          criterion: criterion,
          weight: CRITERION_WEIGHT_MAP[criterion] || 'medium'
        }
      })
      
      configuration = JSON.stringify({
        questions: transformedQuestions
      })
    }
    
    // First check if the round exists
    const checkQ = `SELECT id, name, seq FROM job_rounds WHERE job_id = $1::uuid`
    const existingRounds = await this.query(checkQ, [jobId]) as any[]
    console.log('🔍 Existing rounds in DB:', existingRounds.map(r => `${r.name} (seq:${r.seq})`))
    
    // Find the round's seq number or use 1 as default
    const existingRound = existingRounds.find(r => r.name === roundName)
    const seq = existingRound ? existingRound.seq : 1
    
    console.log(`💾 ${existingRound ? 'Updating' : 'Inserting'} round:`, roundName, 'seq:', seq)
    
    // Use INSERT ... ON CONFLICT to handle both insert and update
    const q = `
      INSERT INTO job_rounds (job_id, seq, name, duration_minutes, configuration)
      VALUES ($1::uuid, $2, $3, 30, $4::jsonb)
      ON CONFLICT (job_id, seq) 
      DO UPDATE SET 
        configuration = EXCLUDED.configuration,
        name = EXCLUDED.name,
        duration_minutes = 30
      RETURNING id, name
    `
    const result = await this.query(q, [jobId, seq, roundName, configuration]) as any[]
    
    if (result.length === 0) {
      console.error('❌ Failed to save round:', roundName)
    } else {
      // Get the count from the parsed configuration
      const parsedConfig = JSON.parse(configuration)
      const questionCount = parsedConfig.questions?.length || 0
      console.log('✅ Saved round:', result[0].name, 'with', questionCount, 'questions in NEW format')
      
      // Also store individual questions in the questions table
      try {
        const companyId = await this.getCompanyIdForJob(jobId)
        console.log('💾 Storing individual questions in questions table...')
        
        const questionsArray = parsedConfig.questions || []
        for (let i = 0; i < questionsArray.length; i++) {
          const q = questionsArray[i]
          const questionText = typeof q === 'string' ? q : q.question
          const criterion = typeof q === 'object' ? q.criterion : (criteria?.[i % (criteria?.length || 1)] || 'Technical Skills')
          const weight = typeof q === 'object' ? q.weight : 'medium'
          
          await this.createQuestion({
            company_id: companyId,
            text_md: questionText,
            difficulty: 'medium',
            category: criterion.toLowerCase().includes('technical') ? 'technical' : 'behavioral',
            metadata: {
              roundName: roundName,
              jobId: jobId,
              sequence: i + 1,
              criterion: criterion,
              weight: weight
            }
          })
        }
        console.log('✅ Stored', questionsArray.length, 'individual questions in questions table')
      } catch (error) {
        console.error('⚠️ Failed to store individual questions:', error)
      }
    }
  }

  // Create round_agents rows for a specific job_round_id
  static async createRoundAgents(jobRoundId: string, agents: Array<{ agent_type: string; skill_weights?: any; config?: any }>): Promise<void> {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured. Please set DATABASE_URL in your .env.local file.')
    }
    if (!agents || agents.length === 0) return
    const q = `
      INSERT INTO round_agents (job_round_id, agent_type, skill_weights, config)
      VALUES ($1::uuid, $2, $3::jsonb, $4::jsonb)
    `
    for (const a of agents) {
      await this.query(q, [jobRoundId, a.agent_type, JSON.stringify(a.skill_weights || {}), JSON.stringify(a.config || {})])
    }
  }

  // List rounds with their linked agents for a job
  static async listRoundsWithAgents(jobId: string): Promise<Array<{
    round_id: string
    seq: number
    name: string
    duration_minutes: number
    agents: Array<{ id: string; agent_type: string; skill_weights: any; config: any; created_at: string }>
  }>> {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured. Please set DATABASE_URL in your .env.local file.')
    }
    const rounds = await this.getJobRoundsByJobId(jobId)
    if (!rounds || rounds.length === 0) return []

    const qAgents = `
      SELECT ra.id, ra.job_round_id, ra.agent_type, ra.skill_weights, ra.config, ra.created_at
      FROM round_agents ra
      WHERE ra.job_round_id = ANY($1::uuid[])
      ORDER BY ra.created_at ASC
    `
    const roundIds = rounds.map(r => r.id)
    const rows = (await this.query(qAgents, [roundIds])) as any[]
    const byRound = new Map<string, any[]>()
    for (const row of rows) {
      const list = byRound.get(row.job_round_id) || []
      list.push({ id: row.id, agent_type: row.agent_type, skill_weights: row.skill_weights || {}, config: row.config || {}, created_at: row.created_at })
      byRound.set(row.job_round_id, list)
    }
    return rounds.map(r => ({
      round_id: r.id,
      seq: r.seq,
      name: r.name,
      duration_minutes: r.duration_minutes,
      agents: byRound.get(r.id) || [],
    }))
  }

  // Update questions list on a specific round_agent by writing to config.questions as JSONB
  static async updateRoundAgentQuestions(roundAgentId: string, questions: Array<{ id?: string; text: string; type?: string; linkedSkills?: string[]; expectedAnswer?: string }>): Promise<void> {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured. Please set DATABASE_URL in your .env.local file.')
    }
    const q = `
      UPDATE round_agents
         SET config = jsonb_set(
           COALESCE(config, '{}'::jsonb),
           '{questions}',
           $2::jsonb,
           true
         )
       WHERE id = $1::uuid
    `
    await this.query(q, [roundAgentId, JSON.stringify(questions || [])])
  }

  // Get company_id for a given job
  static async getCompanyIdForJob(jobId: string): Promise<string | null> {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured. Please set DATABASE_URL in your .env.local file.')
    }
    const q = `SELECT company_id FROM jobs WHERE id = $1::uuid LIMIT 1`
    const rows = (await this.query(q, [jobId])) as any[]
    return rows && rows.length > 0 ? rows[0].company_id : null
  }

  // Create a question row; returns its id
  static async createQuestion(input: { company_id: string | null; text_md: string; difficulty?: string | null; category?: string | null; metadata?: any }): Promise<string> {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured. Please set DATABASE_URL in your .env.local file.')
    }
    const q = `
      INSERT INTO questions (company_id, text_md, difficulty, category, metadata)
      VALUES ($1::uuid, $2, $3, $4, $5::jsonb)
      RETURNING id
    `
    const params = [
      input.company_id ?? null,
      input.text_md,
      input.difficulty ?? null,
      input.category ?? null,
      JSON.stringify(input.metadata ?? {})
    ]
    const rows = (await this.query(q, params)) as any[]
    if (!rows || rows.length === 0) throw new Error('Failed to insert question')
    return rows[0].id
  }

  // Replace all agent_questions for a round_agent with the provided sequence
  static async setAgentQuestions(roundAgentId: string, companyId: string | null, questions: Array<{ text: string; type?: string; linkedSkills?: string[]; expectedAnswer?: string }>): Promise<void> {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured. Please set DATABASE_URL in your .env.local file.')
    }
    // Clear existing links
    const del = `DELETE FROM agent_questions WHERE round_agent_id = $1::uuid`
    await this.query(del, [roundAgentId])
    if (!questions || questions.length === 0) return
    // Insert questions and links with seq = index+1
    let seq = 1
    for (const q of questions) {
      const qid = await this.createQuestion({ company_id: companyId, text_md: q.text, category: q.type ?? null, metadata: { linkedSkills: q.linkedSkills ?? [], expectedAnswer: q.expectedAnswer ?? null } })
      const link = `
        INSERT INTO agent_questions (round_agent_id, question_id, seq)
        VALUES ($1::uuid, $2::uuid, $3)
        ON CONFLICT (round_agent_id, seq) DO UPDATE SET question_id = EXCLUDED.question_id
      `
      await this.query(link, [roundAgentId, qid, seq])
      seq++
    }
  }

  // =========================
  // FILES AND CANDIDATES
  // =========================
  
  // Create file record
  static async createFile(data: {
    storage_key: string
    content_type?: string
    size_bytes?: bigint
    company_id?: string
  }) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured. Please set DATABASE_URL in your .env.local file.')
    }

    const q = `
      INSERT INTO files (storage_key, content_type, size_bytes, company_id, created_at)
      VALUES ($1, $2, $3, $4::uuid, NOW())
      RETURNING *
    `
    const rows = await this.query(q, [
      data.storage_key,
      data.content_type || null,
      data.size_bytes || null,
      data.company_id || null
    ]) as any[]

    if (rows.length === 0) {
      throw new Error('Failed to create file record')
    }

    return rows[0]
  }

  // Create or update candidate
  static async upsertCandidate(data: {
    email: string
    first_name?: string
    last_name?: string
    full_name?: string
    resume_file_id?: string
    resume_url?: string
    resume_name?: string
    resume_size?: string
    resume_type?: string
  }) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured. Please set DATABASE_URL in your .env.local file.')
    }

    // Check if candidate exists
    const existingQuery = `SELECT * FROM candidates WHERE email = $1 LIMIT 1`
    const existing = await this.query(existingQuery, [data.email.toLowerCase()]) as any[]

    if (existing.length > 0) {
      // Update existing candidate
      const updateQuery = `
        UPDATE candidates 
        SET resume_file_id = $2::uuid, resume_url = $3, resume_name = $4, 
            resume_size = $5, resume_type = $6
        WHERE email = $1
        RETURNING *
      `
      const updated = await this.query(updateQuery, [
        data.email.toLowerCase(),
        data.resume_file_id || null,
        data.resume_url || null,
        data.resume_name || null,
        data.resume_size || null,
        data.resume_type || null
      ]) as any[]

      return updated[0]
    } else {
      // Create new candidate - construct full_name from first_name and last_name if not provided
      const fullName = data.full_name || `${data.first_name || 'Unknown'} ${data.last_name || 'Candidate'}`.trim()
      
      const insertQuery = `
        INSERT INTO candidates (
          email, full_name, resume_file_id, created_at
        )
        VALUES ($1, $2, $3::uuid, NOW())
        RETURNING *
      `
      const created = await this.query(insertQuery, [
        data.email.toLowerCase(),
        fullName,
        data.resume_file_id || null
      ]) as any[]

      return created[0]
    }
  }

  // ===========================
  // MESSAGE OPERATIONS
  // ===========================

  // Get messages by category for a company
  static async getMessagesByCategory(companyId: string, category: 'interview' | 'new_job' | 'general', includeDrafts: boolean = false) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured')
    }

    const query = `
      SELECT 
        id,
        sender_user_id,
        recipient_email,
        recipient_name,
        category,
        subject,
        content,
        status,
        sent_at,
        delivered_at,
        read_at,
        metadata,
        created_at,
        updated_at
      FROM messages 
      WHERE company_id = $1::uuid 
        AND category = $2::message_category
        AND ($3::boolean = true OR status != 'draft'::message_status)
      ORDER BY sent_at DESC, created_at DESC
      LIMIT 50
    `
    
    return await this.query(query, [companyId, category, includeDrafts]) as any[]
  }

  // Create a new message
  static async createMessage(data: {
    companyId: string
    senderUserId?: string
    recipientEmail: string
    recipientName?: string
    category: 'interview' | 'new_job' | 'general'
    subject: string
    content: string
    status?: 'draft' | 'sent' | 'delivered' | 'read' | 'failed'
    threadId?: string
    metadata?: any
  }) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured')
    }

    const query = `
      INSERT INTO messages (
        company_id,
        sender_user_id,
        recipient_email,
        recipient_name,
        category,
        subject,
        content,
        status,
        thread_id,
        metadata,
        sent_at,
        created_at,
        updated_at
      ) VALUES (
        $1::uuid,
        $2::uuid,
        $3,
        $4,
        $5::message_category,
        $6,
        $7,
        $8::message_status,
        $9::uuid,
        $10::jsonb,
        CASE WHEN $8::message_status = 'sent'::message_status THEN NOW() ELSE NULL END,
        NOW(),
        NOW()
      )
      RETURNING *
    `

    const result = await this.query(query, [
      data.companyId,
      data.senderUserId || null,
      data.recipientEmail,
      data.recipientName || null,
      data.category,
      data.subject,
      data.content,
      data.status || 'draft',
      data.threadId || null,
      JSON.stringify(data.metadata || {})
    ]) as any[]

    if (!result || result.length === 0) {
      console.error('createMessage insert returned no rows')
      throw new Error('Failed to create message')
    }

    return result[0]
  }

  // Send a message (update status to sent)
  static async sendMessage(messageId: string) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured')
    }

    const query = `
      UPDATE messages 
      SET 
        status = 'sent',
        sent_at = NOW(),
        updated_at = NOW()
      WHERE id = $1::uuid
      RETURNING *
    `

    const result = await this.query(query, [messageId]) as any[]
    return result[0]
  }

  // Get message templates by category
  static async getMessageTemplates(companyId: string, category?: 'interview' | 'new_job' | 'general') {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured')
    }

    let query = `
      SELECT 
        id,
        name,
        category,
        subject_template,
        content_template,
        is_active,
        created_at,
        updated_at
      FROM message_templates 
      WHERE company_id = $1::uuid 
        AND is_active = true
    `
    
    const params = [companyId]
    
    if (category) {
      query += ` AND category = $2::message_category`
      params.push(category)
    }
    
    query += ` ORDER BY name ASC`

    return await this.query(query, params) as any[]
  }

  // Create message template
  static async createMessageTemplate(data: {
    companyId: string
    name: string
    category: 'interview' | 'new_job' | 'general'
    subjectTemplate: string
    contentTemplate: string
    createdBy?: string
  }) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured')
    }

    const query = `
      INSERT INTO message_templates (
        company_id,
        name,
        category,
        subject_template,
        content_template,
        created_by,
        created_at,
        updated_at
      ) VALUES (
        $1::uuid,
        $2,
        $3::message_category,
        $4,
        $5,
        $6::uuid,
        NOW(),
        NOW()
      )
      RETURNING *
    `

    const result = await this.query(query, [
      data.companyId,
      data.name,
      data.category,
      data.subjectTemplate,
      data.contentTemplate,
      data.createdBy || null
    ]) as any[]

    return result[0]
  }

  // Get message threads for a company
  static async getMessageThreads(companyId: string, category?: 'interview' | 'new_job' | 'general') {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured')
    }

    let query = `
      SELECT 
        id,
        category,
        participant_email,
        participant_name,
        subject,
        last_message_at,
        message_count,
        is_archived,
        metadata,
        created_at,
        updated_at
      FROM message_threads 
      WHERE company_id = $1::uuid 
        AND is_archived = false
    `
    
    const params = [companyId]
    
    if (category) {
      query += ` AND category = $2`
      params.push(category)
    }
    
    query += ` ORDER BY last_message_at DESC`

    return await this.query(query, params) as any[]
  }

  // =========================
  // INTERVIEWS
  // =========================
  
  // Get interviews with candidate and job information
  static async getInterviews(companyId?: string, jobId?: string) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured. Please set DATABASE_URL in your .env.local file.')
    }

    let query = `
      SELECT 
        i.id,
        i.status as interview_status,
        i.started_at,
        i.completed_at,
        i.mode,
        i.metadata,
        ar.id as application_round_id,
        ar.status as round_status,
        ar.recommendation,
        ar.summary,
        a.id as application_id,
        a.job_id,
        a.status as application_status,
        a.first_name,
        a.last_name,
        a.email,
        a.phone,
        c.first_name as candidate_first_name,
        c.last_name as candidate_last_name,
        c.email as candidate_email,
        c.phone as candidate_phone,
        j.title as job_title,
        j.company_id,
        e.overall_score,
        e.status as evaluation_status,
        e.recommendation as evaluation_recommendation
      FROM interviews i
      JOIN application_rounds ar ON i.application_round_id = ar.id
      JOIN applications a ON ar.application_id = a.id
      JOIN candidates c ON a.candidate_id = c.id
      JOIN jobs j ON a.job_id = j.id
      LEFT JOIN evaluations e ON i.id = e.interview_id
      WHERE 1=1
    `

    const params: any[] = []
    let paramIndex = 1

    // Filter by company if provided
    if (companyId) {
      query += ` AND j.company_id = $${paramIndex}::uuid`
      params.push(companyId)
      paramIndex++
    }

    // Filter by job if provided
    if (jobId && jobId !== 'all') {
      query += ` AND a.job_id = $${paramIndex}::uuid`
      params.push(jobId)
      paramIndex++
    }

    query += ` ORDER BY COALESCE(i.started_at, i.completed_at) DESC NULLS LAST`

    const rows = await this.query(query, params) as any[]
    
    // Transform the data to match the expected format
    return rows.map(row => {
      // Use application data first, fallback to candidate data
      const candidateName = row.first_name && row.last_name 
        ? `${row.first_name} ${row.last_name}`.trim()
        : row.candidate_first_name && row.candidate_last_name 
        ? `${row.candidate_first_name} ${row.candidate_last_name}`.trim()
        : 'Unknown Candidate'

      const email = row.email || row.candidate_email || ''
      const phone = row.phone || row.candidate_phone || ''

      // Map interview status to expected format
      let status: 'Completed' | 'Scheduled' | 'Pending' | 'Cancelled' = 'Pending'
      switch (row.interview_status) {
        case 'success':
          status = 'Completed'
          break
        case 'in_progress':
          status = 'Scheduled'
          break
        case 'awaiting':
          status = 'Pending'
          break
        case 'failed':
        case 'expired':
          status = 'Cancelled'
          break
        default:
          status = 'Pending'
      }

      // Score is stored as 0-100, display as is
      let interviewScore: number | undefined = undefined
      let result: 'Pass' | 'Fail' | undefined = undefined
      
      if (row.overall_score !== null && row.overall_score !== undefined) {
        interviewScore = Math.round(parseFloat(row.overall_score))
      }
      
      // Use status from evaluations table if available, otherwise calculate from score
      if (row.evaluation_status) {
        result = row.evaluation_status as 'Pass' | 'Fail'
      } else if (interviewScore !== undefined) {
        result = interviewScore >= 65 ? 'Pass' : 'Fail'
      }

      return {
        id: row.id,
        jobId: row.job_id,
        applicationId: row.application_id,
        candidateName,
        appliedJD: row.job_title || 'Unknown Position',
        email,
        phone,
        status,
        interviewDate: row.started_at ? new Date(row.started_at).toISOString().split('T')[0] : undefined,
        interviewScore,
        result,
        feedback: row.summary || undefined
      }
    })
  }

  // Get hiring bucket counts for recommended candidates
  static async getHiringBucketCounts(companyId: string, jobId?: string) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured')
    }

    let query = `
      SELECT 
        COUNT(*) FILTER (WHERE a.hiring_status = 'sent_to_manager') as sent_to_manager,
        COUNT(*) FILTER (WHERE a.hiring_status = 'offer_extended') as offer_extended,
        COUNT(*) FILTER (WHERE a.hiring_status = 'offer_accepted') as offer_accepted,
        COUNT(*) FILTER (WHERE a.hiring_status IN ('rejected_withdraw', 'rejected', 'withdrawn')) as rejected_withdraw,
        COUNT(*) FILTER (WHERE a.hiring_status = 'hired') as hired,
        COUNT(*) as total
      FROM applications a
      JOIN application_rounds ar ON ar.application_id = a.id
      JOIN interviews i ON i.application_round_id = ar.id
      LEFT JOIN evaluations e ON e.interview_id = i.id
      JOIN jobs j ON a.job_id = j.id
      WHERE j.company_id = $1::uuid
        AND i.status = 'success'
        AND (e.status = 'Pass' OR e.overall_score >= 65)
    `

    const params: any[] = [companyId]
    
    if (jobId && jobId !== 'all') {
      query += ` AND a.job_id = $2::uuid`
      params.push(jobId)
    }

    const result = await this.query(query, params) as any[]
    const row = result[0] || {}

    return {
      total: parseInt(row.total) || 0,
      sentToManager: parseInt(row.sent_to_manager) || 0,
      offerExtended: parseInt(row.offer_extended) || 0,
      offerAccepted: parseInt(row.offer_accepted) || 0,
      rejectedWithdraw: parseInt(row.rejected_withdraw) || 0,
      hired: parseInt(row.hired) || 0
    }
  }

  // Update hiring status for an application
  static async updateHiringStatus(applicationId: string, hiringStatus: string) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured')
    }

    const validStatuses = ['sent_to_manager', 'offer_extended', 'offer_accepted', 'rejected_withdraw', 'hired']
    if (!validStatuses.includes(hiringStatus)) {
      throw new Error(`Invalid hiring status. Must be one of: ${validStatuses.join(', ')}`)
    }

    const query = `
      UPDATE applications 
      SET hiring_status = $1
      WHERE id = $2::uuid
      RETURNING id, hiring_status
    `
    
    const result = await this.query(query, [hiringStatus, applicationId]) as any[]
    return result[0] || null
  }
  
  // =========================
  // BILLING & USAGE TRACKING
  // ALL PRICING FROM .env FILE ONLY - NO OpenAI API, NO external sources
  // =========================

  // Get current pricing from .env file
  static getPricing() {
    return {
      // Cost per CV parsing (COST_PER_CV_PARSING)
      cvParsePrice: parseFloat(process.env.COST_PER_CV_PARSING || '0.50'),
      // Cost per 10 questions (COST_PER_10_QUESTIONS)
      questionPricePer10: parseFloat(process.env.COST_PER_10_QUESTIONS || '0.10'),
      // Cost per minute of video (COST_PER_VIDEO_MINUTE)
      videoPricePerMin: parseFloat(process.env.COST_PER_VIDEO_MINUTE || '0.10'),
      // Recharge amount
      rechargeAmount: parseFloat(process.env.RECHARGE_AMOUNT || '100.00')
    }
  }

  // Get company billing info
  static async getCompanyBilling(companyId: string) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured')
    }

    const query = `
      SELECT * FROM company_billing
      WHERE company_id = $1::uuid
    `
    const result = await this.query(query, [companyId]) as any[]
    const billing = result[0] || null

    if (!billing) {
      return null
    }

    // Calculate real-time spending from usage tables
    const currentMonthStart = new Date()
    currentMonthStart.setDate(1)
    currentMonthStart.setHours(0, 0, 0, 0)
    const currentMonthStartISO = currentMonthStart.toISOString()

    // Get current month spending - use CAST to ensure proper decimal handling
    const currentMonthQuery = `
      SELECT
        COALESCE(SUM(CAST(cost AS DECIMAL(10,2))), 0) as total
      FROM (
        SELECT cost FROM cv_parsing_usage
        WHERE company_id = $1::uuid AND created_at >= $2::timestamptz
        UNION ALL
        SELECT cost FROM question_generation_usage
        WHERE company_id = $1::uuid AND created_at >= $2::timestamptz
        UNION ALL
        SELECT cost FROM video_interview_usage
        WHERE company_id = $1::uuid AND created_at >= $2::timestamptz
      ) as all_usage
    `
    const currentMonthResult = await this.query(currentMonthQuery, [companyId, currentMonthStartISO]) as any[]
    const currentMonthSpent = parseFloat(currentMonthResult[0]?.total || '0')

    console.log(`💰 [Billing] Current month (${currentMonthStart.toISOString()}) spending for ${companyId}: $${currentMonthSpent.toFixed(2)}`)

    // Get total spending (all time)
    const totalQuery = `
      SELECT 
        COALESCE(SUM(CAST(cost AS DECIMAL(10,2))), 0) as total
      FROM (
        SELECT cost FROM cv_parsing_usage WHERE company_id = $1::uuid
        UNION ALL
        SELECT cost FROM question_generation_usage WHERE company_id = $1::uuid
        UNION ALL
        SELECT cost FROM video_interview_usage WHERE company_id = $1::uuid
      ) as all_usage
    `
    const totalResult = await this.query(totalQuery, [companyId]) as any[]
    const totalSpent = parseFloat(totalResult[0]?.total || '0')

    console.log(`💰 [Billing] Total spending (all-time) for ${companyId}: $${totalSpent.toFixed(2)}`)

    // Update billing object with calculated values
    billing.current_month_spent = currentMonthSpent
    billing.total_spent = totalSpent

    return billing
  }

  // Check if company is in trial and if usage qualifies for free credit
  static async checkTrialEligibility(companyId: string, jobId?: string): Promise<{
    isInTrial: boolean
    isFreeUsage: boolean
    reason?: string
  }> {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured')
    }

    const billing = await this.getCompanyBilling(companyId)
    
    if (!billing || billing.billing_status !== 'trial') {
      return { isInTrial: false, isFreeUsage: false, reason: 'Not in trial' }
    }

    // If no trial JD set yet, this is the first JD - it's free
    if (!billing.trial_jd_id && jobId) {
      return { isInTrial: true, isFreeUsage: true, reason: 'First trial JD' }
    }

    // If this is the trial JD and interview count <= 1, it's free
    if (billing.trial_jd_id === jobId && billing.trial_interview_count <= 1) {
      return { isInTrial: true, isFreeUsage: true, reason: 'Trial JD usage' }
    }

    // Trial has ended
    return { isInTrial: true, isFreeUsage: false, reason: 'Trial limit reached' }
  }

  // Set trial JD (when first JD is created)
  static async setTrialJD(companyId: string, jobId: string) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured')
    }

    const query = `
      UPDATE company_billing
      SET trial_jd_id = $2::uuid, updated_at = NOW()
      WHERE company_id = $1::uuid AND trial_jd_id IS NULL
      RETURNING *
    `
    const result = await this.query(query, [companyId, jobId]) as any[]
    return result[0] || null
  }

  // Increment trial interview count
  static async incrementTrialInterviewCount(companyId: string) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured')
    }

    const query = `
      UPDATE company_billing
      SET trial_interview_count = trial_interview_count + 1, updated_at = NOW()
      WHERE company_id = $1::uuid
      RETURNING *
    `
    const result = await this.query(query, [companyId]) as any[]
    return result[0] || null
  }

  // End trial and require billing setup
  static async endTrial(companyId: string) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured')
    }

    const query = `
      UPDATE company_billing
      SET 
        billing_status = 'active',
        trial_ended_at = NOW(),
        updated_at = NOW()
      WHERE company_id = $1::uuid AND billing_status = 'trial'
      RETURNING *
    `
    const result = await this.query(query, [companyId]) as any[]
    return result[0] || null
  }

  // Record usage and handle charging
  static async recordUsage(params: {
    companyId: string
    jobId: string
    usageType: 'cv_parse' | 'jd_questions' | 'video_minutes'
    quantity: number
    metadata?: any
  }) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured')
    }

    const { companyId, jobId, usageType, quantity, metadata = {} } = params
    const pricing = this.getPricing()

    // Check trial eligibility
    const trial = await this.checkTrialEligibility(companyId, jobId)

    let cost = 0
    let entryType: string
    let description: string
    let unitPrice = 0

    // Calculate cost based on usage type (all pricing from .env)
    switch (usageType) {
      case 'cv_parse':
        unitPrice = pricing.cvParsePrice
        cost = trial.isFreeUsage ? 0 : quantity * unitPrice
        entryType = trial.isFreeUsage ? 'TRIAL_CREDIT' : 'CV_PARSE'
        description = `CV parsing (${quantity} CVs)`
        break
      case 'jd_questions':
        // Cost per 10 questions from .env (COST_PER_10_QUESTIONS)
        const questionCount = metadata.questionCount || quantity
        unitPrice = pricing.questionPricePer10 / 10 // per question
        cost = trial.isFreeUsage ? 0 : (questionCount / 10) * pricing.questionPricePer10
        entryType = trial.isFreeUsage ? 'TRIAL_CREDIT' : 'JD_QUESTIONS'
        description = `JD question generation (${questionCount} questions)`
        break
      case 'video_minutes':
        unitPrice = pricing.videoPricePerMin
        cost = trial.isFreeUsage ? 0 : quantity * unitPrice
        entryType = trial.isFreeUsage ? 'TRIAL_CREDIT' : 'VIDEO_MINUTES'
        description = `Video interview (${quantity} minutes)`
        break
      default:
        throw new Error(`Unknown usage type: ${usageType}`)
    }

    // If not free and cost > 0, check wallet and auto-recharge if needed
    if (!trial.isFreeUsage && cost > 0) {
      const billing = await this.getCompanyBilling(companyId)
      
      if (!billing) {
        throw new Error('Billing not initialized for company')
      }

      if (billing.billing_status === 'trial') {
        throw new Error('Trial has ended. Please set up billing to continue.')
      }

      if (billing.billing_status === 'past_due') {
        throw new Error('Account past due. Please update payment method.')
      }

      // Check monthly spend cap
      if (billing.monthly_spend_cap && 
          billing.current_month_spent + cost > billing.monthly_spend_cap) {
        throw new Error(`Monthly spend cap of $${billing.monthly_spend_cap} reached`)
      }

      // Auto-recharge if wallet insufficient
      if (billing.wallet_balance < cost) {
        if (!billing.auto_recharge_enabled) {
          throw new Error(`Insufficient wallet balance. Current: $${billing.wallet_balance}, Required: $${cost}`)
        }

        // Auto-recharge
        await this.autoRecharge(companyId)
      }

      // Deduct from wallet
      await this.deductFromWallet(companyId, cost)
    }

    // Record in usage ledger
    await this.addLedgerEntry({
      companyId,
      jobId,
      entryType,
      description,
      quantity,
      unitPrice,
      amount: cost,
      metadata
    })

    // Update job_usage table
    await this.updateJobUsage(jobId, usageType, quantity, cost, metadata)

    return { cost, entryType }
  }

  // Auto-recharge wallet
  static async autoRecharge(companyId: string) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured')
    }

    const pricing = this.getPricing()
    const rechargeAmount = pricing.rechargeAmount

    // Create invoice for recharge
    const invoice = await this.createInvoice({
      companyId,
      description: 'Wallet Auto-Recharge',
      subtotal: rechargeAmount,
      total: rechargeAmount,
      lineItems: [{
        description: 'Wallet Top-up',
        quantity: 1,
        unitPrice: rechargeAmount,
        amount: rechargeAmount
      }]
    })

    // In production, this would call Stripe/PayPal API
    // For now, simulate successful payment
    const paymentSuccess = true

    if (paymentSuccess) {
      // Update wallet
      const addQuery = `
        UPDATE company_billing
        SET 
          wallet_balance = wallet_balance + $2,
          current_month_spent = current_month_spent + $2,
          total_spent = total_spent + $2,
          updated_at = NOW()
        WHERE company_id = $1::uuid
        RETURNING *
      `
      await this.query(addQuery, [companyId, rechargeAmount])

      // Mark invoice as paid
      await this.markInvoicePaid(invoice.id)

      // Record ledger entry
      const billing = await this.getCompanyBilling(companyId)
      await this.addLedgerEntry({
        companyId,
        entryType: 'AUTO_RECHARGE',
        description: `Wallet auto-recharge`,
        quantity: 1,
        unitPrice: rechargeAmount,
        amount: -rechargeAmount, // Negative because it's a credit
        invoiceId: invoice.id,
        balanceBefore: billing.wallet_balance - rechargeAmount,
        balanceAfter: billing.wallet_balance
      })

      return invoice
    } else {
      throw new Error('Payment failed')
    }
  }

  // Deduct from wallet
  static async deductFromWallet(companyId: string, amount: number) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured')
    }

    const query = `
      UPDATE company_billing
      SET 
        wallet_balance = wallet_balance - $2,
        updated_at = NOW()
      WHERE company_id = $1::uuid AND wallet_balance >= $2
      RETURNING *
    `
    const result = await this.query(query, [companyId, amount]) as any[]
    
    if (result.length === 0) {
      throw new Error('Insufficient wallet balance')
    }

    return result[0]
  }

  // Charge for CV parsing (with wallet deduction and ledger entry)
  static async chargeForCVParsing(params: {
    companyId: string
    jobId: string
    cost: number
    candidateId?: string
    fileName?: string
  }) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured')
    }

    const { companyId, jobId, cost, candidateId, fileName } = params

    console.log(`\n${'='.repeat(70)}`)
    console.log('💳 [CV PARSING CHARGE] Starting wallet deduction...')
    console.log('📋 Company ID:', companyId)
    console.log('💼 Job ID:', jobId)
    console.log('💰 Amount to charge: $' + cost.toFixed(2))
    console.log(`${'='.repeat(70)}`)

    // Get current billing
    const billing = await this.getCompanyBilling(companyId)
    
    if (!billing) {
      throw new Error('Billing not initialized for company')
    }

    // Check if company is in trial
    if (billing.billing_status === 'trial') {
      console.log('✅ [CV PARSING CHARGE] Company in trial - no charge applied')
      console.log(`${'='.repeat(70)}\n`)
      return { charged: false, reason: 'trial' }
    }

    if (billing.billing_status === 'past_due') {
      throw new Error('Account past due. Please update payment method.')
    }

    // Check monthly spend cap
    if (billing.monthly_spend_cap && 
        billing.current_month_spent + cost > billing.monthly_spend_cap) {
      throw new Error(`Monthly spend cap of $${billing.monthly_spend_cap} reached`)
    }

    // Check wallet balance
    if (billing.wallet_balance < cost) {
      if (!billing.auto_recharge_enabled) {
        throw new Error(`Insufficient wallet balance. Current: $${billing.wallet_balance}, Required: $${cost}`)
      }

      // Auto-recharge
      console.log('⚡ [CV PARSING CHARGE] Auto-recharging wallet...')
      await this.autoRecharge(companyId)
    }

    // Deduct from wallet
    const balanceBefore = billing.wallet_balance
    await this.deductFromWallet(companyId, cost)
    const balanceAfter = balanceBefore - cost

    console.log('✅ [CV PARSING CHARGE] Wallet deducted successfully')
    console.log('💰 Balance before: $' + balanceBefore.toFixed(2))
    console.log('💰 Balance after: $' + balanceAfter.toFixed(2))

    // Add ledger entry
    await this.addLedgerEntry({
      companyId,
      jobId,
      entryType: 'CV_PARSING',
      description: `CV parsing${candidateId ? ` for candidate ${candidateId}` : ''}${fileName ? ` (${fileName})` : ''}`,
      amount: cost,
      balanceBefore,
      balanceAfter
    })

    console.log('📝 [CV PARSING CHARGE] Ledger entry created')
    console.log('🎉 [CV PARSING CHARGE] Billing completed successfully!')
    console.log(`${'='.repeat(70)}\n`)

    return { charged: true, balanceBefore, balanceAfter }
  }

  // Add ledger entry
  static async addLedgerEntry(params: {
    companyId: string
    jobId?: string
    entryType: string
    description: string
    quantity?: number
    unitPrice?: number
    amount: number
    invoiceId?: string
    metadata?: any
    balanceBefore?: number
    balanceAfter?: number
  }) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured')
    }

    const billing = await this.getCompanyBilling(params.companyId)
    const balanceBefore = params.balanceBefore ?? billing.wallet_balance
    const balanceAfter = params.balanceAfter ?? (balanceBefore - params.amount)

    const query = `
      INSERT INTO usage_ledger (
        company_id,
        job_id,
        entry_type,
        description,
        quantity,
        unit_price,
        amount,
        balance_before,
        balance_after,
        invoice_id,
        metadata,
        created_at
      ) VALUES (
        $1::uuid,
        $2::uuid,
        $3::ledger_entry_type,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10::uuid,
        $11::jsonb,
        NOW()
      )
      RETURNING *
    `

    const result = await this.query(query, [
      params.companyId,
      params.jobId || null,
      params.entryType,
      params.description,
      params.quantity || null,
      params.unitPrice || null,
      params.amount,
      balanceBefore,
      balanceAfter,
      params.invoiceId || null,
      JSON.stringify(params.metadata || {})
    ]) as any[]

    return result[0]
  }

  // Update job usage
  static async updateJobUsage(
    jobId: string,
    usageType: 'cv_parse' | 'jd_questions' | 'video_minutes',
    quantity: number,
    cost: number,
    metadata?: any
  ) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured')
    }

    // Get job to find company_id
    const jobQuery = `SELECT company_id FROM jobs WHERE id = $1::uuid`
    const jobResult = await this.query(jobQuery, [jobId]) as any[]
    
    if (jobResult.length === 0) {
      throw new Error('Job not found')
    }

    const companyId = jobResult[0].company_id

    // Upsert job_usage
    let updateField = ''
    let costField = ''

    switch (usageType) {
      case 'cv_parse':
        updateField = 'cv_parsing_count = cv_parsing_count + $3'
        costField = 'cv_parsing_cost = cv_parsing_cost + $4'
        break
      case 'jd_questions':
        updateField = `
          jd_question_tokens_in = jd_question_tokens_in + $3,
          jd_question_tokens_out = jd_question_tokens_out + ${metadata?.tokensOut || 0}
        `
        costField = 'jd_questions_cost = jd_questions_cost + $4'
        break
      case 'video_minutes':
        updateField = 'video_minutes = video_minutes + $3'
        costField = 'video_cost = video_cost + $4'
        break
    }

    const query = `
      INSERT INTO job_usage (job_id, company_id, ${usageType === 'jd_questions' ? 'jd_question_tokens_in' : usageType === 'cv_parse' ? 'cv_parsing_count' : 'video_minutes'}, total_cost, created_at, updated_at)
      VALUES ($1::uuid, $2::uuid, $3, $4, NOW(), NOW())
      ON CONFLICT (job_id)
      DO UPDATE SET
        ${updateField},
        ${costField},
        total_cost = total_cost + $4,
        updated_at = NOW()
      RETURNING *
    `

    const result = await this.query(query, [
      jobId,
      companyId,
      usageType === 'jd_questions' ? (metadata?.tokensIn || 0) : quantity,
      cost
    ]) as any[]

    return result[0]
  }

  // Mark invoice as paid
  static async markInvoicePaid(invoiceId: string) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured')
    }

    const query = `
      UPDATE invoices
      SET 
        status = 'paid',
        paid_at = NOW(),
        updated_at = NOW()
      WHERE id = $1::uuid
      RETURNING *
    `

    const result = await this.query(query, [invoiceId]) as any[]
    return result[0]
  }

  // Get usage ledger for company
  static async getUsageLedger(companyId: string, options?: {
    jobId?: string
    startDate?: Date
    endDate?: Date
    entryType?: string
    limit?: number
  }) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured')
    }

    let query = `
      SELECT 
        ul.*,
        j.title as job_title
      FROM usage_ledger ul
      LEFT JOIN jobs j ON ul.job_id = j.id
      WHERE ul.company_id = $1::uuid
    `

    const params: any[] = [companyId]
    let paramIndex = 2

    if (options?.jobId) {
      query += ` AND ul.job_id = $${paramIndex}::uuid`
      params.push(options.jobId)
      paramIndex++
    }

    if (options?.startDate) {
      query += ` AND ul.created_at >= $${paramIndex}::timestamptz`
      params.push(options.startDate.toISOString())
      paramIndex++
    }

    if (options?.endDate) {
      query += ` AND ul.created_at <= $${paramIndex}::timestamptz`
      params.push(options.endDate.toISOString())
      paramIndex++
    }

    if (options?.entryType) {
      query += ` AND ul.entry_type = $${paramIndex}::ledger_entry_type`
      params.push(options.entryType)
      paramIndex++
    }

    query += ` ORDER BY ul.created_at DESC`

    if (options?.limit) {
      query += ` LIMIT $${paramIndex}`
      params.push(options.limit)
    }

    return await this.query(query, params) as any[]
  }

  // Get job usage summary
  static async getJobUsageSummary(companyId: string, jobId?: string) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured')
    }

    let query = `
      SELECT 
        ju.*,
        j.title as job_title,
        j.status as job_status
      FROM job_usage ju
      JOIN jobs j ON ju.job_id = j.id
      WHERE ju.company_id = $1::uuid
    `

    const params: any[] = [companyId]

    if (jobId) {
      query += ` AND ju.job_id = $2::uuid`
      params.push(jobId)
    }

    query += ` ORDER BY ju.updated_at DESC`

    return await this.query(query, params) as any[]
  }

  // Get invoices for company
  static async getInvoices(companyId: string, options?: {
    status?: string
    limit?: number
  }) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured')
    }

    let query = `
      SELECT * FROM invoices
      WHERE company_id = $1::uuid
    `

    const params: any[] = [companyId]
    let paramIndex = 2

    if (options?.status) {
      query += ` AND status = $${paramIndex}::invoice_status`
      params.push(options.status)
      paramIndex++
    }

    query += ` ORDER BY created_at DESC`

    if (options?.limit) {
      query += ` LIMIT $${paramIndex}`
      params.push(options.limit)
    }

    return await this.query(query, params) as any[]
  }

  // Update payment method
  static async updatePaymentMethod(companyId: string, paymentData: {
    provider: 'stripe' | 'paypal'
    paymentMethodId: string
    last4?: string
    brand?: string
    exp?: string
  }) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured')
    }

    const query = `
      UPDATE company_billing
      SET 
        payment_provider = $2::payment_provider,
        payment_method_id = $3,
        payment_method_last4 = $4,
        payment_method_brand = $5,
        payment_method_exp = $6,
        updated_at = NOW()
      WHERE company_id = $1::uuid
      RETURNING *
    `

    const result = await this.query(query, [
      companyId,
      paymentData.provider,
      paymentData.paymentMethodId,
      paymentData.last4 || null,
      paymentData.brand || null,
      paymentData.exp || null
    ]) as any[]

    return result[0]
  }

  // Update billing settings
  static async updateBillingSettings(companyId: string, settings: {
    autoRechargeEnabled?: boolean
    monthlySpendCap?: number | null
  }) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured')
    }

    const updates: string[] = []
    const params: any[] = [companyId]
    let paramIndex = 2

    if (settings.autoRechargeEnabled !== undefined) {
      updates.push(`auto_recharge_enabled = $${paramIndex}`)
      params.push(settings.autoRechargeEnabled)
      paramIndex++
    }

    if (settings.monthlySpendCap !== undefined) {
      updates.push(`monthly_spend_cap = $${paramIndex}`)
      params.push(settings.monthlySpendCap)
      paramIndex++
    }

    if (updates.length === 0) {
      throw new Error('No settings to update')
    }

    updates.push('updated_at = NOW()')

    const query = `
      UPDATE company_billing
      SET ${updates.join(', ')}
      WHERE company_id = $1::uuid
      RETURNING *
    `

    const result = await this.query(query, params) as any[]
    return result[0]
  }

  // Get all users by company ID with their roles
  static async getUsersByCompanyId(companyId: string) {
    const query = `
      SELECT 
        u.id,
        u.email,
        u.full_name,
        u.created_at,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object('role', r.role)
          ) FILTER (WHERE r.role IS NOT NULL),
          '[]'
        ) as roles
      FROM users u
      LEFT JOIN user_roles r ON u.id = r.user_id
      WHERE u.company_id = $1::uuid
      GROUP BY u.id, u.email, u.full_name, u.created_at
      ORDER BY u.created_at DESC
    `
    const result = await this.query(query, [companyId]) as any[]
    return result
  }

  // Find or create demo company
  static async findOrCreateDemoCompany() {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured. Please set DATABASE_URL in your .env.local file.')
    }

    const demoEmail = 'admin@hire-genai.com'
    const demoCompanyName = 'HireGenAI Demo Company'

    // First, check if demo company exists
    const findCompanyQuery = `
      SELECT c.* FROM companies c
      JOIN company_domains cd ON c.id = cd.company_id
      WHERE cd.domain = 'hire-genai.com'
      LIMIT 1
    `
    const existingCompany = await this.query(findCompanyQuery) as any[]

    if (existingCompany.length > 0) {
      return existingCompany[0]
    }

    // Create demo company if it doesn't exist
    const insertCompanyQuery = `
      INSERT INTO companies (name, status, verified, created_at)
      VALUES ($1, 'active', true, NOW())
      RETURNING *
    `
    const newCompany = await this.query(insertCompanyQuery, [demoCompanyName]) as any[]

    if (newCompany.length === 0) {
      throw new Error('Failed to create demo company')
    }

    // Add domain mapping for demo company
    const insertDomainQuery = `
      INSERT INTO company_domains (company_id, domain)
      VALUES ($1::uuid, 'hire-genai.com')
    `
    await this.query(insertDomainQuery, [newCompany[0].id])

    // Create admin user for demo company if doesn't exist
    const findAdminQuery = `
      SELECT * FROM users WHERE email = $1 AND company_id = $2::uuid
    `
    const existingAdmin = await this.query(findAdminQuery, [demoEmail, newCompany[0].id]) as any[]

    if (existingAdmin.length === 0) {
      const insertAdminQuery = `
        INSERT INTO users (
          company_id, 
          email, 
          full_name, 
          status, 
          job_title,
          email_verified_at,
          created_at
        )
        VALUES ($1::uuid, $2, 'Demo Admin', 'active', 'System Administrator', NOW(), NOW())
        RETURNING *
      `
      const adminUser = await this.query(insertAdminQuery, [newCompany[0].id, demoEmail]) as any[]

      // Assign admin role
      const insertRoleQuery = `
        INSERT INTO user_roles (user_id, role)
        VALUES ($1::uuid, 'admin')
        ON CONFLICT DO NOTHING
      `
      await this.query(insertRoleQuery, [adminUser[0].id])
    }

    return newCompany[0]
  }

  // Add user to demo company as member
  static async addUserToDemoCompany(email: string, fullName?: string) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured. Please set DATABASE_URL in your .env.local file.')
    }

    // Get or create demo company
    const demoCompany = await this.findOrCreateDemoCompany()

    // Check if user already exists in demo company
    const findUserQuery = `
      SELECT * FROM users WHERE email = $1 AND company_id = $2::uuid
    `
    const existingUser = await this.query(findUserQuery, [email.toLowerCase(), demoCompany.id]) as any[]

    if (existingUser.length > 0) {
      // User already exists in demo company, keep their existing role
      return {
        user: existingUser[0],
        company: demoCompany,
        isNewUser: false
      }
    }

    // Create new user in demo company
    const userName = fullName || email.split('@')[0]
    const insertUserQuery = `
      INSERT INTO users (
        company_id, 
        email, 
        full_name, 
        status, 
        job_title,
        email_verified_at,
        created_at
      )
      VALUES ($1::uuid, $2, $3, 'active', 'Demo User', NOW(), NOW())
      RETURNING *
    `
    const newUser = await this.query(insertUserQuery, [demoCompany.id, email.toLowerCase(), userName]) as any[]

    if (newUser.length === 0) {
      throw new Error('Failed to create demo user')
    }

    // Assign recruiter role for demo users (member is not in enum, using recruiter as limited role)
    const insertRoleQuery = `
      INSERT INTO user_roles (user_id, role)
      VALUES ($1::uuid, 'recruiter')
      ON CONFLICT (user_id) DO NOTHING
    `
    await this.query(insertRoleQuery, [newUser[0].id])

    return {
      user: newUser[0],
      company: demoCompany,
      isNewUser: true
    }
  }

  // Check if user is registered under a specific company by email domain
  static async findUserByEmailAndCompanyDomain(email: string) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured. Please set DATABASE_URL in your .env.local file.')
    }

    const domain = email.split('@')[1]
    
    const userQuery = `
      SELECT u.*, c.*, ur.role
      FROM users u
      JOIN companies c ON u.company_id = c.id
      JOIN company_domains cd ON c.id = cd.company_id
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      WHERE u.email = $1 AND cd.domain = $2 AND u.status = 'active'
      LIMIT 1
    `
    const user = await this.query(userQuery, [email.toLowerCase(), domain]) as any[]

    if (user.length === 0) return null
    
    // Structure the response to match expected format
    const userData = user[0]
    return {
      ...userData,
      companies: {
        id: userData.id,
        name: userData.name,
        status: userData.status,
        verified: userData.verified
      }
    }
  }

  // Get current pricing from .env file ONLY
  static async getCurrentPricing() {
    // All pricing comes from .env file - no database, no OpenAI API
    const { getBillingPrices } = await import('./config')
    const prices = getBillingPrices()
    
    return {
      cv_parse_price: prices.cvParsingCost,
      question_price_per_10: prices.questionGenerationCostPer10,
      video_price_per_min: prices.videoInterviewCostPerMinute,
      pricing_source: 'env-config'
    }
  }

  // Record CV parsing usage with REAL OpenAI cost
  static async recordCVParsingUsage(data: {
    companyId: string
    jobId: string
    candidateId?: string
    fileId?: string
    fileSizeKb?: number
    parseSuccessful?: boolean
    successRate?: number
  }) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured')
    }

    console.log('\n' + '='.repeat(70))
    console.log('🎯 [CV PARSING] Starting billing calculation...')
    console.log('📋 Company ID:', data.companyId)
    console.log('💼 Job ID:', data.jobId)
    console.log('👤 Candidate ID:', data.candidateId || 'N/A')
    console.log('📄 File Size:', data.fileSizeKb || 0, 'KB')
    console.log('='.repeat(70))

    // Get pricing from .env file ONLY (no OpenAI API, no external sources)
    const { getCVParsingCost } = await import('./config')
    const cvCost = getCVParsingCost()
    
    console.log('💰 [CV PARSING] Using .env pricing: $' + cvCost.toFixed(2) + ' (COST_PER_CV_PARSING)')
    
    const finalCost = cvCost
    
    const query = `
      INSERT INTO cv_parsing_usage (
        company_id, job_id, candidate_id, file_id, file_size_kb,
        parse_successful, unit_price, cost, success_rate,
        openai_base_cost, pricing_source, tokens_used, profit_margin_percent,
        created_at
      )
      VALUES (
        $1::uuid, $2::uuid, $3::uuid, $4::uuid, $5,
        $6, $7, $8, $9,
        $10, $11, $12, $13,
        NOW()
      )
      RETURNING *
    `

    const result = await this.query(query, [
      data.companyId,
      data.jobId,
      data.candidateId || null,
      data.fileId || null,
      data.fileSizeKb || 0,
      data.parseSuccessful !== false,
      cvCost, // unit_price from .env
      finalCost, // cost (same as unit_price, no markup)
      data.successRate || null,
      cvCost, // openai_base_cost (using env value, no OpenAI API)
      'env-config', // pricing_source - from .env file
      null, // tokens_used - not applicable for env pricing
      0 // profit_margin_percent - no margin
    ]) as any[]

    console.log('💾 [CV PARSING] Cost stored in database successfully')
    console.log('💰 Final Cost: $' + finalCost.toFixed(2))
    console.log('🏷️  Source: .env (COST_PER_CV_PARSING)')

    // ========================================
    // WALLET DEDUCTION & LEDGER ENTRY
    // ========================================
    try {
      console.log('\n💳 [WALLET] Starting wallet deduction...')
      
      // Get current billing info
      const billing = await this.getCompanyBilling(data.companyId)
      if (!billing) {
        console.log('⚠️  [WALLET] Billing not initialized, skipping wallet deduction')
      } else {
        const balanceBefore = parseFloat(billing.wallet_balance)
        console.log('💰 [WALLET] Current Balance: $' + balanceBefore.toFixed(2))
        console.log('💸 [WALLET] Amount to Deduct: $' + finalCost.toFixed(2))

        // Check if wallet has sufficient balance
        if (balanceBefore < finalCost) {
          console.log('⚠️  [WALLET] Insufficient balance!')
          
          // Check if auto-recharge is enabled
          if (billing.auto_recharge_enabled) {
            console.log('🔄 [WALLET] Auto-recharge enabled, attempting recharge...')
            try {
              await this.autoRecharge(data.companyId)
              console.log('✅ [WALLET] Auto-recharge successful!')
            } catch (rechargeError: any) {
              console.log('❌ [WALLET] Auto-recharge failed:', rechargeError.message)
              throw new Error('Insufficient wallet balance and auto-recharge failed')
            }
          } else {
            console.log('❌ [WALLET] Auto-recharge disabled, cannot proceed')
            throw new Error(`Insufficient wallet balance. Current: $${balanceBefore.toFixed(2)}, Required: $${finalCost.toFixed(2)}`)
          }
        }

        // Deduct from wallet
        const deductQuery = `
          UPDATE company_billing
          SET 
            wallet_balance = wallet_balance - $2,
            current_month_spent = current_month_spent + $2,
            total_spent = total_spent + $2,
            updated_at = NOW()
          WHERE company_id = $1::uuid AND wallet_balance >= $2
          RETURNING wallet_balance as new_balance
        `
        const deductResult = await this.query(deductQuery, [data.companyId, finalCost]) as any[]
        
        if (deductResult.length === 0) {
          throw new Error('Wallet deduction failed - insufficient balance')
        }

        const balanceAfter = parseFloat(deductResult[0].new_balance)
        console.log('✅ [WALLET] Deduction successful!')
        console.log('💰 [WALLET] New Balance: $' + balanceAfter.toFixed(2))

        // Create ledger entry for audit trail
        const ledgerQuery = `
          INSERT INTO usage_ledger (
            company_id, job_id, entry_type, description,
            quantity, unit_price, amount,
            balance_before, balance_after,
            reference_id, metadata, created_at
          ) VALUES (
            $1::uuid, $2::uuid, $3::ledger_entry_type, $4,
            $5, $6, $7,
            $8, $9,
            $10::uuid, $11::jsonb, NOW()
          )
          RETURNING *
        `
        
        await this.query(ledgerQuery, [
          data.companyId,
          data.jobId,
          'CV_PARSE',
          `CV parsing - ${data.candidateId ? 'Candidate' : 'File'} processed`,
          1, // quantity (1 CV)
          finalCost, // unit price
          finalCost, // amount
          balanceBefore,
          balanceAfter,
          result[0].id, // reference to cv_parsing_usage record
          JSON.stringify({
            file_size_kb: data.fileSizeKb,
            parse_successful: data.parseSuccessful !== false,
            pricing_source: 'env-config'
          })
        ])

        console.log('📝 [LEDGER] Entry created successfully')
      }
    } catch (walletError: any) {
      console.log('❌ [WALLET] Error during wallet operation:', walletError.message)
      // Don't throw - allow CV parsing to succeed even if wallet deduction fails
      // This prevents blocking the user's workflow
      console.log('⚠️  [WALLET] CV parsing succeeded but wallet was not charged')
    }

    console.log('🎉 [CV PARSING] Billing calculation completed successfully!')
    console.log('='.repeat(70) + '\n')
    return result[0]
  }

  // Record question generation usage (supports draft jobs)
  static async recordQuestionGenerationUsage(data: {
    companyId: string
    jobId?: string | null
    draftJobId?: string | null
    promptTokens: number
    completionTokens: number
    questionCount: number
    modelUsed?: string
  }) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured')
    }

    const isDraft = !data.jobId && data.draftJobId
    const totalTokens = data.promptTokens + data.completionTokens

    console.log('\n' + '='.repeat(70))
    console.log('🎯 [QUESTION GENERATION] Starting billing calculation...')
    console.log('📋 Company ID:', data.companyId)
    console.log('💼 Job ID:', data.jobId || 'NULL (draft)')
    console.log('🔖 Draft ID:', data.draftJobId || 'N/A')
    console.log('📝 Status:', isDraft ? 'DRAFT (will reconcile when job saved)' : 'PERSISTED')
    console.log('❓ Questions Generated:', data.questionCount)
    console.log('='.repeat(70))

    // Get pricing from .env file ONLY (no OpenAI API, no external sources)
    const { getQuestionGenerationCostPer10 } = await import('./config')
    const costPer10Questions = getQuestionGenerationCostPer10()
    const finalCost = (data.questionCount / 10) * costPer10Questions
    
    console.log('💰 [QUESTION GENERATION] Using .env pricing: $' + costPer10Questions.toFixed(2) + ' per 10 questions (COST_PER_10_QUESTIONS)')
    console.log('💵 [QUESTION GENERATION] Total cost: $' + finalCost.toFixed(2) + ' for ' + data.questionCount + ' questions')

    const query = `
      INSERT INTO question_generation_usage (
        company_id, job_id, draft_job_id, prompt_tokens, completion_tokens,
        total_tokens, question_count, cost, model_used, created_at
      )
      VALUES (
        $1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9, NOW()
      )
      RETURNING *
    `

    const result = await this.query(query, [
      data.companyId,
      data.jobId || null,
      data.draftJobId || null,
      data.promptTokens,
      data.completionTokens,
      totalTokens,
      data.questionCount,
      finalCost,
      data.modelUsed || 'gpt-4o'
    ]) as any[]

    console.log('💾 [QUESTION GENERATION] Cost stored in database successfully')
    console.log('🆔 Record ID:', result[0]?.id || 'N/A')
    console.log('💰 Final Cost: $' + finalCost.toFixed(4) + ' (no profit margin applied)')
    console.log('💵 Rate: $' + costPer10Questions.toFixed(2) + ' per 10 questions')
    console.log('❓ Questions: ' + data.questionCount)

    // ========================================
    // WALLET DEDUCTION & LEDGER ENTRY
    // ========================================
    // Only deduct from wallet if this is a real job (not draft)
    if (data.jobId && !isDraft) {
      try {
        console.log('\n💳 [WALLET] Starting wallet deduction...')
        
        // Get current billing info
        const billing = await this.getCompanyBilling(data.companyId)
        if (!billing) {
          console.log('⚠️  [WALLET] Billing not initialized, skipping wallet deduction')
        } else {
          const balanceBefore = parseFloat(billing.wallet_balance)
          console.log('💰 [WALLET] Current Balance: $' + balanceBefore.toFixed(2))
          console.log('💸 [WALLET] Amount to Deduct: $' + finalCost.toFixed(2))

          // Check if wallet has sufficient balance
          if (balanceBefore < finalCost) {
            console.log('⚠️  [WALLET] Insufficient balance!')
            
            // Check if auto-recharge is enabled
            if (billing.auto_recharge_enabled) {
              console.log('🔄 [WALLET] Auto-recharge enabled, attempting recharge...')
              try {
                await this.autoRecharge(data.companyId)
                console.log('✅ [WALLET] Auto-recharge successful!')
              } catch (rechargeError: any) {
                console.log('❌ [WALLET] Auto-recharge failed:', rechargeError.message)
                throw new Error('Insufficient wallet balance and auto-recharge failed')
              }
            } else {
              console.log('❌ [WALLET] Auto-recharge disabled, cannot proceed')
              throw new Error(`Insufficient wallet balance. Current: $${balanceBefore.toFixed(2)}, Required: $${finalCost.toFixed(2)}`)
            }
          }

          // Deduct from wallet
          const deductQuery = `
            UPDATE company_billing
            SET 
              wallet_balance = wallet_balance - $2,
              current_month_spent = current_month_spent + $2,
              total_spent = total_spent + $2,
              updated_at = NOW()
            WHERE company_id = $1::uuid AND wallet_balance >= $2
            RETURNING wallet_balance as new_balance
          `
          const deductResult = await this.query(deductQuery, [data.companyId, finalCost]) as any[]
          
          if (deductResult.length === 0) {
            throw new Error('Wallet deduction failed - insufficient balance')
          }

          const balanceAfter = parseFloat(deductResult[0].new_balance)
          console.log('✅ [WALLET] Deduction successful!')
          console.log('💰 [WALLET] New Balance: $' + balanceAfter.toFixed(2))

          // Create ledger entry for audit trail
          const ledgerQuery = `
            INSERT INTO usage_ledger (
              company_id, job_id, entry_type, description,
              quantity, unit_price, amount,
              balance_before, balance_after,
              reference_id, metadata, created_at
            ) VALUES (
              $1::uuid, $2::uuid, $3::ledger_entry_type, $4,
              $5, $6, $7,
              $8, $9,
              $10::uuid, $11::jsonb, NOW()
            )
            RETURNING *
          `
          
          await this.query(ledgerQuery, [
            data.companyId,
            data.jobId,
            'JD_QUESTIONS',
            `Question generation - ${data.questionCount} questions for job`,
            data.questionCount, // quantity
            costPer10Questions / 10, // unit price per question
            finalCost, // amount
            balanceBefore,
            balanceAfter,
            result[0].id, // reference to question_generation_usage record
            JSON.stringify({
              prompt_tokens: data.promptTokens,
              completion_tokens: data.completionTokens,
              total_tokens: totalTokens,
              model_used: data.modelUsed || 'gpt-4o'
            })
          ])

          console.log('📝 [LEDGER] Entry created successfully')
        }
      } catch (walletError: any) {
        console.log('❌ [WALLET] Error during wallet operation:', walletError.message)
        // Don't throw - allow question generation to succeed even if wallet deduction fails
        console.log('⚠️  [WALLET] Question generation succeeded but wallet was not charged')
      }
    } else if (isDraft) {
      console.log('📝 [WALLET] Skipping wallet deduction for draft job (will charge when job is saved)')
    }

    console.log('🎉 [QUESTION GENERATION] Billing tracking completed successfully!')
    console.log('='.repeat(70) + '\n')
    return result[0]
  }

  // Check if job exists in database
  static async jobExists(jobId: string): Promise<boolean> {
    if (!this.isDatabaseConfigured()) {
      return false
    }

    try {
      const query = `SELECT 1 FROM jobs WHERE id = $1::uuid LIMIT 1`
      const result = await this.query(query, [jobId]) as any[]
      return result.length > 0
    } catch (error) {
      console.error('❌ [DATABASE] Error checking job existence:', error)
      return false
    }
  }

  // Reconcile draft question usage when job is saved
  static async reconcileDraftQuestionUsage(draftJobId: string, realJobId: string) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured')
    }

    console.log('🔄 [QUESTION GENERATION] Reconciling draft usage...')
    console.log('🔖 Draft ID:', draftJobId)
    console.log('💼 Real Job ID:', realJobId)

    const query = `
      UPDATE question_generation_usage
      SET job_id = $1::uuid,
          draft_job_id = NULL
      WHERE draft_job_id = $2
      RETURNING *
    `

    const result = await this.query(query, [realJobId, draftJobId]) as any[]

    console.log('✅ [QUESTION GENERATION] Reconciled', result.length, 'draft usage records')
    return result
  }

  // Record video interview usage with REAL OpenAI cost
  static async recordVideoInterviewUsage(data: {
    companyId: string
    jobId: string
    interviewId?: string
    candidateId?: string
    durationMinutes: number
    completedQuestions?: number
    totalQuestions?: number
    videoQuality?: string
  }) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured')
    }

    console.log('\n' + '='.repeat(70))
    console.log('🎯 [VIDEO INTERVIEW] Starting billing calculation...')
    console.log('📋 Company ID:', data.companyId)
    console.log('💼 Job ID:', data.jobId)
    console.log('🎥 Interview ID:', data.interviewId || 'N/A')
    console.log('👤 Candidate ID:', data.candidateId || 'N/A')
    console.log('⏱️  Duration:', data.durationMinutes, 'minutes')
    console.log('='.repeat(70))

    // Get pricing from .env file ONLY (no OpenAI API, no external sources)
    const { getVideoInterviewCostPerMinute } = await import('./config')
    const costPerMinute = getVideoInterviewCostPerMinute()
    const finalCost = costPerMinute * (data.durationMinutes || 1)
    
    console.log('💰 [VIDEO INTERVIEW] Using .env pricing: $' + costPerMinute.toFixed(2) + '/min (COST_PER_VIDEO_MINUTE)')
    console.log('💵 [VIDEO INTERVIEW] Total cost: $' + finalCost.toFixed(2) + ' for ' + data.durationMinutes + ' minutes')
    
    const query = `
      INSERT INTO video_interview_usage (
        company_id, job_id, interview_id, candidate_id,
        duration_minutes, video_quality, minute_price, cost,
        completed_questions, total_questions,
        openai_base_cost, pricing_source, tokens_used, profit_margin_percent,
        created_at
      )
      VALUES (
        $1::uuid, $2::uuid, $3::uuid, $4::uuid,
        $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14,
        NOW()
      )
      RETURNING *
    `

    const result = await this.query(query, [
      data.companyId,
      data.jobId,
      data.interviewId || null,
      data.candidateId || null,
      data.durationMinutes,
      data.videoQuality || 'HD',
      costPerMinute, // minute_price from .env
      finalCost, // cost (duration * minute_price)
      data.completedQuestions || 0,
      data.totalQuestions || 0,
      finalCost, // openai_base_cost (using env value, no OpenAI API)
      'env-config', // pricing_source - from .env file
      null, // tokens_used - not applicable for env pricing
      0 // profit_margin_percent - no margin
    ]) as any[]

    console.log('💾 [VIDEO INTERVIEW] Cost stored in database successfully')
    console.log('💰 Final Cost: $' + finalCost.toFixed(2))
    console.log('⏱️  Cost per Minute: $' + costPerMinute.toFixed(2))
    console.log('🏷️  Source: .env (COST_PER_VIDEO_MINUTE)')

    // ========================================
    // WALLET DEDUCTION & LEDGER ENTRY
    // ========================================
    try {
      console.log('\n💳 [WALLET] Starting wallet deduction...')
      
      // Get current billing info
      const billing = await this.getCompanyBilling(data.companyId)
      if (!billing) {
        console.log('⚠️  [WALLET] Billing not initialized, skipping wallet deduction')
      } else {
        const balanceBefore = parseFloat(billing.wallet_balance)
        console.log('💰 [WALLET] Current Balance: $' + balanceBefore.toFixed(2))
        console.log('💸 [WALLET] Amount to Deduct: $' + finalCost.toFixed(2))

        // Check if wallet has sufficient balance
        if (balanceBefore < finalCost) {
          console.log('⚠️  [WALLET] Insufficient balance!')
          
          // Check if auto-recharge is enabled
          if (billing.auto_recharge_enabled) {
            console.log('🔄 [WALLET] Auto-recharge enabled, attempting recharge...')
            try {
              await this.autoRecharge(data.companyId)
              console.log('✅ [WALLET] Auto-recharge successful!')
            } catch (rechargeError: any) {
              console.log('❌ [WALLET] Auto-recharge failed:', rechargeError.message)
              throw new Error('Insufficient wallet balance and auto-recharge failed')
            }
          } else {
            console.log('❌ [WALLET] Auto-recharge disabled, cannot proceed')
            throw new Error(`Insufficient wallet balance. Current: $${balanceBefore.toFixed(2)}, Required: $${finalCost.toFixed(2)}`)
          }
        }

        // Deduct from wallet
        const deductQuery = `
          UPDATE company_billing
          SET 
            wallet_balance = wallet_balance - $2,
            current_month_spent = current_month_spent + $2,
            total_spent = total_spent + $2,
            updated_at = NOW()
          WHERE company_id = $1::uuid AND wallet_balance >= $2
          RETURNING wallet_balance as new_balance
        `
        const deductResult = await this.query(deductQuery, [data.companyId, finalCost]) as any[]
        
        if (deductResult.length === 0) {
          throw new Error('Wallet deduction failed - insufficient balance')
        }

        const balanceAfter = parseFloat(deductResult[0].new_balance)
        console.log('✅ [WALLET] Deduction successful!')
        console.log('💰 [WALLET] New Balance: $' + balanceAfter.toFixed(2))

        // Create ledger entry for audit trail
        const ledgerQuery = `
          INSERT INTO usage_ledger (
            company_id, job_id, entry_type, description,
            quantity, unit_price, amount,
            balance_before, balance_after,
            reference_id, metadata, created_at
          ) VALUES (
            $1::uuid, $2::uuid, $3::ledger_entry_type, $4,
            $5, $6, $7,
            $8, $9,
            $10::uuid, $11::jsonb, NOW()
          )
          RETURNING *
        `
        
        await this.query(ledgerQuery, [
          data.companyId,
          data.jobId,
          'VIDEO_INTERVIEW',
          `Video interview - ${data.durationMinutes.toFixed(1)} minutes`,
          data.durationMinutes, // quantity (minutes)
          costPerMinute, // unit price per minute
          finalCost, // amount
          balanceBefore,
          balanceAfter,
          result[0].id, // reference to video_interview_usage record
          JSON.stringify({
            interview_id: data.interviewId,
            candidate_id: data.candidateId,
            duration_minutes: data.durationMinutes,
            completed_questions: data.completedQuestions || 0,
            total_questions: data.totalQuestions || 0,
            video_quality: data.videoQuality || 'HD',
            pricing_source: 'env-config'
          })
        ])

        console.log('📝 [LEDGER] Entry created successfully')
      }
    } catch (walletError: any) {
      console.log('❌ [WALLET] Error during wallet operation:', walletError.message)
      // Don't throw - allow video interview to succeed even if wallet deduction fails
      console.log('⚠️  [WALLET] Video interview succeeded but wallet was not charged')
    }

    console.log('🎉 [VIDEO INTERVIEW] Billing calculation completed successfully!')
    console.log('='.repeat(70) + '\n')
    return result[0]
  }

  // Get usage records (counts/durations only, no fixed pricing)
  static async getCompanyUsageRecords(companyId: string, filters?: {
    jobId?: string
    startDate?: Date
    endDate?: Date
  }) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured')
    }

    const params: any[] = [companyId]
    let paramIndex = 2

    // Build WHERE clauses
    const whereClauses = ['company_id = $1::uuid']
    
    if (filters?.startDate) {
      whereClauses.push(`created_at >= $${paramIndex++}::timestamptz`)
      params.push(filters.startDate)
    }
    
    if (filters?.endDate) {
      whereClauses.push(`created_at <= $${paramIndex++}::timestamptz`)
      params.push(filters.endDate)
    }

    const whereClause = whereClauses.join(' AND ')

    // Get CV parsing counts
    const cvQuery = `
      SELECT COUNT(*) as count
      FROM cv_parsing_usage
      WHERE ${whereClause}
      ${filters?.jobId ? `AND job_id = $${paramIndex}::uuid` : ''}
    `
    const cvParams = [...params]
    if (filters?.jobId) cvParams.push(filters.jobId)
    const cvResult = await this.query(cvQuery, cvParams) as any[]

    // Get video interview durations
    const videoQuery = `
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(duration_minutes), 0) as total_minutes
      FROM video_interview_usage
      WHERE ${whereClause}
      ${filters?.jobId ? `AND job_id = $${paramIndex}::uuid` : ''}
    `
    const videoParams = [...params]
    if (filters?.jobId) videoParams.push(filters.jobId)
    const videoResult = await this.query(videoQuery, videoParams) as any[]

    return {
      cvCount: parseInt(cvResult[0]?.count || 0),
      videoCount: parseInt(videoResult[0]?.count || 0),
      videoMinutes: parseFloat(videoResult[0]?.total_minutes || 0)
    }
  }

  // Get usage data for company (with fixed pricing - legacy)
  static async getCompanyUsage(companyId: string, filters?: {
    jobId?: string
    entryType?: string
    startDate?: Date
    endDate?: Date
  }) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured')
    }

    const params: any[] = [companyId]
    let paramIndex = 2

    // Build WHERE clauses
    const whereClauses = ['company_id = $1::uuid']
    
    if (filters?.startDate) {
      whereClauses.push(`created_at >= $${paramIndex++}::timestamptz`)
      params.push(filters.startDate)
    }
    
    if (filters?.endDate) {
      whereClauses.push(`created_at <= $${paramIndex++}::timestamptz`)
      params.push(filters.endDate)
    }

    const whereClause = whereClauses.join(' AND ')

    // Get CV parsing totals
    const cvQuery = `
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(cost), 0) as total_cost
      FROM cv_parsing_usage
      WHERE ${whereClause}
      ${filters?.jobId ? `AND job_id = $${paramIndex}::uuid` : ''}
    `
    const cvParams = [...params]
    if (filters?.jobId) cvParams.push(filters.jobId)
    const cvResult = await this.query(cvQuery, cvParams) as any[]

    // Get question generation totals
    const questionQuery = `
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(total_tokens), 0) as total_tokens,
        COALESCE(SUM(question_count), 0) as total_questions,
        COALESCE(SUM(cost), 0) as total_cost
      FROM question_generation_usage
      WHERE ${whereClause}
      ${filters?.jobId ? `AND job_id = $${paramIndex}::uuid` : ''}
    `
    const questionParams = [...params]
    if (filters?.jobId) questionParams.push(filters.jobId)
    const questionResult = await this.query(questionQuery, questionParams) as any[]

    // Get video interview totals
    const videoQuery = `
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(duration_minutes), 0) as total_minutes,
        COALESCE(SUM(cost), 0) as total_cost
      FROM video_interview_usage
      WHERE ${whereClause}
      ${filters?.jobId ? `AND job_id = $${paramIndex}::uuid` : ''}
    `
    const videoParams = [...params]
    if (filters?.jobId) videoParams.push(filters.jobId)
    const videoResult = await this.query(videoQuery, videoParams) as any[]

    return {
      cvParsing: parseFloat(cvResult[0]?.total_cost || 0),
      cvCount: parseInt(cvResult[0]?.count || 0),
      jdQuestions: parseFloat(questionResult[0]?.total_cost || 0),
      tokenCount: parseInt(questionResult[0]?.total_tokens || 0),
      questionCount: parseInt(questionResult[0]?.total_questions || 0),
      video: parseFloat(videoResult[0]?.total_cost || 0),
      videoMinutes: parseFloat(videoResult[0]?.total_minutes || 0),
      interviewCount: parseInt(videoResult[0]?.count || 0)
    }
  }

  // Get usage by job with real OpenAI costs
  static async getUsageByJobWithOpenAICosts(companyId: string, filters?: {
    startDate?: Date
    endDate?: Date
    openAIUsage?: any
  }) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured')
    }

    const params: any[] = [companyId]
    let paramIndex = 2

    const whereClauses = ['jus.company_id = $1::uuid']
    
    if (filters?.startDate) {
      whereClauses.push(`jus.last_updated >= $${paramIndex++}::timestamptz`)
      params.push(filters.startDate)
    }
    
    if (filters?.endDate) {
      whereClauses.push(`jus.last_updated <= $${paramIndex++}::timestamptz`)
      params.push(filters.endDate)
    }

    const whereClause = whereClauses.join(' AND ')

    const query = `
      SELECT 
        jus.*,
        j.title as job_title,
        j.id as job_id
      FROM job_usage_summary jus
      JOIN jobs j ON jus.job_id = j.id
      WHERE ${whereClause}
      ORDER BY jus.last_updated DESC
    `

    const result = await this.query(query, params) as any[]

    // Use costs from database (all costs come from .env pricing, stored at record time)
    return result.map((row: any) => {
      const cvCost = parseFloat(row.cv_parsing_cost || 0)
      const questionsCost = parseFloat(row.question_gen_cost || 0)
      const videoCost = parseFloat(row.video_interview_cost || 0)

      return {
        jobId: row.job_id,
        jobTitle: row.job_title,
        cvParsingCount: parseInt(row.cv_parsing_count || 0),
        cvParsingCost: cvCost,
        jdQuestionCount: parseInt(row.question_gen_count || 0),
        jdQuestionTokensIn: parseInt(row.total_tokens_used || 0) / 2,
        jdQuestionTokensOut: parseInt(row.total_tokens_used || 0) / 2,
        jdQuestionsCost: questionsCost,
        videoCount: parseInt(row.interview_count || 0),
        videoMinutes: parseFloat(row.total_interview_minutes || 0),
        videoCost: videoCost,
        totalCost: cvCost + questionsCost + videoCost
      }
    })
  }

  // Get usage by job (legacy - uses fixed pricing from DB)
  static async getUsageByJob(companyId: string, filters?: {
    startDate?: Date
    endDate?: Date
  }) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured')
    }

    const params: any[] = [companyId]
    let paramIndex = 2

    const whereClauses = ['jus.company_id = $1::uuid']
    
    if (filters?.startDate) {
      whereClauses.push(`jus.last_updated >= $${paramIndex++}::timestamptz`)
      params.push(filters.startDate)
    }
    
    if (filters?.endDate) {
      whereClauses.push(`jus.last_updated <= $${paramIndex++}::timestamptz`)
      params.push(filters.endDate)
    }

    const whereClause = whereClauses.join(' AND ')

    const query = `
      SELECT 
        jus.*,
        j.title as job_title,
        j.id as job_id
      FROM job_usage_summary jus
      JOIN jobs j ON jus.job_id = j.id
      WHERE ${whereClause}
      ORDER BY jus.total_cost DESC
    `

    const result = await this.query(query, params) as any[]

    return result.map((row: any) => ({
      jobId: row.job_id,
      jobTitle: row.job_title,
      cvParsingCount: parseInt(row.cv_parsing_count || 0),
      cvParsingCost: parseFloat(row.cv_parsing_cost || 0),
      jdQuestionCount: parseInt(row.question_gen_count || 0),
      jdQuestionTokensIn: parseInt(row.total_tokens_used || 0) / 2, // Approximate
      jdQuestionTokensOut: parseInt(row.total_tokens_used || 0) / 2, // Approximate
      jdQuestionsCost: parseFloat(row.question_gen_cost || 0),
      videoCount: parseInt(row.interview_count || 0),
      videoMinutes: parseFloat(row.total_interview_minutes || 0),
      videoCost: parseFloat(row.video_interview_cost || 0),
      totalCost: parseFloat(row.total_cost || 0)
    }))
  }

  // Get invoices for company
  static async getCompanyInvoices(companyId: string, limit: number = 20) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured')
    }

    const query = `
      SELECT * FROM invoices
      WHERE company_id = $1::uuid
      ORDER BY created_at DESC
      LIMIT $2
    `

    const result = await this.query(query, [companyId, limit]) as any[]
    return result
  }

  // Create invoice
  static async createInvoice(data: {
    companyId: string
    subtotal: number
    taxRate?: number
    taxAmount?: number
    total: number
    description?: string
    lineItems?: any[]
    timePeriod?: { start: Date; end: Date }
  }) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured')
    }

    // Generate invoice number
    const now = new Date()
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
    const randomSuffix = Math.floor(10000 + Math.random() * 90000)
    const invoiceNumber = `INV-${yearMonth}-${randomSuffix}`

    const query = `
      INSERT INTO invoices (
        company_id, invoice_number, status, subtotal, tax_rate,
        tax_amount, total, description, line_items, time_period, created_at
      )
      VALUES (
        $1::uuid, $2, 'pending', $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, NOW()
      )
      RETURNING *
    `

    const result = await this.query(query, [
      data.companyId,
      invoiceNumber,
      data.subtotal,
      data.taxRate || null,
      data.taxAmount || null,
      data.total,
      data.description || 'Monthly usage charges',
      JSON.stringify(data.lineItems || []),
      JSON.stringify(data.timePeriod || {})
    ]) as any[]

    return result[0]
  }

  // Update company's OpenAI project ID
  static async updateCompanyOpenAIProject(companyId: string, projectId: string) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured')
    }

    // Encrypt the project ID before storing
    const { encrypt } = await import('./encryption')
    const encryptedProjectId = encrypt(projectId)

    const query = `
      UPDATE companies 
      SET openai_project_id = $1,
          updated_at = NOW()
      WHERE id = $2::uuid
      RETURNING *
    `

    const result = await this.query(query, [encryptedProjectId, companyId]) as any[]
    
    if (result[0]?.openai_project_id) {
      // Decrypt before returning
      const { decrypt } = await import('./encryption')
      try {
        result[0].openai_project_id = decrypt(result[0].openai_project_id)
      } catch (error) {
        console.error('❌ [DATABASE] Failed to decrypt project ID:', error)
      }
    }
    
    return result[0]
  }

  // Get company by ID
  static async getCompanyById(companyId: string) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured')
    }

    const query = `
      SELECT id, name, openai_project_id, openai_service_account_key
      FROM companies 
      WHERE id = $1::uuid
    `

    const result = await this.query(query, [companyId]) as any[]
    
    if (result[0]) {
      // Decrypt sensitive fields before returning
      const { decrypt } = await import('./encryption')
      try {
        if (result[0].openai_project_id) {
          result[0].openai_project_id = decrypt(result[0].openai_project_id)
        }
        if (result[0].openai_service_account_key) {
          result[0].openai_service_account_key = decrypt(result[0].openai_service_account_key)
        }
      } catch (error) {
        console.error('❌ [DATABASE] Failed to decrypt OpenAI credentials:', error)
        // Return null for credentials if decryption fails
        result[0].openai_project_id = null
        result[0].openai_service_account_key = null
      }
    }
    
    return result[0] || null
  }

  // Get company's OpenAI project ID
  static async getCompanyOpenAIProject(companyId: string): Promise<string | null> {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured')
    }

    const query = `
      SELECT openai_project_id 
      FROM companies 
      WHERE id = $1::uuid
    `

    const result = await this.query(query, [companyId]) as any[]
    
    if (result[0]?.openai_project_id) {
      // Decrypt the project ID before returning
      const { decrypt } = await import('./encryption')
      try {
        return decrypt(result[0].openai_project_id)
      } catch (error) {
        console.error('❌ [DATABASE] Failed to decrypt OpenAI project ID:', error)
        return null
      }
    }
    
    return null
  }

  // Ensure openai_project_id column exists
  static async ensureOpenAIProjectIdColumn() {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured')
    }

    const query = `
      ALTER TABLE companies 
      ADD COLUMN IF NOT EXISTS openai_project_id TEXT
    `

    await this.query(query, [])
  }

  // Get all companies without OpenAI projects
  static async getCompaniesWithoutProjects(limit: number = 100) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured')
    }

    const query = `
      SELECT id, name, industry, description_md
      FROM companies 
      WHERE openai_project_id IS NULL
      ORDER BY created_at DESC
      LIMIT $1
    `

    const result = await this.query(query, [limit]) as any[]
    return result
  }

  // ==================== MEETING BOOKINGS ====================

  // Create a new meeting booking
  static async createMeetingBooking(data: {
    fullName: string
    workEmail: string
    companyName: string
    phoneNumber?: string
    meetingDate?: string // YYYY-MM-DD format (optional - will be set via Google Calendar)
    meetingTime?: string // optional - will be set via Google Calendar
    meetingEndTime?: string // optional
    durationMinutes?: number
    timezone?: string
    meetingLocation?: string
    meetingLink?: string
    notes?: string
    ipAddress?: string
    userAgent?: string
    source?: string
  }) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured')
    }

    const query = `
      INSERT INTO meeting_bookings (
        full_name,
        work_email,
        company_name,
        phone_number,
        meeting_date,
        meeting_time,
        meeting_end_time,
        duration_minutes,
        timezone,
        meeting_location,
        meeting_link,
        notes,
        ip_address,
        user_agent,
        source,
        status,
        created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'new_lead', NOW()
      )
      RETURNING *
    `

    const result = await this.query(query, [
      data.fullName,
      data.workEmail,
      data.companyName,
      data.phoneNumber || null,
      data.meetingDate || null,
      data.meetingTime || null,
      data.meetingEndTime || null,
      data.durationMinutes || 30,
      data.timezone || 'India Standard Time',
      data.meetingLocation || 'google-meet',
      data.meetingLink || null,
      data.notes || null,
      data.ipAddress || null,
      data.userAgent || null,
      data.source || 'website'
    ]) as any[]

    console.log('✅ [MEETING BOOKING] Created:', result[0]?.id)
    return result[0]
  }

  // Get all meeting bookings (for admin)
  static async getMeetingBookings(options?: {
    status?: string
    startDate?: string
    endDate?: string
    limit?: number
    offset?: number
  }) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured')
    }

    let query = `
      SELECT *
      FROM meeting_bookings
      WHERE 1=1
    `
    const params: any[] = []
    let paramIndex = 1

    if (options?.status) {
      query += ` AND status = $${paramIndex}`
      params.push(options.status)
      paramIndex++
    }

    if (options?.startDate) {
      query += ` AND meeting_date >= $${paramIndex}::date`
      params.push(options.startDate)
      paramIndex++
    }

    if (options?.endDate) {
      query += ` AND meeting_date <= $${paramIndex}::date`
      params.push(options.endDate)
      paramIndex++
    }

    query += ` ORDER BY meeting_date DESC, meeting_time DESC`

    if (options?.limit) {
      query += ` LIMIT $${paramIndex}`
      params.push(options.limit)
      paramIndex++
    }

    if (options?.offset) {
      query += ` OFFSET $${paramIndex}`
      params.push(options.offset)
      paramIndex++
    }

    const result = await this.query(query, params) as any[]
    return result
  }

  // Get meeting booking by ID
  static async getMeetingBookingById(id: string) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured')
    }

    const query = `
      SELECT *
      FROM meeting_bookings
      WHERE id = $1::uuid
    `

    const result = await this.query(query, [id]) as any[]
    return result[0] || null
  }

  // Update meeting booking status
  static async updateMeetingBookingStatus(id: string, status: string) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured')
    }

    let additionalFields = ''
    if (status === 'confirmed') {
      additionalFields = ', confirmed_at = NOW()'
    } else if (status === 'cancelled') {
      additionalFields = ', cancelled_at = NOW()'
    }

    const query = `
      UPDATE meeting_bookings
      SET status = $2${additionalFields}, updated_at = NOW()
      WHERE id = $1::uuid
      RETURNING *
    `

    const result = await this.query(query, [id, status]) as any[]
    console.log(`✅ [MEETING BOOKING] Updated status to ${status}:`, id)
    return result[0]
  }

  // Get meeting bookings count by status
  static async getMeetingBookingsStats() {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured')
    }

    const query = `
      SELECT 
        COUNT(*)::integer as total,
        COUNT(*) FILTER (WHERE status = 'scheduled')::integer as scheduled,
        COUNT(*) FILTER (WHERE status = 'confirmed')::integer as confirmed,
        COUNT(*) FILTER (WHERE status = 'completed')::integer as completed,
        COUNT(*) FILTER (WHERE status = 'cancelled')::integer as cancelled,
        COUNT(*) FILTER (WHERE status = 'no_show')::integer as no_show,
        COUNT(*) FILTER (WHERE meeting_date >= CURRENT_DATE)::integer as upcoming,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::integer as last_7_days,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::integer as last_30_days
      FROM meeting_bookings
    `

    const result = await this.query(query, []) as any[]
    return result[0]
  }

  // Check if time slot is available (considers meeting end time)
  static async isTimeSlotAvailable(meetingDate: string, meetingTime: string, meetingEndTime?: string): Promise<boolean> {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured')
    }

    // Check for overlapping bookings - slot is unavailable if:
    // 1. Same date AND
    // 2. Status is not cancelled AND
    // 3. The requested time overlaps with an existing booking
    const query = `
      SELECT COUNT(*) as count
      FROM meeting_bookings
      WHERE meeting_date = $1::date
        AND status NOT IN ('cancelled')
        AND (
          -- Exact match
          meeting_time = $2
          OR
          -- Requested start time falls within existing booking
          ($2 >= meeting_time AND $2 < meeting_end_time)
          OR
          -- Requested end time falls within existing booking
          ($3 > meeting_time AND $3 <= meeting_end_time)
          OR
          -- Requested booking completely contains existing booking
          ($2 <= meeting_time AND $3 >= meeting_end_time)
        )
    `

    const endTime = meetingEndTime || meetingTime
    const result = await this.query(query, [meetingDate, meetingTime, endTime]) as any[]
    return parseInt(result[0]?.count || '0') === 0
  }

  // Check if slot is past its end time (for auto-release)
  static async getExpiredBookings(): Promise<any[]> {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured')
    }

    // Get bookings where the meeting end time has passed
    const query = `
      SELECT *
      FROM meeting_bookings
      WHERE status = 'scheduled'
        AND (
          meeting_date < CURRENT_DATE
          OR (
            meeting_date = CURRENT_DATE
            AND meeting_end_time < TO_CHAR(NOW() AT TIME ZONE 'Asia/Kolkata', 'HH12:MIam')
          )
        )
    `

    const result = await this.query(query, []) as any[]
    return result
  }

  // Update meeting booking with Google Meet link
  static async updateMeetingBookingLink(id: string, meetingLink: string) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured')
    }

    const query = `
      UPDATE meeting_bookings
      SET meeting_link = $2, updated_at = NOW()
      WHERE id = $1::uuid
      RETURNING *
    `

    const result = await this.query(query, [id, meetingLink]) as any[]
    console.log(`✅ [MEETING BOOKING] Updated meeting link:`, id)
    return result[0]
  }
}
