import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Gamepad2, 
  Film, 
  Tv, 
  Database, 
  Layers, 
  CheckCircle2, 
  XCircle, 
  Terminal, 
  Plus, 
  RefreshCw, 
  ArrowLeft, 
  Check, 
  X, 
  FileVideo,
  ExternalLink,
  Lock,
  Search,
  Activity,
  Music,
  Coins,
  Send,
  Wallet,
  Zap
} from 'lucide-react';
import { IndieGame, VideoSubmission } from '../types';
import { API_BASE_URL } from '../lib/apiClient';

interface AdminDashboardProps {
  userNode: { handle: string; id: string; name: string; wallet: string };
  onBack: () => void;
  games: IndieGame[];
  setGames: React.Dispatch<React.SetStateAction<IndieGame[]>>;
  submissions: VideoSubmission[];
  setSubmissions: React.Dispatch<React.SetStateAction<VideoSubmission[]>>;
  activeInboxes: string[];
  setActiveInboxes: React.Dispatch<React.SetStateAction<string[]>>;
  adminLogs: string[];
  setAdminLogs: React.Dispatch<React.SetStateAction<string[]>>;
}

// MVN Media Item interface for parsing from port 3005 endpoint
interface MVNMediaItem {
  id: string;
  tenant: string;
  status: string;
  trackTitle: string;
  artistName: string;
  featuredArtists?: string;
  genre?: string;
  duration?: string;
  submittedAt: string;
  directorName?: string;
  labelPublisher?: string;
}

