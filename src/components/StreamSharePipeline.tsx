import React, { useState } from 'react';
import { 
  Share2, 
  Upload, 
  CheckCircle, 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  ShieldCheck, 
  MessageSquare, 
  User, 
  Coins, 
  Tv, 
  Play, 
  Sparkles,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { StreamShareProject } from '../types';

interface StreamSharePipelineProps {
  projects: StreamShareProject[];
  setProjects: React.Dispatch<React.SetStateAction<StreamShareProject[]>>;
  walletConnected: boolean;
  onBackToHub: () => void;
}

export default function StreamSharePipeline({ 
  projects, 
  setProjects, 
  walletConnected,
  onBackToHub 
}: StreamSharePipelineProps) {
  
  // Dual-persona state tracking
  const [persona, setPersona] = useState<'creator' | 'client'>('creator');
  
  // Creator Workspace states
  const [projectTitle, setProjectTitle] = useState('');
  const [clientId, setClientId] = useState('0x9a8f27e57cdbb72f0db824141c28c89fd314e82d');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedSize, setUploadedSize] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'completed'>('idle');

  // Client Inbox selection & modal review states
  const [selectedProject, setSelectedProject] = useState<StreamShareProject | null>(null);
  const [releasedProjectId, setReleasedProjectId] = useState<string | null>(null);
  const [releasingFunds, setReleasingFunds] = useState(false);

  // Simulated upload dispatcher
  const handleCreatorFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFileName(file.name.toUpperCase());
      setUploadedSize((file.size / (1024 * 1024)).toFixed(1) + ' MB');
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
    }
  };

  const handleCreatorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectTitle || !clientId || uploadState !== 'completed') return;

    const newProject: StreamShareProject = {
      id: 'PROJ-' + Date.now().toString().slice(-4),
      title: projectTitle.toUpperCase(),
      creatorId: '0x7cde882b3a99e15ce89f302b1c41257dfbb39fd1',
      clientId: clientId,
      assetUrl: uploadedFileName,
      fileSize: uploadedSize || '425 MB',
      status: 'awaiting_feedback',
      comments: [
        {
          id: 'c-' + Date.now(),
          author: '0x7cde882b3a99e15ce89f302b1c41257dfbb39fd1',
          text: 'Initial master clip render uploaded, signed, and locked inside client multisig preview vault.',
          timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
        }
      ]
    };

    setProjects(prev => [newProject, ...prev]);
    
    // Reset forms
    setProjectTitle('');
    setUploadedFileName('');
    setUploadedSize('');
    setUploadState('idle');
    setUploadProgress(0);
  };

  // Fund Release simulated mechanism
  const triggerApproveAndRelease = (projId: string) => {
    setReleasingFunds(true);
    setReleasedProjectId(projId);

    // Updates state of the project
    setTimeout(() => {
      setProjects(prev => prev.map(p => {
        if (p.id === projId) {
          return {
            ...p,
            status: 'approved_released'
          };
        }
        return p;
      }));
      setReleasingFunds(false);
      if (selectedProject?.id === projId) {
        setSelectedProject(prev => prev ? { ...prev, status: 'approved_released' } : null);
      }
    }, 1500);
  };

  return (
    <div className="space-y-8 font-sans bg-[#050505] text-slate-100 min-h-screen pb-16 animate-fade-in relative z-10">
      
      {/* Top Navigation Row Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="flex items-center gap-4">
          <button 
            id="back-btn-streamshare"
            onClick={onBackToHub}
            className="cursor-pointer group flex items-center gap-2 bg-white/5 hover:bg-amber-500/10 border border-white/10 hover:border-amber-400/30 text-white hover:text-amber-400 py-2.5 px-4 rounded-xl text-xs transition font-semibold"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition duration-200" />
            <span>← Back to Innova Hub</span>
          </button>
          
          <div className="h-8 w-px bg-white/10 hidden md:block" />
          
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 px-2.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg text-[9px] font-bold uppercase tracking-wider">SECURE B2B</span>
              <h1 className="text-xl font-sans font-black tracking-wider text-white uppercase text-glow-amber">STREAMSHARE CANVAS</h1>
            </div>
            <p className="text-xs text-slate-400 font-sans font-light mt-0.5">Encrypted creative-to-client master delivery pipelines and escrow release ledger.</p>
          </div>
        </div>

        {/* Prominent, stylish animated toggle switch at top center */}
        <div className="flex items-center justify-center">
          <div className="bg-white/5 p-1 rounded-xl border border-white/10 flex items-center gap-1">
            <button 
              id="toggle-creator-view"
              onClick={() => setPersona('creator')}
              className={`cursor-pointer px-4 py-2 rounded-lg text-xs font-sans font-bold transition duration-200 uppercase tracking-wider flex items-center gap-1.5 ${
                persona === 'creator'
                  ? 'bg-amber-500 text-black font-black shadow-md shadow-amber-500/15'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Creator Workspace
            </button>
            <button 
              id="toggle-client-view"
              onClick={() => setPersona('client')}
              className={`cursor-pointer px-4 py-2 rounded-lg text-xs font-sans font-bold transition duration-200 uppercase tracking-wider flex items-center gap-1.5 ${
                persona === 'client'
                  ? 'bg-amber-500 text-black font-black shadow-md shadow-amber-500/15'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Client Inbox
            </button>
          </div>
        </div>
      </div>

      {/* RENDER DUAL PERSANAS BASED ON ANIMATED SWITCH */}
      {persona === 'creator' ? (
        /* ================================ CREATOR VIEWPORT ================================ */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Creator form inputs card */}
          <div className="lg:col-span-7 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="space-y-6">
              <div className="flex items-center gap-2.5 pb-4 border-b border-white/5">
                <div className="p-2 bg-amber-500/10 text-amber-400 border border-amber-500/25 rounded-xl">
                  <Share2 className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-sans font-black text-sm tracking-wide text-white uppercase">// NEW DELIVERY PIPELINE DISPATCH</h3>
                  <p className="text-xs text-slate-400 font-sans font-light">Register cinematic master assets onto targeted client escrow accounts.</p>
                </div>
              </div>

              <form onSubmit={handleCreatorSubmit} className="space-y-5">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1.5 font-bold tracking-wider">PROJECT IDENTIFIER TITLE</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Cyber City Commercial Pitch"
                      value={projectTitle}
                      onChange={(e) => setProjectTitle(e.target.value)}
                      className="w-full bg-[#050505] border border-white/10 text-white rounded-xl py-2.5 px-3.5 text-xs focus:outline-none focus:border-amber-400 uppercase font-sans tracking-wide"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1.5 font-bold tracking-wider">TARGET CLIENT ID ADDR</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 0x9a8f27e57cdbb72f0db..."
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      className="w-full bg-[#050505] border border-white/10 text-white rounded-xl py-2.5 px-3.5 text-xs focus:outline-none focus:border-amber-400 font-mono tracking-wider text-glow-amber-light select-all"
                    />
                  </div>
                </div>

                {/* Dropzone field */}
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-400 block font-bold tracking-wider uppercase">cinematic asset payload source</label>
                  
                  {uploadState === 'idle' ? (
                    <div className="border border-solid border-white/10 hover:border-amber-400/40 rounded-xl p-8 text-center bg-white/5 relative cursor-pointer group">
                      <input 
                        type="file" 
                        id="creator_file_u" 
                        className="hidden" 
                        onChange={handleCreatorFileSelection}
                      />
                      <label htmlFor="creator_file_u" className="cursor-pointer space-y-2.5 block">
                        <div className="p-4 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl inline-block max-w-fit mx-auto transition group-hover:scale-105 duration-200">
                          <Upload className="w-5 h-5 animate-pulse" />
                        </div>
                        <div>
                          <span className="text-xs font-sans block text-slate-200 font-bold uppercase tracking-wider">Upload Delivery Package Assets</span>
                          <span className="text-[10px] text-slate-500 block font-sans mt-1">Accepts ProRes files, spatial audio containers, multi-track packages. Max load: 3.5 GB</span>
                        </div>
                      </label>
                    </div>
                  ) : (
                    <div className="bg-[#050505] p-5 rounded-xl border border-white/10 text-center space-y-4">
                      <div className="flex items-center justify-between text-[10px] font-sans text-slate-400">
                        <span className="truncate max-w-xs text-left font-bold text-slate-300">PROJECT DIRECTIVE: {uploadedFileName}</span>
                        <span className="font-sans font-black tracking-wider text-amber-400">{uploadProgress}% SHARED</span>
                      </div>

                      <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-white/5">
                        <div 
                          className="bg-gradient-to-r from-amber-500 to-amber-300 h-full transition-all duration-100" 
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>

                      {uploadState === 'uploading' ? (
                        <div className="flex items-center justify-center gap-1.5 text-xs text-amber-400 font-sans">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Generating ledger transaction mapping and uploading assets...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-400 font-sans font-semibold">
                          <ShieldCheck className="w-4 h-4" />
                          <span>Ledger upload finalized! Cryptographic hash recorded securely.</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={!projectTitle || uploadState !== 'completed' || !clientId}
                    className={`w-full cursor-pointer font-sans font-black py-3 px-6 rounded-xl text-xs transition duration-200 flex items-center justify-center gap-1.5 uppercase ${
                      !projectTitle || uploadState !== 'completed' || !clientId
                        ? 'bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed'
                        : 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/15'
                    }`}
                  >
                    <Coins className="w-4 h-4" />
                    Register delivery & dispatch pipeline
                  </button>
                </div>

              </form>
            </div>

          </div>

          {/* Creator pipelines state index overview */}
          <div className="lg:col-span-5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 flex flex-col justify-between shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="space-y-6">
              <div className="flex items-center gap-2.5 pb-4 border-b border-white/5">
                <FolderOpen className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-sans font-black text-xs tracking-widest text-white uppercase">// MY DISPATCHED DELIVERIES</h3>
                  <p className="text-xs text-slate-400 font-sans font-light">Monitor the review status of registered project deliverables.</p>
                </div>
              </div>

              {/* Creator active delivery list dashboard */}
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {projects.map((p) => (
                  <div key={p.id} className="bg-[#050505] rounded-xl border border-white/10 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono text-amber-400 select-all font-semibold uppercase">{p.id}</span>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-sans font-extrabold border ${
                        p.status === 'approved_released'
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                          : 'bg-amber-500/15 text-amber-400 border-amber-500/20 animate-pulse'
                      }`}>
                        {p.status === 'approved_released' ? 'FUNDS RELEASED' : 'AWAITING APPROVAL'}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-white uppercase font-sans tracking-tight">{p.title}</h4>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-white/5 pt-2 font-sans font-light">
                      <span>Size: <strong className="text-slate-200">{p.fileSize}</strong></span>
                      <span>Client ID: <strong className="text-slate-200 font-mono select-all text-[8px]">{p.clientId.slice(0, 10)}...</strong></span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl p-3.5 text-xs font-sans font-light leading-normal flex gap-2">
                <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
                <p>
                  Projects submitted here automatically configure multisig smart contract escrow logs. Funds are held in absolute trust and can only be triggered directly by the verified recipient Client.
                </p>
              </div>
            </div>

          </div>

        </div>
      ) : (
        /* ================================ CLIENT INBOX VIEWPORT ================================ */
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div>
              <h2 className="font-sans font-black text-sm tracking-wider text-amber-400 uppercase">// Incoming Deliveries Inbox</h2>
              <p className="text-xs text-slate-400 font-sans font-light mt-0.5">Audit creative submissions, send revision logs, and release multi-signature escrow balances.</p>
            </div>
            <span className="text-[10px] text-slate-500 font-bold uppercase">{projects.length} deliveries registered</span>
          </div>

          {/* Dual container: Projects Grid on Left, Review Panel on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* INCOMING GRID LIST (COL-span-7) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {projects.map((proj) => (
                  <div 
                    key={proj.id}
                    id={`client-proj-card-${proj.id}`}
                    className={`bg-white/5 border rounded-2xl p-5 hover:border-amber-400/30 transition duration-300 shadow-xl flex flex-col justify-between space-y-4 ${
                      selectedProject?.id === proj.id ? 'border-amber-500/30 bg-white/[0.08]' : 'border-white/10'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Cinematic Gradient Thumbnail Placeholder */}
                      <div className="relative h-28 rounded-lg bg-gradient-to-br from-slate-900 via-amber-950/40 to-slate-900 border border-white/10 flex items-center justify-center overflow-hidden">
                        <div className="absolute inset-0 bg-[#000]/60" />
                        <div className="relative flex flex-col items-center justify-center text-center p-3 space-y-1">
                          <Tv className="w-6 h-6 text-amber-400/50" />
                          <span className="text-[8px] font-mono text-slate-400 tracking-widest block uppercase font-bold">LEDGER IDENTIFIER: {proj.id}</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <h4 className="font-sans font-black text-xs text-white uppercase tracking-tight">{proj.title}</h4>
                        <div className="flex justify-between text-[10px] text-slate-400 font-sans font-light">
                          <span>Size: <strong className="text-slate-300">{proj.fileSize}</strong></span>
                          <span>Creator Address: <span className="text-slate-300 font-mono text-[8px] select-all">{proj.creatorId.slice(0, 10)}...</span></span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/5 flex items-center gap-2">
                      <button
                        onClick={() => setSelectedProject(proj)}
                        className="cursor-pointer flex-1 bg-white/5 hover:bg-white/10 border border-white/10 py-1.5 px-3 rounded-lg text-[10px] font-sans font-bold transition uppercase tracking-wider"
                      >
                        Review
                      </button>

                      {proj.status !== 'approved_released' ? (
                        <button
                          onClick={() => triggerApproveAndRelease(proj.id)}
                          disabled={releasingFunds && releasedProjectId === proj.id}
                          className="cursor-pointer flex-1 bg-amber-500 hover:bg-amber-400 text-black border border-amber-500/20 py-1.5 px-3 rounded-lg text-[10px] font-sans font-black transition uppercase tracking-wider flex items-center justify-center gap-1 shadow-md shadow-amber-500/10"
                        >
                          {releasingFunds && releasedProjectId === proj.id ? (
                            <>
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              <span>Releasing...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-3 h-3 text-current" />
                              <span>Release Funds</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="flex-1 bg-emerald-500/10 border border-emerald-500/25 py-1.5 px-3 rounded-lg text-[10px] text-emerald-400 font-sans font-black uppercase text-center tracking-wider">
                          ✓ Completed
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* EXPANDED REVIEW DIALOG PANEL (COL-span-5) */}
            <div className="lg:col-span-5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col justify-between">
              
              {selectedProject ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-white/10">
                    <span className="text-xs font-sans font-black tracking-wider text-white uppercase mb-1 block">active project audit review</span>
                    <span className="text-[9px] font-semibold text-amber-400 bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/25">{selectedProject.id}</span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase tracking-widest block font-bold mb-1">PROJECT NAME</span>
                      <h4 className="text-sm font-sans font-black text-white uppercase tracking-tight">{selectedProject.title}</h4>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs font-light">
                      <div className="bg-[#050505] p-3 rounded-xl border border-white/5">
                        <span className="text-[8px] text-slate-500 uppercase block font-semibold">CONTAINER FILENAME</span>
                        <span className="text-slate-200 block truncate font-mono mt-0.5">{selectedProject.assetUrl}</span>
                      </div>
                      <div className="bg-[#050505] p-3 rounded-xl border border-white/5">
                        <span className="text-[8px] text-slate-500 uppercase block font-semibold">MULTISIG DEPOSIT WALLET</span>
                        <span className="text-slate-200 block truncate font-mono mt-0.5 select-all">{selectedProject.clientId}</span>
                      </div>
                    </div>

                    {/* Timeline Comments block */}
                    <div className="space-y-2">
                      <span className="text-[9px] text-slate-500 uppercase tracking-widest block font-bold">Ledger Revision Logs & Comments</span>
                      
                      <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                        {selectedProject.comments.map((comment) => (
                          <div key={comment.id} className="bg-[#050505] border border-white/5 rounded-xl p-3 text-[11px] leading-relaxed font-sans font-light">
                            <div className="flex justify-between items-center text-[9px] font-semibold text-slate-400 mb-1">
                              <span className="text-amber-400 uppercase font-mono text-[8px] select-all">{comment.author.slice(0, 10)}...</span>
                              <span>{comment.timestamp}</span>
                            </div>
                            <p className="text-slate-200">{comment.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>

                  {selectedProject.status !== 'approved_released' ? (
                    <div className="pt-2 border-t border-white/5">
                      <button
                        onClick={() => triggerApproveAndRelease(selectedProject.id)}
                        disabled={releasingFunds && releasedProjectId === selectedProject.id}
                        className="cursor-pointer w-full bg-amber-500 hover:bg-amber-400 text-black font-sans font-black text-xs py-3 rounded-xl border border-amber-500/20 transition uppercase tracking-wider flex items-center justify-center gap-1 shadow-lg shadow-amber-500/10"
                      >
                        {releasingFunds && releasedProjectId === selectedProject.id ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Releasing Escrow Funds...</span>
                          </>
                        ) : (
                          <>
                            <Coins className="w-4 h-4" />
                            <span>Approve & Release Funds</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-4 flex gap-3 text-xs text-emerald-400 font-sans font-light leading-relaxed">
                      <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-white font-bold block uppercase mb-0.5 tracking-wider">ESCROW TRANSACTION COMPLETED</strong>
                        Multisig signature successfully broadcasted to block ledger. Funds released directly to creator wallet.
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                <div className="text-center py-12 space-y-4 font-sans font-light">
                  <div className="p-4 bg-slate-900 border border-white/5 rounded-2xl max-w-fit mx-auto text-slate-500">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">No Delivery Selected</h4>
                    <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed mt-1">
                      Check any items from the incoming deliveries matrix on the left and select "Review" to audit file details.
                    </p>
                  </div>
                </div>
              )}

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
