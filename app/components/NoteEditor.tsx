"use client";

import { useState, useEffect, useRef, PointerEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Note } from "../lib/data";
import ShareModal from "./ShareModal";
import { LiveblocksProvider, RoomProvider, useMyPresence, useOthers, ClientSideSuspense } from "@liveblocks/react";
import { UserPlus } from "lucide-react";


const FONTS = [
  { name: "Inter", css: "'Inter', sans-serif" },
  { name: "Georgia", css: "'Georgia', serif" },
  { name: "Roboto", css: "'Roboto', sans-serif" },
  { name: "Playfair Display", css: "'Playfair Display', serif" },
  { name: "Courier New", css: "'Courier New', monospace" },
  { name: "Pacifico", css: "'Pacifico', cursive" },
  { name: "Comic Neue", css: "'Comic Neue', cursive" },
  { name: "Lobster", css: "'Lobster', sans-serif" },
  { name: "Caveat", css: "'Caveat', cursive" },
  { name: "Amatic SC", css: "'Amatic SC', cursive" },
  { name: "Creepster", css: "'Creepster', system-ui" },
  { name: "Press Start 2P", css: "'Press Start 2P', monospace" },
  { name: "Sacramento", css: "'Sacramento', cursive" },
  { name: "Bungee", css: "'Bungee', sans-serif" },
  { name: "Righteous", css: "'Righteous', sans-serif" },
];

const HIGHLIGHT_COLORS = [
  { name: "Yellow", value: "#fbbf24" },
  { name: "Pink", value: "#ec4899" },
  { name: "Green", value: "#22c55e" },
  { name: "Blue", value: "#2563eb" },
  { name: "Purple", value: "#a855f7" },
  { name: "Orange", value: "#f97316" },
  { name: "Red", value: "#ef4444" },
  { name: "Teal", value: "#0d9488" },
];

const CARD_COLORS = [
  "bg-card-coral",
  "bg-card-yellow",
  "bg-card-blue",
  "bg-card-purple",
  "bg-card-green",
  "bg-card-pink",
];

const CARD_COLORS_META = [
  { name: "Coral", className: "bg-card-coral", bgPreview: "bg-card-coral" },
  { name: "Yellow", className: "bg-card-yellow", bgPreview: "bg-card-yellow" },
  { name: "Blue", className: "bg-card-blue", bgPreview: "bg-card-blue" },
  { name: "Purple", className: "bg-card-purple", bgPreview: "bg-card-purple" },
  { name: "Green", className: "bg-card-green", bgPreview: "bg-card-green" },
  { name: "Pink", className: "bg-card-pink", bgPreview: "bg-card-pink" },
];

interface NoteEditorProps {
  note?: Note | null;
  defaultColor?: string;
  onClose: () => void;
  onUpdateNote?: (updatedNote: Note) => void;
}

interface NoteEditorInnerProps extends NoteEditorProps {
  others?: readonly any[];
  updateMyPresence?: (presence: any) => void;
}

export default function NoteEditor(props: NoteEditorProps) {
  if (!props.note?.id) {
    return <NoteEditorInner {...props} others={[]} updateMyPresence={() => {}} />;
  }

  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <RoomProvider id={props.note.id} initialPresence={{ cursor: null }}>
        <ClientSideSuspense fallback={<div className="flex-1 w-full h-full flex items-center justify-center bg-gray-50/50">Loading editor...</div>}>
          {() => <CollaborativeNoteEditorWrapper {...props} />}
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}

function CollaborativeNoteEditorWrapper(props: NoteEditorProps) {
  const [myPresence, updateMyPresence] = useMyPresence();
  const others = useOthers();

  return <NoteEditorInner {...props} others={others} updateMyPresence={updateMyPresence} />;
}

