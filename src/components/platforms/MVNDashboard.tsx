import { storeMediaFileInVault, resolveMediaVaultUrl, saveGlobalSubmission, getStoredGlobalSubmissions } from '../../lib/mediaVault';
import React, { useState } from 'react';
import {
  Music,
  Film,
  ChevronLeft,
  Clock,
  BarChart3,
  Lock,
  ExternalLink,
  Info,
  Play,
  X,
  CheckCircle2
} from 'lucide-react';

interface MusicVideoSubmission {
  id: string;
  songTitle: string;
  primaryArtist: string;
  genre?: string;
  duration?: string;
  status: 'draft' | 'pending_qc' | 'qc_passed' | 'syndicated' | 'flagged' | 'rejected';
  submittedAt: string;
  thumbnail?: string;
  videoUrl?: string;
}

const VERIFIED_MVN_BROADCASTS: MusicVideoSubmission[] = [
  {
    id: 'mvn-master-01',
    songTitle: 'Neon Lights (4K Broadcast Master)',
    primaryArtist: 'Starlight Synthesis',
    genre: 'Pop Hits',
    duration: '3:00',
    status: 'syndicated',
    submittedAt: '2025-02-14',
    thumbnail: 'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22800%22 height=%22450%22 viewBox=%220 0 800 450%22><defs><linearGradient id=%22g%22 x1=%220%22 y1=%220%22 x2=%221%22 y2=%221%22><stop offset=%220%%22 stop-color=%22%23050814%22/><stop offset=%22100%%22 stop-color=%22%2306b6d4%22/></linearGradient></defs><rect width=%22800%22 height=%22450%22 fill=%22url(%23g)%22/><text x=%2248%22 y=%22230%22 fill=%22%23ffffff%22 font-family=%22sans-serif%22 font-weight=%22900%22 font-size=%2226%22 letter-spacing=%224%22>MVN // MUSIC VIDEO NET</text></svg>',
    videoUrl: '/masters/innova-sovereign-ForBiggerBlazes.mp4'
  },
  {
    id: 'mvn-master-02',
    songTitle: 'City Streets (Director Cut)',
    primaryArtist: 'MC Flow',
    genre: 'Hip Hop & R&B',
    duration: '4:00',
    status: 'syndicated',
    submittedAt: '2025-02-16',
    thumbnail: 'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22800%22 height=%22450%22 viewBox=%220 0 800 450%22><defs><linearGradient id=%22g%22 x1=%220%22 y1=%220%22 x2=%221%22 y2=%221%22><stop offset=%220%%22 stop-color=%22%23050814%22/><stop offset=%22100%%22 stop-color=%22%2306b6d4%22/></linearGradient></defs><rect width=%22800%22 height=%22450%22 fill=%22url(%23g)%22/><text x=%2248%22 y=%22230%22 fill=%22%23ffffff%22 font-family=%22sans-serif%22 font-weight=%22900%22 font-size=%2226%22 letter-spacing=%224%22>MVN // MUSIC VIDEO NET</text></svg>',
    videoUrl: '/masters/innova-sovereign-ForBiggerJoy.mp4'
  },
  {
    id: 'mvn-master-03',
    songTitle: 'Thunderstruck Odyssey',
    primaryArtist: 'High Voltage',
    genre: 'Rock',
    duration: '4:10',
    status: 'qc_passed',
    submittedAt: '2025-02-18',
    thumbnail: 'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22800%22 height=%22450%22 viewBox=%220 0 800 450%22><defs><linearGradient id=%22g%22 x1=%220%22 y1=%220%22 x2=%221%22 y2=%221%22><stop offset=%220%%22 stop-color=%22%23050814%22/><stop offset=%22100%%22 stop-color=%22%2306b6d4%22/></linearGradient></defs><rect width=%22800%22 height=%22450%22 fill=%22url(%23g)%22/><text x=%2248%22 y=%22230%22 fill=%22%23ffffff%22 font-family=%22sans-serif%22 font-weight=%22900%22 font-size=%2226%22 letter-spacing=%224%22>MVN // MUSIC VIDEO NET</text></svg>',
    videoUrl: '/masters/innova-sovereign-SubaruOutbackSeeTheWorld.mp4'
  },
  {
    id: 'mvn-master-04',
    songTitle: 'Cyberpunk City',
    primaryArtist: 'Synthwave Boy',
    genre: 'Electronic / Dance',
    duration: '5:00',
    status: 'syndicated',
    submittedAt: '2025-02-19',
    thumbnail: 'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22800%22 height=%22450%22 viewBox=%220 0 800 450%22><defs><linearGradient id=%22g%22 x1=%220%22 y1=%220%22 x2=%221%22 y2=%221%22><stop offset=%220%%22 stop-color=%22%23050814%22/><stop offset=%22100%%22 stop-color=%22%2306b6d4%22/></linearGradient></defs><rect width=%22800%22 height=%22450%22 fill=%22url(%23g)%22/><text x=%2248%22 y=%22230%22 fill=%22%23ffffff%22 font-family=%22sans-serif%22 font-weight=%22900%22 font-size=%2226%22 letter-spacing=%224%22>MVN // MUSIC VIDEO NET</text></svg>',
    videoUrl: '/masters/innova-sovereign-ForBiggerEscapes.mp4'
  },
  {
    id: 'mvn-master-05',
    songTitle: 'Fiesta Solar',
    primaryArtist: 'Ritmo Caliente',
    genre: 'Latin Vibes',
    duration: '3:30',
    status: 'qc_passed',
    submittedAt: '2025-02-20',
    thumbnail: 'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22800%22 height=%22450%22 viewBox=%220 0 800 450%22><defs><linearGradient id=%22g%22 x1=%220%22 y1=%220%22 x2=%221%22 y2=%221%22><stop offset=%220%%22 stop-color=%22%23050814%22/><stop offset=%22100%%22 stop-color=%22%2306b6d4%22/></linearGradient></defs><rect width=%22800%22 height=%22450%22 fill=%22url(%23g)%22/><text x=%2248%22 y=%22230%22 fill=%22%23ffffff%22 font-family=%22sans-serif%22 font-weight=%22900%22 font-size=%2226%22 letter-spacing=%224%22>MVN // MUSIC VIDEO NET</text></svg>',
    videoUrl: '/masters/innova-sovereign-ForBiggerFun.mp4'
  },
  {
    id: 'mvn-master-06',
    songTitle: 'Midnight Sax Sessions',
    primaryArtist: 'Blue Note Collective',
    genre: 'Smooth Jazz',
    duration: '5:20',
    status: 'pending_qc',
    submittedAt: '2025-02-22',
    thumbnail: 'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22800%22 height=%22450%22 viewBox=%220 0 800 450%22><defs><linearGradient id=%22g%22 x1=%220%22 y1=%220%22 x2=%221%22 y2=%221%22><stop offset=%220%%22 stop-color=%22%23050814%22/><stop offset=%22100%%22 stop-color=%22%2306b6d4%22/></linearGradient></defs><rect width=%22800%22 height=%22450%22 fill=%22url(%23g)%22/><text x=%2248%22 y=%22230%22 fill=%22%23ffffff%22 font-family=%22sans-serif%22 font-weight=%22900%22 font-size=%2226%22 letter-spacing=%224%22>MVN // MUSIC VIDEO NET</text></svg>',
    videoUrl: '/masters/innova-sovereign-WeAreGoingOnBullrun.mp4'
  }
];

