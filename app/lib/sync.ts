import { getSyncQueue, removeFromSyncQueue, saveLocalNote, clearLocalNotes } from "./indexedDb";
import { Note } from "./data";

export async function syncOfflineChanges(onSyncSuccess?: (notes: Note[]) => void): Promise<boolean> {
  if (typeof window === "undefined" || !navigator.onLine) {
    return false;
  }

  try {
    const queue = await getSyncQueue();
    if (queue.length === 0) {
      const res = await fetch("/api/notes");
      if (res.ok) {
        const notes: Note[] = await res.json();
        if (Array.isArray(notes)) {
          await clearLocalNotes();
          for (const note of notes) {
            await saveLocalNote(note);
          }
          onSyncSuccess?.(notes);
          return true;
        }
      }
      return false;
    }

    const sortedQueue = [...queue].sort((a, b) => a.timestamp - b.timestamp);

    for (const item of sortedQueue) {
      if (item.action === "CREATE_OR_UPDATE" && item.noteData) {
        const res = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item.noteData)
        });
        if (!res.ok) {
          return false;
        }
      } else if (item.action === "DELETE") {
        const res = await fetch("/api/notes", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: [item.noteId] })
        });
        if (!res.ok) {
          return false;
        }
      }

      if (item.id !== undefined) {
        await removeFromSyncQueue(item.id);
      }
    }

    const res = await fetch("/api/notes");
    if (res.ok) {
      const notes: Note[] = await res.json();
      if (Array.isArray(notes)) {
        await clearLocalNotes();
        for (const note of notes) {
          await saveLocalNote(note);
        }
        onSyncSuccess?.(notes);
        return true;
      }
    }
    return true;
  } catch (err) {
    console.error("Sync error:", err);
    return false;
  }
}
