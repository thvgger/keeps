import { Note } from "../lib/data";

interface NoteEditorProps {
  note?: Note | null;
  onClose: () => void;
}

export default function NoteEditor({ note, onClose }: NoteEditorProps) {
  // Use note color if exists, else default to the cyan background
  const bgColor = note?.color || "bg-new-note-bg";

  // Generate HTML from structured data to prevent React Virtual DOM crashes
  // when the browser's contentEditable engine manually removes DOM nodes.
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

  // Custom caret tracking to prevent cursor going under iOS keyboard
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
      
      // If the cursor is below the visible screen height (covered by keyboard)
      if (rect.bottom > visualHeight - 50) {
        const container = document.getElementById("note-scroll-container");
        if (container) {
          container.scrollBy({ top: (rect.bottom - visualHeight) + 80, behavior: 'smooth' });
        }
      }
    }, 50); // slight delay to allow DOM/keyboard to settle
  };

  return (
    <div className={`w-full h-full ${bgColor} relative overflow-hidden flex flex-col mx-auto max-w-[400px] md:max-w-4xl`}>
      {/* Floating Back Button */}
      <button 
        onClick={onClose} 
        aria-label="Go back" 
        className="absolute top-6 left-6 md:top-8 md:left-8 z-50 w-12 h-12 bg-black/10 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-black/20 transition-colors"
      >
        <i className="fa-solid fa-chevron-left text-lg"></i>
      </button>

      {/* Main Content Area */}
      <main id="note-scroll-container" className="flex-1 overflow-y-auto px-6 pt-24 md:pt-28 pb-[50vh] no-scrollbar">
        {/* Note Title */}
        <h1 
          className="text-[32px] md:text-5xl leading-tight font-bold mb-6 tracking-tight text-black outline-none empty:before:content-['Title'] empty:before:text-black/30 cursor-text"
          contentEditable
          suppressContentEditableWarning
          onInput={ensureCursorVisible}
          onKeyDown={(e) => {
            if (e.key === 'Enter') ensureCursorVisible();
          }}
          onFocus={ensureCursorVisible}
        >
          {note?.title}
        </h1>

        {/* Editable Content Wrapper */}
        <div 
          key={note?.id || 'new'}
          className="outline-none empty:before:content-['Start_typing...'] empty:before:text-gray-800/40 cursor-text min-h-[100px] text-[15px] md:text-lg leading-relaxed font-medium text-gray-800 [&>p]:mb-6"
          contentEditable
          suppressContentEditableWarning
          dangerouslySetInnerHTML={{ __html: getNoteHTML() }}
          onInput={ensureCursorVisible}
          onKeyDown={(e) => {
            if (e.key === 'Enter') ensureCursorVisible();
          }}
          onFocus={ensureCursorVisible}
        />

        {/* Interactive Prompt */}
        {/* {note?.interactivePrompt && (
          <div className="flex items-center text-gray-400 font-medium cursor-text group relative mt-2">
            <div className="absolute left-0 top-0 h-full w-[2px] bg-black"></div>
            <div className="absolute left-[-3px] top-[-3px] h-[8px] w-[8px] rounded-full bg-black"></div>
            <span 
              className="ml-4 text-sm md:text-base outline-none"
              contentEditable
              suppressContentEditableWarning
            >
              {note.interactivePrompt}
            </span>
          </div>
        )} */}
      </main>

      {/* Bottom Action Bar */}
      {/* <div className="absolute bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-[400px]">
        <div className="bg-[#c2e8e4] md:bg-white rounded-[30px] p-2 flex items-center justify-between shadow-sm md:shadow-lg">
        
          <div className="flex gap-2">
            <button aria-label="Camera" className="w-12 h-12 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors">
              <i className="fa-solid fa-camera text-lg"></i>
            </button>
            <button aria-label="Edit" className="w-12 h-12 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors">
              <i className="fa-solid fa-pen text-lg"></i>
            </button>
            <button aria-label="Attachment" className="w-12 h-12 bg-black/5 rounded-full flex items-center justify-center hover:bg-black/10 transition-colors">
              <i className="fa-solid fa-paperclip text-lg"></i>
            </button>
            <button aria-label="List" className="w-12 h-12 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors">
              <i className="fa-solid fa-list text-lg"></i>
            </button>
      </div>
      
          <button aria-label="Add new item" className="w-14 h-14 bg-black text-white rounded-full flex items-center justify-center shadow-md hover:bg-gray-800 transition-colors">
            <i className="fa-solid fa-plus text-xl"></i>
          </button>
        </div>
      </div> */}
    </div>
  );
}
