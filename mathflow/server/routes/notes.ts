// SPDX-License-Identifier: AGPL-3.0-only
import express from 'express';
import { requireDB } from '../db/connection';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = express.Router();

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

// GET /api/notes/search?q=query — basic title search
router.get('/search', requireAuth, async (req: AuthRequest, res) => {
  const { q } = req.query;

  if (!q || typeof q !== 'string' || q.trim().length < 2) {
    res.status(400).json({ error: 'Search query must be at least 2 characters' });
    return;
  }

  try {
    const sql = requireDB();
    const results = await sql`
      SELECT n.id, n.notebook_id, n.title, n.updated_at,
             nb.title as notebook_title
      FROM notes n
      JOIN notebooks nb ON nb.id = n.notebook_id
      WHERE n.user_id = ${req.user!.id}
        AND n.title ILIKE ${'%' + q.trim() + '%'}
      ORDER BY n.updated_at DESC
      LIMIT 20
    `;
    res.json(results);
  } catch (error: any) {
    console.error('Search error:', error.message);
    res.status(500).json({ error: 'Search failed' });
  }
});

// GET /api/notes?notebookId=xxx — list notes in a notebook
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const { notebookId } = req.query;

  if (!notebookId) {
    res.status(400).json({ error: 'notebookId is required' });
    return;
  }

  try {
    const sql = requireDB();

    const nb = await sql`SELECT id FROM notebooks WHERE id = ${notebookId as string} AND user_id = ${req.user!.id}`;
    if (nb.length === 0) {
      res.status(404).json({ error: 'Notebook not found' });
      return;
    }

    const notes = await sql`
      SELECT id, notebook_id, title, created_at, updated_at
      FROM notes
      WHERE notebook_id = ${notebookId as string} AND user_id = ${req.user!.id}
      ORDER BY updated_at DESC
    `;
    res.json(notes);
  } catch (error: any) {
    console.error('List notes error:', error.message);
    res.status(500).json({ error: 'Failed to load notes' });
  }
});

// GET /api/notes/:id — get single note with content
router.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  const id = req.params.id as string;

  if (!isValidUUID(id)) {
    res.status(400).json({ error: 'Invalid note ID format' });
    return;
  }

  try {
    const sql = requireDB();
    const result = await sql`
      SELECT id, notebook_id, title, content, custom_preamble, created_at, updated_at
      FROM notes
      WHERE id = ${id} AND user_id = ${req.user!.id}
    `;

    if (result.length === 0) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    res.json(result[0]);
  } catch (error: any) {
    console.error('Get note error:', error.message);
    res.status(500).json({ error: 'Failed to load note' });
  }
});

// POST /api/notes — create note (no plan limits in CE)
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const { notebookId, title } = req.body;

  if (!notebookId) {
    res.status(400).json({ error: 'notebookId is required' });
    return;
  }

  if (title !== undefined && (typeof title !== 'string' || title.length === 0 || title.length > 255)) {
    res.status(400).json({ error: 'Title must be 1-255 characters' });
    return;
  }

  try {
    const sql = requireDB();

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(notebookId)) {
      res.status(400).json({ error: 'Invalid notebook ID format' });
      return;
    }

    const nb = await sql`SELECT id FROM notebooks WHERE id = ${notebookId} AND user_id = ${req.user!.id}`;
    if (nb.length === 0) {
      res.status(404).json({ error: 'Notebook not found' });
      return;
    }

    const result = await sql`
      INSERT INTO notes (notebook_id, user_id, title)
      VALUES (${notebookId}, ${req.user!.id}, ${title || 'Untitled Note'})
      RETURNING id, notebook_id, title, content, created_at, updated_at
    `;
    res.status(201).json(result[0]);
  } catch (error: any) {
    console.error('Create note error:', error.message);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// PUT /api/notes/:id — update note content
router.put('/:id', requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { title, content } = req.body;

  if (title !== undefined && (typeof title !== 'string' || title.length > 255)) {
    res.status(400).json({ error: 'Title must be a string of 255 characters or fewer' });
    return;
  }

  if (content !== undefined) {
    const contentStr = JSON.stringify(content);
    if (contentStr.length > 5_000_000) {
      res.status(413).json({ error: 'Content too large (maximum 5 MB)' });
      return;
    }
  }

  try {
    const sql = requireDB();

    if (title !== undefined && content !== undefined) {
      const result = await sql`
        UPDATE notes SET title = ${title}, content = ${JSON.stringify(content)}::jsonb
        WHERE id = ${id} AND user_id = ${req.user!.id}
        RETURNING id, notebook_id, title, created_at, updated_at
      `;
      if (result.length === 0) {
        res.status(404).json({ error: 'Note not found' });
        return;
      }
      res.json(result[0]);
    } else if (title !== undefined) {
      const result = await sql`
        UPDATE notes SET title = ${title}
        WHERE id = ${id} AND user_id = ${req.user!.id}
        RETURNING id, notebook_id, title, created_at, updated_at
      `;
      if (result.length === 0) {
        res.status(404).json({ error: 'Note not found' });
        return;
      }
      res.json(result[0]);
    } else if (content !== undefined) {
      const result = await sql`
        UPDATE notes SET content = ${JSON.stringify(content)}::jsonb
        WHERE id = ${id} AND user_id = ${req.user!.id}
        RETURNING id, notebook_id, title, created_at, updated_at
      `;
      if (result.length === 0) {
        res.status(404).json({ error: 'Note not found' });
        return;
      }
      res.json(result[0]);
    } else {
      res.status(400).json({ error: 'Nothing to update' });
    }
  } catch (error: any) {
    console.error('Update note error:', error.message);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

// DELETE /api/notes/:id — delete note
router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params;

  try {
    const sql = requireDB();
    const result = await sql`
      DELETE FROM notes WHERE id = ${id} AND user_id = ${req.user!.id}
      RETURNING id
    `;
    if (result.length === 0) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error('Delete note error:', error.message);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

export default router;
