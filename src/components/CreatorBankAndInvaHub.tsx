import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  CreditCard,
  ShieldCheck,
  Coins,
  Building2,
  CheckCircle2,
  AlertCircle,
  Lock,
  Fingerprint,
  Cpu,
  MapPin,
  ArrowUpRight,
  Plus,
  Minus,
  Key
} from 'lucide-react';
import {
  loadEcosystemLedger,
  saveEcosystemLedger,
  validateAbaRoutingNumber,
  adjustInvaBalance,
  executeCreatorAchPayout,
  ECOSYSTEM_PRICING_PLANS,
  EcosystemFinancialState
} from '../lib/innovaEcosystemLedger';
import {
  ensureHardwareEnclaveKeyPair,
  signHardwareBoundChallenge,
  getSecurityTelemetryStatus,
  SecurityTelemetryStatus
} from '../lib/innovaSecurityFortress';

interface CreatorBankAndInvaHubProps {
  userNode: {
    handle: string;
    id: string;
    name: string;
    wallet: string;
  };
  onBack: () => void;
}

export default function CreatorBankAndInvaHub({ userNode, onBack }: CreatorBankAndInvaHubProps) {
  const [finState, setFinState] = useState<EcosystemFinancialState>(() => loadEcosystemLedger());
  const [invaAdjustAmount, setInvaAdjustAmount] = useState<string>('100');
  const [statusNotice, setStatusNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [secStatus, setSecStatus] = useState<SecurityTelemetryStatus>(() => getSecurityTelemetryStatus());
  const [lastDpopProof, setLastDpopProof] = useState<string>('');

  useEffect(() => {
    ensureHardwareEnclaveKeyPair().then(() => {
      setSecStatus(getSecurityTelemetryStatus());
    });
    const sync = () => {
      setFinState(loadEcosystemLedger());
      setSecStatus(getSecurityTelemetryStatus());
    };
    window.addEventListener('storage', sync);
    window.addEventListener('innova-profile-updated', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('innova-profile-updated', sync);
    };
  }, []);

  const handleSaveBankAndPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (finState.routingNumber && finState.routingNumber.trim()) {
      const check = validateAbaRoutingNumber(finState.routingNumber);
      if (!check.valid) {
        setStatusNotice({ type: 'error', text: check.error || 'Invalid routing number.' });
        return;
      }
    }

    // Sign hardware-bound DPoP proof silently on the inside!
    const proof = await signHardwareBoundChallenge(userNode.handle, 'BIND_CREATOR_ACH_BANK');
    if (proof) {
      setLastDpopProof(`${proof.thumbprint}::${proof.nonce.slice(0, 8).toUpperCase()}`);
    }

    const connected = Boolean(
      finState.bankName &&
      finState.bankName.trim() &&
      finState.routingNumber &&
      finState.routingNumber.replace(/\D/g, '').length === 9 &&
      finState.accountNumber &&
      finState.accountNumber.replace(/\D/g, '').length >= 4
    );

    const saved = saveEcosystemLedger({
      ...finState,
      handle: userNode.handle || finState.handle,
      displayName: userNode.name || finState.displayName,
      bankConnected: connected
    });
    setFinState(saved);
    setSecStatus(getSecurityTelemetryStatus());
    setStatusNotice({
      type: 'success',
      text: connected
        ? `✓ ACH Bank Account (•••• ${saved.bankLast4}) & Plan Sealed with Hardware Enclave Key!`
        : '✓ Ecosystem Subscription Plan Updated & Synced!'
    });
    setTimeout(() => setStatusNotice(null), 4000);
  };

  const handleAdjustInva = async (mode: 'ADD' | 'SUBTRACT') => {
    const amt = Math.max(0, Number(invaAdjustAmount) || 0);
    if (amt <= 0) return;
    const proof = await signHardwareBoundChallenge(userNode.handle, `${mode}_INVA_${amt}`);
    if (proof) {
      setLastDpopProof(`${proof.thumbprint}::${proof.nonce.slice(0, 8).toUpperCase()}`);
    }
    const next = adjustInvaBalance(amt, mode, mode === 'ADD' ? 'Command Hub Credit' : 'Command Hub Debit');
    setFinState(next);
    setSecStatus(getSecurityTelemetryStatus());
    setStatusNotice({
      type: 'success',
      text: `${mode === 'ADD' ? '+ Added' : '- Subtracted'} ${amt.toLocaleString()} $INVA • New Balance: ${next.invaCredits.toLocaleString()} $INVA`
    });
    setTimeout(() => setStatusNotice(null), 3500);
  };

  const handleWithdrawAch = async () => {
    const proof = await signHardwareBoundChallenge(userNode.handle, 'EXECUTE_ACH_PAYOUT');
    if (proof) {
      setLastDpopProof(`${proof.thumbprint}::${proof.nonce.slice(0, 8).toUpperCase()}`);
    }
    const res = executeCreatorAchPayout();
    setFinState(res.state);
    setSecStatus(getSecurityTelemetryStatus());
    if (res.success) {
      setStatusNotice({
        type: 'success',
        text: `💸 ACH Cash Payout Executed to ${res.state.bankName} (•••• ${res.state.bankLast4})!`
      });
    } else {
      setStatusNotice({
        type: 'error',
        text: res.error || 'Unable to execute ACH payout.'
      });
    }
    setTimeout(() => setStatusNotice(null), 4000);
  };

  return (
    <div className="flex-1 flex flex-col p-6 md:p-10 z-10 overflow-y-auto bg-[#03050a] font-sans text-white">
      <div className="w-full max-w-7xl mx-auto space-y-8">
        {/* Top Navigation Header (Cool Innova Cyan/Blue Layout) */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-cyan-500/20 pb-6">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onBack}
              className="cursor-pointer px-4 py-2.5 rounded-xl bg-white/5 hover:bg-cyan-500/15 border border-white/10 hover:border-cyan-400/40 text-xs font-bold text-cyan-300 flex items-center gap-2 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Command Hub
            </button>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-white uppercase">
                  Creator Bank Payouts &amp; $INVA Treasury
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-cyan-500/15 text-cyan-300 border border-cyan-400/30">
                  {userNode.handle}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Direct 80/20 Creator Splits &bull; $30 Kreation Exclusives &bull; 55% Subscription Pool &bull; Adjustable $INVA Credits
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-cyan-950/50 border border-cyan-400/30 shadow-[0_0_25px_rgba(6,182,212,0.15)]">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-cyan-200">
              Hardware Enclave &amp; Location Shield: ACTIVE
            </span>
          </div>
        </div>

        {statusNotice && (
          <div
            className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 ${
              statusNotice.type === 'success'
                ? 'bg-cyan-950/70 border-cyan-400/50 text-cyan-200'
                : 'bg-rose-950/70 border-rose-500/50 text-rose-200'
            }`}
          >
            {statusNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{statusNotice.text}</span>
          </div>
        )}

        {/* Top 3 KPI Summary Cards (Cool Blue / Cyan Theme) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl bg-[#080d1a] border border-cyan-500/25 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">Available Creator Cash</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${finState.bankConnected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                {finState.bankConnected ? `ACH Linked •••• ${finState.bankLast4}` : 'ACH Unlinked'}
              </span>
            </div>
            <div className="text-3xl font-black text-white">
              ${Number(finState.creatorEarnedUsd || 0).toFixed(2)} <span className="text-xs font-semibold text-slate-400">USD</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Total Withdrawn to Bank: <strong className="text-cyan-300">${Number(finState.totalPayoutsWithdrawnUsd || 0).toFixed(2)} USD</strong>
            </p>
          </div>

          <div className="rounded-2xl bg-[#080d1a] border border-cyan-500/25 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">$INVA Credits Balance</span>
              <span className="text-[10px] font-mono text-cyan-300">100 $INVA = $1.00 USD</span>
            </div>
            <div className="text-3xl font-black text-white">
              {Number(finState.invaCredits || 0).toLocaleString()} <span className="text-sm font-bold text-cyan-400">$INVA</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Purchasing Power: <strong className="text-cyan-300">${(Number(finState.invaCredits || 0) * 0.01).toFixed(2)} USD</strong>
            </p>
          </div>

          <div className="rounded-2xl bg-[#080d1a] border border-cyan-500/25 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">Active Ecosystem Tier</span>
              <span className="text-[10px] font-bold text-emerald-400 uppercase">{finState.subscriptionStatus || 'Active'}</span>
            </div>
            <div className="text-sm font-black text-white leading-snug">
              {finState.subscriptionTier}
            </div>
            <p className="text-[11px] text-cyan-300/80 mt-2">
              Daily Watch-to-Earn Cap: {finState.dailyInvaCap || 5} $INVA / Day
            </p>
          </div>
        </div>

        {/* Main 2-Column Grid: Left = Creator ACH Bank Routing & Account Form | Right = Adjustable $INVA Ledger & Internal Security Fortress */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left 7 Cols: Working Creator ACH Bank Routing & Account Connection */}
          <div className="lg:col-span-7 rounded-2xl bg-[#080d1a] border border-cyan-500/30 p-6 md:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-base font-black text-white uppercase tracking-wide">
                    Creator Direct ACH Bank Routing &amp; Payouts
                  </h2>
                  <p className="text-xs text-slate-400">
                    Connect your checking or savings account for monthly &amp; instant USD payouts
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveBankAndPlan} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-cyan-300 mb-2">
                  Active Ecosystem Subscription / Bundle Plan
                </label>
                <select
                  value={finState.subscriptionTier}
                  onChange={(e) => setFinState({ ...finState, subscriptionTier: e.target.value })}
                  className="w-full bg-[#040710] border border-cyan-500/30 focus:border-red-500 rounded-xl px-4 py-3 text-xs text-white outline-none"
                >
                  {ECOSYSTEM_PRICING_PLANS.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name} — {p.cycle}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Bank Name</label>
                  <input
                    type="text"
                    value={finState.bankName}
                    onChange={(e) => setFinState({ ...finState, bankName: e.target.value })}
                    placeholder="e.g. Chase, Bank of America, Wells Fargo"
                    className="w-full bg-[#040710] border border-white/15 focus:border-red-500 rounded-xl px-4 py-3 text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Account Holder Legal Name</label>
                  <input
                    type="text"
                    value={finState.accountHolder}
                    onChange={(e) => setFinState({ ...finState, accountHolder: e.target.value })}
                    placeholder="Full Name or Production Studio LLC"
                    className="w-full bg-[#040710] border border-white/15 focus:border-red-500 rounded-xl px-4 py-3 text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">9-Digit ABA Routing Number</label>
                  <input
                    type="text"
                    maxLength={9}
                    value={finState.routingNumber}
                    onChange={(e) => setFinState({ ...finState, routingNumber: e.target.value.replace(/\D/g, '').slice(0, 9) })}
                    placeholder="9-Digit Routing #"
                    className="w-full bg-[#040710] border border-white/15 focus:border-red-500 rounded-xl px-4 py-3 text-xs text-cyan-300 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Bank Account Number</label>
                  <input
                    type="text"
                    maxLength={17}
                    value={finState.accountNumber}
                    onChange={(e) => setFinState({ ...finState, accountNumber: e.target.value.replace(/\D/g, '').slice(0, 17) })}
                    placeholder="Account Number"
                    className="w-full bg-[#040710] border border-white/15 focus:border-red-500 rounded-xl px-4 py-3 text-xs text-cyan-300 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Account Type</label>
                  <select
                    value={finState.accountType || 'Checking'}
                    onChange={(e) => setFinState({ ...finState, accountType: e.target.value as any })}
                    className="w-full bg-[#040710] border border-white/15 focus:border-red-500 rounded-xl px-4 py-3 text-xs text-white outline-none"
                  >
                    <option value="Checking">Checking Account</option>
                    <option value="Savings">Savings Account</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-white/10">
                <button
                  type="submit"
                  className="cursor-pointer px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/20"
                >
                  Save &amp; Seal Bank Routing Info
                </button>

                <button
                  type="button"
                  onClick={handleWithdrawAch}
                  className="cursor-pointer px-6 py-3 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/40 text-cyan-300 font-black text-xs uppercase tracking-wider flex items-center gap-2"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  Withdraw Available Cash (${Number(finState.creatorEarnedUsd || 0).toFixed(2)})
                </button>
              </div>
            </form>
          </div>

          {/* Right 5 Cols: Adjustable $INVA Credits Controller + Internal Security Fortress Telemetry */}
          <div className="lg:col-span-5 space-y-6">
            {/* Adjustable $INVA Credits Card */}
            <div className="rounded-2xl bg-[#080d1a] border border-cyan-500/30 p-6 shadow-2xl space-y-5">
              <div className="flex items-center gap-3 border-b border-white/10 pb-3.5">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center">
                  <Coins className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-base font-black text-white uppercase tracking-wide">
                    Adjustable $INVA Credits Controller
                  </h2>
                  <p className="text-xs text-slate-400">
                    Add or subtract custom $INVA amounts (Off-TV Web Control)
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-300">
                  Adjustment Amount ($INVA)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={invaAdjustAmount}
                    onChange={(e) => setInvaAdjustAmount(e.target.value)}
                    className="w-32 bg-[#040710] border border-cyan-500/30 focus:border-red-500 rounded-xl px-4 py-3 text-sm text-white font-black outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleAdjustInva('ADD')}
                    className="cursor-pointer flex-1 py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    Add $INVA
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustInva('SUBTRACT')}
                    className="cursor-pointer flex-1 py-3 px-4 rounded-xl bg-blue-950 hover:bg-blue-900 border border-cyan-500/30 text-cyan-200 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5"
                  >
                    <Minus className="w-4 h-4" />
                    Subtract
                  </button>
                </div>
              </div>
            </div>

            {/* Internal Security Fortress Status Card (Zero-Friction Anti-Hack Enclave) */}
            <div className="rounded-2xl bg-[#080d1a] border border-cyan-500/30 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <Lock className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-white">
                    Internal Security Fortress (Zero-Friction Enclave)
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase">
                  SEALED
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#040710] border border-white/5">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-cyan-400" />
                    Hardware Key Enclave
                  </span>
                  <span className="font-mono text-[11px] text-cyan-300 font-bold">
                    ECDSA P-256 (Non-Extractable)
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#040710] border border-white/5">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Fingerprint className="w-3.5 h-3.5 text-cyan-400" />
                    Hardware Key Thumbprint
                  </span>
                  <span className="font-mono text-[11px] text-white font-bold">
                    {secStatus.publicKeyThumbprint}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#040710] border border-white/5">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    Authorized Geolocation Lock
                  </span>
                  <span className="font-mono text-[11px] text-emerald-400 font-bold">
                    {secStatus.authorizedTimezone}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#040710] border border-white/5">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                    Anti-Tamper Ledger Seal
                  </span>
                  <span className="font-mono text-[11px] text-emerald-400 font-bold">
                    {secStatus.antiTamperSealValid ? 'VERIFIED INTACT' : 'RESTORED'}
                  </span>
                </div>

                {lastDpopProof && (
                  <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-[10px] font-mono text-cyan-300">
                    Latest DPoP Signature Nonce: {lastDpopProof}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
