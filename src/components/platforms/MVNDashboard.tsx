import React, { useState } from 'react';
import {
  Music,
  Film,
  ChevronLeft,
  Clock,
  BarChart3,
  Lock,
  ExternalLink,
  Info
} from 'lucide-react';

interface MusicVideoSubmission {
  id: string;
  songTitle: string;
  primaryArtist: string;
  status: 'draft' | 'pending_qc' | 'qc_passed' | 'syndicated' | 'flagged' | 'rejected';
  submittedAt: string;
  thumbnail?: string;
}

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
  const displaySubmissions = submissions;

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

      {/* Submit Music Informational Modal */}
      {showSubmitInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-[#0a0a0f] border border-amber-500/30 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Info className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-wider">Music Submission</h3>
                  <p className="text-xs text-amber-400/70">External submission portal</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                <p className="text-sm text-white/80 leading-relaxed">
                  Do you want to submit your music?
                </p>
              </div>
              
              <div className="text-center py-4">
                <p className="text-xs text-slate-400 mb-2">Visit our submission portal at:</p>
                <a 
                  href="https://innova.eco" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white px-6 py-3 rounded-xl text-sm font-bold transition"
                >
                  <span>innova.eco</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
              
              <p className="text-[10px] text-slate-500 text-center">
                All music submissions are processed through our external platform.
              </p>
            </div>
            
            <div className="p-4 border-t border-white/10">
              <button 
                onClick={() => setShowSubmitInfo(false)}
                className="w-full bg-white/5 hover:bg-white/10 text-white py-2.5 rounded-xl text-xs font-bold transition"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}