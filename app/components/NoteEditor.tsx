"use client";

import { useState, useEffect, useRef, PointerEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Note } from "../lib/data";
import ShareModal from "./ShareModal";
import { LiveblocksProvider, RoomProvider, useMyPresence, useOthers, ClientSideSuspense, useRoom, useSelf } from "@liveblocks/react";
import { LiveblocksYjsProvider } from "@liveblocks/yjs";
import * as Y from "yjs";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import { UserPlus, List as ListIcon, ListOrdered, CheckSquare, Bold as BoldIcon, Italic as ItalicIcon, Underline as UnderlineIcon, Highlighter, Palette } from "lucide-react";

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
  doc?: Y.Doc;
  provider?: any;
  userInfo?: any;
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
  const room = useRoom();
  const userInfo = useSelf((me) => me.info) || { name: 'Anonymous', color: '#3b82f6', avatar: '' };

  const [doc, setDoc] = useState<Y.Doc>();
  const [provider, setProvider] = useState<any>();

  useEffect(() => {
    const yDoc = new Y.Doc();
    const yProvider = new LiveblocksYjsProvider(room, yDoc);
    setDoc(yDoc);
    setProvider(yProvider);

    return () => {
      yDoc.destroy();
      yProvider.destroy();
    };
  }, [room]);

  if (!doc || !provider) {
    return <div className="flex-1 w-full h-full flex items-center justify-center bg-gray-50/50">Connecting editor...</div>;
  }

  return <NoteEditorInner {...props} others={others} updateMyPresence={updateMyPresence} doc={doc} provider={provider} userInfo={userInfo} />;
}

const getLegacyHTML = (note?: Note | null) => {
  if (!note) return "";
  let html = "";
  if (note.paragraphs) {
    note.paragraphs.forEach(text => { html += `<p>${text}</p>`; });
  }
  if (note.listItems) {
    html += `<ul data-type="taskList">`;
    note.listItems.forEach(item => {
      html += `<li data-type="taskItem" data-checked="${item.completed ? 'true' : 'false'}"><label><input type="checkbox" ${item.completed ? 'checked' : ''}></label><div><p>${item.text}</p></div></li>`;
    });
    html += `</ul>`;
  }
  if (note.orderedListItems) {
    html += `<ol>`;
    note.orderedListItems.forEach(item => { html += `<li><p>${item}</p></li>`; });
    html += `</ol>`;
  }
  return html;
};

