"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "./components/Sidebar";
import NoteEditor from "./components/NoteEditor";
import { Note } from "./lib/data";
import {
  getLocalNotes,
  saveLocalNote,
  deleteLocalNote,
  clearLocalNotes,
  addToSyncQueue,
  removeFromSyncQueue
} from "./lib/indexedDb";
import { syncOfflineChanges } from "./lib/sync";

const CARD_COLORS = [
  "bg-card-coral",
  "bg-card-yellow",
  "bg-card-blue",
  "bg-card-purple",
  "bg-card-green",
  "bg-card-pink",
];

export default function Home() {
  const [currentUser, setCurrentUser] = useState<{ username: string | null; email?: string; avatarUrl?: string } | null>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("keeps_current_user");
      return cached ? JSON.parse(cached) : null;
    }
    return null;
  });
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [notesBackup, setNotesBackup] = useState<Note[] | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const syncTimeoutsRef = useRef<{ [key: string]: ReturnType<typeof setTimeout> }>({});
  const pendingQueueIdsRef = useRef<{ [key: string]: number }>({});

  const [isSignUp, setIsSignUp] = useState(false);
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const [newOauthUsername, setNewOauthUsername] = useState("");
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [oauthSubmitting, setOauthSubmitting] = useState(false);

  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("/sw.js").catch(console.error);
      }
    }

    const handleOnline = async () => {
      setIsOnline(true);
      setIsSyncing(true);
      await syncOfflineChanges((syncedNotes) => {
        setNotes(syncedNotes);
      });
      try {
        const res = await fetch("/api/notes");
        if (res.ok) {
          const notesData = await res.json();
          if (Array.isArray(notesData)) {
            await clearLocalNotes();
            for (const note of notesData) {
              await saveLocalNote(note);
            }
            setNotes(notesData);
          }
        }
      } catch (err) {
        console.error("Catch-up fetch failed:", err);
      } finally {
        setIsSyncing(false);
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setCurrentUser(data.user);
            localStorage.setItem("keeps_current_user", JSON.stringify(data.user));
            const local = await getLocalNotes();
            if (local && local.length > 0) {
              setNotes(local);
            }
            if (navigator.onLine) {
              setIsSyncing(true);
              await syncOfflineChanges((syncedNotes) => {
                setNotes(syncedNotes);
              });
              setIsSyncing(false);
            }
          } else {
            setCurrentUser(null);
            localStorage.removeItem("keeps_current_user");
          }
        } else if (res.status === 401) {
          setCurrentUser(null);
          localStorage.removeItem("keeps_current_user");
        }
      } catch (err) {
        console.error("Auth check failed (network/offline):", err);
        const local = await getLocalNotes();
        if (local && local.length > 0) {
          setNotes(local);
        }
      } finally {
        setCheckingAuth(false);
        setLoading(false);
      }
    }
    checkAuth();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!currentUser || !currentUser.username) return;

    const eventSource = new EventSource("/api/notes/stream");

    eventSource.onopen = async () => {
      if (navigator.onLine) {
        setIsSyncing(true);
        try {
          const res = await fetch("/api/notes");
          if (res.ok) {
            const notesData = await res.json();
            if (Array.isArray(notesData)) {
              await clearLocalNotes();
              for (const note of notesData) {
                await saveLocalNote(note);
              }
              setNotes(notesData);
            }
          }
        } catch (err) {
          console.error("Catch-up fetch failed on stream connect:", err);
        } finally {
          setIsSyncing(false);
        }
      }
    };

    eventSource.onmessage = (event) => {
      if (event.data === "ping") return;
      try {
        const data = JSON.parse(event.data);
        if (data.type === "notes-updated" && navigator.onLine) {
          fetch("/api/notes")
            .then((res) => res.json())
            .then(async (notesData) => {
              const hasPending = Object.keys(syncTimeoutsRef.current).length > 0 || Object.keys(pendingQueueIdsRef.current).length > 0;
              if (hasPending) {
                return;
              }
              if (Array.isArray(notesData)) {
                await clearLocalNotes();
                for (const note of notesData) {
                  await saveLocalNote(note);
                }
                setNotes(notesData);
              }
            });
        }
      } catch (err) {
        console.error("Error parsing stream message", err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [currentUser]);

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const [newNoteColor, setNewNoteColor] = useState(() => {
    const randomIndex = Math.floor(Math.random() * CARD_COLORS.length);
    return CARD_COLORS[randomIndex];
  });
  const recentColorsRef = useRef<string[]>([newNoteColor]);

  const activeNote =
    activeNoteId === "new" ? null : notes.find((n) => n.id === activeNoteId);
  const editorColor = activeNote ? activeNote.color : newNoteColor;


  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSubmitting(true);
    
    const endpoint = isSignUp ? "/api/auth/register" : "/api/auth/login";
    
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: authUsername, password: authPassword })
      });
      const data = await res.json();
      
      if (res.ok) {
        if (isSignUp) {
          setIsSignUp(false);
          setAuthPassword("");
          setAuthError("Registration successful! Please login.");
        } else {
          const meRes = await fetch("/api/auth/me");
          const meData = await meRes.json();
          if (meData.user) {
            setCurrentUser(meData.user);
            localStorage.setItem("keeps_current_user", JSON.stringify(meData.user));
            await clearLocalNotes();
            setIsSyncing(true);
            if (navigator.onLine) {
              await syncOfflineChanges((syncedNotes) => {
                setNotes(syncedNotes);
              });
            } else {
              const local = await getLocalNotes();
              setNotes(local);
            }
            setIsSyncing(false);
          }
        }
      } else {
        setAuthError(data.error || "An error occurred");
      }
    } catch (err) {
      setAuthError("Network connection error");
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error(err);
    }
    setCurrentUser(null);
    setNotes([]);
    setActiveNoteId(null);
    localStorage.removeItem("keeps_current_user");
    await clearLocalNotes();
  };

  const handleManualRefresh = async () => {
    setIsSyncing(true);
    if (navigator.onLine) {
      await syncOfflineChanges((syncedNotes) => {
        setNotes(syncedNotes);
      });
      try {
        const res = await fetch("/api/notes");
        if (res.ok) {
          const notesData = await res.json();
          if (Array.isArray(notesData)) {
            await clearLocalNotes();
            for (const note of notesData) {
              await saveLocalNote(note);
            }
            setNotes(notesData);
          }
        }
      } catch (err) {
        console.error("Manual refresh catch-up failed:", err);
      } finally {
        setIsSyncing(false);
      }
    } else {
      const local = await getLocalNotes();
      setNotes(local);
      setIsSyncing(false);
    }
  };

  const handleGoogleSignIn = () => {
    window.location.href = "/api/auth/google/signin";
  };

  const handleUndo = async () => {
    if (!notesBackup) return;
    
    const restoredNotes = notesBackup.filter(
      backupNote => !notes.some(n => n.id === backupNote.id)
    );
    
    setNotes(notesBackup);
    setShowToast(false);
    setNotesBackup(null);
    
    for (const note of restoredNotes) {
      await saveLocalNote(note);
      try {
        const res = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(note)
        });
        if (!res.ok) {
          await addToSyncQueue({ action: "CREATE_OR_UPDATE", noteId: note.id, noteData: note });
        }
      } catch (err) {
        await addToSyncQueue({ action: "CREATE_OR_UPDATE", noteId: note.id, noteData: note });
      }
    }
  };

  const handleNoteUpdate = async (updated: Note) => {
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
    
    await saveLocalNote(updated);

    if (syncTimeoutsRef.current[updated.id]) {
      clearTimeout(syncTimeoutsRef.current[updated.id]);
    }
    if (pendingQueueIdsRef.current[updated.id]) {
      await removeFromSyncQueue(pendingQueueIdsRef.current[updated.id]);
    }

    const queueId = await addToSyncQueue({ action: "CREATE_OR_UPDATE", noteId: updated.id, noteData: updated });
    pendingQueueIdsRef.current[updated.id] = queueId;

    syncTimeoutsRef.current[updated.id] = setTimeout(async () => {
      try {
        const res = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updated)
        });
        if (res.ok) {
          await removeFromSyncQueue(queueId);
          delete pendingQueueIdsRef.current[updated.id];
        }
      } catch (err) {
        // Already in sync queue
      }
      
      delete syncTimeoutsRef.current[updated.id];
    }, 1000);
  };

  const handleNoteDelete = async (id: string) => {
    setNotesBackup(notes);
    setNotes(prev => prev.filter(n => n.id !== id));
    setToastMessage("Note moved to bin");
    setShowToast(true);
    if (activeNoteId === id) {
      setActiveNoteId(null);
    }
    
    await deleteLocalNote(id);

    try {
      const res = await fetch("/api/notes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] })
      });
      if (!res.ok) {
        await addToSyncQueue({ action: "DELETE", noteId: id });
      }
    } catch (err) {
      await addToSyncQueue({ action: "DELETE", noteId: id });
    }
  };

  const handleNotesBulkDelete = async (ids: string[]) => {
    setNotesBackup(notes);
    setNotes(prev => prev.filter(n => !ids.includes(n.id)));
    setToastMessage(ids.length === 1 ? "Note moved to bin" : `${ids.length} notes moved to bin`);
    setShowToast(true);
    if (activeNoteId && ids.includes(activeNoteId)) {
      setActiveNoteId(null);
    }
    
    for (const id of ids) {
      await deleteLocalNote(id);
    }

    try {
      const res = await fetch("/api/notes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids })
      });
      if (!res.ok) {
        for (const id of ids) {
          await addToSyncQueue({ action: "DELETE", noteId: id });
        }
      }
    } catch (err) {
      for (const id of ids) {
        await addToSyncQueue({ action: "DELETE", noteId: id });
      }
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen w-full bg-[#0a0a0a] flex items-center justify-center font-poppins">
        <i className="fa-solid fa-circle-notch animate-spin text-white text-3xl opacity-50"></i>
      </div>
    );
  }

  if (currentUser && loading) {
    const skeletonColors = [
      "bg-card-coral",
      "bg-card-yellow",
      "bg-card-blue",
      "bg-card-purple",
      "bg-card-green",
      "bg-card-pink",
    ];
    const skeletonCols = [
      [
        { h: 160, color: 0, lines: 4 },
        { h: 200, color: 3, lines: 6 },
        { h: 130, color: 1, lines: 3 },
      ],
      [
        { h: 190, color: 2, lines: 5 },
        { h: 140, color: 4, lines: 3 },
        { h: 170, color: 0, lines: 4 },
      ],
      [
        { h: 150, color: 5, lines: 4 },
        { h: 180, color: 1, lines: 5 },
        { h: 140, color: 2, lines: 3 },
      ],
      [
        { h: 180, color: 4, lines: 5 },
        { h: 130, color: 3, lines: 3 },
        { h: 160, color: 5, lines: 4 },
      ],
      [
        { h: 140, color: 1, lines: 3 },
        { h: 170, color: 0, lines: 5 },
        { h: 150, color: 2, lines: 4 },
      ],
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
                  colIndex < 2
                    ? "flex"
                    : colIndex < 4
                      ? "hidden md:flex"
                      : "hidden lg:flex"
                }`}
              >
                {col.map((card, cardIndex) => (
                  <div
                    key={cardIndex}
                    className="rounded-2xl p-4 flex flex-col gap-2 opacity-60 skeleton-card-cycle"
                    style={{
                      height: `${card.h}px`,
                      animationDelay: `${-(colIndex * 1.6 + cardIndex * 2.1)}s`,
                    }}
                  >
                    <div className="skeleton-line h-4 w-3/5 mb-1" />
                    {Array.from({ length: card.lines }).map((_, i) => (
                      <div
                        key={i}
                        className="skeleton-line h-3"
                        style={{
                          width:
                            i === card.lines - 1 ? "40%" : `${90 - i * 8}%`,
                        }}
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

  if (currentUser && !currentUser.username) {
    const handleOauthUsernameSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setOauthError(null);
      setOauthSubmitting(true);
      try {
        const res = await fetch("/api/auth/setup-username", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: newOauthUsername })
        });
        const data = await res.json();
        if (res.ok) {
          const updatedUser = { ...currentUser!, username: newOauthUsername };
          setCurrentUser(updatedUser);
          localStorage.setItem("keeps_current_user", JSON.stringify(updatedUser));
          const notesRes = await fetch("/api/notes");
          const notesData = await notesRes.json();
          if (Array.isArray(notesData)) {
            setNotes(notesData);
          }
        } else {
          setOauthError(data.error || "An error occurred");
        }
      } catch (err) {
        setOauthError("Network connection error");
      } finally {
        setOauthSubmitting(false);
      }
    };

    return (
      <div className="min-h-screen w-full bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden font-poppins">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-neutral-900/60 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl z-10 flex flex-col gap-6"
        >
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-extrabold text-white text-center">
              Choose Username
            </h1>
            <p className="text-gray-400 text-xs text-center font-medium">
              Choose a unique username to complete your Google account registration
            </p>
          </div>

          <form onSubmit={handleOauthUsernameSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-gray-400 text-xs font-bold uppercase tracking-wider pl-1">Username</label>
              <input 
                type="text"
                required
                value={newOauthUsername}
                onChange={(e) => setNewOauthUsername(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all font-medium"
                placeholder="Choose a username"
              />
            </div>

            {oauthError && (
              <p className="text-red-400 text-xs font-bold text-center pl-1">
                {oauthError}
              </p>
            )}

            <button 
              type="submit"
              disabled={oauthSubmitting}
              className="w-full py-3 bg-white hover:bg-neutral-200 active:scale-[0.98] text-black font-bold rounded-xl transition-all shadow-lg text-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {oauthSubmitting ? (
                <i className="fa-solid fa-circle-notch animate-spin text-base"></i>
              ) : (
                "Save & Continue"
              )}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen w-full bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden font-poppins">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-neutral-900/60 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl z-10 flex flex-col gap-6"
        >
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-extrabold text-white text-center">
              keeps
            </h1>
            <p className="text-gray-400 text-xs text-center font-medium">
              {isSignUp ? "Create an account to start taking notes" : "Sign in to access your notes"}
            </p>
          </div>

          <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-gray-400 text-xs font-bold uppercase tracking-wider pl-1">Username</label>
              <input 
                type="text"
                required
                value={authUsername}
                onChange={(e) => setAuthUsername(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all font-medium"
                placeholder="Enter username"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-gray-400 text-xs font-bold uppercase tracking-wider pl-1">Password</label>
              <input 
                type="password"
                required
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all font-medium"
                placeholder="••••••••"
              />
            </div>

            {authError && (
              <p className="text-red-400 text-xs font-bold text-center pl-1">
                {authError}
              </p>
            )}

            <button 
              type="submit"
              disabled={authSubmitting}
              className="w-full py-3 bg-white hover:bg-neutral-200 active:scale-[0.98] text-black font-bold rounded-xl transition-all shadow-lg text-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {authSubmitting ? (
                <i className="fa-solid fa-circle-notch animate-spin text-base"></i>
              ) : (
                isSignUp ? "Sign Up" : "Log In"
              )}
            </button>
          </form>

          <div className="flex items-center my-1">
            <div className="flex-1 h-[1px] bg-white/10"></div>
            <span className="px-3 text-xs text-gray-500 font-bold uppercase">or</span>
            <div className="flex-1 h-[1px] bg-white/10"></div>
          </div>

          <button 
            onClick={handleGoogleSignIn}
            className="w-full py-3 bg-white/10 border border-white/10 hover:bg-white/15 active:scale-[0.98] text-white font-semibold rounded-xl transition-all text-sm flex items-center justify-center gap-3 cursor-pointer"
          >
            <i className="fa-brands fa-google"></i>
            <span>Continue with Google</span>
          </button>

          <p className="text-center text-xs text-gray-400 font-medium">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}
            <button 
              onClick={() => {
                setIsSignUp(!isSignUp);
                setAuthError(null);
              }}
              className="text-cyan-400 font-bold hover:underline cursor-pointer ml-1"
            >
              {isSignUp ? "Log In" : "Sign Up"}
            </button>
          </p>
        </motion.div>
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
          currentUser={currentUser}
          isOnline={isOnline}
          isSyncing={isSyncing}
          onLogout={handleLogout}
          onRefresh={handleManualRefresh}
          onNoteSelect={(id) => {
            if (id === "new") {
              const available = CARD_COLORS.filter(c => !recentColorsRef.current.includes(c));
              const chosen = available[Math.floor(Math.random() * available.length)] || CARD_COLORS[0];
              recentColorsRef.current.push(chosen);
              if (recentColorsRef.current.length > 4) {
                recentColorsRef.current.shift();
              }
              setNewNoteColor(chosen);
            }
            setActiveNoteId(id);
          }}
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
            className={`absolute inset-0 md:relative md:inset-auto md:flex-1 h-full ${editorColor} overflow-hidden flex justify-center z-20`}
          >
            <div className="w-full h-full">
              <NoteEditor
                note={activeNote}
                defaultColor={newNoteColor}
                onClose={() => window.location.reload()}
                onUpdateNote={handleNoteUpdate}
              />
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
