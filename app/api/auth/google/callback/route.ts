import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { pool, initDb } from "../../../../lib/db";
import { createSessionToken } from "../../../../lib/auth";

export async function GET(request: NextRequest) {
  try {
    await initDb();
    const code = request.nextUrl.searchParams.get("code");
    if (!code) {
      return NextResponse.redirect(`${request.nextUrl.origin}/?error=no_code`);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${request.nextUrl.origin}/api/auth/google/callback`;

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId || "",
        client_secret: clientSecret || "",
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json();
    if (tokenData.error) {
      return NextResponse.redirect(`${request.nextUrl.origin}/?error=token_exchange_failed`);
    }

    const { access_token } = tokenData;

    const userinfoResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const profile = await userinfoResponse.json();
    const { sub, email, name, picture } = profile;

    if (!sub || !email) {
      return NextResponse.redirect(`${request.nextUrl.origin}/?error=invalid_profile`);
    }

    let userResult = await pool.query("SELECT * FROM users WHERE google_id = $1 OR email = $2", [sub, email]);
    let userId = "";

    if (userResult.rows.length === 0) {
      userId = crypto.randomUUID();
      await pool.query(
        "INSERT INTO users (id, email, google_id, avatar_url) VALUES ($1, $2, $3, $4)",
        [userId, email, sub, picture || null]
      );
    } else {
      const user = userResult.rows[0];
      userId = user.id;
      if (!user.google_id || user.avatar_url !== picture) {
        await pool.query(
          "UPDATE users SET google_id = $1, avatar_url = $2 WHERE id = $3",
          [sub, picture || null, userId]
        );
      }
    }

    const sessionToken = createSessionToken(userId);
    const cookieStore = await cookies();
    cookieStore.set("session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return NextResponse.redirect(request.nextUrl.origin);
  } catch (error) {
    return NextResponse.redirect(`${request.nextUrl.origin}/?error=callback_error`);
  }
}
