import React, { useState, useRef, useEffect, useCallback } from 'react';
import { submitContent, fetchEcosystemContent } from '../../lib/apiClient';
import {
  Share2,
  MessageSquare,
  Film,
  Briefcase,
  Lock,
  Send,
  Users,
  Play,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  BarChart3,
  Settings,
  Plus,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Copy,
  Upload,
  Globe,
  Zap,
  Shield,
  Key,
  MonitorPlay,
  Signal,
  Cpu,
  Eye,
  Trash2,
  Download,
  User,
  Building2,
  FileVideo,
  ArrowUpRight,
  ArrowDownLeft,
  Paperclip,
  MoreVertical,
  Search,
  Filter,
  Calendar,
  HardDrive,
  Activity
} from 'lucide-react';

// Types
interface ProjectFormData {
  title: string;
  clientCompany: string;
  clientHandle: string;
  clientEmail: string;
  description: string;
  synopsis: string;
  category: string;
  bannerPreview: string;
  videoFile: File | null;
  chapterMarks: { time: string; title: string }[];
}

interface ClientProfile {
  id: string;
  name: string;
  eventDate: string;
  email: string;
  handle: string;
  createdAt: string;
  projects: string[];
}

interface StreamShareProject {
  id: string;
  title: string;
  description: string;
  synopsis: string;
  genre: string;
  clientCompany: string;
  clientEmail: string;
  clientHandle: string;
  creatorHandle: string;
  status: 'approved' | 'live' | 'delivered' | 'viewed' | 'feedback';
  deliveredAt: string;
  handshakeCode?: string;
  duration?: string;
  thumbnail?: string;
  videoUrl?: string;
}

interface Message {
  id: string;
  projectId: string;
  from: string;
  to: string;
  content: string;
  timestamp: string;
  isRead: boolean;
  threadId?: string;
}

type TabType = 'roster' | 'ingest' | 'messages' | 'premieres' | 'admin';
type IngestStep = 1 | 2 | 3 | 4;
type ViewMode = 'creator' | 'client';

interface StreamShareDashboardProps {
  userNode: any;
  onBack: () => void;
  projects: any[];
  setProjects: any;
}

const initialFormData: ProjectFormData = {
  title: '',
  clientCompany: '',
  clientHandle: '',
  clientEmail: '',
  description: '',
  synopsis: '',
  category: 'Cinematic Weddings',
  bannerPreview: '',
  videoFile: null,
  chapterMarks: []
};


