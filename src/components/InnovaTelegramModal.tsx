import React, { useState, useEffect } from 'react';
import {
  Mail,
  Send,
  Inbox,
  Star,
  Trash2,
  Plus,
  Search,
  Bell,
  BellOff,
  X,
  CheckCircle2,
  Reply,
  AlertCircle
} from 'lucide-react';
import {
  TelegramMessage,
  loadTelegramMessages,
  sendTelegramMessage,
  markTelegramRead,
  toggleTelegramStar,
  moveTelegramToTrash,
  deleteTelegramForever,
  getTelegramNotificationsEnabled,
  setTelegramNotificationsEnabled
} from '../lib/innovaTelegramDb';

interface InnovaTelegramModalProps {
  currentUserHandle: string;
  onClose: () => void;
}

type FolderType = 'inbox' | 'starred' | 'sent' | 'trash';

export default function InnovaTelegramModal({ currentUserHandle, onClose }: InnovaTelegramModalProps) {
  const cleanUser = currentUserHandle.trim()
    ? (currentUserHandle.trim().startsWith('@') ? currentUserHandle.trim().toUpperCase() : '@' + currentUserHandle.trim().toUpperCase())
    : '@TICKER';

  const [messages, setMessages] = useState<TelegramMessage[]>(() => loadTelegramMessages());
  const [activeFolder, setActiveFolder] = useState<FolderType>('inbox');
  const [selectedMsgId, setSelectedMsgId] = useState<string | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => getTelegramNotificationsEnabled());

  // Compose form state
  const [toHandle, setToHandle] = useState('');
  const [subject, setSubject] = useState('');
  const [priority, setPriority] = useState<'Standard' | 'Urgent' | 'Premiere Invite'>('Standard');
  const [body, setBody] = useState('');
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => {
      setMessages(loadTelegramMessages());
      setNotificationsEnabled(getTelegramNotificationsEnabled());
    };
    window.addEventListener('storage', sync);
    window.addEventListener('innova-telegram-updated', sync);
    window.addEventListener('innova-telegram-pref-changed', sync);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('innova_telegram_sync');
      bc.onmessage = () => sync();
    } catch {}

    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('innova-telegram-updated', sync);
      window.removeEventListener('innova-telegram-pref-changed', sync);
      if (bc) bc.close();
    };
  }, []);

  const handleToggleNotifs = () => {
    const next = !notificationsEnabled;
    setTelegramNotificationsEnabled(next);
    setNotificationsEnabled(next);
    setStatusBanner(next ? '🔔 Live TV Platform Notifications: ENABLED' : '🔕 Live TV Platform Notifications: MUTED (Do Not Disturb)');
    setTimeout(() => setStatusBanner(null), 3000);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!toHandle.trim() || !body.trim()) return;
    const msg = sendTelegramMessage({
      senderHandle: cleanUser,
      recipientHandle: toHandle,
      subject: subject || `Message from ${cleanUser}`,
      body,
      priority
    });
    setMessages(loadTelegramMessages());
    setIsComposing(false);
    setToHandle('');
    setSubject('');
    setBody('');
    setSelectedMsgId(msg.id);
    setStatusBanner(`✓ Innova Telegram dispatched to ${msg.recipientHandle} (Live TV Notification Broadcast Sent!)`);
    setTimeout(() => setStatusBanner(null), 3500);
  };

  const filteredMessages = messages.filter((m) => {
    if (activeFolder === 'trash') return m.trashed;
    if (m.trashed) return false;
    if (activeFolder === 'starred' && !m.starred) return false;
    if (activeFolder === 'sent' && m.senderHandle.toUpperCase() !== cleanUser) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        m.subject.toLowerCase().includes(q) ||
        m.body.toLowerCase().includes(q) ||
        m.senderHandle.toLowerCase().includes(q) ||
        m.recipientHandle.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const selectedMessage = messages.find((m) => m.id === selectedMsgId) || null;
  const unreadCount = messages.filter((m) => !m.trashed && !m.read).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 md:p-8 font-sans">
      <div className="w-full max-w-6xl h-[86vh] bg-[#0B0D14] border-2 border-red-600/50 rounded-2xl shadow-[0_0_60px_rgba(239,68,68,0.25)] flex flex-col overflow-hidden">
        {/* Top Gmail-Style Header Bar */}
        <div className="h-16 px-6 bg-[#11141F] border-b border-white/10 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.5)]">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-wider text-white uppercase">Innova Telegram</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600/20 text-red-400 border border-red-500/30">
                  {cleanUser}
                </span>
              </div>
              <p className="text-[11px] text-gray-400">
                Ecosystem Email &amp; Live Cross-Platform Notification Command Center
              </p>
            </div>
          </div>

          {/* Search Input */}
          <div className="hidden md:flex items-center flex-1 max-w-md bg-[#07090E] border border-white/15 focus-within:border-red-500 rounded-xl px-3.5 py-2">
            <Search className="w-4 h-4 text-gray-400 mr-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search @USER.NAME, subjects, or messages..."
              className="w-full bg-transparent text-xs text-white outline-none"
            />
          </div>

          {/* Live Platform Notification Toggle + Close */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleToggleNotifs}
              className={`cursor-pointer px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
                notificationsEnabled
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                  : 'bg-zinc-800/80 border-white/10 text-gray-400 hover:text-white'
              }`}
              title="Turn Live TV Platform Notifications On or Off"
            >
              {notificationsEnabled ? <Bell className="w-4 h-4 text-emerald-400" /> : <BellOff className="w-4 h-4 text-gray-400" />}
              <span>TV Alerts: {notificationsEnabled ? 'ON' : 'OFF'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer p-2 rounded-xl bg-white/5 hover:bg-red-600 text-gray-300 hover:text-white border border-white/10 transition-all"
              title="Close Innova Telegram"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {statusBanner && (
          <div className="bg-red-950/80 border-b border-red-500/40 px-6 py-2.5 text-xs font-bold text-red-200 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{statusBanner}</span>
          </div>
        )}

        {/* Main 3-Pane Gmail Layout: Left Folders | Middle Message List | Right Reading/Compose Pane */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Folder Sidebar */}
          <div className="w-56 bg-[#0E111A] border-r border-white/10 p-4 flex flex-col justify-between shrink-0">
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => {
                  setIsComposing(true);
                  setSelectedMsgId(null);
                }}
                className="w-full cursor-pointer py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition-all"
              >
                <Plus className="w-4 h-4" />
                Compose Telegram
              </button>

              <nav className="space-y-1">
                <button
                  type="button"
                  onClick={() => { setActiveFolder('inbox'); setIsComposing(false); }}
                  className={`w-full cursor-pointer flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeFolder === 'inbox' && !isComposing
                      ? 'bg-red-600/20 text-white border border-red-500/40'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2.5"><Inbox className="w-4 h-4 text-red-400" /> Inbox</span>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-600 text-white font-extrabold">
                      {unreadCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveFolder('starred'); setIsComposing(false); }}
                  className={`w-full cursor-pointer flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeFolder === 'starred' && !isComposing
                      ? 'bg-red-600/20 text-white border border-red-500/40'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2.5"><Star className="w-4 h-4 text-amber-400" /> Starred</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveFolder('sent'); setIsComposing(false); }}
                  className={`w-full cursor-pointer flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeFolder === 'sent' && !isComposing
                      ? 'bg-red-600/20 text-white border border-red-500/40'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2.5"><Send className="w-4 h-4 text-cyan-400" /> Sent Mail</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveFolder('trash'); setIsComposing(false); }}
                  className={`w-full cursor-pointer flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeFolder === 'trash' && !isComposing
                      ? 'bg-red-600/20 text-white border border-red-500/40'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2.5"><Trash2 className="w-4 h-4 text-gray-400" /> Trash</span>
                </button>
              </nav>
            </div>

            <div className="p-3 rounded-xl bg-[#07090E] border border-white/10 text-[11px] text-gray-400 space-y-1">
              <div className="font-bold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live TV Bridge Active
              </div>
              <p className="text-[10px] leading-relaxed">
                Messages sent here trigger real-time <span className="text-red-400 font-semibold">@USER sent you a message</span> alerts on ArcHaven, Hektic TV, Kreation, MVN &amp; StreamShare.
              </p>
            </div>
          </div>

          {/* Middle Message List */}
          <div className="w-80 md:w-96 border-r border-white/10 flex flex-col bg-[#090B10] shrink-0">
            <div className="p-3.5 border-b border-white/10 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-300">
                {activeFolder.toUpperCase()} ({filteredMessages.length})
              </span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-white/5">
              {filteredMessages.length === 0 ? (
                <div className="p-8 text-center text-gray-500 space-y-2">
                  <Mail className="w-8 h-8 mx-auto text-gray-600 stroke-[1.5]" />
                  <p className="text-xs font-semibold text-gray-400">No messages in {activeFolder}</p>
                  <p className="text-[11px] text-gray-500">
                    Click &ldquo;Compose Telegram&rdquo; to send a live message across the Innova Ecosystem.
                  </p>
                </div>
              ) : (
                filteredMessages.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => {
                      setIsComposing(false);
                      setSelectedMsgId(m.id);
                      if (!m.read) {
                        setMessages(markTelegramRead(m.id, true));
                      }
                    }}
                    className={`p-4 cursor-pointer transition-all hover:bg-white/5 ${
                      selectedMsgId === m.id ? 'bg-red-600/15 border-l-4 border-red-500' : ''
                    } ${!m.read ? 'bg-white/[0.03]' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className={`text-xs truncate ${!m.read ? 'font-extrabold text-white' : 'font-semibold text-gray-300'}`}>
                        {m.senderHandle} &rarr; {m.recipientHandle}
                      </span>
                      <span className="text-[10px] text-gray-500 shrink-0">{m.createdAt.split(',')[0]}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {m.priority === 'Urgent' && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-600 text-white uppercase">Urgent</span>
                      )}
                      {m.priority === 'Premiere Invite' && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500 text-black uppercase">Premiere</span>
                      )}
                      <h4 className={`text-xs truncate ${!m.read ? 'font-bold text-white' : 'text-gray-300'}`}>
                        {m.subject}
                      </h4>
                    </div>
                    <p className="text-[11px] text-gray-500 truncate mt-1">{m.body}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Pane: Compose Form OR Message Reader */}
          <div className="flex-1 bg-[#0B0D14] flex flex-col overflow-y-auto p-6">
            {isComposing ? (
              <form onSubmit={handleSend} className="space-y-5 max-w-2xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <h3 className="text-base font-bold text-white uppercase tracking-wide flex items-center gap-2">
                    <Send className="w-4 h-4 text-red-500" />
                    Compose New Innova Telegram
                  </h3>
                  <span className="text-xs text-gray-400">From: <strong className="text-white">{cleanUser}</strong></span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Recipient @USER.NAME Node
                    </label>
                    <input
                      type="text"
                      required
                      value={toHandle}
                      onChange={(e) => setToHandle(e.target.value)}
                      placeholder="@TICKERTWIZTED or @ALL_NODES"
                      className="w-full rounded-xl bg-[#07090E] border border-white/15 focus:border-red-500 px-4 py-2.5 text-xs text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Priority Alert Level
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className="w-full rounded-xl bg-[#07090E] border border-white/15 focus:border-red-500 px-3 py-2.5 text-xs text-white outline-none"
                    >
                      <option value="Standard">Standard</option>
                      <option value="Urgent">Urgent Alert</option>
                      <option value="Premiere Invite">Premiere Invite</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Subject Line</label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Subject..."
                    className="w-full rounded-xl bg-[#07090E] border border-white/15 focus:border-red-500 px-4 py-2.5 text-xs text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Message Body</label>
                  <textarea
                    rows={8}
                    required
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Write your message here... When you click Send, the recipient will receive a live notification on their active platform if their TV notifications are enabled."
                    className="w-full rounded-xl bg-[#07090E] border border-white/15 focus:border-red-500 px-4 py-3 text-xs text-white outline-none leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsComposing(false)}
                    className="cursor-pointer px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="cursor-pointer px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-red-600/30"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Send &amp; Broadcast Live Alert
                  </button>
                </div>
              </form>
            ) : selectedMessage ? (
              <div className="space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white">
                        {selectedMessage.priority}
                      </span>
                      <span className="text-xs text-gray-400">{selectedMessage.createdAt}</span>
                    </div>
                    <h3 className="text-xl font-bold text-white">{selectedMessage.subject}</h3>
                    <p className="text-xs text-gray-400 mt-1">
                      From: <strong className="text-white">{selectedMessage.senderHandle}</strong> &bull; To: <strong className="text-red-400">{selectedMessage.recipientHandle}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMessages(toggleTelegramStar(selectedMessage.id))}
                      className={`cursor-pointer p-2 rounded-xl border border-white/10 ${
                        selectedMessage.starred ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-gray-400 hover:text-white'
                      }`}
                      title="Star Message"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsComposing(true);
                        setToHandle(selectedMessage.senderHandle);
                        setSubject(selectedMessage.subject.startsWith('Re:') ? selectedMessage.subject : `Re: ${selectedMessage.subject}`);
                      }}
                      className="cursor-pointer px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5"
                    >
                      <Reply className="w-3.5 h-3.5" />
                      Reply
                    </button>
                    {selectedMessage.trashed ? (
                      <button
                        type="button"
                        onClick={() => {
                          setMessages(deleteTelegramForever(selectedMessage.id));
                          setSelectedMsgId(null);
                        }}
                        className="cursor-pointer px-3 py-2 rounded-xl bg-rose-600/20 border border-rose-500/40 text-rose-300 text-xs font-bold"
                      >
                        Delete Forever
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setMessages(moveTelegramToTrash(selectedMessage.id));
                          setSelectedMsgId(null);
                        }}
                        className="cursor-pointer p-2 rounded-xl bg-white/5 hover:bg-rose-600/20 text-gray-400 hover:text-rose-400 border border-white/10"
                        title="Move to Trash"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-[#07090E] border border-white/10 text-sm text-gray-200 whitespace-pre-wrap leading-relaxed min-h-[220px]">
                  {selectedMessage.body}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 space-y-3">
                <Mail className="w-12 h-12 text-red-500/40 stroke-[1.25]" />
                <h4 className="text-sm font-bold text-gray-300">Select a message or compose a new Innova Telegram</h4>
                <p className="text-xs text-gray-500 max-w-md">
                  Communicate with any @USER.NAME Node across the Innova Ecosystem. Recipients with Platform Notifications enabled receive instant live alerts on their TV or dashboard.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
