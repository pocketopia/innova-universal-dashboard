import React, { useState } from 'react';
import { 
  Film, 
  Tv, 
  Music, 
  Upload, 
  ShieldCheck, 
  Clock, 
  Sparkles, 
  ArrowLeft, 
  CheckCircle2, 
  ChevronRight 
} from 'lucide-react';
import { VideoSubmission } from '../types';
import { submitContent } from '../lib/apiClient';

interface EntertainmentDistributionProps {
  submissions: VideoSubmission[];
  setSubmissions: React.Dispatch<React.SetStateAction<VideoSubmission[]>>;
  walletConnected: boolean;
  onBackToHub: () => void;
  subPlatform: 'mvn' | 'archaven' | 'hektic';
  userNode: { handle: string; id: string; wallet: string };
}

export default function EntertainmentDistribution({ 
  submissions, 
  setSubmissions, 
  walletConnected, 
  onBackToHub, 
  subPlatform,
  userNode
}: EntertainmentDistributionProps) {
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [filmTitle, setFilmTitle] = useState('');
  const [filmDirector, setFilmDirector] = useState(userNode?.handle || '');
  const [filmResolution, setFilmResolution] = useState('4K PRORES 4444 XQ');
  const [targetChannels, setTargetChannels] = useState<string[]>([]);
  const [licensingTerms, setLicensingTerms] = useState(false);
  const [distributionRights, setDistributionRights] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'completed'>('idle');

  const theme = {
    mvn: { title: "MUSIC VIDEO NETWORK", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20", icon: Music },
    archaven: { title: "ARCHAVEN CINEMA", color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20", icon: Film },
    hektic: { title: "HEKTIC TV BROADCASTS", color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20", icon: Tv }
  }[subPlatform || 'archaven'];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadState('uploading');
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setUploadProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          setUploadState('completed');
        }
      }, 100);
    }
  };

  const handleMediaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!filmTitle || uploadState !== 'completed' || !licensingTerms || !distributionRights) return;

    try {
      const response = await submitContent({
        title: filmTitle.toUpperCase(),
        creator: filmDirector || userNode.handle,
        camera: 'ARRI ALEXA 35',
        resolution: filmResolution,
        audioFormat: 'Dolby Atmos Spatial 7.1',
        selectedChannels: targetChannels.length > 0 ? targetChannels : [theme.title],
        licensingTerms: true
      });
      setSubmissions(prev => [response, ...prev]);
      setWizardStep(3);
    } catch (err) {
      alert("Ecosystem transcoder rejected raw file manifest payload.");
    }
  };

  return (
    <div className="space-y-6 p-8 bg-[#050508] text-white rounded-2xl border border-white/10 shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={onBackToHub} className="p-2 bg-white/5 rounded-xl border border-white/10 text-xs font-bold hover:bg-white/10 transition flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Hub
          </button>
          <h2 className="text-xl font-black tracking-wider uppercase" style={{ color: theme.color }}>{theme.title}</h2>
        </div>
      </div>
      
      <form onSubmit={handleMediaSubmit} className="space-y-6">
        {wizardStep === 1 && (
          <div className="space-y-4 animate-in fade-in">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1 font-bold">PROJECT TITLE</label>
                <input type="text" value={filmTitle} onChange={(e) => setFilmTitle(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-cyan-400" placeholder="Enter title" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1 font-bold">MASTER RESOLUTION</label>
                <select value={filmResolution} onChange={(e) => setFilmResolution(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs outline-none">
                  <option value="4K PRORES 4444 XQ">4K ProRes 4444 XQ</option>
                  <option value="8K REDCODE RAW">8K REDCODE RAW</option>
                </select>
              </div>
            </div>
            <div className="border border-dashed border-white/15 rounded-xl p-6 bg-white/[0.01] text-center">
              <input type="file" id="media-file" className="hidden" onChange={handleFileChange} />
              <label htmlFor="media-file" className="cursor-pointer text-xs block text-slate-400 font-medium">
                <Upload className="w-6 h-6 mx-auto mb-2 opacity-60" /> Click to attach high-bitrate video master container
              </label>
              {uploadProgress > 0 && <div className="mt-2 text-[10px] font-mono text-cyan-400">{uploadProgress}% Packaged</div>}
            </div>
            <button type="button" disabled={!filmTitle || uploadState !== 'completed'} onClick={() => setWizardStep(2)} className="w-full py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold rounded-xl uppercase transition disabled:opacity-40">Continue to Licensing</button>
          </div>
        )}

        {wizardStep === 2 && (
          <div className="space-y-4 animate-in fade-in">
            <div className="bg-black/40 p-4 rounded-xl space-y-3 border border-white/5">
              <label className="flex items-center gap-3 text-xs text-slate-400 cursor-pointer"><input type="checkbox" checked={distributionRights} onChange={(e) => setDistributionRights(e.target.checked)} /> Confirm commercial intellectual ownership maps.</label>
              <label className="flex items-center gap-3 text-xs text-slate-400 cursor-pointer"><input type="checkbox" checked={licensingTerms} onChange={(e) => setLicensingTerms(e.target.checked)} /> Authorize gasless automated ledger royalty splits.</label>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setWizardStep(1)} className="flex-1 py-3 bg-white/5 rounded-xl text-xs font-bold border border-white/10">Back</button>
              <button type="submit" disabled={!distributionRights || !licensingTerms} className="flex-1 py-3 bg-cyan-500 text-black rounded-xl text-xs font-black uppercase tracking-wider shadow-lg disabled:opacity-40">Verify & Dispatch Shard</button>
            </div>
          </div>
        )}

        {wizardStep === 3 && (
          <div className="text-center p-8 bg-black/40 border border-white/5 rounded-xl space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto"><ShieldCheck className="w-6 h-6" /></div>
            <div><h3 className="font-bold text-sm uppercase">Ingest Complete</h3><p className="text-xs text-slate-400 mt-1">Cinematic stream sharded and cached. Awaiting final node indexing verification logs.</p></div>
            <button type="button" onClick={() => { setWizardStep(1); setFilmTitle(''); setUploadState('idle'); setUploadProgress(0); setLicensingTerms(false); setDistributionRights(false); }} className="px-6 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold hover:bg-white/10 transition">Submit Another Master</button>
          </div>
        )}
      </form>
    </div>
  );
}