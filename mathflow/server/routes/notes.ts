import express from 'express';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { requireDB } from '../db/connection';
import { requireAuth, optionalAuth, refreshPlan, AuthRequest } from '../middleware/auth';
import { isEmailConfigured, sendCollaborationInviteEmail } from '../services/email';
import { getFrontendUrl } from '../lib/frontend-url';

const router = express.Router();

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

// GET /api/notes/search?q=query — full-text search across user's notes
// IMPORTANT: Must be before /:id route to avoid "search" being treated as an id
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
             nb.title as notebook_title,
             ts_headline('english', coalesce(n.title, '') || ' ' || coalesce(n.content::text, ''),
               plainto_tsquery('english', ${q.trim()}),
               'MaxWords=30, MinWords=10, StartSel=**, StopSel=**'
             ) as snippet
      FROM notes n
      JOIN notebooks nb ON nb.id = n.notebook_id
      WHERE n.user_id = ${req.user!.id}
        AND to_tsvector('english', coalesce(n.title, '') || ' ' || coalesce(n.content::text, ''))
            @@ plainto_tsquery('english', ${q.trim()})
      ORDER BY ts_rank(
        to_tsvector('english', coalesce(n.title, '') || ' ' || coalesce(n.content::text, '')),
        plainto_tsquery('english', ${q.trim()})
      ) DESC
      LIMIT 20
    `;
    res.json(results);
  } catch (error: any) {
    console.error('Search error:', error.message);
    res.status(500).json({ error: 'Search failed' });
  }
});

// GET /api/notes/public/:slug — get publicly shared note (no auth required)
// IMPORTANT: Must be before /:id route to avoid "public" being treated as an id
router.get('/public/:slug', optionalAuth, async (req: AuthRequest, res) => {
  const { slug } = req.params;

  try {
    const sql = requireDB();
    const result = await sql`
      SELECT n.id, n.title, n.content, n.created_at, n.updated_at,
             u.display_name as author_name
      FROM notes n
      JOIN users u ON u.id = n.user_id
      WHERE n.public_slug = ${slug} AND n.is_public = true
    `;

    if (result.length === 0) {
      res.status(404).json({ error: 'Note not found or not public' });
      return;
    }

    res.json(result[0]);
  } catch (error: any) {
    console.error('Get public note error:', error.message);
    res.status(500).json({ error: 'Failed to load note' });
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

    // Verify notebook belongs to user
    const nb = await sql`SELECT id FROM notebooks WHERE id = ${notebookId as string} AND user_id = ${req.user!.id}`;
    if (nb.length === 0) {
      res.status(404).json({ error: 'Notebook not found' });
      return;
    }

    const notes = await sql`
      SELECT id, notebook_id, title, is_public, public_slug, created_at, updated_at
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
      SELECT n.id, n.notebook_id, n.title, n.content, n.is_public, n.public_slug, n.custom_preamble, n.created_at, n.updated_at,
             (SELECT COUNT(*)::int FROM collaborators c WHERE c.note_id = n.id) AS collaborator_count,
             (SELECT COUNT(*)::int FROM collaboration_invites ci WHERE ci.note_id = n.id AND ci.status = 'pending' AND ci.expires_at > NOW()) AS pending_invite_count
      FROM notes n
      WHERE n.id = ${id} AND n.user_id = ${req.user!.id}
    `;

    if (result.length === 0) {
      // Check if user has collaborator access
      const collab = await sql`
        SELECT n.id, n.notebook_id, n.title, n.content, n.is_public, n.public_slug, n.custom_preamble, n.created_at, n.updated_at,
               (SELECT COUNT(*)::int FROM collaborators c2 WHERE c2.note_id = n.id) AS collaborator_count,
               (SELECT COUNT(*)::int FROM collaboration_invites ci WHERE ci.note_id = n.id AND ci.status = 'pending' AND ci.expires_at > NOW()) AS pending_invite_count
        FROM notes n
        JOIN collaborators c ON c.note_id = n.id
        WHERE n.id = ${id} AND c.user_id = ${req.user!.id}
      `;
      if (collab.length === 0) {
        res.status(404).json({ error: 'Note not found' });
        return;
      }
      res.json({ ...collab[0], has_collaborators: collab[0].collaborator_count > 0 || collab[0].pending_invite_count > 0 });
      return;
    }

    res.json({ ...result[0], has_collaborators: result[0].collaborator_count > 0 || result[0].pending_invite_count > 0 });
  } catch (error: any) {
    console.error('Get note error:', error.message);
    res.status(500).json({ error: 'Failed to load note' });
  }
});

// POST /api/notes — create note
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

    // Verify notebook belongs to user (UUID format validation)
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

    // Check note limit for free users
    if (req.user!.plan === 'free') {
      const count = await sql`SELECT COUNT(*) as cnt FROM notes WHERE user_id = ${req.user!.id}`;
      if (parseInt(count[0].cnt) >= 50) {
        res.status(403).json({ error: 'Free plan is limited to 50 notes. Upgrade to Pro for unlimited notes.' });
        return;
      }
    }

    const result = await sql`
      INSERT INTO notes (notebook_id, user_id, title)
      VALUES (${notebookId}, ${req.user!.id}, ${title || 'Untitled Note'})
      RETURNING id, notebook_id, title, content, is_public, public_slug, created_at, updated_at
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

    // Build update dynamically
    if (title !== undefined && content !== undefined) {
      const result = await sql`
        UPDATE notes SET title = ${title}, content = ${JSON.stringify(content)}::jsonb
        WHERE id = ${id} AND user_id = ${req.user!.id}
        RETURNING id, notebook_id, title, is_public, public_slug, created_at, updated_at
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
        RETURNING id, notebook_id, title, is_public, public_slug, created_at, updated_at
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
        RETURNING id, notebook_id, title, is_public, public_slug, created_at, updated_at
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

// POST /api/notes/:id/share — toggle public sharing
router.post('/:id/share', requireAuth, refreshPlan, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { isPublic } = req.body;

  try {
    const sql = requireDB();

    // Check plan — sharing requires Pro
    if (req.user!.plan === 'free' && isPublic) {
      res.status(403).json({ error: 'Sharing requires a Pro plan. Upgrade to share notes publicly.' });
      return;
    }

    let result;
    if (isPublic) {
      // Preserve existing slug if already public, generate new one only if needed
      result = await sql`
        UPDATE notes SET is_public = true,
          public_slug = COALESCE(public_slug, ${crypto.randomBytes(6).toString('base64url')})
        WHERE id = ${id} AND user_id = ${req.user!.id}
        RETURNING id, is_public, public_slug
      `;
    } else {
      result = await sql`
        UPDATE notes SET is_public = false, public_slug = NULL
        WHERE id = ${id} AND user_id = ${req.user!.id}
        RETURNING id, is_public, public_slug
      `;
    }

    if (result.length === 0) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    res.json(result[0]);
  } catch (error: any) {
    console.error('Share note error:', error.message);
    res.status(500).json({ error: 'Failed to update sharing' });
  }
});

// POST /api/notes/:id/move — move note to a different notebook
router.post('/:id/move', requireAuth, async (req: AuthRequest, res) => {
  const id = req.params.id as string;
  const { notebookId } = req.body;

  if (!isValidUUID(id)) {
    res.status(400).json({ error: 'Invalid note ID format' });
    return;
  }

  if (!notebookId || typeof notebookId !== 'string' || !isValidUUID(notebookId)) {
    res.status(400).json({ error: 'Valid target notebookId is required' });
    return;
  }

  try {
    const sql = requireDB();

    // Verify the target notebook belongs to the user
    const nb = await sql`
      SELECT id FROM notebooks WHERE id = ${notebookId} AND user_id = ${req.user!.id}
    `;
    if (nb.length === 0) {
      res.status(404).json({ error: 'Target notebook not found' });
      return;
    }

    const result = await sql`
      UPDATE notes SET notebook_id = ${notebookId}
      WHERE id = ${id} AND user_id = ${req.user!.id}
      RETURNING id, notebook_id, title, is_public, public_slug, created_at, updated_at
    `;

    if (result.length === 0) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    res.json(result[0]);
  } catch (error: any) {
    console.error('Move note error:', error.message);
    res.status(500).json({ error: 'Failed to move note' });
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

// POST /api/notes/:id/version — save a version snapshot
router.post('/:id/version', requireAuth, refreshPlan, async (req: AuthRequest, res) => {
  const { id } = req.params;

  try {
    const sql = requireDB();

    // Check plan — version history requires Pro
    if (req.user!.plan === 'free') {
      res.status(403).json({ error: 'Version history requires a Pro plan.' });
      return;
    }

    // Get current note
    const note = await sql`
      SELECT id, title, content FROM notes
      WHERE id = ${id} AND user_id = ${req.user!.id}
    `;
    if (note.length === 0) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    // Atomically compute next version number within the INSERT to avoid race conditions
    const result = await sql`
      INSERT INTO note_versions (note_id, user_id, content, title, version_number)
      VALUES (
        ${id}, ${req.user!.id},
        ${JSON.stringify(note[0].content)}::jsonb,
        ${note[0].title},
        COALESCE((SELECT MAX(version_number) FROM note_versions WHERE note_id = ${id}), 0) + 1
      )
      RETURNING id, version_number, title, created_at
    `;

    res.status(201).json(result[0]);
  } catch (error: any) {
    console.error('Save version error:', error.message);
    res.status(500).json({ error: 'Failed to save version' });
  }
});

// GET /api/notes/:id/versions — list version history
router.get('/:id/versions', requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params;

  try {
    const sql = requireDB();
    const versions = await sql`
      SELECT id, version_number, title, created_at
      FROM note_versions
      WHERE note_id = ${id} AND user_id = ${req.user!.id}
      ORDER BY version_number DESC
      LIMIT 50
    `;
    res.json(versions);
  } catch (error: any) {
    console.error('List versions error:', error.message);
    res.status(500).json({ error: 'Failed to load versions' });
  }
});

// GET /api/notes/:id/versions/:versionId — get specific version content
router.get('/:id/versions/:versionId', requireAuth, async (req: AuthRequest, res) => {
  const { id, versionId } = req.params;

  try {
    const sql = requireDB();
    const result = await sql`
      SELECT id, version_number, title, content, created_at
      FROM note_versions
      WHERE id = ${versionId} AND note_id = ${id} AND user_id = ${req.user!.id}
    `;

    if (result.length === 0) {
      res.status(404).json({ error: 'Version not found' });
      return;
    }

    res.json(result[0]);
  } catch (error: any) {
    console.error('Get version error:', error.message);
    res.status(500).json({ error: 'Failed to load version' });
  }
});

// Rate limiter for invite — 20 per 15 minutes per IP
const inviteRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many invitations sent. Please try again later.' },
  validate: { trustProxy: false },
});

// POST /api/notes/:id/invite — send collaboration invitation email
router.post('/:id/invite', requireAuth, refreshPlan, inviteRateLimit, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { email, permission } = req.body;

  if (!email || typeof email !== 'string') {
    res.status(400).json({ error: 'Email is required' });
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({ error: 'Invalid email format' });
    return;
  }

  const perm = permission === 'view' ? 'view' : 'edit';

  if (!isEmailConfigured()) {
    res.status(501).json({ error: 'Email service is not configured' });
    return;
  }

  try {
    const sql = requireDB();

    // Check plan — collaboration requires Pro/Team
    if (req.user!.plan === 'free') {
      res.status(403).json({ error: 'Collaboration requires a Pro or Team plan.' });
      return;
    }

    // Verify note ownership
    const note = await sql`
      SELECT id, title FROM notes WHERE id = ${id} AND user_id = ${req.user!.id}
    `;
    if (note.length === 0) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    // Can't invite yourself
    if (email.toLowerCase() === req.user!.email.toLowerCase()) {
      res.status(400).json({ error: 'You cannot invite yourself' });
      return;
    }

    // Check for existing pending invite
    const existingInvite = await sql`
      SELECT id FROM collaboration_invites
      WHERE note_id = ${id} AND invitee_email = ${email.toLowerCase()} AND status = 'pending' AND expires_at > NOW()
    `;
    if (existingInvite.length > 0) {
      res.status(409).json({ error: 'An invitation has already been sent to this email' });
      return;
    }

    // Check if already a collaborator
    const existingCollab = await sql`
      SELECT c.id FROM collaborators c
      JOIN users u ON u.id = c.user_id
      WHERE c.note_id = ${id} AND u.email = ${email.toLowerCase()}
    `;
    if (existingCollab.length > 0) {
      res.status(409).json({ error: 'This user is already a collaborator on this note' });
      return;
    }

    // Look up invitee user (may not exist yet)
    const invitee = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase()}`;
    const inviteeId = invitee.length > 0 ? invitee[0].id : null;

    // Get inviter display name
    const inviter = await sql`SELECT display_name, email FROM users WHERE id = ${req.user!.id}`;
    const inviterName = inviter[0].display_name || inviter[0].email;

    // Create invitation
    const inviteToken = crypto.randomBytes(32).toString('hex');
    await sql`
      INSERT INTO collaboration_invites (note_id, inviter_id, invitee_email, invitee_id, permission, token)
      VALUES (${id}, ${req.user!.id}, ${email.toLowerCase()}, ${inviteeId}, ${perm}, ${inviteToken})
    `;

    // Send invitation email
    await sendCollaborationInviteEmail(
      email.toLowerCase(),
      inviteToken,
      inviterName,
      note[0].title,
      perm,
      getFrontendUrl(req),
    );

    res.json({ message: 'Invitation sent successfully' });
  } catch (error: any) {
    console.error('Send invite error:', error.message);
    res.status(500).json({ error: 'Failed to send invitation' });
  }
});

