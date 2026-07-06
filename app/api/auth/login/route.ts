import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { pool, initDb } from "../../../lib/db";
import { verifyPassword, createSessionToken } from "../../../lib/auth";

export async function POST(request: NextRequest) {
  try {
    await initDb();
    const { username, password } = await request.json();
    
    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
    }

    const result = await pool.query("SELECT * FROM users WHERE username = $1", [username.toLowerCase()]);
    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }

    const user = result.rows[0];
    if (!user.password_hash) {
      return NextResponse.json({ error: "Use Google to sign in to this account" }, { status: 401 });
    }

    const isMatch = verifyPassword(password, user.password_hash);
    if (!isMatch) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }

    const sessionToken = createSessionToken(user.id);
    
    const cookieStore = await cookies();
    cookieStore.set("session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/"
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
