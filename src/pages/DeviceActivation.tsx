import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

const DeviceActivation: React.FC = () => {
  const [userCode, setUserCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'authorized' | 'denied' | 'error'>('idle');
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Format user code as XXXX-XXXX
  const formatUserCode = (value: string) => {
    const cleaned = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (cleaned.length <= 4) return cleaned;
    return cleaned.slice(0, 4) + '-' + cleaned.slice(4, 8);
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatUserCode(e.target.value);
    if (formatted.length <= 9) { // XXXX-XXXX = 9 chars
      setUserCode(formatted);
    }
  };

  const checkDeviceStatus = async () => {
    if (userCode.length < 9) {
      setError('Please enter a valid 8-character code (e.g., ABCD-EFGH)');
      return;
    }

    setStatus('checking');
    setError('');
    setMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/device/status/${userCode}`);
      const data = await response.json();

      if (response.ok) {
        setDeviceInfo(data);
        setMessage(`Device found: ${data.client_name}`);
      } else {
        setError(data.error || 'Invalid device code');
        setDeviceInfo(null);
      }
    } catch (err) {
      setError('Failed to connect to server. Make sure the backend is running.');
    }
  };

  const handleAuthorize = async () => {
    // In a real app, you would get the userId from the authenticated session
    // For demo, we'll use a test user ID
    const testUserId = localStorage.getItem('test_user_id');
    
    if (!testUserId) {
      setError('No user session found. Please log in first.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/device/authorize-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userCode,
          userId: testUserId,
          action: 'authorize'
        })
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('authorized');
        setMessage(`Successfully authorized ${data.device_name}!`);
      } else {
        setStatus('error');
        setError(data.message || data.error || 'Authorization failed');
      }
    } catch (err) {
      setStatus('error');
      setError('Failed to authorize device');
    }
  };

  const handleDeny = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/device/authorize-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userCode,
          userId: localStorage.getItem('test_user_id'),
          action: 'deny'
        })
      });

      if (response.ok) {
        setStatus('denied');
        setMessage('Device authorization denied.');
        setUserCode('');
        setDeviceInfo(null);
      }
    } catch (err) {
      setError('Failed to deny device');
    }
  };

  const resetForm = () => {
    setUserCode('');
    setStatus('idle');
    setDeviceInfo(null);
    setMessage('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl shadow-2xl p-8 max-w-md w-full border border-gray-700">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Link Your TV Device</h1>
          <p className="text-gray-400">Enter the 8-character code displayed on your TV to authorize the device.</p>
        </div>

        {status === 'authorized' && (
          <div className="bg-green-500/20 border border-green-500 rounded-lg p-4 mb-6 text-center">
            <svg className="w-12 h-12 text-green-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-green-300 font-semibold">{message}</p>
            <button
              onClick={resetForm}
              className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
            >
              Link Another Device
            </button>
          </div>
        )}

        {status === 'denied' && (
          <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-4 mb-6 text-center">
            <p className="text-yellow-300">{message}</p>
            <button
              onClick={resetForm}
              className="mt-4 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition"
            >
              Enter New Code
            </button>
          </div>
        )}

        {status !== 'authorized' && status !== 'denied' && (
          <>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Device Code
              </label>
              <input
                type="text"
                value={userCode}
                onChange={handleCodeChange}
                placeholder="ABCD-EFGH"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-center text-2xl font-mono tracking-wider placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent uppercase"
                maxLength={9}
              />
              <p className="text-xs text-gray-500 mt-2 text-center">
                Enter the code exactly as shown on your TV screen
              </p>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 mb-4">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            {deviceInfo && (
              <div className="bg-gray-700/50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">Device:</span>
                  <span className="text-white font-semibold">{deviceInfo.client_name}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">Status:</span>
                  <span className="text-green-400">Pending Authorization</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Expires in:</span>
                  <span className="text-yellow-400">{Math.floor(deviceInfo.expires_in / 60)} minutes</span>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {status === 'idle' ? (
                <button
                  onClick={checkDeviceStatus}
                  disabled={userCode.length < 9}
                  className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Check Device
                </button>
              ) : (
                <>
                  <button
                    onClick={handleAuthorize}
                    className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-lg transition"
                  >
                    Authorize Device
                  </button>
                  <button
                    onClick={handleDeny}
                    className="w-full px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-semibold rounded-lg transition"
                  >
                    Deny Device
                  </button>
                </>
              )}
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={() => navigate('/')}
                className="text-gray-400 hover:text-white text-sm transition"
              >
                ← Back to Dashboard
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DeviceActivation;