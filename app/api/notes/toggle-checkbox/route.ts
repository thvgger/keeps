import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "../../../lib/auth";
import { pool, initDb } from "../../../lib/db";
import { Liveblocks } from "@liveblocks/node";
import * as Y from "yjs";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY as string,
});

export async function POST(req: NextRequest) {
  try {
    await initDb();
    const userId = await getSessionUser();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { noteId, checkboxIndex, newValue } = await req.json();

    if (!noteId || typeof checkboxIndex !== "number") {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // Verify access
    const accessCheck = await pool.query(
      `SELECT n.user_id, c.role as collaborator_role 
       FROM notes n
       LEFT JOIN note_collaborators c ON n.id = c.note_id AND c.user_id = $2
       WHERE n.id = $1`,
      [noteId, userId]
    );

    if (accessCheck.rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const row = accessCheck.rows[0];
    const hasWriteAccess = row.user_id === userId || row.collaborator_role === "editor";
    if (!hasWriteAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 1. Fetch the Yjs document from Liveblocks
    let ydoc;
    try {
      ydoc = await liveblocks.getYjsDocumentAsBinaryUpdate(noteId);
    } catch (e) {
      return NextResponse.json({ error: "Room not initialized" }, { status: 404 });
    }

    const doc = new Y.Doc();
    Y.applyUpdate(doc, new Uint8Array(ydoc));

    // TipTap uses an XmlFragment named 'default'
    const xmlFragment = doc.getXmlFragment("default");
    
    // We need to traverse the XML to find all taskItems in order.
    let currentIndex = 0;
    let targetElement: Y.XmlElement | null = null;

    const traverse = (element: Y.XmlText | Y.XmlElement | Y.XmlFragment | Y.XmlHook) => {
      if (element instanceof Y.XmlElement) {
        if (element.nodeName === "taskItem") {
          if (currentIndex === checkboxIndex) {
            targetElement = element;
            return true; // stop traversing
          }
          currentIndex++;
        }
        for (let i = 0; i < element.length; i++) {
          const child = element.get(i);
          if (traverse(child)) return true;
        }
      } else if (element instanceof Y.XmlFragment) {
        for (let i = 0; i < element.length; i++) {
          const child = element.get(i);
          if (traverse(child)) return true;
        }
      }
      return false;
    };

    traverse(xmlFragment);

    if (targetElement) {
      // Toggle the checked attribute
      (targetElement as Y.XmlElement).setAttribute("checked", newValue ? "true" : "false");
      
      // 2. Send the update back to Liveblocks
      const update = Y.encodeStateAsUpdate(doc);
      await liveblocks.sendYjsBinaryUpdate(noteId, update);

      // 3. Optional: Sync back to Postgres HTML
      const noteRes = await pool.query("SELECT html_content FROM notes WHERE id = $1", [noteId]);
      let html = noteRes.rows[0]?.html_content || "";
      
      let matchCount = 0;
      html = html.replace(/(<li\s+[^>]*data-type=["']taskItem["'][^>]*>)/gi, (match: string) => {
        if (matchCount === checkboxIndex) {
          matchCount++;
          match = match.replace(/\sdata-checked=["'][^"']*["']/i, '');
          return match.replace(/<li/, `<li data-checked="${newValue}"`);
        }
        matchCount++;
        return match;
      });
      
      let inputCount = 0;
      html = html.replace(/(<input\s+[^>]*type=["']checkbox["'][^>]*>)/gi, (match: string) => {
        if (inputCount === checkboxIndex) {
          inputCount++;
          match = match.replace(/\schecked(=["'][^"']*["'])?/i, '');
          if (newValue) {
            return match.replace(/<input/, `<input checked="checked"`);
          }
          return match;
        }
        inputCount++;
        return match;
      });

      await pool.query("UPDATE notes SET html_content = $1, updated_at = NOW() WHERE id = $2", [html, noteId]);
      
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: "Task item not found" }, { status: 404 });
    }
  } catch (error) {
    console.error("Toggle checkbox error:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
