import { NextRequest, NextResponse } from "next/server";
import { pool, initDb } from "../../../lib/db";
import { getSessionUser } from "../../../lib/auth";

export async function POST(request: NextRequest) {
  try {
    await initDb();
    const userId = await getSessionUser();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { username } = await request.json();
    if (!username || username.trim() === "") {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase();

    const checkResult = await pool.query("SELECT id FROM users WHERE username = $1", [cleanUsername]);
    if (checkResult.rows.length > 0) {
      return NextResponse.json({ error: "Username is already taken" }, { status: 400 });
    }

    await pool.query("UPDATE users SET username = $1 WHERE id = $2", [cleanUsername, userId]);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
