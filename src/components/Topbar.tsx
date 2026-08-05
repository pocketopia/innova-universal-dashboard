import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Wifi, 
  Cpu, 
  Copy, 
  Check, 
  Power, 
  User, 
  Wallet, 
  Bell, 
  TrendingUp
} from 'lucide-react';
import { NetworkNode, WalletState } from '../types';

interface TopbarProps {
  node: NetworkNode;
  toggleNode: () => void;
  wallet: WalletState;
  connectWallet: () => void;
  userEmail: string;
}

export default function Topbar({ 
  node, 
  toggleNode, 
  wallet, 
  connectWallet,
  userEmail 
}: TopbarProps) {
  const [copied, setCopied] = useState(false);
  const [tickerPrice, setTickerPrice] = useState(1.42);
  const [tickerChange, setTickerChange] = useState(5.82);
  const [activeAlert, setActiveAlert] = useState(true);

  // Simulate small price fluctuations to enhance visual live telemetry
  useEffect(() => {
    const interval = setInterval(() => {
      setTickerPrice(prev => {
        const delta = (Math.random() - 0.49) * 0.01;
        return parseFloat((prev + delta).toFixed(4));
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const copyAddress = () => {
    if (!wallet.address) return;
    navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="h-20 shrink-0 border-b border-white/10 bg-[#050508]/80 backdrop-blur-md flex items-center justify-between px-8 relative z-20">
      
      {/* SEARCH AND SYS MARKET STATISTICS */}
      <div className="flex items-center gap-6">
        {/* Market Stats Ticker */}
        <div className="hidden lg:flex items-center gap-4 bg-white/5 rounded-xl px-3.5 py-1.5 border border-white/10 font-sans text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-white/40 font-sans text-[10px] font-semibold uppercase tracking-wider">INVA-MARKET</span>
          </div>
          <div className="h-3 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <span className="text-white font-bold">${tickerPrice}</span>
            <span className={`flex items-center text-[10px] ${tickerChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              <TrendingUp className="w-3 h-3 mr-0.5 inline" />
              +{tickerChange}%
            </span>
          </div>
        </div>

        {/* System Node Switcher Status Ticker */}
        <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-xl border border-white/10">
          <div className="flex items-center gap-2 px-2 text-[11px] font-sans">
            <Cpu className={`w-3.5 h-3.5 ${node.status === 'online' ? 'text-cyan-400 animate-pulse' : 'text-slate-500'}`} />
            <span className="text-white/40 font-light">VM Usage:</span>
            <span className={`font-semibold transition ${node.status === 'online' ? 'text-emerald-400' : 'text-slate-500'}`}>
              {node.status === 'online' ? '41.2% (8 Cores)' : '0.0%'}
            </span>
          </div>
          <button
            onClick={toggleNode}
            className={`cursor-pointer px-3 py-1 rounded-lg text-[10px] font-sans tracking-wide transition flex items-center gap-1.5 font-bold uppercase ${
              node.status === 'online'
                ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30'
                : node.status === 'initializing'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25 animate-pulse'
                : 'bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 border border-cyan-500/30'
            }`}
          >
            <Power className="w-3 h-3" />
            {node.status === 'online' ? 'SHUTDOWN' : node.status === 'initializing' ? 'INITIALIZING' : 'LAUNCH'}
          </button>
        </div>
      </div>

      {/* CENTER STATUS BAR (LIVE LEDGER BANDWIDTH) */}
      <div className="hidden xl:flex items-center gap-8 text-[11px] font-sans">
        <div className="flex items-center gap-2">
          <Wifi className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-white/40 font-light">Global Peers:</span>
          <span className="text-white font-semibold">{node.status === 'online' ? `${node.peers} nodes` : '0'}</span>
        </div>
        <div className="h-4 w-px bg-white/10" />
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-white/40 font-light">TX Bandwidth:</span>
          <span className="text-white font-semibold">{node.status === 'online' ? `${node.bandwidth} MB/s` : '0.00' }</span>
        </div>
        <div className="h-4 w-px bg-white/10" />
        <div className="flex items-center gap-2">
          <span className="text-white/40 font-light">Node Region:</span>
          <span className="text-white font-semibold">{node.region}</span>
        </div>
      </div>

      {/* RIGHT SIDEBAR ACTIONS AND ACCOUNT PROFILE */}
      <div className="flex items-center gap-4">
        
        {/* SECURE WALLET BADGE */}
        {wallet.connected ? (
          <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 text-xs">
            <Wallet className="w-3.5 h-3.5 text-purple-400" />
            {/* Keeping font-mono strictly and ONLY for the actual 0x Wallet Address identifier string! */}
            <span className="text-purple-300 font-mono font-medium tracking-wide">
              {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
            </span>
            <button 
              onClick={copyAddress}
              className="text-slate-500 hover:text-white transition duration-200 p-0.5 rounded cursor-pointer"
              title="Copy secure hex address"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        ) : (
          <button
            onClick={connectWallet}
            className="cursor-pointer bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 px-4 py-2 rounded-xl text-xs font-sans tracking-wide font-bold text-white transition shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/20 border border-white/10 uppercase"
          >
            CONNECT WALLET
          </button>
        )}

        {/* Notifications Alert Bell */}
        <div className="relative cursor-pointer" onClick={() => setActiveAlert(false)}>
          <div className="p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 text-slate-400 hover:text-white transition">
            <Bell className="w-4 h-4" />
          </div>
          {activeAlert && (
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
          )}
        </div>

        {/* PROFILE BADGE OVERALL */}
        <div className="flex items-center gap-3 pl-2 border-l border-white/10">
          <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center border border-white/10 relative overflow-hidden group">
            {/* Holographic scanner effect on hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/30 to-purple-500/0 opacity-0 group-hover:opacity-100 transition duration-300" />
            <User className="w-5 h-5 text-cyan-400 group-hover:text-white transition" />
            {/* Live Indicator */}
            <div className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-emerald-500 border border-emerald-950" />
          </div>

          <div className="hidden md:block">
            <p className="text-xs font-sans font-bold text-white max-w-[140px] truncate">
              {userEmail ? userEmail.split('@')[0].toUpperCase() : 'COSMIC_DEV'}
            </p>
            <p className="text-[10px] font-sans text-white/40 truncate max-w-[140px]" title={userEmail}>
              {userEmail || 'orchestraofdeath@gmail.com'}
            </p>
          </div>
        </div>

      </div>

    </header>
  );
}
