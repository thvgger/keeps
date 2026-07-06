"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "./components/Sidebar";
import NoteEditor from "./components/NoteEditor";
import { Note, fetchNotes } from "./lib/data";

export default function Home() {
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadNotes() {
      const data = await fetchNotes();
      setNotes(data);
      setLoading(false);
    }
    loadNotes();
  }, []);

  const activeNote = activeNoteId === "new" ? null : notes.find(n => n.id === activeNoteId);
  const bgColor = activeNote?.color || "bg-new-note-bg";

  if (loading) {
    return <div className="flex h-screen w-full items-center justify-center bg-app-bg text-white font-poppins">Loading...</div>;
  }

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-app-bg text-text-light font-poppins relative overscroll-none">

      {/* Sidebar Pane */}
      <motion.div
        className="h-full shrink-0 z-10 border-white/5 bg-app-bg max-w-full"
        initial={false}
        animate={{
          width: activeNoteId ? "400px" : "100%",
          borderRightWidth: activeNoteId ? "1px" : "0px",
        }}
        transition={{ type: "spring", bounce: 0, duration: 0.5 }}
      >
        <Sidebar 
          isFullScreen={!activeNoteId} 
          notes={notes}
          onNoteSelect={(id) => setActiveNoteId(id)} 
        />
      </motion.div>

      {/* Main Content Pane (Editor) */}
      <AnimatePresence>
        {activeNoteId && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", bounce: 0, duration: 0.5 }}
            className={`absolute inset-0 md:relative md:inset-auto md:flex-1 h-full ${bgColor} overflow-hidden flex justify-center z-20`}
          >
            <div className="w-full h-full">
              <NoteEditor note={activeNote} onClose={() => setActiveNoteId(null)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
