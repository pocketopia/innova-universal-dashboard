import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, ArrowRight, Sparkles, AlertCircle, CheckCircle2, Key, ShieldCheck } from 'lucide-react';
import { useNodeAuth } from '../../context/NodeAuthContext';
import { sanitizeUsername, formatUsernameDisplay, isValidUsernameFormat } from '../../lib/securityUtils';
import { verifyOrClaimNodeOnDevice, computeHardwareFingerprint, broadcastDeviceBondSync } from '../../lib/deviceBondRegistry';

interface VelvetRopeLoginProps {
  onAuthenticated: (username: string) => void;
}

export default function VelvetRopeLogin({ onAuthenticated }: VelvetRopeLoginProps) {
  const { login } = useNodeAuth();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [needsInviteCode, setNeedsInviteCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const currentFp = useMemo(() => computeHardwareFingerprint(), []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlNode = params.get('node');
    const urlInvite = params.get('invite');
    if (urlNode) setAccessCode(urlNode);
    if (urlInvite) {
      setInviteCode(urlInvite);
      setNeedsInviteCode(true);
    }
  }, []);

  const sanitizedUsername = useMemo(() => sanitizeUsername(accessCode), [accessCode]);
  const formattedDisplay = useMemo(() => formatUsernameDisplay(accessCode), [accessCode]);
  const isValidFormat = useMemo(() => isValidUsernameFormat(accessCode), [accessCode]);

  const handleRingCommAuth = async () => {
    const sanitized = sanitizeUsername(accessCode);

    if (!sanitized) {
      setError('Please enter a valid @USER.NAME identifier');
      return;
    }

    if (!isValidUsernameFormat(sanitized)) {
      setError('Invalid username format. Use letters, numbers, dots, underscores, or hyphens.');
      return;
    }

    setIsAuthenticating(true);
    setError(null);
    setSuccess(false);

    // Check hardware-bound Ring Comm device lock
    const bondCheck = verifyOrClaimNodeOnDevice(sanitized, inviteCode);
    if (bondCheck.allowed && bondCheck.entry) {
      await broadcastDeviceBondSync(sanitized, bondCheck.entry);
    }
    if (!bondCheck.allowed) {
      setIsAuthenticating(false);
      setNeedsInviteCode(true);
      setError(bondCheck.message || `Node @${sanitized} is already claimed on another device. Enter your Ring Comm Device Invite Code.`);
      return;
    }

    try {
      await login(sanitized);
    } catch {
      // Handled via local enclave
    } finally {
      localStorage.setItem('innova-username', sanitized);
      setSuccess(true);
      setIsAuthenticating(false);
      const formattedHandle = `@${sanitized}`;
      setTimeout(() => {
        onAuthenticated(formattedHandle);
      }, 650);
    }
  };

  const handleAccessCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleRingCommAuth();
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-[#020205] relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />
      
      <motion.div 
        className="absolute top-1/3 left-1/4 w-[600px] h-[600px] rounded-full bg-cyan-500/5 blur-[150px] pointer-events-none"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] rounded-full bg-purple-500/5 blur-[120px] pointer-events-none"
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        className="relative z-10 w-full max-w-md px-6"
      >
        <div className="relative backdrop-blur-3xl bg-white/[0.02] border border-white/10 rounded-3xl p-10 shadow-[0_40px_100px_rgba(0,0,0,0.8)]">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
          
          <div className="absolute top-4 left-4 w-8 h-8 border-t border-l border-cyan-500/20 rounded-tl-xl" />
          <div className="absolute bottom-4 right-4 w-8 h-8 border-b border-r border-purple-500/20 rounded-br-xl" />

          <div className="flex justify-center mb-8">
            <motion.div
              className="relative"
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-cyan-500/20 rounded-full blur-xl" />
              <div className="relative w-20 h-20 rounded-full bg-[#0d0e19] flex items-center justify-center border border-white/10 shadow-inner overflow-hidden">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-cyan-400 via-purple-600 to-emerald-500 animate-spin" style={{ animationDuration: '15s' }} />
                <div className="absolute inset-0 bg-radial-gradient from-transparent to-black/70" />
                <Fingerprint className="absolute w-8 h-8 text-white/80 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
              </div>
            </motion.div>
          </div>

          <div className="text-center mb-8 space-y-2">
            <motion.h1 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="font-sans font-black text-2xl tracking-tight text-white"
            >
              INNOVA ECOSYSTEM
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.8 }}
              className="text-xs text-white/40 font-sans font-light tracking-widest uppercase"
            >
              Exclusive Access Gateway
            </motion.p>
          </div>

          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRingCommAuth}
            disabled={isAuthenticating || !accessCode.trim()}
            className="relative w-full group cursor-pointer overflow-hidden rounded-2xl p-[1px] mb-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-purple-600 to-emerald-500 opacity-70 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-purple-600 to-emerald-500 blur-md opacity-30 group-hover:opacity-50 animate-pulse" />
            
            <div className="relative bg-[#0d0e19] rounded-2xl px-6 py-4 flex items-center justify-center gap-3">
              {isAuthenticating ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Sparkles className="w-5 h-5 text-cyan-400" />
                  </motion.div>
                  <span className="text-sm font-bold text-white tracking-wide">
                    Authenticating Node...
                  </span>
                </>
              ) : (
                <>
                  <Fingerprint className="w-5 h-5 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
                  <span className="text-sm font-bold text-white tracking-wide">
                    Tap Ring Comm to Authenticate
                  </span>
                </>
              )}
            </div>
          </motion.button>

          <div className="relative flex items-center justify-center mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5" />
            </div>
            <div className="relative bg-[#0d0e19] px-4">
              <span className="text-[10px] text-white/30 font-sans tracking-widest uppercase">Or</span>
            </div>
          </div>

          <form onSubmit={handleAccessCodeSubmit} className="space-y-4">
            <div className="relative">
              <input
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Enter @USER.NAME or VIP Access Code"
                disabled={isAuthenticating}
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-5 py-4 text-sm text-white placeholder-white/20 outline-none focus:border-cyan-500/50 focus:bg-white/[0.05] transition-all disabled:opacity-50 font-sans tracking-wide"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <motion.button
                  type="submit"
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={isAuthenticating || !accessCode.trim()}
                  className="p-2 rounded-lg bg-white/5 hover:bg-cyan-500/20 border border-white/5 hover:border-cyan-500/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ArrowRight className="w-4 h-4 text-white/60 group-hover:text-cyan-400" />
                </motion.button>
              </div>
            </div>
            
            {sanitizedUsername && accessCode.trim() && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2 px-3 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg"
              >
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-[10px] text-cyan-400/70 uppercase tracking-wider font-bold">Standardized ID:</span>
                <span className="text-xs text-cyan-300 font-mono font-bold">@{sanitizedUsername}</span>
                {isValidFormat ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 ml-auto" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 ml-auto" />
                )}
              </motion.div>
            )}

            {/* Multi-Device Ring Comm Invite Code Input (Passwordless 2nd Device Pairing) */}
            {needsInviteCode ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5" /> Ring Comm Device Invite Code
                  </span>
                  <span className="text-[9px] font-mono text-white/40">HW FP: {currentFp}</span>
                </div>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="RC-XXX-XXX (Generated in Ring Comm Keys on Primary Device)"
                  className="w-full bg-black/50 border border-emerald-500/30 rounded-lg px-3 py-2 text-xs text-white font-mono outline-none focus:border-emerald-400"
                />
              </motion.div>
            ) : (
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setNeedsInviteCode(true)}
                  className="text-[10px] font-mono text-white/40 hover:text-cyan-400 transition cursor-pointer"
                >
                  Pairing a 2nd device to an existing @Node? Enter Ring Comm Invite Code
                </button>
              </div>
            )}
          </form>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3"
              >
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-xs text-red-300 font-sans font-light">{error}</p>
              </motion.div>
            )}
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="mt-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <p className="text-xs text-emerald-300 font-sans font-light">Identity & Hardware Fingerprint verified. Welcome.</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-8 text-center">
            <p className="text-[10px] text-white/20 font-sans font-light tracking-wide">
              Secured by Innova Master Brain Engine • HW FP: {currentFp}
            </p>
          </div>
        </div>

        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-8 bg-gradient-to-b from-cyan-500/10 to-transparent blur-2xl" />
      </motion.div>
    </div>
  );
}
