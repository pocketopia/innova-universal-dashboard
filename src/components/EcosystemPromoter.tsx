import React, { useEffect, useState } from 'react';
import { Radio, UploadCloud } from 'lucide-react';
import { UploadProgressPayload } from '../lib/mediaVault';

interface EcosystemPromoterProps {
  currentPlatform: string;
}

const PLATFORM_NEWS_ITEMS: Record<string, string[]> = {
  streamshare: [
    'STREAMSHARE LIVE • Direct B2B Master Delivery & Cinema Gold Live Platform Chat synced to Master Brain Firestore',
    'AUTOMATIC THUMBNAILS • Frame-1 HD video poster extraction active on all MP4 & MOV uploads',
    'HANDSHAKE PROTOCOL • Single immutable 6-character P2P client codes locked from Step 2 through delivery',
    'AMAZON FIRE TV & FIRE HD 8 • StreamShare v2.6.0 ready for instant living-room client screenings',
  ],
  mvn: [
    'MUSIC VIDEO NATION • 24/7 independent artist rotation live across Pop, Hip Hop & R&B, Rock, Electronic & Classics',
    'CREATOR PAYOUTS • Verified 80% watch-session attribution active via Creator Bank & $INVA Ledger',
    'UPLOAD SPECS • H.264/AAC MP4 & HLS streams auto-generate Frame-1 thumbnails with live byte progress',
  ],
  hektic: [
    'HEKTIC TV • Esports, Extreme Sports, Reality TV & Mosh Pit channels wired directly to Master Brain',
    'RING COMM RELAY • Approved Music & Live episodes syndicate straight to Fire TV & Fire Tablet builds',
    'BROADCAST READY • Real-time cloud chunk streaming active with HTTP 206 instant seeking',
  ],
  kreation: [
    'KREATION CLOUD CONSOLE v2.6 • Mount interactive HTML5/WebGL2 builds or 60fps cloud gameplay streams',
    'CONTROLLER MATRIX • DualSense, Xbox Wireless, Fire TV D-Pad & Fire HD Multi-Touch supported natively',
    'INDIE SPOTLIGHT • External studio handles route automatically to Indie Spotlight shelves',
  ],
  archaven: [
    'ARCHAVEN AI CINEMA • Dedicated living-room home for high-fidelity AI-authored Series & 4K/8K Feature Films',
    'CREATOR POOL • Non-exclusive Studio Nodes earn from the 55% Creator Pool across verified Fire TV sessions',
    'SAPPHIRE & MOSS • Dual-format Series (/series) and Feature Film (/films) shelves synced live',
  ],
};

export default function EcosystemPromoter({ currentPlatform }: EcosystemPromoterProps) {
  const [uploadStatus, setUploadStatus] = useState<UploadProgressPayload | null>(null);

  useEffect(() => {
    const onProgress = (e: Event) => {
      const detail = (e as CustomEvent<UploadProgressPayload>).detail;
      if (!detail || !detail.active) setUploadStatus(null);
      else setUploadStatus(detail);
    };
    window.addEventListener('innova-live-upload-progress', onProgress);
    return () => window.removeEventListener('innova-live-upload-progress', onProgress);
  }, []);

  const key = (currentPlatform || 'streamshare').toLowerCase();
  const headlines = PLATFORM_NEWS_ITEMS[key] || [
    PLATFORM_NEWS_ITEMS.streamshare[0],
    PLATFORM_NEWS_ITEMS.archaven[0],
    PLATFORM_NEWS_ITEMS.mvn[0],
    PLATFORM_NEWS_ITEMS.kreation[0],
    PLATFORM_NEWS_ITEMS.hektic[0],
  ];
  const marqueeText = [...headlines, ...headlines].join('   ✦   ');

  return (
    <>
      <style>{`
        @keyframes innovaNewsMarquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .innova-news-track {
          display: inline-block;
          white-space: nowrap;
          animation: innovaNewsMarquee 38s linear infinite;
        }
        .innova-news-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      <div className="w-full h-8 bg-[#07090f] border-b border-cyan-500/20 flex items-center overflow-hidden select-none z-30 shrink-0">
        <div className="px-3 h-full bg-gradient-to-r from-cyan-500/20 to-emerald-500/10 border-r border-cyan-500/30 flex items-center gap-2 shrink-0">
          <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-cyan-300">
            LIVE NETWORK FEED
          </span>
        </div>
        <div className="flex-1 overflow-hidden relative">
          <div className="innova-news-track text-[11px] font-medium text-slate-300 tracking-wide pl-4">
            {marqueeText}
          </div>
        </div>
      </div>

      {uploadStatus && uploadStatus.active && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[120] w-[92vw] max-w-xl bg-[#070b14]/95 backdrop-blur-xl border-2 border-amber-400 shadow-[0_0_30px_rgba(234,179,8,0.45)] rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <UploadCloud className="w-5 h-5 text-amber-400 animate-bounce shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wider text-white truncate">
                  UPLOADING TO {uploadStatus.tenant.toUpperCase()} CLOUD • {uploadStatus.fileName}
                </p>
                <p className="text-[10px] font-mono text-amber-300 truncate">{uploadStatus.stage}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-sm font-mono font-black text-amber-400">{uploadStatus.percent}%</span>
              <p className="text-[9px] font-mono text-slate-400">
                {uploadStatus.uploadedMB} / {uploadStatus.totalMB} MB
              </p>
            </div>
          </div>
          <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-cyan-400 transition-all duration-150"
              style={{ width: `${uploadStatus.percent}%` }}
            />
          </div>
        </div>
      )}
    </>
  );
}
