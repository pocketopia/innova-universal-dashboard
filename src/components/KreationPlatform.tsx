import React, { useState } from 'react';
import { 
  Gamepad2, 
  Upload, 
  ArrowLeft, 
  CheckCircle, 
  Clock, 
  Sparkles, 
  Play, 
  Zap, 
  ShieldCheck, 
  Layers, 
  Activity, 
  Info, 
  Coins,
  RefreshCw,
  Terminal
} from 'lucide-react';
import { IndieGame } from '../types';
import { submitGame } from '../lib/apiClient';

interface KreationPlatformProps {
  games: IndieGame[];
  setGames: React.Dispatch<React.SetStateAction<IndieGame[]>>;
  walletConnected: boolean;
  walletBalance: number;
  userNode?: { handle: string };
  onBackToHub: () => void;
}

export default function KreationPlatform({ 
  games, 
  setGames, 
  walletConnected, 
  walletBalance, 
  userNode,
  onBackToHub 
}: KreationPlatformProps) {
  
  // Game Creation States
  const [gameTitle, setGameTitle] = useState('');
  const [genre, setGenre] = useState('RPG');
  const [description, setDescription] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'completed'>('idle');
  
  // Feedback messages
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [activeGameToTest, setActiveGameToTest] = useState<IndieGame | null>(null);
  const [testProgress, setTestProgress] = useState(0);
  const [testLog, setTestLog] = useState<string[]>([]);
  const [isTesting, setIsTesting] = useState(false);

  // File picker simulation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      simulateUpload(file.name, (file.size / (1024 * 1024)).toFixed(1) + ' MB');
    }
  };

  const simulateUpload = (name: string, size: string) => {
    setFileName(name.toUpperCase());
    setFileSize(size);
    setUploadState('uploading');
    setUploadProgress(0);

    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploadState('completed');
          return 100;
        }
        return prev + 10;
      });
    }, 80);
  };

  // Drag and drop events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      simulateUpload(file.name, (file.size / (1024 * 1024)).toFixed(1) + ' MB');
    }
  };

  // Submit to the shared games list via API
  const handleSubmitGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameTitle || uploadState !== 'completed') return;

    try {
      const response = await submitGame({
        name: gameTitle,
        developer: userNode?.handle || '@USER',
        genre: genre,
        tags: ['INDIE', 'LIVE', genre.toUpperCase()],
        bannerUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=600',
        description: description || 'Interactive decentralized WASM target build.',
        systemRequirements: 'Innova Sandbox VM Container, 8GB RAM',
        status: 'Pending'
      });
      setGames(prev => [response, ...prev]);
      setSubmitSuccess(true);
      
      // reset form
      setGameTitle('');
      setDescription('');
      setFileName('');
      setFileSize('');
      setUploadState('idle');
      setUploadProgress(0);

      setTimeout(() => {
        setSubmitSuccess(false);
      }, 4000);
    } catch (err) {
      console.error('[API ERROR] Failed to submit game:', err);
      alert("Backend storage failed to register game matrix asset.");
    }
  };

  // Run virtual emulator sandbox test
  const handleLaunchSimulator = (game: IndieGame) => {
    setActiveGameToTest(game);
    setIsTesting(true);
    setTestProgress(0);
    setTestLog([
      'INITIALIZING WASM VIRTUAL MACHINE CORE...',
      `ATTACHING ENCRYPTED IMAGE BLOCK: ${game.id}`,
      `RECONSTRUCTING TORRENT SEGMENTS FROM LEDGER...`
    ]);

    const logs = [
      'SHARDS ACQUIRED // 100% COMPLETE',
      'COMPILED GAME BINARY RUNNING NATIVELY...',
      'ALLOCATING GPU THREADS ON SHARD CLIENT...',
      'EVM SIGNATURES VERIFIED VALID.',
      'SANDBOX REWARD SPLITS: STANDBY',
      'EMULATOR EXECUTED SUCCESSFULLY.'
    ];

    let logIdx = 0;
    const interval = setInterval(() => {
      setTestProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTestLog(prevLogs => [...prevLogs, 'SUCCESS // KREATION CORE OPERATIONAL.']);
          return 100;
        }
        if (prev % 20 === 0 && logIdx < logs.length) {
          setTestLog(prevLogs => [...prevLogs, logs[logIdx]]);
          logIdx++;
        }
        return prev + 5;
      });
    }, 150);
  };

  return (
    <div className="space-y-8 font-sans bg-[#050505] text-slate-100 min-h-screen pb-16 animate-fade-in relative z-10">
      
      {/* Platform Header Area */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="flex items-center gap-4">
          <button 
            id="back-btn-kreation"
            onClick={onBackToHub}
            className="cursor-pointer group flex items-center gap-2 bg-white/5 hover:bg-cyan-500/10 border border-white/10 hover:border-cyan-400/30 text-white hover:text-cyan-400 py-2.5 px-4 rounded-xl text-xs transition font-semibold"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition duration-200" />
            <span>← Back to Innova Hub</span>
          </button>
          
          <div className="h-8 w-px bg-white/10 hidden md:block" />
          
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 px-2.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-lg text-[9px] font-bold uppercase tracking-wider">DEV PORTAL</span>
              <h1 className="text-xl font-sans font-black tracking-wider text-white uppercase text-glow-cyan">THE INDIE VAULT</h1>
            </div>
            <p className="text-xs text-slate-400 font-sans font-style: normal font-light mt-0.5">High-fidelity playtesting and WASM deployment grid for decentralized games.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-right">
            <span className="text-[9px] text-slate-400 uppercase tracking-widest block font-bold">LEDGER WALLET</span>
            <span className="text-xs text-cyan-400 font-semibold">{walletConnected ? `${walletBalance.toLocaleString()} $INVA` : 'WALLET DISCONNECTED'}</span>
          </div>
        </div>
      </div>

      {/* Grid: Form/Upload (Left) & Emplator/Console (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: PUBLISH INTERFACE */}
        <div id="publish-card" className="lg:col-span-7 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 md:p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="space-y-6">
            <div className="flex items-center gap-2 pb-4 border-b border-white/5">
              <div className="p-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 rounded-xl">
                <Gamepad2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-sans font-black text-sm tracking-wider text-white uppercase">// SUBMIT DEVELOPMENT CONTAINER</h3>
                <p className="text-xs text-slate-400 font-sans font-light">Dispatches your game binaries directly to distributed storage pools.</p>
              </div>
            </div>

            <form onSubmit={handleSubmitGame} className="space-y-5">
              {/* Drag and Drop Zone Container */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block font-bold tracking-wider uppercase">BUILD COMPILATION PACKAGE</label>
                <p className="text-xs text-slate-400 font-sans font-light pb-2">Provide the compiled game binary for in-browser client compilation.</p>
              </div>

              {uploadState === 'idle' ? (
                <div 
                  id="dropzone-area"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className="border border-solid border-white/10 hover:border-cyan-400/40 rounded-xl p-8 text-center cursor-pointer transition bg-white/5 relative group"
                >
                  <input 
                    type="file" 
                    id="game_binary" 
                    className="hidden" 
                    onChange={handleFileChange}
                  />
                  <label htmlFor="game_binary" className="cursor-pointer space-y-3 block">
                    <div className="p-4 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-xl inline-block max-w-fit mx-auto transition group-hover:scale-105 duration-300">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-xs font-sans block text-slate-200 font-bold uppercase tracking-wider">Upload Game Binary & Assets</span>
                      <span className="text-[10px] text-slate-500 block font-sans mt-1">Saves build onto immutable storage. Max package payload ideal size: 1.2 GB</span>
                    </div>
                  </label>
                </div>
              ) : (
                <div className="bg-[#050505] p-5 rounded-xl border border-white/10 text-center space-y-4">
                  <div className="flex items-center justify-between text-[10px] font-sans text-slate-400">
                    <span className="truncate max-w-xs text-left font-bold text-slate-300">FILE: {fileName}</span>
                    <span className="font-sans font-black tracking-wider text-cyan-400">{uploadProgress}% SYNCED</span>
                  </div>

                  <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-white/5">
                    <div 
                      className="bg-gradient-to-r from-cyan-400 to-indigo-500 h-full transition-all duration-100" 
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>

                  {uploadState === 'uploading' ? (
                    <div className="flex items-center justify-center gap-1.5 text-xs text-cyan-400 font-sans animate-pulse">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Sharding and transmitting payload blocks...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-400 font-sans font-semibold">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Assets verified in-memory! System ready for ledger dispatch.</span>
                    </div>
                  )}
                </div>
              )}

              {/* Advanced info input cards fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1.5 font-bold tracking-wider">GAME HUB IDENTIFICATION NAME</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Chronicles of Neon Genesis v1.4"
                    value={gameTitle}
                    onChange={(e) => setGameTitle(e.target.value)}
                    className="w-full bg-[#050505] border border-white/10 text-white rounded-xl py-2.5 px-3.5 text-xs focus:outline-none focus:border-cyan-400 uppercase font-sans tracking-wide"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1.5 font-bold tracking-wider">GENRE MATRIX CLASSIFICATION</label>
                  <select 
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="w-full bg-[#050505] border border-white/10 text-white rounded-xl py-2.5 px-3.5 text-xs focus:outline-none focus:border-cyan-400 font-sans cursor-pointer"
                  >
                    <option value="Arcade">Arcade / Retro</option>
                    <option value="RPG">Action RPG</option>
                    <option value="Adventure">Metroidvania / Adventure</option>
                    <option value="Strategy">Decentralized Strategy</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1.5 font-bold tracking-wider">BRIEF SYNOPSIS DIRECTIVE</label>
                <textarea 
                  rows={2}
                  placeholder="Summarize the core mechanics, level features, and custom aesthetic attributes."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#050505] border border-white/10 text-white rounded-xl py-2.5 px-3.5 text-xs focus:outline-none focus:border-cyan-400 font-sans"
                />
              </div>

              {submitSuccess && (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>Submission added! Ready for Innova sandbox validation.</span>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={!gameTitle || uploadState !== 'completed'}
                  className={`w-full cursor-pointer py-3 px-6 rounded-xl text-xs transition duration-200 flex items-center justify-center gap-1.5 font-sans font-black tracking-wider uppercase ${
                    !gameTitle || uploadState !== 'completed'
                      ? 'bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed'
                      : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-lg shadow-cyan-500/20'
                  }`}
                >
                  <Zap className="w-4 h-4" />
                  Audit & Publish to Vault CMD
                </button>
              </div>

            </form>
          </div>

        </div>

        {/* RIGHT COLUMN: TESTING CONSOLE / INFO */}
        <div className="lg:col-span-5 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 flex flex-col justify-between shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="space-y-6">
            <div className="flex items-center gap-2 pb-4 border-b border-white/5">
              <Activity className="w-5 h-5 text-indigo-400 animate-pulse" />
              <div>
                <h3 className="font-sans font-black text-sm tracking-wider text-white uppercase">// WASM EMULATOR TESTING SYSTEM</h3>
                <p className="text-xs text-slate-400 font-sans font-light">Interactive sandbox layer to verify submitted assets before going LIVE.</p>
              </div>
            </div>

            {isTesting && activeGameToTest ? (
              <div className="bg-[#050505] border border-white/10 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-white/5 font-sans font-bold">
                  <span className="text-white uppercase">TESTING: {activeGameToTest.name}</span>
                  <span className="text-indigo-400">{testProgress}%</span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden">
                  <div 
                    className="bg-indigo-500 h-full transition-all duration-150"
                    style={{ width: `${testProgress}%` }}
                  />
                </div>

                {/* Simulated Ledger Logs Console */}
                <div className="bg-[#07070b] rounded-lg p-3.5 border border-white/5 font-mono text-[10px] text-indigo-300 space-y-1.5 min-h-[160px] max-h-[160px] overflow-y-auto select-text scrollbar-thin">
                  {testLog.map((log, index) => (
                    <div key={index} className="flex gap-2">
                      <span className="text-slate-600">[{index + 1}]</span>
                      <p className="leading-snug truncate">{log}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="text-[10px] text-slate-500 italic">Verify memory boundaries and frame cycles</span>
                  <button 
                    onClick={() => {
                      setIsTesting(false);
                      setActiveGameToTest(null);
                    }}
                    className="cursor-pointer bg-white/5 hover:bg-white/10 text-white border border-white/10 px-3 py-1.5 rounded-lg text-[10px] font-sans font-bold transition uppercase"
                  >
                    Exit Core
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-[#050505] border border-white/10 rounded-xl p-6 text-center space-y-3 flex flex-col items-center justify-center min-h-[260px]">
                <div className="p-3.5 bg-indigo-500/5 text-indigo-400 border border-indigo-500/10 rounded-2xl animate-pulse">
                  <Terminal className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase">SANDBOX CORE DEALLOCATED</h4>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed mt-1 font-sans font-light">
                    Select any submission from the list below and launch sandbox core to audit asset integrity.
                  </p>
                </div>
              </div>
            )}

            {/* General Benefits info widget */}
            <div className="bg-white/5 border border-cyan-500/10 rounded-xl p-4 flex gap-3 h-fit">
              <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-sans text-white block font-black uppercase">ZERO GAS WEB3 REWARDS</span>
                <span className="text-[11px] text-slate-300 leading-normal block mt-1 font-sans font-light">
                  Published projects automatically gain immediate eligibility for $INVA gaming rewards. Nodes download play sessions dynamically, paying out direct gasless micropayments directly into linked developer wallets.
                </span>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* BOTTOM SECTION: MY SUBMISSIONS ROW */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <h3 className="font-sans font-black text-sm tracking-wider text-cyan-400 uppercase">// My Submissions</h3>
          <span className="text-[10px] text-slate-500 font-bold uppercase">{games.length} PROJECTS DETECTED</span>
        </div>

        {/* Submissions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map((g) => {
            // Badges map
            let badgeStyle = "bg-amber-500/10 text-amber-400 border-amber-500/20";
            let statusLabel = "Pending Innova Approval";

            if (g.status === 'Approved') {
              badgeStyle = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
              statusLabel = "Approved";
            } else if ((g.status as string) === 'Live' || g.id === 'GAME-03') { // Make drift speedway or customized status LIVE in style!
              badgeStyle = "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
              statusLabel = "Live";
            }

            return (
              <div 
                key={g.id}
                id={`game-card-${g.id}`}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 hover:border-cyan-400/30 transition duration-300 shadow-xl flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono text-cyan-400 uppercase select-all font-semibold">{g.id}</span>
                    <span className={`inline-block px-2.5 py-0.5 rounded text-[9px] font-sans font-extrabold border ${badgeStyle}`}>
                      {statusLabel}
                    </span>
                  </div>

                  <h4 className="font-sans font-black text-sm text-white uppercase tracking-tight">{g.name}</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-sans font-light line-clamp-2">{g.description}</p>
                </div>

                <div className="pt-3.5 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-sans font-light">Genre: <strong className="text-slate-300 font-bold">{g.genre}</strong></span>
                  
                  <button
                    onClick={() => handleLaunchSimulator(g)}
                    className="cursor-pointer bg-[#050505] hover:bg-cyan-500 hover:text-black hover:border-cyan-400 border border-white/10 px-3 py-1.5 rounded-lg text-[10px] font-sans font-semibold transition flex items-center gap-1 uppercase"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    Test Sandbox Build
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
