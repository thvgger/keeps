import { NextRequest, NextResponse } from "next/server";
import { pool, initDb } from "../../../../lib/db";
import { getSessionUser } from "../../../../lib/auth";

// Get collaborators for a note
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const userId = await getSessionUser();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: noteId } = await params;

    // Check if user owns the note or is a collaborator
    const accessCheck = await pool.query(`
      SELECT n.user_id, c.role as collaborator_role
      FROM notes n
      LEFT JOIN note_collaborators c ON n.id = c.note_id AND c.user_id = $2
      WHERE n.id = $1
    `, [noteId, userId]);

    if (accessCheck.rows.length === 0) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    if (accessCheck.rows[0].user_id !== userId && !accessCheck.rows[0].collaborator_role) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await pool.query(`
      SELECT c.user_id, c.role, u.username, u.email, u.avatar_url
      FROM note_collaborators c
      JOIN users u ON c.user_id = u.id
      WHERE c.note_id = $1
    `, [noteId]);

    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// Add a collaborator
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const userId = await getSessionUser();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: noteId } = await params;
    const body = await request.json();
    const { emailOrUsername, role = 'viewer' } = body;

    if (!emailOrUsername) {
      return NextResponse.json({ error: "Missing email or username" }, { status: 400 });
    }

    // Check if user owns the note
    const ownerCheck = await pool.query("SELECT user_id FROM notes WHERE id = $1", [noteId]);
    if (ownerCheck.rows.length === 0 || ownerCheck.rows[0].user_id !== userId) {
      return NextResponse.json({ error: "Forbidden - Only owner can share" }, { status: 403 });
    }

    // Find the user to share with
    const userToShareWith = await pool.query(`
      SELECT id FROM users 
      WHERE email = $1 OR username = $1
    `, [emailOrUsername]);

    if (userToShareWith.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const targetUserId = userToShareWith.rows[0].id;
    if (targetUserId === userId) {
      return NextResponse.json({ error: "Cannot share with yourself" }, { status: 400 });
    }

    // Upsert collaborator
    await pool.query(`
      INSERT INTO note_collaborators (note_id, user_id, role)
      VALUES ($1, $2, $3)
      ON CONFLICT (note_id, user_id) DO UPDATE SET role = $3
    `, [noteId, targetUserId, role]);

    return NextResponse.json({ success: true, targetUserId, role });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// Remove a collaborator
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const userId = await getSessionUser();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: noteId } = await params;
    const body = await request.json();
    const { targetUserId } = body;

    if (!targetUserId) {
      return NextResponse.json({ error: "Missing targetUserId" }, { status: 400 });
    }

    // Check if user owns the note
    const ownerCheck = await pool.query("SELECT user_id FROM notes WHERE id = $1", [noteId]);
    if (ownerCheck.rows.length === 0 || ownerCheck.rows[0].user_id !== userId) {
      // User can remove themselves
      if (userId !== targetUserId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    await pool.query(`
      DELETE FROM note_collaborators 
      WHERE note_id = $1 AND user_id = $2
    `, [noteId, targetUserId]);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
