"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Note } from "../lib/data";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

function SkeletonContent({ note }: { note: Note }) {
  return (
    <div className="flex flex-col gap-2">
      {note.title && <div className="skeleton-line h-4 w-3/5" />}
      {note.listItems ? (
        <div className="flex flex-col gap-2 mt-1">
          {note.listItems.slice(0, 8).map((_, i) => (
            <div
              key={i}
              className="skeleton-line h-6 rounded-full"
              style={{ width: `${70 + Math.sin(i * 2.5) * 20}%` }}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 mt-1">
          {Array.from({
            length: Math.min(
              Math.floor((note.paragraphs?.join(" ").length ?? 0) / 40) + 1,
              6,
            ),
          }).map((_, i, arr) => (
            <div
              key={i}
              className="skeleton-line h-3"
              style={{
                width:
                  i === arr.length - 1
                    ? "45%"
                    : `${85 + Math.sin(i * 3) * 10}%`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({
  isFullScreen = false,
  notes = [],
  onNoteSelect,
  onNoteDelete,
  onNotesBulkDelete,
}: {
  isFullScreen?: boolean;
  notes?: Note[];
  onNoteSelect?: (id: string) => void;
  onNoteDelete?: (id: string) => void;
  onNotesBulkDelete?: (ids: string[]) => void;
}) {
  const containerClasses = isFullScreen
    ? "bg-app-bg text-text-light h-full w-full relative p-6 md:p-12 overflow-y-auto flex flex-col font-poppins mx-auto max-w-[1200px] no-scrollbar"
    : "bg-app-bg text-text-light min-h-screen md:min-h-0 h-full w-full relative p-6 overflow-y-auto flex flex-col font-poppins mx-auto md:mx-0 max-w-md md:max-w-none no-scrollbar";

  const [cols, setCols] = useState(2); // Default to 2 for mobile-first hydration
  const hasAnimated = useRef(false);
  const revealedCards = useRef<Set<string>>(new Set());
  const [, forceUpdate] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [openMenuNoteId, setOpenMenuNoteId] = useState<string | null>(null);

  const handleCardClick = (id: string) => {
    if (selectionMode) {
      setSelectedNoteIds((prev) =>
        prev.includes(id) ? prev.filter((nid) => nid !== id) : [...prev, id],
      );
    } else {
      onNoteSelect?.(id);
    }
  };

  const handleContextSelect = (id: string) => {
    setSelectionMode(true);
    setSelectedNoteIds((prev) =>
      prev.includes(id) ? prev.filter((nid) => nid !== id) : [...prev, id],
    );
  };

  const handleBulkDelete = () => {
    if (onNotesBulkDelete && selectedNoteIds.length > 0) {
      onNotesBulkDelete(selectedNoteIds);
    }
    setSelectionMode(false);
    setSelectedNoteIds([]);
  };

  const handleCancelSelection = () => {
    setSelectionMode(false);
    setSelectedNoteIds([]);
  };

  const handleCardAnimated = useCallback((id: string) => {
    if (!revealedCards.current.has(id)) {
      revealedCards.current.add(id);
      forceUpdate((c) => c + 1);
    }
    hasAnimated.current = true;
  }, []);

  useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => {
      setIsTransitioning(false);
    }, 500);

    const updateCols = () => {
      if (!isFullScreen) {
        setCols(2);
        return;
      }
      if (window.innerWidth >= 1024) setCols(5);
      else if (window.innerWidth >= 768) setCols(4);
      else setCols(2);
    };

    updateCols();
    window.addEventListener("resize", updateCols);
    return () => {
      window.removeEventListener("resize", updateCols);
      clearTimeout(timer);
    };
  }, [isFullScreen]);

  // Distribute notes horizontally across the columns
  const columnData: Note[][] = Array.from({ length: cols }, () => []);
  notes.forEach((note, i) => {
    columnData[i % cols].push(note);
  });

  return (
    <ContextMenu
      open={openMenuNoteId === "background"}
      onOpenChange={(open) => {
        if (open) {
          setOpenMenuNoteId("background");
        } else if (openMenuNoteId === "background") {
          setOpenMenuNoteId(null);
        }
      }}
    >
      <ContextMenuTrigger className="w-full h-full flex flex-col flex-1 min-h-0">
        <div className={containerClasses}>
          <header className="flex justify-between items-center mb-8 pt-4 shrink-0">
            <button className="w-12 h-12 bg-btn-dark rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors shrink-0">
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4 6h16M4 12h16M4 18h16"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                ></path>
              </svg>
            </button>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-medium tracking-wide">Hi, thvgger</h1>
              <div className="w-12 h-12 rounded-full bg-btn-dark border-2 border-white/10 flex items-center justify-center text-gray-400 shadow-sm shrink-0">
                <span className="text-sm font-bold">TH</span>
              </div>
            </div>
          </header>

          <section className="mb-6 shrink-0 hidden md:block">
            <h2
              className="text-5xl tracking-tight font-medium"
              style={{ letterSpacing: "-0.02em" }}
            >
              My Notes
            </h2>
          </section>

          <section className="mb-8 shrink-0">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg
                  aria-hidden="true"
                  className="h-5 w-5 text-gray-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    clipRule="evenodd"
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    fillRule="evenodd"
                  ></path>
                </svg>
              </div>
              <input
                className="block w-full pl-11 pr-3 py-3 border-transparent rounded-full leading-5 bg-btn-dark text-gray-300 placeholder-gray-400 focus:outline-none focus:bg-gray-800 focus:ring-0 sm:text-sm transition-colors"
                placeholder="Search notes..."
                type="text"
              />
            </div>
          </section>

          <div className="flex items-start w-full gap-4 md:gap-6 pb-24">
            {columnData.map((colNotes, colIndex) => (
              <div
                key={colIndex}
                className="flex-1 flex flex-col gap-4 md:gap-6 min-w-0"
              >
                <AnimatePresence>
                  {colNotes.map((note, noteIndex) => {
                    const isRevealed =
                      (hasAnimated.current ||
                        revealedCards.current.has(note.id)) &&
                      !isTransitioning;
                    return (
                      <motion.div
                        key={note.id}
                        layout
                        initial={
                          hasAnimated.current
                            ? false
                            : { opacity: 0, y: 60, scale: 0.85, rotate: -2 }
                        }
                        animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
                        exit={{ opacity: 0, transition: { duration: 0.15 } }}
                        transition={{
                          type: "spring",
                          stiffness: 200,
                          damping: 20,
                          delay: hasAnimated.current
                            ? 0
                            : 0.15 + colIndex * 0.1 + noteIndex * 0.08,
                        }}
                        onAnimationComplete={() => handleCardAnimated(note.id)}
                        className="w-full"
                      >
                        <ContextMenu
                          open={openMenuNoteId === note.id}
                          onOpenChange={(open) => {
                            if (open) {
                              setOpenMenuNoteId(note.id);
                            } else if (openMenuNoteId === note.id) {
                              setOpenMenuNoteId(null);
                            }
                          }}
                        >
                          <ContextMenuTrigger className="w-full block">
                            <motion.button
                              ref={(el) => {
                                if (el) cardRefs.current[note.id] = el;
                              }}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleCardClick(note.id)}
                              className="block text-left w-full outline-none focus:ring-2 focus:ring-white/50 rounded-2xl"
                            >
                              <article
                                className={`${note.color} rounded-2xl p-4 text-text-dark h-fit cursor-pointer text-left w-full flex flex-col relative`}
                              >
                                {selectionMode && (
                                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full border border-black/30 flex items-center justify-center bg-white/20 transition-all">
                                    {selectedNoteIds.includes(note.id) && (
                                      <div className="w-3 h-3 rounded-full bg-black animate-in zoom-in-50 duration-100" />
                                    )}
                                  </div>
                                )}
                                {isRevealed ? (
                                  <>
                                    {note.title && (
                                      <h3 className="font-bold text-base leading-tight mb-2 pr-6">
                                        {note.title}
                                      </h3>
                                    )}
                                    {note.listItems ? (
                                      <ul className="space-y-2 flex flex-col justify-start">
                                        {note.listItems
                                          .slice(0, 8)
                                          .map((item) => (
                                            <li
                                              key={item.id}
                                              className="flex items-center gap-2 bg-black/5 rounded-full px-2 py-1 min-w-0"
                                            >
                                              <div className="w-4 h-4 rounded-full border-2 border-black flex items-center justify-center relative shrink-0">
                                                {item.completed && (
                                                  <div className="w-2 h-2 bg-black rounded-full absolute"></div>
                                                )}
                                              </div>
                                              <span className="text-xs font-medium truncate">
                                                {item.text}
                                              </span>
                                            </li>
                                          ))}
                                        {note.listItems.length > 8 && (
                                          <li className="text-xs font-bold text-black/40 pl-2 pt-1">
                                            +{note.listItems.length - 8} more
                                            items
                                          </li>
                                        )}
                                      </ul>
                                    ) : note.paragraphs &&
                                      !note.title &&
                                      note.paragraphs.join(" ").length < 120 ? (
                                      <p className="font-bold text-base leading-tight">
                                        {note.paragraphs.join(" ")}
                                      </p>
                                    ) : (
                                      <p className="text-text-dark/80 text-sm leading-relaxed line-clamp-[10]">
                                        {note.paragraphs &&
                                          note.paragraphs.join(" ")}
                                      </p>
                                    )}
                                  </>
                                ) : (
                                  <SkeletonContent note={note} />
                                )}
                              </article>
                            </motion.button>
                          </ContextMenuTrigger>
                          <ContextMenuContent
                            anchor={() => cardRefs.current[note.id]}
                            side="right"
                            align="start"
                            sideOffset={8}
                            className="bg-neutral-900/95 backdrop-blur-md border border-white/10 text-white min-w-40 rounded-xl p-1.5 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-100"
                          >
                            <ContextMenuItem
                              onClick={() => handleContextSelect(note.id)}
                              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-gray-300 hover:text-white focus:bg-white/10 focus:text-white outline-none cursor-pointer transition-colors"
                            >
                              {selectedNoteIds.includes(note.id)
                                ? "Deselect Card"
                                : "Select Card"}
                            </ContextMenuItem>
                            <ContextMenuItem
                              onClick={() => onNoteSelect?.(note.id)}
                              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-gray-300 hover:text-white focus:bg-white/10 focus:text-white outline-none cursor-pointer transition-colors"
                            >
                              Open Note
                            </ContextMenuItem>
                            <ContextMenuItem
                              variant="destructive"
                              onClick={() => onNoteDelete?.(note.id)}
                              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-red-400 hover:text-red-300 focus:bg-red-500/10 focus:text-red-300 outline-none cursor-pointer transition-colors"
                            >
                              Delete Note
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            ))}
          </div>

          {!selectionMode && (
            <button
              onClick={() => onNoteSelect?.("new")}
              className="fixed bottom-8 right-10 md:right-12 w-16 h-16 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/30 hover:scale-105 transition-transform z-50 bg-white text-black"
            >
              <svg
                className="h-8 w-8 text-black"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 4v16m8-8H4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                ></path>
              </svg>
            </button>
          )}

          <AnimatePresence>
            {selectionMode && (
              <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 50, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="absolute bottom-8 left-6 right-6 z-50 bg-neutral-900/95 backdrop-blur-md border border-white/10 px-5 py-3 rounded-full flex items-center justify-between shadow-2xl text-white select-none"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold">
                    {selectedNoteIds.length} Selected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleBulkDelete}
                    disabled={selectedNoteIds.length === 0}
                    className="p-2 rounded-full hover:bg-white/10 text-red-400 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
                    aria-label="Delete selected notes"
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={handleCancelSelection}
                    className="p-2 rounded-full hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
                    aria-label="Cancel selection"
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent
        collisionAvoidance={{ side: "flip", align: "shift" }}
        className="bg-neutral-900/95 backdrop-blur-md border border-white/10 text-white min-w-40 rounded-xl p-1.5 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-100"
      >
        <ContextMenuItem
          onClick={() => onNoteSelect?.("new")}
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-gray-300 hover:text-white focus:bg-white/10 focus:text-white outline-none cursor-pointer transition-colors"
        >
          New Note
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => {
            setSelectionMode(true);
            setSelectedNoteIds([]);
          }}
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-gray-300 hover:text-white focus:bg-white/10 focus:text-white outline-none cursor-pointer transition-colors"
        >
          Select Notes
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
