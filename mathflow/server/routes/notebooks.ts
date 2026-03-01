// SPDX-License-Identifier: AGPL-3.0-only
import express from 'express';
import { requireDB } from '../db/connection';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = express.Router();

// GET /api/notebooks — list user's notebooks
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const sql = requireDB();
    const notebooks = await sql`
      SELECT id, title, created_at, updated_at
      FROM notebooks
      WHERE user_id = ${req.user!.id}
      ORDER BY updated_at DESC
    `;
    res.json(notebooks);
  } catch (error: any) {
    console.error('List notebooks error:', error.message);
    res.status(500).json({ error: 'Failed to load notebooks' });
  }
});

// POST /api/notebooks — create notebook (no plan limits in CE)
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const { title } = req.body;

  if (title !== undefined && (typeof title !== 'string' || title.length === 0 || title.length > 255)) {
    res.status(400).json({ error: 'Title must be 1-255 characters' });
    return;
  }

  try {
    const sql = requireDB();
    const result = await sql`
      INSERT INTO notebooks (user_id, title)
      VALUES (${req.user!.id}, ${title || 'Untitled Notebook'})
      RETURNING id, title, created_at, updated_at
    `;
    res.status(201).json(result[0]);
  } catch (error: any) {
    console.error('Create notebook error:', error.message);
    res.status(500).json({ error: 'Failed to create notebook' });
  }
});

// PUT /api/notebooks/:id — rename notebook
router.put('/:id', requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { title } = req.body;

  if (!title || typeof title !== 'string' || title.trim().length === 0 || title.length > 255) {
    res.status(400).json({ error: 'Title is required and must be 1-255 characters' });
    return;
  }

  try {
    const sql = requireDB();
    const result = await sql`
      UPDATE notebooks SET title = ${title}
      WHERE id = ${id} AND user_id = ${req.user!.id}
      RETURNING id, title, created_at, updated_at
    `;
    if (result.length === 0) {
      res.status(404).json({ error: 'Notebook not found' });
      return;
    }
    res.json(result[0]);
  } catch (error: any) {
    console.error('Rename notebook error:', error.message);
    res.status(500).json({ error: 'Failed to rename notebook' });
  }
});

// DELETE /api/notebooks/:id — delete notebook (cascades to notes)
router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params;

  try {
    const sql = requireDB();
    const result = await sql`
      DELETE FROM notebooks WHERE id = ${id} AND user_id = ${req.user!.id}
      RETURNING id
    `;
    if (result.length === 0) {
      res.status(404).json({ error: 'Notebook not found' });
      return;
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error('Delete notebook error:', error.message);
    res.status(500).json({ error: 'Failed to delete notebook' });
  }
});

export default router;
