import React, { useState } from 'react';
import { 
  Cpu, 
  Terminal, 
  Wallet, 
  Key, 
  RefreshCw, 
  Check, 
  Copy, 
  Server, 
  Layers, 
  ShieldCheck, 
  X, 
  Zap,
  Radio,
  HardDrive
} from 'lucide-react';
import { NetworkNode, WalletState } from '../types';

interface Web3HubProps {
  node: NetworkNode;
  setNode: React.Dispatch<React.SetStateAction<NetworkNode>>;
  wallet: WalletState;
  setWallet: React.Dispatch<React.SetStateAction<WalletState>>;
  userEmail: string;
}

export default function Web3Hub({ node, setNode, wallet, setWallet, userEmail }: Web3HubProps) {
  // Local state for interactive Node deployment
  const [deployStep, setDeployStep] = useState<'idle' | 'provisioning' | 'completed'>('idle');
  const [deployProgress, setDeployProgress] = useState(0);
  const [deployLog, setDeployLog] = useState<string[]>([]);
  const [coresCount, setCoresCount] = useState(8);
  const [nodeRegion, setNodeRegion] = useState('US_EAST_NY_SHARD');

  // Local state for Wallet Setup
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [copiedMnemonic, setCopiedMnemonic] = useState(false);
  const [hasBackedUp, setHasBackedUp] = useState(false);

  // Mnemonic pool for generating custom seed phrases
  const wordPool = [
    'cyber', 'neon', 'matrix', 'ledger', 'genesis', 'cascade', 'pixel', 'orbital', 'quantum', 'cipher', 
    'vortex', 'stellar', 'shard', 'phoenix', 'pulse', 'flux', 'phantom', 'grid', 'aurora', 'gravity',
    'velocity', 'synergy', 'alpha', 'echo', 'vector', 'horizon', 'solitude', 'titan', 'beacon', 'protocol'
  ];

  // Generate 12 random words
  const generateNewSeed = () => {
    const shuffled = [...wordPool].sort(() => 0.5 - Math.random());
    const mnemonic = shuffled.slice(0, 12);
    setWallet(prev => ({
      ...prev,
      seedPhrase: mnemonic,
      generating: false
    }));
  };

  const handleStartNodeDeployment = () => {
    setDeployStep('provisioning');
    setDeployProgress(0);
    setDeployLog([]);

    const logMessages = [
      '⚡ [SYS] Allocating container space on Innova-Core Kubernetes cluster...',
      '🛠️ [CORE] Checking cryptography keys and SSL handshakes...',
      '🛰️ [NET] Establishing ledger peer connections (expected 16 peers)...',
      '📦 [BLOCK] Mounting blockchain state db at shard /dev/nvme0n1...',
      '⚙️ [VALIDATOR] Commencing gas validator client consensus loops...',
      '🌟 [NODE] Validator successfully certified by Innova ConsenSys Engine!'
    ];

    let currentLogIndex = 0;
    const interval = setInterval(() => {
      setDeployProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setDeployStep('completed');
          // Update global state
          setNode({
            id: 'INVA-NODE-01',
            name: `${userEmail ? userEmail.split('@')[0].toUpperCase() : 'USER'}_VALIDATOR_NODE`,
            status: 'online',
            cores: coresCount,
            region: nodeRegion,
            uptime: 99.98,
            peers: 32,
            bandwidth: 124.8,
            logs: [
              'VALIDATOR_SERVICE: INIT DONE',
              `VM ASSIGNED CORES: ${coresCount}`,
              `SHARD LOCATION: ${nodeRegion}`,
              'READY TO VERIFY KREATION & ENTERTAINMENT TRANSACTIONS'
            ]
          });
          return 100;
        }

        // Add corresponding logs as progress moves along
        if (prev > 0 && prev % 20 === 0 && currentLogIndex < logMessages.length) {
          setDeployLog(oldLogs => [...oldLogs, logMessages[currentLogIndex]]);
          currentLogIndex++;
        }

        return prev + 5;
      });
    }, 150);
  };

  const initWalletModal = () => {
    setWallet(prev => ({ ...prev, generating: true }));
    generateNewSeed();
    setShowSeedModal(true);
    setHasBackedUp(false);
  };

  const copyMnemonicToClipboard = () => {
    navigator.clipboard.writeText(wallet.seedPhrase.join(' '));
    setCopiedMnemonic(true);
    setTimeout(() => setCopiedMnemonic(false), 2000);
  };

  const finalizeWalletCreation = () => {
    const mockAddress = '0x' + Array.from({ length: 40 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');

    setWallet({
      connected: true,
      address: mockAddress,
      balance: 15750.85,
      seedPhrase: wallet.seedPhrase,
      generating: false,
      confirmed: true
    });
    setShowSeedModal(false);
  };

  const handleDeconstructNode = () => {
    setNode(prev => ({
      ...prev,
      status: 'offline',
      uptime: 0,
      peers: 0,
      bandwidth: 0,
      logs: ['SYSTEM STATE: OFFLINE', 'SHUTDOWN_SIGNAL_ACKNOWLEDGED']
    }));
    setDeployStep('idle');
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      
      {/* SECTION A: CREATE DECENTRALIZED NODE INTERFACE */}
      <div className="glass-panel-cyan rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
        {/* Absolute Background visual highlight */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-400/10 text-cyan-400 border border-cyan-400/25">
                <Server className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-cyber text-sm font-bold tracking-wider text-white">
                  INNOVA NODE INITIALIZER
                </h3>
                <p className="text-xs text-slate-400 font-sans">Deploy an active validator Node on Innova L2 Chain</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <span className="text-slate-500">Status:</span>
              <span className={`font-bold ${node.status === 'online' ? 'text-emerald-400' : 'text-slate-500'}`}>
                {node.status.toUpperCase()}
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed mb-6">
            Help secure transactions across the Kreation platform and music/video distribution pipelines. Nodes compile raw logs, secure StreamShare master file deliveries, and earn <span className="text-cyan-400 font-bold">$INVA rewards</span> block-by-block.
          </p>

          {deployStep === 'idle' && node.status === 'offline' && (
            <div className="space-y-4">
              {/* Configuration Settings */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-cyber text-slate-400 block mb-1.5 font-bold">ALLOT CPU CORES</label>
                  <select 
                    value={coresCount}
                    onChange={(e) => setCoresCount(Number(e.target.value))}
                    className="w-full bg-slate-900/90 text-white rounded-xl border border-white/10 p-2.5 font-mono text-xs focus:outline-none focus:border-cyan-400"
                  >
                    <option value={4}>4 Cores (Starter)</option>
                    <option value={8}>8 Cores (Recommended)</option>
                    <option value={16}>16 Cores (Power Node)</option>
                    <option value={32}>32 Cores (Consensus Master)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-cyber text-slate-400 block mb-1.5 font-bold">NETWORK SHARD TARGET</label>
                  <select 
                    value={nodeRegion}
                    onChange={(e) => setNodeRegion(e.target.value)}
                    className="w-full bg-slate-900/90 text-white rounded-xl border border-white/10 p-2.5 font-mono text-xs focus:outline-none focus:border-cyan-400"
                  >
                    <option value="US_EAST_NY_SHARD">US East (New York)</option>
                    <option value="EU_WEST_DUBLIN_SHARD">EU West (Dublin)</option>
                    <option value="ASIA_PACIFIC_TOKYO_SHARD">Asia Pacific (Tokyo)</option>
                    <option value="SOUTH_AMERICA_SAO_SHARD">South America (São Paulo)</option>
                  </select>
                </div>
              </div>

              {/* Hardware specifications preview detail */}
              <div className="bg-slate-950/80 rounded-xl p-3.5 border border-white/5 space-y-2.5 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Validator Protocol Specs:</span>
                  <span className="text-cyan-400 font-cyber font-bold">INNOVA-LIGHTWEIGHT-v2</span>
                </div>
                <div className="h-px bg-white/5" />
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-slate-300">Reward multiplier: {(coresCount * 1.25).toFixed(1)}x</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-slate-300">Max Peer cap: 32 Peers</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Provisioning animated interface screen */}
          {deployStep === 'provisioning' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="text-cyan-400 flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  INITIALIZING MICRO-CONTAINER...
                </span>
                <span className="text-slate-300 font-bold">{deployProgress}%</span>
              </div>

              {/* Outer progress scale bar */}
              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-white/5">
                <div 
                  className="bg-gradient-to-r from-cyan-400 to-purple-500 h-full transition-all duration-150" 
                  style={{ width: `${deployProgress}%` }}
                />
              </div>

              {/* Virtual micro logs terminal display */}
              <div className="bg-slate-950 rounded-xl p-3 border border-white/5 font-mono text-[11px] h-36 overflow-y-auto space-y-1 block">
                <span className="text-slate-500 block">SYSTEM BOOTSTRAP TELEMETRY:</span>
                <span className="text-slate-400 block">------------------------------------------</span>
                {deployLog.map((log, index) => (
                  <span key={index} className="text-slate-300 block">{log}</span>
                ))}
                <span className="text-cyan-400 animate-pulse block">▋</span>
              </div>
            </div>
          )}

          {/* Active online state rendering */}
          {(node.status === 'online' || deployStep === 'completed') && (
            <div className="space-y-4">
              <div className="bg-[#0b1320] border border-cyan-400/20 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <span className="font-cyber text-xs font-bold text-white uppercase tracking-wider">{node.name}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono mt-1">SHARD IP ID: 172.93.81.25 // ACTIVE</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-cyber block font-bold text-cyan-400">EPOCH SECURED</span>
                  <span className="text-xs font-mono font-bold text-white block">#12,983</span>
                </div>
              </div>

              {/* Stats dashboard details */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-900/80 p-3 rounded-xl border border-white/5 font-mono">
                  <span className="text-[10px] text-slate-500 block">CPU Allocated</span>
                  <span className="text-xs font-bold text-white block mt-0.5">{coresCount} Cores (VM)</span>
                </div>
                <div className="bg-slate-900/80 p-3 rounded-xl border border-white/5 font-mono">
                  <span className="text-[10px] text-slate-500 block">Network Shard</span>
                  <span className="text-xs font-bold text-white block mt-0.5 max-w-full truncate" title={node.region}>
                    {node.region.replace('_SHARD', '')}
                  </span>
                </div>
                <div className="bg-slate-900/80 p-3 rounded-xl border border-white/5 font-mono">
                  <span className="text-[10px] text-slate-500 block">Live Uptime</span>
                  <span className="text-xs font-bold text-emerald-400 block mt-0.5">99.98% (Cert)</span>
                </div>
              </div>

              {/* Miniature telemetry stream logs */}
              <div className="bg-slate-950 rounded-xl p-3 border border-white/5 font-mono text-[10px] space-y-1">
                <span className="text-slate-500 block">// DECENTRALIZED CONSENSUS ENGINE FEED</span>
                <span className="text-slate-300 block">🟢 Block validation: shard hash approved by Consensus nodes</span>
                <span className="text-slate-300 block">🟢 Transferred 5,201 gaming submission files safely</span>
                <span className="text-slate-300 block">🟢 Synchronized StreamShare boards. Client delivery verified.</span>
              </div>
            </div>
          )}
        </div>

        {/* Action Toggle buttons */}
        <div className="mt-6 pt-4 border-t border-white/5 flex gap-3">
          {node.status === 'offline' && deployStep !== 'provisioning' ? (
            <button
              onClick={handleStartNodeDeployment}
              className="cursor-pointer w-full bg-cyan-400 hover:bg-cyan-300 text-black font-cyber font-bold tracking-wider py-2.5 rounded-xl text-xs transition duration-200 flex items-center justify-center gap-1.5"
            >
              <Cpu className="w-4 h-4" />
              DEPLOY INTERACTIVE VALIDATOR NODE
            </button>
          ) : deployStep === 'provisioning' ? (
            <button
              disabled
              className="w-full bg-slate-900 text-slate-500 border border-white/5 font-cyber font-bold tracking-wider py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-4 h-4 animate-spin" />
              PROVISIONING LEDGER DEPLOYMENT...
            </button>
          ) : (
            <button
              onClick={handleDeconstructNode}
              className="cursor-pointer w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 font-cyber font-bold tracking-wider py-2.5 rounded-xl text-xs transition duration-200"
            >
              DECONSTRUCT & SHUT DOWN NODE VPS
            </button>
          )}
        </div>
      </div>

      {/* SECTION B: UNIVERSAL WALLET CREATOR */}
      <div className="glass-panel-purple rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
        {/* Absolute Background visual highlight */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-400/10 text-purple-400 border border-purple-400/25">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-cyber text-sm font-bold tracking-wider text-white">
                  UNIVERSAL WALLET CREATOR
                </h3>
                <p className="text-xs text-slate-400 font-sans">Secure multi-signature wallet for the Innova Chain</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 font-mono text-xs">
              <span className="text-slate-500">Secure Vault:</span>
              <span className={`font-bold ${wallet.connected ? 'text-purple-400' : 'text-slate-500'}`}>
                {wallet.connected ? 'CONNECTED' : 'DISCONNECTED'}
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed mb-6">
            Innova utilizes custom multi-sig accounts to handle fast asset reviews, filmmaker payouts, and developer publishing. Initialize a local wallet to synchronize your credentials instantly.
          </p>

          {!wallet.connected ? (
            <div className="space-y-4">
              <div className="bg-slate-950/80 rounded-xl p-4 border border-white/5 space-y-3.5">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-purple-500/10 rounded-lg text-purple-400 mt-0.5 border border-purple-500/20">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-cyber block font-bold text-white">Full Seed Phrase Control</span>
                    <span className="text-[11px] text-slate-400 block leading-normal mt-0.5">
                      Generate a cryptographic 12-word seed phrase. Copy it down safely; we do not store private keys.
                    </span>
                  </div>
                </div>
                
                <div className="h-px bg-white/5" />
                
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-cyan-500/10 rounded-lg text-cyan-400 mt-0.5 border border-cyan-500/20">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-cyber block font-bold text-white">Gas-Free Signatures</span>
                    <span className="text-[11px] text-slate-400 block leading-normal mt-0.5">
                      StreamShare deliverable sign-offs and Indie submissions are signed with zero transaction fee slippage.
                    </span>
                  </div>
                </div>
              </div>

              {/* External web3 connect button option */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setWallet({
                      connected: true,
                      address: '0x992FECA9832A157FE459035B1D23FCDE853B8C12',
                      balance: 4210.50,
                      seedPhrase: [],
                      generating: false,
                      confirmed: true
                    });
                  }}
                  className="cursor-pointer bg-slate-900 hover:bg-slate-800 text-slate-300 font-cyber font-bold py-2.5 rounded-xl text-[11px] border border-white/10 transition flex items-center justify-center gap-1.5"
                >
                  <Layers className="w-3.5 h-3.5" />
                  CONNECT METAMASK
                </button>
                <button
                  onClick={() => {
                    setWallet({
                      connected: true,
                      address: '0x33A2FF09D22BFCD887FCDE998BD7532A6451B082',
                      balance: 915.20,
                      seedPhrase: [],
                      generating: false,
                      confirmed: true
                    });
                  }}
                  className="cursor-pointer bg-slate-900 hover:bg-slate-800 text-slate-300 font-cyber font-bold py-2.5 rounded-xl text-[11px] border border-white/10 transition flex items-center justify-center gap-1.5"
                >
                  <HardDrive className="w-3.5 h-3.5" />
                  CONNECT PHANTOM
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Connected State display */}
              <div className="bg-[#120f20] border border-purple-500/20 rounded-xl p-4">
                <span className="text-[10px] font-cyber text-purple-400 font-bold tracking-wider block">NATIVE ON-CHAIN ACCOUNT</span>
                
                <div className="flex items-center justify-between mt-2">
                  <span className="font-mono text-sm font-bold text-white tracking-widest leading-none">
                    {wallet.address}
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-purple-500/10 mt-3 pt-3">
                  <div>
                    <span className="text-[10px] font-sans text-slate-400 block">Ledger Balance</span>
                    <span className="text-lg font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-400 tracking-wider">
                      {wallet.balance.toLocaleString()} $INVA
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-sans text-slate-400 block">Conversion Est.</span>
                    <span className="text-xs font-mono text-slate-300 block">
                      ${(wallet.balance * 1.42).toFixed(2)} USD
                    </span>
                  </div>
                </div>
              </div>

              {/* Interactive Quick action stats */}
              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-white/5 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>Signatures Verified:</span>
                  <span className="text-purple-300 font-bold">14 Approved</span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>Reward payout:</span>
                  <span className="text-emerald-400 font-bold">+18.2 $INVA / Epoch</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-white/5 flex gap-3">
          {!wallet.connected ? (
            <button
              onClick={initWalletModal}
              className="cursor-pointer w-full bg-purple-500 hover:bg-purple-400 text-white font-cyber font-bold tracking-wider py-2.5 rounded-xl text-xs transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/15"
            >
              <Key className="w-4 h-4" />
              CREATE NATIVE MULTI-SIG WALLET
            </button>
          ) : (
            <button
              onClick={() => {
                setWallet({
                  connected: false,
                  address: '',
                  balance: 0,
                  seedPhrase: [],
                  generating: false,
                  confirmed: false
                });
              }}
              className="cursor-pointer w-full bg-slate-900 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 text-slate-400 font-cyber font-bold py-2.5 rounded-xl text-xs transition border border-white/10"
            >
              DISCONNECT CURRENT INNOVA WALLET
            </button>
          )}
        </div>

        {/* MODAL WINDOW FOR MNEMONIC SEED GENERATION */}
        {showSeedModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="glass-panel-purple max-w-lg w-full rounded-2xl border border-purple-500/30 p-6 space-y-6 relative animate-float" style={{ animationDuration: '6s' }}>
              
              <button 
                onClick={() => setShowSeedModal(false)}
                className="absolute top-4 right-4 text-slate-500 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center space-y-1.5 pb-2 border-b border-white/5">
                <div className="w-12 h-12 rounded-xl bg-purple-400/20 text-purple-400 border border-purple-400/25 flex items-center justify-center mx-auto mb-2">
                  <Key className="w-6 h-6 animate-spin" style={{ animationDuration: '5s' }} />
                </div>
                <h4 className="font-cyber text-base font-bold tracking-wider text-white">GENERATE RECOVERY SEED</h4>
                <p className="text-xs text-slate-400">Copy this phrase safely. You will need it to recover account balance.</p>
              </div>

              {/* Seed phrase display grid */}
              <div className="grid grid-cols-3 gap-2.5">
                {wallet.seedPhrase.map((word, index) => (
                  <div key={index} className="bg-slate-950 p-2.5 rounded-xl border border-white/[0.04] text-center font-mono text-xs relative overflow-hidden group">
                    <span className="text-[9px] text-slate-600 absolute top-1 left-1.5 leading-none">{index+1}</span>
                    <span className="text-white font-bold block">{word}</span>
                  </div>
                ))}
              </div>

              {/* Copy prompt button action */}
              <div className="flex items-center justify-between bg-slate-900/60 p-3 rounded-xl border border-white/5">
                <div className="text-left">
                  <span className="text-[10px] text-slate-500 block font-mono">Ledger Cryptography Key:</span>
                  <span className="text-[11px] text-slate-300 font-mono block">SHA-256 MultiSig Encoded</span>
                </div>
                
                <button
                  onClick={copyMnemonicToClipboard}
                  className="cursor-pointer bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/35 px-4.5 py-2 rounded-xl text-xs font-cyber tracking-wider font-bold transition flex items-center gap-1.5"
                >
                  {copiedMnemonic ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copiedMnemonic ? 'COPIED!' : 'COPY PHRASE'}
                </button>
              </div>

              {/* Security checkbox user confirmation */}
              <div className="flex items-start gap-3 p-1">
                <input 
                  type="checkbox" 
                  id="backup_check" 
                  checked={hasBackedUp}
                  onChange={(e) => setHasBackedUp(e.target.checked)}
                  className="mt-1 cursor-pointer accent-purple-500"
                />
                <label htmlFor="backup_check" className="text-xs text-slate-400 leading-normal cursor-pointer">
                  I understand that if I lose my recovery seed phrase, I will lose access to my <span className="text-purple-400 font-bold">$INVA tokens</span> and active gaming nodes.
                </label>
              </div>

              {/* Final Confirm controls */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSeedModal(false)}
                  className="cursor-pointer flex-1 bg-slate-900 hover:bg-slate-800 text-slate-400 font-cyber font-bold py-2.5 rounded-xl text-xs transition"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  disabled={!hasBackedUp}
                  onClick={finalizeWalletCreation}
                  className={`flex-1 font-cyber font-bold py-2.5 rounded-xl text-xs transition duration-200 ${
                    hasBackedUp 
                      ? 'bg-purple-500 hover:bg-purple-400 text-white shadow-lg shadow-purple-500/20' 
                      : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-white/5'
                  }`}
                >
                  ACTIVATE ACCOUNT
                </button>
              </div>

            </div>
          </div>
        )}

      </div>

    </div>
  );
}
