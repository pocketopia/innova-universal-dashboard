import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../lib/apiClient';
import { MonitorPlay, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';

interface DeviceActivationProps {
  onBack?: () => void;
}

const DeviceActivation: React.FC<DeviceActivationProps> = ({ onBack }) => {
  const [userCode, setUserCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'authorized' | 'denied' | 'error'>('idle');
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const formatUserCode = (value: string) => {
    const cleaned = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (cleaned.length <= 4) return cleaned;
    return cleaned.slice(0, 4) + '-' + cleaned.slice(4, 8);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('activate') || params.get('code');
    if (codeParam) {
      setUserCode(formatUserCode(codeParam));
    }
  }, []);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatUserCode(e.target.value);
    if (formatted.length <= 9) {
      setUserCode(formatted);
    }
  };

  const checkDeviceStatus = async () => {
    if (userCode.length < 9) {
      setError('Enter the 8-character Ring Comm code shown on your Fire TV or Tablet (e.g., ABCD-EFGH).');
      return;
    }
    setStatus('checking');
    setError('');
    setMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/device/status/${encodeURIComponent(userCode)}`);
      const data = await response.json();
      if (response.ok) {
        setDeviceInfo(data);
        setStatus('idle');
        setMessage(`Ring Comm Receiver Located: ${data.client_name}`);
      } else {
        setStatus('error');
        setError(data.error || 'Invalid or expired TV pairing code');
        setDeviceInfo(null);
      }
    } catch {
      setStatus('error');
      setError('Unable to reach Innova Master Brain API. Check your internet connection.');
    }
  };

  const handleDecision = async (action: 'authorize' | 'deny') => {
    const activeHandle = localStorage.getItem('innova-username') || '';
    const activeWallet = localStorage.getItem('innova-wallet-address') || '';

    if (!activeHandle) {
      setError('Sign into your @USER.NAME Node first before pairing a TV device.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/device/authorize-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userCode,
          userId: activeHandle.startsWith('@') ? activeHandle : `@${activeHandle}`,
          walletAddress: activeWallet,
          action
        })
      });
      const data = await response.json();
      if (response.ok) {
        if (action === 'authorize') {
          setStatus('authorized');
          setMessage(`✓ Paired ${data.device_name || 'Smart TV'} to @${activeHandle.replace(/^@/, '').toUpperCase()}!`);
        } else {
          setStatus('denied');
          setMessage('TV device pairing denied.');
          setDeviceInfo(null);
          setUserCode('');
        }
      } else {
        setStatus('error');
        setError(data.message || data.error || 'TV authorization failed');
      }
    } catch {
      setStatus('error');
      setError('Network error while authorizing TV device.');
    }
  };

  return (
    <div className="min-h-screen bg-[#020205] text-white flex items-center justify-center p-6 font-sans">
      <div className="bg-[#090C15] border border-cyan-500/30 rounded-3xl shadow-2xl p-8 max-w-md w-full space-y-6">
        {onBack && (
          <button onClick={onBack} className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 font-bold uppercase tracking-wider">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
        )}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-cyan-500/10 border border-cyan-400/30 rounded-2xl mb-2">
            <MonitorPlay className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-2xl font-black tracking-tight uppercase">Ring Comm TV Bridge</h1>
          <p className="text-xs text-slate-400">Enter the 8-character code displayed on your Fire TV or Fire Tablet app to bind it to your @USER.NAME Node.</p>
        </div>

        {status === 'authorized' && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <p className="text-sm font-bold text-emerald-300">{message}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs text-red-300 flex items-center gap-2">
            <XCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {status !== 'authorized' && (
          <div className="space-y-4">
            <input
              type="text"
              value={userCode}
              onChange={handleCodeChange}
              placeholder="ABCD-EFGH"
              className="w-full bg-black/50 border border-cyan-500/30 rounded-xl px-4 py-3.5 text-center text-xl font-mono tracking-[0.25em] text-white uppercase focus:outline-none focus:border-cyan-400"
            />
            {!deviceInfo ? (
              <button
                onClick={checkDeviceStatus}
                disabled={status === 'checking'}
                className="w-full py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase tracking-widest transition cursor-pointer"
              >
                {status === 'checking' ? 'Verifying Code...' : 'Verify TV Code'}
              </button>
            ) : (
              <div className="space-y-3 bg-white/5 border border-white/10 rounded-2xl p-4">
                <p className="text-xs text-cyan-300 font-bold text-center">{message}</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleDecision('deny')}
                    className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-bold uppercase cursor-pointer"
                  >
                    Deny
                  </button>
                  <button
                    onClick={() => handleDecision('authorize')}
                    className="flex-1 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-black uppercase cursor-pointer"
                  >
                    Authorize TV
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DeviceActivation;
