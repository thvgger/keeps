import { Liveblocks } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "../../lib/auth";
import { pool, initDb } from "../../lib/db";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY as string,
});

export async function POST(request: NextRequest) {
  try {
    await initDb();
    const userId = await getSessionUser();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { room } = await request.json(); // noteId
    
    // Check if user has access to this room (note)
    const accessCheck = await pool.query(`
      SELECT n.user_id, c.role as collaborator_role
      FROM notes n
      LEFT JOIN note_collaborators c ON n.id = c.note_id AND c.user_id = $2
      WHERE n.id = $1
    `, [room, userId]);

    if (accessCheck.rows.length === 0) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    const row = accessCheck.rows[0];
    if (row.user_id !== userId && !row.collaborator_role) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userInfo = await pool.query("SELECT username, avatar_url, email FROM users WHERE id = $1", [userId]);
    const { username, avatar_url, email } = userInfo.rows[0];

    const session = liveblocks.prepareSession(
      userId,
      { userInfo: { name: username || email, avatar: avatar_url } }
    );

    // Read access for everyone who can access the note.
    const hasWriteAccess = row.user_id === userId || row.collaborator_role === "editor";

    if (hasWriteAccess) {
      session.allow(room, session.FULL_ACCESS);
    } else {
      session.allow(room, session.READ_ACCESS);
    }

    const { status, body } = await session.authorize();
    return new NextResponse(body, { status });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
