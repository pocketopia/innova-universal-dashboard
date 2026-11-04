import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, ArrowRight, Sparkles, AlertCircle, CheckCircle2, Wallet, ArrowLeft, ShieldAlert, Zap, Copy, Check } from 'lucide-react';
import { useNodeAuth } from '../../context/NodeAuthContext';
import { sanitizeUsername, formatUsernameDisplay, isValidUsernameFormat } from '../../lib/securityUtils';

interface VelvetRopeLoginProps {
  onAuthenticated: (username: string) => void;
}

/**
 * Deterministically derives a valid 42-character EVM address (0x + 40 hex chars)
 * from the user's standardized @USER.NAME handle and Ring Comm enclave seed.
 */
async function deriveSovereignEvmAddress(handle: string): Promise<string> {
  const clean = handle.replace(/^@/, '').trim().toUpperCase() || 'SOVEREIGN_NODE';
  const payload = `INNOVA_RINGCOMM_EVM_V2::${clean}::SOVEREIGN_ENCLAVE`;
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const encoded = new TextEncoder().encode(payload);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', encoded);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return `0x${hex.slice(0, 40)}`;
  }
  // Deterministic fallback if Web Crypto is unavailable
  let h1 = 0xdeadbeef ^ clean.length;
  let h2 = 0x41c6ce57 ^ clean.length;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  const hexSeed = (
    (h1 >>> 0).toString(16).padStart(8, '0') +
    (h2 >>> 0).toString(16).padStart(8, '0')
  ).repeat(3);
  return `0x${hexSeed.slice(0, 40)}`;
}

