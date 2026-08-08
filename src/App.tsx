import React, { useState, useEffect, useCallback } from 'react';
import { 
  TabType, 
  NetworkNode, 
  WalletState, 
  IndieGame, 
  VideoSubmission, 
  StreamShareProject 
} from './types';
import IdentityWalletSettings from './components/IdentityWalletSettings';
import VelvetRopeLogin from './components/auth/VelvetRopeLogin';
import EcosystemPromoter from './components/EcosystemPromoter';
import ArcHavenDashboard from './components/platforms/ArcHavenDashboard';
import HekticDashboard from './components/platforms/HekticDashboard';
import StreamShareDashboard from './components/platforms/StreamShareDashboard';
import MVNDashboard from './components/platforms/MVNDashboard';
import KreationDashboard from './components/platforms/KreationDashboard';
import DeviceActivation from './pages/DeviceActivation';
import { 
  hasValidSession, 
  clearIdentityData, 
  fetchEcosystemContent,
  updateContentStatus,
  fetchWalletBalance,
  processEcosystemTransaction
} from './lib/apiClient';
import { 
  Gamepad2, 
  Film, 
  Tv, 
  Share2, 
  ChevronRight, 
  ArrowLeft, 
  Database,
  Lock,
  Network,
  Layers,
  CheckCircle2,
  User,
  Wallet,
  ArrowRight,
  RefreshCw,
  Copy,
  ShieldAlert,
  Activity,
  TrendingUp,
  Users,
  Eye,
  XCircle,
  CreditCard,
  Zap,
  Server,
  Fingerprint
} from 'lucide-react';

export type AppState = 'landing' | 'setup' | 'onboarding' | 'hub' | 'platform' | 'admin' | 'activate';

