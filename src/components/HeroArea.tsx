import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, RefreshCw, Upload, Sparkles, Film, Settings2, Info } from 'lucide-react';

export default function HeroArea() {
  const [isPlaying, setIsPlaying] = useState(true);
  const [renderingPreset, setRenderingPreset] = useState<'matrix' | 'nebula' | 'sonar'>('matrix');
  const [videoTitle, setVideoTitle] = useState('INNOVA_SYSTEM_REVELATION_TEASER_4K.bin');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number | null>(null);

  // Synthesize digital abstract visuals dynamically on canvas to simulate continuous gameplay/teaser feeds!
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const handleResize = () => {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };

    window.addEventListener('resize', handleResize);
    
    let frame = 0;
    // Stars particles for nebula
    const particles: { x: number; y: number; size: number; speed: number; color: string }[] = [];
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2 + 1,
        speed: Math.random() * 0.5 + 0.1,
        color: `rgba(${Math.random() > 0.5 ? '0, 240, 255' : '157, 78, 221'}, ${Math.random() * 0.6 + 0.2})`
      });
    }

    const render = () => {
      if (!isPlaying) {
        requestRef.current = requestAnimationFrame(render);
        return;
      }
      
      frame++;
      
      // Select preset renderers
      if (renderingPreset === 'matrix') {
        // Draw cyber digital cascading matrix grid
        ctx.fillStyle = 'rgba(5, 5, 8, 0.15)';
        ctx.fillRect(0, 0, width, height);
        
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
        ctx.lineWidth = 1;
        const spacing = 40;
        
        // draw moving grids
        for (let x = 0; x < width; x += spacing) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x + Math.sin((frame + x) / 50) * 10, height);
          ctx.stroke();
        }
        for (let y = (frame % spacing); y < height; y += spacing) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }

        // Concentric expanding ring blocks representing data nodes
        ctx.strokeStyle = 'rgba(157, 78, 221, 0.3)';
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, (frame * 1.5) % (height * 0.8), 0, Math.PI * 2);
        ctx.stroke();

        // Target locator reticle
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, 20 + Math.sin(frame / 10) * 4, 0, Math.PI * 2);
        ctx.stroke();

        ctx.font = '10px "Inter", sans-serif';
        ctx.fillStyle = 'rgba(0, 240, 255, 0.85)';
        ctx.fillText(`RENDERING STATUS: STABLE // LEDGER STREAM // SHARD_F03`, 20, 30);
        ctx.fillText(`BITRATE: 85.3 Mbps // QC: EXCELLENT // FPS: 60`, 20, 45);

      } else if (renderingPreset === 'nebula') {
        // Starfield dynamic flythrough
        ctx.fillStyle = 'rgba(8, 6, 16, 0.2)';
        ctx.fillRect(0, 0, width, height);

        // draw stars
        particles.forEach(p => {
          p.x -= p.speed * 2;
          if (p.x < 0) p.x = width;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size + Math.sin(frame / 10) * 1, 0, Math.PI * 2);
          ctx.fill();
        });

        // Pulsing galaxy center
        const grad = ctx.createRadialGradient(width/2, height/2, 5, width/2, height/2, 120 + Math.sin(frame / 15) * 20);
        grad.addColorStop(0, 'rgba(157, 78, 221, 0.25)');
        grad.addColorStop(0.5, 'rgba(0, 240, 255, 0.08)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(width/2, height/2, 200, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '10px "Inter", sans-serif';
        ctx.fillStyle = 'rgba(157, 78, 221, 0.85)';
        ctx.fillText(`RENDERING STATUS: AMBIENT CINEMATIC // ARCHAVEN PIPELINE`, 20, 30);
        ctx.fillText(`DECENTRALIZED ENCODING ACTIVE // DOLBY ATMOS 7.1`, 20, 45);

      } else {
        // High fidelity audio-waveform radar
        ctx.fillStyle = '#050508';
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = 'rgba(0, 245, 160, 0.15)';
        for (let r = 50; r < height; r += 50) {
          ctx.beginPath();
          ctx.arc(width/2, height/2, r, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Draw green live frequency sweeps
        ctx.strokeStyle = '#00f5a0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < width; i += 8) {
          const waveHeight = Math.sin((i + frame * 3) * 0.02) * Math.cos((i - frame) * 0.01) * 35;
          ctx.lineTo(i, height / 2 + waveHeight);
        }
        ctx.stroke();

        ctx.font = '10px "Inter", sans-serif';
        ctx.fillStyle = 'rgba(0, 245, 160, 0.85)';
        ctx.fillText(`RENDERING STATUS: LIVE WAVEFORM AUDIO SYNTHESIZER`, 20, 30);
        ctx.fillText(`HEKTIC TV // TRANSCODING BITSTREAM`, 20, 45);
      }

      // Live warning overlay tag
      ctx.fillStyle = 'rgba(13,14,25,0.7)';
      ctx.fillRect(width - 150, 15, 130, 25);
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.strokeRect(width - 150, 15, 130, 25);
      
      ctx.font = '10px "Inter", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`PREVIEW FEED [INVA]`, width - 140, 31);

      requestRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, renderingPreset]);

  // Handle mock video upload
  const handleUploadTeaser = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setVideoTitle(file.name.toUpperCase());
      const presets: ('matrix' | 'nebula' | 'sonar')[] = ['matrix', 'nebula', 'sonar'];
      const next = presets[Math.floor(Math.random() * presets.length)];
      setRenderingPreset(next);
    }
  };

  return (
    <section className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl relative">
      <div className="absolute inset-0 bg-radial-gradient from-cyan-500/5 via-transparent to-transparent pointer-events-none" />

      {/* Hero Video Canvas Container */}
      <div className="relative aspect-[21/9] w-full bg-black flex items-center justify-center group overflow-hidden">
        <canvas 
          ref={canvasRef} 
          className="absolute inset-0 w-full h-full object-cover transition duration-500 opacity-90 group-hover:opacity-100" 
        />
        
        <div className="absolute inset-0 scanlines-overlay opacity-60 pointer-events-none" />
        
        {/* Preset selections */}
        <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
          <div className="flex gap-1.5 bg-black/70 backdrop-blur-md p-1.5 rounded-lg border border-white/10 font-sans font-bold">
            <button
              onClick={() => setRenderingPreset('matrix')}
              className={`px-3 py-1 rounded text-[9px] transition cursor-pointer font-bold ${
                renderingPreset === 'matrix' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-400/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              MATRIX
            </button>
            <button
              onClick={() => setRenderingPreset('nebula')}
              className={`px-3 py-1 rounded text-[9px] transition cursor-pointer font-bold ${
                renderingPreset === 'nebula' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              NEBULA
            </button>
            <button
              onClick={() => setRenderingPreset('sonar')}
              className={`px-3 py-1 rounded text-[9px] transition cursor-pointer font-bold ${
                renderingPreset === 'sonar' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              SONAR
            </button>
          </div>
        </div>

        {/* Control bar */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="cursor-pointer w-12 h-12 rounded-xl bg-cyan-400 text-black flex items-center justify-center hover:bg-cyan-300 shadow-lg shadow-cyan-400/20 transition transform active:scale-95"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[9px] bg-red-500 text-white font-sans font-bold px-2 py-0.5 rounded-md tracking-wider animate-pulse">
                  DECENTRALIZED STREAM
                </span>
                <span className="text-[11px] text-slate-400 font-sans font-light">FPS: 60 / ZERO LATENCY</span>
              </div>
              <h2 className="text-sm md:text-base font-sans font-black tracking-tight text-white drop-shadow-md">
                {videoTitle}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="cursor-pointer bg-white/5 hover:bg-white/10 text-white px-4.5 py-2.5 rounded-xl text-xs font-sans tracking-wide font-black transition flex items-center gap-2 border border-white/10">
              <Upload className="w-4 h-4 text-cyan-400" />
              UPLOAD TEASER CLIP
              <input 
                type="file" 
                accept="video/*,image/*" 
                className="hidden" 
                onChange={handleUploadTeaser} 
              />
            </label>
            
            <button
              onClick={() => {
                setVideoTitle('INNOVA_META_MULTIVERSE_TEASER_REMASTERED.bin');
                setRenderingPreset('nebula');
              }}
              className="cursor-pointer bg-cyan-950/25 hover:bg-cyan-900/40 text-cyan-400 px-3.5 py-2.5 rounded-xl text-xs font-sans tracking-wide font-black border border-cyan-400/20 transition"
              title="Fast load alternate system reel"
            >
              <RefreshCw className="w-4 h-4 animate-pulse-slow" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-white/10 divide-x divide-white/10 bg-[#080912]/80 backdrop-blur-md">
        <div className="p-4 flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-lg">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[9px] font-sans text-slate-500 block">RENDER SYSTEM</span>
            <span className="text-xs font-sans font-bold text-white block">Innova Shard GPU v2</span>
          </div>
        </div>

        <div className="p-4 flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-lg">
            <Film className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[9px] font-sans text-slate-500 block">AUDIO CODEC</span>
            <span className="text-xs font-sans font-bold text-white block">Dolby Atmos Spatial 3D</span>
          </div>
        </div>

        <div className="p-4 flex items-center gap-3 col-span-1">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg">
            <Settings2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[9px] font-sans text-slate-500 block">DECENTRALIZED FEED</span>
            <span className="text-xs font-sans font-bold text-white block">Active (312 Peers)</span>
          </div>
        </div>

        <div className="p-4 flex items-center gap-2">
          <div className="p-1.5 bg-slate-900 text-slate-400 rounded-md">
            <Info className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10px] font-sans text-slate-400 leading-normal font-light">
            Teaser clip renders dynamically. Drag-and-drop or upload custom media files to customize.
          </span>
        </div>
      </div>

    </section>
  );
}
