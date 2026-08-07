import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, ArrowRight, Sparkles, AlertCircle, CheckCircle2, Wallet, ArrowLeft } from 'lucide-react';
import { useNodeAuth } from '../../context/NodeAuthContext';
import { sanitizeUsername, formatUsernameDisplay, isValidUsernameFormat } from '../../lib/securityUtils';

interface VelvetRopeLoginProps {
  onAuthenticated: (username: string) => void;
}

export default function VelvetRopeLogin({ onAuthenticated }: VelvetRopeLoginProps) {
  const { login, register } = useNodeAuth();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [requiresRegistration, setRequiresRegistration] = useState(false);
  const [registrationWallet, setRegistrationWallet] = useState('');
  const [showRegistrationFlow, setShowRegistrationFlow] = useState(false);

  // Compute sanitized username for display - shows user their standardized @ID in real-time
  const sanitizedUsername = useMemo(() => sanitizeUsername(accessCode), [accessCode]);
  const formattedDisplay = useMemo(() => formatUsernameDisplay(accessCode), [accessCode]);
  const isValidFormat = useMemo(() => isValidUsernameFormat(accessCode), [accessCode]);

  // Handler for input change - sanitizes in real-time
  const handleAccessCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow user to type freely, but we'll sanitize on submit and display the sanitized version
    setAccessCode(e.target.value);
  };

  // Handler for Ring Comm button - simulates hardware tap with live API call
  const handleRingCommAuth = async () => {
    // Sanitize the input before authentication
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
    setRequiresRegistration(false);
    setShowRegistrationFlow(false);

    try {
      // Use sanitized username for authentication
      const result = await login(sanitized);
      
      if (result.success) {
        setSuccess(true);
        const formattedHandle = `@${sanitized}`;
        setTimeout(() => {
          onAuthenticated(formattedHandle);
        }, 800);
      } else if (result.requiresRegistration) {
        setRequiresRegistration(true);
        setShowRegistrationFlow(true);
        setError(null);
      } else {
        setError(result.error || 'Authentication failed');
      }
    } catch (err) {
      setError('Authentication failed. Ring Comm signal not recognized.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Handler for VIP Access Code submission (legacy fallback)
  const handleAccessCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Sanitize the input before authentication
    const sanitized = sanitizeUsername(accessCode);
    
    if (!sanitized || !isValidUsernameFormat(sanitized)) {
      setError('Invalid username format. Use letters, numbers, dots, underscores, or hyphens.');
      return;
    }

    setIsAuthenticating(true);
    setError(null);
    setSuccess(false);
    setRequiresRegistration(false);

    try {
      // Use sanitized username for authentication
      const result = await login(sanitized);
      
      if (result.success) {
        setSuccess(true);
        const formattedHandle = `@${sanitized}`;
        setTimeout(() => {
          onAuthenticated(formattedHandle);
        }, 800);
      } else if (result.requiresRegistration) {
        setRequiresRegistration(true);
        setShowRegistrationFlow(true);
      } else {
        setError(result.error || 'Invalid VIP access code. Access denied.');
      }
    } catch (err) {
      setError('Invalid VIP access code. Access denied.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Handler for registration flow
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Sanitize the username
    const sanitized = sanitizeUsername(accessCode);
    
    if (!sanitized || !isValidUsernameFormat(sanitized)) {
      setError('Invalid username format. Use letters, numbers, dots, underscores, or hyphens.');
      return;
    }
    
    if (!registrationWallet.trim()) {
      setError('Please provide both username and wallet address');
      return;
    }

    setIsAuthenticating(true);
    setError(null);

    try {
      // Use sanitized username for registration
      const result = await register(sanitized, registrationWallet.trim());
      
      if (result.success) {
        setSuccess(true);
        const formattedHandle = `@${sanitized}`;
        setTimeout(() => {
          onAuthenticated(formattedHandle);
        }, 1500);
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch (err) {
      setError('Registration failed. Please try again.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // If showing registration flow
  if (showRegistrationFlow) {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center bg-[#020205] relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />
        
        <motion.div 
          className="absolute top-1/3 left-1/4 w-[600px] h-[600px] rounded-full bg-cyan-500/5 blur-[150px] pointer-events-none"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          className="relative z-10 w-full max-w-md px-6"
        >
          <div className="relative backdrop-blur-3xl bg-white/[0.02] border border-white/10 rounded-3xl p-10 shadow-[0_40px_100px_rgba(0,0,0,0.8)]">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-[1px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
            
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setShowRegistrationFlow(false)}
                className="text-white/40 hover:text-white transition flex items-center gap-1 text-xs font-bold uppercase tracking-wider"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            </div>

            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-8 h-8 animate-pulse" />
              </div>
              <h2 className="font-sans font-black text-xl tracking-tight text-white mb-2">REGISTER NEW NODE</h2>
              <p className="text-xs text-white/50 font-sans font-light">
                Identity @{sanitizedUsername} not found. Link a wallet to establish your node identity.
              </p>
            </div>

            <form onSubmit={handleRegister} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-white/70 mb-2 uppercase tracking-wider">
                  Standardized Node ID
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={`@${sanitizedUsername}`}
                    disabled
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-cyan-300 outline-none font-mono"
                  />
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                </div>
                <p className="text-[10px] text-white/30 mt-1">
                  Your username has been standardized for security
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-white/70 mb-2 uppercase tracking-wider">
                  EVM Wallet Address
                </label>
                <input
                  type="text"
                  value={registrationWallet}
                  onChange={(e) => setRegistrationWallet(e.target.value)}
                  placeholder="0x..."
                  disabled={isAuthenticating}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-purple-500/50 focus:bg-white/[0.05] transition-all font-mono"
                />
              </div>

              {isAuthenticating ? (
                <button
                  disabled
                  className="w-full py-4 bg-purple-500/50 text-white font-bold rounded-xl flex items-center justify-center gap-2 cursor-wait"
                >
                  <Sparkles className="w-5 h-5 animate-spin" />
                  Registering Node...
                </button>
              ) : (
                <button
                  type="submit"
                  className="w-full py-4 bg-purple-500 hover:bg-purple-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
                >
                  <Wallet className="w-5 h-5" />
                  Link Wallet & Register
                </button>
              )}
            </form>

            {error && (
              <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-xs text-red-300 font-sans font-light">{error}</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

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
            
            {/* Sanitized username preview - shows user their standardized @ID */}
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
                <p className="text-xs text-emerald-300 font-sans font-light">Identity verified. Welcome.</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-8 text-center">
            <p className="text-[10px] text-white/20 font-sans font-light tracking-wide">
              Secured by Innova Master Brain Engine
            </p>
          </div>
        </div>

        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-8 bg-gradient-to-b from-cyan-500/10 to-transparent blur-2xl" />
      </motion.div>
    </div>
  );
}