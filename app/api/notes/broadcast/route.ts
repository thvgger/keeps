import { NextResponse } from "next/server";
import { getSessionUser } from "../../../lib/auth";
import { notesEmitter } from "../stream/route";

export async function POST() {
  try {
    const userId = await getSessionUser();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    notesEmitter.emit("update", { userId, type: "notes-updated" });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