export default function VelvetRopeLogin({ onAuthenticated }: VelvetRopeLoginProps) {
  const { login, register } = useNodeAuth();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [requiresRegistration, setRequiresRegistration] = useState(false);
  const [registrationWallet, setRegistrationWallet] = useState('');
  const [walletSource, setWalletSource] = useState<'ringcomm' | 'web3' | 'manual'>('ringcomm');
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [showRegistrationFlow, setShowRegistrationFlow] = useState(false);

  const sanitizedUsername = useMemo(() => sanitizeUsername(accessCode), [accessCode]);
  const formattedDisplay = useMemo(() => formatUsernameDisplay(accessCode), [accessCode]);
  const isValidFormat = useMemo(() => isValidUsernameFormat(accessCode), [accessCode]);

  // Auto-forge deterministic Ring Comm EVM Vault address whenever entering registration flow
  const handleAutoForgeVault = useCallback(async () => {
    const addr = await deriveSovereignEvmAddress(sanitizedUsername || accessCode);
    setRegistrationWallet(addr);
    setWalletSource('ringcomm');
    setError(null);
  }, [sanitizedUsername, accessCode]);

  useEffect(() => {
    if (showRegistrationFlow && !registrationWallet) {
      handleAutoForgeVault();
    }
  }, [showRegistrationFlow, registrationWallet, handleAutoForgeVault]);

  // 1-Click External Browser Wallet Connect (MetaMask / Coinbase / Brave / Phantom EVM)
  const handleConnectWeb3Wallet = async () => {
    setError(null);
    const eth = (window as any).ethereum;
    if (!eth) {
      const addr = await deriveSovereignEvmAddress(sanitizedUsername || accessCode);
      setRegistrationWallet(addr);
      setWalletSource('ringcomm');
      setError('No browser Web3 extension detected — forged your Sovereign Ring Comm EVM Vault automatically.');
      return;
    }
    try {
      const accounts = await eth.request({ method: 'eth_requestAccounts' });
      if (accounts && accounts[0]) {
        setRegistrationWallet(accounts[0]);
        setWalletSource('web3');
      }
    } catch (err) {
      setError('External Web3 wallet connection cancelled. Your Ring Comm EVM Vault remains active.');
    }
  };

  const handleCopyWallet = () => {
    if (!registrationWallet) return;
    navigator.clipboard?.writeText(registrationWallet);
    setCopiedWallet(true);
    setTimeout(() => setCopiedWallet(false), 1800);
  };

  const handleRingCommAuth = async () => {
    const sanitized = sanitizeUsername(accessCode);

    if (!sanitized) {
      setError('Enter a valid @USER.NAME node handle to initialize Ring Comm.');
      return;
    }

    if (!isValidUsernameFormat(sanitized)) {
      setError('Invalid @USER.NAME syntax. Use letters, numbers, dots, underscores, or hyphens.');
      return;
    }

    setIsAuthenticating(true);
    setError(null);
    setSuccess(false);
    setRequiresRegistration(false);
    setShowRegistrationFlow(false);

    try {
      const result = await login(sanitized);

      if (result.success) {
        setSuccess(true);
        const formattedHandle = `@${sanitized}`;
        setTimeout(() => {
          onAuthenticated(formattedHandle);
        }, 600);
      } else if (result.requiresRegistration) {
        const forged = await deriveSovereignEvmAddress(sanitized);
        setRegistrationWallet(forged);
        setWalletSource('ringcomm');
        setRequiresRegistration(true);
        setShowRegistrationFlow(true);
        setError(null);
      } else {
        setError(result.error || 'Authentication rejected by Sovereign Enclave.');
      }
    } catch (err) {
      const forged = await deriveSovereignEvmAddress(sanitized);
      setRegistrationWallet(forged);
      setWalletSource('ringcomm');
      setRequiresRegistration(true);
      setShowRegistrationFlow(true);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleAccessCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleRingCommAuth();
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    const sanitized = sanitizeUsername(accessCode);

    if (!sanitized || !isValidUsernameFormat(sanitized)) {
      setError('Invalid @USER.NAME syntax. Use letters, numbers, dots, underscores, or hyphens.');
      return;
    }

    let finalWallet = registrationWallet.trim();
    if (!finalWallet || !finalWallet.startsWith('0x') || finalWallet.length < 42) {
      finalWallet = await deriveSovereignEvmAddress(sanitized);
      setRegistrationWallet(finalWallet);
      setWalletSource('ringcomm');
    }

    setIsAuthenticating(true);
    setError(null);

    try {
      const result = await register(sanitized, finalWallet);

      if (result.success) {
        localStorage.setItem('innova-wallet-address', finalWallet);
        localStorage.setItem('innova-username', sanitized);
        setSuccess(true);
        const formattedHandle = `@${sanitized}`;
        setTimeout(() => {
          onAuthenticated(formattedHandle);
        }, 900);
      } else {
        setError(result.error || 'Node registration rejected.');
      }
    } catch (err) {
      setError('Node registration failed. Try again.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  if (showRegistrationFlow) {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center bg-[#040001] relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(220,38,38,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(220,38,38,0.05)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

        <motion.div
          className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-red-600/10 blur-[150px] pointer-events-none"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 w-full max-w-lg px-6"
        >
          <div className="relative backdrop-blur-3xl bg-[#090002]/95 border-2 border-red-600/50 rounded-3xl p-8 md:p-10 shadow-[0_0_90px_rgba(220,38,38,0.3)]">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-[2px] bg-gradient-to-r from-transparent via-red-500 to-transparent" />

            <div className="flex items-center justify-between mb-6">
              <button
                type="button"
                onClick={() => setShowRegistrationFlow(false)}
                className="text-red-400/70 hover:text-red-300 transition flex items-center gap-1.5 text-xs font-black uppercase tracking-widest"
              >
                <ArrowLeft className="w-4 h-4" />
                Abort & Return
              </button>
              <span className="px-2.5 py-1 rounded bg-red-950/90 border border-red-500/40 text-[10px] font-mono font-bold text-red-400 uppercase tracking-widest">
                RING COMM ENCLAVE // ZERO-GAS EVM
              </span>
            </div>

            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-red-600/20 text-red-500 border-2 border-red-500/50 flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(220,38,38,0.4)]">
                <Wallet className="w-8 h-8 animate-pulse" />
              </div>
              <h2 className="font-sans font-black text-2xl tracking-wider text-white uppercase mb-1">
                FORGE SOVEREIGN NODE & EVM VAULT
              </h2>
              <p className="text-xs text-red-200/60 font-mono">
                Unclaimed handle <span className="text-red-400 font-bold">@{sanitizedUsername}</span> detected. We automatically forged a deterministic Ring Comm EVM Vault below—or link an existing Web3 wallet.
              </p>
            </div>

            <form onSubmit={handleRegister} className="space-y-5">
              <div>
                <label className="block text-[11px] font-black text-red-400 mb-2 uppercase tracking-widest">
                  1. Standardized Sovereign Node ID
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={`@${sanitizedUsername}`}
                    disabled
                    className="w-full bg-black/80 border border-red-500/40 rounded-xl px-4 py-3 text-sm text-red-400 font-bold outline-none font-mono"
                  />
                  <CheckCircle2 className="w-5 h-5 text-red-500 shrink-0" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[11px] font-black text-red-400 uppercase tracking-widest">
                    2. Bound EVM Wallet Address
                  </label>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-red-500/15 text-red-300 border border-red-500/30">
                    {walletSource === 'ringcomm' ? '⚡ Auto-Forged by Ring Comm' : walletSource === 'web3' ? '🔗 External Web3 Linked' : '✍️ Custom EVM Address'}
                  </span>
                </div>

                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={registrationWallet}
                    onChange={(e) => {
                      setRegistrationWallet(e.target.value);
                      setWalletSource('manual');
                    }}
                    placeholder="0x..."
                    disabled={isAuthenticating}
                    className="w-full bg-black/90 border-2 border-red-600/50 rounded-xl pl-4 pr-11 py-3.5 text-xs md:text-sm text-white placeholder-white/20 outline-none focus:border-red-500 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleCopyWallet}
                    title="Copy EVM Wallet Address"
                    className="absolute right-2.5 p-2 rounded-lg bg-red-950/80 hover:bg-red-900 border border-red-500/40 text-red-300 transition"
                  >
                    {copiedWallet ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {/* 1-Click Wallet Acquisition Controls for New Users */}
                <div className="grid grid-cols-2 gap-2.5 mt-3">
                  <button
                    type="button"
                    onClick={handleAutoForgeVault}
                    disabled={isAuthenticating}
                    className="py-2.5 px-3 rounded-xl bg-red-950/70 hover:bg-red-900/80 border border-red-500/50 text-[11px] font-black text-red-200 uppercase tracking-wider flex items-center justify-center gap-1.5 transition shadow-[0_0_15px_rgba(220,38,38,0.2)]"
                  >
                    <Zap className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    Auto-Forge EVM Vault
                  </button>
                  <button
                    type="button"
                    onClick={handleConnectWeb3Wallet}
                    disabled={isAuthenticating}
                    className="py-2.5 px-3 rounded-xl bg-black/80 hover:bg-red-950/50 border border-red-500/30 text-[11px] font-black text-white/80 hover:text-white uppercase tracking-wider flex items-center justify-center gap-1.5 transition"
                  >
                    <Wallet className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    Connect MetaMask / Web3
                  </button>
                </div>

                <p className="text-[11px] text-red-200/50 mt-2.5 font-mono leading-relaxed">
                  New to Web3? Keep the <span className="text-red-400 font-bold">Auto-Forged EVM Vault</span> above—it is cryptographically derived from your <span className="text-red-400">@{sanitizedUsername}</span> Ring Comm enclave with zero gas fees or browser extensions required.
                </p>
              </div>

              {isAuthenticating ? (
                <button
                  disabled
                  className="w-full py-4 bg-red-800/60 text-white font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 cursor-wait border border-red-500/50"
                >
                  <Sparkles className="w-5 h-5 animate-spin" />
                  Forging Node On-Chain...
                </button>
              ) : (
                <button
                  type="submit"
                  className="w-full py-4 bg-gradient-to-r from-red-700 via-red-600 to-red-800 hover:from-red-600 hover:to-red-500 text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_35px_rgba(220,38,38,0.5)] border border-red-400/40 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Fingerprint className="w-5 h-5" />
                  Activate @{sanitizedUsername} Node & Bind Vault
                </button>
              )}
            </form>

            {error && (
              <div className="mt-5 p-3.5 rounded-xl bg-red-950/90 border border-red-500/50 flex items-center gap-3">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-xs text-red-200 font-mono">{error}</p>
              </div>
            )}

            {success && (
              <div className="mt-5 p-3.5 rounded-xl bg-red-900/40 border border-red-400 flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-xs text-white font-mono font-bold uppercase tracking-wider">
                  Sovereign Node @{sanitizedUsername} Forged & Bound! Launching Command Hub...
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-[#040001] relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(220,38,38,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(220,38,38,0.04)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />

      <motion.div
        className="absolute top-1/3 left-1/4 w-[600px] h-[600px] rounded-full bg-red-600/10 blur-[150px] pointer-events-none"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] rounded-full bg-red-900/15 blur-[120px] pointer-events-none"
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 w-full max-w-md px-6"
      >
        <div className="relative backdrop-blur-3xl bg-[#090002]/95 border-2 border-red-600/40 rounded-3xl p-10 shadow-[0_0_90px_rgba(220,38,38,0.28)]">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-[2px] bg-gradient-to-r from-transparent via-red-500 to-transparent" />

          <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-red-600/50 rounded-tl-xl" />
          <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-red-600/50 rounded-br-xl" />

          <div className="flex justify-center mb-8">
            <motion.div
              className="relative"
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              <div className="absolute -inset-4 bg-gradient-to-r from-red-600/30 via-red-900/30 to-red-600/30 rounded-full blur-xl" />
              <div className="relative w-20 h-20 rounded-full bg-[#120003] flex items-center justify-center border-2 border-red-500/50 shadow-[0_0_30px_rgba(220,38,38,0.5)] overflow-hidden">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-red-600 via-red-900 to-orange-600 animate-spin" style={{ animationDuration: '10s' }} />
                <div className="absolute inset-0 bg-radial-gradient from-transparent to-black/75" />
                <Fingerprint className="absolute w-9 h-9 text-red-400 drop-shadow-[0_0_12px_rgba(220,38,38,0.9)]" />
              </div>
            </motion.div>
          </div>

          <div className="text-center mb-8 space-y-2">
            <h1 className="font-sans font-black text-2xl tracking-wider text-white uppercase">
              INNOVA SOVEREIGN NEXUS
            </h1>
            <p className="text-[11px] text-red-400/80 font-mono font-bold tracking-widest uppercase">
              Ring Comm Biometric & EVM Node Gateway
            </p>
          </div>

          <form onSubmit={handleAccessCodeSubmit} className="space-y-4 mb-6">
            <div className="relative">
              <input
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Enter @USER.NAME to Claim or Authenticate"
                disabled={isAuthenticating}
                className="w-full bg-black/90 border-2 border-red-600/40 rounded-xl px-5 py-4 text-sm text-white placeholder-white/30 outline-none focus:border-red-500 transition-all disabled:opacity-50 font-mono tracking-wide"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <motion.button
                  type="submit"
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={isAuthenticating || !accessCode.trim()}
                  className="p-2.5 rounded-lg bg-red-600/20 hover:bg-red-600/40 border border-red-500/40 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ArrowRight className="w-4 h-4 text-red-400" />
                </motion.button>
              </div>
            </div>

            {sanitizedUsername && accessCode.trim() && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 px-3.5 py-2.5 bg-red-950/60 border border-red-500/40 rounded-xl"
              >
                <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span className="text-[10px] text-red-300/80 uppercase tracking-widest font-bold">Node Handle:</span>
                <span className="text-xs text-red-400 font-mono font-black">@{sanitizedUsername}</span>
                {isValidFormat ? (
                  <span className="ml-auto text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> READY
                  </span>
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 ml-auto" />
                )}
              </motion.div>
            )}
          </form>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={handleRingCommAuth}
            disabled={isAuthenticating || !accessCode.trim()}
            className="relative w-full group cursor-pointer overflow-hidden rounded-2xl p-[1.5px] disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_35px_rgba(220,38,38,0.35)]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-red-600 via-red-500 to-red-800 opacity-90 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative bg-[#110003] hover:bg-red-950/60 transition rounded-2xl px-6 py-4 flex items-center justify-center gap-3">
              {isAuthenticating ? (
                <>
                  <Sparkles className="w-5 h-5 text-red-400 animate-spin" />
                  <span className="text-sm font-black text-white tracking-widest uppercase">
                    Synchronizing Ring Comm...
                  </span>
                </>
              ) : (
                <>
                  <Fingerprint className="w-5 h-5 text-red-400" />
                  <span className="text-sm font-black text-white tracking-widest uppercase">
                    Tap Ring Comm // Forge or Login
                  </span>
                </>
              )}
            </div>
          </motion.button>

          <p className="mt-4 text-[11px] text-center text-red-200/50 font-mono">
            First time here? Type any <span className="text-red-400 font-bold">@USER.NAME</span> above and tap Ring Comm—your EVM Vault is forged automatically.
          </p>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-6 p-4 rounded-xl bg-red-950/90 border border-red-500/50 flex items-center gap-3"
              >
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-xs text-red-200 font-mono">{error}</p>
              </motion.div>
            )}
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-6 p-4 rounded-xl bg-red-900/40 border border-red-400 flex items-center gap-3"
              >
                <CheckCircle2 className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-xs text-white font-mono font-bold uppercase">Ring Comm Verified. Entering Sovereign Hub...</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-7 text-center">
            <p className="text-[10px] text-red-500/40 font-mono uppercase tracking-widest">
              Secured by Innova Master Brain // Ring Comm Enclave
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
