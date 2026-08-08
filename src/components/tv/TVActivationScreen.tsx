import React, { useState, useEffect, useCallback } from 'react';
import { 
  startDeviceAuthFlow, 
  TVAuthError, 
  DeviceTokenResponse 
} from '../../lib/tvAuthClient';

const TVActivationScreen: React.FC = () => {
  const [userCode, setUserCode] = useState<string>('');
  const [verificationUri, setVerificationUri] = useState<string>('');
  const [status, setStatus] = useState<'connecting' | 'displaying' | 'authorized' | 'error'>('connecting');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [accessToken, setAccessToken] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  // Get client info from environment or generate from URL
  const getTenantFromUrl = (): string => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.includes('/mvn')) return 'mvn';
      if (path.includes('/kreation')) return 'kreation';
      if (path.includes('/archaven')) return 'archaven';
      if (path.includes('/hektic')) return 'hektic';
      if (path.includes('/streamshare')) return 'streamshare';
    }
    return import.meta.env.VITE_STANDALONE_APP || 'mvn';
  };

  const tenant = getTenantFromUrl();
  const clientId = `${tenant}-tv`;
  const clientName = `${tenant.toUpperCase()} TV`;

  const handleError = useCallback((error: TVAuthError) => {
    console.error('[TV AUTH] Error:', error);
    
    if (error.code === 'timeout' || error.code === 'network_error') {
      if (retryCount < MAX_RETRIES) {
        setRetryCount(prev => prev + 1);
        setStatus('connecting');
        // Retry after 3 seconds
        setTimeout(() => {
          startAuthFlow();
        }, 3000);
      } else {
        setStatus('error');
        setErrorMessage('Network error. Please check your connection and restart the app.');
      }
    } else if (error.code === 'access_denied') {
      setStatus('error');
      setErrorMessage('Authorization denied. Please try again.');
    } else if (error.code === 'expired_device_code') {
      setStatus('error');
      setErrorMessage('Code expired. Please restart to get a new code.');
    } else {
      setStatus('error');
      setErrorMessage(error.message || 'An error occurred during authorization.');
    }
  }, [retryCount]);

  const handleUserCode = useCallback((code: string, uri: string) => {
    setUserCode(code);
    setVerificationUri(uri);
    setStatus('displaying');
  }, []);

  const handleAuthorized = useCallback((token: DeviceTokenResponse) => {
    setAccessToken(token.access_token);
    
    // Store token in localStorage
    localStorage.setItem('tv_access_token', token.access_token);
    localStorage.setItem('tv_token_expires', (Date.now() + token.expires_in * 1000).toString());
    localStorage.setItem('tv_client_id', clientId);
    
    setStatus('authorized');
    
    // Reload the app to load the main interface
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  }, [clientId]);

  const startAuthFlow = useCallback(() => {
    setStatus('connecting');
    setUserCode('');
    setVerificationUri('');
    setErrorMessage('');
    
    // Start the device auth flow
    const cancelAuth = startDeviceAuthFlow(
      clientId,
      clientName,
      handleUserCode,
      handleAuthorized,
      handleError
    );

    // Store cancel function for cleanup
    return cancelAuth;
  }, [clientId, clientName, handleUserCode, handleAuthorized, handleError]);

  useEffect(() => {
    const cancelAuth = startAuthFlow();
    return () => {
      cancelAuth();
    };
  }, [startAuthFlow]);

  // Render connecting state
  if (status === 'connecting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mb-8 animate-pulse">
            <svg className="w-12 h-12 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
          </div>
          <h1 className="text-4xl font-black text-white mb-4 tracking-tight">CONNECTING TO INNOVA</h1>
          <p className="text-white/60 text-lg">Establishing secure connection...</p>
          {retryCount > 0 && (
            <p className="text-white/40 text-sm mt-4">Retry attempt {retryCount} of {MAX_RETRIES}</p>
          )}
        </div>
      </div>
    );
  }

  // Render authorized state
  if (status === 'authorized') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-emerald-900 to-gray-900 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full mb-8">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-4xl font-black text-white mb-4 tracking-tight">DEVICE AUTHORIZED!</h1>
          <p className="text-white/60 text-lg">Welcome to {clientName}</p>
          <p className="text-white/40 text-sm mt-4">Loading your experience...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-rose-900 to-gray-900 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-rose-500 to-red-500 rounded-full mb-8">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-white mb-4 tracking-tight">CONNECTION ERROR</h1>
          <p className="text-white/60 text-lg mb-8">{errorMessage}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-gradient-to-r from-rose-500 to-red-500 text-white px-8 py-3 rounded-xl font-bold text-lg hover:from-rose-600 hover:to-red-600 transition"
          >
            RESTART APP
          </button>
        </div>
      </div>
    );
  }

  // Render code display state
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-8">
      <div className="text-center max-w-2xl">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-black text-white mb-2 tracking-tight">
            {clientName}
          </h1>
          <p className="text-white/60 text-xl">Activate Your Device</p>
        </div>

        {/* User Code Display */}
        <div className="mb-12">
          <p className="text-white/60 text-lg mb-4">Enter this code on your phone or computer:</p>
          <div className="bg-white/10 backdrop-blur-xl border-2 border-white/20 rounded-3xl p-8 mb-6">
            <div className="text-6xl font-black text-white tracking-wider font-mono">
              {userCode.split('').map((char, index) => (
                <span 
                  key={index}
                  className={`inline-block ${char === '-' ? 'text-white/40 mx-1' : ''}`}
                >
                  {char}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Verification URL */}
        <div className="mb-12">
          <p className="text-white/60 text-lg mb-2">Or visit:</p>
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4 inline-block">
            <p className="text-2xl font-bold text-white font-mono">
              {verificationUri}
            </p>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center justify-center gap-3">
          <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
          <p className="text-white/60 text-sm">
            Waiting for authorization...
          </p>
        </div>

        {/* Instructions */}
        <div className="mt-12 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 text-left">
          <h3 className="text-white font-bold mb-3">How to activate:</h3>
          <ol className="text-white/60 space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-purple-400 font-bold">1.</span>
              <span>Open your phone or computer browser</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400 font-bold">2.</span>
              <span>Visit the URL shown above</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400 font-bold">3.</span>
              <span>Enter the 8-character code exactly as shown</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400 font-bold">4.</span>
              <span>Sign in and approve the device</span>
            </li>
          </ol>
        </div>

        {/* Footer */}
        <p className="text-white/30 text-xs mt-8">
          This code will expire in 10 minutes. Do not share this code with anyone.
        </p>
      </div>
    </div>
  );
};

export default TVActivationScreen;