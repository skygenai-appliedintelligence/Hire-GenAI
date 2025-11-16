-- Create admin_sessions table for owner login tracking
CREATE TABLE admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_email VARCHAR(255) NOT NULL,
  session_token_hash VARCHAR(255) NOT NULL UNIQUE,
  ip_address INET,
  user_agent TEXT,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_admin_sessions_owner_email ON admin_sessions(owner_email);
CREATE INDEX idx_admin_sessions_token_hash ON admin_sessions(session_token_hash);
CREATE INDEX idx_admin_sessions_expires_at ON admin_sessions(expires_at);

-- Add comment
COMMENT ON TABLE admin_sessions IS 'Stores authenticated sessions for owner/admin access to HireGenAI admin panel';