// POST /api/notes/accept-invite — accept a collaboration invitation
router.post('/accept-invite', requireAuth, async (req: AuthRequest, res) => {
  const { token } = req.body;

  if (!token || typeof token !== 'string') {
    res.status(400).json({ error: 'Invitation token is required' });
    return;
  }

  try {
    const sql = requireDB();

    // Find valid invite
    const invite = await sql`
      SELECT id, note_id, inviter_id, invitee_email, permission
      FROM collaboration_invites
      WHERE token = ${token} AND status = 'pending' AND expires_at > NOW()
    `;

    if (invite.length === 0) {
      res.status(400).json({ error: 'Invalid or expired invitation' });
      return;
    }

    const inv = invite[0];

    // Verify invitee matches the current user
    if (inv.invitee_email !== req.user!.email.toLowerCase()) {
      res.status(403).json({ error: 'This invitation was sent to a different email address' });
      return;
    }

    // Check if already a collaborator
    const existing = await sql`
      SELECT id FROM collaborators WHERE note_id = ${inv.note_id} AND user_id = ${req.user!.id}
    `;
    if (existing.length > 0) {
      // Update invite status and return success
      await sql`UPDATE collaboration_invites SET status = 'accepted' WHERE id = ${inv.id}`;
      res.json({ message: 'You are already a collaborator on this note', noteId: inv.note_id });
      return;
    }

    // Add as collaborator
    await sql`
      INSERT INTO collaborators (note_id, user_id, permission)
      VALUES (${inv.note_id}, ${req.user!.id}, ${inv.permission})
    `;

    // Mark invite as accepted
    await sql`UPDATE collaboration_invites SET status = 'accepted', invitee_id = ${req.user!.id} WHERE id = ${inv.id}`;

    res.json({ message: 'Invitation accepted', noteId: inv.note_id });
  } catch (error: any) {
    console.error('Accept invite error:', error.message);
    res.status(500).json({ error: 'Failed to accept invitation' });
  }
});

