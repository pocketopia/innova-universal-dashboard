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
  Users,
  UserPlus,
  Laptop,
  ShieldCheck,
  UserCheck,
  Trash
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
import {
  FriendConnection,
  SharedDevicePermission,
  loadFriendsList,
  addFriendConnection,
  removeFriendConnection,
  loadSharedDevicePermissions,
  grantFriendDevicePermissionRequest,
  approveFriendDevicePermission,
  revokeFriendFromMyDevice,
  parseLiveDeviceInfo
} from '../lib/deviceBondRegistry';

interface InnovaTelegramModalProps {
  currentUserHandle: string;
  onClose: () => void;
}

type FolderType = 'inbox' | 'friends' | 'starred' | 'sent' | 'trash';

export default function InnovaTelegramModal({ currentUserHandle, onClose }: InnovaTelegramModalProps) {
  const cleanUser = currentUserHandle.trim()
    ? (currentUserHandle.trim().startsWith('@') ? currentUserHandle.trim().toUpperCase() : '@' + currentUserHandle.trim().toUpperCase())
    : '@TICKER';

  const [messages, setMessages] = useState<TelegramMessage[]>(() =>
    loadTelegramMessages().filter(
      (m) =>
        !m.senderHandle.toUpperCase().includes('HENRY') &&
        !m.recipientHandle.toUpperCase().includes('HENRY')
    )
  );
  const [activeFolder, setActiveFolder] = useState<FolderType>('inbox');
  const [selectedMsgId, setSelectedMsgId] = useState<string | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => getTelegramNotificationsEnabled());

  // Friends & Friend Profile State
  const [friends, setFriends] = useState<FriendConnection[]>(() => loadFriendsList());
  const [selectedFriend, setSelectedFriend] = useState<FriendConnection | null>(null);
  const [newFriendHandle, setNewFriendHandle] = useState('');
  const [newFriendName, setNewFriendName] = useState('');
  const [sharedPerms, setSharedPerms] = useState<SharedDevicePermission[]>(() => loadSharedDevicePermissions());

  // Compose form state
  const [toHandle, setToHandle] = useState('');
  const [subject, setSubject] = useState('');
  const [priority, setPriority] = useState<'Standard' | 'Urgent' | 'Premiere Invite'>('Standard');
  const [body, setBody] = useState('');
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const deviceInfo = parseLiveDeviceInfo();

  useEffect(() => {
    const sync = () => {
      setMessages(
        loadTelegramMessages().filter(
          (m) =>
            !m.senderHandle.toUpperCase().includes('HENRY') &&
            !m.recipientHandle.toUpperCase().includes('HENRY')
        )
      );
      setNotificationsEnabled(getTelegramNotificationsEnabled());
      setFriends(loadFriendsList());
      setSharedPerms(loadSharedDevicePermissions());
    };
    window.addEventListener('storage', sync);
    window.addEventListener('innova-telegram-updated', sync);
    window.addEventListener('innova-telegram-pref-changed', sync);
    window.addEventListener('innova-shared-devices-updated', sync);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('innova_telegram_sync');
      bc.onmessage = () => sync();
    } catch {}

    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('innova-telegram-updated', sync);
      window.removeEventListener('innova-telegram-pref-changed', sync);
      window.removeEventListener('innova-shared-devices-updated', sync);
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

  const handleAddFriend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFriendHandle.trim()) return;
    const cleanH = newFriendHandle.trim().replace(/^@+/, '').toUpperCase();
    if (cleanH === 'HENRY') {
      setStatusBanner('❌ @HENRY is permanently blocked from the Innova Ecosystem.');
      setTimeout(() => setStatusBanner(null), 3500);
      return;
    }
    const updated = addFriendConnection(cleanH, newFriendName);
    setFriends(updated);
    const added = updated.find((f) => f.handle.toUpperCase() === `@${cleanH}`) || null;
    setSelectedFriend(added);
    setNewFriendHandle('');
    setNewFriendName('');
    setStatusBanner(`✓ Added @${cleanH} to your Verified Friends List! Click their profile to message or grant device permission.`);
    setTimeout(() => setStatusBanner(null), 3500);
  };

  // Sent from Friend's Profile -> "Allow User to Use My Device"
  const handleAllowFriendToUseMyDevice = (friend: FriendConnection) => {
    const msgSubject = `[DEVICE PERMISSION HANDSHAKE] ${cleanUser} wants to grant "${friend.displayName}" (${friend.handle}) permission to login on his device`;
    const msgBody = `${cleanUser} wants to grant "${friend.displayName}" (${friend.handle}) permission to login on his device (${deviceInfo.name}).\n\nClick the "Approve Device Permission" button below to complete the Full-Circle Handshake and unlock login access on ${cleanUser}'s computer.`;

    const sentMsg = sendTelegramMessage({
      senderHandle: cleanUser,
      recipientHandle: friend.handle,
      subject: msgSubject,
      body: msgBody,
      priority: 'Urgent'
    });

    grantFriendDevicePermissionRequest(cleanUser, friend.handle, friend.displayName, sentMsg.id);
    setSharedPerms(loadSharedDevicePermissions());
    setMessages(loadTelegramMessages());
    setActiveFolder('inbox');
    setSelectedMsgId(sentMsg.id);
    setStatusBanner(`✓ Sent Device Permission Handshake to ${friend.handle}! Once ${friend.displayName} clicks "Approve" on the message, they can log in on your laptop.`);
    setTimeout(() => setStatusBanner(null), 4500);
  };

  // Triggered when the recipient clicks "Approve" inside the Telegram Handshake Message
  const handleApproveDeviceHandshakeInMessage = (msg: TelegramMessage) => {
    const approved = approveFriendDevicePermission(msg.recipientHandle);
    setSharedPerms(loadSharedDevicePermissions());
    setStatusBanner(
      `✓ APPROVED! ${msg.recipientHandle} is now authorized to log in on ${msg.senderHandle}'s device (${deviceInfo.name}). Manage or remove anytime under Identity -> Shared Devices.`
    );
    setTimeout(() => setStatusBanner(null), 5000);
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
    setStatusBanner(`✓ Innova Telegram dispatched to ${msg.recipientHandle}`);
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

  // Check if selectedMessage is a Device Permission Handshake
  const matchingPermForMessage = selectedMessage
    ? sharedPerms.find(
        (p) =>
          p.telegramMessageId === selectedMessage.id ||
          p.friendHandle.toUpperCase() === selectedMessage.recipientHandle.toUpperCase()
      )
    : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 md:p-8 font-sans">
      <div className="w-full max-w-6xl h-[86vh] bg-[#0B0D14] border-2 border-cyan-500/40 rounded-2xl shadow-[0_0_60px_rgba(6,182,212,0.25)] flex flex-col overflow-hidden">
        {/* Top Cool-Blue Header Bar */}
        <div className="h-16 px-6 bg-[#11141F] border-b border-white/10 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.45)]">
              <Mail className="w-5 h-5 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-wider text-white uppercase">Innova Telegram</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                  {cleanUser}
                </span>
              </div>
              <p className="text-[11px] text-gray-400">
                Ecosystem Email, Verified Friends &amp; Shared-Device Handshake Center
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center flex-1 max-w-md bg-[#07090E] border border-white/15 focus-within:border-red-500 rounded-xl px-3.5 py-2">
            <Search className="w-4 h-4 text-gray-400 mr-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search @USER.NAME, friends, or messages..."
              className="w-full bg-transparent text-xs text-white outline-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleToggleNotifs}
              className={`cursor-pointer px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
                notificationsEnabled
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                  : 'bg-zinc-800/80 border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              {notificationsEnabled ? <Bell className="w-4 h-4 text-emerald-400" /> : <BellOff className="w-4 h-4 text-gray-400" />}
              <span>TV Alerts: {notificationsEnabled ? 'ON' : 'OFF'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer p-2 rounded-xl bg-white/5 hover:bg-cyan-500 text-gray-300 hover:text-black border border-white/10 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {statusBanner && (
          <div className="bg-cyan-950/80 border-b border-cyan-400/40 px-6 py-2.5 text-xs font-bold text-cyan-200 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusBanner}</span>
          </div>
        )}

        {/* Main 3-Pane Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Navigation Sidebar */}
          <div className="w-56 bg-[#0E111A] border-r border-white/10 p-4 flex flex-col justify-between shrink-0">
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => {
                  setIsComposing(true);
                  setSelectedMsgId(null);
                  setActiveFolder('inbox');
                }}
                className="w-full cursor-pointer py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition-all"
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
                      ? 'bg-cyan-500/20 text-white border border-cyan-400/40'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2.5"><Inbox className="w-4 h-4 text-cyan-400" /> Inbox</span>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-cyan-400 text-black font-extrabold">
                      {unreadCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveFolder('friends'); setIsComposing(false); }}
                  className={`w-full cursor-pointer flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeFolder === 'friends' && !isComposing
                      ? 'bg-cyan-500/20 text-white border border-cyan-400/40'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2.5"><Users className="w-4 h-4 text-emerald-400" /> Friends &amp; Profiles</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-bold">
                    {friends.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveFolder('starred'); setIsComposing(false); }}
                  className={`w-full cursor-pointer flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeFolder === 'starred' && !isComposing
                      ? 'bg-cyan-500/20 text-white border border-cyan-400/40'
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
                      ? 'bg-cyan-500/20 text-white border border-cyan-400/40'
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
                      ? 'bg-cyan-500/20 text-white border border-cyan-400/40'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2.5"><Trash2 className="w-4 h-4 text-gray-400" /> Trash</span>
                </button>
              </nav>
            </div>

            <div className="p-3 rounded-xl bg-[#07090E] border border-cyan-500/20 text-[11px] text-gray-400 space-y-1">
              <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                Friend Device Handshake
              </div>
              <p className="text-[10px] leading-relaxed">
                Open <strong className="text-white">Friends &amp; Profiles</strong> to add a friend, view their profile, and click <strong className="text-cyan-300">Allow User to Use My Device</strong>.
              </p>
            </div>
          </div>

          {/* Middle List Pane (Shows Friends List when activeFolder === 'friends', otherwise Message List) */}
          {activeFolder === 'friends' ? (
            <div className="w-80 md:w-96 border-r border-white/10 flex flex-col bg-[#090B10] shrink-0">
              <div className="p-4 border-b border-white/10 space-y-3">
                <span className="text-xs font-black uppercase tracking-wider text-cyan-300 block">
                  Add Friend by @USER.NAME Node
                </span>
                <form onSubmit={handleAddFriend} className="space-y-2">
                  <input
                    type="text"
                    required
                    value={newFriendHandle}
                    onChange={(e) => setNewFriendHandle(e.target.value.toUpperCase())}
                    placeholder="@JON_DOE"
                    className="w-full rounded-xl bg-[#07090E] border border-white/15 focus:border-red-500 px-3 py-2 text-xs text-white font-mono outline-none"
                  />
                  <input
                    type="text"
                    value={newFriendName}
                    onChange={(e) => setNewFriendName(e.target.value)}
                    placeholder="Display Name (e.g. Jon Doe)"
                    className="w-full rounded-xl bg-[#07090E] border border-white/15 focus:border-red-500 px-3 py-2 text-xs text-white outline-none"
                  />
                  <button
                    type="submit"
                    className="w-full cursor-pointer py-2 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Add Verified Friend
                  </button>
                </form>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-white/5">
                {friends.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 space-y-2">
                    <Users className="w-8 h-8 mx-auto text-cyan-500/40" />
                    <p className="text-xs font-semibold text-gray-400">No friends added yet</p>
                    <p className="text-[11px] text-gray-500">
                      Add a friend above (e.g., <strong className="text-gray-300">@JON_DOE</strong>) to open their profile and grant permission to use your device.
                    </p>
                  </div>
                ) : (
                  friends.map((fr) => {
                    const perm = sharedPerms.find((p) => p.friendHandle.toUpperCase() === fr.handle.toUpperCase());
                    return (
                      <div
                        key={fr.handle}
                        onClick={() => setSelectedFriend(fr)}
                        className={`p-4 cursor-pointer transition-all hover:bg-white/5 ${
                          selectedFriend?.handle === fr.handle ? 'bg-cyan-500/15 border-l-4 border-cyan-400' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs font-black text-white">{fr.displayName}</div>
                            <div className="text-[11px] font-mono text-cyan-400">{fr.handle}</div>
                          </div>
                          {perm && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                perm.status === 'approved'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              }`}
                            >
                              {perm.status === 'approved' ? 'On Your Device' : 'Pending Approval'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
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
                      Click &ldquo;Friends &amp; Profiles&rdquo; on the left to add a friend and grant device login permission, or click &ldquo;Compose Telegram&rdquo;.
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
                        selectedMsgId === m.id ? 'bg-cyan-500/15 border-l-4 border-cyan-400' : ''
                      } ${!m.read ? 'bg-white/[0.03]' : ''}`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={`text-xs truncate ${!m.read ? 'font-extrabold text-white' : 'font-semibold text-gray-300'}`}>
                          {m.senderHandle} &rarr; {m.recipientHandle}
                        </span>
                        <span className="text-[10px] text-gray-500 shrink-0">{m.createdAt.split(',')[0]}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {m.subject.includes('DEVICE PERMISSION HANDSHAKE') && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-cyan-400 text-black uppercase">Handshake</span>
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
          )}

          {/* Right Pane: Friend Profile View OR Compose Form OR Message Reader */}
          <div className="flex-1 bg-[#0B0D14] flex flex-col overflow-y-auto p-6">
            {activeFolder === 'friends' ? (
              selectedFriend ? (
                <div className="space-y-6 max-w-xl">
                  <div className="p-6 rounded-2xl bg-[#07090E] border border-cyan-500/30 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-2xl font-black text-cyan-300">
                        {selectedFriend.displayName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          ✓ Verified Ecosystem Friend
                        </span>
                        <h3 className="text-2xl font-black text-white mt-1">{selectedFriend.displayName}</h3>
                        <p className="text-sm font-mono text-cyan-400">{selectedFriend.handle}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setFriends(removeFriendConnection(selectedFriend.handle));
                        setSharedPerms(loadSharedDevicePermissions());
                        setSelectedFriend(null);
                      }}
                      className="cursor-pointer px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-1.5"
                    >
                      <Trash className="w-3.5 h-3.5" />
                      Remove Friend
                    </button>
                  </div>

                  {/* ALLOW USER TO USE MY DEVICE CARD */}
                  <div className="p-6 rounded-2xl bg-[#07090E] border-2 border-cyan-400/40 shadow-[0_0_30px_rgba(6,182,212,0.12)] space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Laptop className="w-5 h-5 text-cyan-400" />
                        <h4 className="text-sm font-black uppercase tracking-wider text-white">
                          Shared Device Access Control ({deviceInfo.name})
                        </h4>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      Grant <strong className="text-white">{selectedFriend.displayName}</strong> (<strong className="text-cyan-300">{selectedFriend.handle}</strong>) permission to log into their account on your device (<strong className="text-white">{deviceInfo.name}</strong>). Clicking the button below sends an official Innova Telegram handshake message stating:
                      <br />
                      <em className="text-cyan-300 block mt-2 p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30">
                        &ldquo;{cleanUser} wants to grant &quot;{selectedFriend.displayName}&quot; ({selectedFriend.handle}) permission to login on his device.&rdquo;
                      </em>
                    </p>

                    {(() => {
                      const existingPerm = sharedPerms.find(
                        (p) => p.friendHandle.toUpperCase() === selectedFriend.handle.toUpperCase()
                      );
                      if (existingPerm && existingPerm.status === 'approved') {
                        return (
                          <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-emerald-950/50 border border-emerald-500/40">
                            <div className="text-xs text-emerald-200 font-bold">
                              ✓ {selectedFriend.displayName} ({selectedFriend.handle}) is currently approved to use this device.
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSharedPerms(revokeFriendFromMyDevice(selectedFriend.handle));
                                setStatusBanner(`Revoked ${selectedFriend.handle} from your device.`);
                              }}
                              className="cursor-pointer px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase shrink-0"
                            >
                              Remove from My Device
                            </button>
                          </div>
                        );
                      }
                      return (
                        <button
                          type="button"
                          onClick={() => handleAllowFriendToUseMyDevice(selectedFriend)}
                          className="cursor-pointer w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2"
                        >
                          <UserCheck className="w-4 h-4" />
                          Allow User to Use My Device
                        </button>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 space-y-3">
                  <Users className="w-12 h-12 text-cyan-400/40" />
                  <h4 className="text-sm font-bold text-gray-300">Select or Add a Friend on the Left</h4>
                  <p className="text-xs text-gray-500 max-w-md">
                    Once you select a friend&apos;s profile, you can click <strong className="text-cyan-300">Allow User to Use My Device</strong> to send them a Telegram device-sharing approval prompt.
                  </p>
                </div>
              )
            ) : isComposing ? (
              <form onSubmit={handleSend} className="space-y-5 max-w-2xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <h3 className="text-base font-bold text-white uppercase tracking-wide flex items-center gap-2">
                    <Send className="w-4 h-4 text-cyan-400" />
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
                      placeholder="@JON_DOE"
                      className="w-full rounded-xl bg-[#07090E] border border-white/15 focus:border-red-500 px-4 py-2.5 text-xs text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Priority Level
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
                    rows={7}
                    required
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Write your message here..."
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
                    className="cursor-pointer px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-xs font-black text-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-cyan-500/25"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Send Telegram
                  </button>
                </div>
              </form>
            ) : selectedMessage ? (
              <div className="space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-cyan-400 text-black uppercase">
                        {selectedMessage.priority}
                      </span>
                      <span className="text-xs text-gray-400">{selectedMessage.createdAt}</span>
                    </div>
                    <h3 className="text-lg font-bold text-white">{selectedMessage.subject}</h3>
                    <p className="text-xs text-gray-400 mt-1">
                      From: <strong className="text-white">{selectedMessage.senderHandle}</strong> &bull; To: <strong className="text-cyan-400">{selectedMessage.recipientHandle}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMessages(toggleTelegramStar(selectedMessage.id))}
                      className={`cursor-pointer p-2 rounded-xl border border-white/10 ${
                        selectedMessage.starred ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-gray-400 hover:text-white'
                      }`}
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
                      className="cursor-pointer px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-black flex items-center gap-1.5"
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
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-[#07090E] border border-white/10 text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
                  {selectedMessage.body}
                </div>

                {/* INTERACTIVE DEVICE PERMISSION HANDSHAKE APPROVAL BOX INSIDE TELEGRAM MESSAGE */}
                {selectedMessage.subject.includes('DEVICE PERMISSION HANDSHAKE') && (
                  <div className="p-6 rounded-2xl bg-gradient-to-r from-cyan-950/70 to-blue-950/70 border-2 border-cyan-400/50 shadow-[0_0_30px_rgba(6,182,212,0.2)] space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-cyan-400 text-black">
                        Full-Circle Device Permission Handshake
                      </span>
                      <span className="text-xs font-mono text-cyan-300">
                        Host: {selectedMessage.senderHandle} &rarr; Guest: {selectedMessage.recipientHandle}
                      </span>
                    </div>

                    <p className="text-sm font-bold text-white">
                      {selectedMessage.senderHandle} wants to grant &ldquo;{matchingPermForMessage?.friendDisplayName || selectedMessage.recipientHandle}&rdquo; permission to login on his device ({deviceInfo.name}).
                    </p>

                    {matchingPermForMessage?.status === 'approved' ? (
                      <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-emerald-950/70 border border-emerald-500/50">
                        <span className="text-xs font-black text-emerald-300 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          APPROVED — {selectedMessage.recipientHandle} can now log in on {selectedMessage.senderHandle}&apos;s laptop!
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSharedPerms(revokeFriendFromMyDevice(selectedMessage.recipientHandle));
                            setStatusBanner(`Removed ${selectedMessage.recipientHandle} from your device.`);
                          }}
                          className="cursor-pointer px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase shrink-0"
                        >
                          Remove from My Device
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleApproveDeviceHandshakeInMessage(selectedMessage)}
                        className="cursor-pointer w-full py-3.5 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Approve Device Login Permission (As {selectedMessage.recipientHandle})
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 space-y-3">
                <Mail className="w-12 h-12 text-cyan-400/40 stroke-[1.25]" />
                <h4 className="text-sm font-bold text-gray-300">Select a message or open Friends &amp; Profiles</h4>
                <p className="text-xs text-gray-500 max-w-md">
                  To allow a friend to log into their node on your laptop, open <strong className="text-cyan-300">Friends &amp; Profiles</strong> on the left, click their profile, and click <strong className="text-white">Allow User to Use My Device</strong>.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
