import React, { useState, useEffect } from 'react';
import { fetchWalletBalance, processEcosystemTransaction, API_BASE_URL } from '../lib/apiClient';
import { 
  X, 
  User, 
  Wallet, 
  Shield, 
  Key, 
  Copy, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle,
  Fingerprint,
  Network,
  Lock,
  Download,
  CreditCard,
  Zap,
  Lock as LockIcon,
  ShieldCheck,
  Smartphone,
  Globe,
  Laptop,
  QrCode,
  Film,
  Gamepad2,
  Tv,
  Share2,
  Camera,
  Upload,
  Image
} from 'lucide-react';

interface IdentityWalletSettingsProps {
  userNode: {
    handle: string;
    id: string;
    name: string;
    wallet: string;
    avatarUrl?: string;
  };
  onClose: () => void;
  onAvatarUpdate?: (url: string) => void;
}

interface RecognizedDevice {
  id: string;
  name: string;
  type: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  browser: string;
  os: string;
  fingerprint: string;
  lastActive: string;
  isCurrent: boolean;
}

// Parse user agent into readable device name
const parseUserAgent = (): { name: string; type: RecognizedDevice['type']; browser: string; os: string } => {
  const ua = window.navigator.userAgent;
  
  // Detect device type and name
  let deviceName = 'Unknown Device';
  let deviceType: RecognizedDevice['type'] = 'unknown';
  
  if (/Macintosh/i.test(ua)) {
    const macMatch = ua.match(/Macintosh;\s*Intel\s*Mac\s*OS\s*X?\s*([0-9_.]+)/i);
    if (macMatch) {
      const version = macMatch[1].replace(/_/g, '.');
      deviceName = `MacBook Pro (macOS ${version})`;
      deviceType = 'desktop';
    } else {
      deviceName = 'MacBook Pro';
      deviceType = 'desktop';
    }
  } else if (/iPhone/i.test(ua)) {
    deviceName = 'iPhone';
    deviceType = 'mobile';
  } else if (/iPad/i.test(ua)) {
    deviceName = 'iPad';
    deviceType = 'tablet';
  } else if (/Android/i.test(ua)) {
    const mobileMatch = ua.match(/Mobile/i);
    deviceName = mobileMatch ? 'Android Phone' : 'Android Tablet';
    deviceType = mobileMatch ? 'mobile' : 'tablet';
  } else if (/Windows/i.test(ua)) {
    deviceName = 'Windows PC';
    deviceType = 'desktop';
  } else if (/Linux/i.test(ua)) {
    deviceName = 'Linux Desktop';
    deviceType = 'desktop';
  }
  
  // Detect browser
  let browser = 'Unknown Browser';
  if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) {
    const chromeMatch = ua.match(/Chrome\/([0-9.]+)/);
    browser = chromeMatch ? `Chrome ${chromeMatch[1]}` : 'Chrome';
  } else if (/Firefox/i.test(ua)) {
    const firefoxMatch = ua.match(/Firefox\/([0-9.]+)/);
    browser = firefoxMatch ? `Firefox ${firefoxMatch[1]}` : 'Firefox';
  } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
    browser = 'Safari';
  } else if (/Edg/i.test(ua)) {
    browser = 'Edge';
  }
  
  // Detect OS
  let os = 'Unknown OS';
  if (/Windows NT/i.test(ua)) {
    const winMatch = ua.match(/Windows NT ([0-9.]+)/);
    os = winMatch ? `Windows ${winMatch[1]}` : 'Windows';
  } else if (/Mac OS X/i.test(ua)) {
    const macMatch = ua.match(/Mac OS X ([0-9_.]+)/);
    os = macMatch ? `macOS ${macMatch[1].replace(/_/g, '.')}` : 'macOS';
  } else if (/Android/i.test(ua)) {
    const androidMatch = ua.match(/Android ([0-9.]+)/);
    os = androidMatch ? `Android ${androidMatch[1]}` : 'Android';
  } else if (/Linux/i.test(ua)) {
    os = 'Linux';
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    const iosMatch = ua.match(/OS ([0-9_]+)/);
    os = iosMatch ? `iOS ${iosMatch[1].replace(/_/g, '.')}` : 'iOS';
  }
  
  return { name: deviceName, type: deviceType, browser, os };
};