// GET /api/notes/:id/collaborators — list collaborators on a note
router.get('/:id/collaborators', requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params;

  try {
    const sql = requireDB();

    // Verify note ownership
    const note = await sql`SELECT id FROM notes WHERE id = ${id} AND user_id = ${req.user!.id}`;
    if (note.length === 0) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    const collaborators = await sql`
      SELECT c.id, c.permission, c.created_at, u.email, u.display_name
      FROM collaborators c
      JOIN users u ON u.id = c.user_id
      WHERE c.note_id = ${id}
      ORDER BY c.created_at DESC
    `;

    const pendingInvites = await sql`
      SELECT id, invitee_email, permission, created_at, expires_at
      FROM collaboration_invites
      WHERE note_id = ${id} AND status = 'pending' AND expires_at > NOW()
      ORDER BY created_at DESC
    `;

    res.json({ collaborators, pendingInvites });
  } catch (error: any) {
    console.error('List collaborators error:', error.message);
    res.status(500).json({ error: 'Failed to load collaborators' });
  }
});

// DELETE /api/notes/:id/collaborators/:collabId — remove a collaborator
router.delete('/:id/collaborators/:collabId', requireAuth, async (req: AuthRequest, res) => {
  const { id, collabId } = req.params;

  try {
    const sql = requireDB();

    // Verify note ownership
    const note = await sql`SELECT id FROM notes WHERE id = ${id} AND user_id = ${req.user!.id}`;
    if (note.length === 0) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    const result = await sql`
      DELETE FROM collaborators WHERE id = ${collabId} AND note_id = ${id}
      RETURNING id
    `;
    if (result.length === 0) {
      res.status(404).json({ error: 'Collaborator not found' });
      return;
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Remove collaborator error:', error.message);
    res.status(500).json({ error: 'Failed to remove collaborator' });
  }
});

export default router;
