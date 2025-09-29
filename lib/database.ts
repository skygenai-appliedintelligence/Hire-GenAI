import crypto from 'crypto'

// Database service for authentication operations using raw SQL
export class DatabaseService {
  // Get database connection from existing prisma instance
  private static async query(sql: string, params: any[] = []) {
    try {
      const { prisma } = await import('./prisma')
      if (!prisma) {
        throw new Error('Prisma client not initialized')
      }
      return await prisma.$queryRawUnsafe(sql, ...params)
    } catch (error: any) {
      console.error('Database query error:', error)
      throw new Error(`Database connection failed: ${error.message}`)
    }
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
    `
    await this.query(insertDomainQuery, [newCompany[0].id, domain])

    return newCompany[0]
  }

  // Create or find user
  static async findOrCreateUser(email: string, fullName: string, companyId: string) {
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
      INSERT INTO users (company_id, email, full_name, status, created_at)
      VALUES ($1::uuid, $2, $3, 'active', NOW())
      RETURNING *
    `
    const newUser = await this.query(insertUserQuery, [companyId, email.toLowerCase(), fullName]) as any[]

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

    const insertChallengeQuery = `
      INSERT INTO otp_challenges (email, principal_type, principal_id, purpose, code_hash, expires_at, max_tries, tries_used, created_at)
      VALUES ($1, $2, $3::uuid, $4, $5, $6::timestamptz, 5, 0, NOW())
      RETURNING *
    `
    const challenge = await this.query(insertChallengeQuery, [
      email.toLowerCase(),
      principalType,
      principalId,
      purpose,
      codeHash,
      expiresAt.toISOString()
    ]) as any[]

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

    if (updates.length === 0) {
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

    const result = await this.query(updateCompanyQuery, values) as any[]

    if (result.length === 0) {
      throw new Error('Company not found')
    }

    return result[0]
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
      SELECT id, title, location_text, status, employment_type, level,
             salary_min, salary_max, salary_period, created_by, created_at
      FROM jobs
      WHERE company_id = $1::uuid
      ORDER BY created_at DESC
      LIMIT $2
    `
    const rows = (await this.query(q, [companyId, limit])) as any[]
    return rows
  }

  static async getJobByIdForCompany(jobId: string, companyId: string): Promise<any | null> {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured. Please set DATABASE_URL in your .env.local file.')
    }
    const q = `
      SELECT id, company_id, title, description_md, location_text, status, employment_type, level,
             education, years_experience_min, years_experience_max,
             technical_skills, domain_knowledge, soft_skills, languages,
             must_have_skills, nice_to_have_skills,
             duties_day_to_day, duties_strategic, stakeholders,
             decision_scope, salary_min, salary_max, salary_period, bonus_incentives,
             perks_benefits, time_off_policy, joining_timeline, travel_requirements,
             visa_requirements,
             created_by, created_at
      FROM jobs
      WHERE id = $1::uuid AND company_id = $2::uuid
      LIMIT 1
    `
    const rows = (await this.query(q, [jobId, companyId])) as any[]
    return rows.length > 0 ? rows[0] : null
  }

  static async updateJobForCompany(jobId: string, companyId: string, updates: {
    title?: string | null
    description_md?: string | null
    location_text?: string | null
    status?: 'open' | 'on_hold' | 'closed' | 'cancelled' | null
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

    if (sets.length === 0) return null

    // updated_at may not exist in schema; only set if column exists. We'll skip to avoid errors.
    values.push(jobId)
    values.push(companyId)

    const q = `
      UPDATE jobs
      SET ${sets.join(', ')}
      WHERE id = $${i++}::uuid AND company_id = $${i}::uuid
      RETURNING id, company_id, title, location_text, employment_type, level,
                salary_min, salary_max, salary_period,
                created_by, created_at
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
    const q = `SELECT 1 FROM users WHERE id = $1::uuid LIMIT 1`
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
    bonus_incentives?: string | null
    perks_benefits?: string[] | null
    time_off_policy?: string | null
    joining_timeline?: string | null
    travel_requirements?: string | null
    visa_requirements?: string | null
    is_public?: boolean | null
    created_by?: string | null
  }) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured. Please set DATABASE_URL in your .env.local file.')
    }

    // Helper: convert JS string[] to Postgres text[] literal (e.g., '{"a","b"}')
    const toPgArray = (arr?: string[] | null): string | null => {
      if (!arr || arr.length === 0) return '{}'
      // Escape quotes and commas inside values, wrap each in quotes
      const escaped = arr
        .map(s => (s ?? ''))
        .map(s => s.replace(/"/g, '\\"'))
        .map(s => `"${s}"`)
        .join(',')
      return `{${escaped}}`
    }

    const q = `
      INSERT INTO jobs (
        company_id, company_name, title, description_md, location_text, employment_type, level, education,
        years_experience_min, years_experience_max,
        technical_skills, domain_knowledge, soft_skills, languages,
        must_have_skills, nice_to_have_skills,
        duties_day_to_day, duties_strategic, stakeholders,
        decision_scope, salary_min, salary_max, salary_period, bonus_incentives,
        perks_benefits, time_off_policy, joining_timeline, travel_requirements, visa_requirements,
        status, is_public, created_by
      )
      VALUES (
        $1::uuid, $2, $3, $4, $5, $6::employment_type, $7::job_level, $8,
        $9, $10,
        $11::text[], $12::text[], $13::text[], $14::text[],
        $15::text[], $16::text[],
        $17::text[], $18::text[], $19::text[],
        $20, $21, $22, $23::salary_period, $24,
        $25::text[], $26, $27, $28, $29,
        'open', COALESCE($30, true), $31::uuid
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
      input.bonus_incentives ?? null,
      toPgArray(input.perks_benefits),
      input.time_off_policy ?? null,
      input.joining_timeline ?? null,
      input.travel_requirements ?? null,
      input.visa_requirements ?? null,
      input.is_public ?? true,
      input.created_by ?? null,
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
  static async getJobCompanyId(jobId: string): Promise<string | null> {
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
      // Create new candidate
      const insertQuery = `
        INSERT INTO candidates (
          email, first_name, last_name, resume_file_id, resume_url, 
          resume_name, resume_size, resume_type, created_at
        )
        VALUES ($1, $2, $3, $4::uuid, $5, $6, $7, $8, NOW())
        RETURNING *
      `
      const created = await this.query(insertQuery, [
        data.email.toLowerCase(),
        data.first_name || 'Unknown',
        data.last_name || 'Candidate',
        data.resume_file_id || null,
        data.resume_url || null,
        data.resume_name || null,
        data.resume_size || null,
        data.resume_type || null
      ]) as any[]

      return created[0]
    }
  }
}
