import React, { useState, useRef, useEffect, useCallback } from 'react';
import { API_BASE_URL, submitContent, fetchEcosystemContent } from '../../lib/apiClient';
import DraftExitGuardModal from '../DraftExitGuardModal';
import {
  savePlatformDraftMeta,
  loadPlatformDraftMeta,
  saveDraftBinaryFiles,
  loadDraftBinaryFiles,
  clearPlatformDraft,
} from '../../lib/draftVault';
import {
  extractFirstFrameFromVideo,
  uploadFileToCloudWithProgress,
  uploadVideoAndEnsureFirstFrameThumbnail,
  saveGlobalSubmission
} from '../../lib/mediaVault';
import {
  Share2,
  MessageSquare,
  Film,
  Briefcase,
  Lock,
  Send,
  Play,
  ChevronLeft,
  CheckCircle2,
  XCircle,
  Plus,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Copy,
  Upload,
  Key,
  Eye,
  Trash2,
  Download,
  User,
  Sparkles,
  Radio,
  Shield
} from 'lucide-react';

interface ProjectFormData {
  title: string;
  clientCompany: string;
  clientHandle: string;
  clientEmail: string;
  description: string;
  synopsis: string;
  category: string;
  bannerPreview: string;
  bannerFile: File | null;
  videoUrlInput: string;
  isPublicShowcase: boolean;
  videoFile: File | null;
  detectedDuration: string;
  chapterMarks: { time: string; title: string }[];
}

interface ClientProfile {
  id: string;
  name: string;
  eventDate: string;
  email: string;
  handle: string;
  createdAt: string;
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

interface CloudMessage {
  id: string;
  channel: 'dashboard' | 'platform_live';
  projectId?: string;
  projectTitle?: string;
  timecode?: string;
  from: string;
  to: string;
  content: string;
  timestamp: string;
  isRead?: boolean;
}

type TabType = 'roster' | 'ingest' | 'messages' | 'premieres';
type IngestStep = 1 | 2 | 3 | 4;
type ViewMode = 'creator' | 'client';
type CreatorMsgChannel = 'dashboard' | 'platform_live';

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
  bannerFile: null,
  videoUrlInput: '',
  isPublicShowcase: true,
  videoFile: null,
  detectedDuration: '',
  chapterMarks: []
};

const normalizeHandle = (raw?: string): string => {
  const clean = String(raw || '').trim().toUpperCase().replace(/^@+/, '');
  return clean ? `@${clean}` : '';
};

const generateHandshakeCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export default function StreamShareDashboard({ userNode, onBack }: StreamShareDashboardProps) {
  const myHandle = normalizeHandle(userNode?.handle || userNode?.username || (typeof window !== 'undefined' ? localStorage.getItem('innova-username') : '') || '@TICKER');

  const [viewMode, setViewMode] = useState<ViewMode>('creator');
  const [activeTab, setActiveTab] = useState<TabType>('roster');
  const [ingestStep, setIngestStep] = useState<IngestStep>(1);
  const [formData, setFormData] = useState<ProjectFormData>(initialFormData);

  const [deliveryCode, setDeliveryCode] = useState<string>('');
  const [copiedHandshake, setCopiedHandshake] = useState(false);
  const [showExitGuard, setShowExitGuard] = useState(false);
  const [draftRestoredBanner, setDraftRestoredBanner] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [uploadMBText, setUploadMBText] = useState('');
  const [uploadLogs, setUploadLogs] = useState<string[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deliveredProject, setDeliveredProject] = useState<StreamShareProject | null>(null);
  const isSubmittingRef = useRef(false);

  const [liveProjects, setLiveProjects] = useState<StreamShareProject[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [selectedProject, setSelectedProject] = useState<StreamShareProject | null>(null);

  const [handshakeCode, setHandshakeCode] = useState('');
  const [connectedProjects, setConnectedProjects] = useState<StreamShareProject[]>([]);
  const [handshakeLookupMsg, setHandshakeLookupMsg] = useState<string | null>(null);

  const [showClientProvisioning, setShowClientProvisioning] = useState(false);
  const [clientProfiles, setClientProfiles] = useState<ClientProfile[]>(() => {
    try {
      const saved = localStorage.getItem('streamshare_client_profiles_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [newClientData, setNewClientData] = useState({ name: '', eventDate: '', email: '', handle: '' });

  const [creatorMsgChannel, setCreatorMsgChannel] = useState<CreatorMsgChannel>('dashboard');
  const [cloudMessages, setCloudMessages] = useState<CloudMessage[]>([]);
  const [activeChatPeer, setActiveChatPeer] = useState<string>('');
  const [customPeerInput, setCustomPeerInput] = useState<string>('');
  const [messageText, setMessageText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [msgStatusBanner, setMsgStatusBanner] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setIsLoadingProjects(true);
    try {
      const response = await fetchEcosystemContent('StreamShare');
      const rawList = Array.isArray(response) ? response : (response?.content || []);
      const seen = new Set<string>();
      const mapped: StreamShareProject[] = [];

      for (const item of rawList) {
        if (!item || !item.id || seen.has(item.id)) continue;
        const rawV = String(item.videoUrl || item.streamUrl || '');
        const fbV = rawV.match(/^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/([^/]+)\/o\/([^?]+)/i);
        const vUrl = fbV ? `https://storage.googleapis.com/${fbV[1]}/${decodeURIComponent(fbV[2]).split('/').map(encodeURIComponent).join('/')}` : rawV;
        const rawT = String(item.posterUrl || item.thumbnail || '');
        const fbT = rawT.match(/^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/([^/]+)\/o\/([^?]+)/i);
        const cleanThumb = fbT ? `https://storage.googleapis.com/${fbT[1]}/${decodeURIComponent(fbT[2]).split('/').map(encodeURIComponent).join('/')}` : rawT;
        if (!vUrl || vUrl.startsWith('vault://') || vUrl.startsWith('blob:')) continue;
        seen.add(item.id);
        mapped.push({
          id: item.id,
          title: item.title || 'Untitled Delivery',
          description: item.description || item.synopsis || '',
          synopsis: item.synopsis || item.description || '',
          genre: item.genre || 'Cinematic Weddings',
          clientCompany: item.clientCompany || 'Direct Client',
          clientEmail: item.clientEmail || '',
          clientHandle: normalizeHandle(item.clientHandle || ''),
          creatorHandle: normalizeHandle(item.creator || '@TICKER'),
          status: item.status || 'approved',
          deliveredAt: item.deliveredAt || item.createdAt || new Date().toISOString(),
          handshakeCode: item.handshakeCode || '',
          duration: item.duration || 'HD Master',
          thumbnail: cleanThumb,
          videoUrl: vUrl,
        });
      }
      setLiveProjects(mapped);
    } catch (err) {
      console.error('[STREAMSHARE] Failed loading projects:', err);
    } finally {
      setIsLoadingProjects(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const hasUnsavedDraft = Boolean(
    !deliveredProject &&
      (formData.title.trim() ||
        formData.clientCompany.trim() ||
        formData.clientHandle.trim() ||
        formData.synopsis.trim() ||
        formData.videoFile ||
        formData.bannerFile ||
        formData.videoUrlInput.trim())
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      const savedMeta = loadPlatformDraftMeta<any>('StreamShare');
      const savedFiles = await loadDraftBinaryFiles('StreamShare');
      if (!mounted || !savedMeta) return;
      if (savedMeta.title || savedMeta.clientCompany || savedMeta.clientHandle || savedFiles.videoFile) {
        setFormData((prev) => ({
          ...prev,
          title: savedMeta.title || '',
          clientCompany: savedMeta.clientCompany || '',
          clientHandle: savedMeta.clientHandle || '',
          clientEmail: savedMeta.clientEmail || '',
          description: savedMeta.description || '',
          synopsis: savedMeta.synopsis || '',
          category: savedMeta.category || 'Cinematic Weddings',
          videoUrlInput: savedMeta.videoUrlInput || '',
          isPublicShowcase: savedMeta.isPublicShowcase !== false,
          detectedDuration: savedMeta.detectedDuration || '',
          bannerPreview: savedMeta.bannerPreview || '',
          videoFile: savedFiles.videoFile || null,
          bannerFile: savedFiles.bannerFile || null,
        }));
        if (savedMeta.deliveryCode) setDeliveryCode(savedMeta.deliveryCode);
        if (savedMeta.ingestStep) setIngestStep(savedMeta.ingestStep);
        setActiveTab('ingest');
        setDraftRestoredBanner(`✓ Restored saved draft "${savedMeta.title || 'Untitled Delivery'}"${savedFiles.videoFile ? ` (${savedFiles.videoFile.name})` : ''}`);
        setTimeout(() => setDraftRestoredBanner(null), 5500);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (deliveredProject) return;
    if (hasUnsavedDraft) {
      savePlatformDraftMeta('StreamShare', {
        title: formData.title,
        clientCompany: formData.clientCompany,
        clientHandle: formData.clientHandle,
        clientEmail: formData.clientEmail,
        description: formData.description,
        synopsis: formData.synopsis,
        category: formData.category,
        videoUrlInput: formData.videoUrlInput,
        isPublicShowcase: formData.isPublicShowcase,
        detectedDuration: formData.detectedDuration,
        bannerPreview: formData.bannerPreview?.startsWith('data:') ? formData.bannerPreview : '',
        deliveryCode,
        ingestStep,
      });
      saveDraftBinaryFiles('StreamShare', {
        videoFile: formData.videoFile,
        bannerFile: formData.bannerFile,
      });
    }
  }, [formData, deliveryCode, ingestStep, hasUnsavedDraft, deliveredProject]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isUploading || hasUnsavedDraft) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isUploading, hasUnsavedDraft]);

  const handleGuardedBack = () => {
    if (isUploading || hasUnsavedDraft) {
      setShowExitGuard(true);
      return;
    }
    onBack();
  };


  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/messages?handle=${encodeURIComponent(myHandle)}`, {
        headers: { 'x-tenant-id': 'StreamShare', 'x-user-name': myHandle },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.messages)) setCloudMessages(data.messages);
    } catch {}
  }, [myHandle]);

  useEffect(() => {
    fetchMessages();
    const timer = setInterval(fetchMessages, 4000);
    return () => clearInterval(timer);
  }, [fetchMessages]);

  const ensureLockedHandshakeCode = useCallback(() => {
    setDeliveryCode((prev) => (prev && prev.length === 6 ? prev : generateHandshakeCode()));
  }, []);

  const handleValidateClientHandle = () => {
    const formatted = normalizeHandle(formData.clientHandle);
    if (!formatted) return;
    setFormData((prev) => ({ ...prev, clientHandle: formatted }));
    ensureLockedHandshakeCode();
  };

  const handleSelectVideoFile = async (file: File | null) => {
    if (!file) {
      setFormData((prev) => ({ ...prev, videoFile: null, detectedDuration: '' }));
      return;
    }
    setFormData((prev) => ({ ...prev, videoFile: file }));
    const frameData = await extractFirstFrameFromVideo(file);
    if (frameData) {
      setFormData((prev) => ({
        ...prev,
        detectedDuration: frameData.durationLabel,
        bannerPreview: prev.bannerFile ? prev.bannerPreview : frameData.dataUrl,
      }));
    }
  };

  const handleSelectBannerFile = (file: File | null) => {
    if (!file) {
      setFormData((prev) => ({ ...prev, bannerFile: null, bannerPreview: '' }));
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setFormData((prev) => ({ ...prev, bannerFile: file, bannerPreview: previewUrl }));
  };

  const handleExecuteRealDelivery = async () => {
    if (isSubmittingRef.current || isUploading) return;
    isSubmittingRef.current = true;
    setIsUploading(true);
    setUploadError(null);
    setUploadPercent(1);
    setUploadMBText('');

    const lockedCode = deliveryCode && deliveryCode.length === 6 ? deliveryCode : generateHandshakeCode();
    if (!deliveryCode) setDeliveryCode(lockedCode);

    const normalizedClient = normalizeHandle(formData.clientHandle || myHandle);
    const generatedId = `SS-${Date.now().toString().slice(-6)}`;

    const pushLog = (line: string) => setUploadLogs((prev) => [...prev, line]);
    setUploadLogs([
      `🔑 [HANDSHAKE LOCKED] Immutable Code: ${lockedCode} -> Target Node: ${normalizedClient}`,
      `🖼️ [THUMBNAIL] Preparing Frame-1 HD poster artwork...`,
    ]);

    try {
      let customPosterHttps = '';
      if (formData.bannerFile) {
        customPosterHttps = await uploadFileToCloudWithProgress(formData.bannerFile, 'StreamShare');
        pushLog(`✅ [THUMBNAIL] Custom poster uploaded to Cloud Node.`);
      } else if (formData.bannerPreview && /^https?:\/\//i.test(formData.bannerPreview)) {
        customPosterHttps = formData.bannerPreview;
      }

      pushLog(`🚀 [CLOUD STREAM] Uploading master video (${formData.videoFile ? (formData.videoFile.size / (1024 * 1024)).toFixed(2) + ' MB' : 'Direct Stream'})...`);

      const { videoUrl: finalVideoUrl, thumbnailUrl: finalThumbUrl, durationLabel } =
        await uploadVideoAndEnsureFirstFrameThumbnail(
          'StreamShare',
          formData.videoUrlInput,
          formData.videoFile,
          customPosterHttps,
          (pct, upMB, totMB) => {
            setUploadPercent(pct);
            setUploadMBText(`${upMB} MB / ${totMB} MB`);
          }
        );

      if (!finalVideoUrl || finalVideoUrl.startsWith('vault://')) {
        throw new Error('Cloud video upload did not return a playable HTTPS stream URL.');
      }

      pushLog(`✅ [CLOUD STREAM] 100% uploaded & verified playable.`);
      pushLog(`📡 [LEDGER] Registering single delivery ${generatedId} on Master Brain...`);

      const finalDuration = durationLabel || formData.detectedDuration || 'HD Master';
      const isPublic = formData.isPublicShowcase !== false;
      const finalStatus = isPublic ? 'approved' : 'delivered';

      const payload = {
        id: generatedId,
        tenant: 'StreamShare',
        type: 'project',
        title: formData.title.trim(),
        description: formData.synopsis || formData.description || 'Delivered via StreamShare Ring Comm.',
        synopsis: formData.synopsis || formData.description || 'Delivered via StreamShare Ring Comm.',
        genre: formData.category || 'Cinematic Weddings',
        creator: myHandle,
        clientCompany: formData.clientCompany.trim(),
        clientEmail: formData.clientEmail.trim(),
        clientHandle: normalizedClient,
        isPublicShowcase: isPublic,
        duration: finalDuration,
        thumbnail: finalThumbUrl,
        posterUrl: finalThumbUrl,
        videoUrl: finalVideoUrl,
        chapterMarks: formData.chapterMarks,
        status: finalStatus,
        handshakeCode: lockedCode,
        deliveredAt: new Date().toISOString(),
      };

      await submitContent(payload);

      saveGlobalSubmission({
        id: generatedId,
        tenant: 'StreamShare',
        type: 'project',
        title: payload.title,
        creator: myHandle,
        genre: payload.genre,
        synopsis: payload.synopsis,
        status: finalStatus,
        submittedAt: payload.deliveredAt,
        thumbnail: finalThumbUrl,
        posterUrl: finalThumbUrl,
        videoUrl: finalVideoUrl,
        extra: { handshakeCode: lockedCode, clientHandle: normalizedClient, duration: finalDuration },
      });

      const createdProj: StreamShareProject = {
        id: generatedId,
        title: payload.title,
        description: payload.description,
        synopsis: payload.synopsis,
        genre: payload.genre,
        clientCompany: payload.clientCompany,
        clientEmail: payload.clientEmail,
        clientHandle: normalizedClient,
        creatorHandle: myHandle,
        status: finalStatus as any,
        deliveredAt: payload.deliveredAt,
        handshakeCode: lockedCode,
        duration: finalDuration,
        thumbnail: finalThumbUrl,
        videoUrl: finalVideoUrl,
      };

      setLiveProjects((prev) => [createdProj, ...prev.filter((p) => p.id !== generatedId)]);
      clearPlatformDraft('StreamShare');
      setDeliveredProject(createdProj);
      setUploadPercent(100);
      pushLog(`🟢 [LIVE] Delivered once (${generatedId}) with Handshake ${lockedCode}.`);
    } catch (err: any) {
      setUploadError(err?.message || 'Cloud upload failed. Please try again.');
      pushLog(`❌ [ERROR] ${err?.message || 'Upload failed'}`);
    } finally {
      setIsUploading(false);
      isSubmittingRef.current = false;
    }
  };

  const handleFinishAndResetWizard = () => {
    setDeliveredProject(null);
    setFormData(initialFormData);
    setDeliveryCode('');
    setUploadPercent(0);
    setUploadMBText('');
    setUploadLogs([]);
    setUploadError(null);
    setIngestStep(1);
    setActiveTab('roster');
  };

  const handleDeleteProject = async (projId: string) => {
    try {
      await fetch(`${API_BASE_URL}/content/${encodeURIComponent(projId)}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': 'StreamShare' },
      });
      setLiveProjects((prev) => prev.filter((p) => p.id !== projId));
      if (selectedProject?.id === projId) setSelectedProject(null);
    } catch {}
  };

  const handleConnectWithCode = () => {
    const clean = handshakeCode.trim().toUpperCase();
    if (clean.length !== 6) return;
    const matches = liveProjects.filter((p) => String(p.handshakeCode || '').toUpperCase() === clean);
    setConnectedProjects(matches);
    setHandshakeLookupMsg(
      matches.length > 0
        ? `✓ Connected to ${matches.length} verified delivery (${clean})`
        : `No delivery found matching handshake code ${clean}.`
    );
  };

  const handleSendCloudMessage = async (channel: 'dashboard' | 'platform_live', targetPeer: string, proj?: StreamShareProject | null) => {
    const cleanPeer = normalizeHandle(targetPeer || '@TICKER');
    const cleanBody = messageText.trim();
    if (!cleanBody || !cleanPeer || sendingMsg) return;
    setSendingMsg(true);
    setMsgStatusBanner(null);
    try {
      const res = await fetch(`${API_BASE_URL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'StreamShare',
          'x-user-name': myHandle,
        },
        body: JSON.stringify({
          channel,
          from: myHandle,
          to: cleanPeer,
          content: cleanBody,
          projectId: proj?.id || '',
          projectTitle: proj?.title || (channel === 'platform_live' ? 'Live Screening Feedback' : 'Client Dashboard Thread'),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || data.error || `Send failed (${res.status})`);
      }
      if (data.message) {
        setCloudMessages((prev) => (prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message]));
      }
      setMessageText('');
      setActiveChatPeer(cleanPeer);
      setMsgStatusBanner(`✓ Delivered live to ${cleanPeer} (${channel === 'platform_live' ? 'Golden StreamShare App' : 'Client Dashboard'})`);
      setTimeout(() => setMsgStatusBanner(null), 3500);
    } catch (err: any) {
      setMsgStatusBanner(`⚠ Message error: ${err?.message || 'Network error'}`);
    } finally {
      setSendingMsg(false);
    }
  };

  const getPeersForChannel = (channel: 'dashboard' | 'platform_live') => {
    const map = new Map<string, string>();
    if (viewMode === 'creator') {
      clientProfiles.forEach((cp) => {
        const h = normalizeHandle(cp.handle);
        if (h) map.set(h, cp.name);
      });
      liveProjects.forEach((p) => {
        const h = normalizeHandle(p.clientHandle);
        if (h) map.set(h, p.clientCompany || h);
      });
    } else {
      liveProjects.forEach((p) => {
        const h = normalizeHandle(p.creatorHandle);
        if (h) map.set(h, `Creator ${h}`);
      });
      if (map.size === 0) map.set('@TICKER', 'Lead Creator (@TICKER)');
    }

    cloudMessages
      .filter((m) => viewMode === 'client' ? (m.channel === 'dashboard' || m.channel === 'platform_live') : m.channel === channel)
      .forEach((m) => {
        const other = normalizeHandle(m.from) === myHandle ? normalizeHandle(m.to) : normalizeHandle(m.from);
        if (other && !map.has(other)) map.set(other, other);
      });

    return Array.from(map.entries()).map(([handle, label]) => ({ handle, label }));
  };

  const goldenUnreadCount = cloudMessages.filter((m) => m.channel === 'platform_live' && !m.isRead).length;
  const dashMsgCount = cloudMessages.filter((m) => m.channel === 'dashboard').length;

  const renderRoster = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-cyber text-sm font-bold tracking-wider text-white">CLIENT ROSTER &amp; DELIVERIES</h3>
          <p className="text-[10px] text-slate-400">Real cloud-hosted master deliveries synced with StreamShare TV &amp; Client Dashboard</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadProjects}
            className="cursor-pointer bg-white/5 hover:bg-white/10 text-slate-300 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingProjects ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => {
              setDeliveredProject(null);
              setIngestStep(1);
              setActiveTab('ingest');
            }}
            className="cursor-pointer bg-emerald-500 hover:bg-emerald-400 text-black font-black px-4 py-2 rounded-xl text-xs flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            NEW DELIVERY
          </button>
        </div>
      </div>

      <div className="glass-panel-emerald rounded-xl p-5 border border-emerald-500/15">
        <h4 className="font-cyber text-xs font-bold tracking-wider text-slate-300 mb-3 uppercase flex items-center gap-2">
          <Key className="w-4 h-4 text-emerald-400" />
          Open Delivery with 6-Character Handshake Code
        </h4>
        <div className="flex gap-3">
          <input
            type="text"
            value={handshakeCode}
            onChange={(e) => setHandshakeCode(e.target.value.toUpperCase())}
            placeholder="ENTER 6-CHARACTER HANDSHAKE CODE"
            maxLength={6}
            className="flex-1 bg-slate-900/80 text-white rounded-xl border border-white/10 p-3 font-mono text-sm tracking-widest uppercase focus:outline-none focus:border-emerald-400"
          />
          <button
            onClick={handleConnectWithCode}
            disabled={handshakeCode.trim().length !== 6}
            className="cursor-pointer bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-black font-black px-6 py-3 rounded-xl text-xs flex items-center gap-2"
          >
            <Lock className="w-4 h-4" />
            CONNECT
          </button>
        </div>
        {handshakeLookupMsg && <p className="text-xs font-mono text-emerald-400 mt-3">{handshakeLookupMsg}</p>}
        {connectedProjects.length > 0 && (
          <div className="mt-3 space-y-2">
            {connectedProjects.map((p) => (
              <div key={p.id} className="flex items-center gap-4 p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
                {p.thumbnail ? (
                  <img src={p.thumbnail} alt={p.title} className="w-16 h-10 rounded-lg object-cover border border-white/10" />
                ) : (
                  <div className="w-16 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <Film className="w-5 h-5 text-emerald-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-sm truncate">{p.title}</p>
                  <p className="text-[10px] text-slate-300 font-mono">{p.id} • Client {p.clientHandle} • {p.duration}</p>
                </div>
                <button
                  onClick={() => setSelectedProject(p)}
                  className="cursor-pointer bg-emerald-500 text-black font-black px-4 py-2 rounded-lg text-xs hover:bg-emerald-400 flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-current" /> WATCH
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass-panel-emerald rounded-xl border border-emerald-500/15 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/10 bg-slate-900/60">
              <th className="p-4 text-[10px] text-slate-400 uppercase font-bold tracking-wider">Project &amp; Frame-1 Thumb</th>
              <th className="p-4 text-[10px] text-slate-400 uppercase font-bold tracking-wider">Client Node</th>
              <th className="p-4 text-[10px] text-slate-400 uppercase font-bold tracking-wider">Handshake</th>
              <th className="p-4 text-[10px] text-slate-400 uppercase font-bold tracking-wider">Delivered</th>
              <th className="p-4 text-[10px] text-slate-400 uppercase font-bold tracking-wider">Status</th>
              <th className="p-4 text-[10px] text-slate-400 uppercase font-bold tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {liveProjects.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-10 text-center text-slate-400 text-xs">
                  {isLoadingProjects
                    ? 'Syncing live deliveries from Master Brain...'
                    : 'No cloud deliveries yet. Click "+ NEW DELIVERY" above to upload your wedding or event master with real-time progress.'}
                </td>
              </tr>
            ) : (
              liveProjects.map((project) => (
                <tr key={project.id} className="border-b border-white/5 hover:bg-white/[0.03] transition">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div
                        onClick={() => setSelectedProject(project)}
                        className="w-16 h-10 rounded-lg bg-slate-900 border border-white/10 overflow-hidden flex items-center justify-center cursor-pointer relative group shrink-0"
                      >
                        {project.thumbnail ? (
                          <img src={project.thumbnail} alt={project.title} className="w-full h-full object-cover" />
                        ) : (
                          <Film className="w-4 h-4 text-emerald-400" />
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                          <Play className="w-4 h-4 text-white fill-current" />
                        </div>
                      </div>
                      <div>
                        <p className="font-bold text-white">{project.title}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{project.id} • {project.duration}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="text-white text-sm">{project.clientCompany}</p>
                    <p className="text-[10px] text-emerald-400 font-mono">{project.clientHandle}</p>
                  </td>
                  <td className="p-4">
                    <span className="font-mono text-xs text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded">
                      {project.handshakeCode || 'PUBLIC'}
                    </span>
                  </td>
                  <td className="p-4 text-slate-400 text-xs">{new Date(project.deliveredAt).toLocaleDateString()}</td>
                  <td className="p-4">
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border text-emerald-400 bg-emerald-500/10 border-emerald-500/30">
                      {project.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedProject(project)}
                        title="Play Master Video"
                        className="cursor-pointer text-slate-300 hover:text-emerald-400 bg-white/5 hover:bg-emerald-500/15 p-2 rounded-lg transition"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (project.clientHandle) setActiveChatPeer(project.clientHandle);
                          setCreatorMsgChannel('dashboard');
                          setActiveTab('messages');
                        }}
                        title="Message Client"
                        className="cursor-pointer text-slate-300 hover:text-emerald-400 bg-white/5 hover:bg-emerald-500/15 p-2 rounded-lg transition"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProject(project.id)}
                        title="Remove Delivery"
                        className="cursor-pointer text-slate-500 hover:text-rose-400 p-2 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderIngest = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  ingestStep >= step ? 'bg-emerald-500 text-black font-black' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {step}
              </div>
              {step < 4 && <div className={`w-14 h-0.5 ${ingestStep > step ? 'bg-emerald-500' : 'bg-slate-800'}`} />}
            </div>
          ))}
        </div>
        <span className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">
          {ingestStep === 1 && 'Step 1: Premiere Details'}
          {ingestStep === 2 && 'Step 2: Immutable Handshake'}
          {ingestStep === 3 && 'Step 3: Master Video & Auto Thumbnail'}
          {ingestStep === 4 && 'Step 4: Live Cloud Upload & Dispatch'}
        </span>
      </div>

      {ingestStep === 1 && (
        <div className="space-y-6">
          <div className="glass-panel-emerald rounded-xl border border-emerald-500/20 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-cyber text-xs font-bold tracking-wider text-emerald-400 uppercase">CLIENT QUICK PROVISIONING</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Save client @handles for 1-click delivery &amp; messaging</p>
              </div>
              <button
                onClick={() => setShowClientProvisioning(!showClientProvisioning)}
                className="cursor-pointer bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-bold"
              >
                {showClientProvisioning ? 'CLOSE' : '+ SAVE NEW CLIENT'}
              </button>
            </div>
            {showClientProvisioning && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/10">
                <input
                  type="text"
                  placeholder="Client / Event Name *"
                  value={newClientData.name}
                  onChange={(e) => setNewClientData((p) => ({ ...p, name: e.target.value }))}
                  className="bg-slate-900 text-white rounded-xl border border-white/10 p-2.5 text-xs"
                />
                <input
                  type="text"
                  placeholder="@CLIENTHANDLE *"
                  value={newClientData.handle}
                  onChange={(e) => setNewClientData((p) => ({ ...p, handle: e.target.value.toUpperCase() }))}
                  className="bg-slate-900 text-white rounded-xl border border-white/10 p-2.5 text-xs font-mono"
                />
                <button
                  onClick={() => {
                    if (!newClientData.name.trim()) return;
                    const handle = normalizeHandle(newClientData.handle || newClientData.name.split(' ')[0]);
                    const next = [
                      ...clientProfiles,
                      {
                        id: `CL-${Date.now().toString().slice(-5)}`,
                        name: newClientData.name.trim(),
                        eventDate: newClientData.eventDate,
                        email: newClientData.email,
                        handle,
                        createdAt: new Date().toISOString(),
                      },
                    ];
                    setClientProfiles(next);
                    localStorage.setItem('streamshare_client_profiles_v1', JSON.stringify(next));
                    setFormData((prev) => ({ ...prev, clientCompany: newClientData.name.trim(), clientHandle: handle }));
                    setNewClientData({ name: '', eventDate: '', email: '', handle: '' });
                    setShowClientProvisioning(false);
                  }}
                  className="cursor-pointer bg-emerald-500 text-black font-black rounded-xl text-xs px-4 py-2.5"
                >
                  SAVE &amp; SELECT CLIENT
                </button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1.5 uppercase font-bold">Project Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Capitol City Barns — Wedding Highlight Film"
                className="w-full bg-slate-900/80 text-white rounded-xl border border-white/10 p-3 text-sm"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1.5 uppercase font-bold">Category / Genre</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))}
                  className="w-full bg-slate-900/80 text-white rounded-xl border border-white/10 p-3 text-sm"
                >
                  <option value="Cinematic Weddings">Cinematic Weddings</option>
                  <option value="Event Video">Event Video</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Documentary">Documentary</option>
                  <option value="Feature Premiere">Feature Premiere</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1.5 uppercase font-bold">Client / Event Label *</label>
                <input
                  type="text"
                  value={formData.clientCompany}
                  onChange={(e) => setFormData((p) => ({ ...p, clientCompany: e.target.value }))}
                  placeholder="e.g. Event Video"
                  className="w-full bg-slate-900/80 text-white rounded-xl border border-white/10 p-3 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1.5 uppercase font-bold">Synopsis / Delivery Note</label>
              <textarea
                rows={3}
                value={formData.synopsis}
                onChange={(e) => setFormData((p) => ({ ...p, synopsis: e.target.value, description: e.target.value }))}
                placeholder="Describe this film cut or screening instructions for your client..."
                className="w-full bg-slate-900/80 text-white rounded-xl border border-white/10 p-3 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => {
                ensureLockedHandshakeCode();
                setIngestStep(2);
              }}
              disabled={!formData.title.trim() || !formData.clientCompany.trim()}
              className="cursor-pointer bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-black font-black px-6 py-3 rounded-xl text-xs flex items-center gap-2"
            >
              NEXT: CLIENT HANDSHAKE <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {ingestStep === 2 && (
        <div className="space-y-6">
          <div>
            <h3 className="font-cyber text-sm font-bold tracking-wider text-emerald-400 mb-2">STEP 2: CLIENT HANDSHAKE</h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter your client&apos;s @Handle (e.g., <span className="text-white font-mono">@TICKER</span> to test delivering to yourself). This handshake code is locked now and will NOT change during upload.
            </p>
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={formData.clientHandle}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, clientHandle: e.target.value.toUpperCase() }));
                    ensureLockedHandshakeCode();
                  }}
                  placeholder="@TICKER"
                  className="w-full bg-slate-900/80 text-white rounded-xl border border-white/10 pl-10 pr-3 py-3 font-mono text-sm"
                />
              </div>
              <button
                onClick={handleValidateClientHandle}
                className="cursor-pointer bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-5 py-3 rounded-xl text-xs font-bold hover:bg-emerald-500/30"
              >
                VALIDATE
              </button>
            </div>

            {normalizeHandle(formData.clientHandle) && deliveryCode && (
              <div className="glass-panel-emerald rounded-xl p-6 border border-emerald-500/30">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <Lock className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Immutable Handshake Locked for {normalizeHandle(formData.clientHandle)}</h4>
                    <p className="text-xs text-slate-400">This exact 6-character code stays bound to your delivery through completion</p>
                  </div>
                </div>
                <div className="bg-slate-950 rounded-xl p-4 flex items-center justify-between border border-emerald-500/20">
                  <span className="font-mono text-2xl text-emerald-400 tracking-[0.25em] font-black">{deliveryCode}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(deliveryCode);
                      setCopiedHandshake(true);
                      setTimeout(() => setCopiedHandshake(false), 2000);
                    }}
                    className="cursor-pointer bg-emerald-500/20 text-emerald-400 px-3 py-2 rounded-lg border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5"
                  >
                    <Copy className="w-4 h-4" />
                    {copiedHandshake ? 'COPIED' : 'COPY'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setIngestStep(1)}
              className="cursor-pointer bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-xl text-xs font-bold flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> BACK
            </button>
            <button
              onClick={() => {
                handleValidateClientHandle();
                setIngestStep(3);
              }}
              disabled={!normalizeHandle(formData.clientHandle)}
              className="cursor-pointer bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-black font-black px-6 py-3 rounded-xl text-xs flex items-center gap-2"
            >
              NEXT: ASSET UPLOAD <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {ingestStep === 3 && (
        <div className="space-y-6">
          <div>
            <h3 className="font-cyber text-sm font-bold tracking-wider text-emerald-400 mb-4">
              STEP 3: MASTER VIDEO &amp; AUTOMATIC FIRST-FRAME THUMBNAIL
            </h3>

            <div className="mb-6">
              <label className="text-[10px] text-slate-400 block mb-2 uppercase font-bold">
                1. SELECT WEDDING / EVENT MASTER VIDEO (.MP4 / .MOV) *
              </label>
              <label className="border-2 border-dashed border-emerald-500/30 rounded-xl p-8 text-center hover:border-emerald-400 transition cursor-pointer block bg-slate-900/40">
                <input
                  type="file"
                  className="hidden"
                  accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
                  onChange={(e) => handleSelectVideoFile(e.target.files?.[0] || null)}
                />
                {formData.videoFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    <span className="text-sm font-bold text-white">{formData.videoFile.name}</span>
                    <span className="text-xs font-mono text-emerald-400">
                      {(formData.videoFile.size / (1024 * 1024)).toFixed(2)} MB
                      {formData.detectedDuration ? ` • Duration ${formData.detectedDuration}` : ''}
                    </span>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                    <p className="text-sm text-white font-bold mb-1">Click to select master MP4 or MOV video</p>
                    <p className="text-[11px] text-slate-400">Frame 1 of your video automatically becomes the thumbnail below</p>
                  </div>
                )}
              </label>
            </div>

            <div className="mb-6 bg-slate-900/60 border border-white/10 rounded-xl p-4">
              <label className="text-[10px] text-slate-400 block mb-2 uppercase font-bold">
                2. VIDEO THUMBNAIL (AUTO-EXTRACTED FROM FRAME 1 — OR UPLOAD CUSTOM COVER)
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-44 h-24 rounded-xl bg-black border border-emerald-500/30 overflow-hidden flex items-center justify-center shrink-0">
                  {formData.bannerPreview ? (
                    <img src={formData.bannerPreview} alt="Frame 1 Thumbnail" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] text-slate-500 font-mono text-center px-2">Auto-generates on video select</span>
                  )}
                </div>
                <div className="flex-1 w-full space-y-2">
                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-emerald-400" />
                    Upload Custom Thumbnail Image (Optional)
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleSelectBannerFile(e.target.files?.[0] || null)}
                    />
                  </label>
                  <input
                    type="text"
                    value={formData.videoUrlInput}
                    onChange={(e) => setFormData((p) => ({ ...p, videoUrlInput: e.target.value }))}
                    placeholder="Optional: Or paste an existing direct HTTPS .mp4 / .m3u8 URL"
                    className="w-full bg-slate-950 text-white rounded-lg border border-white/10 p-2.5 font-mono text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setIngestStep(2)}
              className="cursor-pointer bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-xl text-xs font-bold flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> BACK
            </button>
            <button
              onClick={() => setIngestStep(4)}
              disabled={!formData.videoFile && !formData.videoUrlInput.trim()}
              className="cursor-pointer bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-black font-black px-6 py-3 rounded-xl text-xs flex items-center gap-2"
            >
              NEXT: REVIEW &amp; UPLOAD <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {ingestStep === 4 && (
        <div className="space-y-6">
          <div className="glass-panel-emerald rounded-xl p-5 border border-emerald-500/20 flex items-center gap-4">
            {formData.bannerPreview && (
              <img src={formData.bannerPreview} alt="Thumb" className="w-28 h-16 rounded-lg object-cover border border-emerald-500/30" />
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1 text-xs">
              <div>
                <p className="text-[10px] text-slate-500 uppercase">Title</p>
                <p className="text-white font-bold">{formData.title}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase">Client Node</p>
                <p className="text-emerald-400 font-mono font-bold">{normalizeHandle(formData.clientHandle)}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase">Locked Handshake</p>
                <p className="text-amber-400 font-mono font-black tracking-widest">{deliveryCode}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase">Master Payload</p>
                <p className="text-slate-200 font-mono">
                  {formData.videoFile ? `${(formData.videoFile.size / (1024 * 1024)).toFixed(2)} MB` : 'Direct HTTPS'}
                </p>
              </div>
            </div>
          </div>

          {!isUploading && !deliveredProject && (
            <div className="glass-panel-emerald rounded-xl p-8 border border-emerald-500/25 text-center space-y-4">
              <Shield className="w-12 h-12 text-emerald-400 mx-auto" />
              <h4 className="font-cyber text-lg font-bold text-white">Ready for Real Cloud Upload &amp; Client Delivery</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Streams your actual video bytes &amp; Frame-1 thumbnail to the Master Brain Cloud and delivers once under Handshake <strong className="text-emerald-400 font-mono">{deliveryCode}</strong>.
              </p>
              {uploadError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-xs text-rose-300 font-mono">
                  {uploadError}
                </div>
              )}
              <button
                onClick={handleExecuteRealDelivery}
                className="cursor-pointer bg-emerald-500 hover:bg-emerald-400 text-black font-black px-8 py-3.5 rounded-xl text-xs uppercase tracking-wider inline-flex items-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <Send className="w-4 h-4" /> UPLOAD MASTER &amp; DELIVER TO {normalizeHandle(formData.clientHandle)}
              </button>
            </div>
          )}

          {isUploading && (
            <div className="glass-panel-emerald rounded-xl p-6 border-2 border-emerald-400/50 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  UPLOADING REAL VIDEO BYTES TO CLOUD...
                </span>
                <span className="text-white font-mono font-black text-sm">
                  {uploadPercent}% {uploadMBText && `(${uploadMBText})`}
                </span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden border border-white/10">
                <div
                  className="bg-gradient-to-r from-emerald-400 via-amber-400 to-cyan-400 h-full transition-all duration-150"
                  style={{ width: `${uploadPercent}%` }}
                />
              </div>
              <div className="bg-slate-950 rounded-xl p-4 font-mono text-[11px] max-h-44 overflow-y-auto space-y-1">
                {uploadLogs.map((l, i) => (
                  <div key={i} className="text-slate-300">{l}</div>
                ))}
              </div>
            </div>
          )}

          {deliveredProject && !isUploading && (
            <div className="glass-panel-emerald rounded-xl p-8 border-2 border-emerald-500/40 text-center space-y-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <h4 className="font-cyber text-lg font-bold text-white">DELIVERY COMPLETE — STREAM IS LIVE &amp; PLAYABLE</h4>
              <p className="text-xs text-emerald-400 font-bold">
                ✓ Uploaded 100% to Cloud Storage • Single Entry ({deliveredProject.id}) • Frame-1 Thumbnail Attached
              </p>
              <div className="bg-slate-950 rounded-xl p-4 max-w-sm mx-auto border border-emerald-500/30">
                <p className="text-[10px] text-slate-400 uppercase mb-1">Verified Handshake Code</p>
                <p className="font-mono text-2xl text-emerald-400 font-black tracking-[0.25em]">{deliveredProject.handshakeCode}</p>
              </div>
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <button
                  onClick={() => setSelectedProject(deliveredProject)}
                  className="cursor-pointer bg-amber-500 hover:bg-amber-400 text-black font-black px-6 py-3 rounded-xl text-xs flex items-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" /> TEST PLAY VIDEO NOW
                </button>
                <button
                  onClick={handleFinishAndResetWizard}
                  className="cursor-pointer bg-emerald-500 hover:bg-emerald-400 text-black font-black px-6 py-3 rounded-xl text-xs flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" /> GO TO CLIENT ROSTER
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderMessages = () => {
    const activeChannel: 'dashboard' | 'platform_live' = viewMode === 'creator' ? creatorMsgChannel : 'dashboard';
    const isGolden = activeChannel === 'platform_live';
    const peers = getPeersForChannel(activeChannel);
    const currentPeer = activeChatPeer || peers[0]?.handle || '@TICKER';

    const threadMsgs = cloudMessages.filter((m) => {
      if (viewMode === 'creator' && m.channel !== activeChannel) return false;
      if (viewMode === 'client' && m.channel !== 'dashboard' && m.channel !== 'platform_live') return false;
      return (
        (normalizeHandle(m.from) === myHandle && normalizeHandle(m.to) === currentPeer) ||
        (normalizeHandle(m.from) === currentPeer && normalizeHandle(m.to) === myHandle) ||
        (isGolden && myHandle === '@TICKER' && (normalizeHandle(m.from) === currentPeer || normalizeHandle(m.to) === currentPeer))
      );
    });

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className={`font-cyber text-sm font-bold tracking-wider ${isGolden ? 'text-amber-400' : 'text-white'}`}>
              {viewMode === 'creator'
                ? isGolden
                  ? '✦ GOLDEN LIVE STREAMSHARE PLATFORM INBOX (TV & WEB APP)'
                  : 'DASHBOARD CLIENT REVISIONS MESSENGER'
                : 'CLIENT-TO-CREATOR DIRECT MESSENGER'}
            </h3>
            <p className="text-[10px] text-slate-400">
              {isGolden
                ? 'Live screening notes & timecode feedback sent by clients directly from the StreamShare platform app'
                : 'Direct encrypted B2B messaging between Client Dashboard and Creator Portal'}
            </p>
          </div>

          {viewMode === 'creator' && (
            <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setCreatorMsgChannel('dashboard')}
                className={`cursor-pointer px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                  creatorMsgChannel === 'dashboard'
                    ? 'bg-emerald-500 text-black font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                1. Dashboard Client Chat
                {dashMsgCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[9px] rounded-full bg-black/80 text-emerald-300 font-mono">
                    {dashMsgCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setCreatorMsgChannel('platform_live')}
                className={`cursor-pointer px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                  creatorMsgChannel === 'platform_live'
                    ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-black shadow-[0_0_20px_rgba(234,179,8,0.45)]'
                    : 'text-amber-300/80 hover:text-amber-300 border border-amber-500/30'
                }`}
              >
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                2. Golden Live Platform Chat
                {goldenUnreadCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[9px] rounded-full bg-black text-amber-400 font-mono">
                    {goldenUnreadCount}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div
            className={`rounded-xl border overflow-hidden ${
              isGolden ? 'bg-amber-950/10 border-amber-500/35' : 'glass-panel-emerald border-emerald-500/20'
            }`}
          >
            <div className="p-3 border-b border-white/10 flex gap-2">
              <input
                type="text"
                value={customPeerInput}
                onChange={(e) => setCustomPeerInput(e.target.value.toUpperCase())}
                placeholder="Open @HANDLE thread..."
                className="flex-1 bg-slate-950 text-white rounded-lg border border-white/10 px-3 py-2 text-xs font-mono"
              />
              <button
                onClick={() => {
                  const h = normalizeHandle(customPeerInput);
                  if (h) {
                    setActiveChatPeer(h);
                    setCustomPeerInput('');
                  }
                }}
                className={`cursor-pointer px-3 py-2 rounded-lg text-xs font-black ${
                  isGolden ? 'bg-amber-400 text-black' : 'bg-emerald-500 text-black'
                }`}
              >
                OPEN
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto divide-y divide-white/5">
              {peers.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  Enter a client @HANDLE above or deliver a project to start a thread.
                </div>
              ) : (
                peers.map((peer) => (
                  <div
                    key={peer.handle}
                    onClick={() => setActiveChatPeer(peer.handle)}
                    className={`p-4 cursor-pointer transition flex items-center gap-3 ${
                      currentPeer === peer.handle
                        ? isGolden
                          ? 'bg-amber-500/15 border-l-2 border-l-amber-400'
                          : 'bg-emerald-500/15 border-l-2 border-l-emerald-400'
                        : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center ${
                        isGolden ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      <User className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white truncate">{peer.label}</p>
                      <p className={`text-[10px] font-mono truncate ${isGolden ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {peer.handle}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div
            className={`lg:col-span-2 rounded-xl border flex flex-col min-h-[420px] ${
              isGolden
                ? 'bg-gradient-to-b from-amber-950/20 to-[#080808] border-amber-500/40 shadow-[0_0_25px_rgba(234,179,8,0.12)]'
                : 'glass-panel-emerald border-emerald-500/20'
            }`}
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sparkles className={`w-4 h-4 ${isGolden ? 'text-amber-400' : 'text-emerald-400'}`} />
                <span className="text-xs font-mono font-bold text-white">
                  {myHandle} &harr; {currentPeer}
                </span>
              </div>
              <span
                className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border uppercase font-bold ${
                  isGolden
                    ? 'bg-amber-500/20 border-amber-400/50 text-amber-300'
                    : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                }`}
              >
                {isGolden ? 'GOLDEN LIVE STREAMSHARE SYNC' : 'DASHBOARD DIRECT SYNC'}
              </span>
            </div>

            <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-80">
              {threadMsgs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                  <MessageSquare className={`w-10 h-10 mb-2 ${isGolden ? 'text-amber-400/40' : 'text-slate-600'}`} />
                  <p className="text-xs text-slate-400">
                    {isGolden
                      ? 'When a client sends a live note from the StreamShare app, it lights up right here in Cinema Gold.'
                      : `Send a direct message below to ${currentPeer}.`}
                  </p>
                </div>
              ) : (
                threadMsgs.map((msg) => {
                  const mine = normalizeHandle(msg.from) === myHandle;
                  return (
                    <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[78%] p-3.5 rounded-xl text-xs space-y-1 ${
                          isGolden
                            ? mine
                              ? 'bg-amber-400 text-black font-semibold'
                              : 'bg-amber-500/15 border border-amber-400/40 text-amber-100'
                            : mine
                              ? 'bg-emerald-500/25 border border-emerald-500/40 text-white'
                              : 'bg-slate-800 border border-white/10 text-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4 text-[9px] font-mono opacity-75">
                          <span>{msg.from} &rarr; {msg.to}</span>
                          <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        {msg.projectTitle && (
                          <p className="text-[10px] font-mono uppercase underline opacity-80">{msg.projectTitle}</p>
                        )}
                        <p className="leading-relaxed">{msg.content}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {msgStatusBanner && (
              <div className="mx-4 mb-2 px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-400/40 text-[11px] font-mono text-emerald-300">
                {msgStatusBanner}
              </div>
            )}
            <div className="p-4 border-t border-white/10 flex gap-3">
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendCloudMessage(activeChannel, currentPeer, selectedProject);
                }}
                placeholder={
                  isGolden
                    ? `Reply live to ${currentPeer} on StreamShare Platform...`
                    : `Message ${currentPeer} on Dashboard...`
                }
                className="flex-1 bg-slate-900 text-white rounded-xl border border-white/15 px-4 py-3 text-xs focus:outline-none"
              />
              <button
                onClick={() => handleSendCloudMessage(activeChannel, currentPeer, selectedProject)}
                disabled={sendingMsg || !messageText.trim()}
                className={`cursor-pointer px-5 py-3 rounded-xl text-xs font-black flex items-center gap-1.5 ${
                  isGolden
                    ? 'bg-amber-400 hover:bg-amber-300 text-black'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-black'
                }`}
              >
                <Send className="w-4 h-4" /> SEND
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderClientPremieres = () => {
    const clientDeliveries = liveProjects.filter(
      (p) =>
        !p.clientHandle ||
        normalizeHandle(p.clientHandle) === myHandle ||
        p.status === 'approved' ||
        p.status === 'delivered'
    );

    return (
      <div className="space-y-6">
        <div className="glass-panel-emerald rounded-xl p-6 border border-emerald-500/20 flex items-center justify-between">
          <div>
            <h2 className="font-cyber text-lg font-bold text-white">Welcome, {myHandle}</h2>
            <p className="text-xs text-slate-400 mt-1">Click any delivered film below to stream your master cut or send revision feedback</p>
          </div>
          <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl">
            {clientDeliveries.length} Active {clientDeliveries.length === 1 ? 'Delivery' : 'Deliveries'}
          </span>
        </div>

        {clientDeliveries.length === 0 ? (
          <div className="glass-panel-emerald rounded-xl p-12 border border-emerald-500/15 text-center space-y-2">
            <Film className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm text-slate-300 font-bold">No deliveries in your inbox yet</p>
            <p className="text-xs text-slate-500">Switch to Creator Portal to upload and deliver a master video to {myHandle}.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {clientDeliveries.map((project) => (
              <div
                key={project.id}
                onClick={() => setSelectedProject(project)}
                className="group cursor-pointer rounded-xl overflow-hidden bg-slate-900 border border-white/10 hover:border-emerald-400 transition shadow-xl"
              >
                <div className="aspect-video bg-black relative">
                  {project.thumbnail ? (
                    <img src={project.thumbnail} alt={project.title} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Film className="w-10 h-10 text-emerald-500/40" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
                  <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-[10px] font-mono text-emerald-300">
                    {project.handshakeCode || 'READY'}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-90 group-hover:scale-110 transition">
                    <div className="w-12 h-12 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-lg">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </div>
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="font-bold text-white text-sm truncate">{project.title}</p>
                    <p className="text-[10px] text-slate-300 font-mono">From {project.creatorHandle} • {project.duration}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderProjectDetailModal = () => {
    if (!selectedProject) return null;
    return (
      <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-8">
        <div className="bg-slate-950 border border-emerald-500/30 rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl">
          <div className="aspect-video bg-black relative">
            {selectedProject.videoUrl ? (
              <video
                key={selectedProject.videoUrl}
                src={selectedProject.videoUrl}
                poster={selectedProject.thumbnail}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain bg-black"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-mono">
                Stream URL missing
              </div>
            )}
          </div>

          <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <h3 className="font-bold text-white text-lg">{selectedProject.title}</h3>
                {selectedProject.handshakeCode && (
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                    CODE: {selectedProject.handshakeCode}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">{selectedProject.description}</p>
              <p className="text-[10px] text-slate-500 font-mono mt-1">
                ID: {selectedProject.id} • Creator: {selectedProject.creatorHandle} • Client: {selectedProject.clientHandle}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {selectedProject.videoUrl && (
                <a
                  href={selectedProject.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="cursor-pointer bg-emerald-500 hover:bg-emerald-400 text-black font-black px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" /> DOWNLOAD MASTER
                </a>
              )}
              <button
                onClick={() => {
                  const target =
                    viewMode === 'client'
                      ? selectedProject.creatorHandle || '@TICKER'
                      : selectedProject.clientHandle || '@TICKER';
                  setActiveChatPeer(normalizeHandle(target));
                  setSelectedProject(null);
                  setActiveTab('messages');
                }}
                className="cursor-pointer bg-white/10 hover:bg-white/15 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <MessageSquare className="w-4 h-4 text-emerald-400" /> SEND FEEDBACK
              </button>
              <button onClick={() => setSelectedProject(null)} className="cursor-pointer text-slate-400 hover:text-white p-2">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-1 w-full max-w-full min-w-0 h-[calc(100vh-2rem)] overflow-hidden bg-[#050505] text-white">
      <div className="w-64 border-r border-white/10 bg-white/[0.02] flex flex-col shrink-0">
        <div className="p-6 border-b border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center">
            <Share2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-cyber text-sm font-bold text-white">STREAMSHARE</h2>
            <p className="text-[10px] text-slate-400">Cloud Master Delivery</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1.5">
          {viewMode === 'creator' ? (
            <>
              <button
                onClick={() => setActiveTab('roster')}
                className={`cursor-pointer w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition ${
                  activeTab === 'roster'
                    ? 'bg-emerald-500/20 text-emerald-300 border-2 border-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.45)]'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Briefcase className="w-4 h-4" /> Client Roster
              </button>
              <button
                onClick={() => setActiveTab('ingest')}
                className={`cursor-pointer w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition ${
                  activeTab === 'ingest'
                    ? 'bg-emerald-500/20 text-emerald-300 border-2 border-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.45)]'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Upload className="w-4 h-4" /> Direct Delivery
              </button>
              <button
                onClick={() => setActiveTab('messages')}
                className={`cursor-pointer w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition ${
                  activeTab === 'messages'
                    ? 'bg-amber-500/20 text-amber-300 border-2 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.5)]'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="flex items-center gap-3">
                  <MessageSquare className="w-4 h-4 text-amber-400" /> Dual Messaging
                </span>
                {goldenUnreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-black text-[9px] font-black">
                    {goldenUnreadCount}
                  </span>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveTab('premieres')}
                className={`cursor-pointer w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition ${
                  activeTab === 'premieres'
                    ? 'bg-emerald-500/20 text-emerald-300 border-2 border-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.45)]'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Film className="w-4 h-4" /> My Premieres
              </button>
              <button
                onClick={() => setActiveTab('messages')}
                className={`cursor-pointer w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition ${
                  activeTab === 'messages'
                    ? 'bg-emerald-500/20 text-emerald-300 border-2 border-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.45)]'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <MessageSquare className="w-4 h-4" /> Message Creator
              </button>
            </>
          )}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-2 p-2.5 bg-white/5 border border-white/10 rounded-xl">
            <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-xs font-bold text-white font-mono truncate">{myHandle}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 min-w-0 max-w-full flex flex-col h-full overflow-hidden">
        <div className="h-16 w-full min-w-0 border-b border-white/10 flex items-center justify-between gap-4 px-6 shrink-0 bg-[#07090e]">
          <div className="flex items-center gap-4">
            <button onClick={handleGuardedBack} className="cursor-pointer flex items-center gap-2 text-slate-400 hover:text-white transition">
              <ChevronLeft className="w-4 h-4" />
              <span className="text-xs font-bold">Back to Hub</span>
            </button>
            <div className="h-4 w-px bg-white/10" />
            <h2 className="text-sm font-bold text-white">
              {viewMode === 'creator'
                ? activeTab === 'roster'
                  ? 'Client Roster'
                  : activeTab === 'ingest'
                    ? 'Direct Cloud Delivery'
                    : 'Creator Dual Messaging Hub'
                : activeTab === 'premieres'
                  ? 'My Client Premieres'
                  : 'Direct Creator Chat'}
            </h2>
          </div>

          <div className="flex items-center gap-1 bg-slate-900 rounded-xl p-1 border border-white/10">
            <button
              onClick={() => {
                setViewMode('creator');
                setActiveTab('roster');
              }}
              className={`cursor-pointer px-4 py-2 rounded-lg text-xs font-bold transition ${
                viewMode === 'creator' ? 'bg-emerald-500 text-black font-black shadow-[0_0_16px_rgba(16,185,129,0.65)]' : 'text-slate-300 hover:text-white'
              }`}
            >
              Creator Portal
            </button>
            <button
              onClick={() => {
                setViewMode('client');
                setActiveTab('premieres');
              }}
              className={`cursor-pointer px-4 py-2 rounded-lg text-xs font-bold transition ${
                viewMode === 'client' ? 'bg-emerald-500 text-black font-black shadow-[0_0_16px_rgba(16,185,129,0.65)]' : 'text-slate-300 hover:text-white'
              }`}
            >
              Client Dashboard
            </button>
          </div>
        </div>

        <div className="flex-1 w-full min-w-0 overflow-y-auto p-6">
          <div className="w-full max-w-5xl">
            {draftRestoredBanner && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-amber-500/15 border border-amber-400/50 flex items-center justify-between text-xs font-mono text-amber-300">
                <span>{draftRestoredBanner}</span>
                <button
                  onClick={async () => {
                    await clearPlatformDraft('StreamShare');
                    setFormData(initialFormData);
                    setDeliveryCode('');
                    setIngestStep(1);
                    setDraftRestoredBanner(null);
                  }}
                  className="cursor-pointer underline text-rose-300 hover:text-rose-200 ml-4"
                >
                  Clear Draft
                </button>
              </div>
            )}
            {viewMode === 'creator' && activeTab === 'roster' && renderRoster()}
            {viewMode === 'creator' && activeTab === 'ingest' && renderIngest()}
            {activeTab === 'messages' && renderMessages()}
            {viewMode === 'client' && activeTab === 'premieres' && renderClientPremieres()}
          </div>
        </div>
      </div>

      {renderProjectDetailModal()}
      <DraftExitGuardModal
        open={showExitGuard}
        tenant="StreamShare"
        projectTitle={formData.title}
        isUploading={isUploading}
        onStay={() => setShowExitGuard(false)}
        onSaveAndExit={async () => {
          savePlatformDraftMeta('StreamShare', {
            title: formData.title,
            clientCompany: formData.clientCompany,
            clientHandle: formData.clientHandle,
            clientEmail: formData.clientEmail,
            description: formData.description,
            synopsis: formData.synopsis,
            category: formData.category,
            videoUrlInput: formData.videoUrlInput,
            isPublicShowcase: formData.isPublicShowcase,
            detectedDuration: formData.detectedDuration,
            bannerPreview: formData.bannerPreview?.startsWith('data:') ? formData.bannerPreview : '',
            deliveryCode,
            ingestStep,
          });
          await saveDraftBinaryFiles('StreamShare', {
            videoFile: formData.videoFile,
            bannerFile: formData.bannerFile,
          });
          setShowExitGuard(false);
          onBack();
        }}
        onDiscardAndExit={async () => {
          await clearPlatformDraft('StreamShare');
          setFormData(initialFormData);
          setDeliveryCode('');
          setIngestStep(1);
          setShowExitGuard(false);
          onBack();
        }}
      />
    </div>
  );
}