export default function App() {
  const [appState, setAppState] = useState<AppState>('landing');
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [subPlatform, setSubPlatform] = useState<'mvn' | 'archaven' | 'hektic'>('archaven');
  const [claimedUsername, setClaimedUsername] = useState('');
  const [onboardingSlide, setOnboardingSlide] = useState(0);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [showLegal, setShowLegal] = useState(false);
  const [agreedToS, setAgreedToS] = useState(false);
  const [agreedCreator, setAgreedCreator] = useState(false);
  const [airdropWallet, setAirdropWallet] = useState('');
  const [airdropAmount, setAirdropAmount] = useState('25000');
  const [userAvatarUrl, setUserAvatarUrl] = useState<string>('');

  const displayUsername = claimedUsername.startsWith('@') ? claimedUsername : `@${claimedUsername}`;
  const formatWallet = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;

  const [games, setGames] = useState<IndieGame[]>([]);
  const [submissions, setSubmissions] = useState<VideoSubmission[]>([]);
  const [projects, setProjects] = useState<StreamShareProject[]>([]);

  const [adminLogs, setAdminLogs] = useState<string[]>(['ADMIN CONSOLE ONLINE // STANDBY']);
  const [node, setNode] = useState<NetworkNode>({
    id: 'INVA-NODE-UNREG',
    name: 'OFFLINE_COMMAND_CENTER',
    status: 'offline',
    cores: 8,
    region: 'US_EAST_NY_SHARD',
    uptime: 0,
    peers: 0,
    bandwidth: 0,
    logs: ['SYSTEM READY // INITIALIZER UNREGISTED']
  });
  const [wallet, setWallet] = useState<WalletState>({
    connected: false,
    address: '',
    balance: 0,
    seedPhrase: [],
    generating: false,
    confirmed: false
  });

  useEffect(() => {
    if (hasValidSession()) {
      const storedUsername = localStorage.getItem('innova-username');
      const hasAcceptedLegal = localStorage.getItem('innova-legal-accepted') === 'true';
      if (storedUsername) setClaimedUsername(storedUsername);
      // If legal has been accepted, go directly to hub; otherwise show onboarding
      if (hasAcceptedLegal) {
        setAppState('hub');
        executeConnectSetupWallet();
      } else {
        setAppState('onboarding');
      }
    }
    const statsTimer = setTimeout(() => setIsLoadingStats(false), 1500);
    return () => clearTimeout(statsTimer);
  }, []);

  useEffect(() => {
    const handleAuthError = () => {
      clearIdentityData();
      setClaimedUsername('');
      setAppState('landing');
    };
    window.addEventListener('innova-auth-error', handleAuthError);
    return () => window.removeEventListener('innova-auth-error', handleAuthError);
  }, []);

  // Trigger legal modal when entering hub (only if not already accepted)
  useEffect(() => {
    if (appState === 'hub') {
      const hasAcceptedLegal = localStorage.getItem('innova-legal-accepted') === 'true';
      // Only show legal modal if user hasn't accepted yet
      if (!hasAcceptedLegal) {
        // Show legal modal after a short delay for smooth transition
        const timer = setTimeout(() => setShowLegal(true), 300);
        return () => clearTimeout(timer);
      }
    }
  }, [appState]);

  const getBackendTenantId = useCallback((tab: TabType, subPlat: string): string => {
    if (tab === 'kreation') return 'Kreation';
    if (tab === 'streamshare') return 'StreamShare';
    if (tab === 'entertainment') {
      if (subPlat === 'mvn') return 'MVN';
      if (subPlat === 'hektic') return 'HekticTV';
      return 'ArcHaven';
    }
    return 'MVN';
  }, []);

  const syncEcosystemDataFeed = useCallback(async () => {
    if (appState !== 'platform' && appState !== 'admin') return;
    
    setIsLoadingContent(true);
    try {
      const res = await fetchEcosystemContent();
      const liveData = (res as any).content || Array.isArray(res) ? res : [];

      // Extract and update cross-tenant lists safely
      if (Array.isArray(liveData)) {
        setGames(liveData.filter((item: any) => item.id?.startsWith('KR-') || item.tenant === 'Kreation'));
        setProjects(liveData.filter((item: any) => item.id?.startsWith('SS-') || item.tenant === 'StreamShare'));
        setSubmissions(liveData.filter((item: any) => item.id?.startsWith('MVN-') || item.id?.startsWith('HTV-') || item.id?.startsWith('ARCH-') || ['MVN', 'HekticTV', 'ArcHaven'].includes(item.tenant)));
      }
    } catch (err) {
      console.error(`[DATA ERROR] Failed fetching live shared shard state`, err);
    } finally {
      setIsLoadingContent(false);
    }
  }, [appState]);

  useEffect(() => {
    if (appState === 'platform' || appState === 'admin') {
      syncEcosystemDataFeed();
    }
  }, [appState, syncEcosystemDataFeed]);

  const executeConnectSetupWallet = async (_username?: string) => {
    const activeAddress = localStorage.getItem('innova-wallet-address');
    if (!activeAddress) {
      setWallet({
        connected: false,
        address: '',
        balance: 0,
        seedPhrase: [],
        generating: false,
        confirmed: false
      });
      return;
    }
    const liveBalance = await fetchWalletBalance(activeAddress);
    
    setWallet({
      connected: true,
      address: activeAddress,
      balance: liveBalance,
      seedPhrase: [],
      generating: false,
      confirmed: true
    });
  };

  const handleGlobalStatusUpdate = async (id: string, type: 'game' | 'video' | 'project', newStatus: string) => {
    try {
      await updateContentStatus(id, newStatus, type);
      if (type === 'game') {
        setGames(prev => prev.map(g => g.id === id ? { ...g, status: newStatus as any } : g));
      } else if (type === 'video') {
        setSubmissions(prev => prev.map(s => (s as any).id === id ? { ...s, status: newStatus as any } : s));
      } else if (type === 'project') {
        setProjects(prev => prev.map(p => p.id === id ? { ...p, status: newStatus as any } : p));
      }
      const time = new Date().toLocaleTimeString();
      setAdminLogs(prev => [`[${time}] AUDIT SHARD INJECTION MUTATION SUCCESS: ${id} -> ${newStatus.toUpperCase()}`, ...prev]);
    } catch (error) {
      console.error('[GOD MODE API] Failed to update status:', error);
    }
  };

  const onboardingSlides = [
    {
      title: "THE NODE IDENTITY",
      subtitle: "Your universal passport",
      description: "An immutable, unique cryptographic identity claimed directly on the Innova ledger. Your @ID acts as your cross-platform handle, secure access key, and registers verified files automatically.",
      icon: Network,
      graphic: <Network className="w-24 h-24 text-cyan-400 animate-pulse" />
    },
    {
      title: "THE SECURE WALLET",
      subtitle: "Multi-signature accounts",
      description: "Seamless on-chain storage engineered for zero gas fees. Our custom EVM account framework supports instant creative peer payouts, automatic gas fee mitigation, and direct $INVA token rewards allocation.",
      icon: Wallet,
      graphic: <Wallet className="w-24 h-24 text-purple-400 animate-pulse" />
    },
    {
      title: "RING COMM SIGNATURES",
      subtitle: "Biometric hardware verification",
      description: "Military-grade transaction signing through hardware-bound biometric enclaves. Your Ring Comm device creates an unbreakable link between physical identity and digital assets, enabling zero-knowledge proof authentication.",
      icon: Fingerprint,
      graphic: <Fingerprint className="w-24 h-24 text-emerald-400 animate-pulse" />
    },
    {
      title: "THE DECENTRALIZED CREATIVE HUB",
      subtitle: "Cross-platform ecosystem",
      description: "One identity, unlimited creative possibilities. Access Kreation Gaming, ArcHaven Cinema, MVN Music, Hektic TV, and StreamShare pipelines through a single unified node. Your creative empire, seamlessly connected.",
      icon: Layers,
      graphic: <Layers className="w-24 h-24 text-amber-400 animate-pulse" />
    }
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#020205] text-slate-100 font-sans relative select-none">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none z-0" />

      {appState === 'landing' && (
        <div className="flex-1 flex flex-col items-center justify-center min-h-screen p-8 z-10">
          <div className="text-center space-y-8 max-w-4xl">
            <h1 className="font-sans font-black tracking-tight text-5xl md:text-6xl text-white uppercase text-glow-cyan leading-tight">INNOVA ECOSYSTEM</h1>
            <p className="text-white/60 max-w-2xl mx-auto text-sm font-sans font-light md:text-base">
              Discover the next-generation media empire. Unifying interactive Web3 gaming builds, secure master film transcoding networks, and advanced creator-client StreamShare pipelines.
            </p>
            <button onClick={() => setAppState('setup')} className="cursor-pointer mx-auto group bg-gradient-to-r from-cyan-500 via-purple-600 to-emerald-500 py-3.5 px-10 rounded-xl text-sm font-sans tracking-wide font-semibold text-white shadow-lg flex items-center gap-3">
              <span>ESTABLISH IDENTITY</span>
              <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition" />
            </button>
          </div>
        </div>
      )}

      {appState === 'setup' && (
        <VelvetRopeLogin 
          onAuthenticated={(username) => {
            setClaimedUsername(username);
            executeConnectSetupWallet(username);
            setAppState('onboarding');
          }}
        />
      )}

      {appState === 'onboarding' && (
        <div className="flex-1 flex flex-col justify-between items-center p-8 z-10 min-h-screen">
          <div className="w-full max-w-5xl mx-auto flex justify-between items-center py-4 border-b border-white/10">
            <span className="font-sans font-black text-xs tracking-wider text-cyan-400 uppercase">INNOVA INITIAL SYBASE BOOTSTRAP</span>
            <span className="font-sans font-light text-xs text-white/60">@{claimedUsername.toUpperCase()} // STABLE</span>
          </div>
          <div className="my-auto w-full max-w-3xl bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 flex flex-col md:flex-row gap-8 items-center justify-between">
            <div className="flex-1 space-y-6">
              <h3 className="font-sans font-black text-3xl text-white uppercase">{onboardingSlides[onboardingSlide]?.title}</h3>
              <p className="text-xs text-white/60 font-sans font-light leading-relaxed">{onboardingSlides[onboardingSlide]?.description}</p>
              <div className="flex items-center gap-2">
                {[0, 1, 2, 3].map((idx) => (
                  <button key={idx} onClick={() => setOnboardingSlide(idx)} className={`h-2 rounded-full transition-all ${onboardingSlide === idx ? 'w-8 bg-cyan-400' : 'w-2 bg-slate-700'}`} />
                ))}
              </div>
            </div>
            <div className="w-full md:w-80 bg-white/5 border border-white/10 rounded-2xl p-8 min-h-[220px] flex items-center justify-center">{onboardingSlides[onboardingSlide]?.graphic}</div>
          </div>
          <div className="w-full max-w-5xl mx-auto flex justify-between items-center py-6 border-t border-white/10">
            {onboardingSlide > 0 ? (
              <button onClick={() => setOnboardingSlide(prev => prev - 1)} className="cursor-pointer bg-white/5 border border-white/10 text-white/80 py-2.5 px-5 rounded-xl text-xs flex items-center gap-1.5 font-bold"><ArrowLeft className="w-4 h-4" /> PREVIOUS</button>
            ) : <div className="text-[11px] text-white/40">Innova Ecosystem Guide v2.1</div>}
            {onboardingSlide < 3 ? (
              <button onClick={() => setOnboardingSlide(prev => prev + 1)} className="cursor-pointer bg-cyan-500 text-black py-2.5 px-6 rounded-xl text-xs flex items-center gap-1.5 font-bold">NEXT <ArrowRight className="w-4 h-4" /></button>
            ) : <button onClick={() => setShowLegal(true)} className="cursor-pointer bg-gradient-to-r from-cyan-400 to-purple-600 text-white py-3 px-8 rounded-xl text-xs font-black tracking-wider animate-pulse">ENTER COMMAND DECK</button>}
          </div>

          {/* Legal Modal - Injected in Onboarding */}
          {showLegal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
              <div className="bg-[#0a0a0f] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
                <div className="p-6 border-b border-white/10">
                  <h2 className="text-xl font-black text-white uppercase tracking-wider">ECOSYSTEM DIRECTIVES</h2>
                  <p className="text-xs text-white/50 mt-1">Review and accept the network terms to initialize your node.</p>
                </div>
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-cyan-400 mb-2 uppercase">1. Consumer Terms of Service</h3>
                    <div className="bg-black/50 border border-white/5 rounded-xl p-4 text-[10px] text-white/60 font-mono space-y-2 h-40 overflow-y-auto">
                      <p><strong className="text-white">The $INVA Economy:</strong> $INVA tokens are purchased via fiat currency to access digital goods, subscriptions, services, and to tip creators. All Sales Are Final.</p>
                      <p><strong className="text-white">True Digital Ownership:</strong> Purchasing a "Buy-To-Own" title grants you a Perpetual Digital Asset linked to your EVM ledger. You own this specific copy of the software and maintain the right to hold, play, or resell this asset on the Innova Secondary Market.</p>
                      <p><strong className="text-white">Acceptable Use:</strong> You agree not to use the ecosystem to host, stream, or distribute illegal content. Severe violations will result in your Node Identity being permanently disconnected.</p>
                    </div>
                    <label className="flex items-center gap-3 mt-3 cursor-pointer">
                      <input type="checkbox" checked={agreedToS} onChange={(e) => setAgreedToS(e.target.checked)} className="w-4 h-4 rounded border-white/20 bg-slate-800 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0" />
                      <span className="text-xs text-white font-bold">I accept the Consumer Terms of Service</span>
                    </label>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-purple-400 mb-2 uppercase">2. Creator & Monetization Agreement</h3>
                    <div className="bg-black/50 border border-white/5 rounded-xl p-4 text-[10px] text-white/60 font-mono space-y-2 h-40 overflow-y-auto">
                      <p><strong className="text-white">Intellectual Property:</strong> You represent and warrant that you are the sole owner of, or have obtained all necessary licenses for, the Content you upload. You assume full legal liability for infringement.</p>
                      <p><strong className="text-white">Revenue Splits & Royalties:</strong> Primary Sales (Kreation): 80% to Developer / 20% to Innova. Subscription Pools: 70% to Creator Pool / 30% to Innova. Universal Tipping: 95% to Creator / 5% to Innova. Secondary Market Resales: 10% royalty to the original Creator.</p>
                      <p><strong className="text-white">Payouts:</strong> You may request a fiat currency withdrawal only once your ledger reaches a minimum threshold of 5,000 $INVA ($50.00 USD equivalent).</p>
                      <p><strong className="text-white">Audits & Fraud:</strong> Artificially inflating streams or engaging in token-laundering will result in immediate forfeiture of your ledger balance and a permanent network ban.</p>
                    </div>
                    <label className="flex items-center gap-3 mt-3 cursor-pointer">
                      <input type="checkbox" checked={agreedCreator} onChange={(e) => setAgreedCreator(e.target.checked)} className="w-4 h-4 rounded border-white/20 bg-slate-800 text-purple-500 focus:ring-purple-500 focus:ring-offset-0" />
                      <span className="text-xs text-white font-bold">I accept the Creator Monetization Agreement</span>
                    </label>
                  </div>
                </div>
                <div className="p-6 border-t border-white/10 flex justify-end gap-3">
                  <button onClick={() => setShowLegal(false)} className="px-6 py-2.5 rounded-xl text-xs font-bold text-white/50 hover:text-white transition">CANCEL</button>
                  <button 
                    onClick={() => {
                      localStorage.setItem('innova-legal-accepted', 'true');
                      setAppState('hub');
                      setShowLegal(false);
                    }} 
                    disabled={!agreedToS || !agreedCreator}
                    className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-500 text-black px-8 py-2.5 rounded-xl text-xs font-black tracking-wider transition"
                  >
                    INITIALIZE NODE
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {appState === 'hub' && (
        <div className="flex-1 flex flex-col justify-between p-8 z-10">
          <div className="w-full max-w-7xl mx-auto space-y-10">
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl">
              <div className="flex items-center gap-4.5">
                <div className="relative w-14 h-14 rounded-2xl bg-[#0d0e19] flex items-center justify-center border border-white/20 overflow-hidden">
                  {userAvatarUrl ? (
                    <img src={userAvatarUrl} alt="Profile Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-7 h-7 text-cyan-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-sans font-black text-2xl text-white flex items-center">{displayUsername.toUpperCase()}</span>
                    <button onClick={() => setShowSettings(true)} className="cursor-pointer p-2 hover:bg-white/5 rounded-xl transition border border-transparent hover:border-white/10 ml-1">
                      <Wallet className="w-4 h-4 text-white/40 hover:text-cyan-400 transition" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-white/60 font-mono">EVM ADDR:</span>
                    {wallet.address ? (
                      <>
                        <span className="text-xs text-slate-300 font-mono">{formatWallet(wallet.address)}</span>
                        <button onClick={() => navigator.clipboard.writeText(wallet.address)} className="text-slate-500 hover:text-white transition p-0.5 rounded cursor-pointer"><Copy className="w-3.5 h-3.5" /></button>
                      </>
                    ) : (
                      <span className="text-xs text-slate-500 font-mono italic">Not connected</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={() => setAppState('activate')} className="cursor-pointer bg-gradient-to-r from-amber-600/20 to-orange-600/20 border border-amber-500/30 text-amber-400 px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition flex items-center gap-2 hover:border-amber-500/50 hover:from-amber-600/30 hover:to-orange-600/30">
                  <Tv className="w-3.5 h-3.5" /> LINK TV DEVICE
                </button>
                <button onClick={() => setShowSettings(true)} className="cursor-pointer bg-gradient-to-r from-cyan-600/20 to-purple-600/20 border border-cyan-500/30 text-cyan-400 px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition flex items-center gap-2">
                  <CreditCard className="w-3.5 h-3.5" /> Identity / Wallet & Billing Center
                </button>
                <button onClick={() => { clearIdentityData(); setAppState('landing'); }} className="cursor-pointer bg-white/5 hover:bg-rose-500/10 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-slate-400 hover:text-rose-400 uppercase tracking-wider transition"><Lock className="w-3.5 h-3.5" /> Logout</button>
              </div>
            </div>

            {claimedUsername.toUpperCase() === '@TICKER' && (
              <button onClick={() => setAppState('admin')} className="w-full cursor-pointer bg-rose-500/20 hover:bg-rose-500/30 border-2 border-rose-500/50 text-rose-400 py-6 px-8 rounded-2xl text-sm font-black tracking-widest uppercase animate-pulse flex items-center justify-center gap-3">
                <ShieldAlert className="w-6 h-6" /> ACCESS GLOBAL COMMAND DECK <ShieldAlert className="w-6 h-6" />
              </button>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* ACTIVE: KREATION GAMING (Indie Sandbox) */}
              <div onClick={() => { setActiveTab('kreation'); setAppState('platform'); }} className="group cursor-pointer bg-white/5 border border-white/10 hover:border-purple-500/40 p-6 rounded-2xl flex flex-col justify-between min-h-[220px] transition relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-purple-500 text-white text-[8px] font-black px-3 py-1 rounded-bl-lg tracking-widest uppercase">Indie Sandbox Live</div>
                <div><Gamepad2 className="w-8 h-8 text-purple-400 mb-4" /><h4 className="font-black text-lg text-white">KREATION GAMING</h4><p className="text-xs text-white/60 mt-2">WASM indie container execution matrix. (1st-party Originals coming soon).</p></div>
                <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center text-xs font-semibold text-purple-400 group-hover:text-white"><span>OPEN VALVE</span><ChevronRight className="w-4 h-4" /></div>
              </div>

              {/* ACTIVE: MUSIC VIDEO NET */}
              <div onClick={() => { setActiveTab('entertainment'); setSubPlatform('mvn'); setAppState('platform'); }} className="group cursor-pointer bg-white/5 border border-white/10 hover:border-amber-500/40 p-6 rounded-2xl flex flex-col justify-between min-h-[220px] transition">
                <div><Tv className="w-8 h-8 text-amber-400 mb-4" /><h4 className="font-black text-lg text-white">MUSIC VIDEO NET</h4><p className="text-xs text-white/60 mt-2">Acoustic spatial metadata registry. Query pipeline arrays with embedded automated audits.</p></div>
                <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center text-xs font-semibold text-amber-400 group-hover:text-white"><span>OPEN STREAM</span><ChevronRight className="w-4 h-4" /></div>
              </div>

              {/* LOCKED: ARCHAVEN CINEMA */}
              <div className="group relative bg-white/5 border border-white/10 p-6 rounded-2xl flex flex-col justify-between min-h-[220px] overflow-hidden cursor-not-allowed opacity-80">
                <div className="absolute inset-0 bg-[#020205]/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Lock className="w-8 h-8 text-cyan-400 mb-3" />
                  <span className="text-xs font-black tracking-widest text-cyan-400 uppercase bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">Awaiting Masters</span>
                </div>
                <div className="relative z-0 opacity-50 blur-[1px] group-hover:blur-sm transition-all duration-300">
                  <div><Film className="w-8 h-8 text-cyan-400 mb-4" /><h4 className="font-black text-lg text-white">ARCHAVEN CINEMA</h4><p className="text-xs text-white/60 mt-2">High-bitrate ProRes distribution. Process global automated licensing matrices.</p></div>
                  <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center text-xs font-semibold text-white/40"><span>CURATING CONTENT...</span><Lock className="w-4 h-4" /></div>
                </div>
              </div>

              {/* LOCKED: HEKTIC TV */}
              <div className="group relative bg-white/5 border border-white/10 p-6 rounded-2xl flex flex-col justify-between min-h-[220px] overflow-hidden cursor-not-allowed opacity-80">
                <div className="absolute inset-0 bg-[#020205]/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Lock className="w-8 h-8 text-indigo-400 mb-3" />
                  <span className="text-xs font-black tracking-widest text-indigo-400 uppercase bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">Signal Offline</span>
                </div>
                <div className="relative z-0 opacity-50 blur-[1px] group-hover:blur-sm transition-all duration-300">
                  <div><Database className="w-8 h-8 text-indigo-400 mb-4" /><h4 className="font-black text-lg text-white">HEKTIC LIVE TV</h4><p className="text-xs text-white/60 mt-2">Decentralized edge caching arrays. Audit real-time streaming bitstreams and telemetry.</p></div>
                  <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center text-xs font-semibold text-white/40"><span>ROUTING NODES...</span><Lock className="w-4 h-4" /></div>
                </div>
              </div>

              {/* ACTIVE: STREAMSHARE B2B */}
              <div onClick={() => { setActiveTab('streamshare'); setAppState('platform'); }} className="group cursor-pointer bg-white/5 border border-white/10 hover:border-emerald-500/40 p-6 rounded-2xl flex flex-col justify-between min-h-[220px] transition">
                <div><Share2 className="w-8 h-8 text-emerald-400 mb-4" /><h4 className="font-black text-lg text-white">STREAMSHARE B2B</h4><p className="text-xs text-white/60 mt-2">Dual-persona collaborative interface. Sign file distributions directly with target client nodes.</p></div>
                <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center text-xs font-semibold text-emerald-400 group-hover:text-white"><span>OPEN WORKROOM</span><ChevronRight className="w-4 h-4" /></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {appState === 'platform' && (
        <div className="flex-1 relative">
          {isLoadingContent && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="flex items-center gap-3 font-mono text-sm text-cyan-400"><RefreshCw className="w-5 h-5 animate-spin" /> SYNCHRONIZING WITH SYSTEM BACKEND...</div>
            </div>
          )}
          <PlatformRouter 
            platformId={activeTab === 'entertainment' ? subPlatform : activeTab}
            userNode={{
              handle: `@${claimedUsername.toUpperCase()}`,
              id: `NODE-${claimedUsername.toUpperCase()}`,
              name: `${claimedUsername.toUpperCase()}_CENTER`,
              wallet: wallet.address
            }}
            onBack={() => setAppState('hub')}
            games={games}
            setGames={setGames}
            submissions={submissions}
            setSubmissions={setSubmissions}
            projects={projects}
            setProjects={setProjects}
          />
          <EcosystemPromoter currentPlatform={activeTab === 'entertainment' ? subPlatform : activeTab} />
        </div>
      )}

      {appState === 'admin' && claimedUsername.toUpperCase() === '@TICKER' && (
        <div className="flex-1 flex flex-col p-8 z-10 overflow-y-auto bg-[#020205]">
          <div className="w-full max-w-7xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
              <button onClick={() => setAppState('hub')} className="cursor-pointer flex items-center gap-3 text-rose-400 hover:text-rose-300 transition px-4 py-2 border border-rose-500/30 rounded-xl bg-rose-500/10"><ArrowLeft className="w-5 h-5" /> RETURN TO HUB</button>
              <div className="flex items-center gap-3 px-4 py-2 bg-rose-500/10 border border-rose-500/30 rounded-xl"><ShieldAlert className="w-5 h-5 text-rose-400 animate-pulse" /> <span className="text-xs font-bold text-rose-400 tracking-widest">GOD MODE ACTIVE</span></div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-5">
                <div className="flex items-center justify-between mb-2"><Users className="w-5 h-5 text-rose-400" /><TrendingUp className="w-4 h-4 text-emerald-400" /></div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Total Users</p>
                {isLoadingStats ? (
                  <div className="animate-pulse mt-1"><div className="h-8 bg-white/10 rounded w-20" /></div>
                ) : (
                  <p className="text-2xl font-black text-white mt-1">SYNCING...</p>
                )}
              </div>
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-5">
                <div className="flex items-center justify-between mb-2"><Activity className="w-5 h-5 text-cyan-400" /><Zap className="w-4 h-4 text-emerald-400" /></div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Network Bandwidth</p>
                {isLoadingStats ? (
                  <div className="animate-pulse mt-1"><div className="h-8 bg-white/10 rounded w-24" /></div>
                ) : (
                  <p className="text-2xl font-black text-white mt-1">SYNCING...</p>
                )}
              </div>
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-5">
                <div className="flex items-center justify-between mb-2"><Layers className="w-5 h-5 text-purple-400" /><Server className="w-4 h-4 text-emerald-400" /></div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Active Edge Nodes</p>
                {isLoadingStats ? (
                  <div className="animate-pulse mt-1"><div className="h-8 bg-white/10 rounded w-16" /></div>
                ) : (
                  <p className="text-2xl font-black text-white mt-1">SYNCING...</p>
                )}
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-5">
                <div className="flex items-center justify-between mb-2"><Database className="w-5 h-5 text-emerald-400" /></div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Total Treasury Value</p>
                {isLoadingStats ? (
                  <div className="animate-pulse mt-1"><div className="h-8 bg-white/10 rounded w-28" /></div>
                ) : (
                  <p className="text-2xl font-black text-white mt-1">SYNCING...</p>
                )}
              </div>
            </div>

            {/* Treasury Airdrop Panel */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-4">
              <div className="flex-1">
                <h3 className="text-emerald-400 font-black tracking-widest uppercase text-sm flex items-center gap-2">
                  <Database className="w-4 h-4"/> Treasury Airdrop / Founder Grants
                </h3>
                <p className="text-xs text-slate-400 mt-1">Directly mint and distribute $INVA tokens to verified ecosystem nodes.</p>
              </div>
              <div className="flex w-full md:w-auto items-center gap-3">
                <input 
                  type="text" 
                  placeholder="Target EVM Wallet (0x...)" 
                  value={airdropWallet}
                  onChange={(e) => setAirdropWallet(e.target.value)}
                  className="bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white font-mono w-64 focus:outline-none focus:border-emerald-500/50"
                />
                <select 
                  value={airdropAmount}
                  onChange={(e) => setAirdropAmount(e.target.value)}
                  className="bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="5000">5,000 $INVA</option>
                  <option value="10000">10,000 $INVA</option>
                  <option value="25000">25,000 $INVA</option>
                  <option value="100000">100,000 $INVA</option>
                </select>
                <button 
                  onClick={async () => {
                    if (!airdropWallet) return;
                    const time = new Date().toLocaleTimeString();
                    setAdminLogs(prev => [`[${time}] INITIATING AIRDROP TO ${airdropWallet}...`, ...prev]);
                    const result = await processEcosystemTransaction(airdropWallet, parseInt(airdropAmount), 'creator_boost', 'Founder Grant Airdrop');
                    if (result.success) {
                      setAdminLogs(prev => [`[${time}] SUCCESS: Minted ${airdropAmount} $INVA to ${airdropWallet}`, ...prev]);
                      setAirdropWallet('');
                    } else {
                      setAdminLogs(prev => [`[${time}] FAILED: ${result.error}`, ...prev]);
                    }
                  }}
                  className="bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-2.5 rounded-xl text-xs font-black tracking-wider transition cursor-pointer"
                >
                  DISPATCH GRANT
                </button>
              </div>
            </div>

            {/* Admin Terminal Logs */}
            <div className="bg-black border border-white/10 rounded-2xl p-4 font-mono text-[10px] h-32 overflow-y-auto space-y-1">
              {adminLogs.map((log, i) => (
                <div key={i} className={log.includes('SUCCESS') ? 'text-emerald-400' : log.includes('FAILED') ? 'text-rose-400' : 'text-slate-400'}>
                  {log}
                </div>
              ))}
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10 bg-slate-900/50">
                    <th className="p-4 text-[10px] text-slate-400 uppercase font-bold tracking-wider">Type</th>
                    <th className="p-4 text-[10px] text-slate-400 uppercase font-bold tracking-wider">Title</th>
                    <th className="p-4 text-[10px] text-slate-400 uppercase font-bold tracking-wider">Creator</th>
                    <th className="p-4 text-[10px] text-slate-400 uppercase font-bold tracking-wider">Status</th>
                    <th className="p-4 text-[10px] text-slate-400 uppercase font-bold tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {games.map((game) => (
                    <tr key={game.id} className="border-b border-white/5 hover:bg-white/[0.02] transition">
                      <td className="p-4"><span className="text-purple-400 text-xs font-bold">GAME</span></td>
                      <td className="p-4 text-white font-bold">{game.name}</td>
                      <td className="p-4 text-slate-400">{game.developer}</td>
                      <td className="p-4"><span className="text-xs uppercase text-purple-400">{game.status}</span></td>
                      <td className="p-4 text-right">
                        <button onClick={() => handleGlobalStatusUpdate(game.id, 'game', 'approved')} className="bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-bold mr-2">Approve</button>
                        <button onClick={() => handleGlobalStatusUpdate(game.id, 'game', 'rejected')} className="bg-rose-500/20 text-rose-400 px-3 py-1.5 rounded-lg text-xs font-bold">Deny</button>
                      </td>
                    </tr>
                  ))}
                  {submissions.map((sub) => (
                    <tr key={(sub as any).id} className="border-b border-white/5 hover:bg-white/[0.02] transition">
                      <td className="p-4"><span className="text-cyan-400 text-xs font-bold">VIDEO</span></td>
                      <td className="p-4 text-white font-bold">{(sub as any).title || 'Untitled'}</td>
                      <td className="p-4 text-slate-400">{(sub as any).creator || 'Unknown'}</td>
                      <td className="p-4"><span className="text-xs uppercase text-cyan-400">{(sub as any).status}</span></td>
                      <td className="p-4 text-right">
                        <button onClick={() => handleGlobalStatusUpdate((sub as any).id, 'video', 'approved')} className="bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-bold mr-2">Approve</button>
                        <button onClick={() => handleGlobalStatusUpdate((sub as any).id, 'video', 'declined')} className="bg-rose-500/20 text-rose-400 px-3 py-1.5 rounded-lg text-xs font-bold">Deny</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Legal Gateway Modal */}
      {showLegal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" />
          <div className="relative w-full max-w-2xl bg-[#0a0a0f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="relative bg-gradient-to-r from-cyan-600 to-purple-600 p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <ShieldAlert className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-wider">Legal Gateway</h3>
                  <p className="text-xs text-white/70">Mandatory acceptance required for ecosystem access</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Terms of Service */}
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
                    <Lock className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-white mb-2">Terms of Service Agreement</h4>
                    <div className="bg-black/30 rounded-lg p-3 max-h-32 overflow-y-auto text-[10px] text-white/60 font-mono leading-relaxed">
                      <p>By accessing the Innova Ecosystem, you agree to:</p>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Comply with all decentralized network protocols</li>
                        <li>Maintain sole responsibility for your cryptographic identity</li>
                        <li>Accept that all on-chain transactions are immutable</li>
                        <li>Use the platform for lawful creative endeavors only</li>
                        <li>Indemnify Innova against misuse of your node credentials</li>
                      </ul>
                    </div>
                    <label className="flex items-center gap-3 mt-3 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={agreedToS}
                        onChange={(e) => setAgreedToS(e.target.checked)}
                        className="w-4 h-4 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0"
                      />
                      <span className="text-xs text-white/60 group-hover:text-white transition">I have read and agree to the Terms of Service</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Creator Guidelines */}
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                    <Fingerprint className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-white mb-2">Creator Guidelines Acknowledgment</h4>
                    <div className="bg-black/30 rounded-lg p-3 max-h-32 overflow-y-auto text-[10px] text-white/60 font-mono leading-relaxed">
                      <p>As a creator on Innova, you acknowledge:</p>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>All content must be original or properly licensed</li>
                        <li>Revenue splits are enforced via smart contracts</li>
                        <li>Platform takes 5% fee on all transactions</li>
                        <li>Disputes resolved through decentralized arbitration</li>
                        <li>Violations result in permanent node revocation</li>
                      </ul>
                    </div>
                    <label className="flex items-center gap-3 mt-3 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={agreedCreator}
                        onChange={(e) => setAgreedCreator(e.target.checked)}
                        className="w-4 h-4 rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500 focus:ring-offset-0"
                      />
                      <span className="text-xs text-white/60 group-hover:text-white transition">I acknowledge and accept the Creator Guidelines</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => {
                    localStorage.setItem('innova-legal-accepted', 'true');
                    setAppState('hub');
                    setShowLegal(false);
                    setAgreedToS(false);
                    setAgreedCreator(false);
                    executeConnectSetupWallet(claimedUsername);
                  }}
                  disabled={!agreedToS || !agreedCreator}
                  className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-black text-xs uppercase rounded-xl tracking-wider transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  ACCEPT & ENTER ECOSYSTEM
                </button>
              </div>
              
              <p className="text-[10px] text-white/30 text-center font-mono">
                Agreement recorded on Innova Ledger • Timestamp: {new Date().toISOString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {appState === 'activate' && (
        <DeviceActivation />
      )}

      {showSettings && wallet.address && (
        <IdentityWalletSettings 
          userNode={{
            handle: displayUsername,
            id: `NODE-${claimedUsername.toUpperCase()}`,
            name: `${claimedUsername.toUpperCase()}_CENTER`,
            wallet: wallet.address,
            avatarUrl: userAvatarUrl
          }}
          onClose={() => setShowSettings(false)}
          onAvatarUpdate={(url) => setUserAvatarUrl(url)}
        />
      )}
    </div>
  );
}

interface PlatformRouterProps {
  platformId: string;
  userNode: any;
  onBack: () => void;
  games: IndieGame[];
  setGames: React.Dispatch<React.SetStateAction<IndieGame[]>>;
  submissions: VideoSubmission[];
  setSubmissions: React.Dispatch<React.SetStateAction<VideoSubmission[]>>;
  projects: StreamShareProject[];
  setProjects: React.Dispatch<React.SetStateAction<StreamShareProject[]>>;
}

function PlatformRouter({ 
  platformId, 
  userNode, 
  onBack,
  games,
  setGames,
  submissions,
  setSubmissions,
  projects,
  setProjects
}: PlatformRouterProps) {
  if (platformId === 'archaven') return <ArcHavenDashboard userNode={userNode} onBack={onBack} submissions={submissions} setSubmissions={setSubmissions} />;
  if (platformId === 'hektic') return <HekticDashboard userNode={userNode} onBack={onBack} submissions={submissions} setSubmissions={setSubmissions} />;
  if (platformId === 'streamshare') return <StreamShareDashboard userNode={userNode} onBack={onBack} projects={projects} setProjects={setProjects} />;
  if (platformId === 'mvn') return <MVNDashboard userNode={userNode} onBack={onBack} submissions={submissions} setSubmissions={setSubmissions} />;
  if (platformId === 'kreation') return <KreationDashboard userNode={userNode} onBack={onBack} games={games} setGames={setGames} />;
  return null;
}