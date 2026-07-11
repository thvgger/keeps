import MiniSearch, { Options } from "minisearch";
import { Note } from "./data";

export type SearchWorkerMessage =
  | { type: "INIT"; indexJson?: string | null; notes?: Note[] }
  | { type: "SEARCH"; query: string }
  | { type: "UPDATE_NOTE"; note: Note }
  | { type: "DELETE_NOTE"; noteId: string };

export type SearchWorkerResponse =
  | { type: "INIT_DONE"; indexJson: string }
  | { type: "INDEX_UPDATED"; indexJson: string }
  | { type: "SEARCH_RESULTS"; results: string[] };

const searchOptions: Options<Note> = {
  fields: ["title", "paragraphs", "listItems", "orderedListItems"],
  storeFields: ["id"],
  extractField: (document: Note, fieldName: string) => {
    if (fieldName === "paragraphs") return document.paragraphs?.join(" ") || "";
    if (fieldName === "listItems") return document.listItems?.map(i => i.text).join(" ") || "";
    if (fieldName === "orderedListItems") return document.orderedListItems?.join(" ") || "";
    return (document as any)[fieldName];
  },
  searchOptions: {
    prefix: true,
    fuzzy: (term) => (term.length > 3 ? 0.2 : false),
  },
};

let miniSearch = new MiniSearch<Note>(searchOptions);

self.onmessage = (event: MessageEvent<SearchWorkerMessage>) => {
  const data = event.data;

  switch (data.type) {
    case "INIT":
      if (data.indexJson) {
        try {
          miniSearch = MiniSearch.loadJSON(data.indexJson, searchOptions);
        } catch (e) {
          console.error("Failed to load MiniSearch index from JSON, rebuilding...", e);
          miniSearch = new MiniSearch(searchOptions);
          if (data.notes) miniSearch.addAll(data.notes);
        }
      } else {
        miniSearch = new MiniSearch(searchOptions);
        if (data.notes) miniSearch.addAll(data.notes);
      }
      self.postMessage({ type: "INIT_DONE", indexJson: JSON.stringify(miniSearch) });
      break;

    case "SEARCH":
      if (!data.query.trim()) {
        self.postMessage({ type: "SEARCH_RESULTS", results: [] });
      } else {
        const results = miniSearch.search(data.query);
        const ids = results.map(r => r.id as string);
        self.postMessage({ type: "SEARCH_RESULTS", results: ids });
      }
      break;

    case "UPDATE_NOTE":
      if (miniSearch.has(data.note.id)) {
        miniSearch.replace(data.note);
      } else {
        miniSearch.add(data.note);
      }
      self.postMessage({ type: "INDEX_UPDATED", indexJson: JSON.stringify(miniSearch) });
      break;

    case "DELETE_NOTE":
      if (miniSearch.has(data.noteId)) {
        miniSearch.discard(data.noteId);
        self.postMessage({ type: "INDEX_UPDATED", indexJson: JSON.stringify(miniSearch) });
      }
      break;
  }
};
