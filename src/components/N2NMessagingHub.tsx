/**
 * N2N Messaging Hub Component
 * 
 * User interface for the Node-to-Node messaging system.
 * Provides secure P2P communication with zero-trust validation
 * and spam annihilator protection.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Shield,
  Lock,
  Unlock,
  Users,
  Plus,
  Search,
  Key,
  QrCode,
  Copy,
  Check,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Eye,
  EyeOff,
  Zap,
  Clock,
  ArrowLeft
} from 'lucide-react';
import {
  NodeIdentity,
  N2NMessage,
  WhitelistEntry,
  MicroTollProof,
  getOrCreateNodeIdentity,
  getNodeIdentity,
  getWhitelist,
  addToWhitelist,
  removeFromWhitelist,
  isWhitelisted,
  composeN2NMessage,
  prepareForTransmission,
  transmitP2P,
  receiveP2P,
  generateMicroTollProof,
  verifyMicroTollProof,
  exportPublicKey,
  importPublicKey,
  getSeenNonces,
  signData,
  verifySignature
} from '../lib/n2nMessaging';

interface N2NMessagingHubProps {
  userHandle: string;
  onBack?: () => void;
}

interface Conversation {
  participant: WhitelistEntry;
  messages: N2NMessage[];
  lastActivity: number;
  unreadCount: number;
}

type TabType = 'messages' | 'contacts' | 'identity' | 'security';

export default function N2NMessagingHub({ userHandle, onBack }: N2NMessagingHubProps) {
  const [activeTab, setActiveTab] = useState<TabType>('messages');
  const [identity, setIdentity] = useState<NodeIdentity | null>(null);
  const [whitelist, setWhitelist] = useState<WhitelistEntry[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showPublicKey, setShowPublicKey] = useState(false);
  const [importKeyData, setImportKeyData] = useState('');
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingTollMessages, setPendingTollMessages] = useState<Array<{ message: N2NMessage; proof: MicroTollProof }>>([]);
  const [isProcessingToll, setIsProcessingToll] = useState(false);
  const [newContactHandle, setNewContactHandle] = useState('');
  const [newContactPublicKey, setNewContactPublicKey] = useState('');
  const [showAddContact, setShowAddContact] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize identity on mount
  useEffect(() => {
    const initIdentity = async () => {
      const nodeIdentity = await getOrCreateNodeIdentity(userHandle);
      setIdentity(nodeIdentity);
    };
    initIdentity();
  }, [userHandle]);

  // Load whitelist on mount and when tab changes
  useEffect(() => {
    setWhitelist(getWhitelist());
  }, [activeTab]);

  // Load conversations
  useEffect(() => {
    if (identity) {
      loadConversations();
    }
  }, [identity]);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations, selectedConversation]);

  const loadConversations = () => {
    if (!identity) return;
    
    const loadedConversations: Conversation[] = [];
    
    whitelist.forEach(contact => {
      try {
        const inboundKey = `innova-n2n-inbound-${identity.handle}`;
        const stored = localStorage.getItem(inboundKey);
        if (stored) {
          const messages: N2NMessage[] = JSON.parse(stored);
          const contactMessages = messages.filter(m => 
            m.sender === contact.handle || m.recipient === contact.handle
          );
          
          if (contactMessages.length > 0) {
            loadedConversations.push({
              participant: contact,
              messages: contactMessages.sort((a, b) => a.timestamp - b.timestamp),
              lastActivity: Math.max(...contactMessages.map(m => m.timestamp)) * 1000,
              unreadCount: contactMessages.filter(m => 
                m.recipient === identity.handle && !m.id.startsWith('read-')
              ).length
            });
          }
        }
      } catch {
        // Storage error
      }
    });
    
    // Also add whitelist entries without messages
    whitelist.forEach(contact => {
      if (!loadedConversations.find(c => c.participant.handle === contact.handle)) {
        loadedConversations.push({
          participant: contact,
          messages: [],
          lastActivity: contact.addedAt,
          unreadCount: 0
        });
      }
    });
    
    setConversations(loadedConversations.sort((a, b) => b.lastActivity - a.lastActivity));
  };

  const handleSendMessage = async () => {
    if (!identity || !newMessage.trim() || !selectedConversation) return;
    
    setIsSending(true);
    
    try {
      const conversation = conversations.find(c => c.participant.handle === selectedConversation);
      if (!conversation) return;
      
      // Get recipient identity
      const recipientIdentity: NodeIdentity = {
        handle: conversation.participant.handle,
        publicKey: conversation.participant.publicKey,
        nodeId: '',
        verified: true
      };
      
      // Compose message
      const message = await composeN2NMessage({
        from: identity,
        to: recipientIdentity,
        content: newMessage.trim()
      });
      
      // Prepare for transmission (adds micro-toll if needed)
      const { message: finalMessage, tollProof } = await prepareForTransmission(message);
      
      // Transmit
      const result = await transmitP2P(finalMessage, tollProof);
      
      if (result.success) {
        setNewMessage('');
        loadConversations();
      }
    } catch (error) {
      console.error('[N2N] Send failed:', error);
    }
    
    setIsSending(false);
  };

  const handleImportPublicKey = async () => {
    if (!importKeyData.trim()) return;
    
    try {
      const entry = importPublicKey(importKeyData.trim());
      if (entry) {
        addToWhitelist(entry);
        setWhitelist(getWhitelist());
        setImportStatus('success');
        setImportKeyData('');
        setTimeout(() => setImportStatus('idle'), 3000);
      } else {
        setImportStatus('error');
      }
    } catch {
      setImportStatus('error');
    }
  };

  const handleAddContact = () => {
    if (!newContactHandle.trim() || !newContactPublicKey.trim()) return;
    
    const entry: WhitelistEntry = {
      handle: newContactHandle.startsWith('@') ? newContactHandle : `@${newContactHandle}`,
      publicKey: newContactPublicKey,
      addedAt: Date.now(),
      trustLevel: 'limited'
    };
    
    addToWhitelist(entry);
    setWhitelist(getWhitelist());
    setNewContactHandle('');
    setNewContactPublicKey('');
    setShowAddContact(false);
    loadConversations();
  };

  const handleRemoveContact = (handle: string) => {
    removeFromWhitelist(handle);
    setWhitelist(getWhitelist());
    if (selectedConversation === handle) {
      setSelectedConversation(null);
    }
    loadConversations();
  };

  const copyPublicKey = () => {
    if (identity) {
      navigator.clipboard.writeText(exportPublicKey(identity));
    }
  };

  const filteredConversations = conversations.filter(c =>
    c.participant.handle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedConv = conversations.find(c => c.participant.handle === selectedConversation);

  if (!identity) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-slate-400">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span className="text-sm">Initializing secure node identity...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-[#050505] text-white">
      {/* Sidebar */}
      <div className="w-80 border-r border-white/10 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {onBack && (
                <button onClick={onBack} className="p-1 hover:bg-white/5 rounded-lg transition">
                  <ArrowLeft className="w-4 h-4 text-slate-400" />
                </button>
              )}
              <h2 className="font-bold text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-cyan-400" />
                N2N MESSAGES
              </h2>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <Shield className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] text-emerald-400 font-bold">SECURE</span>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/50 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setActiveTab('messages')}
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition ${
              activeTab === 'messages'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Messages
          </button>
          <button
            onClick={() => setActiveTab('contacts')}
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition ${
              activeTab === 'contacts'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Contacts ({whitelist.length})
          </button>
          <button
            onClick={() => setActiveTab('identity')}
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition ${
              activeTab === 'identity'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Identity
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'messages' && (
            <div className="p-2 space-y-1">
              {filteredConversations.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">No conversations yet</p>
                  <p className="text-[10px] text-slate-600 mt-1">Add contacts to start messaging</p>
                </div>
              ) : (
                filteredConversations.map(conv => (
                  <button
                    key={conv.participant.handle}
                    onClick={() => {
                      setSelectedConversation(conv.participant.handle);
                      setActiveTab('messages');
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition ${
                      selectedConversation === conv.participant.handle
                        ? 'bg-cyan-500/10 border border-cyan-500/20'
                        : 'hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-white truncate">
                          {conv.participant.handle}
                        </span>
                        {conv.unreadCount > 0 && (
                          <span className="w-5 h-5 rounded-full bg-cyan-500 text-black text-[10px] font-bold flex items-center justify-center">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 truncate">
                        {conv.messages.length > 0 ? (
                          `${conv.messages.length} messages`
                        ) : (
                          'No messages yet'
                        )}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {activeTab === 'contacts' && (
            <div className="p-2">
              <button
                onClick={() => setShowAddContact(!showAddContact)}
                className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-white/10 rounded-lg text-slate-500 hover:border-cyan-500/30 hover:text-cyan-400 transition mb-4"
              >
                <Plus className="w-4 h-4" />
                <span className="text-xs font-bold">ADD CONTACT</span>
              </button>

              {showAddContact && (
                <div className="bg-slate-900/50 border border-white/10 rounded-lg p-4 mb-4 space-y-3">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1 uppercase font-bold">Handle</label>
                    <input
                      type="text"
                      placeholder="@username"
                      value={newContactHandle}
                      onChange={(e) => setNewContactHandle(e.target.value)}
                      className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1 uppercase font-bold">Public Key</label>
                    <textarea
                      placeholder="Paste public key JSON..."
                      value={newContactPublicKey}
                      onChange={(e) => setNewContactPublicKey(e.target.value)}
                      rows={3}
                      className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 font-mono"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddContact}
                      className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-black py-2 rounded-lg text-xs font-bold transition"
                    >
                      ADD
                    </button>
                    <button
                      onClick={() => setShowAddContact(false)}
                      className="px-4 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-bold transition"
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {whitelist.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">No contacts yet</p>
                  </div>
                ) : (
                  whitelist.map(contact => (
                    <div
                      key={contact.handle}
                      className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg border border-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                          <Users className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{contact.handle}</p>
                          <p className="text-[10px] text-slate-500">
                            {contact.trustLevel === 'full' ? 'Full Trust' : 'Limited'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveContact(contact.handle)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'identity' && (
            <div className="p-4 space-y-4">
              {/* My Identity */}
              <div className="bg-slate-900/50 border border-white/10 rounded-lg p-4">
                <h3 className="text-xs font-bold text-cyan-400 uppercase mb-3 flex items-center gap-2">
                  <Key className="w-3.5 h-3.5" />
                  My Node Identity
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase mb-1">Handle</p>
                    <p className="text-sm font-bold text-white">{identity.handle}</p>
                  </div>
                  
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase mb-1">Node ID</p>
                    <p className="text-xs font-mono text-slate-300 break-all">{identity.nodeId}</p>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] text-slate-500 uppercase">Public Key</p>
                      <button
                        onClick={() => setShowPublicKey(!showPublicKey)}
                        className="text-cyan-400 hover:text-cyan-300 transition"
                      >
                        {showPublicKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    {showPublicKey ? (
                      <p className="text-xs font-mono text-emerald-400 break-all bg-emerald-500/5 p-2 rounded border border-emerald-500/10">
                        {identity.publicKey}
                      </p>
                    ) : (
                      <p className="text-xs font-mono text-slate-600">••••••••••••••••</p>
                    )}
                  </div>

                  <div className="pt-2">
                    <p className="text-[10px] text-slate-500 uppercase mb-2">Share Your Public Key</p>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-slate-800 border border-white/10 rounded-lg p-2 overflow-hidden">
                        <p className="text-[10px] font-mono text-slate-400 truncate">
                          {exportPublicKey(identity)}
                        </p>
                      </div>
                      <button
                        onClick={copyPublicKey}
                        className="px-3 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg transition flex items-center gap-1"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Import Contact */}
              <div className="bg-slate-900/50 border border-white/10 rounded-lg p-4">
                <h3 className="text-xs font-bold text-purple-400 uppercase mb-3 flex items-center gap-2">
                  <QrCode className="w-3.5 h-3.5" />
                  Import Contact
                </h3>
                
                <textarea
                  placeholder="Paste contact's public key JSON..."
                  value={importKeyData}
                  onChange={(e) => setImportKeyData(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 font-mono"
                />
                
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={handleImportPublicKey}
                    disabled={!importKeyData.trim()}
                    className="flex-1 bg-purple-500 hover:bg-purple-400 disabled:bg-slate-700 disabled:text-slate-500 text-white py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    IMPORT CONTACT
                  </button>
                </div>
                
                {importStatus === 'success' && (
                  <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    Contact added successfully
                  </p>
                )}
                {importStatus === 'error' && (
                  <p className="text-xs text-rose-400 mt-2 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Invalid public key format
                  </p>
                )}
              </div>

              {/* Security Info */}
              <div className="bg-slate-900/50 border border-white/10 rounded-lg p-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5" />
                  Security
                </h3>
                
                <div className="space-y-2 text-[10px] text-slate-500">
                  <div className="flex items-center justify-between">
                    <span>Encryption</span>
                    <span className="text-emerald-400">AES-256-GCM</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Signatures</span>
                    <span className="text-emerald-400">EdDSA (Ed25519)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Anti-Replay</span>
                    <span className="text-emerald-400">Nonce Tracking</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Spam Protection</span>
                    <span className="text-emerald-400">Micro-Toll PoW</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Server</span>
                    <span className="text-emerald-400">Zero (P2P Only)</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation && selectedConv ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{selectedConv.participant.handle}</p>
                  <div className="flex items-center gap-1">
                    {isWhitelisted(selectedConv.participant.handle) ? (
                      <>
                        <Lock className="w-3 h-3 text-emerald-400" />
                        <span className="text-[10px] text-emerald-400">Whitelisted</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="w-3 h-3 text-amber-400" />
                        <span className="text-[10px] text-amber-400">Requires Micro-Toll</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedConv.messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                  <MessageSquare className="w-12 h-12 mb-4 opacity-50" />
                  <p className="text-sm">No messages yet</p>
                  <p className="text-xs mt-1">Send the first encrypted message!</p>
                </div>
              ) : (
                selectedConv.messages.map((msg, idx) => {
                  const isOutgoing = msg.sender === identity.handle;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl p-4 ${
                          isOutgoing
                            ? 'bg-cyan-500/20 border border-cyan-500/30 rounded-br-md'
                            : 'bg-slate-800/50 border border-white/10 rounded-bl-md'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Lock className="w-3 h-3 text-slate-500" />
                          <span className="text-[10px] text-slate-500 font-mono">
                            {msg.id.slice(0, 8)}...
                          </span>
                        </div>
                        <p className="text-sm text-white">
                          [Encrypted Content - {msg.encryptedContent.length} bytes]
                        </p>
                        <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          {new Date(msg.timestamp * 1000).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-white/10">
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Type an encrypted message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1 bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isSending || !newMessage.trim()}
                  className="bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-700 disabled:text-slate-500 text-black px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition"
                >
                  {isSending ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  SEND
                </button>
              </div>
              {!isWhitelisted(selectedConv.participant.handle) && (
                <div className="flex items-center gap-2 mt-2 text-[10px] text-amber-400">
                  <Zap className="w-3 h-3" />
                  <span>Micro-toll PoW required for first message to non-whitelisted contacts</span>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <MessageSquare className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-sm">Select a conversation</p>
            <p className="text-xs mt-1">or add a new contact to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}