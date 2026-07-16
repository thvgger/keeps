import { useState, useEffect } from "react";
import { X, Users, Link as LinkIcon, Copy, Trash2, Shield, UserPlus } from "lucide-react";

interface Collaborator {
  user_id: string;
  role: string;
  username: string;
  email: string;
  avatar_url?: string;
}

interface ShareModalProps {
  noteId: string;
  isOpen: boolean;
  onClose: () => void;
  publicLinkId?: string;
  publicRole?: string;
}

export default function ShareModal({ noteId, isOpen, onClose, publicLinkId, publicRole }: ShareModalProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [role, setRole] = useState("viewer");
  const [error, setError] = useState("");
  const [shareLink, setShareLink] = useState(publicLinkId ? `${window.location.origin}/notes/shared/${publicLinkId}` : "");
  const [linkRole, setLinkRole] = useState(publicRole || "viewer");

  useEffect(() => {
    if (isOpen) {
      fetchCollaborators();
    }
  }, [isOpen, noteId]);

  const fetchCollaborators = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/notes/${noteId}/collaborators`);
      if (res.ok) {
        const data = await res.json();
        setCollaborators(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addCollaborator = async () => {
    if (!emailOrUsername.trim()) return;
    setError("");
    try {
      const res = await fetch(`/api/notes/${noteId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailOrUsername, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to add collaborator");
        return;
      }
      setEmailOrUsername("");
      fetchCollaborators();
    } catch (err) {
      setError("An unexpected error occurred");
    }
  };

  const removeCollaborator = async (userId: string) => {
    try {
      const res = await fetch(`/api/notes/${noteId}/collaborators`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: userId }),
      });
      if (res.ok) {
        fetchCollaborators();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const generateLink = async () => {
    try {
      const res = await fetch(`/api/notes/${noteId}/share-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: linkRole, generateNew: true }),
      });
      const data = await res.json();
      if (res.ok && data.publicLinkId) {
        setShareLink(`${window.location.origin}/notes/shared/${data.publicLinkId}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const disableLink = async () => {
    try {
      const res = await fetch(`/api/notes/${noteId}/share-link`, {
        method: "DELETE",
      });
      if (res.ok) {
        setShareLink("");
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Users size={20} />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Share Note</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Invite via Email / Username */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider flex items-center gap-2">
              <UserPlus size={16} /> Invite People
            </h3>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Email address or username"
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-black"
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                />
                <select
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-700 font-medium"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                </select>
              </div>
              {error && <p className="text-red-500 text-xs font-medium bg-red-50 p-2 rounded-md">{error}</p>}
              <button
                onClick={addCollaborator}
                disabled={!emailOrUsername.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                Send Invite
              </button>
            </div>
          </div>

          {/* Collaborators List */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider flex items-center gap-2">
              <Shield size={16} /> People with access
            </h3>
            {loading ? (
              <div className="flex justify-center py-4">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : collaborators.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-xl border border-gray-100 border-dashed">
                <p className="text-sm text-gray-500">No one else has access to this note yet.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {collaborators.map((c) => (
                  <li key={c.user_id} className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 text-white flex items-center justify-center font-bold shadow-inner">
                        {c.avatar_url ? <img src={c.avatar_url} alt="" className="w-full h-full rounded-full object-cover" /> : c.username?.charAt(0).toUpperCase() || c.email.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-800">{c.username || "User"}</span>
                        <span className="text-xs text-gray-500">{c.email}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-1 rounded-md font-medium ${c.role === 'editor' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {c.role === "editor" ? "Editor" : "Viewer"}
                      </span>
                      <button
                        onClick={() => removeCollaborator(c.user_id)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1.5 hover:bg-red-50 rounded-md"
                        title="Remove access"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Public Link */}
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider flex items-center gap-2">
              <LinkIcon size={16} /> General Access
            </h3>
            {shareLink ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1.5 shadow-sm">
                  <input
                    type="text"
                    readOnly
                    value={shareLink}
                    className="flex-1 bg-transparent text-sm text-gray-600 px-2 outline-none font-mono text-xs"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(shareLink);
                      alert("Link copied!");
                    }}
                    className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
                    title="Copy link"
                  >
                    <Copy size={16} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500 font-medium">Anyone with the link can {linkRole}</p>
                  <button
                    onClick={disableLink}
                    className="text-xs text-red-500 hover:text-red-700 font-semibold hover:underline"
                  >
                    Remove Link
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-800">Restricted</span>
                  <span className="text-xs text-gray-500">Only people with access can open</span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    className="border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white shadow-sm"
                    value={linkRole}
                    onChange={(e) => setLinkRole(e.target.value)}
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                  </select>
                  <button
                    onClick={generateLink}
                    className="text-sm text-blue-600 hover:text-blue-800 font-semibold hover:underline"
                  >
                    Create Link
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        
      </div>
    </div>
  );
}
