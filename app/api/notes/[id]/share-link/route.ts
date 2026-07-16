import { NextRequest, NextResponse } from "next/server";
import { pool, initDb } from "../../../../lib/db";
import { getSessionUser } from "../../../../lib/auth";

// Generate or update public link
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const userId = await getSessionUser();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: noteId } = await params;
    const body = await request.json();
    const { role = 'viewer', generateNew = false } = body; // role can be 'viewer' or 'editor', generateNew to reset link

    // Check if user owns the note
    const ownerCheck = await pool.query("SELECT user_id, public_link_id FROM notes WHERE id = $1", [noteId]);
    if (ownerCheck.rows.length === 0 || ownerCheck.rows[0].user_id !== userId) {
      return NextResponse.json({ error: "Forbidden - Only owner can share via link" }, { status: 403 });
    }

    let publicLinkId = ownerCheck.rows[0].public_link_id;
    
    if (generateNew || !publicLinkId) {
      publicLinkId = crypto.randomUUID();
    }

    await pool.query(`
      UPDATE notes 
      SET public_link_id = $1, public_role = $2 
      WHERE id = $3
    `, [publicLinkId, role, noteId]);

    return NextResponse.json({ success: true, publicLinkId, role });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// Disable public link
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const userId = await getSessionUser();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: noteId } = await params;

    // Check if user owns the note
    const ownerCheck = await pool.query("SELECT user_id FROM notes WHERE id = $1", [noteId]);
    if (ownerCheck.rows.length === 0 || ownerCheck.rows[0].user_id !== userId) {
      return NextResponse.json({ error: "Forbidden - Only owner can disable link" }, { status: 403 });
    }

    await pool.query(`
      UPDATE notes 
      SET public_link_id = NULL, public_role = NULL 
      WHERE id = $1
    `, [noteId]);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