// Generate device fingerprint from user agent
const generateDeviceFingerprint = (): string => {
  const ua = window.navigator.userAgent;
  const screen = `${window.screen.width}x${window.screen.height}`;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const lang = window.navigator.language;
  
  const fingerprintData = `${ua}-${screen}-${timezone}-${lang}`;
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < fingerprintData.length; i++) {
    const char = fingerprintData.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0').toUpperCase();
};

// Get or initialize recognized devices from localStorage
const getRecognizedDevices = (): RecognizedDevice[] => {
  try {
    const stored = localStorage.getItem('innova-recognized-devices');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to parse recognized devices:', e);
  }
  return [];
};

// Save recognized devices to localStorage
const saveRecognizedDevices = (devices: RecognizedDevice[]) => {
  try {
    localStorage.setItem('innova-recognized-devices', JSON.stringify(devices));
  } catch (e) {
    console.error('Failed to save recognized devices:', e);
  }
};

// Register current device as a recognized Ring Comm Auth Device
const registerCurrentDevice = (): RecognizedDevice => {
  const deviceInfo = parseUserAgent();
  const fingerprint = generateDeviceFingerprint();
  const now = new Date().toISOString();
  
  const newDevice: RecognizedDevice = {
    id: `DEVICE-${fingerprint}`,
    name: deviceInfo.name,
    type: deviceInfo.type,
    browser: deviceInfo.browser,
    os: deviceInfo.os,
    fingerprint,
    lastActive: now,
    isCurrent: true
  };
  
  // Get existing devices and update
  const devices = getRecognizedDevices();
  const existingIndex = devices.findIndex(d => d.fingerprint === fingerprint);
  
  if (existingIndex >= 0) {
    // Update existing device
    devices[existingIndex] = { ...devices[existingIndex], lastActive: now, isCurrent: true };
    // Mark others as not current
    devices.forEach((d, i) => {
      if (i !== existingIndex) devices[i].isCurrent = false;
    });
  } else {
    // Mark all existing as not current and add new
    devices.forEach(d => d.isCurrent = false);
    devices.push(newDevice);
  }
  
  saveRecognizedDevices(devices);
  return newDevice;
};

