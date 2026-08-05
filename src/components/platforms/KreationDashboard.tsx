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
  rating?: number;
  downloads?: number;
}

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

  const isAdmin = userNode?.handle?.toUpperCase() === '@TICKER';
  const displayGames = games;

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
    const payload = {
      id: generatedId,
      title: formData.title,
      developerStudio: formData.developerStudio,
      genre: formData.genre,
      systemRequirements: formData.systemRequirements,
      status: 'pending_review',
      submittedAt: new Date().toISOString(),
      thumbnail: `https://picsum.photos/seed/${Date.now()}/400/225`,
      rating: 0,
      downloads: 0
    };

    try {
      await submitGame(payload);
    } catch (error) {
      console.error('Failed to submit game to backend:', error);
    }

    const newGame: IndieGame = { ...payload } as IndieGame;
    setGames((prev: any) => [newGame, ...prev]);
    setFormData(initialFormData);
    setIngestStep(1);
    setActiveTab('hub');
  };

  const handleApprove = (id: string) => {
    setGames((prev: any) => prev.map((game: any) => game.id === id ? { ...game, status: 'approved' } : game));
  };

  const handleDeny = (id: string) => {
    setGames((prev: any) => prev.map((game: any) => game.id === id ? { ...game, status: 'rejected' } : game));
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
          <div key={game.id} className="group relative aspect-[2/3] bg-slate-900 rounded-xl overflow-hidden border border-purple-500/30 hover:scale-[1.03] transition-all cursor-pointer">
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
                  const res = await processEcosystemTransaction(userNode.wallet, 3999, 'game_purchase', `Purchased ${game.title} permanently`);
                  if (res.success) alert(`Success! ${game.title} added to your permanent library. Receipt: ${res.receipt}`);
                  else alert(`Transaction failed: ${res.error}`);
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
                  if (window.confirm('Kreation Pass Required. Purchase monthly pass for 1,499 $INVA (~$14.99)?')) {
                    setIsTransacting(true);
                    const res = await processEcosystemTransaction(userNode.wallet, 1499, 'subscription', 'Kreation Monthly Pass');
                    if (res.success) alert('Pass activated! Launching game container...');
                    else alert(`Transaction failed: ${res.error}`);
                    setIsTransacting(false);
                  }
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