type TabType = 'dashboard' | 'vault';

interface MVNDashboardProps {
  userNode: any;
  onBack: () => void;
  submissions: any[];
  setSubmissions: any;
}

export default function MVNDashboard({ userNode, onBack, submissions, setSubmissions }: MVNDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [showSubmitInfo, setShowSubmitInfo] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<MusicVideoSubmission | null>(null);
  const [resolvedVideoUrl, setResolvedVideoUrl] = useState<string>('');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadArtist, setUploadArtist] = useState('');
  const [uploadGenre, setUploadGenre] = useState('Pop Hits');
  const [uploadVideoFile, setUploadVideoFile] = useState<File | null>(null);
  const [uploadVideoUrlInput, setUploadVideoUrlInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState('');

  React.useEffect(() => {
    if (previewVideo?.videoUrl) {
      resolveMediaVaultUrl(previewVideo.videoUrl).then(url => setResolvedVideoUrl(url || previewVideo.videoUrl || ''));
    } else {
      setResolvedVideoUrl('');
    }
  }, [previewVideo]);

  const handleMvnUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim() || !uploadArtist.trim()) return;
    setIsUploading(true);
    try {
      let finalVideoUrl = uploadVideoUrlInput.trim();
      if (uploadVideoFile) {
        finalVideoUrl = await storeMediaFileInVault(uploadVideoFile);
      }
      const newId = `MVN-${Date.now().toString().slice(-6)}`;
      const newItem: any = {
        id: newId,
        tenant: 'MVN',
        type: 'video',
        title: uploadTitle.trim(),
        songTitle: uploadTitle.trim(),
        creator: uploadArtist.trim(),
        primaryArtist: uploadArtist.trim(),
        genre: uploadGenre,
        duration: '3:45',
        status: 'pending_qc',
        submittedAt: new Date().toISOString().split('T')[0],
        thumbnail: 'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22800%22 height=%22450%22 viewBox=%220 0 800 450%22><defs><linearGradient id=%22g%22 x1=%220%22 y1=%220%22 x2=%221%22 y2=%221%22><stop offset=%220%%22 stop-color=%22%23050814%22/><stop offset=%22100%%22 stop-color=%22%2306b6d4%22/></linearGradient></defs><rect width=%22800%22 height=%22450%22 fill=%22url(%23g)%22/><text x=%2248%22 y=%22230%22 fill=%22%23ffffff%22 font-family=%22sans-serif%22 font-weight=%22900%22 font-size=%2226%22 letter-spacing=%224%22>MVN // MASTER UPLOAD</text></svg>',
        videoUrl: finalVideoUrl || '/masters/innova-sovereign-ForBiggerBlazes.mp4'
      };
      saveGlobalSubmission(newItem);
      if (typeof setSubmissions === 'function') {
        setSubmissions((prev: any[]) => [newItem, ...(Array.isArray(prev) ? prev : [])]);
      }
      setUploadTitle('');
      setUploadArtist('');
      setUploadVideoFile(null);
      setUploadVideoUrlInput('');
      setUploadSuccessMsg('Uploaded to @TICKER Command Deck for approval! Once approved, it broadcasts live on MVN TV & Web.');
    } finally {
      setIsUploading(false);
    }
  };
  const storedMvn = getStoredGlobalSubmissions().filter(x => x.tenant === 'MVN').map(x => ({
    id: x.id,
    songTitle: x.title,
    primaryArtist: x.creator,
    genre: x.genre || 'Music Video',
    duration: '3:45',
    status: (x.status === 'approved' ? 'syndicated' : x.status) as any,
    submittedAt: x.submittedAt,
    thumbnail: x.thumbnail,
    videoUrl: x.videoUrl
  }));
  const displaySubmissions: MusicVideoSubmission[] = [...storedMvn, ...VERIFIED_MVN_BROADCASTS];

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Syndicated Live</p>
              <p className="text-2xl font-black text-emerald-400 mt-1">
                {displaySubmissions.filter(s => s.status === 'syndicated').length}
              </p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
        </div>
        <div className="glass-panel-amber rounded-xl p-4 border border-amber-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">QC Passed</p>
              <p className="text-2xl font-black text-cyan-400 mt-1">
                {displaySubmissions.filter(s => s.status === 'qc_passed').length}
              </p>
            </div>
            <Music className="w-8 h-8 text-cyan-400" />
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
          <p className="text-[10px] text-slate-400">Your submitted & syndicated MVN master music videos</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {displaySubmissions.map((sub: any) => (
          <div
            key={sub.id}
            onClick={() => setPreviewVideo(sub)}
            className="group cursor-pointer relative rounded-xl overflow-hidden bg-slate-900 border border-white/10 hover:border-amber-500/50 transition"
          >
            <div className="aspect-video bg-slate-800 relative">
              <img src={sub.thumbnail} alt={sub.songTitle || sub.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center shadow-lg">
                  <Play className="w-5 h-5 text-black fill-black ml-0.5" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="font-bold text-white text-sm truncate">{sub.songTitle || sub.title}</p>
                <p className="text-[10px] text-slate-400">{sub.primaryArtist || sub.creator}</p>
              </div>
              <div className="absolute top-2 right-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getStatusColor(sub.status)}`}>
                  {String(sub.status || 'draft').replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
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
          <button onClick={() => setShowSubmitInfo(true)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition text-slate-400 hover:bg-white/5`}><Info className="w-4 h-4" /> Submit Music</button>
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
            {activeTab === 'vault' && renderVault()}
          </div>
        </div>
      </div>

      {/* Inline Video Preview Modal */}
      {previewVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-[#0a0a0f] border border-amber-500/30 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-white">{previewVideo.songTitle || (previewVideo as any).title}</h3>
                <p className="text-xs text-amber-400">
                  {previewVideo.primaryArtist || (previewVideo as any).creator}
                  {previewVideo.genre ? ` • ${previewVideo.genre}` : ''}
                </p>
              </div>
              <button
                onClick={() => setPreviewVideo(null)}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="aspect-video bg-black relative">
              <video
                src={previewVideo.videoUrl || '/masters/innova-sovereign-ForBiggerBlazes.mp4'}
                poster={previewVideo.thumbnail}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              />
            </div>
            <div className="p-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
              <span>Submitted: {previewVideo.submittedAt || 'Verified Master'}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getStatusColor(previewVideo.status)}`}>
                {String(previewVideo.status || 'syndicated').replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Submit Music Informational Modal */}
      {showSubmitInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="relative w-full max-w-lg rounded-2xl border border-cyan-500/30 bg-[#0a0d14] p-6 shadow-2xl">
            <button
              onClick={() => { setShowSubmitInfo(false); setUploadSuccessMsg(''); }}
              className="absolute right-4 top-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                <Film className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">UPLOAD MUSIC VIDEO MASTER</h3>
                <p className="text-xs text-slate-400">Direct ingest to MVN Registry • Goes live on TV upon @TICKER approval</p>
              </div>
            </div>

            <form onSubmit={handleMvnUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Song Title *</label>
                <input
                  type="text"
                  required
                  value={uploadTitle}
                  onChange={e => setUploadTitle(e.target.value)}
                  placeholder="e.g., Sovereign Horizon (4K Master)"
                  className="w-full rounded-xl bg-black/50 border border-white/10 px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Primary Artist *</label>
                  <input
                    type="text"
                    required
                    value={uploadArtist}
                    onChange={e => setUploadArtist(e.target.value)}
                    placeholder={userNode?.handle || '@ARTIST'}
                    className="w-full rounded-xl bg-black/50 border border-white/10 px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Genre</label>
                  <select
                    value={uploadGenre}
                    onChange={e => setUploadGenre(e.target.value)}
                    className="w-full rounded-xl bg-black/50 border border-white/10 px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-500"
                  >
                    <option value="Pop Hits">Pop Hits</option>
                    <option value="Hip Hop & R&B">Hip Hop & R&B</option>
                    <option value="Electronic / Dance">Electronic / Dance</option>
                    <option value="Rock">Rock</option>
                    <option value="Latin Vibes">Latin Vibes</option>
                    <option value="Smooth Jazz">Smooth Jazz</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Select Video Master File (.mp4 / .mov / .webm)</label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={e => setUploadVideoFile(e.target.files?.[0] || null)}
                  className="w-full rounded-xl bg-black/50 border border-white/10 px-3 py-2 text-xs text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-500/20 file:px-3 file:py-1 file:text-xs file:font-bold file:text-cyan-300"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Or Direct Stream URL (Optional)</label>
                <input
                  type="text"
                  value={uploadVideoUrlInput}
                  onChange={e => setUploadVideoUrlInput(e.target.value)}
                  placeholder="https://... or leave blank if uploading file above"
                  className="w-full rounded-xl bg-black/50 border border-white/10 px-3.5 py-2 text-xs text-white font-mono outline-none focus:border-cyan-500"
                />
              </div>

              {uploadSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300">
                  {uploadSuccessMsg}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubmitInfo(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-xs font-bold text-slate-300 hover:bg-white/10 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-xs font-black text-white uppercase tracking-wider cursor-pointer"
                >
                  {isUploading ? 'Uploading Master...' : 'Submit for @TICKER Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}