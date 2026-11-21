import React, { useState, useMemo, useEffect } from 'react';
import {
  Fingerprint,
  ArrowRight,
  AlertCircle,
  ShieldAlert,
  MapPin,
  Cpu,
  Lock,
  Mail
} from 'lucide-react';
import { useNodeAuth } from '../../context/NodeAuthContext';
import {
  computeHardwareFingerprint,
  computeLocationSignature,
  checkNodeRegistrationStatus,
  getPrimaryOwnerOfCurrentHardware,
  purgeHenryForeverAndLockHost,
  parseLiveDeviceInfo
} from '../../lib/deviceBondRegistry';
import { registerAccountWithPioneerCutoff, getPioneerSlotsRemaining } from '../../lib/pioneerLifetimeRegistry';

interface VelvetRopeLoginProps {
  onAuthenticated: (username: string) => void;
}

const cleanHandleInput = (val: string): string => {
  return String(val || '').trim().replace(/^@+/, '').replace(/[^a-zA-Z0-9._-]/g, '').toUpperCase();
};

export default function VelvetRopeLogin({ onAuthenticated }: VelvetRopeLoginProps) {
  const nodeAuth = useNodeAuth();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [blockedTarget, setBlockedTarget] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentFp = useMemo(() => computeHardwareFingerprint(), []);
  const currentLoc = useMemo(() => computeLocationSignature(), []);
  const deviceInfo = useMemo(() => parseLiveDeviceInfo(), []);
  const primaryHardwareOwner = useMemo(() => {
    return purgeHenryForeverAndLockHost();
  }, []);
  const pioneerStats = useMemo(() => getPioneerSlotsRemaining(), [accessCode, blockedTarget]);

  useEffect(() => {
    purgeHenryForeverAndLockHost();
  }, []);

  const finalizeAuthentication = async (rawHandle: string) => {
    const clean = cleanHandleInput(rawHandle);
    if (!clean || clean === 'HENRY') return;
    setIsAuthenticating(true);
    setError(null);

    try {
      localStorage.setItem('innova-username', clean);
      localStorage.setItem('innova-session-active', 'true');
      if (clean === 'TICKER' || clean === 'TICKERTWIZTED') {
        registerAccountWithPioneerCutoff('TICKER', currentFp);
      }
      if (nodeAuth && typeof nodeAuth.login === 'function') {
        const res = await nodeAuth.login(clean);
        if (!res.success && res.error) {
          setIsAuthenticating(false);
          setError(res.error);
          return;
        }
      }
    } catch {}

    setIsAuthenticating(false);
    onAuthenticated(clean);
  };

  const handleNodeSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = cleanHandleInput(accessCode);
    if (!clean) {
      setError('Please enter a valid @USER.NAME node identifier.');
      return;
    }

    setError(null);
    const check = checkNodeRegistrationStatus(clean);

    // ONLY allow login if:
    // 1. User is the Primary Hardware Owner (@TICKER), OR
    // 2. User is a Friend who was invited by @TICKER via Innova Telegram ("Allow User to Use My Device") AND clicked "Approve"!
    if (check.status === 'AUTHORIZED_OWNER' || check.status === 'AUTHORIZED_SHARED_FRIEND') {
      finalizeAuthentication(clean);
      return;
    }

    // Otherwise, strictly block login and account creation on @TICKER's laptop!
    setBlockedTarget(clean);
    setError(
      check.message ||
        `HARDWARE LOCKED TO @${primaryHardwareOwner}: @${clean} cannot log in or create an account on this device without an approved Innova Telegram Friend Handshake.`
    );
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-[#020205] relative overflow-hidden p-6 font-sans">
      <div className="absolute top-1/3 left-1/4 w-[550px] h-[550px] rounded-full bg-cyan-500/5 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-[480px] h-[480px] rounded-full bg-blue-600/5 blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-lg">
        <div className="relative backdrop-blur-3xl bg-[#090C15]/95 border border-cyan-500/30 rounded-3xl p-8 md:p-10 shadow-[0_30px_90px_rgba(0,0,0,0.85)]">
          {!blockedTarget ? (
            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="relative w-20 h-20 rounded-full bg-[#0d111d] flex items-center justify-center border border-cyan-400/30 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                  <Fingerprint className="w-9 h-9 text-cyan-400" />
                </div>
              </div>

              <div className="text-center space-y-2">
                <h1 className="font-sans font-black text-2xl tracking-tight text-white uppercase">
                  Innova Ecosystem
                </h1>
                <p className="text-xs text-cyan-300/80 tracking-widest uppercase font-bold">
                  {primaryHardwareOwner ? `Hardware & Location Enclave • Bonded to @${primaryHardwareOwner}` : 'Sovereign Hardware Enclave • Ready to Claim @USER.NAME'}
                </p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                  {primaryHardwareOwner ? (
                    <>This device is locked to <strong className="text-cyan-300">@{primaryHardwareOwner}</strong>. Only @{primaryHardwareOwner} or an approved <strong className="text-white">Innova Telegram Handshake</strong> guest may sign in here.</>
                  ) : (
                    <>Enter your <strong className="text-cyan-300">@USER.NAME</strong> to create or unlock your Node and cryptographically bind it to this device.</>
                  )}
                </p>
              </div>

              <form onSubmit={handleNodeSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-cyan-300/80 mb-2">
                    Node Identifier (@USER.NAME)
                  </label>
                  <input
                    type="text"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    placeholder="Enter @TICKER or Approved Friend Node"
                    disabled={isAuthenticating}
                    className="w-full bg-black/70 border-2 border-white/15 focus:border-red-500 rounded-xl px-4 py-3.5 text-sm text-white placeholder-white/30 outline-none font-bold tracking-wide transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isAuthenticating || !accessCode.trim()}
                  className="cursor-pointer w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black text-xs uppercase tracking-wider transition disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
                >
                  <span>Authenticate {accessCode.trim() ? `@${cleanHandleInput(accessCode)}` : 'Node'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                    Host Owner: <strong className="text-white">@{primaryHardwareOwner}</strong> ({currentFp})
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <MapPin className="w-3.5 h-3.5" />
                    {currentLoc.split('::')[0]}
                  </span>
                </div>

                {/* EXCLUSIVE FIRST-100 PIONEER LIFETIME ACCESS COUNTER */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/60 via-[#0b1324] to-blue-950/60 border border-cyan-400/35 shadow-[0_0_25px_rgba(6,182,212,0.15)] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-black text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                      👑 Founder 100 Lifetime Access
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-cyan-400 text-black font-black text-[10px] uppercase">
                      {pioneerStats.remainingFreeSlots} / 100 Left
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-black/70 overflow-hidden border border-white/10">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(4, pioneerStats.claimedCount))}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>Claimed: <strong className="text-white">{pioneerStats.claimedCount} / 100</strong> (#1 @TICKER)</span>
                    <span className="text-cyan-300 font-semibold">Hard Cutoff at #100</span>
                  </div>
                </div>
              </form>
            </div>
          ) : (
            /* STRICT HARDWARE BLOCK SCREEN WHEN SOMEONE TRIES TO LOG INTO HENRY OR AN UNAPPROVED ACCOUNT */
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-rose-500/30 pb-4">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    Hardware Enclave Security Lock
                  </span>
                  <h2 className="text-xl font-black text-white mt-2 uppercase">
                    Access Denied for @{blockedTarget}
                  </h2>
                </div>
                <ShieldAlert className="w-9 h-9 text-rose-500 shrink-0" />
              </div>

              <div className="p-4 rounded-2xl bg-rose-950/60 border-2 border-rose-500/50 text-xs text-rose-100 leading-relaxed space-y-2">
                <div className="font-black text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Lock className="w-4 h-4" />
                  Bonded Exclusively to @{primaryHardwareOwner}
                </div>
                <p>{error}</p>
              </div>

              <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 space-y-2 text-xs text-slate-300 leading-relaxed">
                <div className="font-black text-cyan-300 uppercase flex items-center gap-2">
                  <Mail className="w-4 h-4 text-cyan-400" />
                  How to Grant a Friend Permission to Use This Device:
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-300">
                  <li>Log in as <strong className="text-white">@{primaryHardwareOwner}</strong> and open <strong className="text-cyan-300">✉️ Innova Telegram</strong> in the top-right corner.</li>
                  <li>Open <strong className="text-white">Friends &amp; Profiles</strong>, select your friend&apos;s profile, and click <strong className="text-cyan-300">Allow User to Use My Device</strong>.</li>
                  <li>Once your friend clicks <strong className="text-emerald-400">Approve</strong> on the Telegram message (<em>&ldquo;@{primaryHardwareOwner} wants to grant &apos;Jon Doe&apos; permission to login on his device&rdquo;</em>), they can sign in here!</li>
                  <li>You can remove them anytime under <strong className="text-white">Identity &rarr; Shared Devices &rarr; Remove from My Device</strong>.</li>
                </ol>
              </div>

              <button
                type="button"
                onClick={() => {
                  setBlockedTarget(null);
                  setError(null);
                  setAccessCode('');
                }}
                className="cursor-pointer w-full py-3.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase tracking-wider"
              >
                &larr; Return to @{primaryHardwareOwner} Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
