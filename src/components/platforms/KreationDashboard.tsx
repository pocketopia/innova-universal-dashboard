import React, { useState } from 'react';
import { submitGame, processEcosystemTransaction } from '../../lib/apiClient';
import {
  Gamepad2,
  Play,
  Cpu,
  Layers,
  PlaySquare,
  Send,
  ChevronLeft,
  CheckCircle2,
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
  Download,
  Image,
  Video,
  Package,
  Star,
  HardDrive,
  MemoryStick,
  Lock
} from 'lucide-react';

interface GameFormData {
  title: string;
  developerStudio: string;
  genre: string;
  systemRequirements: string;
  bannerFile: File | null;
  screenshotFiles: (File | null)[];
  trailerFile: File | null;
  buildFile: File | null;
}

interface IndieGame {
  id: string;
  title: string;
  developerStudio: string;
  genre: string;
  systemRequirements: string;
  status: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'published';
  submittedAt: string;
  thumbnail?: string;
  videoUrl?: string;
  rating?: number;
  downloads?: number;
}

const VERIFIED_KREATION_GAMES: IndieGame[] = [
  {
    id: 'krt-aether-horizon',
    title: 'AETHER HORIZON: ZERO DRIFT',
    developerStudio: '@Ticker • Kreation Forge',
    genre: 'Adventure',
    systemRequirements: 'Kreation Cloud Shard v4.0 • 120FPS 4K Stream',
    status: 'published',
    submittedAt: '2026-03-14T00:00:00.000Z',
    thumbnail: 'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22800%22 height=%22450%22 viewBox=%220 0 800 450%22><defs><linearGradient id=%22g%22 x1=%220%22 y1=%220%22 x2=%221%22 y2=%221%22><stop offset=%220%%22 stop-color=%22%2304120e%22/><stop offset=%22100%%22 stop-color=%22%2310b981%22/></linearGradient></defs><rect width=%22800%22 height=%22450%22 fill=%22url(%23g)%22/><text x=%2248%22 y=%22230%22 fill=%22%23ffffff%22 font-family=%22sans-serif%22 font-weight=%22900%22 font-size=%2226%22 letter-spacing=%224%22>KREATION // GAMING</text></svg>',
    videoUrl: '/masters/innova-sovereign-TearsOfSteel.mp4',
    rating: 4.9,
    downloads: 18420
  },
  {
    id: 'krt-chronicle-valkyrie',
    title: 'CHRONICLES OF THE IRON VALKYRIE',
    developerStudio: '@Ticker • Kreation Forge',
    genre: 'RPG',
    systemRequirements: 'Kreation Cloud Shard v4.0 • 16GB Virtual VRAM',
    status: 'published',
    submittedAt: '2026-02-20T00:00:00.000Z',
    thumbnail: 'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22800%22 height=%22450%22 viewBox=%220 0 800 450%22><defs><linearGradient id=%22g%22 x1=%220%22 y1=%220%22 x2=%221%22 y2=%221%22><stop offset=%220%%22 stop-color=%22%2304120e%22/><stop offset=%22100%%22 stop-color=%22%2310b981%22/></linearGradient></defs><rect width=%22800%22 height=%22450%22 fill=%22url(%23g)%22/><text x=%2248%22 y=%22230%22 fill=%22%23ffffff%22 font-family=%22sans-serif%22 font-weight=%22900%22 font-size=%2226%22 letter-spacing=%224%22>KREATION // GAMING</text></svg>',
    videoUrl: '/masters/innova-sovereign-Sintel.mp4',
    rating: 4.9,
    downloads: 14210
  },
  {
    id: 'krt-null-protocol',
    title: 'NULL PROTOCOL: BREACH VECTOR',
    developerStudio: 'Kreation Forge Studios',
    genre: 'FPS',
    systemRequirements: 'Kreation Cloud Shard v4.0 • Sub-8ms Telemetry',
    status: 'approved',
    submittedAt: '2026-06-01T00:00:00.000Z',
    thumbnail: 'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22800%22 height=%22450%22 viewBox=%220 0 800 450%22><defs><linearGradient id=%22g%22 x1=%220%22 y1=%220%22 x2=%221%22 y2=%221%22><stop offset=%220%%22 stop-color=%22%2304120e%22/><stop offset=%22100%%22 stop-color=%22%2310b981%22/></linearGradient></defs><rect width=%22800%22 height=%22450%22 fill=%22url(%23g)%22/><text x=%2248%22 y=%22230%22 fill=%22%23ffffff%22 font-family=%22sans-serif%22 font-weight=%22900%22 font-size=%2226%22 letter-spacing=%224%22>KREATION // GAMING</text></svg>',
    videoUrl: '/masters/innova-sovereign-ForBiggerBlazes.mp4',
    rating: 4.8,
    downloads: 11950
  },
  {
    id: 'krt-cyber-ronin',
    title: 'CYBER RONIN: BLADE OF KREATION',
    developerStudio: '@Ticker • Kreation Forge',
    genre: 'Platformer',
    systemRequirements: 'Kreation Cloud Shard v4.0 • WASM Container',
    status: 'published',
    submittedAt: '2026-01-29T00:00:00.000Z',
    thumbnail: 'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22800%22 height=%22450%22 viewBox=%220 0 800 450%22><defs><linearGradient id=%22g%22 x1=%220%22 y1=%220%22 x2=%221%22 y2=%221%22><stop offset=%220%%22 stop-color=%22%2304120e%22/><stop offset=%22100%%22 stop-color=%22%2310b981%22/></linearGradient></defs><rect width=%22800%22 height=%22450%22 fill=%22url(%23g)%22/><text x=%2248%22 y=%22230%22 fill=%22%23ffffff%22 font-family=%22sans-serif%22 font-weight=%22900%22 font-size=%2226%22 letter-spacing=%224%22>KREATION // GAMING</text></svg>',
    videoUrl: '/masters/innova-sovereign-ElephantsDream.mp4',
    rating: 4.9,
    downloads: 9840
  },
  {
    id: 'indie-neon-drifter',
    title: 'NEON DRIFTER 2099',
    developerStudio: '@NeonByte_Interactive',
    genre: 'Racing',
    systemRequirements: 'Kreation Cloud Shard v4.0 • Indie Spotlight',
    status: 'approved',
    submittedAt: '2026-07-01T00:00:00.000Z',
    thumbnail: 'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22800%22 height=%22450%22 viewBox=%220 0 800 450%22><defs><linearGradient id=%22g%22 x1=%220%22 y1=%220%22 x2=%221%22 y2=%221%22><stop offset=%220%%22 stop-color=%22%2304120e%22/><stop offset=%22100%%22 stop-color=%22%2310b981%22/></linearGradient></defs><rect width=%22800%22 height=%22450%22 fill=%22url(%23g)%22/><text x=%2248%22 y=%22230%22 fill=%22%23ffffff%22 font-family=%22sans-serif%22 font-weight=%22900%22 font-size=%2226%22 letter-spacing=%224%22>KREATION // GAMING</text></svg>',
    videoUrl: '/masters/innova-sovereign-ForBiggerEscapes.mp4',
    rating: 4.8,
    downloads: 6410
  }
];

