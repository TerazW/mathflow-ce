-- MathFlow Community Edition — Database Schema
-- Run this against your PostgreSQL database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(100),
  plan VARCHAR(20) NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notebooks table
CREATE TABLE notebooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL DEFAULT 'Untitled Notebook',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notebooks_user ON notebooks(user_id);

-- Notes table
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notebook_id UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL DEFAULT 'Untitled Note',
  content JSONB,
  custom_preamble TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notes_notebook ON notes(notebook_id);
CREATE INDEX idx_notes_user ON notes(user_id);

-- User settings (AI keys, preferences, custom snippets)
CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  ai_provider VARCHAR(20),
  ai_model VARCHAR(100),
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
CREATE TRIGGER tr_notebooks_updated_at BEFORE UPDATE ON notebooks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_notes_updated_at BEFORE UPDATE ON notes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_user_settings_updated_at BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
