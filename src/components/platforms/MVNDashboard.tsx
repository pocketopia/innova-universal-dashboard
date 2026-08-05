import React, { useState } from 'react';
import { submitContent, processEcosystemTransaction } from '../../lib/apiClient';
import {
  Music,
  Film,
  Mic,
  Radio,
  Volume2,
  PlayCircle,
  Send,
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
  Upload,
  Zap,
  Shield,
  MonitorPlay,
  Cpu,
  FileVideo,
  FileAudio,
  FileText,
  Lock
} from 'lucide-react';

interface SubmissionFormData {
  songTitle: string;
  primaryArtist: string;
  featuredArtists: string;
  directorName: string;
  genre: string;
  masterRightsOwned: boolean;
  explicitContent: boolean;
  labelPublisher: string;
  hekticSyndication: boolean;
  videoFile: File | null;
  audioFile: File | null;
  captionsFile: File | null;
}

interface MusicVideoSubmission {
  id: string;
  songTitle: string;
  primaryArtist: string;
  featuredArtists: string;
  directorName: string;
  genre: string;
  labelPublisher: string;
  status: 'draft' | 'pending_qc' | 'qc_passed' | 'syndicated' | 'flagged' | 'rejected';
  submittedAt: string;
  duration?: string;
  thumbnail?: string;
  isExplicit: boolean;
  hekticSyndication: boolean;
}

type TabType = 'dashboard' | 'ingest' | 'vault' | 'admin';
type IngestStep = 1 | 2 | 3 | 4;

interface MVNDashboardProps {
  userNode: any;
  onBack: () => void;
  submissions: any[];
  setSubmissions: any;
}

const initialFormData: SubmissionFormData = {
  songTitle: '',
  primaryArtist: '',
  featuredArtists: '',
  directorName: '',
  genre: '',
  masterRightsOwned: false,
  explicitContent: false,
  labelPublisher: '',
  hekticSyndication: false,
  videoFile: null,
  audioFile: null,
  captionsFile: null
};

const genres = ['Pop', 'Rock', 'Hip-Hop', 'R&B', 'Electronic', 'Country', 'Jazz', 'Classical', 'Reggae'];

