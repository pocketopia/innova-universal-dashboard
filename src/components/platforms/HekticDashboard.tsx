import React, { useState, useRef } from 'react';
import { submitContent } from '../../lib/apiClient';
import {
  Tv,
  Radio,
  Activity,
  LayoutDashboard,
  Wifi,
  Video,
  ChevronLeft,
  CheckCircle2,
  Play,
  Square,
  Users,
  Clock,
  BarChart3,
  Settings,
  Plus,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Upload,
  Zap,
  Shield,
  Signal,
  Cpu,
  Eye,
  Film,
  Image,
  FileVideo,
  Mic,
  Monitor,
  UploadCloud,
  AlertCircle,
  Check,
  X,
  Lock
} from 'lucide-react';

// Types
interface BroadcastFormData {
  title: string;
  category: string;
  synopsis: string;
  tags: string;
  bannerFile: File | null;
  trailerFile: File | null;
  mediaFile: File | null;
  bannerPreview: string | null;
  trailerPreview: string | null;
  mediaPreview: string | null;
}

interface HekticSubmission {
  id: string;
  title: string;
  status: 'draft' | 'pending' | 'live' | 'ended' | 'terminated';
  submittedBy: string;
  submittedAt: string;
  category: string;
  viewers?: number;
}

type TabType = 'dashboard' | 'ingest' | 'analytics' | 'admin';
type IngestStep = 1 | 2 | 3;

interface HekticDashboardProps {
  userNode: any;
  onBack: () => void;
  submissions: any[];
  setSubmissions: any;
}

const genres = ['Music', 'Esports', 'Extreme Sports', 'Reality TV'];
const REGIONS = [
  { id: 'us-east', name: 'US-East', latency: '12ms' },
  { id: 'us-west', name: 'US-West', latency: '28ms' },
  { id: 'eu-central', name: 'EU-Central', latency: '45ms' },
  { id: 'asia-pacific', name: 'Asia-Pacific', latency: '89ms' }
];

const initialFormData: BroadcastFormData = {
  title: '',
  category: genres[0],
  synopsis: '',
  tags: '',
  bannerFile: null,
  trailerFile: null,
  mediaFile: null,
  bannerPreview: null,
  trailerPreview: null,
  mediaPreview: null
};

