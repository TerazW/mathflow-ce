import { neon, neonConfig } from '@neondatabase/serverless';

neonConfig.fetchConnectionCache = true;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.warn('WARNING: DATABASE_URL not set. Cloud features will not work.');
}

export const sql = DATABASE_URL ? neon(DATABASE_URL) : null;

export function requireDB() {
  if (!sql) {
    throw new Error('Database not configured. Set DATABASE_URL environment variable.');
  }
  return sql;
}