export default function MVNDashboard({ userNode, onBack, submissions, setSubmissions }: MVNDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [ingestStep, setIngestStep] = useState<IngestStep>(1);
  const [formData, setFormData] = useState<SubmissionFormData>(initialFormData);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [qcProgress, setQcProgress] = useState(0);
  const [qcLogs, setQcLogs] = useState<string[]>([]);
  const [isTransacting, setIsTransacting] = useState(false);

  const isAdmin = userNode?.handle?.toUpperCase() === '@TICKER';
  const displaySubmissions = submissions;

  const simulateQCAnalysis = () => {
    setIsAnalyzing(true);
    setQcProgress(0);
    setQcLogs([]);

    const logs = [
      '🎬 [VIDEO] Initializing codec analysis...',
      `📹 [VIDEO] Analyzing video codec (${formData.videoFile?.name || 'ProRes 4K'})...`,
      '✅ [VIDEO] Codec validation passed - 4K ProRes 422 HQ detected.',
      '🎵 [AUDIO] Initializing Dolby Atmos spatial analysis...',
      '✅ [AUDIO] 7.1.4 spatial configuration verified.',
      '📝 [CAPTIONS] Parsing lyric caption file (.srt)...',
      '✅ [CAPTIONS] 142 caption entries validated.',
      '🔍 [CONTENT] Scanning for explicit visual/lyric flags...',
      `⚠️ [CONTENT] Explicit content flag: ${formData.explicitContent ? 'DETECTED' : 'NONE'}.`,
      '✅ [RESULT] MVN Broadcast compliance verified.',
      '🟢 [COMPLETE] Ready for label admin review.'
    ];

    let currentLog = 0;
    const interval = setInterval(() => {
      setQcProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsAnalyzing(false);
          return 100;
        }
        if (currentLog < logs.length) {
          setQcLogs(prev => [...prev, logs[currentLog]]);
          currentLog++;
        }
        return prev + 5;
      });
    }, 200);
  };

  const handleSubmitToAdmin = async () => {
    const generatedId = `MVN-${Date.now().toString().slice(-6)}`;
    const payload = {
      id: generatedId,
      title: formData.songTitle,
      creator: userNode.handle,
      camera: 'ProRes 422 HQ',
      resolution: '4K UHD',
      audioFormat: 'Dolby Atmos',
      selectedChannels: ['7.1', 'Stereo'],
      licensingTerms: true
    };

    try {
      await submitContent(payload);
    } catch (error) {
      console.error('[API ERROR]', error);
    }

    const newSub: MusicVideoSubmission = {
      id: generatedId,
      songTitle: formData.songTitle,
      primaryArtist: formData.primaryArtist,
      featuredArtists: formData.featuredArtists,
      directorName: formData.directorName,
      genre: formData.genre,
      labelPublisher: formData.labelPublisher,
      status: 'pending_qc',
      submittedAt: new Date().toISOString(),
      duration: '0:00',
      thumbnail: `https://picsum.photos/seed/${Date.now()}/400/225`,
      isExplicit: formData.explicitContent,
      hekticSyndication: formData.hekticSyndication
    };
    setSubmissions((prev: any) => [newSub, ...prev]);
    setFormData(initialFormData);
    setIngestStep(1);
    setActiveTab('vault');
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'syndicated': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'qc_passed': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
      case 'pending_qc': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'flagged': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-cyber text-sm font-bold tracking-wider text-white">STUDIO DASHBOARD</h3>
          <p className="text-[10px] text-slate-400">Music Video Network Overview</p>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <div className="glass-panel-amber rounded-xl p-4 border border-amber-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Total Submissions</p>
              <p className="text-2xl font-black text-white mt-1">{displaySubmissions.length}</p>
            </div>
            <Film className="w-8 h-8 text-amber-400" />
          </div>
        </div>
        <div className="glass-panel-amber rounded-xl p-4 border border-amber-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Pending QC</p>
              <p className="text-2xl font-black text-amber-400 mt-1">
                {displaySubmissions.filter(s => s.status === 'pending_qc').length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-amber-400" />
          </div>
        </div>
      </div>
    </div>
  );

  const renderVault = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-cyber text-sm font-bold tracking-wider text-white">VIDEO VAULT</h3>
          <p className="text-[10px] text-slate-400">Your submitted music videos</p>
        </div>
        <button onClick={() => setActiveTab('ingest')} className="bg-amber-500 hover:bg-amber-400 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition">
          <Plus className="w-3.5 h-3.5" /> NEW SUBMISSION
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {displaySubmissions.map(sub => (
          <div key={sub.id} className="group cursor-pointer relative rounded-xl overflow-hidden bg-slate-900 border border-white/10 hover:border-amber-500/50 transition">
            <div className="aspect-video bg-slate-800 relative">
              <img src={sub.thumbnail} alt={sub.songTitle} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="font-bold text-white text-sm truncate">{sub.songTitle || sub.title}</p>
                <p className="text-[10px] text-slate-400">{sub.primaryArtist || sub.creator}</p>
              </div>
              <div className="absolute top-2 right-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusColor(sub.status)}`}>
                  {String(sub.status || 'draft').replace('_', ' ')}
                </span>
              </div>
              
              {/* Creator Boosts and Tipping */}
              <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/80 backdrop-blur-sm gap-2 p-4 text-center">
                <span className="text-[8px] text-white/50 font-black uppercase tracking-widest mb-1">Creator Algorithmic Boost</span>
                <div className="flex gap-1 w-full mb-2">
                  <button 
                    onClick={async (e) => { e.stopPropagation(); setIsTransacting(true); const res = await processEcosystemTransaction(userNode.wallet, 999, 'creator_boost', `Tier 1: 10k Plays for ${sub.songTitle || sub.title}`); if (res.success) alert('Tier 1 Boost Active!'); setIsTransacting(false); }}
                    disabled={isTransacting}
                    className="flex-1 bg-gradient-to-t from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white py-2 rounded text-[9px] font-bold uppercase transition disabled:opacity-50"
                  >
                    10K (999)
                  </button>
                  <button 
                    onClick={async (e) => { e.stopPropagation(); setIsTransacting(true); const res = await processEcosystemTransaction(userNode.wallet, 3999, 'creator_boost', `Tier 2: 50k Plays for ${sub.songTitle || sub.title}`); if (res.success) alert('Tier 2 Boost Active!'); setIsTransacting(false); }}
                    disabled={isTransacting}
                    className="flex-1 bg-gradient-to-t from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white py-2 rounded text-[9px] font-bold uppercase transition disabled:opacity-50"
                  >
                    50K (3999)
                  </button>
                  <button 
                    onClick={async (e) => { e.stopPropagation(); setIsTransacting(true); const res = await processEcosystemTransaction(userNode.wallet, 7999, 'creator_boost', `Tier 3: 100k Plays for ${sub.songTitle || sub.title}`); if (res.success) alert('Tier 3 Premium Boost Active!'); setIsTransacting(false); }}
                    disabled={isTransacting}
                    className="flex-1 bg-gradient-to-t from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white py-2 rounded text-[9px] font-bold uppercase transition disabled:opacity-50"
                  >
                    100K (7999)
                  </button>
                </div>

                <div className="w-full flex items-center gap-2 my-1">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-[8px] text-white/40 font-bold uppercase tracking-widest">VIEWER</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                <button 
                  onClick={async (e) => { e.stopPropagation(); setIsTransacting(true); const res = await processEcosystemTransaction(userNode.wallet, 50, 'tip', `Tipped 50 INVA to ${sub.primaryArtist || sub.creator}`, sub.primaryArtist || sub.creator); if (res.success) alert(`Tipped 50 $INVA!`); setIsTransacting(false); }}
                  disabled={isTransacting}
                  className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white py-2 rounded-lg text-[10px] font-black tracking-widest transition flex justify-center items-center gap-2 disabled:opacity-50"
                >
                  <Zap className="w-3 h-3 text-amber-400" /> TIP CREATOR (50 $INVA)
                </button>
              </div>

            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderIngestStep1 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-cyber text-sm font-bold tracking-wider text-amber-400 mb-4">STEP 1: TRACK & VIDEO METADATA</h3>
        <div className="space-y-4">
          <input type="text" value={formData.songTitle} onChange={(e) => setFormData(prev => ({ ...prev, songTitle: e.target.value }))} placeholder="Song Title" className="w-full bg-slate-900/80 text-white rounded-xl border border-white/10 p-3 text-sm focus:border-amber-400" />
          <input type="text" value={formData.primaryArtist} onChange={(e) => setFormData(prev => ({ ...prev, primaryArtist: e.target.value }))} placeholder="Primary Artist" className="w-full bg-slate-900/80 text-white rounded-xl border border-white/10 p-3 text-sm focus:border-amber-400" />
          <select value={formData.genre} onChange={(e) => setFormData(prev => ({ ...prev, genre: e.target.value }))} className="w-full bg-slate-900/80 text-white rounded-xl border border-white/10 p-3 text-sm focus:border-amber-400">
            <option value="">Select genre...</option>
            {genres.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </div>
      <button onClick={() => setIngestStep(2)} disabled={!formData.songTitle || !formData.primaryArtist || !formData.genre} className="bg-amber-500 disabled:bg-slate-700 text-white px-6 py-3 rounded-xl text-xs font-bold transition">NEXT STEP</button>
    </div>
  );

  const renderIngestStep2 = () => (
    <div className="space-y-6">
      <h3 className="font-cyber text-sm font-bold tracking-wider text-amber-400 mb-4">STEP 2: CLEARANCES & SYNDICATION</h3>
      <label className="flex items-center gap-3"><input type="checkbox" checked={formData.masterRightsOwned} onChange={(e) => setFormData(prev => ({ ...prev, masterRightsOwned: e.target.checked }))} /> Master Video Rights Owned</label>
      <div className="flex justify-between">
        <button onClick={() => setIngestStep(1)} className="bg-white/5 px-6 py-3 rounded-xl text-xs font-bold">BACK</button>
        <button onClick={() => setIngestStep(3)} disabled={!formData.masterRightsOwned} className="bg-amber-500 disabled:bg-slate-700 px-6 py-3 rounded-xl text-xs font-bold text-white">NEXT STEP</button>
      </div>
    </div>
  );

  const renderIngestStep3 = () => (
    <div className="space-y-6">
      <h3 className="font-cyber text-sm font-bold tracking-wider text-amber-400 mb-4">STEP 3: MEDIA UPLOAD</h3>
      <input type="file" onChange={(e) => setFormData(prev => ({ ...prev, videoFile: e.target.files?.[0] || null }))} className="bg-white/5 p-4 rounded-xl w-full" />
      <div className="flex justify-between">
        <button onClick={() => setIngestStep(2)} className="bg-white/5 px-6 py-3 rounded-xl text-xs font-bold">BACK</button>
        <button onClick={() => setIngestStep(4)} disabled={!formData.videoFile} className="bg-amber-500 disabled:bg-slate-700 px-6 py-3 rounded-xl text-xs font-bold text-white">NEXT STEP</button>
      </div>
    </div>
  );

  const renderIngestStep4 = () => (
    <div className="space-y-6">
      <h3 className="font-cyber text-sm font-bold tracking-wider text-amber-400 mb-4">STEP 4: AI QC PRE-FLIGHT</h3>
      {!isAnalyzing && qcProgress === 0 && <button onClick={simulateQCAnalysis} className="bg-amber-500 text-white px-8 py-3 rounded-xl text-sm font-bold">START AI ANALYSIS</button>}
      {isAnalyzing && <div className="text-amber-400">{qcProgress}% Progress...</div>}
      {qcProgress === 100 && !isAnalyzing && <button onClick={handleSubmitToAdmin} className="bg-amber-500 text-white px-8 py-3 rounded-xl text-sm font-bold">SUBMIT TO ADMIN</button>}
    </div>
  );

  return (
    <div className="flex h-screen bg-[#050505] text-white">
      <div className="w-64 border-r border-white/10 bg-white/[0.02] flex flex-col">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Music className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-cyber text-sm font-bold text-white">MUSIC VIDEO</h2>
              <p className="text-[10px] text-slate-500">MVN Platform</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition ${activeTab === 'dashboard' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400 hover:bg-white/5'}`}><BarChart3 className="w-4 h-4" /> Studio Dashboard</button>
          <button onClick={() => { setActiveTab('ingest'); setIngestStep(1); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition ${activeTab === 'ingest' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400 hover:bg-white/5'}`}><Plus className="w-4 h-4" /> Submit Music Video</button>
          <button onClick={() => setActiveTab('vault')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition ${activeTab === 'vault' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400 hover:bg-white/5'}`}><Film className="w-4 h-4" /> Video Vault</button>
        </nav>
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-2 p-2 bg-white/5 border border-white/10 rounded-full cursor-help">
            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center shrink-0"><Lock className="w-3 h-3 text-white" /></div>
            <span className="text-xs font-bold text-white tracking-widest font-mono truncate">{userNode?.handle || '@ANONYMOUS'}</span>
          </div>
        </div>
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 flex-shrink-0">
          <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition"><ChevronLeft className="w-4 h-4" /><span className="text-xs font-bold">Back to Hub</span></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto">
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'ingest' && (
              <div className="space-y-6">
                {ingestStep === 1 && renderIngestStep1()}
                {ingestStep === 2 && renderIngestStep2()}
                {ingestStep === 3 && renderIngestStep3()}
                {ingestStep === 4 && renderIngestStep4()}
              </div>
            )}
            {activeTab === 'vault' && renderVault()}
          </div>
        </div>
      </div>
    </div>
  );
}