function NoteEditorInner({ note, defaultColor = "bg-card-coral", onClose, onUpdateNote, others = [], updateMyPresence = () => {}, doc, provider, userInfo }: NoteEditorInnerProps) {
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

  useEffect(() => {
    if (noteIdRef.current && noteIdRef.current === note?.id) return;
    if (titleRef.current) {
      titleRef.current.innerText = note?.title || "";
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
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleUpdate = (title: string, htmlContent: string, previewText: string, color: string, font: string) => {
    const id = noteIdRef.current || Date.now().toString();
    noteIdRef.current = id;
    
    onUpdateNote?.({
      ...(note || {}),
      id,
      title,
      color,
      font,
      htmlContent,
      previewText,
    });
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        undoRedo: doc ? false : undefined, // Disable native undoRedo if using Yjs collaboration
      }),
      Underline,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: 'Start typing...' }),
      ...(doc && provider ? [
        Collaboration.configure({ document: doc }),
        CollaborationCursor.configure({ provider, user: { name: userInfo?.name || 'Anonymous', color: userInfo?.color || '#3b82f6' } }),
      ] : []),
    ],
    content: note?.htmlContent || getLegacyHTML(note),
    editorProps: {
      attributes: {
        class: 'outline-none min-h-[100px] text-[15px] md:text-lg leading-relaxed font-medium text-gray-800 relative z-10',
      },
    },
    onUpdate: ({ editor }) => {
      const title = titleRef.current?.innerText || "";
      handleUpdate(title, editor.getHTML(), editor.getText(), noteColor, fontFamily);
    }
  });

  const handleTitleInput = () => {
    if (!editor) return;
    const title = titleRef.current?.innerText || "";
    handleUpdate(title, editor.getHTML(), editor.getText(), noteColor, fontFamily);
  };

  const handleFontChange = (fontName: string) => {
    setFontFamily(fontName);
    setIsFontDropdownOpen(false);
    if (editor) {
      handleUpdate(titleRef.current?.innerText || "", editor.getHTML(), editor.getText(), noteColor, fontName);
    }
  };

  const handleColorChange = (newColor: string) => {
    setNoteColor(newColor);
    setIsColorDropdownOpen(false);
    if (editor) {
      handleUpdate(titleRef.current?.innerText || "", editor.getHTML(), editor.getText(), newColor, fontFamily);
    }
  };

  const activeFont = FONTS.find(f => f.name === fontFamily) || FONTS[0];

  const renderToolbarContents = () => {
    if (!editor) return null;
    
    return (
      <>
        <div className="relative" ref={colorRef}>
          <button 
            onMouseDown={(e) => { e.preventDefault(); setIsColorDropdownOpen(!isColorDropdownOpen); }}
            className="px-3 py-1.5 rounded-full hover:bg-black/5 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Palette size={12} />
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
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer text-sm ${editor.isActive('bold') ? 'bg-black/15 text-black' : 'hover:bg-black/5'}`}
          title="Bold"
        >
          <BoldIcon size={14} />
        </button>
        <button 
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer text-sm ${editor.isActive('italic') ? 'bg-black/15 text-black' : 'hover:bg-black/5'}`}
          title="Italic"
        >
          <ItalicIcon size={14} />
        </button>
        <button 
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleUnderline().run(); }}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer text-sm ${editor.isActive('underline') ? 'bg-black/15 text-black' : 'hover:bg-black/5'}`}
          title="Underline"
        >
          <UnderlineIcon size={14} />
        </button>

        <div className="w-[1px] h-4 bg-black/10 mx-1"></div>

        <button 
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBulletList().run(); }}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer text-sm ${editor.isActive('bulletList') ? 'bg-black/15 text-black' : 'hover:bg-black/5'}`}
          title="Unordered List"
        >
          <ListIcon size={16} />
        </button>
        <button 
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run(); }}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer text-sm ${editor.isActive('orderedList') ? 'bg-black/15 text-black' : 'hover:bg-black/5'}`}
          title="Ordered List"
        >
          <ListOrdered size={16} />
        </button>
        <button 
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleTaskList().run(); }}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer text-sm ${editor.isActive('taskList') ? 'bg-black/15 text-black' : 'hover:bg-black/5'}`}
          title="Checklist"
        >
          <CheckSquare size={16} />
        </button>
      </>
    );
  };

  return (
    <div className={`w-full h-full ${noteColor} relative overflow-hidden flex flex-col mx-auto max-w-[400px] md:max-w-4xl`}>
      <div className="absolute top-4 left-4 right-4 md:top-8 md:left-8 md:right-8 z-50 flex items-center justify-between pointer-events-none">
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

        <div className="flex items-center gap-2 md:gap-4 pointer-events-auto">
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

          <button 
            onClick={() => setIsMobileToolbarOpen(!isMobileToolbarOpen)} 
            className="md:hidden w-10 h-10 bg-black/10 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-black/20 transition-colors text-black cursor-pointer"
          >
            <i className={`fa-solid ${isMobileToolbarOpen ? 'fa-xmark' : 'fa-sliders'} text-sm`}></i>
          </button>

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
        {others && others.map(({ connectionId, presence, info }) => {
          const cursor = presence?.cursor as { x: number; y: number } | null;
          if (cursor) {
            return (
              <div 
                key={connectionId}
                className="pointer-events-none absolute z-50 flex items-center gap-2 transition-transform duration-100 ease-linear"
                style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)` }}
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
          style={{ fontFamily: activeFont.css }}
          className="text-[32px] md:text-5xl leading-tight font-bold mb-6 tracking-tight text-black outline-none empty:before:content-['Title'] empty:before:text-black/30 cursor-text pr-16 relative z-10 break-words"
          contentEditable
          suppressContentEditableWarning
          onInput={handleTitleInput}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
               e.preventDefault();
               editor?.commands.focus();
            }
          }}
        />

        <div style={{ fontFamily: activeFont.css }} className="relative z-10">
          <EditorContent editor={editor} />
        </div>
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