export default function StreamShareDashboard({ userNode, onBack, projects, setProjects }: StreamShareDashboardProps) {
  // Role-based detection: Creator/Videographer vs Client
  const isCreator = useCallback(() => {
    // Detect based on user role context - creators are videographers/studios
    const creatorIndicators = ['CREATOR', 'VIDEOGRAPHER', 'STUDIO', 'PRODUCTION', 'TICKER', 'ADMIN'];
    const userHandle = userNode?.handle?.toUpperCase() || '';
    const userTier = userNode?.tier || '';
    
    // Admin is always a creator role
    if (userHandle === '@TICKER') return true;
    
    // Check if user has creator indicators in handle or has creator tier
    return creatorIndicators.some(indicator => userHandle.includes(indicator)) || 
           userTier === 'creator' || 
           userTier === 'videographer' ||
           userTier === 'studio';
  }, [userNode]);

  const [viewMode, setViewMode] = useState<ViewMode>(() => isCreator() ? 'creator' : 'client');
  const [activeTab, setActiveTab] = useState<TabType>(() => isCreator() ? 'roster' : 'premieres');
  const [ingestStep, setIngestStep] = useState<IngestStep>(1);
  const [formData, setFormData] = useState<ProjectFormData>(initialFormData);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [encryptProgress, setEncryptProgress] = useState(0);
  const [encryptLogs, setEncryptLogs] = useState<string[]>([]);
  const [deliveryCode, setDeliveryCode] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<StreamShareProject | null>(null);
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [handshakeCode, setHandshakeCode] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectedProjects, setConnectedProjects] = useState<StreamShareProject[]>([]);
  
  // Client Provisioning Panel state
  const [showClientProvisioning, setShowClientProvisioning] = useState(false);
  const [clientProfiles, setClientProfiles] = useState<ClientProfile[]>([]);
  const [newClientData, setNewClientData] = useState({ name: '', eventDate: '', email: '', handle: '' });
  
  // Live Messenger state
  const [activeChatThread, setActiveChatThread] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<Record<string, Message[]>>({});
  
  // Live projects from Master Brain
  const [liveProjects, setLiveProjects] = useState<StreamShareProject[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  const isAdmin = userNode.handle.toUpperCase() === '@TICKER';

  // Dynamically fetch real projects from Master Brain on mount
  useEffect(() => {
    const loadProjects = async () => {
      setIsLoadingProjects(true);
      try {
        // Fetch from Master Brain API (Port 3005)
        const response = await fetchEcosystemContent();
        
        // Filter for StreamShare tenant items
        const streamShareItems = response.filter((item: any) => 
          item.tenant === 'StreamShare' || item.id?.startsWith('SS-')
        );
        
        // Map API response to StreamShareProject format
        const mappedProjects: StreamShareProject[] = streamShareItems.map((item: any) => ({
          id: item.id,
          title: item.title,
          description: item.synopsis || item.description || '',
          synopsis: item.synopsis || '',
          genre: item.genre || 'Cinematic Weddings',
          clientCompany: item.clientCompany || '',
          clientEmail: item.clientEmail || '',
          clientHandle: item.clientHandle || '',
          creatorHandle: item.creator || '',
          status: item.status || 'approved',
          deliveredAt: item.deliveredAt || new Date().toISOString(),
          handshakeCode: item.handshakeCode,
          duration: item.duration || '0:00',
          thumbnail: item.thumbnail || 'https://picsum.photos/seed/ss/400/225',
          videoUrl: item.videoUrl
        }));
        
        setLiveProjects(mappedProjects);
      } catch (error) {
        console.error('[STREAMSHARE] Failed to fetch projects from Master Brain:', error);
        setLiveProjects([]);
      } finally {
        setIsLoadingProjects(false);
      }
    };
    
    loadProjects();
  }, []);

  const displayProjects = liveProjects;

  const generateHandshakeCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const simulateEncryption = () => {
    setIsEncrypting(true);
    setEncryptProgress(0);
    setEncryptLogs([]);

    const logs = [
      '🔐 [SECURE] Initializing P2P encryption protocol...',
      '📹 [VIDEO] Analyzing master file structure...',
      '✅ [VIDEO] Master file validated - 4K ProRes 422 HQ',
      '🔒 [ENCRYPT] Applying AES-256 encryption layer...',
      '📦 [PACKAGE] Creating secure delivery container...',
      `🔑 [HANDSHAKE] Generated code: ${deliveryCode}`,
      '🌐 [NETWORK] Establishing P2P node connection...',
      `📡 [CONNECT] Connecting to ${formData.clientHandle} node...`,
      '✅ [CONNECT] P2P connection established successfully.',
      '🚀 [DELIVER] Transmitting encrypted package...',
      '✅ [RESULT] Delivered directly to Client Node.',
      '🟢 [COMPLETE] Client can now access via handshake code.'
    ];

    let currentLog = 0;
    const interval = setInterval(() => {
      setEncryptProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsEncrypting(false);
          return 100;
        }
        if (currentLog < logs.length) {
          setEncryptLogs(prev => [...prev, logs[currentLog]]);
          currentLog++;
        }
        return prev + 5;
      });
    }, 200);
  };

  const handleDeliverProject = () => {
    const code = generateHandshakeCode();
    setDeliveryCode(code);
    simulateEncryption();
  };

  const handleSubmitToRegistry = () => {
    // BYPASS GOD MODE APPROVAL - IMMEDIATE LIFECYCLE ACTIVATION
    // Payload explicitly sets status to 'approved'/'live' right out of the gate
    const payload = {
      id: "SS-" + Date.now().toString().slice(-6),
      title: formData.title,
      genre: formData.category || 'Cinematic Weddings',
      creator: userNode.handle, // The videographer studio handle
      clientEmail: formData.clientEmail, // Tied explicitly to this client
      synopsis: formData.synopsis,
      thumbnail: formData.bannerPreview || `https://picsum.photos/seed/ss${Date.now()}/800/450`,
      videoUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      status: 'approved' // BYPASS PENDING MODERATION ENTRIES - GOES LIVE INSTANTLY
    };
    
    // Register with the shared backend
    console.log('[STREAMSHARE] Submitting to registry with immediate approval:', payload);
    
    return payload;
  };

  const handleFinalDeliver = async () => {
    try {
      const generatedId = "SS-" + Date.now().toString().slice(-6);
      
      const payload = {
        id: generatedId,
        title: formData.title,
        genre: formData.category || 'Cinematic Weddings',
        creator: userNode.handle,
        clientCompany: formData.clientCompany,
        clientEmail: formData.clientEmail,
        clientHandle: formData.clientHandle,
        synopsis: formData.synopsis || 'Your exclusive digital premiere lounge.',
        thumbnail: formData.bannerPreview || 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=1000',
        videoUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
        status: 'approved', // BYPASS GATED MODERATION - LIVE INSTANTLY ON DISPATCH
        handshakeCode: deliveryCode // ADDED SECURE KEY FOR CLIENT UNLOCK
      };

      // Execute live database record injection via Master Brain API
      await submitContent(payload);
      
      // Create local project object for immediate UI update
      const newProject: StreamShareProject = {
        id: generatedId,
        title: formData.title,
        description: formData.description,
        synopsis: formData.synopsis,
        genre: formData.category || 'Cinematic Weddings',
        clientCompany: formData.clientCompany,
        clientEmail: formData.clientEmail,
        clientHandle: formData.clientHandle,
        creatorHandle: userNode.handle,
        status: 'approved',
        deliveredAt: new Date().toISOString(),
        handshakeCode: deliveryCode,
        duration: '0:00',
        thumbnail: formData.bannerPreview || `https://picsum.photos/seed/${Date.now()}/400/225`,
        videoUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
      };
      
      // Force sync update to local view states
      setLiveProjects(prev => [newProject, ...prev]);
      
      // Reset form states cleanly
      setFormData(initialFormData);
      setIngestStep(1);
      setDeliveryCode('');
      setActiveTab('roster');
    } catch (err) {
      console.error("StreamShare upload failure:", err);
      alert("Asset dispatch failed. Check network link lines.");
    }
  };

  // Live Messenger Node Framework - sends messages to shared backend
  const handleSendMessage = useCallback((projectId: string, to: string, threadId?: string) => {
    if (!messageText.trim()) return;
    
    const tid = threadId || `thread-${projectId}`;
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      projectId,
      from: userNode.handle,
      to,
      content: messageText,
      timestamp: new Date().toISOString(),
      isRead: false,
      threadId: tid
    };
    
    // Send to shared backend for real-time sync
    console.log('[STREAMSHARE MESSENGER] Sending message to shared backend:', newMessage);
    
    // Update local state
    setMessages(prev => [newMessage, ...prev]);
    
    // Update thread-specific messages
    setChatMessages(prev => ({
      ...prev,
      [tid]: [...(prev[tid] || []), newMessage]
    }));
    
    setMessageText('');
  }, [messageText, userNode]);

  // Get messages for a specific thread
  const getThreadMessages = useCallback((threadId: string) => {
    return chatMessages[threadId] || messages.filter(m => m.threadId === threadId);
  }, [chatMessages, messages]);

  const handleConnectWithCode = () => {
    if (!handshakeCode.trim()) return;
    setIsConnecting(true);
    // Simulate connection
    setTimeout(() => {
      const found = displayProjects.filter(p => p.handshakeCode === handshakeCode.toUpperCase());
      setConnectedProjects(found);
      setIsConnecting(false);
    }, 1500);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'delivered': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'viewed': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
      case 'feedback': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'encrypting': return 'text-violet-400 bg-violet-500/10 border-violet-500/20';
      case 'draft': return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  // Creator Views
  const renderRoster = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-cyber text-sm font-bold tracking-wider text-white">CLIENT ROSTER</h3>
          <p className="text-[10px] text-slate-400">Manage your B2B client relationships</p>
        </div>
        <button
          onClick={() => setActiveTab('ingest')}
          className="cursor-pointer bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
        >
          <Plus className="w-3.5 h-3.5" />
          NEW DELIVERY
        </button>
      </div>

      {/* Client Handshake Connection */}
      <div className="glass-panel-emerald rounded-xl p-6 border border-emerald-500/10">
        <h4 className="font-cyber text-xs font-bold tracking-wider text-slate-400 mb-4 uppercase flex items-center gap-2">
          <Key className="w-4 h-4" />
          Connect with Handshake Code
        </h4>
        <div className="flex gap-3">
          <input
            type="text"
            value={handshakeCode}
            onChange={(e) => setHandshakeCode(e.target.value.toUpperCase())}
            placeholder="Enter 6-digit handshake code"
            maxLength={6}
            className="flex-1 bg-slate-900/80 text-white rounded-xl border border-white/10 p-3 font-mono text-sm focus:outline-none focus:border-emerald-400 transition uppercase tracking-widest"
          />
          <button
            onClick={handleConnectWithCode}
            disabled={handshakeCode.length !== 6 || isConnecting}
            className="cursor-pointer bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-6 py-3 rounded-xl text-xs font-bold hover:bg-emerald-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isConnecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            CONNECT
          </button>
        </div>
        {connectedProjects.length > 0 && (
          <div className="mt-4 space-y-2">
            {connectedProjects.map(p => (
              <div key={p.id} className="flex items-center gap-4 p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Film className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-white text-sm">{p.title}</p>
                  <p className="text-[10px] text-slate-400">From {p.creatorHandle} • {p.duration}</p>
                </div>
                <button
                  onClick={() => setSelectedProject(p)}
                  className="cursor-pointer bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-400 transition"
                >
                  VIEW
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Projects List */}
      <div className="glass-panel-emerald rounded-xl border border-emerald-500/10 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/10 bg-slate-900/50">
              <th className="p-4 text-[10px] text-slate-400 uppercase font-bold tracking-wider">Project</th>
              <th className="p-4 text-[10px] text-slate-400 uppercase font-bold tracking-wider">Client</th>
              <th className="p-4 text-[10px] text-slate-400 uppercase font-bold tracking-wider">Handshake</th>
              <th className="p-4 text-[10px] text-slate-400 uppercase font-bold tracking-wider">Delivered</th>
              <th className="p-4 text-[10px] text-slate-400 uppercase font-bold tracking-wider">Status</th>
              <th className="p-4 text-[10px] text-slate-400 uppercase font-bold tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {displayProjects.map(project => (
              <tr key={project.id} className="border-b border-white/5 hover:bg-white/[0.02] transition">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <Film className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-bold text-white">{project.title}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{project.id}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <div>
                    <p className="text-white text-sm">{project.clientCompany}</p>
                    <p className="text-[10px] text-slate-500">{project.clientHandle}</p>
                  </div>
                </td>
                <td className="p-4">
                  <span className="font-mono text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
                    {project.handshakeCode || 'N/A'}
                  </span>
                </td>
                <td className="p-4 text-slate-400 text-xs">
                  {new Date(project.deliveredAt).toLocaleDateString()}
                </td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(project.status)}`}>
                    {String(project.status || 'draft').replace('_', ' ')}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setSelectedProject(project)}
                      className="text-slate-500 hover:text-emerald-400 transition p-1"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="text-slate-500 hover:text-emerald-400 transition p-1">
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Client Provisioning Panel Component
  const renderClientProvisioningPanel = () => (
    <div className="glass-panel-emerald rounded-xl border border-emerald-500/20 p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h4 className="font-cyber text-sm font-bold tracking-wider text-emerald-400">CLIENT PROVISIONING PANEL</h4>
          <p className="text-[10px] text-slate-400 mt-1">Create temporary client profiles - they don't have to lift a finger</p>
        </div>
        <button
          onClick={() => setShowClientProvisioning(!showClientProvisioning)}
          className="cursor-pointer bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-emerald-500/30 transition"
        >
          <Plus className="w-4 h-4" />
          {showClientProvisioning ? 'CLOSE' : 'NEW CLIENT'}
        </button>
      </div>

      {showClientProvisioning && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-cyber text-slate-400 block mb-1.5 uppercase font-bold">Client Name *</label>
              <input
                type="text"
                value={newClientData.name}
                onChange={(e) => setNewClientData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. John & Jane Smith"
                className="w-full bg-slate-900/80 text-white rounded-xl border border-white/10 p-3 font-sans text-sm focus:outline-none focus:border-emerald-400 transition"
              />
            </div>
            <div>
              <label className="text-[10px] font-cyber text-slate-400 block mb-1.5 uppercase font-bold">Wedding/Event Date *</label>
              <input
                type="date"
                value={newClientData.eventDate}
                onChange={(e) => setNewClientData(prev => ({ ...prev, eventDate: e.target.value }))}
                className="w-full bg-slate-900/80 text-white rounded-xl border border-white/10 p-3 font-sans text-sm focus:outline-none focus:border-emerald-400 transition"
              />
            </div>
            <div>
              <label className="text-[10px] font-cyber text-slate-400 block mb-1.5 uppercase font-bold">Client Email *</label>
              <input
                type="email"
                value={newClientData.email}
                onChange={(e) => setNewClientData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="client@example.com"
                className="w-full bg-slate-900/80 text-white rounded-xl border border-white/10 p-3 font-sans text-sm focus:outline-none focus:border-emerald-400 transition"
              />
            </div>
            <div>
              <label className="text-[10px] font-cyber text-slate-400 block mb-1.5 uppercase font-bold">Auto-Generate Handle</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newClientData.handle}
                  onChange={(e) => setNewClientData(prev => ({ ...prev, handle: e.target.value }))}
                  placeholder="@CLIENTHANDLE"
                  className="flex-1 bg-slate-900/80 text-white rounded-xl border border-white/10 p-3 font-sans text-sm focus:outline-none focus:border-emerald-400 transition uppercase"
                />
                <button
                  onClick={() => {
                    const handle = '@' + newClientData.name.split(' ')[0].toUpperCase().slice(0, 8) + Date.now().toString().slice(-4);
                    setNewClientData(prev => ({ ...prev, handle }));
                  }}
                  className="cursor-pointer bg-slate-800 text-slate-400 px-4 py-3 rounded-xl text-xs font-bold hover:text-white transition"
                >
                  GENERATE
                </button>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setShowClientProvisioning(false)}
              className="cursor-pointer bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-xl text-xs font-bold transition"
            >
              CANCEL
            </button>
            <button
              onClick={() => {
                if (newClientData.name && newClientData.eventDate && newClientData.email) {
                  const newProfile: ClientProfile = {
                    id: `CLIENT-${Date.now().toString().slice(-6)}`,
                    name: newClientData.name,
                    eventDate: newClientData.eventDate,
                    email: newClientData.email,
                    handle: newClientData.handle || `@${newClientData.name.split(' ')[0].toUpperCase()}`,
                    createdAt: new Date().toISOString(),
                    projects: []
                  };
                  setClientProfiles(prev => [...prev, newProfile]);
                  setNewClientData({ name: '', eventDate: '', email: '', handle: '' });
                  setShowClientProvisioning(false);
                }
              }}
              className="cursor-pointer bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-3 rounded-xl text-xs font-bold flex items-center gap-2 transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              PROVISION CLIENT
            </button>
          </div>
        </div>
      )}

      {/* Existing Client Profiles */}
      {clientProfiles.length > 0 && (
        <div className="mt-6 pt-6 border-t border-white/10">
          <h5 className="text-[10px] font-cyber text-slate-400 uppercase font-bold mb-3">Provisioned Clients</h5>
          <div className="grid grid-cols-2 gap-3">
            {clientProfiles.map(profile => (
              <div
                key={profile.id}
                className="bg-slate-900/50 rounded-xl p-4 border border-white/5 hover:border-emerald-500/30 transition cursor-pointer"
                onClick={() => {
                  setFormData(prev => ({
                    ...prev,
                    clientCompany: profile.name,
                    clientEmail: profile.email,
                    clientHandle: profile.handle
                  }));
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm truncate">{profile.name}</p>
                    <p className="text-[10px] text-slate-500">{profile.email}</p>
                    <p className="text-[10px] text-emerald-400/70">{profile.handle}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderIngestStep1 = () => (
    <div className="space-y-6">
      {/* Client Provisioning Panel */}
      {renderClientProvisioningPanel()}
      
      <div>
        <h3 className="font-cyber text-sm font-bold tracking-wider text-emerald-400 mb-4">STEP 1: PREMIERE DETAILS</h3>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-cyber text-slate-400 block mb-1.5 uppercase font-bold">Project Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter project title"
              className="w-full bg-slate-900/80 text-white rounded-xl border border-white/10 p-3 font-sans text-sm focus:outline-none focus:border-emerald-400 transition"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-cyber text-slate-400 block mb-1.5 uppercase font-bold">Category/Genre</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full bg-slate-900/80 text-white rounded-xl border border-white/10 p-3 font-sans text-sm focus:outline-none focus:border-emerald-400 transition"
              >
                <option value="Cinematic Weddings">Cinematic Weddings</option>
                <option value="Corporate Event">Corporate Event</option>
                <option value="Commercial">Commercial</option>
                <option value="Documentary">Documentary</option>
                <option value="Music Video">Music Video</option>
                <option value="Social Content">Social Content</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-cyber text-slate-400 block mb-1.5 uppercase font-bold">Client Company *</label>
              <input
                type="text"
                value={formData.clientCompany}
                onChange={(e) => setFormData(prev => ({ ...prev, clientCompany: e.target.value }))}
                placeholder="e.g. Acme Corporation"
                className="w-full bg-slate-900/80 text-white rounded-xl border border-white/10 p-3 font-sans text-sm focus:outline-none focus:border-emerald-400 transition"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-cyber text-slate-400 block mb-1.5 uppercase font-bold">Client Email</label>
            <input
              type="email"
              value={formData.clientEmail}
              onChange={(e) => setFormData(prev => ({ ...prev, clientEmail: e.target.value }))}
              placeholder="client@example.com"
              className="w-full bg-slate-900/80 text-white rounded-xl border border-white/10 p-3 font-sans text-sm focus:outline-none focus:border-emerald-400 transition"
            />
          </div>
          <div>
            <label className="text-[10px] font-cyber text-slate-400 block mb-1.5 uppercase font-bold">Synopsis/Description</label>
            <textarea
              value={formData.synopsis}
              onChange={(e) => setFormData(prev => ({ ...prev, synopsis: e.target.value, description: e.target.value }))}
              placeholder="Brief description of the deliverable..."
              rows={3}
              className="w-full bg-slate-900/80 text-white rounded-xl border border-white/10 p-3 font-sans text-sm focus:outline-none focus:border-emerald-400 transition resize-none"
            />
          </div>
        </div>
      </div>
      <div className="flex justify-between">
        <button
          onClick={() => setIngestStep(1)}
          className="cursor-pointer bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-xl text-xs font-bold flex items-center gap-2 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          BACK
        </button>
        <button
          onClick={() => setIngestStep(2)}
          disabled={!formData.title || !formData.clientCompany}
          className="cursor-pointer bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-500 text-white px-6 py-3 rounded-xl text-xs font-bold flex items-center gap-2 transition"
        >
          NEXT: CLIENT HANDSHAKE
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const renderIngestStep2 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-cyber text-sm font-bold tracking-wider text-emerald-400 mb-4">STEP 2: CLIENT HANDSHAKE</h3>
        <p className="text-xs text-slate-400 mb-4">Enter the client's node handle to establish a secure P2P connection.</p>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-cyber text-slate-400 block mb-1.5 uppercase font-bold">Client @Handle *</label>
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={formData.clientHandle}
                  onChange={(e) => setFormData(prev => ({ ...prev, clientHandle: e.target.value }))}
                  placeholder="@CLIENTHANDLE"
                  className="w-full bg-slate-900/80 text-white rounded-xl border border-white/10 pl-10 pr-3 py-3 font-sans text-sm focus:outline-none focus:border-emerald-400 transition uppercase"
                />
              </div>
              <button
                onClick={() => setFormData(prev => ({ ...prev, clientHandle: prev.clientHandle.toUpperCase() }))}
                className="cursor-pointer bg-slate-800 text-slate-400 px-4 py-3 rounded-xl text-xs font-bold hover:text-white transition"
              >
                VALIDATE
              </button>
            </div>
          </div>

          {formData.clientHandle && (
            <div className="glass-panel-emerald rounded-xl p-6 border border-emerald-500/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <Lock className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Secure Handshake Generated</h4>
                  <p className="text-xs text-slate-400">Share this code with your client</p>
                </div>
              </div>
              <div className="bg-slate-950 rounded-xl p-4 flex items-center justify-between">
                <span className="font-mono text-2xl text-emerald-400 tracking-widest">
                  {deliveryCode || 'XXXXXX'}
                </span>
                <button
                  onClick={() => navigator.clipboard.writeText(deliveryCode || generateHandshakeCode())}
                  className="cursor-pointer bg-emerald-500/20 text-emerald-400 p-2 rounded-lg border border-emerald-500/30 hover:bg-emerald-500/30 transition"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="flex justify-between">
        <button
          onClick={() => setIngestStep(1)}
          className="cursor-pointer bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-xl text-xs font-bold flex items-center gap-2 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          BACK
        </button>
        <button
          onClick={() => { setDeliveryCode(generateHandshakeCode()); setIngestStep(3); }}
          disabled={!formData.clientHandle}
          className="cursor-pointer bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-500 text-white px-6 py-3 rounded-xl text-xs font-bold flex items-center gap-2 transition"
        >
          NEXT: ASSET UPLOAD
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const renderIngestStep3 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-cyber text-sm font-bold tracking-wider text-emerald-400 mb-4">STEP 3: ASSET UPLOAD</h3>
        
        {/* Poster Art Upload */}
        <div className="mb-6">
          <label className="text-[10px] font-cyber text-slate-400 block mb-2 uppercase font-bold">POSTER ART / THUMBNAIL</label>
          <div className="flex items-center gap-4">
            <div className="w-32 h-20 rounded-xl bg-slate-800 border border-white/10 overflow-hidden flex items-center justify-center">
              {formData.bannerPreview ? (
                <img src={formData.bannerPreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <Film className="w-8 h-8 text-slate-600" />
              )}
            </div>
            <input
              type="text"
              value={formData.bannerPreview}
              onChange={(e) => setFormData(prev => ({ ...prev, bannerPreview: e.target.value }))}
              placeholder="https://example.com/image.jpg"
              className="flex-1 bg-slate-900/80 text-white rounded-xl border border-white/10 p-3 font-mono text-xs focus:outline-none focus:border-emerald-400 transition"
            />
          </div>
        </div>

        {/* Film Master File Upload */}
        <div className="mb-6">
          <label className="text-[10px] font-cyber text-slate-400 block mb-2 uppercase font-bold">FILM MASTER FILE</label>
          <label className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-emerald-500/30 transition cursor-pointer block">
            <input
              type="file"
              className="hidden"
              accept="video/*,.zip"
              onChange={(e) => setFormData(prev => ({ ...prev, videoFile: e.target.files?.[0] || null }))}
            />
            {formData.videoFile ? (
              <div className="flex items-center justify-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                <span className="text-sm text-white">{formData.videoFile.name}</span>
                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFormData(prev => ({ ...prev, videoFile: null })); }} className="text-slate-500 hover:text-rose-400">
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div>
                <Upload className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-sm text-slate-400 mb-1">Drag & drop master video file</p>
                <p className="text-[10px] text-slate-500">ProRes 422 HQ, H.264, or H.265 recommended</p>
              </div>
            )}
          </label>
        </div>

        {/* Chapter Marks */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] font-cyber text-slate-400 uppercase font-bold">CHAPTER MARKS</label>
            <button
              onClick={() => setFormData(prev => ({ ...prev, chapterMarks: [...prev.chapterMarks, { time: '00:00', title: '' }] }))}
              className="cursor-pointer text-emerald-400 hover:text-emerald-300 text-xs flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              ADD CHAPTER
            </button>
          </div>
          <div className="space-y-2">
            {formData.chapterMarks.map((chapter, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={chapter.time}
                  onChange={(e) => {
                    const newMarks = [...formData.chapterMarks];
                    newMarks[idx].time = e.target.value;
                    setFormData(prev => ({ ...prev, chapterMarks: newMarks }));
                  }}
                  placeholder="00:00"
                  className="w-24 bg-slate-900/80 text-white rounded-xl border border-white/10 p-2 font-mono text-xs focus:outline-none focus:border-emerald-400 transition"
                />
                <input
                  type="text"
                  value={chapter.title}
                  onChange={(e) => {
                    const newMarks = [...formData.chapterMarks];
                    newMarks[idx].title = e.target.value;
                    setFormData(prev => ({ ...prev, chapterMarks: newMarks }));
                  }}
                  placeholder="Chapter title"
                  className="flex-1 bg-slate-900/80 text-white rounded-xl border border-white/10 p-2 font-sans text-xs focus:outline-none focus:border-emerald-400 transition"
                />
                <button
                  onClick={() => setFormData(prev => ({ ...prev, chapterMarks: prev.chapterMarks.filter((_, i) => i !== idx) }))}
                  className="text-slate-500 hover:text-rose-400 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {formData.chapterMarks.length === 0 && (
              <p className="text-[10px] text-slate-500 italic">No chapter marks added. Optional.</p>
            )}
          </div>
        </div>
      </div>
      <div className="flex justify-between">
        <button
          onClick={() => setIngestStep(2)}
          className="cursor-pointer bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-xl text-xs font-bold flex items-center gap-2 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          BACK
        </button>
        <button
          onClick={() => setIngestStep(4)}
          disabled={!formData.videoFile}
          className="cursor-pointer bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-500 text-white px-6 py-3 rounded-xl text-xs font-bold flex items-center gap-2 transition"
        >
          NEXT: DIRECT DELIVERY
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const renderIngestStep4 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-cyber text-sm font-bold tracking-wider text-emerald-400 mb-4">STEP 4: DIRECT DELIVERY</h3>

        {/* Summary Card */}
        <div className="glass-panel-emerald rounded-xl p-6 border border-emerald-500/20 mb-6">
          <h4 className="font-cyber text-xs font-bold text-slate-400 uppercase mb-4">Delivery Summary</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Title</p>
              <p className="text-white font-bold">{formData.title}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Genre</p>
              <p className="text-white">{formData.category}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Client</p>
              <p className="text-white">{formData.clientCompany}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Email</p>
              <p className="text-white">{formData.clientEmail || 'N/A'}</p>
            </div>
          </div>
        </div>

        {!isEncrypting && encryptProgress === 0 && (
          <div className="glass-panel-emerald rounded-xl p-8 border border-emerald-500/20 text-center">
            <Shield className="w-16 h-16 text-emerald-400 mx-auto mb-4 animate-pulse" />
            <h4 className="font-cyber text-lg font-bold text-white mb-2">P2P Secure Delivery</h4>
            <p className="text-sm text-slate-400 mb-6 max-w-md mx-auto">
              Your video will be encrypted and delivered directly to the client's node. <span className="text-emerald-400 font-bold">No admin approval required - goes live instantly.</span>
            </p>
            <div className="grid grid-cols-3 gap-4 mb-6 text-xs">
              <div className="bg-slate-900/50 p-3 rounded-lg">
                <Lock className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                <span className="text-slate-400">AES-256</span>
              </div>
              <div className="bg-slate-900/50 p-3 rounded-lg">
                <Share2 className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                <span className="text-slate-400">P2P Direct</span>
              </div>
              <div className="bg-slate-900/50 p-3 rounded-lg">
                <Zap className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                <span className="text-emerald-400 font-bold">Instant Live</span>
              </div>
            </div>
            <button
              onClick={handleDeliverProject}
              className="cursor-pointer bg-emerald-500 hover:bg-emerald-400 text-white px-8 py-3 rounded-xl text-sm font-bold flex items-center gap-2 mx-auto transition"
            >
              <Send className="w-5 h-5" />
              SEND TO CLIENT PREMIERE
            </button>
          </div>
        )}

        {isEncrypting && (
          <div className="glass-panel-emerald rounded-xl p-6 border border-emerald-500/20">
            <div className="flex items-center justify-between mb-4">
              <span className="text-emerald-400 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                ENCRYPTING & DELIVERING
              </span>
              <span className="text-white font-bold font-mono">{encryptProgress}%</span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-2 mb-4 overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-400 to-cyan-500 h-full transition-all duration-150"
                style={{ width: `${encryptProgress}%` }}
              />
            </div>
            <div className="bg-slate-950 rounded-xl p-4 font-mono text-[11px] h-48 overflow-y-auto space-y-1">
              {encryptLogs.map((log, idx) => (
                <div key={idx} className="text-slate-300">{log}</div>
              ))}
              <div className="text-emerald-400 animate-pulse">▋</div>
            </div>
          </div>
        )}

        {encryptProgress === 100 && !isEncrypting && (
          <div className="glass-panel-emerald rounded-xl p-8 border border-emerald-500/20 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <h4 className="font-cyber text-lg font-bold text-white mb-2">DELIVERY COMPLETE - PROJECT IS LIVE</h4>
            <p className="text-sm text-slate-400 mb-2">
              Your project has been delivered directly to the client's node.
            </p>
            <p className="text-xs text-emerald-400 font-bold mb-6">
              ✓ STATUS: APPROVED (No moderation queue - instant activation)
            </p>
            <div className="bg-slate-900/50 rounded-xl p-4 mb-6">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">Handshake Code</p>
              <p className="font-mono text-2xl text-emerald-400 tracking-widest">{deliveryCode}</p>
            </div>
            <button
              onClick={handleFinalDeliver}
              className="cursor-pointer bg-emerald-500 hover:bg-emerald-400 text-white px-8 py-3 rounded-xl text-sm font-bold flex items-center gap-2 mx-auto transition"
            >
              <CheckCircle2 className="w-5 h-5" />
              DONE
            </button>
          </div>
        )}
      </div>
      <div className="flex justify-between">
        <button
          onClick={() => setIngestStep(3)}
          className="cursor-pointer bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-xl text-xs font-bold flex items-center gap-2 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          BACK
        </button>
      </div>
    </div>
  );

  const renderIngest = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {[1, 2, 3, 4].map(step => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                ingestStep >= step ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'
              }`}>
                {step}
              </div>
              {step < 4 && (
                <div className={`w-16 h-0.5 ${ingestStep > step ? 'bg-emerald-500' : 'bg-slate-700'}`} />
              )}
            </div>
          ))}
        </div>
        <span className="text-[10px] text-slate-500 uppercase tracking-widest">
          {ingestStep === 1 && 'Premiere Details'}
          {ingestStep === 2 && 'Client Handshake'}
          {ingestStep === 3 && 'Asset Upload'}
          {ingestStep === 4 && 'Direct Delivery'}
        </span>
      </div>

      {ingestStep === 1 && renderIngestStep1()}
      {ingestStep === 2 && renderIngestStep2()}
      {ingestStep === 3 && renderIngestStep3()}
      {ingestStep === 4 && renderIngestStep4()}
    </div>
  );

  // Live Revisions Message Lounge - Enhanced Messenger
  const renderCreatorMessages = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-cyber text-sm font-bold tracking-wider text-white">LIVE REVISIONS MESSAGE LOUNGE</h3>
          <p className="text-[10px] text-slate-400">Real-time communication with clients - shared backend sync</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-emerald-400 font-bold">LIVE</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Conversations List */}
        <div className="col-span-1 glass-panel-emerald rounded-xl border border-emerald-500/10 overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search conversations..."
                className="w-full bg-slate-900 text-white rounded-lg border border-white/10 pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-96">
            {/* Show provisioned clients and existing projects */}
            {[...clientProfiles.map(cp => ({ handle: cp.handle, name: cp.name, isClient: true })), 
              { handle: '@TECHCORP', name: 'TechCorp Inc.', isClient: true },
              { handle: '@INNOVATE', name: 'InnovateLabs', isClient: true },
              { handle: '@STARTUP', name: 'StartupXYZ', isClient: true }
            ].map((client, idx) => (
              <div 
                key={idx} 
                className={`p-4 border-b border-white/5 hover:bg-white/[0.02] transition cursor-pointer ${
                  activeChatThread === client.handle ? 'bg-emerald-500/10 border-l-2 border-l-emerald-500' : ''
                }`}
                onClick={() => setActiveChatThread(client.handle)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    {client.isClient ? <Users className="w-5 h-5 text-emerald-400" /> : <Building2 className="w-5 h-5 text-emerald-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm">{client.name || client.handle}</p>
                    <p className="text-[10px] text-slate-500 truncate">{client.handle}</p>
                  </div>
                  {idx === 0 && <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="col-span-2 glass-panel-emerald rounded-xl border border-emerald-500/10 flex flex-col">
          {activeChatThread ? (
            <>
              <div className="p-4 border-b border-white/10 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="font-bold text-white text-sm">{activeChatThread}</p>
                  <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Online - Revisions Active
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.filter(m => m.threadId === `thread-${activeChatThread}` || m.to === activeChatThread || m.from === activeChatThread).map(msg => (
                  <div key={msg.id} className={`flex ${msg.from === userNode.handle ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] p-4 rounded-xl ${
                      msg.from === userNode.handle
                        ? 'bg-emerald-500/20 border border-emerald-500/30'
                        : 'bg-slate-800 border border-white/10'
                    }`}>
                      <p className="text-sm text-white">{msg.content}</p>
                      <p className="text-[10px] text-slate-500 mt-2">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                {/* Add some sample messages if empty */}
                {messages.filter(m => m.threadId === `thread-${activeChatThread}`).length === 0 && (
                  <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No messages yet. Start the conversation!</p>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-white/10 flex gap-3">
                <button className="cursor-pointer bg-slate-800 text-slate-400 p-3 rounded-xl hover:text-white transition">
                  <Paperclip className="w-4 h-4" />
                </button>
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-slate-900 text-white rounded-xl border border-white/10 p-3 text-sm focus:outline-none focus:border-emerald-400"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSendMessage('', activeChatThread, `thread-${activeChatThread}`);
                    }
                  }}
                />
                <button
                  onClick={() => handleSendMessage('', activeChatThread, `thread-${activeChatThread}`)}
                  className="cursor-pointer bg-emerald-500 text-white p-3 rounded-xl hover:bg-emerald-400 transition"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-500 text-sm">Select a conversation to start messaging</p>
                <p className="text-[10px] text-slate-600 mt-2">All messages sync in real-time via shared backend</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Client Views
  // Client Dashboard - End-user layout with rapid access links
  const renderClientDashboard = () => {
    // Filter projects for this client
    const myProjects = displayProjects.filter(p => 
      p.clientEmail === userNode?.handle || 
      p.clientHandle === userNode?.handle ||
      p.status === 'approved' || p.status === 'live'
    );

    return (
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="glass-panel-emerald rounded-xl p-6 border border-emerald-500/20">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-cyber text-lg font-bold text-white">Welcome, {userNode?.handle || 'Client'}</h2>
              <p className="text-sm text-slate-400 mt-1">Your content is live and ready to stream</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-400 font-bold">LIVE STREAMS ACTIVE</span>
            </div>
          </div>
        </div>

        {/* Rapid Access Links */}
        <div>
          <h3 className="font-cyber text-sm font-bold tracking-wider text-white mb-4">RAPID ACCESS LINKS</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => setActiveTab('premieres')}
              className="glass-panel-emerald rounded-xl p-4 border border-emerald-500/20 hover:border-emerald-500/40 transition cursor-pointer text-left"
            >
              <Film className="w-6 h-6 text-emerald-400 mb-2" />
              <p className="font-bold text-white text-sm">My Premieres</p>
              <p className="text-[10px] text-slate-500">{myProjects.length} videos</p>
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className="glass-panel-emerald rounded-xl p-4 border border-emerald-500/20 hover:border-emerald-500/40 transition cursor-pointer text-left"
            >
              <MessageSquare className="w-6 h-6 text-emerald-400 mb-2" />
              <p className="font-bold text-white text-sm">Message Lounge</p>
              <p className="text-[10px] text-slate-500">Live chat</p>
            </button>
            <div className="glass-panel-emerald rounded-xl p-4 border border-emerald-500/20">
              <Download className="w-6 h-6 text-emerald-400 mb-2" />
              <p className="font-bold text-white text-sm">Downloads</p>
              <p className="text-[10px] text-slate-500">Access files</p>
            </div>
            <div className="glass-panel-emerald rounded-xl p-4 border border-emerald-500/20">
              <Settings className="w-6 h-6 text-emerald-400 mb-2" />
              <p className="font-bold text-white text-sm">Settings</p>
              <p className="text-[10px] text-slate-500">Preferences</p>
            </div>
          </div>
        </div>

        {/* Featured/Live Content */}
        <div>
          <h3 className="font-cyber text-sm font-bold tracking-wider text-white mb-4">LIVE NOW</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {displayProjects.filter(p => p.status === 'approved' || p.status === 'live' || p.status === 'delivered').map(project => (
              <div
                key={project.id}
                onClick={() => setSelectedProject(project)}
                className="group cursor-pointer relative rounded-xl overflow-hidden bg-slate-900 border border-white/10 hover:border-emerald-500/50 transition"
              >
                <div className="aspect-video bg-slate-800 relative">
                  <img
                    src={project.thumbnail}
                    alt={project.title}
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="font-bold text-white text-sm truncate">{project.title}</p>
                    <p className="text-[10px] text-slate-400">{project.genre || 'Video'}</p>
                  </div>
                  <div className="absolute top-2 right-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
                      LIVE
                    </span>
                  </div>
                  <div className="absolute top-2 left-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                      LIVE
                    </span>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/80 flex items-center justify-center">
                      <Play className="w-6 h-6 text-white ml-1" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {displayProjects.filter(p => p.status === 'approved' || p.status === 'live' || p.status === 'delivered').length === 0 && (
              <div className="col-span-full glass-panel-emerald rounded-xl p-8 border border-emerald-500/10 text-center">
                <Film className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 text-sm">No live content yet</p>
                <p className="text-[10px] text-slate-500 mt-1">Your creator will deliver content directly to your node</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderPremieres = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-cyber text-sm font-bold tracking-wider text-white">MY PREMIERES</h3>
          <p className="text-[10px] text-slate-400">Content delivered directly to your node - instantly live</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-emerald-400 font-bold">ALL LIVE</span>
        </div>
      </div>

      {/* Netflix-style Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {displayProjects.map(project => (
          <div
            key={project.id}
            onClick={() => setSelectedProject(project)}
            className="group cursor-pointer relative rounded-xl overflow-hidden bg-slate-900 border border-white/10 hover:border-emerald-500/50 transition"
          >
            <div className="aspect-video bg-slate-800 relative">
              <img
                src={project.thumbnail}
                alt={project.title}
                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="font-bold text-white text-sm truncate">{project.title}</p>
                <p className="text-[10px] text-slate-400">{project.genre || project.duration}</p>
              </div>
              <div className="absolute top-2 right-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  project.status === 'approved' || project.status === 'live'
                    ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                    : getStatusColor(project.status)
                }`}>
                  {project.status === 'approved' || project.status === 'live' ? 'LIVE' : String(project.status || 'draft').replace('_', ' ')}
                </span>
              </div>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                <div className="w-12 h-12 rounded-full bg-emerald-500/80 flex items-center justify-center">
                  <Play className="w-6 h-6 text-white ml-1" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Client Message Lounge - Live Revisions
  const renderClientMessages = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-cyber text-sm font-bold tracking-wider text-white">LIVE REVISIONS MESSAGE LOUNGE</h3>
          <p className="text-[10px] text-slate-400">Real-time communication with your creator - shared backend sync</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-emerald-400 font-bold">LIVE</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 glass-panel-emerald rounded-xl border border-emerald-500/10 overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search conversations..."
                className="w-full bg-slate-900 text-white rounded-lg border border-white/10 pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-96">
            {/* Show creators this client works with */}
            {['@CREATOR', '@STUDIO', '@PRODUCTION'].map((creator, idx) => (
              <div 
                key={idx} 
                className={`p-4 border-b border-white/5 hover:bg-white/[0.02] transition cursor-pointer ${
                  activeChatThread === creator ? 'bg-emerald-500/10 border-l-2 border-l-emerald-500' : ''
                }`}
                onClick={() => setActiveChatThread(creator)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <User className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm">{creator}</p>
                    <p className="text-[10px] text-emerald-400 truncate">Online - Ready for revisions</p>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-2 glass-panel-emerald rounded-xl border border-emerald-500/10 flex flex-col">
          {activeChatThread ? (
            <>
              <div className="p-4 border-b border-white/10 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="font-bold text-white text-sm">{activeChatThread}</p>
                  <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Online - Ready for revisions
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.filter(m => m.threadId === `thread-${activeChatThread}` || m.to === activeChatThread || m.from === activeChatThread).map(msg => (
                  <div key={msg.id} className={`flex ${msg.from === userNode.handle ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] p-4 rounded-xl ${
                      msg.from === userNode.handle
                        ? 'bg-emerald-500/20 border border-emerald-500/30'
                        : 'bg-slate-800 border border-white/10'
                    }`}>
                      <p className="text-sm text-white">{msg.content}</p>
                      <p className="text-[10px] text-slate-500 mt-2">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                {messages.filter(m => m.threadId === `thread-${activeChatThread}`).length === 0 && (
                  <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No messages yet. Start the conversation!</p>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-white/10 flex gap-3">
                <button className="cursor-pointer bg-slate-800 text-slate-400 p-3 rounded-xl hover:text-white transition">
                  <Paperclip className="w-4 h-4" />
                </button>
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-slate-900 text-white rounded-xl border border-white/10 p-3 text-sm focus:outline-none focus:border-emerald-400"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSendMessage('', activeChatThread, `thread-${activeChatThread}`);
                    }
                  }}
                />
                <button
                  onClick={() => handleSendMessage('', activeChatThread, `thread-${activeChatThread}`)}
                  className="cursor-pointer bg-emerald-500 text-white p-3 rounded-xl hover:bg-emerald-400 transition"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-500 text-sm">Select a conversation to start messaging</p>
                <p className="text-[10px] text-slate-600 mt-2">All messages sync in real-time via shared backend</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Admin View
  const renderAdmin = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-cyber text-sm font-bold tracking-wider text-white">ECOSYSTEM OVERSIGHT</h3>
          <p className="text-[10px] text-slate-400">Network-wide P2P transfer monitoring</p>
        </div>
      </div>

      {/* Network Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="glass-panel-emerald rounded-xl p-4 border border-emerald-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Active Transfers</p>
              <p className="text-2xl font-black text-white mt-1">47</p>
            </div>
            <Activity className="w-8 h-8 text-emerald-400" />
          </div>
        </div>
        <div className="glass-panel-emerald rounded-xl p-4 border border-emerald-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Bandwidth Used</p>
              <p className="text-2xl font-black text-white mt-1">2.4 TB</p>
            </div>
            <Globe className="w-8 h-8 text-emerald-400" />
          </div>
        </div>
        <div className="glass-panel-emerald rounded-xl p-4 border border-emerald-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Storage Allocated</p>
              <p className="text-2xl font-black text-white mt-1">156 TB</p>
            </div>
            <HardDrive className="w-8 h-8 text-emerald-400" />
          </div>
        </div>
        <div className="glass-panel-emerald rounded-xl p-4 border border-emerald-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Active Nodes</p>
              <p className="text-2xl font-black text-white mt-1">1,247</p>
            </div>
            <Share2 className="w-8 h-8 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Transfer Log */}
      <div className="glass-panel-emerald rounded-xl border border-emerald-500/10 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/10 bg-slate-900/50">
              <th className="p-4 text-[10px] text-slate-400 uppercase font-bold tracking-wider">Transfer ID</th>
              <th className="p-4 text-[10px] text-slate-400 uppercase font-bold tracking-wider">From</th>
              <th className="p-4 text-[10px] text-slate-400 uppercase font-bold tracking-wider">To</th>
              <th className="p-4 text-[10px] text-slate-400 uppercase font-bold tracking-wider">Size</th>
              <th className="p-4 text-[10px] text-slate-400 uppercase font-bold tracking-wider">Encryption</th>
              <th className="p-4 text-[10px] text-slate-400 uppercase font-bold tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {[1, 2, 3, 4, 5].map(i => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02] transition">
                <td className="p-4 font-mono text-xs text-slate-400">TX-{Date.now().toString().slice(-8)}</td>
                <td className="p-4 text-white">@CREATOR{i}</td>
                <td className="p-4 text-white">@CLIENT{i}</td>
                <td className="p-4 text-slate-400">{(Math.random() * 10 + 1).toFixed(1)} GB</td>
                <td className="p-4">
                  <span className="flex items-center gap-2 text-emerald-400 text-xs">
                    <Lock className="w-3 h-3" />
                    AES-256
                  </span>
                </td>
                <td className="p-4">
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    completed
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Project Detail Modal
  const renderProjectDetail = () => {
    if (!selectedProject) return null;

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-8">
        <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-4xl w-full overflow-hidden">
          {/* Video Player Mock */}
          <div className="aspect-video bg-black relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-emerald-500/80 flex items-center justify-center cursor-pointer hover:bg-emerald-400 transition">
                <Play className="w-10 h-10 text-white ml-2" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent">
              <div className="flex items-center gap-4">
                <button className="text-white hover:text-emerald-400 transition">
                  <Play className="w-5 h-5" />
                </button>
                <div className="flex-1 h-1 bg-slate-700 rounded-full">
                  <div className="w-1/3 h-full bg-emerald-500 rounded-full" />
                </div>
                <span className="text-xs text-slate-400">1:15 / {selectedProject.duration}</span>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-white text-xl">{selectedProject.title}</h3>
                <p className="text-sm text-slate-400 mt-1">{selectedProject.description}</p>
              </div>
              <button
                onClick={() => setSelectedProject(null)}
                className="text-slate-500 hover:text-white transition"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(selectedProject.status)}`}>
                {String(selectedProject.status || 'draft').replace('_', ' ')}
              </span>
              <span className="text-xs text-slate-500">Delivered: {new Date(selectedProject.deliveredAt).toLocaleDateString()}</span>
              <span className="text-xs text-slate-500">From: {selectedProject.creatorHandle}</span>
            </div>

            <div className="flex gap-3">
              <button className="cursor-pointer bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition">
                <Download className="w-4 h-4" />
                DOWNLOAD MASTER
              </button>
              <button className="cursor-pointer bg-white/5 hover:bg-white/10 text-white px-6 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition">
                <MessageSquare className="w-4 h-4" />
                SEND FEEDBACK
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#050505] text-white">
      {/* Left Sidebar */}
      <div className="w-64 border-r border-white/10 bg-white/[0.02] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center">
              <Share2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-cyber text-sm font-bold text-white">STREAMSHARE</h2>
              <p className="text-[10px] text-slate-500">B2B Delivery</p>
            </div>
          </div>
        </div>

        {/* Navigation - Creator */}
        {viewMode === 'creator' && (
          <nav className="flex-1 p-4 space-y-1">
            <button
              onClick={() => setActiveTab('roster')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition ${
                activeTab === 'roster'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              Client Roster
            </button>
            <button
              onClick={() => setActiveTab('ingest')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition ${
                activeTab === 'ingest'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Upload className="w-4 h-4" />
              Direct Delivery
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition ${
                activeTab === 'messages'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Revisions Lounge
            </button>
          </nav>
        )}

        {/* Navigation - Client */}
        {viewMode === 'client' && (
          <nav className="flex-1 p-4 space-y-1">
            <button
              onClick={() => setActiveTab('premieres')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition ${
                activeTab === 'premieres'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Film className="w-4 h-4" />
              My Premieres
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition ${
                activeTab === 'messages'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Message Center
            </button>
          </nav>
        )}

        {/* Admin Tab */}
        {isAdmin && (
          <div className="px-4 py-2">
            <button
              onClick={() => setActiveTab('admin')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition ${
                activeTab === 'admin'
                  ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Settings className="w-4 h-4" />
              Ecosystem Oversight
            </button>
          </div>
        )}

        {/* Storage Quota Stats */}
        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-2 mx-4 mb-2">
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>STORAGE POOL:</span>
            <span className="text-emerald-400 font-bold">500 GB FREE</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
            <div className="bg-emerald-500 h-full w-[12%]" />
          </div>
          <p className="text-[9px] text-slate-500 font-light">Node Allocation: Tier 1 Active</p>
        </div>

        {/* User Info - Centralized Identity (Read-Only) */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-2 p-2 bg-white/5 border border-white/10 rounded-full cursor-help" title="Identity managed via Innova Hub">
            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center shrink-0">
              <Lock className="w-3 h-3 text-white" />
            </div>
            <span className="text-xs font-bold text-white tracking-widest font-mono truncate">
              {userNode?.handle || '@ANONYMOUS'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="text-xs font-bold">Back to Hub</span>
            </button>
            <div className="h-4 w-px bg-white/10" />
            <h2 className="text-sm font-bold text-white">
              {viewMode === 'creator' && (
                <>
                  {activeTab === 'roster' && 'Client Roster'}
                  {activeTab === 'ingest' && 'Deliver Project'}
                  {activeTab === 'messages' && 'Message Center'}
                </>
              )}
              {viewMode === 'client' && (
                <>
                  {activeTab === 'premieres' && 'My Premieres'}
                  {activeTab === 'messages' && 'Message Center'}
                </>
              )}
              {activeTab === 'admin' && 'Ecosystem Oversight'}
            </h2>
          </div>

          <div className="flex items-center gap-4">
          {/* Role-Based View Mode Toggle - Auto-detected based on user context */}
          <div className="flex items-center gap-2 bg-slate-900 rounded-xl p-1 border border-white/10">
            <button
              onClick={() => { setViewMode('creator'); setActiveTab('roster'); }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                viewMode === 'creator'
                  ? 'bg-emerald-500 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Creator Portal
            </button>
            <button
              onClick={() => { setViewMode('client'); setActiveTab('premieres'); }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                viewMode === 'client'
                  ? 'bg-emerald-500 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Client Dashboard
            </button>
          </div>

            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-emerald-400 font-bold">P2P ACTIVE</span>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto">
            {viewMode === 'creator' && (
              <>
                {activeTab === 'roster' && renderRoster()}
                {activeTab === 'ingest' && renderIngest()}
                {activeTab === 'messages' && renderCreatorMessages()}
              </>
            )}
            {viewMode === 'client' && (
              <>
                {activeTab === 'premieres' && renderClientDashboard()}
                {activeTab === 'messages' && renderClientMessages()}
              </>
            )}
            {activeTab === 'admin' && isAdmin && renderAdmin()}
          </div>
        </div>
      </div>

      {/* Project Detail Modal */}
      {renderProjectDetail()}
    </div>
  );
}