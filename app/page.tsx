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

  const [notesBackup, setNotesBackup] = useState<Note[] | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const handleUndo = () => {
    if (notesBackup) {
      setNotes(notesBackup);
    }
    setShowToast(false);
    setNotesBackup(null);
  };

  const handleNoteUpdate = (updated: Note) => {
    setNotes(prev => {
      const exists = prev.some(n => n.id === updated.id);
      if (exists) {
        return prev.map(n => n.id === updated.id ? updated : n);
      } else {
        return [...prev, updated];
      }
    });
    if (activeNoteId === "new") {
      setActiveNoteId(updated.id);
    }
  };

  const handleNoteDelete = (id: string) => {
    setNotesBackup(notes);
    setNotes(prev => prev.filter(n => n.id !== id));
    setToastMessage("Note moved to bin");
    setShowToast(true);
    if (activeNoteId === id) {
      setActiveNoteId(null);
    }
  };

  const handleNotesBulkDelete = (ids: string[]) => {
    setNotesBackup(notes);
    setNotes(prev => prev.filter(n => !ids.includes(n.id)));
    setToastMessage(ids.length === 1 ? "Note moved to bin" : `${ids.length} notes moved to bin`);
    setShowToast(true);
    if (activeNoteId && ids.includes(activeNoteId)) {
      setActiveNoteId(null);
    }
  };

  if (loading) {
    const skeletonColors = ['bg-card-coral', 'bg-card-yellow', 'bg-card-blue', 'bg-card-purple', 'bg-card-green', 'bg-card-pink'];
    const skeletonCols = [
      [{ h: 160, color: 0, lines: 4 }, { h: 200, color: 3, lines: 6 }, { h: 130, color: 1, lines: 3 }],
      [{ h: 190, color: 2, lines: 5 }, { h: 140, color: 4, lines: 3 }, { h: 170, color: 0, lines: 4 }],
      [{ h: 150, color: 5, lines: 4 }, { h: 180, color: 1, lines: 5 }, { h: 140, color: 2, lines: 3 }],
      [{ h: 180, color: 4, lines: 5 }, { h: 130, color: 3, lines: 3 }, { h: 160, color: 5, lines: 4 }],
      [{ h: 140, color: 1, lines: 3 }, { h: 170, color: 0, lines: 5 }, { h: 150, color: 2, lines: 4 }],
    ];

    return (
      <div className="w-full h-screen bg-app-bg overflow-hidden flex justify-center">
        <div className="bg-app-bg text-text-light h-full w-full p-6 md:p-12 overflow-hidden flex flex-col font-poppins max-w-[1200px]">
          <div className="flex justify-between items-center mb-8 pt-4">
            <div className="w-12 h-12 rounded-full skeleton-dark" />
            <div className="flex items-center gap-3">
              <div className="skeleton-dark h-5 w-28 rounded-md" />
              <div className="w-12 h-12 rounded-full skeleton-dark" />
            </div>
          </div>

          <div className="mb-6 hidden md:block">
            <div className="skeleton-dark h-12 w-56 rounded-lg" />
          </div>

          <div className="mb-8">
            <div className="skeleton-dark h-12 w-full rounded-full" />
          </div>

          <div className="flex items-start w-full gap-4 md:gap-6">
            {skeletonCols.map((col, colIndex) => (
              <div 
                key={colIndex} 
                className={`flex-1 flex-col gap-4 md:gap-6 min-w-0 ${
                  colIndex < 2 ? 'flex' : colIndex < 4 ? 'hidden md:flex' : 'hidden lg:flex'
                }`}
              >
                {col.map((card, cardIndex) => (
                <div 
                  key={cardIndex} 
                  className="rounded-2xl p-4 flex flex-col gap-2 opacity-60 skeleton-card-cycle"
                  style={{ 
                    height: `${card.h}px`,
                    animationDelay: `${-(colIndex * 1.6 + cardIndex * 2.1)}s`
                  }}
                >
                  <div className="skeleton-line h-4 w-3/5 mb-1" />
                  {Array.from({ length: card.lines }).map((_, i) => (
                    <div 
                      key={i} 
                      className="skeleton-line h-3" 
                      style={{ width: i === card.lines - 1 ? '40%' : `${90 - i * 8}%` }} 
                    />
                  ))}
                </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-app-bg text-text-light font-poppins relative overscroll-none">
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
          onNoteDelete={handleNoteDelete}
          onNotesBulkDelete={handleNotesBulkDelete}
        />
      </motion.div>

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
              <NoteEditor note={activeNote} onClose={() => setActiveNoteId(null)} onUpdateNote={handleNoteUpdate} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-neutral-900/95 backdrop-blur-md border border-white/10 px-6 py-3 rounded-full flex items-center justify-between gap-6 shadow-2xl text-white select-none min-w-[280px]"
          >
            <span className="text-sm font-medium">{toastMessage}</span>
            <button
              onClick={handleUndo}
              className="text-yellow-400 font-bold hover:text-yellow-300 transition-colors cursor-pointer text-sm"
            >
              Undo
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