function NoteEditorInner({ note, defaultColor = "bg-card-coral", onClose, onUpdateNote, others = [], updateMyPresence = () => {} }: NoteEditorInnerProps) {
  const [noteColor, setNoteColor] = useState(note?.color || defaultColor);
  const [isColorDropdownOpen, setIsColorDropdownOpen] = useState(false);
  const colorRef = useRef<HTMLDivElement>(null);
  const [fontFamily, setFontFamily] = useState(note?.font || "Inter");
  const [isFontDropdownOpen, setIsFontDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isMobileToolbarOpen, setIsMobileToolbarOpen] = useState(false);
  const noteIdRef = useRef<string | null>(null);
  
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  
  const titleRef = useRef<HTMLHeadingElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isHighlightOpen, setIsHighlightOpen] = useState(false);
  const highlightRef = useRef<HTMLDivElement>(null);

  const updateFormatStates = () => {
    setIsBold(document.queryCommandState("bold"));
    setIsItalic(document.queryCommandState("italic"));
    setIsUnderline(document.queryCommandState("underline"));
  };

  useEffect(() => {
    const handleSelectionChange = () => {
      updateFormatStates();
    };
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, []);

  const getNoteHTML = () => {
    if (!note) return "";
    let html = "";
    
    if (note.paragraphs) {
      note.paragraphs.forEach(text => {
        html += `<p class="text-[15px] md:text-lg leading-relaxed mb-6 font-medium text-gray-800">${text}</p>`;
      });
    }
    
    if (note.listItems) {
      html += `<ul class="list-disc pl-5 space-y-3 text-[15px] md:text-lg font-medium text-gray-800 mb-10">`;
      note.listItems.forEach(item => {
        html += `<li>${item.text}</li>`;
      });
      html += `</ul>`;
    }
    
    if (note.orderedListItems) {
      html += `<ol class="list-decimal pl-5 space-y-3 text-[15px] md:text-lg font-medium text-gray-800 mb-10">`;
      note.orderedListItems.forEach(item => {
        html += `<li class="pl-1">${item}</li>`;
      });
      html += `</ol>`;
    }
    
    return html;
  };

  useEffect(() => {
    if (noteIdRef.current && noteIdRef.current === note?.id) {
      return;
    }

    if (titleRef.current) {
      titleRef.current.innerText = note?.title || "";
    }
    if (bodyRef.current) {
      bodyRef.current.innerHTML = getNoteHTML();
    }
    noteIdRef.current = note?.id || null;
    setFontFamily(note?.font || "Inter");
    setNoteColor(note?.color || defaultColor);
  }, [note?.id]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsFontDropdownOpen(false);
      }
      if (colorRef.current && !colorRef.current.contains(e.target as Node)) {
        setIsColorDropdownOpen(false);
      }
      if (highlightRef.current && !highlightRef.current.contains(e.target as Node)) {
        setIsHighlightOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getParagraphsFromDOM = () => {
    if (!bodyRef.current) return [];
    const paragraphs: string[] = [];
    const pEls = bodyRef.current.getElementsByTagName("p");
    if (pEls.length > 0) {
      for (let i = 0; i < pEls.length; i++) {
        paragraphs.push(pEls[i].innerHTML);
      }
    } else {
      paragraphs.push(bodyRef.current.innerHTML);
    }
    return paragraphs;
  };

  const handleInput = () => {
    if (!titleRef.current || !bodyRef.current) return;

    if (titleRef.current.innerText.trim() === "") {
      titleRef.current.innerHTML = "";
    }
    if (bodyRef.current.innerText.trim() === "") {
      bodyRef.current.innerHTML = "";
    }

    const title = titleRef.current.innerText || "";
    const paragraphs = getParagraphsFromDOM();
    
    if (noteIdRef.current) {
      onUpdateNote?.({
        id: noteIdRef.current,
        title,
        paragraphs,
        color: noteColor,
        font: fontFamily,
      });
    } else {
      const id = Date.now().toString();
      noteIdRef.current = id;
      onUpdateNote?.({
        id,
        title,
        paragraphs,
        color: noteColor,
        font: fontFamily,
      });
    }
  };

  const ensureCursorVisible = () => {
    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      const range = selection.getRangeAt(0);
      let rect = range.getBoundingClientRect();
      
      if (rect.height === 0 && selection.focusNode?.parentElement) {
        rect = selection.focusNode.parentElement.getBoundingClientRect();
      }

      const visualHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      
      if (rect.bottom > visualHeight - 50) {
        const container = document.getElementById("note-scroll-container");
        if (container) {
          container.scrollBy({ top: (rect.bottom - visualHeight) + 80, behavior: 'smooth' });
        }
      }
    }, 50);
  };

  const handleContentInput = () => {
    ensureCursorVisible();
    handleInput();
  };

  const formatText = (e: React.MouseEvent, command: string) => {
    e.preventDefault();
    document.execCommand(command, false);
    handleInput();
    updateFormatStates();
  };

  const highlightText = (e: React.MouseEvent, color: string) => {
    e.preventDefault();
    document.execCommand("hiliteColor", false, color);
    handleInput();
    setIsHighlightOpen(false);
  };

  const handleFontChange = (fontName: string) => {
    setFontFamily(fontName);
    setIsFontDropdownOpen(false);
    
    if (!titleRef.current || !bodyRef.current) return;
    const title = titleRef.current.innerText || "";
    const paragraphs = getParagraphsFromDOM();

    if (noteIdRef.current) {
      onUpdateNote?.({
        id: noteIdRef.current,
        title,
        paragraphs,
        color: noteColor,
        font: fontName,
      });
    } else {
      const id = Date.now().toString();
      noteIdRef.current = id;
      onUpdateNote?.({
        id,
        title,
        paragraphs,
        color: noteColor,
        font: fontName,
      });
    }
  };

  const handleSpaceKey = (e: React.KeyboardEvent) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const focusNode = selection.focusNode;
    if (!focusNode) return;
    
    const parentElement = focusNode.parentElement;
    if (
      parentElement && 
      parentElement !== bodyRef.current && 
      parentElement.style.backgroundColor && 
      parentElement.style.backgroundColor !== "transparent"
    ) {
      const remainingText = focusNode.textContent?.slice(selection.focusOffset) || "";
      if (remainingText.trim() === "") {
        e.preventDefault();
        
        if (focusNode.textContent) {
          focusNode.textContent = focusNode.textContent.slice(0, selection.focusOffset).trimEnd();
        }
        
        const spaceNode = document.createTextNode("\u00A0");
        parentElement.parentNode?.insertBefore(spaceNode, parentElement.nextSibling);
        
        const range = document.createRange();
        range.setStart(spaceNode, 1);
        range.setEnd(spaceNode, 1);
        
        selection.removeAllRanges();
        selection.addRange(range);
        
        handleInput();
      }
    }
  };

  const handleColorChange = (newColor: string) => {
    setNoteColor(newColor);
    setIsColorDropdownOpen(false);
    
    if (!titleRef.current || !bodyRef.current) return;
    const title = titleRef.current.innerText || "";
    const paragraphs = getParagraphsFromDOM();

    if (noteIdRef.current) {
      onUpdateNote?.({
        id: noteIdRef.current,
        title,
        paragraphs,
        color: newColor,
        font: fontFamily,
      });
    }
  };

  const activeFont = FONTS.find(f => f.name === fontFamily) || FONTS[0];

  const renderToolbarContents = () => (
    <>
      <div className="relative" ref={colorRef}>
        <button 
          onMouseDown={(e) => { e.preventDefault(); setIsColorDropdownOpen(!isColorDropdownOpen); }}
          className="px-3 py-1.5 rounded-full hover:bg-black/5 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
        >
          <i className="fa-solid fa-palette text-[10px]"></i>
          <span>Color</span>
          <i className="fa-solid fa-chevron-down text-[10px]"></i>
        </button>

        <AnimatePresence>
          {isColorDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full right-0 mt-2 w-40 bg-neutral-900/95 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-2xl z-50 flex flex-col gap-2"
            >
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider font-sans text-center">Card Color</span>
              <div className="grid grid-cols-3 gap-2 justify-items-center">
                {CARD_COLORS_META.map((c) => (
                  <button
                    key={c.className}
                    onMouseDown={(e) => { e.preventDefault(); handleColorChange(c.className); }}
                    className={`w-7 h-7 rounded-full border border-white/10 hover:scale-110 active:scale-95 transition-transform cursor-pointer ${c.bgPreview}`}
                    title={c.name}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="w-[1px] h-4 bg-black/10 mx-1"></div>

      <div className="relative" ref={dropdownRef}>
        <button 
          onMouseDown={(e) => { e.preventDefault(); setIsFontDropdownOpen(!isFontDropdownOpen); }}
          className="px-3 py-1.5 rounded-full hover:bg-black/5 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
        >
          <span>Font: {fontFamily}</span>
          <i className="fa-solid fa-chevron-down text-[10px]"></i>
        </button>

        <AnimatePresence>
          {isFontDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full right-0 mt-2 w-48 max-h-64 overflow-y-auto bg-neutral-900/95 backdrop-blur-md border border-white/10 rounded-xl p-1 shadow-2xl z-50 no-scrollbar"
            >
              {FONTS.map((f, idx) => (
                <button
                  key={f.name}
                  onMouseDown={(e) => { e.preventDefault(); handleFontChange(f.name); }}
                  className="w-full text-left px-3 py-2 text-xs rounded-lg text-gray-300 hover:text-white hover:bg-white/10 focus:bg-white/10 outline-none cursor-pointer transition-colors flex flex-col gap-0.5"
                  style={{ fontFamily: f.css }}
                >
                  <span className="font-bold">{f.name}</span>
                  {idx < 5 ? (
                    <span className="text-[9px] text-gray-500 font-sans">Document Font</span>
                  ) : (
                    <span className="text-[9px] text-gray-500 font-sans">Fun Font</span>
                  )}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="w-[1px] h-4 bg-black/10 mx-1"></div>

      <button 
        onMouseDown={(e) => formatText(e, "bold")}
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer text-sm ${isBold ? 'bg-black/15 text-black' : 'hover:bg-black/5'}`}
        title="Bold"
        aria-label="Format Bold"
      >
        <i className="fa-solid fa-bold"></i>
      </button>
      <button 
        onMouseDown={(e) => formatText(e, "italic")}
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer text-sm ${isItalic ? 'bg-black/15 text-black' : 'hover:bg-black/5'}`}
        title="Italic"
        aria-label="Format Italic"
      >
        <i className="fa-solid fa-italic"></i>
      </button>
      <button 
        onMouseDown={(e) => formatText(e, "underline")}
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer text-sm ${isUnderline ? 'bg-black/15 text-black' : 'hover:bg-black/5'}`}
        title="Underline"
        aria-label="Format Underline"
      >
        <i className="fa-solid fa-underline"></i>
      </button>

      <div className="relative" ref={highlightRef}>
        <button 
          onMouseDown={(e) => { e.preventDefault(); setIsHighlightOpen(!isHighlightOpen); }}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer text-sm ${isHighlightOpen ? 'bg-black/15 text-black' : 'hover:bg-black/5'}`}
          title="Highlight Text"
          aria-label="Toggle Highlight Palette"
        >
          <i className="fa-solid fa-highlighter"></i>
        </button>

        <AnimatePresence>
          {isHighlightOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full right-0 mt-2 w-48 bg-neutral-900/95 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-2xl z-50 flex flex-col gap-2.5"
            >
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider font-sans">Highlight Color</span>
              <div className="grid grid-cols-4 gap-2">
                {HIGHLIGHT_COLORS.map((c) => (
                  <button
                    key={c.name}
                    onMouseDown={(e) => highlightText(e, c.value)}
                    className="w-7 h-7 rounded-full border border-white/10 hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
                <button
                  onMouseDown={(e) => highlightText(e, "transparent")}
                  className="col-span-4 py-1.5 rounded-lg border border-white/10 hover:bg-white/10 text-white text-[10px] font-bold transition-colors cursor-pointer"
                  title="Clear Highlight"
                >
                  Clear Highlight
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );

  return (
    <div className={`w-full h-full ${noteColor} relative overflow-hidden flex flex-col mx-auto max-w-[400px] md:max-w-4xl`}>
      {/* Top Navigation Bar */}
      <div className="absolute top-4 left-4 right-4 md:top-8 md:left-8 md:right-8 z-50 flex items-center justify-between pointer-events-none">
        
        {/* Left Side: Back & Share */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-black/10 hover:bg-black/20 text-black/70 hover:text-black transition-colors"
          >
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          {note?.id && (
            <button 
              onClick={() => setIsShareModalOpen(true)}
              className="w-10 h-10 md:w-auto md:px-4 md:py-2 flex items-center justify-center md:gap-2 rounded-full bg-blue-600/10 hover:bg-blue-600/20 text-blue-700 font-semibold text-sm transition-colors"
              title="Share"
            >
              <UserPlus size={16} />
              <span className="hidden md:inline">Share</span>
            </button>
          )}
        </div>

        {/* Right Side: Avatars & Toolbars */}
        <div className="flex items-center gap-2 md:gap-4 pointer-events-auto">
          {/* Live Avatars - Now visible on mobile */}
          {others && others.length > 0 && (
            <div className="flex items-center">
              {others.slice(0, 3).map(({ connectionId, info }) => (
                <div key={connectionId} className="w-8 h-8 rounded-full border-2 border-white -ml-2 first:ml-0 bg-blue-500 flex items-center justify-center text-white text-xs font-bold overflow-hidden shadow-sm" title={info?.name || 'Anonymous'}>
                  {info?.avatar ? <img src={info.avatar} className="w-full h-full object-cover" /> : (info?.name?.charAt(0).toUpperCase() || '?')}
                </div>
              ))}
              {others.length > 3 && (
                <div className="w-8 h-8 rounded-full border-2 border-white -ml-2 bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-bold shadow-sm">
                  +{others.length - 3}
                </div>
              )}
            </div>
          )}

          {/* Mobile Toolbar Toggle */}
          <button 
            onClick={() => setIsMobileToolbarOpen(!isMobileToolbarOpen)} 
            aria-label="Format menu"
            className="md:hidden w-10 h-10 bg-black/10 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-black/20 transition-colors text-black cursor-pointer"
          >
            <i className={`fa-solid ${isMobileToolbarOpen ? 'fa-xmark' : 'fa-sliders'} text-sm`}></i>
          </button>

          {/* Desktop Toolbar */}
          <div className="hidden md:flex items-center gap-1.5 bg-black/10 backdrop-blur-md p-1.5 rounded-full border border-black/5 shadow-sm text-black select-none">
            {renderToolbarContents()}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isMobileToolbarOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-16 right-4 left-4 z-50 md:hidden flex flex-wrap justify-center items-center gap-1.5 bg-black/10 backdrop-blur-md p-2 rounded-2xl border border-black/5 shadow-md text-black select-none"
          >
            {renderToolbarContents()}
          </motion.div>
        )}
      </AnimatePresence>

      <main 
        id="note-scroll-container" 
        className="flex-1 overflow-y-auto px-6 pt-24 md:pt-28 pb-[50vh] no-scrollbar relative"
        onPointerMove={(e) => {
          updateMyPresence({ cursor: { x: Math.round(e.clientX), y: Math.round(e.clientY) } });
        }}
        onPointerLeave={() => updateMyPresence({ cursor: null })}
      >
        {/* Render Other Users Cursors */}
        {others && others.map(({ connectionId, presence, info }) => {
          const cursor = presence?.cursor as { x: number; y: number } | null;
          if (cursor) {
            return (
              <div 
                key={connectionId}
                className="pointer-events-none absolute z-50 flex items-center gap-2 transition-transform duration-100 ease-linear"
                style={{
                  transform: `translate(${cursor.x}px, ${cursor.y}px)`
                }}
              >
                <svg width="24" height="36" viewBox="0 0 24 36" fill="none" stroke="white" strokeWidth="2" className="text-blue-500 fill-current drop-shadow-md">
                  <path d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z" />
                </svg>
                <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap shadow-md mt-6 ml-2">
                  {info?.name || "Anonymous"}
                </div>
              </div>
            );
          }
          return null;
        })}

        <h1 
          ref={titleRef}
          id="note-title-input"
          style={{ fontFamily: activeFont.css }}
          className="text-[32px] md:text-5xl leading-tight font-bold mb-6 tracking-tight text-black outline-none empty:before:content-['Title'] empty:before:text-black/30 cursor-text pr-16 relative z-10 break-words"
          contentEditable
          suppressContentEditableWarning
          onInput={handleContentInput}
          onKeyDown={(e) => {
            if (e.key === 'Enter') ensureCursorVisible();
          }}
          onFocus={ensureCursorVisible}
        />

        <div 
          ref={bodyRef}
          id="note-body-input"
          style={{ fontFamily: activeFont.css }}
          className="outline-none empty:before:content-['Start_typing...'] empty:before:text-gray-800/40 cursor-text min-h-[100px] text-[15px] md:text-lg leading-relaxed font-medium text-gray-800 [&>p]:mb-6 relative z-10 break-words"
          contentEditable
          suppressContentEditableWarning
          onInput={handleContentInput}
          onKeyDown={(e) => {
            if (e.key === 'Enter') ensureCursorVisible();
            if (e.key === ' ') handleSpaceKey(e);
          }}
          onFocus={ensureCursorVisible}
        />
      </main>

      {note?.id && (
        <ShareModal 
          noteId={note.id}
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}
    </div>
  );
}
