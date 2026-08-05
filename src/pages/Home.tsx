import { useState, useEffect } from "react";
import ClientHero from "../components/ClientHero";
import { Link } from "react-router-dom";
import { Play, Clock, ShieldCheck, Lock, AlertCircle } from "lucide-react";

export default function Home() {
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [deliveredProject, setDeliveredProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [inputCode, setInputCode] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchPremiere = async () => {
      try {
        const response = await fetch('http://localhost:3005/api/content', {
          headers: { 'x-tenant-id': 'StreamShare' }
        });
        if (!response.ok) throw new Error('Failed to query grid.');
        const data = await response.json();
        
        // Save all active projects in the background
        const activeProjects = (data.content || []).filter(
          (item: any) => item.status === 'approved' || item.status === 'live'
        );
        setAllProjects(activeProjects);
      } catch (err) {
        console.error("Failed loading client delivery:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPremiere();
  }, []);

  const handleUnlock = () => {
    // Search the database array for a matching handshake code
    const foundProject = allProjects.find((p: any) => p.handshakeCode === inputCode.toUpperCase());
    
    if (foundProject) {
      setError(false);
      setDeliveredProject({
        id: foundProject.id,
        title: foundProject.title,
        category: foundProject.genre || 'Cinematic Weddings',
        creator: foundProject.creator || 'Aura Cinematic',
        description: foundProject.synopsis || foundProject.description || '',
        thumbnailUrl: foundProject.thumbnail || 'https://images.unsplash.com/photo-1543087903-1ac2ec7aa8c5?auto=format&fit=crop&q=80&w=1920',
        duration: '06:12',
        releaseYear: '2026',
        tags: ["UHD 4K", "Dolby Atmos", "Director Cut"]
      });
    } else {
      setError(true);
      setTimeout(() => setError(false), 3000);
    }
  };

  const isDelivered = !!deliveredProject;

  if (loading) {
    return (
      <div className="min-h-screen bg-cinemablack flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 border-2 border-gold border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-mono text-xs text-gray-500 uppercase tracking-widest">Securing Dedicated Tunnel Line...</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-cinemablack premium-gradient overflow-hidden pb-24">
      <ClientHero isDelivered={isDelivered} project={deliveredProject} />

      <div className="relative z-20 max-w-7xl mx-auto px-6 md:px-12">
        {isDelivered ? (
          <div className="space-y-6 mt-12 md:mt-16 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-6 bg-gold rounded-full" />
                <h2 className="text-xl md:text-2xl font-serif font-semibold tracking-wide text-white">
                  Your Digital Master Presentation
                </h2>
              </div>
              <span className="px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] tracking-widest font-mono font-bold uppercase flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                SECURE STREAM UNLOCKED
              </span>
            </div>

            <div className="max-w-xl">
              <Link to={`/watch/${deliveredProject.id}`} className="group cursor-pointer focus:outline-none block">
                <div className="relative aspect-video rounded-xl overflow-hidden bg-surface-dark border border-white/5 netflix-shadow transition-all duration-500 group-hover:scale-[1.02] group-hover:border-gold/30">
                  <img
                    src={deliveredProject.thumbnailUrl}
                    alt={deliveredProject.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-black/10 opacity-60 group-hover:opacity-80 transition-opacity" />

                  <div className="absolute top-4 left-4 flex items-center justify-between right-4">
                    <span className="px-2.5 py-1 rounded bg-black/75 backdrop-blur-md text-[9px] tracking-widest uppercase text-gold font-mono border border-gold/20">
                      FINAL PREMIERE PRESENTATION
                    </span>
                    <span className="px-2.5 py-1 rounded bg-black/75 backdrop-blur-md text-[9px] tracking-widest uppercase text-gray-300 font-mono flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-gold" />
                      {deliveredProject.duration}
                    </span>
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300 z-20">
                    <div className="w-14 h-14 rounded-full bg-gold text-cinemablack flex items-center justify-center shadow-xl shadow-gold/30">
                      <Play className="w-6 h-6 fill-current ml-0.5" />
                    </div>
                  </div>

                  <div className="absolute bottom-5 left-5 right-5 z-10">
                    <p className="text-[10px] uppercase tracking-widest text-gold/80 font-mono font-semibold mb-1">
                      {deliveredProject.creator}
                    </p>
                    <h3 className="text-lg font-serif font-semibold text-white tracking-wide group-hover:text-gold transition-colors truncate">
                      {deliveredProject.title}
                    </h3>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-8 md:mt-12 bg-slate-900/50 rounded-xl p-8 max-w-2xl mx-auto space-y-6 text-center border border-white/5">
            <div className="w-12 h-12 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto text-gold">
              <Lock className="w-5 h-5" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-serif font-semibold text-white">Secure Client Portal</h3>
              <p className="text-gray-400 text-sm font-light leading-relaxed max-w-md mx-auto">
                Enter the secure 6-digit handshake code provided by your director to unlock your digital premiere.
              </p>
            </div>
            
            <div className="max-w-xs mx-auto space-y-3 pt-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  onKeyPress={(e) => e.key === 'Enter' && handleUnlock()}
                  placeholder="CODE"
                  className="flex-1 bg-black border border-white/10 rounded px-4 py-3 text-center text-gold font-mono tracking-[0.5em] font-bold focus:outline-none focus:border-gold/50 transition-colors"
                />
                <button
                  onClick={handleUnlock}
                  className="px-6 py-3 bg-gold hover:bg-gold-dark text-black font-bold font-mono text-xs uppercase tracking-wider rounded transition-colors"
                >
                  Unlock
                </button>
              </div>
              {error && (
                <p className="text-xs text-red-400 font-mono flex items-center justify-center gap-1 animate-pulse">
                  <AlertCircle className="w-3 h-3" /> Invalid Handshake Code
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}