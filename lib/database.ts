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
    
    // First check if company exists by domain
    const existingCompanyQuery = `
      SELECT c.* FROM companies c 
      JOIN company_domains cd ON c.id = cd.company_id 
      WHERE cd.domain = $1 
      LIMIT 1
    `
    const existingCompany = await this.query(existingCompanyQuery, [domain]) as any[]

    if (existingCompany.length > 0) {
      return existingCompany[0]
    }

    // Create new company
    const defaultCompanyName = companyName || domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1)
    
    const insertCompanyQuery = `
      INSERT INTO companies (name, status, verified, created_at)
      VALUES ($1, 'active', false, NOW())
      RETURNING *
    `
    const newCompany = await this.query(insertCompanyQuery, [defaultCompanyName]) as any[]

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
    const q = `SELECT id FROM companies WHERE name = $1 LIMIT 1`
    const rows = (await this.query(q, [name])) as any[]
    return rows.length > 0 ? rows[0].id : null
  }

  static async listJobsByCompanyId(companyId: string, limit = 200): Promise<any[]> {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured. Please set DATABASE_URL in your .env.local file.')
    }
    const q = `
      SELECT id, title, location, employment_type, experience_level, description_md,
             responsibilities_md, benefits_md, salary_level, created_by, created_at
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
      SELECT id, company_id, title, location, employment_type, experience_level,
             description_md, responsibilities_md, benefits_md, salary_level,
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
    location?: string | null
    employment_type?: 'full_time' | 'part_time' | 'contract' | null
    experience_level?: 'intern' | 'junior' | 'mid' | 'senior' | 'lead' | 'principal' | null
    description_md?: string | null
    responsibilities_md?: string | null
    benefits_md?: string | null
    salary_level?: string | null
  }): Promise<any | null> {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured. Please set DATABASE_URL in your .env.local file.')
    }

    const sets: string[] = []
    const values: any[] = []
    let i = 1

    if (updates.title !== undefined) { sets.push(`title = $${i++}`); values.push(updates.title) }
    if (updates.location !== undefined) { sets.push(`location = $${i++}`); values.push(updates.location) }
    if (updates.employment_type !== undefined) { sets.push(`employment_type = $${i++}::employment_type`); values.push(updates.employment_type) }
    if (updates.experience_level !== undefined) { sets.push(`experience_level = $${i++}::experience_level`); values.push(updates.experience_level) }
    if (updates.description_md !== undefined) { sets.push(`description_md = $${i++}`); values.push(updates.description_md) }
    if (updates.responsibilities_md !== undefined) { sets.push(`responsibilities_md = $${i++}`); values.push(updates.responsibilities_md) }
    if (updates.benefits_md !== undefined) { sets.push(`benefits_md = $${i++}`); values.push(updates.benefits_md) }
    if (updates.salary_level !== undefined) { sets.push(`salary_level = $${i++}`); values.push(updates.salary_level) }

    if (sets.length === 0) return null

    // updated_at may not exist in schema; only set if column exists. We'll skip to avoid errors.
    values.push(jobId)
    values.push(companyId)

    const q = `
      UPDATE jobs
      SET ${sets.join(', ')}
      WHERE id = $${i++}::uuid AND company_id = $${i}::uuid
      RETURNING id, company_id, title, location, employment_type, experience_level,
                description_md, responsibilities_md, benefits_md, salary_level,
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
    company_id: string
    title: string
    location?: string | null
    description_md?: string | null
    employment_type?: 'full_time' | 'part_time' | 'contract' | null
    experience_level?: 'intern' | 'junior' | 'mid' | 'senior' | 'lead' | 'principal' | null
    responsibilities_md?: string | null
    benefits_md?: string | null
    salary_level?: string | null
    created_by?: string | null
  }) {
    if (!this.isDatabaseConfigured()) {
      throw new Error('Database not configured. Please set DATABASE_URL in your .env.local file.')
    }

    const q = `
      INSERT INTO jobs (
        company_id, title, location, description_md, status, is_public,
        employment_type, experience_level, responsibilities_md, benefits_md,
        salary_level, created_by
      )
      VALUES (
        $1::uuid, $2, $3, $4, 'open', true,
        $5::employment_type, $6::experience_level, $7, $8,
        $9, $10::uuid
      )
      RETURNING id
    `

    const params = [
      input.company_id,
      input.title,
      input.location ?? null,
      input.description_md ?? null,
      input.employment_type ?? null,
      input.experience_level ?? null,
      input.responsibilities_md ?? null,
      input.benefits_md ?? null,
      input.salary_level ?? null,
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
}
