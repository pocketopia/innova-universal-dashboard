// Innova Telegram — Email-Grade Messaging Database & Live Cross-Platform Notification Engine
// 100% Zero-Mock Baseline: Starts with 0 fake messages.

export interface TelegramMessage {
  id: string;
  senderHandle: string;
  recipientHandle: string;
  subject: string;
  body: string;
  priority: 'Standard' | 'Urgent' | 'Premiere Invite';
  read: boolean;
  starred: boolean;
  trashed: boolean;
  createdAt: string;
  timestampMs: number;
}

const STORAGE_KEY = 'innova_telegram_messages_v1';
const NOTIF_PREF_KEY = 'innova_telegram_notifications_enabled';

export function getTelegramNotificationsEnabled(): boolean {
  try {
    const val = localStorage.getItem(NOTIF_PREF_KEY);
    if (val === null) return true; // Default ON unless user toggles OFF
    return val === 'true';
  } catch {
    return true;
  }
}

export function setTelegramNotificationsEnabled(enabled: boolean): boolean {
  try {
    localStorage.setItem(NOTIF_PREF_KEY, enabled ? 'true' : 'false');
    const bc = new BroadcastChannel('innova_telegram_sync');
    bc.postMessage({ type: 'INNOVA_TELEGRAM_PREF_CHANGED', enabled });
    bc.close();
  } catch {}
  window.dispatchEvent(new CustomEvent('innova-telegram-pref-changed', { detail: { enabled } }));
  return enabled;
}

export function loadTelegramMessages(): TelegramMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveTelegramMessages(list: TelegramMessage[]): TelegramMessage[] {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {}
  window.dispatchEvent(new CustomEvent('innova-telegram-updated', { detail: list }));
  return list;
}

export function sendTelegramMessage(params: {
  senderHandle: string;
  recipientHandle: string;
  subject: string;
  body: string;
  priority?: 'Standard' | 'Urgent' | 'Premiere Invite';
}): TelegramMessage {
  const cleanSender = params.senderHandle.trim()
    ? (params.senderHandle.trim().startsWith('@') ? params.senderHandle.trim().toUpperCase() : '@' + params.senderHandle.trim().toUpperCase())
    : '@TICKER';
  const cleanRecipient = params.recipientHandle.trim()
    ? (params.recipientHandle.trim().startsWith('@') ? params.recipientHandle.trim().toUpperCase() : '@' + params.recipientHandle.trim().toUpperCase())
    : '@ALL_NODES';

  const msg: TelegramMessage = {
    id: 'tg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    senderHandle: cleanSender,
    recipientHandle: cleanRecipient,
    subject: params.subject.trim() || '(No Subject)',
    body: params.body.trim(),
    priority: params.priority || 'Standard',
    read: false,
    starred: false,
    trashed: false,
    createdAt: new Date().toLocaleString(),
    timestampMs: Date.now()
  };

  fetch(`${((import.meta as any).env?.VITE_API_URL || 'https://innova-master-brain-api.onrender.com/api').replace(/\/+$/, '')}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-tenant-id': 'InnovaHub', 'x-user-name': cleanSender },
    body: JSON.stringify({
      channel: 'telegram',
      from: cleanSender,
      to: cleanRecipient,
      projectTitle: msg.subject,
      content: msg.body,
    }),
  }).catch(() => {});

  const current = loadTelegramMessages();
  const updated = [msg, ...current];
  saveTelegramMessages(updated);

  // Broadcast live to all open tabs & all 5 TV platforms!
  try {
    const bc = new BroadcastChannel('innova_telegram_sync');
    bc.postMessage({ type: 'INNOVA_TELEGRAM_NEW_MESSAGE', message: msg });
    bc.close();
  } catch {}

  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'INNOVA_TELEGRAM_NEW_MESSAGE', message: msg }, '*');
    }
  } catch {}

  return msg;
}

export function markTelegramRead(id: string, read: boolean = true): TelegramMessage[] {
  const list = loadTelegramMessages().map((m) => (m.id === id ? { ...m, read } : m));
  return saveTelegramMessages(list);
}

export function toggleTelegramStar(id: string): TelegramMessage[] {
  const list = loadTelegramMessages().map((m) => (m.id === id ? { ...m, starred: !m.starred } : m));
  return saveTelegramMessages(list);
}

export function moveTelegramToTrash(id: string): TelegramMessage[] {
  const list = loadTelegramMessages().map((m) => (m.id === id ? { ...m, trashed: true } : m));
  return saveTelegramMessages(list);
}

export function deleteTelegramForever(id: string): TelegramMessage[] {
  const list = loadTelegramMessages().filter((m) => m.id !== id);
  return saveTelegramMessages(list);
}


const getBrainApiBase = (): string => {
  const raw = (import.meta as any).env?.VITE_API_URL || 'https://innova-master-brain-api.onrender.com/api';
  const clean = String(raw).replace(/\/+$/, '');
  return clean.endsWith('/api') ? clean : `${clean}/api`;
};

export async function syncTelegramWithMasterBrain(activeHandle?: string): Promise<TelegramMessage[]> {
  try {
    const rawH = activeHandle || localStorage.getItem('innova-username') || '@TICKER';
    const cleanH = rawH.trim().startsWith('@') ? rawH.trim().toUpperCase() : '@' + rawH.trim().toUpperCase();
    const res = await fetch(`${getBrainApiBase()}/messages?tenant=ALL&handle=${encodeURIComponent(cleanH)}`, {
      headers: { 'x-tenant-id': 'ALL', 'x-user-name': cleanH }
    });
    if (!res.ok) return loadTelegramMessages();
    const data = await res.json();
    const remoteList = Array.isArray(data.messages) ? data.messages : [];
    const localList = loadTelegramMessages();
    const byId = new Map<string, TelegramMessage>();
    localList.forEach((m) => byId.set(m.id, m));

    let changed = false;
    for (const rm of remoteList) {
      if (!byId.has(rm.id)) {
        changed = true;
        byId.set(rm.id, {
          id: rm.id,
          senderHandle: rm.from || '@USER',
          recipientHandle: rm.to || cleanH,
          subject: rm.channel === 'platform_live'
            ? `[GOLDEN LIVE • ${rm.tenant || 'StreamShare'}] ${rm.projectTitle || 'Screening Note'}`
            : `[${rm.tenant || 'Innova'} Direct] ${rm.projectTitle || 'Message'}`,
          body: rm.content || '',
          priority: rm.channel === 'platform_live' ? 'Premiere Invite' : 'Standard',
          read: Boolean(rm.isRead),
          starred: false,
          trashed: false,
          createdAt: rm.timestamp ? new Date(rm.timestamp).toLocaleString() : new Date().toLocaleString(),
          timestampMs: rm.timestamp ? new Date(rm.timestamp).getTime() : Date.now(),
        });
      }
    }
    const merged = Array.from(byId.values()).sort((a, b) => b.timestampMs - a.timestampMs);
    if (changed) saveTelegramMessages(merged);
    return merged;
  } catch {
    return loadTelegramMessages();
  }
}