export default function AdminDashboard({
  userNode,
  onBack,
  games,
  setGames,
  submissions,
  setSubmissions,
  activeInboxes,
  setActiveInboxes,
  adminLogs,
  setAdminLogs
}: AdminDashboardProps) {
  const [activePlatformFilter, setActivePlatformFilter] = useState<string>('all');
  const [notif, setNotif] = useState<string | null>(null);
  const [mvnMediaItems, setMvnMediaItems] = useState<MVNMediaItem[]>([]);
  const [isLoadingMvn, setIsLoadingMvn] = useState(false);
  const [airdropAddress, setAirdropAddress] = useState('');
  const [airdropAmount, setAirdropAmount] = useState<number>(25000);
  const [isAirdropping, setIsAirdropping] = useState(false);
  const [showAirdropPanel, setShowAirdropPanel] = useState(false);

  const triggerNotification = (msg: string) => {
    setNotif(msg);
    setTimeout(() => setNotif(null), 3000);
  };

  const logAction = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setAdminLogs(prev => [`[${time}] ${msg}`, ...prev]);
  };

  // Fetch MVN media items from port 3005 endpoint
  useEffect(() => {
    const fetchMvnMediaItems = async () => {
      if (!activeInboxes.includes('mvn')) return;
      
      setIsLoadingMvn(true);
      try {
        // Query the endpoint tracking port 3005 with correct headers
        const session = {
          userName: localStorage.getItem('innova-username') || '',
          hardwareSignature: localStorage.getItem('innova-hardware-sig') || '',
          walletAddress: localStorage.getItem('innova-wallet-address') || '',
        };
        
        const headers: Record<string, string> = {
          'x-tenant-id': 'MVN',
        };
        
        if (session.userName) {
          headers['x-user-name'] = session.userName;
          headers['x-hardware-signature'] = session.hardwareSignature || 'demo_signature';
          headers['x-wallet-address'] = session.walletAddress || '0x0';
        }

        const response = await fetch(`${API_BASE_URL}/content`, { headers });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch MVN items: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Parse items where status === 'pending' and match MVN criteria
        // Match both text formats: tenant === 'MVN' or ID prefix starting with 'MVN-'
        const mvnItems = data.filter((item: any) => {
          const isPending = item.status === 'pending' || item.status === 'Pending';
          const isMvnTenant = item.tenant === 'MVN' || item.tenant === 'Mvn';
          const hasMvnPrefix = item.id && item.id.startsWith('MVN-');
          return isPending && (isMvnTenant || hasMvnPrefix);
        });
        
        // Normalize the data mapper loop to build clean metadata display
        const normalizedItems: MVNMediaItem[] = mvnItems.map((item: any) => ({
          id: item.id || `MVN-${Date.now()}`,
          tenant: item.tenant || 'MVN',
          status: item.status || 'pending',
          trackTitle: item.trackTitle || item.title || item.songTitle || 'Unknown Track',
          artistName: item.artistName || item.artist || item.primaryArtist || item.creator || 'Unknown Artist',
          featuredArtists: item.featuredArtists || item.featured_artists,
          genre: item.genre,
          duration: item.duration,
          submittedAt: item.submittedAt || item.createdAt || new Date().toISOString(),
          directorName: item.directorName || item.director,
          labelPublisher: item.labelPublisher || item.label,
        }));
        
        setMvnMediaItems(normalizedItems);
        logAction(`MVN SYNC: Loaded ${normalizedItems.length} pending broadcast submissions from port 3005`);
      } catch (error) {
        console.error('[MVN FETCH ERROR]', error);
        logAction(`MVN SYNC ERROR: ${error instanceof Error ? error.message : 'Unknown error fetching MVN items'}`);
      } finally {
        setIsLoadingMvn(false);
      }
    };

    fetchMvnMediaItems();
  }, [activeInboxes]);

  // Handler for MVN submission verification - syncs back to port 3005
  const handleAirdrop = async () => {
    if (!airdropAddress) {
      triggerNotification('Please enter a wallet address.');
      return;
    }
    setIsAirdropping(true);
    try {
      const response = await fetch(`${API_BASE_URL}/wallet/mint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: airdropAmount, walletAddress: airdropAddress, paymentMethod: 'admin_airdrop' })
      });
      if (!response.ok) throw new Error('Airdrop failed');
      logAction(`TREASURY GRANT: Airdropped ${airdropAmount} $INVA to ${airdropAddress.slice(0,6)}...`);
      triggerNotification(`Successfully granted ${airdropAmount} $INVA!`);
      setAirdropAddress('');
    } catch (error) {
      console.error(error);
      triggerNotification('Airdrop failed. Check logs.');
    } finally {
      setIsAirdropping(false);
    }
  };

  const handleVerifyMvnSubmission = async (itemId: string, trackTitle: string, approve: boolean) => {
    try {
      // Dispatch live network update status layer string
      const response = await fetch(`${API_BASE_URL}/content/${itemId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'MVN'
        },
        body: JSON.stringify({ status: approve ? 'approved' : 'rejected' })
      });

      if (!response.ok) throw new Error(`HTTP Error status code line: ${response.status}`);

      // Update your local view array matrices cleanly upon completion
      setMvnMediaItems(prev => prev.filter(item => item.id !== itemId));

      logAction(`MVN AUDIT COMPLETE: Track "${trackTitle}" successfully ${approve ? 'APPROVED AND PROMOTED TO BROADCAST FEED' : 'REJECTED'}`);
      triggerNotification(`MVN track ${approve ? 'approved' : 'rejected'} successfully.`);
    } catch (error) {
      console.error('[MVN AUDIT UPDATE ERROR]', error);
      logAction(`MVN AUDIT ERROR: Failed dispatching verification parameters to Master Brain.`);
    }
  };

  const handleCreateInbox = (platformId: string, platformName: string) => {
    if (activeInboxes.includes(platformId)) return;
    setActiveInboxes(prev => [...prev, platformId]);
    logAction(`LEDGER SUCCESS: Activated secure audit inbox for ${platformName}`);
    triggerNotification(`Inbox created for ${platformName}!`);
  };

  const handleVerifyGame = (gameId: string, name: string, approve: boolean) => {
    setGames(prev => prev.map(g => {
      if (g.id === gameId) {
        return { 
          ...g, 
          status: approve ? 'Approved' : 'Denied',
          notes: approve ? 'Verified and approved by System Admin.' : 'Declined under compliance policy check.'
        };
      }
      return g;
    }));
    logAction(`AUDIT COMPLETE: Game "${name}" status updated to ${approve ? 'APPROVED' : 'DENIED'}`);
    triggerNotification(`Game ${approve ? 'approved' : 'denied'} successfully.`);
  };

  const handleVerifySubmission = (subId: string, title: string, approve: boolean) => {
    setSubmissions(prev => prev.map(s => {
      if (s.id === subId) {
        return {
          ...s,
          status: approve ? 'Success' : 'Issue',
          currentStep: approve ? 'Scheduled for Distribution' : 'Quality Control'
        };
      }
      return s;
    }));
    logAction(`AUDIT COMPLETE: Film "${title}" status updated to ${approve ? 'SUCCESS (SCHEDULED)' : 'ISSUE (FLAGGED)'}`);
    triggerNotification(`Film project ${approve ? 'verified' : 'flagged'}.`);
  };

  // Filter lists based on inbox status
  const pendingGames = games.filter(g => g.status === 'Pending' || g.status === 'Denied' || g.status === 'Approved');
  const pendingSubmissions = submissions.filter(s => s.status === 'Pending' || s.status === 'Success' || s.status === 'Issue');

  const platforms = [
    { id: 'kreation', name: 'Kreation Gaming', label: 'Games', color: '#A855F7', icon: Gamepad2 },
    { id: 'hektic', name: 'Hektic TV', label: 'Broadcasts', color: '#4F46E5', icon: Database },
    { id: 'archaven', name: 'ArcHaven Cinema', label: 'Cinematic', color: '#06B6D4', icon: Film },
    { id: 'mvn', name: 'Music Video Network', label: 'Acoustics', color: '#F59E0B', icon: Tv }
  ];

  return (
    <div className="flex h-screen bg-[#030306] text-white overflow-hidden font-sans relative select-none">
      {/* Background Grids */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none z-0" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-500/[0.02] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-amber-500/[0.02] rounded-full blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="flex-1 flex flex-col z-10 relative overflow-hidden h-full max-w-7xl mx-auto p-6 md:p-8 space-y-6">
        
        {/* Header Bar */}
        <header className="flex justify-between items-center pb-6 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl animate-pulse">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono tracking-widest text-red-500 font-bold bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 rounded-full">
                  ROOT SYSTEM COMMAND DECK
                </span>
                <span className="text-white/40 font-mono text-[10px]">v2.1</span>
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white uppercase mt-1">ADMIN CONSOLE</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs text-white/50">AUTHORIZED OPERATOR</span>
              <span className="text-sm font-bold text-red-400">@{userNode.handle.toUpperCase()}</span>
            </div>
            <button 
              onClick={onBack}
              className="cursor-pointer bg-white/5 hover:bg-white/10 border border-white/10 px-5 py-3 rounded-xl text-xs font-bold transition flex items-center gap-2 hover:border-white/20 active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" /> BACK TO ECOSYSTEM HUB
            </button>
          </div>
        </header>

        {/* Notifications toast */}
        {notif && (
          <div className="fixed top-6 right-6 bg-red-950/90 border border-red-500/30 text-white font-sans text-sm px-6 py-4 rounded-2xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-red-400 shrink-0" />
            <span className="font-bold tracking-tight">{notif}</span>
          </div>
        )}

        {/* Dynamic Grid Layout */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 overflow-hidden">
          
          {/* Left Column: Platform Inbox Setup Controls */}
          <div className="lg:col-span-1 bg-white/[0.02] border border-white/5 rounded-3xl p-5 flex flex-col justify-between overflow-y-auto space-y-6">
            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-sm tracking-widest text-white/40 uppercase mb-3">// INBOX PROVISIONING</h3>
                <p className="text-xs text-white/60 leading-relaxed font-light">
                  Active nodes require secure ledger inboxes to buffer and inspect incoming content submissions before publishing.
                </p>
              </div>

              {/* Provisioning Cards */}
              <div className="space-y-3">
                {platforms.map(plat => {
                  const isActive = activeInboxes.includes(plat.id);
                  const Icon = plat.icon;
                  return (
                    <div 
                      key={plat.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isActive 
                          ? 'bg-white/[0.02] border-white/10' 
                          : 'bg-red-500/[0.01] border-red-500/10 hover:border-red-500/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-lg bg-white/5 text-white/70" style={{ color: isActive ? plat.color : 'rgba(255,255,255,0.4)' }}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-bold text-white">{plat.name}</span>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {isActive ? 'ACTIVE' : 'OFFLINE'}
                        </span>
                      </div>

                      {!isActive ? (
                        <button 
                          onClick={() => handleCreateInbox(plat.id, plat.name)}
                          className="w-full py-2 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/20 rounded-xl text-[10px] font-bold tracking-wider uppercase transition active:scale-95 flex items-center justify-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" /> CREATE INGEST INBOX
                        </button>
                      ) : (
                        <div className="text-[10px] text-white/40 font-mono flex items-center justify-between px-1">
                          <span>SYNC RATE:</span>
                          <span className="font-bold text-emerald-400 flex items-center gap-1">
                            <Activity className="w-3 h-3 text-emerald-400 animate-pulse" /> 100% SECURE
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          {/* Total Counters */}
          <div className="bg-red-500/5 border border-red-500/10 p-4 rounded-2xl space-y-3 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-white/40">GAMES PENDING:</span>
              <span className="font-bold text-white">{games.filter(g => g.status === 'Pending').length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">FILMS PENDING:</span>
              <span className="font-bold text-white">{submissions.filter(s => s.status === 'Pending').length}</span>
            </div>
            <div className="flex justify-between border-t border-white/5 pt-2">
              <span className="text-red-400 font-bold">TOTAL VERIFIED:</span>
              <span className="font-bold text-white">
                {games.filter(g => g.status === 'Approved').length + submissions.filter(s => s.status === 'Success').length}
              </span>
            </div>
          </div>

          {/* Treasury Airdrop Panel */}
          <div className="bg-emerald-500/5 border border-emerald-500/10 p-5 rounded-3xl flex flex-col space-y-4">
            <div>
              <h3 className="font-bold text-sm tracking-widest text-emerald-400 uppercase">// FOUNDER GRANTS</h3>
              <p className="text-[10px] text-emerald-400/60 mt-1 leading-relaxed">Mint and airdrop $INVA treasury funds to beta testers.</p>
            </div>
            <div className="space-y-3">
              <input 
                type="text" 
                value={airdropAddress}
                onChange={(e) => setAirdropAddress(e.target.value)}
                placeholder="0x... Wallet Address" 
                className="w-full bg-black/40 border border-emerald-500/20 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-white/20 focus:outline-none focus:border-emerald-500/50 transition" 
              />
              <div className="flex gap-2">
                <input 
                  type="number" 
                  value={airdropAmount}
                  onChange={(e) => setAirdropAmount(Number(e.target.value))}
                  className="w-24 bg-black/40 border border-emerald-500/20 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500/50 transition text-center" 
                />
                <button 
                  onClick={handleAirdrop}
                  disabled={isAirdropping || !airdropAddress}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-black text-[10px] uppercase rounded-xl transition flex items-center justify-center gap-1.5 active:scale-95"
                >
                  {isAirdropping ? <RefreshCw className="w-3 h-3 animate-spin"/> : <Zap className="w-3 h-3"/>}
                  SEND GRANT
                </button>
              </div>
            </div>
          </div>
          </div>

          {/* Center Column: Auditing Inboxes */}
          <div className="lg:col-span-3 bg-white/[0.01] border border-white/5 rounded-3xl p-6 flex flex-col overflow-hidden space-y-6">
            
            {/* Inbox header / filters */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-white/5 pb-4 shrink-0">
              <div>
                <h2 className="text-lg font-black tracking-wider uppercase">// PLATFORM VERIFICATION QUEUES</h2>
                <p className="text-xs text-white/50 font-light">Inspect dev builds, master resolutions, camera logs, and licensing terms.</p>
              </div>

              {/* Filters */}
              <div className="flex gap-2 bg-white/5 p-1 rounded-xl border border-white/10 text-xs shrink-0 self-start">
                <button 
                  onClick={() => setActivePlatformFilter('all')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${activePlatformFilter === 'all' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white'}`}
                >
                  ALL QUEUES
                </button>
                {platforms.map(p => (
                  <button 
                    key={p.id}
                    onClick={() => setActivePlatformFilter(p.id)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                      activePlatformFilter === p.id ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Unified Scrollable Queue list */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              
              {/* If no inboxes active */}
              {activeInboxes.length === 0 && (
                <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
                  <Lock className="w-10 h-10 text-red-500/40" />
                  <div>
                    <h4 className="font-bold text-lg">No Active Verification Inboxes</h4>
                    <p className="text-sm text-white/40 max-w-sm mx-auto mt-1 font-light">
                      Please provision ledger audit inboxes in the left pane to start indexing game assets and video metadata feeds.
                    </p>
                  </div>
                </div>
              )}

              {/* Kreation Inbox */}
              {activeInboxes.includes('kreation') && (activePlatformFilter === 'all' || activePlatformFilter === 'kreation') && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <span className="text-[10px] font-mono tracking-widest text-[#A855F7] font-bold">KREATION GAMES FEED</span>
                    <span className="text-[9px] font-mono text-white/40">{games.length} ATTESTATIONS LOADED</span>
                  </div>

                  {games.length === 0 ? (
                    <p className="text-xs text-white/40 text-center py-6">No games submitted to audit ledger yet.</p>
                  ) : (
                    games.map(game => (
                      <div key={game.id} className="bg-white/[0.02] hover:bg-white/[0.04] border border-white/10 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono px-2 py-0.5 bg-purple-500/10 text-[#A855F7] rounded-md border border-purple-500/20 font-bold">GAME</span>
                            <h4 className="font-extrabold text-white text-base tracking-tight">{game.name}</h4>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-xs text-white/55 font-light">
                            <div>Developer: <strong className="text-white font-medium">{game.developer}</strong></div>
                            <div>Genre: <strong className="text-white font-medium">{game.genre}</strong></div>
                            <div>Submitted: <strong className="text-white font-medium">{game.submittedAt}</strong></div>
                            <div>System: <strong className="text-white font-medium truncate inline-block max-w-[120px]" title={game.systemRequirements}>{game.systemRequirements}</strong></div>
                          </div>
                          <p className="text-[11px] text-white/40 leading-relaxed font-light mt-1 max-w-2xl">{game.description}</p>
                        </div>

                        {/* Audit action buttons */}
                        <div className="shrink-0 flex items-center gap-3">
                          {game.status === 'Pending' ? (
                            <>
                              <button 
                                onClick={() => handleVerifyGame(game.id, game.name, false)}
                                className="cursor-pointer px-4 py-2.5 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold uppercase tracking-wide transition flex items-center gap-1 active:scale-95"
                              >
                                <XCircle className="w-4 h-4" /> BLOCK
                              </button>
                              <button 
                                onClick={() => handleVerifyGame(game.id, game.name, true)}
                                className="cursor-pointer px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-xs font-black uppercase tracking-wide transition flex items-center gap-1 shadow-lg shadow-emerald-500/10 active:scale-95"
                              >
                                <CheckCircle2 className="w-4 h-4" /> APPROVE
                              </button>
                            </>
                          ) : (
                            <span className={`px-4 py-2 rounded-xl text-xs font-bold border ${
                              game.status === 'Approved' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20'
                            }`}>
                              {game.status.toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Hektic, ArcHaven, and MVN Cinema Inboxes */}
              {['hektic', 'archaven', 'mvn'].map(platId => {
                const plat = platforms.find(p => p.id === platId)!;
                const inboxActive = activeInboxes.includes(platId);
                const filterMatch = activePlatformFilter === 'all' || activePlatformFilter === platId;

                if (!inboxActive || !filterMatch) return null;

                // Match submissions belonging to this platform's channel
                const matchedSubs = submissions.filter(s => {
                  return s.selectedChannels.some(channel => {
                    const cleanChannel = channel.toUpperCase().replace(' ', '');
                    const cleanPlatName = plat.name.toUpperCase().replace(' ', '');
                    return cleanChannel.includes(plat.id.toUpperCase()) || cleanChannel.includes(cleanPlatName);
                  });
                });

                return (
                  <div key={platId} className="space-y-4 pt-4 border-t border-white/5">
                    <div className="flex items-center justify-between px-2">
                      <span className="text-[10px] font-mono tracking-widest font-bold" style={{ color: plat.color }}>
                        {plat.name.toUpperCase()} AUDIO-VISUAL FEED
                      </span>
                      <span className="text-[9px] font-mono text-white/40">{matchedSubs.length} ATTRIBUTIONS INDEXED</span>
                    </div>

                    {matchedSubs.length === 0 ? (
                      <p className="text-xs text-white/40 text-center py-6">No cinematic uploads submitted to this channel.</p>
                    ) : (
                      matchedSubs.map(sub => (
                        <div key={sub.id} className="bg-white/[0.02] hover:bg-white/[0.04] border border-white/10 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono px-2 py-0.5 bg-indigo-500/10 rounded-md border border-indigo-500/20 font-bold" style={{ color: plat.color }}>MEDIA</span>
                              <h4 className="font-extrabold text-white text-base tracking-tight">{sub.title}</h4>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-xs text-white/55 font-light">
                              <div>Director: <strong className="text-white font-medium">{sub.creator}</strong></div>
                              <div>Resolution: <strong className="text-white font-medium">{sub.resolution}</strong></div>
                              <div>Camera: <strong className="text-white font-medium">{sub.camera}</strong></div>
                              <div>Submitted: <strong className="text-white font-medium">{sub.submittedAt}</strong></div>
                            </div>
                            <div className="text-[10px] font-mono text-white/40">
                              CHANNELS TARGETED: <strong className="text-indigo-300 font-semibold">{sub.selectedChannels.join(' & ')}</strong>
                            </div>
                          </div>

                          {/* Audit actions */}
                          <div className="shrink-0 flex items-center gap-3">
                            {sub.status === 'Pending' ? (
                              <>
                                <button 
                                  onClick={() => handleVerifySubmission(sub.id, sub.title, false)}
                                  className="cursor-pointer px-4 py-2.5 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold uppercase tracking-wide transition flex items-center gap-1 active:scale-95"
                                >
                                  <XCircle className="w-4 h-4" /> BLOCK
                                </button>
                                <button 
                                  onClick={() => handleVerifySubmission(sub.id, sub.title, true)}
                                  className="cursor-pointer px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-xs font-black uppercase tracking-wide transition flex items-center gap-1 shadow-lg shadow-emerald-500/10 active:scale-95"
                                >
                                  <CheckCircle2 className="w-4 h-4" /> VERIFY
                                </button>
                              </>
                            ) : (
                              <span className={`px-4 py-2 rounded-xl text-xs font-bold border ${
                                sub.status === 'Success' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20'
                              }`}>
                                {sub.status === 'Success' ? 'APPROVED' : 'FLAGGED'}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                );
              })}

              {/* MVN Broadcast Submissions from Port 3005 */}
              {activeInboxes.includes('mvn') && (activePlatformFilter === 'all' || activePlatformFilter === 'mvn') && (
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <div className="flex items-center justify-between px-2">
                    <span className="text-[10px] font-mono tracking-widest font-bold" style={{ color: '#F59E0B' }}>
                      MVN BROADCAST SUBMISSIONS (PORT 3005)
                    </span>
                    <span className="text-[9px] font-mono text-white/40">
                      {isLoadingMvn ? 'SYNCING...' : `${mvnMediaItems.length} MVN ITEMS INDEXED`}
                    </span>
                  </div>

                  {isLoadingMvn && (
                    <div className="flex items-center justify-center py-8">
                      <div className="flex items-center gap-3 text-amber-400">
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span className="text-xs font-bold">SYNCING MVN BROADCAST FEED...</span>
                      </div>
                    </div>
                  )}

                  {!isLoadingMvn && mvnMediaItems.length === 0 ? (
                    <p className="text-xs text-white/40 text-center py-6">No pending MVN broadcast submissions from port 3005.</p>
                  ) : (
                    mvnMediaItems.filter(item => item.status === 'pending').map(item => (
                      <div key={item.id} className="bg-white/[0.02] hover:bg-white/[0.04] border border-amber-500/20 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono px-2 py-0.5 bg-amber-500/10 rounded-md border border-amber-500/20 font-bold" style={{ color: '#F59E0B' }}>
                              MVN BROADCAST SUBMISSION
                            </span>
                            <h4 className="font-extrabold text-white text-base tracking-tight">{item.trackTitle}</h4>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-xs text-white/55 font-light">
                            <div>Artist: <strong className="text-white font-medium">{item.artistName}</strong></div>
                            {item.featuredArtists && <div>Featured: <strong className="text-white font-medium">{item.featuredArtists}</strong></div>}
                            {item.genre && <div>Genre: <strong className="text-white font-medium">{item.genre}</strong></div>}
                            {item.duration && <div>Duration: <strong className="text-white font-medium">{item.duration}</strong></div>}
                            {item.directorName && <div>Director: <strong className="text-white font-medium">{item.directorName}</strong></div>}
                            {item.labelPublisher && <div>Label: <strong className="text-white font-medium">{item.labelPublisher}</strong></div>}
                            <div>Submitted: <strong className="text-white font-medium">{new Date(item.submittedAt).toLocaleDateString()}</strong></div>
                          </div>
                          <div className="text-[10px] font-mono text-amber-400/60">
                            ID: <strong className="text-amber-400">{item.id}</strong>
                          </div>
                        </div>

                        {/* Audit actions */}
                        <div className="shrink-0 flex items-center gap-3">
                          <button 
                            onClick={() => handleVerifyMvnSubmission(item.id, item.trackTitle, false)}
                            className="cursor-pointer px-4 py-2.5 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold uppercase tracking-wide transition flex items-center gap-1 active:scale-95"
                          >
                            <XCircle className="w-4 h-4" /> REJECT
                          </button>
                          <button 
                            onClick={() => handleVerifyMvnSubmission(item.id, item.trackTitle, true)}
                            className="cursor-pointer px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-xs font-black uppercase tracking-wide transition flex items-center gap-1 shadow-lg shadow-emerald-500/10 active:scale-95"
                          >
                            <CheckCircle2 className="w-4 h-4" /> APPROVE
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

            </div>

            {/* Bottom Realtime Logs terminal */}
            <div className="bg-[#020204] border border-white/10 rounded-2xl p-4 h-40 flex flex-col overflow-hidden font-mono shrink-0">
              <div className="flex items-center gap-2 pb-2 border-b border-white/10 text-[10px] text-white/40 uppercase tracking-widest font-bold">
                <Terminal className="w-3.5 h-3.5 text-red-500" />
                <span>Real-Time Audit Ledger Logs feed</span>
              </div>
              <div className="flex-1 overflow-y-auto text-[11px] text-white/55 space-y-1.5 pt-3 pr-1">
                {adminLogs.map((log, i) => (
                  <div key={i} className="leading-relaxed hover:text-white transition-colors">{log}</div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
