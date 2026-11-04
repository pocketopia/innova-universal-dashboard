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
    songTitle: 'CRIMSON FREQUENCY (8K SPATIAL MASTER)',
    primaryArtist: '@SOVEREIGN_AUDIO',
    genre: 'Industrial Bass / Hyper-Synth',
    duration: '3:42',
    status: 'syndicated',
    submittedAt: '2026-08-14',
    thumbnail: 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%221280%22%20height%3D%22720%22%20viewBox%3D%220%200%201280%20720%22%3E%0A%20%20%20%20%20%20%3Cdefs%3E%0A%20%20%20%20%20%20%20%20%3CradialGradient%20id%3D%22g%22%20cx%3D%2250%25%22%20cy%3D%2220%25%22%20r%3D%2280%25%22%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%23f59e0b%22%20stop-opacity%3D%220.45%22/%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cstop%20offset%3D%2260%25%22%20stop-color%3D%22%23090004%22%20stop-opacity%3D%220.95%22/%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%23020001%22%20stop-opacity%3D%221%22/%3E%0A%20%20%20%20%20%20%20%20%3C/radialGradient%3E%0A%20%20%20%20%20%20%3C/defs%3E%0A%20%20%20%20%20%20%3Crect%20width%3D%221280%22%20height%3D%22720%22%20fill%3D%22%23030001%22/%3E%0A%20%20%20%20%20%20%3Crect%20width%3D%221280%22%20height%3D%22720%22%20fill%3D%22url%28%23g%29%22/%3E%0A%20%20%20%20%20%20%3Crect%20x%3D%2228%22%20y%3D%2228%22%20width%3D%221224%22%20height%3D%22664%22%20fill%3D%22none%22%20stroke%3D%22%23f59e0b%22%20stroke-width%3D%223%22%20stroke-opacity%3D%220.75%22/%3E%0A%20%20%20%20%20%20%3Cpath%20d%3D%22M28%20110%20H1252%20M28%20610%20H1252%22%20stroke%3D%22%23f59e0b%22%20stroke-width%3D%221%22%20stroke-opacity%3D%220.35%22/%3E%0A%20%20%20%20%20%20%3Ccircle%20cx%3D%2280%22%20cy%3D%2269%22%20r%3D%2212%22%20fill%3D%22%23f59e0b%22/%3E%0A%20%20%20%20%20%20%3Ctext%20x%3D%22110%22%20y%3D%2277%22%20fill%3D%22%23ffffff%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2224%22%20letter-spacing%3D%225%22%3EMVN%20//%20MUSIC%20VIDEO%20NET%20//%20SOVEREIGN%208K%20MASTER%3C/text%3E%0A%20%20%20%20%20%20%3Ctext%20x%3D%2280%22%20y%3D%22340%22%20fill%3D%22%23ffffff%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2254%22%20letter-spacing%3D%223%22%3ECRIMSON%20FREQUENCY%3C/text%3E%0A%20%20%20%20%20%20%3Ctext%20x%3D%2280%22%20y%3D%22405%22%20fill%3D%22%23f59e0b%22%20font-family%3D%22monospace%22%20font-weight%3D%22700%22%20font-size%3D%2224%22%20letter-spacing%3D%224%22%3E%40SOVEREIGN_AUDIO%20//%208K%20SPATIAL%20MASTER%3C/text%3E%0A%20%20%20%20%20%20%3Ctext%20x%3D%2280%22%20y%3D%22655%22%20fill%3D%22%23cccccc%22%20font-family%3D%22monospace%22%20font-weight%3D%22700%22%20font-size%3D%2218%22%20letter-spacing%3D%223%22%3ERING%20COMM%20DIRECT%20BRIDGE%20%E2%80%A2%20VERIFIED%20PRODUCTION%20ASSET%20%E2%80%A2%20ZERO%20LATENCY%3C/text%3E%0A%20%20%20%20%3C/svg%3E',
    videoUrl: '/masters/mvn/crimson-frequency-8k.mp4'
  },
  {
    id: 'mvn-master-02',
    songTitle: 'RING COMM OVERDRIVE (DIRECTOR CUT)',
    primaryArtist: '@VORTEX_UNIT',
    genre: 'Hardcore Hip-Hop & Cyber Grime',
    duration: '4:05',
    status: 'syndicated',
    submittedAt: '2026-08-16',
    thumbnail: 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%221280%22%20height%3D%22720%22%20viewBox%3D%220%200%201280%20720%22%3E%0A%20%20%20%20%20%20%3Cdefs%3E%0A%20%20%20%20%20%20%20%20%3CradialGradient%20id%3D%22g%22%20cx%3D%2250%25%22%20cy%3D%2220%25%22%20r%3D%2280%25%22%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%23ef4444%22%20stop-opacity%3D%220.45%22/%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cstop%20offset%3D%2260%25%22%20stop-color%3D%22%23090004%22%20stop-opacity%3D%220.95%22/%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%23020001%22%20stop-opacity%3D%221%22/%3E%0A%20%20%20%20%20%20%20%20%3C/radialGradient%3E%0A%20%20%20%20%20%20%3C/defs%3E%0A%20%20%20%20%20%20%3Crect%20width%3D%221280%22%20height%3D%22720%22%20fill%3D%22%23030001%22/%3E%0A%20%20%20%20%20%20%3Crect%20width%3D%221280%22%20height%3D%22720%22%20fill%3D%22url%28%23g%29%22/%3E%0A%20%20%20%20%20%20%3Crect%20x%3D%2228%22%20y%3D%2228%22%20width%3D%221224%22%20height%3D%22664%22%20fill%3D%22none%22%20stroke%3D%22%23ef4444%22%20stroke-width%3D%223%22%20stroke-opacity%3D%220.75%22/%3E%0A%20%20%20%20%20%20%3Cpath%20d%3D%22M28%20110%20H1252%20M28%20610%20H1252%22%20stroke%3D%22%23ef4444%22%20stroke-width%3D%221%22%20stroke-opacity%3D%220.35%22/%3E%0A%20%20%20%20%20%20%3Ccircle%20cx%3D%2280%22%20cy%3D%2269%22%20r%3D%2212%22%20fill%3D%22%23ef4444%22/%3E%0A%20%20%20%20%20%20%3Ctext%20x%3D%22110%22%20y%3D%2277%22%20fill%3D%22%23ffffff%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2224%22%20letter-spacing%3D%225%22%3EMVN%20//%20MUSIC%20VIDEO%20NET%20//%20SOVEREIGN%208K%20MASTER%3C/text%3E%0A%20%20%20%20%20%20%3Ctext%20x%3D%2280%22%20y%3D%22340%22%20fill%3D%22%23ffffff%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2254%22%20letter-spacing%3D%223%22%3ERING%20COMM%20OVERDRIVE%3C/text%3E%0A%20%20%20%20%20%20%3Ctext%20x%3D%2280%22%20y%3D%22405%22%20fill%3D%22%23ef4444%22%20font-family%3D%22monospace%22%20font-weight%3D%22700%22%20font-size%3D%2224%22%20letter-spacing%3D%224%22%3E%40VORTEX_UNIT%20//%20DIRECT%20TV%20BRIDGE%3C/text%3E%0A%20%20%20%20%20%20%3Ctext%20x%3D%2280%22%20y%3D%22655%22%20fill%3D%22%23cccccc%22%20font-family%3D%22monospace%22%20font-weight%3D%22700%22%20font-size%3D%2218%22%20letter-spacing%3D%223%22%3ERING%20COMM%20DIRECT%20BRIDGE%20%E2%80%A2%20VERIFIED%20PRODUCTION%20ASSET%20%E2%80%A2%20ZERO%20LATENCY%3C/text%3E%0A%20%20%20%20%3C/svg%3E',
    videoUrl: '/masters/mvn/ring-comm-overdrive-8k.mp4'
  },
  {
    id: 'mvn-master-03',
    songTitle: 'IRON VOLTAGE // LIVE ARENA ANTHEM',
    primaryArtist: '@HIGH_VOLTAGE_NODE',
    genre: 'Heavy Metal / Arena Rock',
    duration: '4:18',
    status: 'qc_passed',
    submittedAt: '2026-08-18',
    thumbnail: 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%221280%22%20height%3D%22720%22%20viewBox%3D%220%200%201280%20720%22%3E%0A%20%20%20%20%20%20%3Cdefs%3E%0A%20%20%20%20%20%20%20%20%3CradialGradient%20id%3D%22g%22%20cx%3D%2250%25%22%20cy%3D%2220%25%22%20r%3D%2280%25%22%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%23ea580c%22%20stop-opacity%3D%220.45%22/%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cstop%20offset%3D%2260%25%22%20stop-color%3D%22%23090004%22%20stop-opacity%3D%220.95%22/%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%23020001%22%20stop-opacity%3D%221%22/%3E%0A%20%20%20%20%20%20%20%20%3C/radialGradient%3E%0A%20%20%20%20%20%20%3C/defs%3E%0A%20%20%20%20%20%20%3Crect%20width%3D%221280%22%20height%3D%22720%22%20fill%3D%22%23030001%22/%3E%0A%20%20%20%20%20%20%3Crect%20width%3D%221280%22%20height%3D%22720%22%20fill%3D%22url%28%23g%29%22/%3E%0A%20%20%20%20%20%20%3Crect%20x%3D%2228%22%20y%3D%2228%22%20width%3D%221224%22%20height%3D%22664%22%20fill%3D%22none%22%20stroke%3D%22%23ea580c%22%20stroke-width%3D%223%22%20stroke-opacity%3D%220.75%22/%3E%0A%20%20%20%20%20%20%3Cpath%20d%3D%22M28%20110%20H1252%20M28%20610%20H1252%22%20stroke%3D%22%23ea580c%22%20stroke-width%3D%221%22%20stroke-opacity%3D%220.35%22/%3E%0A%20%20%20%20%20%20%3Ccircle%20cx%3D%2280%22%20cy%3D%2269%22%20r%3D%2212%22%20fill%3D%22%23ea580c%22/%3E%0A%20%20%20%20%20%20%3Ctext%20x%3D%22110%22%20y%3D%2277%22%20fill%3D%22%23ffffff%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2224%22%20letter-spacing%3D%225%22%3EMVN%20//%20MUSIC%20VIDEO%20NET%20//%20SOVEREIGN%208K%20MASTER%3C/text%3E%0A%20%20%20%20%20%20%3Ctext%20x%3D%2280%22%20y%3D%22340%22%20fill%3D%22%23ffffff%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2254%22%20letter-spacing%3D%223%22%3EIRON%20VOLTAGE%3C/text%3E%0A%20%20%20%20%20%20%3Ctext%20x%3D%2280%22%20y%3D%22405%22%20fill%3D%22%23ea580c%22%20font-family%3D%22monospace%22%20font-weight%3D%22700%22%20font-size%3D%2224%22%20letter-spacing%3D%224%22%3E%40HIGH_VOLTAGE_NODE%20//%20LOSSLESS%208K%3C/text%3E%0A%20%20%20%20%20%20%3Ctext%20x%3D%2280%22%20y%3D%22655%22%20fill%3D%22%23cccccc%22%20font-family%3D%22monospace%22%20font-weight%3D%22700%22%20font-size%3D%2218%22%20letter-spacing%3D%223%22%3ERING%20COMM%20DIRECT%20BRIDGE%20%E2%80%A2%20VERIFIED%20PRODUCTION%20ASSET%20%E2%80%A2%20ZERO%20LATENCY%3C/text%3E%0A%20%20%20%20%3C/svg%3E',
    videoUrl: '/masters/mvn/iron-voltage-8k.mp4'
  },
  {
    id: 'mvn-master-04',
    songTitle: 'OBSIDIAN GRID // SUBWOOFER PROTOCOL',
    primaryArtist: '@DARKWAVE_CORE',
    genre: 'Dark Electronic / Bass',
    duration: '5:00',
    status: 'syndicated',
    submittedAt: '2026-08-19',
    thumbnail: 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%221280%22%20height%3D%22720%22%20viewBox%3D%220%200%201280%20720%22%3E%0A%20%20%20%20%20%20%3Cdefs%3E%0A%20%20%20%20%20%20%20%20%3CradialGradient%20id%3D%22g%22%20cx%3D%2250%25%22%20cy%3D%2220%25%22%20r%3D%2280%25%22%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%23dc2626%22%20stop-opacity%3D%220.45%22/%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cstop%20offset%3D%2260%25%22%20stop-color%3D%22%23090004%22%20stop-opacity%3D%220.95%22/%3E%0A%20%20%20%20%20%20%20%20%20%20%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%23020001%22%20stop-opacity%3D%221%22/%3E%0A%20%20%20%20%20%20%20%20%3C/radialGradient%3E%0A%20%20%20%20%20%20%3C/defs%3E%0A%20%20%20%20%20%20%3Crect%20width%3D%221280%22%20height%3D%22720%22%20fill%3D%22%23030001%22/%3E%0A%20%20%20%20%20%20%3Crect%20width%3D%221280%22%20height%3D%22720%22%20fill%3D%22url%28%23g%29%22/%3E%0A%20%20%20%20%20%20%3Crect%20x%3D%2228%22%20y%3D%2228%22%20width%3D%221224%22%20height%3D%22664%22%20fill%3D%22none%22%20stroke%3D%22%23dc2626%22%20stroke-width%3D%223%22%20stroke-opacity%3D%220.75%22/%3E%0A%20%20%20%20%20%20%3Cpath%20d%3D%22M28%20110%20H1252%20M28%20610%20H1252%22%20stroke%3D%22%23dc2626%22%20stroke-width%3D%221%22%20stroke-opacity%3D%220.35%22/%3E%0A%20%20%20%20%20%20%3Ccircle%20cx%3D%2280%22%20cy%3D%2269%22%20r%3D%2212%22%20fill%3D%22%23dc2626%22/%3E%0A%20%20%20%20%20%20%3Ctext%20x%3D%22110%22%20y%3D%2277%22%20fill%3D%22%23ffffff%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2224%22%20letter-spacing%3D%225%22%3EMVN%20//%20MUSIC%20VIDEO%20NET%20//%20SOVEREIGN%208K%20MASTER%3C/text%3E%0A%20%20%20%20%20%20%3Ctext%20x%3D%2280%22%20y%3D%22340%22%20fill%3D%22%23ffffff%22%20font-family%3D%22monospace%22%20font-weight%3D%22900%22%20font-size%3D%2254%22%20letter-spacing%3D%223%22%3EOBSIDIAN%20GRID%3C/text%3E%0A%20%20%20%20%20%20%3Ctext%20x%3D%2280%22%20y%3D%22405%22%20fill%3D%22%23dc2626%22%20font-family%3D%22monospace%22%20font-weight%3D%22700%22%20font-size%3D%2224%22%20letter-spacing%3D%224%22%3E%40DARKWAVE_CORE%20//%208K%20SPATIAL%20AUDIO%3C/text%3E%0A%20%20%20%20%20%20%3Ctext%20x%3D%2280%22%20y%3D%22655%22%20fill%3D%22%23cccccc%22%20font-family%3D%22monospace%22%20font-weight%3D%22700%22%20font-size%3D%2218%22%20letter-spacing%3D%223%22%3ERING%20COMM%20DIRECT%20BRIDGE%20%E2%80%A2%20VERIFIED%20PRODUCTION%20ASSET%20%E2%80%A2%20ZERO%20LATENCY%3C/text%3E%0A%20%20%20%20%3C/svg%3E',
    videoUrl: '/masters/mvn/obsidian-grid-8k.mp4'
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
  const displaySubmissions: MusicVideoSubmission[] =
    Array.isArray(submissions) && submissions.length > 0 ? submissions : VERIFIED_MVN_BROADCASTS;

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
                src={previewVideo.videoUrl || '/masters/mvn/sovereign-audio-8k.mp4'}
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
                  href="https://innova-universal-dashboard.vercel.app/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white px-6 py-3 rounded-xl text-sm font-bold transition"
                >
                  <span>innova-universal-dashboard.vercel.app</span>
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