export default function HekticDashboard({ userNode, onBack, submissions, setSubmissions }: HekticDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [ingestStep, setIngestStep] = useState<IngestStep>(1);
  const [formData, setFormData] = useState<BroadcastFormData>(initialFormData);
  const [isChecking, setIsChecking] = useState(false);
  const [checkProgress, setCheckProgress] = useState(0);
  const [checkLogs, setCheckLogs] = useState<string[]>([]);
  const [checkResult, setCheckResult] = useState<'passed' | 'failed' | null>(null);
  const [dragActive, setDragActive] = useState<{ [key: string]: boolean }>({ banner: false, trailer: false, media: false });
  
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const trailerInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = userNode.handle.toUpperCase() === '@TICKER';

  // Filter submissions for admin view
  const pendingSubmissions = submissions.filter(s => s.status === 'pending');
  const liveSubmissions = submissions.filter(s => s.status === 'live');
  const allSubmissions = submissions;

  // Handle file uploads
  const handleFileChange = (field: 'bannerFile' | 'trailerFile' | 'mediaFile', file: File | null) => {
    const previewField = field.replace('File', 'Preview') as 'bannerPreview' | 'trailerPreview' | 'mediaPreview';
    
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setFormData(prev => ({ 
        ...prev, 
        [field]: file,
        [previewField]: previewUrl
      }));
    } else {
      setFormData(prev => ({ 
        ...prev, 
        [field]: null,
        [previewField]: null
      }));
    }
  };

  const handleDrag = (e: React.DragEvent, type: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(prev => ({ ...prev, [type]: true }));
    } else if (e.type === 'dragleave') {
      setDragActive(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleDrop = (e: React.DragEvent, type: string, field: 'bannerFile' | 'trailerFile' | 'mediaFile') => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(prev => ({ ...prev, [type]: false }));
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(field, e.dataTransfer.files[0]);
    }
  };

  const simulateNetworkCheck = () => {
    setIsChecking(true);
    setCheckProgress(0);
    setCheckLogs([]);
    setCheckResult(null);

    const logs = [
      `🎬 [VIDEO CODEC] Analyzing video stream integrity...`,
      `✅ [VIDEO CODEC] H.264/HEVC codec detected - Compatible`,
      `📐 [ASPECT RATIO] Mapping display aspect ratio...`,
      `✅ [ASPECT RATIO] 16:9 widescreen format confirmed`,
      `🔊 [AUDIO COMPRESSION] Scanning audio compression formats...`,
      `✅ [AUDIO COMPRESSION] AAC-LC 48kHz stereo validated`,
      `🎥 [FRAME RATE] Verifying temporal resolution...`,
      `✅ [FRAME RATE] 24fps cinema standard detected`,
      `💾 [BITRATE] Analyzing data throughput...`,
      `✅ [BITRATE] Optimal bitrate for streaming confirmed`,
      `🔐 [COMPLIANCE] Running content compliance scan...`,
      `✅ [COMPLIANCE] All regulatory requirements met`,
      `🟢 [RESULT] Pre-flight compliance scan PASSED - Ready for transmission!`
    ];

    let currentLog = 0;
    const interval = setInterval(() => {
      setCheckProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsChecking(false);
          setCheckResult('passed');
          return 100;
        }
        if (currentLog < logs.length) {
          setCheckLogs(prev => [...prev, logs[currentLog]]);
          currentLog++;
        }
        return prev + 4;
      });
    }, 180);
  };

  const handleSubmitToRegistry = async () => {
    try {
      const generatedId = "HEK-" + Date.now().toString().slice(-6);

      const payload = {
        id: generatedId,
        title: formData.title,
        genre: formData.category,
        creator: userNode.handle,
        synopsis: formData.synopsis || 'No description provided.',
        thumbnail: `https://picsum.photos/seed/${generatedId}/800/450`,
        videoUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
        status: 'pending'
      };

      const result = await submitContent(payload);
      
      const newSubmission: HekticSubmission = {
        id: generatedId,
        title: formData.title,
        status: 'pending',
        submittedBy: userNode.handle,
        submittedAt: new Date().toISOString(),
        category: formData.category
      };
      setSubmissions(prev => [newSubmission, ...prev]);
      setFormData(initialFormData);
      setIngestStep(1);
      setCheckResult(null);
      setCheckLogs([]);
      setActiveTab('dashboard');
    } catch (error) {
      console.error('[API ERROR]', error);
      alert('Failed to submit broadcast. Please try again.');
    }
  };

  const handleApproveSubmission = (id: string) => {
    setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status: 'approved' } : s));
  };

  const handleTerminateSubmission = (id: string) => {
    setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status: 'terminated' } : s));
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'live': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'terminated': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'pending': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'ended': return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
      case 'draft': return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-4">
        <div className="glass-panel-indigo rounded-xl p-4 border border-indigo-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Total Productions</p>
              <p className="text-2xl font-black text-white mt-1">{allSubmissions.length}</p>
            </div>
            <Film className="w-8 h-8 text-indigo-400" />
          </div>
        </div>
        <div className="glass-panel-violet rounded-xl p-4 border border-violet-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Pending Review</p>
              <p className="text-2xl font-black text-white mt-1">{pendingSubmissions.length}</p>
            </div>
            <Clock className="w-8 h-8 text-violet-400" />
          </div>
        </div>
        <div className="glass-panel-emerald rounded-xl p-4 border border-emerald-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Now Streaming</p>
              <p className="text-2xl font-black text-white mt-1">{liveSubmissions.length}</p>
            </div>
            <Radio className="w-8 h-8 text-emerald-400" />
          </div>
        </div>
        <div className="glass-panel-indigo rounded-xl p-4 border border-indigo-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Total Viewers</p>
              <p className="text-2xl font-black text-white mt-1">
                {allSubmissions.reduce((acc, s) => acc + (s.viewers || 0), 0).toLocaleString()}
              </p>
            </div>
            <Users className="w-8 h-8 text-indigo-400" />
          </div>
        </div>
      </div>

      {/* Recent Productions */}
      <div className="glass-panel-indigo rounded-xl p-6 border border-indigo-500/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-cyber text-sm font-bold tracking-wider text-white">RECENT PRODUCTIONS</h3>
          <button
            onClick={() => setActiveTab('ingest')}
            className="cursor-pointer bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            NEW PRODUCTION
          </button>
        </div>
        {allSubmissions.length === 0 ? (
          <div className="text-center py-12">
            <Film className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No productions yet. Start your first feature dispatch.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {allSubmissions.slice(0, 5).map(sub => (
              <div key={sub.id} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                    <Film className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">{sub.title}</p>
                    <p className="text-[10px] text-slate-400">{sub.id} • {sub.category} • {new Date(sub.submittedAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(sub.status)}`}>
                  {String(sub.status || 'draft').replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Step 1: Content Metadata & Details
  const renderIngestStep1 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-cyber text-sm font-bold tracking-wider text-indigo-400 mb-4">STEP 1: CONTENT METADATA & DETAILS</h3>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-cyber text-slate-400 block mb-1.5 uppercase font-bold">Production Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter your production title"
              className="w-full bg-slate-900/80 text-white rounded-xl border border-white/10 p-3 font-sans text-sm focus:outline-none focus:border-indigo-400 transition"
            />
          </div>
          
          <div>
            <label className="text-[10px] font-cyber text-slate-400 block mb-1.5 uppercase font-bold">Genre / Category *</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className="w-full bg-slate-900/80 text-white rounded-xl border border-white/10 p-3 font-sans text-sm focus:outline-none focus:border-indigo-400 transition"
            >
              {genres.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-cyber text-slate-400 block mb-1.5 uppercase font-bold">Synopsis / Description</label>
            <textarea
              value={formData.synopsis}
              onChange={(e) => setFormData(prev => ({ ...prev, synopsis: e.target.value }))}
              placeholder="Provide a detailed description of your production..."
              rows={5}
              className="w-full bg-slate-900/80 text-white rounded-xl border border-white/10 p-3 font-sans text-sm focus:outline-none focus:border-indigo-400 transition resize-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-cyber text-slate-400 block mb-1.5 uppercase font-bold">Tags</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
              placeholder="e.g. documentary, feature film, series, seasonal (comma separated)"
              className="w-full bg-slate-900/80 text-white rounded-xl border border-white/10 p-3 font-sans text-sm focus:outline-none focus:border-indigo-400 transition"
            />
          </div>
        </div>
      </div>
      <div className="flex justify-end">
        <button
          onClick={() => setIngestStep(2)}
          disabled={!formData.title}
          className="cursor-pointer bg-indigo-500 hover:bg-indigo-400 disabled:bg-slate-700 disabled:text-slate-500 text-white px-6 py-3 rounded-xl text-xs font-bold flex items-center gap-2 transition"
        >
          NEXT: MEDIA ASSET VAULT
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  // Step 2: Media Asset Vault (Uploads)
  const renderIngestStep2 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-cyber text-sm font-bold tracking-wider text-indigo-400 mb-4">STEP 2: MEDIA ASSET VAULT</h3>
        
        <div className="space-y-6">
          {/* Banner / Main Poster */}
          <div>
            <label className="text-[10px] font-cyber text-slate-400 block mb-2 uppercase font-bold">BANNER / MAIN POSTER ARTWORK</label>
            <div 
              className={`relative rounded-xl border-2 border-dashed transition-all duration-200 ${
                dragActive.banner 
                  ? 'border-indigo-400 bg-indigo-500/10' 
                  : formData.bannerPreview 
                    ? 'border-emerald-500/30 bg-slate-900/50' 
                    : 'border-white/10 bg-slate-900/30 hover:border-white/20'
              }`}
              onDragEnter={(e) => handleDrag(e, 'banner')}
              onDragLeave={(e) => handleDrag(e, 'banner')}
              onDragOver={(e) => handleDrag(e, 'banner')}
              onDrop={(e) => handleDrop(e, 'banner', 'bannerFile')}
            >
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileChange('bannerFile', e.target.files?.[0] || null)}
              />
              
              {formData.bannerPreview ? (
                <div className="relative">
                  <img 
                    src={formData.bannerPreview} 
                    alt="Banner preview" 
                    className="w-full h-48 object-cover rounded-xl"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent rounded-xl" />
                  <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs text-white font-medium">Banner uploaded</span>
                    </div>
                    <button
                      onClick={() => handleFileChange('bannerFile', null)}
                      className="p-1 hover:bg-white/10 rounded-lg transition"
                    >
                      <X className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                </div>
              ) : (
                <div 
                  className="flex flex-col items-center justify-center py-12 cursor-pointer"
                  onClick={() => bannerInputRef.current?.click()}
                >
                  <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4">
                    <Image className="w-8 h-8 text-indigo-400" />
                  </div>
                  <p className="text-sm text-slate-300 font-medium mb-1">Drop banner artwork here</p>
                  <p className="text-xs text-slate-500">or click to browse • PNG, JPG up to 10MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Trailer Video */}
          <div>
            <label className="text-[10px] font-cyber text-slate-400 block mb-2 uppercase font-bold">GAMEPLAY / HYPE TRAILER</label>
            <div 
              className={`relative rounded-xl border-2 border-dashed transition-all duration-200 ${
                dragActive.trailer 
                  ? 'border-violet-400 bg-violet-500/10' 
                  : formData.trailerPreview 
                    ? 'border-emerald-500/30 bg-slate-900/50' 
                    : 'border-white/10 bg-slate-900/30 hover:border-white/20'
              }`}
              onDragEnter={(e) => handleDrag(e, 'trailer')}
              onDragLeave={(e) => handleDrag(e, 'trailer')}
              onDragOver={(e) => handleDrag(e, 'trailer')}
              onDrop={(e) => handleDrop(e, 'trailer', 'trailerFile')}
            >
              <input
                ref={trailerInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => handleFileChange('trailerFile', e.target.files?.[0] || null)}
              />
              
              {formData.trailerPreview ? (
                <div className="relative">
                  <video 
                    src={formData.trailerPreview} 
                    className="w-full h-48 object-cover rounded-xl"
                    controls
                  />
                  <div className="absolute bottom-3 left-4 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs text-white font-medium">Trailer uploaded</span>
                  </div>
                  <button
                    onClick={() => handleFileChange('trailerFile', null)}
                    className="absolute bottom-3 right-4 p-1 hover:bg-white/10 rounded-lg transition"
                  >
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              ) : (
                <div 
                  className="flex flex-col items-center justify-center py-12 cursor-pointer"
                  onClick={() => trailerInputRef.current?.click()}
                >
                  <div className="w-16 h-16 rounded-full bg-violet-500/10 flex items-center justify-center mb-4">
                    <FileVideo className="w-8 h-8 text-violet-400" />
                  </div>
                  <p className="text-sm text-slate-300 font-medium mb-1">Drop trailer video here</p>
                  <p className="text-xs text-slate-500">or click to browse • MP4, MOV up to 500MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Full Feature Media */}
          <div>
            <label className="text-[10px] font-cyber text-slate-400 block mb-2 uppercase font-bold">FULL FEATURE FILM / SERIES EPISODE MASTER</label>
            <div 
              className={`relative rounded-xl border-2 border-dashed transition-all duration-200 ${
                dragActive.media 
                  ? 'border-emerald-400 bg-emerald-500/10' 
                  : formData.mediaPreview 
                    ? 'border-emerald-500/30 bg-slate-900/50' 
                    : 'border-white/10 bg-slate-900/30 hover:border-white/20'
              }`}
              onDragEnter={(e) => handleDrag(e, 'media')}
              onDragLeave={(e) => handleDrag(e, 'media')}
              onDragOver={(e) => handleDrag(e, 'media')}
              onDrop={(e) => handleDrop(e, 'media', 'mediaFile')}
            >
              <input
                ref={mediaInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => handleFileChange('mediaFile', e.target.files?.[0] || null)}
              />
              
              {formData.mediaPreview ? (
                <div className="relative">
                  <video 
                    src={formData.mediaPreview} 
                    className="w-full h-48 object-cover rounded-xl"
                    controls
                  />
                  <div className="absolute bottom-3 left-4 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs text-white font-medium">Master file uploaded</span>
                  </div>
                  <button
                    onClick={() => handleFileChange('mediaFile', null)}
                    className="absolute bottom-3 right-4 p-1 hover:bg-white/10 rounded-lg transition"
                  >
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              ) : (
                <div 
                  className="flex flex-col items-center justify-center py-12 cursor-pointer"
                  onClick={() => mediaInputRef.current?.click()}
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                    <Film className="w-8 h-8 text-emerald-400" />
                  </div>
                  <p className="text-sm text-slate-300 font-medium mb-1">Drop master file here</p>
                  <p className="text-xs text-slate-500">or click to browse • MP4, MOV, MKV up to 2GB</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <button
          onClick={() => setIngestStep(1)}
          className="cursor-pointer bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-xl text-xs font-bold flex items-center gap-2 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          BACK
        </button>
        <button
          onClick={() => setIngestStep(3)}
          disabled={!formData.bannerFile || !formData.mediaFile}
          className="cursor-pointer bg-indigo-500 hover:bg-indigo-400 disabled:bg-slate-700 disabled:text-slate-500 text-white px-6 py-3 rounded-xl text-xs font-bold flex items-center gap-2 transition"
        >
          NEXT: AI COMPLIANCE SCAN
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  // Step 3: Pre-Flight AI Compliance Scan & Deploy
  const renderIngestStep3 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-cyber text-sm font-bold tracking-wider text-indigo-400 mb-4">STEP 3: PRE-FLIGHT AI COMPLIANCE SCAN & DEPLOY</h3>

        {!isChecking && !checkResult && (
          <div className="glass-panel-indigo rounded-xl p-8 border border-indigo-500/20 text-center">
            <Cpu className="w-16 h-16 text-indigo-400 mx-auto mb-4 animate-pulse" />
            <h4 className="font-cyber text-lg font-bold text-white mb-2">AI Compliance Analysis</h4>
            <p className="text-sm text-slate-400 mb-6 max-w-md mx-auto">
              Our AI will analyze video codec integrity, aspect ratio mapping, and audio compression formats before transmission.
            </p>
            <div className="grid grid-cols-3 gap-4 mb-6 text-xs">
              <div className="bg-slate-900/50 p-3 rounded-lg">
                <Monitor className="w-5 h-5 text-indigo-400 mx-auto mb-1" />
                <span className="text-slate-400">Video Codec</span>
              </div>
              <div className="bg-slate-900/50 p-3 rounded-lg">
                <Mic className="w-5 h-5 text-violet-400 mx-auto mb-1" />
                <span className="text-slate-400">Audio Format</span>
              </div>
              <div className="bg-slate-900/50 p-3 rounded-lg">
                <Shield className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                <span className="text-slate-400">Compliance</span>
              </div>
            </div>
            <button
              onClick={simulateNetworkCheck}
              className="cursor-pointer bg-indigo-500 hover:bg-indigo-400 text-white px-8 py-3 rounded-xl text-sm font-bold flex items-center gap-2 mx-auto transition"
            >
              <Activity className="w-5 h-5" />
              START AI COMPLIANCE SCAN
            </button>
          </div>
        )}

        {isChecking && (
          <div className="glass-panel-indigo rounded-xl p-6 border border-indigo-500/20">
            <div className="flex items-center justify-between mb-4">
              <span className="text-indigo-400 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                AI COMPLIANCE ANALYSIS IN PROGRESS
              </span>
              <span className="text-white font-bold font-mono">{checkProgress}%</span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-2 mb-4 overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-400 to-violet-500 h-full transition-all duration-150"
                style={{ width: `${checkProgress}%` }}
              />
            </div>
            <div className="bg-slate-950 rounded-xl p-4 font-mono text-[11px] h-64 overflow-y-auto space-y-1">
              {checkLogs.map((log, idx) => (
                <div key={idx} className="text-slate-300">{log}</div>
              ))}
              <div className="text-indigo-400 animate-pulse">▋</div>
            </div>
          </div>
        )}

        {checkResult === 'passed' && (
          <div className="glass-panel-emerald rounded-xl p-8 border border-emerald-500/20 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <h4 className="font-cyber text-lg font-bold text-white mb-2">COMPLIANCE SCAN PASSED</h4>
            <p className="text-sm text-slate-400 mb-6">
              All media assets meet broadcast standards and are ready for transmission.
            </p>
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                <span className="text-[10px] text-emerald-400 block">Video Codec OK</span>
              </div>
              <div className="bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                <span className="text-[10px] text-emerald-400 block">Audio Format OK</span>
              </div>
              <div className="bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                <span className="text-[10px] text-emerald-400 block">Compliance OK</span>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="flex justify-between items-center">
        <button
          onClick={() => setIngestStep(2)}
          className="cursor-pointer bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-xl text-xs font-bold flex items-center gap-2 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          BACK
        </button>
        {checkResult === 'passed' && (
          <button
            onClick={handleSubmitToRegistry}
            className="cursor-pointer bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white px-8 py-4 rounded-xl text-sm font-bold flex items-center gap-3 transition shadow-lg shadow-indigo-500/25"
          >
            <Zap className="w-5 h-5" />
            TRANSMIT FEATURE DISPATCH TO CORES
          </button>
        )}
      </div>
    </div>
  );

  const renderIngest = () => (
    <div className="space-y-6">
      {/* Progress Stepper */}
      <div className="flex items-center justify-between">
        {[1, 2, 3].map(step => (
          <div key={step} className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              ingestStep >= step 
                ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30' 
                : 'bg-slate-700 text-slate-400'
            }`}>
              {ingestStep > step ? <Check className="w-4 h-4" /> : step}
            </div>
            {step < 3 && (
              <div className={`w-24 md:w-32 h-1 ${ingestStep > step ? 'bg-gradient-to-r from-indigo-500 to-violet-500' : 'bg-slate-700'} transition-all duration-300`} />
            )}
          </div>
        ))}
      </div>
      <div className="text-center">
        <span className="text-[10px] text-slate-500 uppercase tracking-widest">
          {ingestStep === 1 && 'Content Metadata & Details'}
          {ingestStep === 2 && 'Media Asset Vault'}
          {ingestStep === 3 && 'AI Compliance Scan & Deploy'}
        </span>
      </div>

      {ingestStep === 1 && renderIngestStep1()}
      {ingestStep === 2 && renderIngestStep2()}
      {ingestStep === 3 && renderIngestStep3()}
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-cyber text-sm font-bold tracking-wider text-white">STREAM ANALYTICS</h3>
        <div className="flex items-center gap-2">
          <select className="bg-slate-900 text-white rounded-xl border border-white/10 p-2 text-xs focus:outline-none focus:border-indigo-400">
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>All time</option>
          </select>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-panel-indigo rounded-xl p-4 border border-indigo-500/20">
          <div className="flex items-center gap-3">
            <Eye className="w-8 h-8 text-indigo-400" />
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Total Views</p>
              <p className="text-xl font-black text-white">24,582</p>
            </div>
          </div>
        </div>
        <div className="glass-panel-violet rounded-xl p-4 border border-violet-500/20">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-violet-400" />
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Watch Time</p>
              <p className="text-xl font-black text-white">1,247h</p>
            </div>
          </div>
        </div>
        <div className="glass-panel-emerald rounded-xl p-4 border border-emerald-500/20">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-emerald-400" />
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Avg. Viewers</p>
              <p className="text-xl font-black text-white">342</p>
            </div>
          </div>
        </div>
      </div>

      {/* Placeholder Chart */}
      <div className="glass-panel-indigo rounded-xl p-6 border border-indigo-500/10">
        <h4 className="font-cyber text-xs font-bold tracking-wider text-slate-400 mb-4 uppercase">Viewer Trends</h4>
        <div className="h-48 flex items-end justify-between gap-2">
          {[35, 45, 30, 60, 75, 50, 65, 80, 55, 40, 70, 85, 60, 45, 55].map((h, i) => (
            <div
              key={i}
              className="flex-1 bg-gradient-to-t from-indigo-500/30 to-indigo-500 rounded-t-sm transition hover:from-indigo-400/30 hover:to-indigo-400"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-slate-500">
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
          <span>Sun</span>
        </div>
      </div>
    </div>
  );

  const renderAdmin = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-cyber text-sm font-bold tracking-wider text-white">ADMIN CONSOLE</h3>
          <p className="text-[10px] text-slate-400">Review and approve pending productions</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-violet-500/10 border border-violet-500/20 rounded-full text-[10px] text-violet-400 font-bold">
            {pendingSubmissions.length} PENDING
          </span>
          <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] text-emerald-400 font-bold">
            {liveSubmissions.length} LIVE
          </span>
        </div>
      </div>

      {pendingSubmissions.length === 0 && liveSubmissions.length === 0 ? (
        <div className="glass-panel-indigo rounded-xl p-12 border border-indigo-500/10 text-center">
          <Shield className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-sm">No productions requiring attention.</p>
        </div>
      ) : (
        <div className="glass-panel-indigo rounded-xl border border-indigo-500/10 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10 bg-slate-900/50">
                <th className="p-4 text-[10px] text-slate-400 uppercase font-bold tracking-wider">Production</th>
                <th className="p-4 text-[10px] text-slate-400 uppercase font-bold tracking-wider">Genre</th>
                <th className="p-4 text-[10px] text-slate-400 uppercase font-bold tracking-wider">Submitted By</th>
                <th className="p-4 text-[10px] text-slate-400 uppercase font-bold tracking-wider">Date</th>
                <th className="p-4 text-[10px] text-slate-400 uppercase font-bold tracking-wider">Status</th>
                <th className="p-4 text-[10px] text-slate-400 uppercase font-bold tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {pendingSubmissions.map(sub => (
                <tr key={sub.id} className="border-b border-white/5 hover:bg-white/[0.02] transition">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                        <Film className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div>
                        <p className="font-bold text-white">{sub.title}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{sub.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-300">{sub.category}</span>
                  </td>
                  <td className="p-4 text-slate-400">{sub.submittedBy}</td>
                  <td className="p-4 text-slate-400">{new Date(sub.submittedAt).toLocaleDateString()}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(sub.status)}`}>
                      {String(sub.status || 'draft').replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <button className="text-slate-500 hover:text-indigo-400 transition p-1">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleApproveSubmission(sub.id)}
                        className="cursor-pointer bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-500/20 transition flex items-center gap-1"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleTerminateSubmission(sub.id)}
                        className="cursor-pointer bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-rose-500/20 transition flex items-center gap-1"
                      >
                        <Square className="w-3.5 h-3.5" />
                        Decline
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {liveSubmissions.map(sub => (
                <tr key={sub.id} className="border-b border-white/5 hover:bg-white/[0.02] transition">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
                      </div>
                      <div>
                        <p className="font-bold text-white">{sub.title}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{sub.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-300">{sub.category}</span>
                  </td>
                  <td className="p-4 text-slate-400">{sub.submittedBy}</td>
                  <td className="p-4 text-slate-400">{new Date(sub.submittedAt).toLocaleDateString()}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(sub.status)}`}>
                      {String(sub.status || 'draft').replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <button className="text-slate-500 hover:text-indigo-400 transition p-1">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleTerminateSubmission(sub.id)}
                        className="cursor-pointer bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-rose-500/20 transition flex items-center gap-1"
                      >
                        <Square className="w-3.5 h-3.5" />
                        Terminate
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-screen bg-[#050505] text-white">
      {/* Left Sidebar */}
      <div className="w-64 border-r border-white/10 bg-white/[0.02] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Film className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-cyber text-sm font-bold text-white">HEKTIC TV</h2>
              <p className="text-[10px] text-slate-500">Production Distribution</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition ${
              activeTab === 'dashboard'
                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Production Dashboard
          </button>
          <button
            onClick={() => setActiveTab('ingest')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition ${
              activeTab === 'ingest'
                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            New Production
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition ${
              activeTab === 'analytics'
                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Analytics
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition ${
                activeTab === 'admin'
                  ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Settings className="w-4 h-4" />
              Admin Console
            </button>
          )}
        </nav>

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
              {activeTab === 'dashboard' && 'Production Dashboard'}
              {activeTab === 'ingest' && 'New Production'}
              {activeTab === 'analytics' && 'Analytics'}
              {activeTab === 'admin' && 'Admin Console'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-emerald-400 font-bold">SYSTEM ONLINE</span>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto">
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'ingest' && renderIngest()}
            {activeTab === 'analytics' && renderAnalytics()}
            {activeTab === 'admin' && isAdmin && renderAdmin()}
          </div>
        </div>
      </div>
    </div>
  );
}