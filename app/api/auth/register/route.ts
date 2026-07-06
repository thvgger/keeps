import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { pool, initDb } from "../../../lib/db";
import { hashPassword } from "../../../lib/auth";

export async function POST(request: NextRequest) {
  try {
    await initDb();
    const { username, password } = await request.json();
    
    if (!username || !password || username.trim() === "" || password.trim() === "") {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
    }

    const checkUser = await pool.query("SELECT id FROM users WHERE username = $1", [username.toLowerCase()]);
    if (checkUser.rows.length > 0) {
      return NextResponse.json({ error: "Username already exists" }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const hashedPassword = hashPassword(password);

    await pool.query(
      "INSERT INTO users (id, username, password_hash) VALUES ($1, $2, $3)",
      [id, username.toLowerCase(), hashedPassword]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
