import { NextRequest, NextResponse } from "next/server";
import { pool, initDb } from "../../lib/db";
import { getSessionUser } from "../../lib/auth";
import { notesEmitter } from "./stream/route";

export async function GET() {
  try {
    await initDb();
    const userId = await getSessionUser();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await pool.query(`
      SELECT n.*, c.role as collaborator_role,
        EXISTS (
          SELECT 1 FROM note_collaborators nc WHERE nc.note_id = n.id
        ) as has_collaborators
      FROM notes n
      LEFT JOIN note_collaborators c ON n.id = c.note_id AND c.user_id = $1
      WHERE n.user_id = $1 OR c.user_id = $1
      ORDER BY n.created_at ASC
    `, [userId]);
    const notes = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      color: row.color,
      font: row.font || "Inter",
      paragraphs: row.paragraphs || [],
      listItems: row.list_items || null,
      orderedListItems: row.ordered_list_items || null,
      interactivePrompt: row.interactive_prompt || null,
      htmlContent: row.html_content || null,
      role: row.user_id === userId ? "owner" : row.collaborator_role,
      publicLinkId: row.public_link_id || null,
      publicRole: row.public_role || null,
      isShared: row.has_collaborators || row.public_link_id != null
    }));
    return NextResponse.json(notes);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await initDb();
    const userId = await getSessionUser();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, title, color, font, paragraphs, listItems, orderedListItems, interactivePrompt, htmlContent } = body;

    const checkResult = await pool.query(`
      SELECT n.user_id, c.role as collaborator_role
      FROM notes n
      LEFT JOIN note_collaborators c ON n.id = c.note_id AND c.user_id = $2
      WHERE n.id = $1
    `, [id, userId]);

    let ownerId = userId;
    if (checkResult.rows.length > 0) {
      const row = checkResult.rows[0];
      if (row.user_id !== userId && row.collaborator_role !== 'editor') {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      ownerId = row.user_id; // Keep the original owner
    }
    
    await pool.query(
      `INSERT INTO notes (id, title, color, font, paragraphs, list_items, ordered_list_items, interactive_prompt, html_content, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO UPDATE SET
         title = $2,
         color = $3,
         font = $4,
         paragraphs = $5,
         list_items = $6,
         ordered_list_items = $7,
         interactive_prompt = $8,
         html_content = $9,
         updated_at = CURRENT_TIMESTAMP`,
      [
        id,
        title || "",
        color || "bg-new-note-bg",
        font || "Inter",
        paragraphs || [],
        listItems ? JSON.stringify(listItems) : null,
        orderedListItems || null,
        interactivePrompt || null,
        htmlContent || null,
        ownerId
      ]
    );
    
    notesEmitter.emit("update", { userId, type: "notes-updated" });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await initDb();
    const userId = await getSessionUser();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, title, color, font, paragraphs, listItems, orderedListItems, interactivePrompt } = body;

    const checkResult = await pool.query(`
      SELECT n.user_id, c.role as collaborator_role
      FROM notes n
      LEFT JOIN note_collaborators c ON n.id = c.note_id AND c.user_id = $2
      WHERE n.id = $1
    `, [id, userId]);

    let ownerId = userId;
    if (checkResult.rows.length > 0) {
      const row = checkResult.rows[0];
      if (row.user_id !== userId && row.collaborator_role !== 'editor') {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      ownerId = row.user_id; // Keep the original owner
    }
    
    await pool.query(
      `INSERT INTO notes (id, title, color, font, paragraphs, list_items, ordered_list_items, interactive_prompt, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         title = $2,
         color = $3,
         font = $4,
         paragraphs = $5,
         list_items = $6,
         ordered_list_items = $7,
         interactive_prompt = $8,
         updated_at = CURRENT_TIMESTAMP`,
      [
        id,
        title || "",
        color || "bg-new-note-bg",
        font || "Inter",
        paragraphs || [],
        listItems ? JSON.stringify(listItems) : null,
        orderedListItems || null,
        interactivePrompt || null,
        ownerId
      ]
    );
    
    notesEmitter.emit("update", { userId, type: "notes-updated" });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await initDb();
    const userId = await getSessionUser();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { ids } = body;
    
    if (ids && Array.isArray(ids)) {
      await pool.query("DELETE FROM notes WHERE id = ANY($1) AND user_id = $2", [ids, userId]);
    }
    
    notesEmitter.emit("update", { userId, type: "notes-updated" });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
