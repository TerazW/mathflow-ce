-- MathFlow Database Schema
-- Run this against your Neon PostgreSQL database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For full-text search

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),  -- nullable for OAuth-only accounts
  display_name VARCHAR(100),
  oauth_provider VARCHAR(20),
  oauth_id VARCHAR(255),
  plan VARCHAR(20) NOT NULL DEFAULT 'free',  -- free, pro, team
  email_verified BOOLEAN DEFAULT FALSE,
  email_verification_token VARCHAR(64),
  email_verification_expires TIMESTAMPTZ,
  password_reset_token VARCHAR(64),
  password_reset_expires TIMESTAMPTZ,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  subscription_status VARCHAR(20) DEFAULT 'active',  -- active, canceled, past_due
  subscription_period_end TIMESTAMPTZ,
  storage_used_bytes BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(oauth_provider, oauth_id)
);

-- Projects table (top-level organizational entity above notebooks)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL DEFAULT 'Untitled Project',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_user ON projects(user_id);

-- Notebooks table
CREATE TABLE notebooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL DEFAULT 'Untitled Notebook',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notebooks_user ON notebooks(user_id);
CREATE INDEX idx_notebooks_project ON notebooks(project_id);

-- Notes table
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notebook_id UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL DEFAULT 'Untitled Note',
  content JSONB,
  is_public BOOLEAN DEFAULT FALSE,
  public_slug VARCHAR(20) UNIQUE,
  custom_preamble TEXT DEFAULT '',
  yjs_state BYTEA,             -- Yjs CRDT state for collaboration persistence
  yjs_state_updated_at TIMESTAMPTZ,  -- Track when Yjs state was last saved
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notes_notebook ON notes(notebook_id);
CREATE INDEX idx_notes_user ON notes(user_id);
CREATE INDEX idx_notes_public_slug ON notes(public_slug) WHERE public_slug IS NOT NULL;

-- Full-text search index on note content (searches text within JSONB)
CREATE INDEX idx_notes_content_search ON notes USING gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content::text, '')));

-- Note versions (version history)
CREATE TABLE note_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content JSONB NOT NULL,
  title VARCHAR(255),
  version_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_versions_note ON note_versions(note_id, version_number DESC);

-- Collaborators (for sharing)
CREATE TABLE collaborators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission VARCHAR(20) NOT NULL DEFAULT 'view',  -- view, edit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(note_id, user_id)
);

CREATE INDEX idx_collaborators_user ON collaborators(user_id);
CREATE INDEX idx_collaborators_note ON collaborators(note_id);

-- Collaboration invitations
CREATE TABLE collaboration_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invitee_email VARCHAR(255) NOT NULL,
  invitee_id UUID REFERENCES users(id) ON DELETE SET NULL,
  permission VARCHAR(20) NOT NULL DEFAULT 'edit',  -- view, edit
  status VARCHAR(20) NOT NULL DEFAULT 'pending',   -- pending, accepted, declined
  token VARCHAR(64) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);

CREATE INDEX idx_invites_token ON collaboration_invites(token);
CREATE INDEX idx_invites_invitee_email ON collaboration_invites(invitee_email);
CREATE INDEX idx_invites_note ON collaboration_invites(note_id);

-- User settings (AI keys, preferences, custom snippets)
CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  ai_provider VARCHAR(20),
  ai_model VARCHAR(100),
  -- Note: API keys are encrypted at rest
  ai_api_key_encrypted TEXT,
  custom_preamble TEXT DEFAULT '',
  custom_snippets JSONB DEFAULT '[]',
  theme VARCHAR(20) DEFAULT 'light',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_notebooks_updated_at BEFORE UPDATE ON notebooks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_notes_updated_at BEFORE UPDATE ON notes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_user_settings_updated_at BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
