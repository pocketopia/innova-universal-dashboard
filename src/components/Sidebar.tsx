import React from 'react';
import { 
  LayoutDashboard, 
  Gamepad2, 
  Film, 
  Share2, 
  Cpu, 
  Layers, 
  Radio, 
  Coins,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';
import { TabType } from '../types';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  nodeStatus: 'offline' | 'initializing' | 'online';
  walletConnected: boolean;
  walletBalance: number;
  onBackToHub?: () => void;
}

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  nodeStatus, 
  walletConnected,
  walletBalance,
  onBackToHub
}: SidebarProps) {
  
  const menuItems = [
    {
      id: 'dashboard' as TabType,
      label: 'Core Ecosystem Hub',
      sub: 'Profile & Web3 Systems Hub',
      icon: LayoutDashboard,
      color: 'text-cyan-400',
      glow: 'shadow-[0_0_15px_rgba(6,182,212,0.15)]',
      border: 'border-cyan-500/20'
    },
    {
      id: 'kreation' as TabType,
      label: 'Kreation Platform',
      sub: 'Indie Vault & Game Hub',
      icon: Gamepad2,
      color: 'text-purple-400',
      glow: 'shadow-[0_0_15px_rgba(168,85,247,0.15)]',
      border: 'border-purple-500/20'
    },
    {
      id: 'entertainment' as TabType,
      label: 'Entertainment Distribution',
      sub: 'Cinema & Music Pipelines',
      icon: Film,
      color: 'text-amber-400',
      glow: 'shadow-[0_0_15px_rgba(245,158,11,0.15)]',
      border: 'border-amber-500/20'
    },
    {
      id: 'streamshare' as TabType,
      label: 'StreamShare Pipeline',
      sub: 'Creator-Client Collaborative',
      icon: Share2,
      color: 'text-emerald-400',
      glow: 'shadow-[0_0_15px_rgba(16,185,129,0.15)]',
      border: 'border-emerald-500/20'
    }
  ];

  return (
    <aside className="w-80 h-screen shrink-0 border-r border-white/10 bg-[#050508]/90 backdrop-blur-xl flex flex-col justify-between overflow-y-auto select-none p-6">
      
      {/* BRANDING SECTION */}
      <div>
        <div className="flex items-center gap-4 mb-10 pb-6 border-b border-white/10">
          {/* Innova Spherical Pulsing Logo */}
          <div className="relative group cursor-pointer">
            <div className="absolute -inset-1.5 bg-gradient-to-r from-cyan-500 via-purple-600 to-emerald-500 rounded-full opacity-70 blur-md group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse" />
            <div className="relative w-11 h-11 rounded-full bg-[#0d0e19] flex items-center justify-center border border-white/20 shadow-inner overflow-hidden">
              {/* Spherical Animated Center */}
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-400 to-purple-600 animate-spin" style={{ animationDuration: '6s' }} />
              <div className="absolute inset-0 bg-radial-gradient from-transparent to-black/60" />
              {/* Grid reflection overlay */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:4px_4px]" />
            </div>
            {/* Ping indicator */}
            <span className="absolute bottom-0 right-0 flex h-3.5 w-3.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                nodeStatus === 'online' ? 'bg-emerald-400' : nodeStatus === 'initializing' ? 'bg-amber-400' : 'bg-red-400'
              }`} />
              <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${
                nodeStatus === 'online' ? 'bg-emerald-500' : nodeStatus === 'initializing' ? 'bg-amber-500' : 'bg-red-500'
              }`} />
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-1">
              <span className="font-sans font-black text-2xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-400 uppercase">
                INNOVA
              </span>
              <span className="text-[9px] font-sans tracking-widest text-cyan-400 font-bold animate-pulse uppercase">
                v2.0
              </span>
            </div>
            <p className="text-[10px] font-sans font-light text-white/55 tracking-wider uppercase">UNIVERSAL ECOSYSTEM HUB</p>
          </div>
        </div>

        {onBackToHub && (
          <button
            onClick={onBackToHub}
            className="w-full flex items-center justify-center gap-2 mb-6 p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-cyan-400 font-sans text-xs tracking-wide font-semibold transition duration-300 cursor-pointer shadow-lg shadow-black/20"
          >
            <LayoutDashboard className="w-4 h-4 text-cyan-400" />
            <span>BACK TO MAIN HUB</span>
          </button>
        )}

        {/* NAVIGATION TABS LIST */}
        <div className="space-y-3.5">
          <p className="text-[10px] font-sans font-bold tracking-widest text-white/40 px-2 mb-2 uppercase">
            SELECT PLATFORM
          </p>

          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                id={`sidebar-tab-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`w-full text-left flex items-start gap-4 p-3.5 rounded-xl transition duration-300 relative group cursor-pointer ${
                  isActive 
                    ? 'bg-white/[0.03] border border-white/15 ' + item.glow
                    : 'border border-transparent hover:bg-white/[0.01] hover:border-white/5'
                }`}
              >
                {/* Active Indicator Bar */}
                {isActive && (
                  <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-lg bg-gradient-to-b from-cyan-400 to-purple-500" />
                )}

                <div className={`p-2.5 rounded-lg transition duration-300 ${
                  isActive 
                    ? 'bg-slate-900/80 border ' + item.border + ' ' + item.color
                    : 'bg-white/[0.01] border border-white/5 text-slate-400 group-hover:text-white'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <span className={`block font-sans text-[13px] font-bold tracking-tight transition duration-300 ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                  }`}>
                    {item.label}
                  </span>
                  <span className="block font-sans text-[11px] text-white/40 truncate group-hover:text-white/60 transition">
                    {item.sub}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* FOOTER WIDGET */}
      <div className="space-y-4 pt-6 border-t border-white/10">
        {/* Network Mini Status */}
        <div className="bg-white/5 rounded-xl p-3 border border-white/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl" />
          
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/10">
            <span className="text-[10px] font-sans text-white/55 font-bold tracking-wider flex items-center gap-1.5 uppercase">
              <Cpu className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '4s' }} />
              ECOSYSTEM STATUS
            </span>
            <span className={`text-[9px] font-sans px-2 py-0.5 rounded-full font-semibold ${
              nodeStatus === 'online' 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : nodeStatus === 'initializing'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                : 'bg-white/5 text-white/40 border border-white/10'
            }`}>
              {nodeStatus.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] font-sans font-light">
            <div>
              <span className="text-white/40 block">Ecosystem Sync</span>
              <span className="text-white/80 block font-semibold">
                {nodeStatus === 'online' ? '99.98%' : nodeStatus === 'initializing' ? 'Syncing...' : '0.00%'}
              </span>
            </div>
            <div>
              <span className="text-white/40 block">Ledger Block</span>
              <span className="text-cyan-400 block font-semibold">
                {nodeStatus === 'online' ? '#8,193,421' : '---'}
              </span>
            </div>
          </div>
        </div>

        {/* Crypto Wallet Integration display */}
        <div className="bg-white/5 rounded-xl p-3 border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Coins className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[9px] font-sans text-white/50 block font-bold uppercase">INNOVA WALLET</span>
              <span className="text-xs font-sans font-bold text-white block">
                {walletConnected ? `${walletBalance.toLocaleString()} $INVA` : 'Not Connected'}
              </span>
            </div>
          </div>
          {walletConnected ? (
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          ) : (
            <div className="w-2 h-2 rounded-full bg-slate-650 animate-pulse" />
          )}
        </div>

        <div className="flex items-center justify-between text-[10px] font-sans text-white/30 px-1 font-light">
          <span>Innova Chain Network</span>
          <a 
            href="https://innova-docs.net" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="hover:text-cyan-400 transition flex items-center gap-1"
            onClick={(e) => e.preventDefault()}
          >
            <span>Terminal Docs</span> <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>

    </aside>
  );
}
