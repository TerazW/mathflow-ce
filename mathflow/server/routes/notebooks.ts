import express from 'express';
import { requireDB } from '../db/connection';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = express.Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidUUID = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v);

// GET /api/notebooks — list user's notebooks (optionally filtered by project)
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const sql = requireDB();
    const { projectId } = req.query as { projectId?: string };
    let notebooks;
    if (projectId === 'null' || projectId === '') {
      notebooks = await sql`
        SELECT id, title, project_id, created_at, updated_at
        FROM notebooks
        WHERE user_id = ${req.user!.id} AND project_id IS NULL
        ORDER BY updated_at DESC
      `;
    } else if (projectId && isValidUUID(projectId)) {
      notebooks = await sql`
        SELECT id, title, project_id, created_at, updated_at
        FROM notebooks
        WHERE user_id = ${req.user!.id} AND project_id = ${projectId}
        ORDER BY updated_at DESC
      `;
    } else {
      notebooks = await sql`
        SELECT id, title, project_id, created_at, updated_at
        FROM notebooks
        WHERE user_id = ${req.user!.id}
        ORDER BY updated_at DESC
      `;
    }
    res.json(notebooks);
  } catch (error: any) {
    console.error('List notebooks error:', error.message);
    res.status(500).json({ error: 'Failed to load notebooks' });
  }
});

// POST /api/notebooks — create notebook (optionally inside a project)
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const { title, projectId } = req.body;

  if (title !== undefined && (typeof title !== 'string' || title.length === 0 || title.length > 255)) {
    res.status(400).json({ error: 'Title must be 1-255 characters' });
    return;
  }
  if (projectId != null && !isValidUUID(projectId)) {
    res.status(400).json({ error: 'Invalid projectId' });
    return;
  }

  try {
    const sql = requireDB();

    // Check notebook limit for free users
    if (req.user!.plan === 'free') {
      const count = await sql`SELECT COUNT(*) as cnt FROM notebooks WHERE user_id = ${req.user!.id}`;
      if (parseInt(count[0].cnt) >= 5) {
        res.status(403).json({ error: 'Free plan is limited to 5 notebooks. Upgrade to Pro for unlimited notebooks.' });
        return;
      }
    }

    // Verify project ownership if specified
    if (projectId) {
      const proj = await sql`SELECT id FROM projects WHERE id = ${projectId} AND user_id = ${req.user!.id}`;
      if (proj.length === 0) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }
    }

    const result = await sql`
      INSERT INTO notebooks (user_id, project_id, title)
      VALUES (${req.user!.id}, ${projectId || null}, ${title || 'Untitled Notebook'})
      RETURNING id, title, project_id, created_at, updated_at
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

  if (!isValidUUID(id)) {
    res.status(400).json({ error: 'Invalid notebook id' });
    return;
  }
  if (!title || typeof title !== 'string' || title.trim().length === 0 || title.length > 255) {
    res.status(400).json({ error: 'Title is required and must be 1-255 characters' });
    return;
  }

  try {
    const sql = requireDB();
    const result = await sql`
      UPDATE notebooks SET title = ${title}
      WHERE id = ${id} AND user_id = ${req.user!.id}
      RETURNING id, title, project_id, created_at, updated_at
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

// POST /api/notebooks/:id/move — move notebook to a different project (or unassign)
router.post('/:id/move', requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { projectId } = req.body;

  if (!isValidUUID(id)) {
    res.status(400).json({ error: 'Invalid notebook id' });
    return;
  }
  if (projectId != null && !isValidUUID(projectId)) {
    res.status(400).json({ error: 'Invalid projectId' });
    return;
  }

  try {
    const sql = requireDB();

    // Verify project ownership if specified
    if (projectId) {
      const proj = await sql`SELECT id FROM projects WHERE id = ${projectId} AND user_id = ${req.user!.id}`;
      if (proj.length === 0) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }
    }

    const result = await sql`
      UPDATE notebooks SET project_id = ${projectId || null}
      WHERE id = ${id} AND user_id = ${req.user!.id}
      RETURNING id, title, project_id, created_at, updated_at
    `;
    if (result.length === 0) {
      res.status(404).json({ error: 'Notebook not found' });
      return;
    }
    res.json(result[0]);
  } catch (error: any) {
    console.error('Move notebook error:', error.message);
    res.status(500).json({ error: 'Failed to move notebook' });
  }
});

// DELETE /api/notebooks/:id — delete notebook (cascades to notes)
router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params;

  if (!isValidUUID(id)) {
    res.status(400).json({ error: 'Invalid notebook id' });
    return;
  }

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
