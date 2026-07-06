import { NextResponse } from "next/server";
import { pool, initDb } from "../../../lib/db";
import { getSessionUser } from "../../../lib/auth";

export async function GET() {
  try {
    await initDb();
    const userId = await getSessionUser();
    if (!userId) {
      return NextResponse.json({ user: null });
    }

    const result = await pool.query("SELECT username, email, avatar_url FROM users WHERE id = $1", [userId]);
    if (result.rows.length === 0) {
      return NextResponse.json({ user: null });
    }

    const user = result.rows[0];
    return NextResponse.json({
      user: {
        username: user.username,
        email: user.email,
        avatarUrl: user.avatar_url
      }
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