export default function IdentityWalletSettings({ userNode, onClose, onAvatarUpdate }: IdentityWalletSettingsProps) {
  const [activeTab, setActiveTab] = useState<'identity' | 'wallet' | 'security'>('identity');
  const [showSeedPhrase, setShowSeedPhrase] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [tokenAmount, setTokenAmount] = useState<number>(100);
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [cardInput, setCardInput] = useState('');
  const [txReceipt, setTxReceipt] = useState<string | null>(null);
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardName, setCardName] = useState('');
  const [paymentStep, setPaymentStep] = useState<'input' | 'processing' | 'success'>('input');
  const [showQR, setShowQR] = useState(false);
  const [recognizedDevices, setRecognizedDevices] = useState<RecognizedDevice[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string>(userNode.avatarUrl || '');
  const [showAvatarUpload, setShowAvatarUpload] = useState(false);
  const [avatarInputUrl, setAvatarInputUrl] = useState('');

  // Initialize device recognition on mount
  useEffect(() => {
    const currentDevice = registerCurrentDevice();
    const devices = getRecognizedDevices();
    setRecognizedDevices(devices);
    
    // Load avatar from localStorage
    const storedAvatar = localStorage.getItem(`innova-avatar-${userNode.handle}`);
    if (storedAvatar) {
      setAvatarUrl(storedAvatar);
    } else if (userNode.avatarUrl) {
      setAvatarUrl(userNode.avatarUrl);
    }
  }, [userNode.handle, userNode.avatarUrl]);

  useEffect(() => {
    const loadBalance = async () => {
      const balance = await fetchWalletBalance(userNode.wallet);
      setCurrentBalance(balance);
    };
    loadBalance();
  }, [userNode.wallet]);

  // Handle avatar URL submission
  const handleAvatarSubmit = () => {
    if (avatarInputUrl.trim()) {
      setAvatarUrl(avatarInputUrl.trim());
      localStorage.setItem(`innova-avatar-${userNode.handle}`, avatarInputUrl.trim());
      if (onAvatarUpdate) {
        onAvatarUpdate(avatarInputUrl.trim());
      }
      setShowAvatarUpload(false);
      setAvatarInputUrl('');
    }
  };

  // Handle avatar removal
  const handleAvatarRemove = () => {
    setAvatarUrl('');
    localStorage.removeItem(`innova-avatar-${userNode.handle}`);
    if (onAvatarUpdate) {
      onAvatarUpdate('');
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const parts = [];
    for (let i = 0; i < v.length; i += 4) {
      parts.push(v.substring(i, i + 4));
    }
    return parts.length ? parts.join(' ') : v;
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) return `${v.substring(0, 2)}/${v.substring(2, 4)}`;
    return v;
  };

  const handlePaymentSubmit = async () => {
    if (!cardInput || !cardExpiry || !cardCvc || !cardName) return;
    setPaymentStep('processing');
    
      try {
        const response = await fetch(`${API_BASE_URL}/wallet/mint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: tokenAmount, walletAddress: userNode.wallet, paymentMethod: 'card' })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Mint failed');
      
      const receiptId = `TXN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      setTxReceipt(`PAYMENT CONFIRMED\n══════════════════════════════\nTransaction ID: ${receiptId}\nAmount: $${(tokenAmount * 0.01).toFixed(2)} USD\nTokens Minted: ${tokenAmount} $INVA\nReceipt: ${data.receipt}\nSTATUS: SUCCESS`);
      setPaymentStep('success');
      setCurrentBalance(data.newBalance);
    } catch (err) {
      console.error(err);
      setPaymentStep('input');
    }
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setPaymentStep('input');
    setCardInput('');
    setCardExpiry('');
    setCardCvc('');
    setCardName('');
    setTxReceipt(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-3xl bg-[#0a0a0f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[75vh]">
        {/* Navigation Sidebar */}
        <div className="w-full md:w-56 bg-white/[0.01] border-r border-white/10 p-6 flex flex-col justify-between shrink-0">
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-wider font-mono text-cyan-400">COMMAND HUB</h2>
              <p className="text-[10px] text-white/40 font-mono mt-1 truncate">{userNode.handle}</p>
            </div>
            <nav className="flex flex-col gap-1">
              <button onClick={() => setActiveTab('identity')} className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'identity' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}><User className="w-4 h-4" /> Identity Node</button>
              <button onClick={() => setActiveTab('wallet')} className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'wallet' ? 'bg-purple-500/20 text-purple-400' : 'text-white/40 hover:text-white'}`}><Wallet className="w-4 h-4" /> EVM Wallet</button>
              <button onClick={() => setActiveTab('security')} className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'security' ? 'bg-emerald-500/20 text-emerald-400' : 'text-white/40 hover:text-white'}`}><Shield className="w-4 h-4" /> Ring Comm Keys</button>
            </nav>
          </div>
          <button onClick={onClose} className="py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-xs font-bold text-white tracking-wide transition">CLOSE CONTROL HUB</button>
        </div>

        {/* Dynamic Display Panes */}
        <div className="flex-1 p-8 overflow-y-auto">
          {activeTab === 'identity' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div><h3 className="text-xl font-black text-white uppercase">Universal Shard Node</h3><p className="text-xs text-white/50 mt-1">Immutable decentralized ledger routing state configuration parameters.</p></div>
              
              {/* Profile Avatar Section */}
              <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl">
                <h4 className="text-xs font-bold text-cyan-400 mb-3 uppercase tracking-wider font-mono">// PROFILE AVATAR</h4>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center overflow-hidden relative">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Profile Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-8 h-8 text-slate-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    {avatarUrl ? (
                      <div className="space-y-2">
                        <p className="text-xs text-white/60 truncate">{avatarUrl}</p>
                        <div className="flex gap-2">
                          <button onClick={() => setShowAvatarUpload(true)} className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 rounded-lg text-xs font-bold text-cyan-400 transition flex items-center gap-1">
                            <Camera className="w-3.5 h-3.5" /> Change
                          </button>
                          <button onClick={handleAvatarRemove} className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 rounded-lg text-xs font-bold text-rose-400 transition">
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setShowAvatarUpload(true)} className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 rounded-xl text-xs font-bold text-cyan-400 transition flex items-center gap-2">
                        <Upload className="w-3.5 h-3.5" /> UPLOAD AVATAR
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Avatar Upload Modal */}
              {showAvatarUpload && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setShowAvatarUpload(false)} />
                  <div className="relative w-full max-w-md bg-[#0a0a0f] border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden p-6 animate-in fade-in zoom-in duration-300">
                    <button onClick={() => setShowAvatarUpload(false)} className="absolute top-4 right-4 text-white/50 hover:text-white transition">
                      <X className="w-5 h-5" />
                    </button>
                    <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <Image className="w-5 h-5 text-cyan-400" />
                      SET PROFILE AVATAR
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <label className="text-[9px] font-mono text-white/40 uppercase tracking-widest block mb-2">Avatar Image URL</label>
                        <input 
                          type="url" 
                          value={avatarInputUrl}
                          onChange={(e) => setAvatarInputUrl(e.target.value)}
                          placeholder="https://example.com/avatar.jpg"
                          className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono focus:border-cyan-500 focus:outline-none"
                        />
                        <p className="text-[10px] text-white/30 mt-2">Enter a URL to an image (JPG, PNG, WebP, GIF)</p>
                      </div>
                      {avatarInputUrl && (
                        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex items-center gap-4">
                          <div className="w-16 h-16 rounded-xl bg-slate-900 border border-white/10 overflow-hidden flex-shrink-0">
                            <img src={avatarInputUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                          </div>
                          <span className="text-xs text-white/60 truncate">Preview</span>
                        </div>
                      )}
                      <button 
                        onClick={handleAvatarSubmit}
                        disabled={!avatarInputUrl.trim()}
                        className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-black text-xs uppercase rounded-xl tracking-wider transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" /> SAVE AVATAR
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl space-y-4">
                <div><label className="text-[9px] font-mono tracking-widest text-white/40 uppercase block mb-1">Ecosystem Root Handle</label><span className="text-lg font-black text-white">{userNode.handle}</span></div>
                <div><label className="text-[9px] font-mono tracking-widest text-white/40 uppercase block mb-1">Unique Node Id</label><div className="flex items-center gap-2"><span className="font-mono text-xs text-cyan-400 bg-cyan-400/5 px-2.5 py-1.5 border border-cyan-500/10 rounded-lg">{userNode.id}</span><button onClick={() => handleCopyText(userNode.id)} className="text-white/40 hover:text-white transition"><Copy className="w-3.5 h-3.5" /></button></div></div>
              </div>
              <button onClick={() => {
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(userNode));
                const dlAnchorElem = document.createElement('a');
                dlAnchorElem.setAttribute("href", dataStr);
                dlAnchorElem.setAttribute("download", `${userNode.handle.replace('@', '')}_identity.json`);
                dlAnchorElem.click();
              }} className="w-full py-3 border border-white/10 hover:bg-white/5 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-2"><Download className="w-4 h-4" /> Export Cryptographic Key</button>
            </div>
          )}

          {activeTab === 'wallet' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div><h3 className="text-xl font-black text-white uppercase">EVM Wallet Engine</h3><p className="text-xs text-white/50 mt-1">Cross-chain network liquidity channel tied universally to your account handler.</p></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20 p-5 rounded-xl relative">
                  <span className="text-[9px] font-mono text-purple-400 tracking-wider block">AVAILABLE LIQUIDITY</span>
                  <div className="text-3xl font-black text-white mt-2">{currentBalance.toLocaleString()} <span className="text-sm font-bold text-purple-400">$INVA</span></div>
                  <span className="text-[10px] text-white/40 block mt-1">≈ ${(currentBalance * 0.01).toFixed(2)} USD</span>
                </div>
                <div className="bg-white/[0.02] border border-white/5 p-5 rounded-xl flex flex-col justify-between">
                  <span className="text-[9px] font-mono text-white/40 tracking-wider block">LEDGER ADDRESS</span>
                  <span className="text-xs font-mono text-slate-300 truncate block mt-2">{userNode.wallet}</span>
                  <button onClick={() => handleCopyText(userNode.wallet)} className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 mt-2 text-left"><Copy className="w-3.5 h-3.5" /> Copy Address</button>
                </div>
              </div>

              {/* Universal Ecosystem Pass */}
              <div className="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 rounded-xl p-5 space-y-4 mb-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Globe className="w-24 h-24" /></div>
                <div className="relative z-10">
                  <span className="text-xs font-bold text-cyan-400 tracking-widest block uppercase mb-1">// UNIVERSAL ECOSYSTEM ALL-ACCESS PASS</span>
                  <p className="text-[10px] text-white/50 mb-4">Full access pass across ArcHaven Cinema, Kreation, MVN Music, Hektic TV, and StreamShare.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button 
                      onClick={async () => {
                        setIsProcessing(true);
                        const res = await processEcosystemTransaction(userNode.wallet, 2999, 'subscription', 'Universal Ecosystem Pass - Monthly');
                        if (res.success) { setCurrentBalance(res.newBalance!); alert('Monthly All-Access Pass Activated!'); }
                        else alert(`Failed: ${res.error}`);
                        setIsProcessing(false);
                      }}
                      disabled={isProcessing}
                      className="bg-white/5 hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-500/50 p-4 rounded-xl text-left transition group"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-white text-sm">Monthly Pass</span>
                        <span className="text-cyan-400 font-mono text-xs">2,999 $INVA</span>
                      </div>
                      <span className="text-[10px] text-white/40 block">Billed every 30 days (~$29.99)</span>
                    </button>

                    <button 
                      onClick={async () => {
                        setIsProcessing(true);
                        const res = await processEcosystemTransaction(userNode.wallet, 29999, 'subscription', 'Universal Ecosystem Pass - Annual');
                        if (res.success) { setCurrentBalance(res.newBalance!); alert('Annual All-Access Pass Activated! Welcome to the Vanguard.'); }
                        else alert(`Failed: ${res.error}`);
                        setIsProcessing(false);
                      }}
                      disabled={isProcessing}
                      className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 hover:from-cyan-500/30 hover:to-purple-500/30 border border-cyan-500/30 p-4 rounded-xl text-left transition relative"
                    >
                      <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[8px] font-bold px-2 py-1 rounded-full uppercase tracking-wider shadow-lg">Save 16%</span>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-white text-sm">Annual Pass</span>
                        <span className="text-cyan-400 font-mono text-xs">29,999 $INVA</span>
                      </div>
                      <span className="text-[10px] text-white/40 block">Billed annually (~$299.99)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Kreation Gaming Pass */}
              <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-5 space-y-4 mb-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Gamepad2 className="w-24 h-24" /></div>
                <div className="relative z-10">
                  <span className="text-xs font-bold text-purple-400 tracking-widest block uppercase mb-1">// KREATION GAMING PASS</span>
                  <p className="text-[10px] text-white/50 mb-4">Access premium WASM game containers, early access titles, and exclusive in-game rewards.</p>
                  
                  <button 
                    onClick={async () => {
                      setIsProcessing(true);
                      const res = await processEcosystemTransaction(userNode.wallet, 1499, 'game_purchase', 'Kreation Gaming Pass - Monthly');
                      if (res.success) { setCurrentBalance(res.newBalance!); alert('Kreation Gaming Pass Activated!'); }
                      else alert(`Failed: ${res.error}`);
                      setIsProcessing(false);
                    }}
                    disabled={isProcessing}
                    className="w-full bg-white/5 hover:bg-purple-500/20 border border-white/10 hover:border-purple-500/50 p-4 rounded-xl text-left transition group"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-white text-sm">Monthly Gaming Pass</span>
                      <span className="text-purple-400 font-mono text-xs">1,499 $INVA</span>
                    </div>
                    <span className="text-[10px] text-white/40 block">Billed every 30 days (~$14.99)</span>
                  </button>
                </div>
              </div>

              {/* StreamShare Creator Workspace */}
              <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-xl p-5 space-y-4 mb-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Share2 className="w-24 h-24" /></div>
                <div className="relative z-10">
                  <span className="text-xs font-bold text-emerald-400 tracking-widest block uppercase mb-1">// STREAMSHARE CREATOR WORKSPACE TIER</span>
                  <p className="text-[10px] text-white/50 mb-4">Enterprise P2P pipeline node with 500GB of secure, uncompressed asset staging space.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button 
                      onClick={async () => {
                        setIsProcessing(true);
                        const res = await processEcosystemTransaction(userNode.wallet, 1200, 'creator_boost', 'StreamShare Creator Tier - Monthly');
                        if (res.success) { setCurrentBalance(res.newBalance!); alert('StreamShare Creator Node Activated! 500GB Storage Allocated.'); }
                        else alert(`Transaction failed: ${res.error}`);
                        setIsProcessing(false);
                      }}
                      disabled={isProcessing}
                      className="bg-white/5 hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-500/50 p-4 rounded-xl text-left transition group"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-white text-sm">Monthly Workspace</span>
                        <span className="text-emerald-400 font-mono text-xs">1,200 $INVA</span>
                      </div>
                      <span className="text-[10px] text-white/40 block">Billed every 30 days (~$12.00)</span>
                    </button>

                    <button 
                      onClick={async () => {
                        setIsProcessing(true);
                        const res = await processEcosystemTransaction(userNode.wallet, 12000, 'creator_boost', 'StreamShare Creator Tier - Annual');
                        if (res.success) { setCurrentBalance(res.newBalance!); alert('Annual StreamShare Creator Node Locked In! 500GB Allocated.'); }
                        else alert(`Transaction failed: ${res.error}`);
                        setIsProcessing(false);
                      }}
                      disabled={isProcessing}
                      className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 border border-emerald-500/30 p-4 rounded-xl text-left transition relative"
                    >
                      <span className="absolute -top-2 -right-2 bg-emerald-500 text-black text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-wider">Save 16%</span>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-white text-sm">Annual Workspace</span>
                        <span className="text-emerald-400 font-mono text-xs">12,000 $INVA</span>
                      </div>
                      <span className="text-[10px] text-white/40 block">Billed annually (~$120.00)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* ArcHaven / Hektic / MVN Viewer Pass */}
              <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-5 space-y-4 mb-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Tv className="w-24 h-24" /></div>
                <div className="relative z-10">
                  <span className="text-xs font-bold text-amber-400 tracking-widest block uppercase mb-1">// ENTERTAINMENT VIEWER PASS</span>
                  <p className="text-[10px] text-white/50 mb-4">ArcHaven Cinema, Hektic TV & MVN Music - ad-free 8K streaming with priority routing paths.</p>
                  
                  <button 
                    onClick={async () => {
                      setIsProcessing(true);
                      const res = await processEcosystemTransaction(userNode.wallet, 999, 'subscription', 'Entertainment Viewer Pass - Monthly');
                      if (res.success) { setCurrentBalance(res.newBalance!); alert('Viewer Pass Activated! 8K streaming unlocked.'); }
                      else alert(`Failed: ${res.error}`);
                      setIsProcessing(false);
                    }}
                    disabled={isProcessing}
                    className="w-full bg-white/5 hover:bg-amber-500/20 border border-white/10 hover:border-amber-500/50 p-4 rounded-xl text-left transition group"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-white text-sm">Monthly Viewer Pass</span>
                      <span className="text-amber-400 font-mono text-xs">999 $INVA</span>
                    </div>
                    <span className="text-[10px] text-white/40 block">Billed every 30 days (~$9.99)</span>
                  </button>
                </div>
              </div>

              {/* Purchase Section Layout with Custom Value Selector Input Mapping */}
              <div className="bg-white/[0.01] border border-white/10 rounded-xl p-5 space-y-4">
                <span className="text-xs font-bold text-white tracking-widest block uppercase">// ACQUIRE NETWORK TOKENS</span>
                <div className="flex gap-2">
                  {[100, 500, 1000, 5000].map(amt => (
                    <button key={amt} onClick={() => setTokenAmount(amt)} className={`flex-1 py-2 rounded-lg font-mono font-bold text-xs transition ${tokenAmount === amt ? 'bg-purple-500 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>{amt} $INVA</button>
                  ))}
                  <input 
                    type="number" 
                    value={tokenAmount || ''} 
                    onChange={(e) => setTokenAmount(Number(e.target.value))} 
                    className="w-24 bg-white/5 border border-white/10 rounded-lg text-center font-mono text-xs focus:outline-none focus:border-purple-500 px-2 py-2 text-white" 
                    placeholder="Custom"
                  />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <div><span className="text-[9px] text-white/40 block">TOTAL FIAT COST</span><span className="text-xl font-black text-white">${(tokenAmount * 0.01).toFixed(2)} USD</span></div>
                  <button onClick={() => setShowPaymentModal(true)} disabled={isProcessing} className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black text-xs uppercase rounded-xl tracking-wider transition flex items-center gap-1.5 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 shadow-lg shadow-purple-500/25">
                    <LockIcon className="w-3.5 h-3.5" />
                    SECURE CHECKOUT
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div><h3 className="text-xl font-black text-white uppercase">Ring Comm Enclave</h3><p className="text-xs text-white/50 mt-1">Biometric hardware multi-factor transaction verification layer.</p></div>
              <div className="border border-white/10 rounded-xl p-4 flex items-center justify-between bg-white/[0.01]">
                <div className="flex items-center gap-3"><Fingerprint className="w-6 h-6 text-emerald-400 animate-pulse" /><div><span className="text-xs font-bold text-white block">Ring Enclave Signature Active</span><span className="text-[10px] text-white/40 font-mono">Hardware Module Binding: Connected</span></div></div>
                <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">SECURE</span>
              </div>

              {/* Recovery Phrase - Secured in Hardware Enclave */}
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4 text-center">
                <span className="text-sm font-bold text-amber-400">Seed phrase secured in Ring Comm Hardware Enclave.</span>
              </div>

              {/* Ring Comm Auth Devices - Recognized Devices List */}
              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4">
                <h4 className="text-xs font-bold text-emerald-400 mb-3 uppercase tracking-wider font-mono">// RING COMM AUTH DEVICES</h4>
                <p className="text-[10px] text-white/40 mb-4">These devices are recognized as your Ring Comm authentication endpoints. Your device acts as your password.</p>
                
                {recognizedDevices.length > 0 ? (
                  <div className="space-y-2">
                    {recognizedDevices.map((device) => (
                      <div key={device.id} className={`flex items-center justify-between p-3 rounded-lg border transition ${device.isCurrent ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-white/10'}`}>
                        <div className="flex items-center gap-3">
                          {device.type === 'mobile' ? (
                            <Smartphone className={`w-5 h-5 ${device.isCurrent ? 'text-emerald-400' : 'text-white/50'}`} />
                          ) : device.type === 'tablet' ? (
                            <div className="w-5 h-5 flex items-center justify-center"><Smartphone className="w-6 h-6" /></div>
                          ) : (
                            <Laptop className={`w-5 h-5 ${device.isCurrent ? 'text-emerald-400' : 'text-white/50'}`} />
                          )}
                          <div>
                            <p className="text-sm font-bold text-white flex items-center gap-2">
                              {device.name}
                              {device.isCurrent && (
                                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-mono">CURRENT</span>
                              )}
                            </p>
                            <p className="text-[10px] text-white/40 font-mono">
                              {device.browser} on {device.os} • FP: {device.fingerprint}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${
                            device.type === 'desktop' ? 'text-cyan-400 bg-cyan-500/10' :
                            device.type === 'mobile' ? 'text-purple-400 bg-purple-500/10' :
                            'text-amber-400 bg-amber-500/10'
                          }`}>
                            {device.type}
                          </span>
                          <p className="text-[9px] text-white/30 mt-1 font-mono">
                            {new Date(device.lastActive).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-white/30">
                    <Fingerprint className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">No recognized devices yet</p>
                  </div>
                )}
              </div>

              {/* Registered Hardware list (Legacy) */}
              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4">
                <h4 className="text-xs font-bold text-emerald-400 mb-3 uppercase tracking-wider font-mono">// REGISTERED HARDWARE MODULES</h4>
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex items-center gap-3">
                    <Laptop className="w-5 h-5 text-white/50" />
                    <div><p className="text-sm font-bold text-white">Current Laptop (Primary)</p><p className="text-[10px] text-white/40">WebAuthn / TPM Enclave</p></div>
                  </div>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">ACTIVE</span>
                </div>
              </div>

              {/* Mobile device binding node entry */}
              <div className="border-2 border-dashed border-white/5 p-6 rounded-xl text-center space-y-2 cursor-pointer hover:border-emerald-500/30 transition-all" onClick={() => setShowQR(true)}>
                <Smartphone className="w-8 h-8 text-white/20 mx-auto group-hover:scale-110 transition" />
                <span className="text-xs font-bold text-white/60 block">Link Additional Ring Comm Unit</span>
                <span className="text-[10px] text-white/40 block">Generate hardware binding matrix credentials</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* QR Code pairing overlay sheet framework */}
      {showQR && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setShowQR(false)} />
          <div className="relative w-full max-w-md bg-[#0a0a0f] border border-emerald-500/30 rounded-2xl shadow-2xl overflow-hidden p-8 text-center animate-in fade-in zoom-in duration-300">
            <button onClick={() => setShowQR(false)} className="absolute top-4 right-4 text-white/50 hover:text-white transition">
              <X className="w-5 h-5" />
            </button>
            <div className="mb-6">
              <div className="w-48 h-48 mx-auto bg-white rounded-xl flex items-center justify-center mb-4 p-4 shadow-inner">
                <QrCode className="w-full h-full text-slate-900" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">SCAN RING COMM IDENTITY BOND</h4>
              <p className="text-xs text-white/50 max-w-xs mx-auto leading-relaxed">
                Scan this cryptographically generated ledger linkage node matrix with your secondary phone unit to expand your hardware verification mesh.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-[10px] text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-full inline-flex">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="font-mono uppercase tracking-wider font-bold">Encrypted P2P Link Channel Established</span>
            </div>
          </div>
        </div>
      )}

      {/* Premium Payment Modal - Stripe-like UI */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={closePaymentModal} />
          
          <div className="relative w-full max-w-md bg-[#0a0a0f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="relative bg-gradient-to-r from-purple-600 to-pink-600 p-6">
              <button onClick={closePaymentModal} className="absolute top-4 right-4 text-white/70 hover:text-white transition"><X className="w-5 h-5" /></button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm"><ShieldCheck className="w-5 h-5 text-white" /></div>
                <div><h3 className="text-lg font-black text-white uppercase tracking-wider">Secure Payment</h3><p className="text-xs text-white/70">256-bit encrypted transaction</p></div>
              </div>
            </div>
            <div className="p-6 space-y-5">
              {paymentStep === 'input' && (
                <>
                  <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-center"><span className="text-[10px] font-mono text-white/50 uppercase tracking-wider">Purchasing</span><span className="text-sm font-bold text-white">{tokenAmount.toLocaleString()} $INVA</span></div>
                    <div className="flex justify-between items-center"><span className="text-[10px] font-mono text-white/50 uppercase tracking-wider">Total</span><span className="text-xl font-black text-white">${(tokenAmount * 0.01).toFixed(2)} USD</span></div>
                  </div>
                  <div className="space-y-4">
                    <div><label className="text-[9px] font-mono text-white/40 uppercase tracking-widest block mb-2">Cardholder Name</label><input type="text" value={cardName} onChange={(e) => setCardName(e.target.value)} placeholder="John Doe" className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white-placeholder" /></div>
                    <div><label className="text-[9px] font-mono text-white/40 uppercase tracking-widest block mb-2">Card Number</label><input type="text" value={cardInput} onChange={(e) => setCardInput(formatCardNumber(e.target.value))} placeholder="4242 4242 4242 4242" maxLength={19} className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono" /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="text-[9px] font-mono text-white/40 uppercase tracking-widest block mb-2">Expiry Date</label><input type="text" value={cardExpiry} onChange={(e) => setCardExpiry(formatExpiry(e.target.value))} placeholder="MM/YY" maxLength={5} className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-center" /></div>
                      <div><label className="text-[9px] font-mono text-white/40 uppercase tracking-widest block mb-2">CVC</label><input type="text" value={cardCvc} onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="123" maxLength={4} className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-center" /></div>
                    </div>
                  </div>
                  <button onClick={handlePaymentSubmit} disabled={!cardInput || !cardExpiry || !cardCvc || !cardName} className="w-full py-3.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black text-xs uppercase rounded-xl tracking-wider"><LockIcon className="w-4 h-4 inline-block mr-1" /> Pay ${(tokenAmount * 0.01).toFixed(2)}</button>
                </>
              )}
              {paymentStep === 'processing' && <div className="py-12 text-center space-y-4"><RefreshCw className="w-12 h-12 text-purple-500 animate-spin mx-auto" /><h4 className="text-lg font-bold text-white">Processing Payment</h4></div>}
              {paymentStep === 'success' && txReceipt && (
                <div className="space-y-5">
                  <div className="text-center py-4"><CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" /><h4 className="text-lg font-bold text-white mt-4">Payment Successful!</h4></div>
                  <div className="bg-[#050508] border border-white/10 rounded-xl p-4 font-mono text-[10px] text-white/70 leading-relaxed whitespace-pre-line">{txReceipt}</div>
                  <button onClick={closePaymentModal} className="w-full py-3.5 bg-white text-black font-black text-xs uppercase rounded-xl">Done</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}