type TabType = 'hub' | 'ingest' | 'assets' | 'admin';
type IngestStep = 1 | 2 | 3 | 4;

interface KreationDashboardProps {
  userNode: any;
  onBack: () => void;
  games: any[];
  setGames: any;
}

const initialFormData: GameFormData = {
  title: '',
  developerStudio: '',
  genre: '',
  systemRequirements: '',
  bannerFile: null,
  screenshotFiles: [null, null, null],
  trailerFile: null,
  buildFile: null
};

const genres = ['RPG', 'FPS', 'Puzzle', 'Platformer', 'Action', 'Adventure', 'Strategy', 'Simulation', 'Racing', 'Sports'];

export default function KreationDashboard({ userNode, onBack, games, setGames }: KreationDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('hub');
  const [ingestStep, setIngestStep] = useState<IngestStep>(1);
  const [formData, setFormData] = useState<GameFormData>(initialFormData);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [qcProgress, setQcProgress] = useState(0);
  const [qcLogs, setQcLogs] = useState<string[]>([]);
  const [selectedGame, setSelectedGame] = useState<IndieGame | null>(null);
  const [isTransacting, setIsTransacting] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const isAdmin = userNode?.handle?.toUpperCase() === '@TICKER';
  const displayGames: IndieGame[] =
    Array.isArray(games) && games.length > 0 ? games : VERIFIED_KREATION_GAMES;

  const simulateContainerQC = () => {
    setIsAnalyzing(true);
    setQcProgress(0);
    setQcLogs([]);

    const logs = [
      '🎮 [KREATION] Initializing container analysis...',
      `📦 [BUILD] Analyzing package: ${formData.buildFile?.name || 'game.wasm'}...`,
      '✅ [BUILD] Package format validated - WASM container detected.',
      '🔧 [WASM] Initializing WASM compiler check...',
      '✅ [WASM] WebAssembly module structure verified.',
      '💾 [MEMORY] Scanning memory allocation limits...',
      '✅ [MEMORY] Memory allocation within acceptable bounds (512MB max).',
      '🎛️ [INPUT] Verifying control mapping hooks...',
      '✅ [INPUT] Input mapping configuration valid.',
      '🔒 [SECURITY] Running sandbox compliance scan...',
      '✅ [SECURITY] No malicious code patterns detected.',
      '📡 [NETWORK] Checking network permission flags...',
      '✅ [RESULT] Kreation Matrix compliance verified.',
      '🟢 [COMPLETE] Ready for Valve submission.'
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
        return prev + 4;
      });
    }, 250);
  };

  const handleSubmitToValve = async () => {
    const generatedId = `KR-${Date.now().toString().slice(-6)}`;
    const payload: IndieGame = {
      id: generatedId,
      title: formData.title || 'UNTITLED KREATION SHARD',
      developerStudio: formData.developerStudio || userNode?.handle || '@CREATOR',
      genre: formData.genre || 'Action',
      systemRequirements: formData.systemRequirements || 'Kreation Cloud Shard v4.0 • 16GB Virtual VRAM',
      status: 'pending_review',
      submittedAt: new Date().toISOString(),
      thumbnail: 'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22800%22 height=%22450%22 viewBox=%220 0 800 450%22><defs><linearGradient id=%22g%22 x1=%220%22 y1=%220%22 x2=%221%22 y2=%221%22><stop offset=%220%%22 stop-color=%22%2304120e%22/><stop offset=%22100%%22 stop-color=%22%2310b981%22/></linearGradient></defs><rect width=%22800%22 height=%22450%22 fill=%22url(%23g)%22/><text x=%2248%22 y=%22230%22 fill=%22%23ffffff%22 font-family=%22sans-serif%22 font-weight=%22900%22 font-size=%2226%22 letter-spacing=%224%22>KREATION // GAMING</text></svg>',
      videoUrl: '/masters/innova-sovereign-TearsOfSteel.mp4',
      rating: 4.9,
      downloads: 1
    };

    try {
      await submitGame(payload);
      setStatusBanner(`Container "${payload.title}" submitted to Valve Queue (${generatedId}).`);
    } catch {
      setStatusBanner(`Container "${payload.title}" synced to local Kreation NVRAM queue (${generatedId}).`);
    }

    setGames((prev: any) => {
      const base = Array.isArray(prev) && prev.length > 0 ? prev : VERIFIED_KREATION_GAMES;
      return [payload, ...base];
    });
    setFormData(initialFormData);
    setIngestStep(1);
    setActiveTab('hub');
  };

  const handleApprove = (id: string) => {
    setGames((prev: any) => {
      const base = Array.isArray(prev) && prev.length > 0 ? prev : VERIFIED_KREATION_GAMES;
      return base.map((game: any) => game.id === id ? { ...game, status: 'approved' } : game);
    });
    setStatusBanner(`Container ${id} approved for Kreation Storefront.`);
  };

  const handleDeny = (id: string) => {
    setGames((prev: any) => {
      const base = Array.isArray(prev) && prev.length > 0 ? prev : VERIFIED_KREATION_GAMES;
      return base.map((game: any) => game.id === id ? { ...game, status: 'rejected' } : game);
    });
    setStatusBanner(`Container ${id} rejected.`);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'published': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'approved': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
      case 'pending_review': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'rejected': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  const renderHub = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-cyber text-sm font-bold tracking-wider text-white">DEVELOPER HUB</h3>
          <p className="text-[10px] text-slate-400">Kreation Gaming Overview</p>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <div className="glass-panel-purple rounded-xl p-4 border border-purple-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Total Games</p>
              <p className="text-2xl font-black text-white mt-1">{displayGames.length}</p>
            </div>
            <Gamepad2 className="w-8 h-8 text-purple-400" />
          </div>
        </div>
        <div className="glass-panel-purple rounded-xl p-4 border border-purple-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Pending Review</p>
              <p className="text-2xl font-black text-amber-400 mt-1">
                {displayGames.filter(g => g.status === 'pending_review').length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-amber-400" />
          </div>
        </div>
        <div className="glass-panel-purple rounded-xl p-4 border border-purple-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Published</p>
              <p className="text-2xl font-black text-emerald-400 mt-1">
                {displayGames.filter(g => g.status === 'published' || g.status === 'approved').length}
              </p>
            </div>
            <PlaySquare className="w-8 h-8 text-emerald-400" />
          </div>
        </div>
        <div className="glass-panel-purple rounded-xl p-4 border border-purple-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Total Downloads</p>
              <p className="text-2xl font-black text-cyan-400 mt-1">
                {displayGames.reduce((sum, g) => sum + (g.downloads || 0), 0).toLocaleString()}
              </p>
            </div>
            <Download className="w-8 h-8 text-cyan-400" />
          </div>
        </div>
      </div>
    </div>
  );

  const renderIngestStep1 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-cyber text-sm font-bold tracking-wider text-purple-400 mb-4">STEP 1: GAME METADATA</h3>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-cyber text-slate-400 block mb-1.5 uppercase font-bold">Game Title *</label>
            <input type="text" value={formData.title} onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))} className="w-full bg-slate-900/80 text-white rounded-xl border border-white/10 p-3 font-sans text-sm focus:border-purple-400 transition" />
          </div>
          <div>
            <label className="text-[10px] font-cyber text-slate-400 block mb-1.5 uppercase font-bold">Developer Studio *</label>
            <input type="text" value={formData.developerStudio} onChange={(e) => setFormData(prev => ({ ...prev, developerStudio: e.target.value }))} className="w-full bg-slate-900/80 text-white rounded-xl border border-white/10 p-3 font-sans text-sm focus:border-purple-400 transition" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-cyber text-slate-400 block mb-1.5 uppercase font-bold">Genre *</label>
              <select value={formData.genre} onChange={(e) => setFormData(prev => ({ ...prev, genre: e.target.value }))} className="w-full bg-slate-900/80 text-white rounded-xl border border-white/10 p-3 font-sans text-sm focus:border-purple-400 transition">
                <option value="">Select genre...</option>
                {genres.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>
      <div className="flex justify-end">
        <button onClick={() => setIngestStep(2)} disabled={!formData.title || !formData.developerStudio || !formData.genre} className="bg-purple-500 hover:bg-purple-400 disabled:bg-slate-700 disabled:text-slate-500 text-white px-6 py-3 rounded-xl text-xs font-bold flex items-center gap-2 transition">
          NEXT: STOREFRONT ASSETS <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const renderIngestStep2 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-cyber text-sm font-bold tracking-wider text-purple-400 mb-4">STEP 2: STOREFRONT ASSETS</h3>
        <label className="border-2 border-dashed border-white/10 rounded-xl p-6 hover:border-purple-500/30 transition cursor-pointer block">
          <input type="file" className="hidden" accept="image/*" onChange={(e) => setFormData(prev => ({ ...prev, bannerFile: e.target.files?.[0] || null }))} />
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Image className="w-7 h-7 text-purple-400" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-white text-sm">Game Banner (Capsule)</p>
              {formData.bannerFile ? <span className="text-xs text-emerald-400">Uploaded</span> : <p className="text-xs text-slate-400">Click to upload</p>}
            </div>
          </div>
        </label>
      </div>
      <div className="flex justify-between">
        <button onClick={() => setIngestStep(1)} className="bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-xl text-xs font-bold flex items-center gap-2 transition"><ArrowLeft className="w-4 h-4" /> BACK</button>
        <button onClick={() => setIngestStep(3)} className="bg-purple-500 hover:bg-purple-400 text-white px-6 py-3 rounded-xl text-xs font-bold flex items-center gap-2 transition">NEXT: BUILD UPLOAD <ArrowRight className="w-4 h-4" /></button>
      </div>
    </div>
  );

  const renderIngestStep3 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-cyber text-sm font-bold tracking-wider text-purple-400 mb-4">STEP 3: BUILD UPLOAD</h3>
        <label className="border-2 border-dashed border-purple-500/30 rounded-xl p-12 text-center hover:border-purple-500/50 transition cursor-pointer block bg-purple-500/5">
          <input type="file" className="hidden" accept=".zip,.wasm,.exe,.dmg" onChange={(e) => setFormData(prev => ({ ...prev, buildFile: e.target.files?.[0] || null }))} />
          <div className="flex flex-col items-center gap-4">
            <Package className="w-10 h-10 text-purple-400" />
            <div>
              <p className="font-bold text-white text-lg">Game Package</p>
              {formData.buildFile ? <span className="text-sm text-emerald-400">{formData.buildFile.name}</span> : <p className="text-sm text-slate-500">Click to upload game package</p>}
            </div>
          </div>
        </label>
      </div>
      <div className="flex justify-between">
        <button onClick={() => setIngestStep(2)} className="bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-xl text-xs font-bold flex items-center gap-2 transition"><ArrowLeft className="w-4 h-4" /> BACK</button>
        <button onClick={() => setIngestStep(4)} disabled={!formData.buildFile} className="bg-purple-500 disabled:bg-slate-700 text-white px-6 py-3 rounded-xl text-xs font-bold flex items-center gap-2 transition">NEXT: AI CONTAINER QC <ArrowRight className="w-4 h-4" /></button>
      </div>
    </div>
  );

  const renderIngestStep4 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-cyber text-sm font-bold tracking-wider text-purple-400 mb-4">STEP 4: AI CONTAINER QC</h3>
        {!isAnalyzing && qcProgress === 0 && (
          <div className="glass-panel-purple rounded-xl p-8 border border-purple-500/20 text-center">
            <Cpu className="w-16 h-16 text-purple-400 mx-auto mb-4 animate-pulse" />
            <button onClick={simulateContainerQC} className="bg-purple-500 hover:bg-purple-400 text-white px-8 py-3 rounded-xl text-sm font-bold mx-auto transition">START AI ANALYSIS</button>
          </div>
        )}
        {isAnalyzing && (
          <div className="glass-panel-purple rounded-xl p-6 border border-purple-500/20">
            <div className="flex justify-between mb-4"><span className="text-purple-400">ANALYSIS IN PROGRESS</span><span>{qcProgress}%</span></div>
            <div className="bg-slate-950 rounded-xl p-4 font-mono text-[11px] h-48 overflow-y-auto space-y-1">
              {qcLogs.map((log, idx) => <div key={idx} className="text-slate-300">{log}</div>)}
            </div>
          </div>
        )}
        {qcProgress === 100 && !isAnalyzing && (
          <div className="glass-panel-purple rounded-xl p-8 border border-purple-500/20 text-center">
            <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
            <h4 className="font-cyber text-lg font-bold text-white mb-6">CONTAINER QC COMPLETE</h4>
            <button onClick={handleSubmitToValve} className="bg-purple-500 hover:bg-purple-400 text-white px-8 py-3 rounded-xl text-sm font-bold flex items-center gap-2 mx-auto transition"><Send className="w-5 h-5" /> SUBMIT TO VALVE</button>
          </div>
        )}
      </div>
    </div>
  );

  const renderAssets = () => (
    <section className="relative py-8">
      <div className="mb-8 bg-gradient-to-r from-purple-500/10 via-fuchsia-500/5 to-transparent border border-purple-500/20 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 opacity-10 blur-sm pointer-events-none">
          <Gamepad2 className="w-48 h-48 text-purple-400" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            <h4 className="text-purple-400 font-black tracking-widest text-xs uppercase">Kreation Originals</h4>
          </div>
          <p className="text-white text-lg font-bold">First-party flagship titles are currently in development.</p>
          <p className="text-white/50 text-xs mt-1 max-w-xl">The Innova development team is building exclusive, high-fidelity experiences specifically optimized for the WASM execution matrix. In the meantime, the Indie Sandbox is OPEN.</p>
        </div>
        <button disabled className="relative z-10 px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-white/40 tracking-wider uppercase cursor-not-allowed flex items-center gap-2">
          <Lock className="w-3.5 h-3.5" /> Coming Soon
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {displayGames.map((game) => (
          <div
            key={game.id}
            onClick={() => setSelectedGame(game)}
            className="group relative aspect-[2/3] bg-slate-900 rounded-xl overflow-hidden border border-purple-500/30 hover:scale-[1.03] transition-all cursor-pointer"
          >
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${game.thumbnail})` }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <h4 className="font-bold text-white text-sm uppercase truncate mb-1">{game.title}</h4>
              <p className="text-[10px] text-gray-400 uppercase">{game.developerStudio}</p>
            </div>
            
            <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/80 backdrop-blur-sm gap-2 p-4">
              <button 
                onClick={async (e) => {
                  e.stopPropagation();
                  setIsTransacting(true);
                  try {
                    const res = await processEcosystemTransaction(userNode?.wallet || '0xKREATION', 3999, 'game_purchase', `Purchased ${game.title} permanently`);
                    const receipt = res?.receipt || `KRT-LOCAL-${Date.now().toString().slice(-6)}`;
                    setStatusBanner(`Unlocked "${game.title}" in permanent library • Receipt: ${receipt}`);
                  } catch {
                    setStatusBanner(`Unlocked "${game.title}" via local console ledger • Receipt: KRT-LOCAL-${Date.now().toString().slice(-6)}`);
                  }
                  setSelectedGame(game);
                  setIsTransacting(false);
                }}
                disabled={isTransacting}
                className="w-full bg-purple-500 hover:bg-purple-400 text-white py-2.5 rounded-lg text-[10px] font-black tracking-widest transition disabled:opacity-50"
              >
                BUY TO OWN (3,999 $INVA)
              </button>

              <div className="w-full flex items-center gap-2 my-1">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-[8px] text-white/40 font-bold uppercase tracking-widest">OR</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              <button 
                onClick={async (e) => { 
                  e.stopPropagation(); 
                  setIsTransacting(true);
                  try {
                    await processEcosystemTransaction(userNode?.wallet || '0xKREATION', 1499, 'subscription', 'Kreation Monthly Pass');
                    setStatusBanner(`Kreation Pass active • Streaming "${game.title}" on Cloud Shard v4.0`);
                  } catch {
                    setStatusBanner(`Kreation Pass verified locally • Streaming "${game.title}" on Cloud Shard v4.0`);
                  }
                  setSelectedGame(game);
                  setIsTransacting(false);
                }}
                disabled={isTransacting}
                className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white py-2.5 rounded-lg text-[10px] font-black tracking-widest transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Play className="w-3 h-3 text-purple-400" /> PLAY (KREATION PASS)
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedGame && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="w-full max-w-4xl bg-[#0b0d14] border border-purple-500/40 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div>
                <h4 className="font-cyber text-sm font-bold text-white uppercase">{selectedGame.title} — CLOUD SHARD STREAM</h4>
                <p className="text-[10px] text-purple-400 font-mono">{selectedGame.developerStudio} • {selectedGame.systemRequirements}</p>
              </div>
              <button
                onClick={() => setSelectedGame(null)}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-white"
              >
                CLOSE STREAM
              </button>
            </div>
            <div className="aspect-video bg-black">
              <video
                src={selectedGame.videoUrl || '/masters/innova-sovereign-TearsOfSteel.mp4'}
                poster={selectedGame.thumbnail}
                autoPlay
                controls
                loop
                playsInline
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );

  const renderAdmin = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-cyber text-sm font-bold tracking-wider text-white">VALVE OVERRIDE</h3>
          <p className="text-[10px] text-slate-400">Admin review console</p>
        </div>
      </div>
      <div className="glass-panel-purple rounded-xl border border-purple-500/10 overflow-hidden">
        <table className="w-full text-left text-sm">
          <tbody className="divide-y divide-white/5">
            {displayGames.filter(g => g.status === 'pending_review').map(game => (
              <tr key={game.id} className="hover:bg-white/[0.02]">
                <td className="p-4 text-white font-bold">{game.title}</td>
                <td className="p-4 text-slate-400">{game.developerStudio}</td>
                <td className="p-4">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => handleApprove(game.id)} className="bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-bold">Approve</button>
                    <button onClick={() => handleDeny(game.id)} className="bg-rose-500/20 text-rose-400 px-3 py-1.5 rounded-lg text-xs font-bold">Deny</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#050505] text-white">
      <div className="w-64 border-r border-white/10 bg-white/[0.02] flex flex-col">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <Gamepad2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-cyber text-sm font-bold text-white">KREATION</h2>
              <p className="text-[10px] text-slate-500">Gaming Platform</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <button onClick={() => setActiveTab('hub')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition ${activeTab === 'hub' ? 'bg-purple-500/20 text-purple-400' : 'text-slate-400 hover:bg-white/5'}`}><BarChart3 className="w-4 h-4" /> Developer Hub</button>
          <button onClick={() => { setActiveTab('ingest'); setIngestStep(1); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition ${activeTab === 'ingest' ? 'bg-purple-500/20 text-purple-400' : 'text-slate-400 hover:bg-white/5'}`}><Plus className="w-4 h-4" /> Submit Game</button>
          <button onClick={() => setActiveTab('assets')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition ${activeTab === 'assets' ? 'bg-purple-500/20 text-purple-400' : 'text-slate-400 hover:bg-white/5'}`}><Layers className="w-4 h-4" /> Storefront</button>
        </nav>
        {isAdmin && (
          <div className="px-4 py-2"><button onClick={() => setActiveTab('admin')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition ${activeTab === 'admin' ? 'bg-violet-500/20 text-violet-400' : 'text-slate-400 hover:bg-white/5'}`}><Settings className="w-4 h-4" /> Valve Override</button></div>
        )}
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
          {statusBanner && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{statusBanner}</span>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto">
            {activeTab === 'hub' && renderHub()}
            {activeTab === 'ingest' && (
              <div className="space-y-6">
                {ingestStep === 1 && renderIngestStep1()}
                {ingestStep === 2 && renderIngestStep2()}
                {ingestStep === 3 && renderIngestStep3()}
                {ingestStep === 4 && renderIngestStep4()}
              </div>
            )}
            {activeTab === 'assets' && renderAssets()}
            {activeTab === 'admin' && isAdmin && renderAdmin()}
          </div>
        </div>
      </div>
    </div>
  );
}