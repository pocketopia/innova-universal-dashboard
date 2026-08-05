import React, { useState, useEffect } from 'react';
import { Gamepad2, Film, Tv, Database, Share2, ArrowRight } from 'lucide-react';

interface EcosystemPromoterProps {
  currentPlatform: string;
}

const PROMOS: Record<string, any[]> = {
  archaven: [
    { text: "Enjoying the cinematic universe? Play the interactive spin-offs on Kreation Gaming.", icon: Gamepad2, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
    { text: "Catch the director's live Q&A tonight at 8PM on Hektic TV.", icon: Database, color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20" }
  ],
  kreation: [
    { text: "Unlock exclusive in-game lore by watching 'The Neon Whisper' on ArcHaven.", icon: Film, color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
    { text: "Listen to the official game soundtrack looping 24/7 on Music Video Nation.", icon: Tv, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" }
  ],
  mvn: [
    { text: "Watch the artist's live festival performance streaming right now on Hektic TV.", icon: Database, color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
    { text: "Experience the music in immersive 3D on the Kreation Gaming engine.", icon: Gamepad2, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" }
  ],
  hektic: [
    { text: "Missed the live broadcast? Watch the 4K master cut on ArcHaven Cinema.", icon: Film, color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
    { text: "Vibe to the pre-show playlist on Music Video Nation.", icon: Tv, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" }
  ],
  streamshare: [
    { text: "Deliver your final master files and get featured on ArcHaven Cinema.", icon: Film, color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
    { text: "Need live event caching? Route your streams through Hektic TV.", icon: Database, color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20" }
  ]
};

export default function EcosystemPromoter({ currentPlatform }: EcosystemPromoterProps) {
  const [promoIndex, setPromoIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  const platformKey = currentPlatform.toLowerCase();
  const activePromos = PROMOS[platformKey] || PROMOS['archaven'];

  useEffect(() => {
    // Initial delay before showing first promo
    const initialTimer = setTimeout(() => setIsVisible(true), 5000);

    // Rotate promos every 15 seconds
    const rotationInterval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setPromoIndex((prev) => (prev + 1) % activePromos.length);
        setIsVisible(true);
      }, 500); // 500ms fade out before switching
    }, 15000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(rotationInterval);
    };
  }, [activePromos.length]);

  const currentPromo = activePromos[promoIndex];
  const Icon = currentPromo.icon;

  return (
    <div className={`fixed bottom-6 right-6 z-40 max-w-sm transition-all duration-500 ease-in-out ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
      <div className={`flex items-center gap-4 p-4 rounded-2xl border backdrop-blur-md cursor-pointer hover:scale-105 transition-transform shadow-2xl ${currentPromo.bg} ${currentPromo.border} bg-opacity-90`}>
        <div className={`p-3 rounded-full bg-black/40 ${currentPromo.color} shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-0.5">Innova Ecosystem</p>
          <p className="text-xs font-bold text-white leading-tight">{currentPromo.text}</p>
        </div>
        <div className={`shrink-0 ${currentPromo.color}`}>
          <ArrowRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}