import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  verifyIdentity,
  registerIdentity,
  generateMockHardwareSignature,
  hasValidSession,
  getStoredUserSession,
  clearIdentityData,
  IdentityVerificationResponse,
  IdentityRegistrationResponse,
} from '../lib/apiClient';
import {
  secureStorage,
  clearAllSensitiveData,
  auditStorageSecurity,
  encryptSensitiveData,
  decryptSensitiveData,
} from '../lib/securityUtils';

// User node interface
export interface UserNode {
  handle: string;
  userId: string;
  walletAddress: string;
  tenantId: string;
  tier: string;
  publicKey?: string;
  verified: boolean;
  createdAt: string;
  lastVerifiedAt?: string;
}

// Context state interface
interface NodeAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  userNode: UserNode | null;
  login: (userName: string) => Promise<{ success: boolean; requiresRegistration?: boolean; error?: string }>;
  register: (userName: string, walletAddress: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshSession: () => Promise<boolean>;
}

const NodeAuthContext = createContext<NodeAuthState | undefined>(undefined);

// Provider props
interface NodeAuthProviderProps {
  children: ReactNode;
}

export function NodeAuthProvider({ children }: NodeAuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userNode, setUserNode] = useState<UserNode | null>(null);

  // Check for existing session on mount and audit storage security
  useEffect(() => {
    const checkSession = async () => {
      // Run security audit on mount to ensure no sensitive data is stored in plain text
      const auditResult = auditStorageSecurity();
      if (!auditResult.secure) {
        console.warn('[SECURITY] Storage audit found violations:', auditResult.violations);
        // Clear any insecure data found
        clearAllSensitiveData();
      }
      
      if (hasValidSession()) {
        const stored = getStoredUserSession();
        setUserNode({
          handle: stored.userName,
          userId: stored.userName, // Use userName as userId for now
          walletAddress: stored.walletAddress,
          tenantId: stored.tenantId,
          tier: 'verified',
          verified: true,
          createdAt: new Date().toISOString(),
        });
        setIsAuthenticated(true);
      }
      setIsLoading(false);
    };
    checkSession();
  }, []);

  // Login / Verify identity
  const login = useCallback(async (userName: string): Promise<{ success: boolean; requiresRegistration?: boolean; error?: string }> => {
    const hardwareSignature = generateMockHardwareSignature();
    
    try {
      const response: IdentityVerificationResponse = await verifyIdentity(userName, hardwareSignature);
      
      setUserNode({
        handle: response.identity.userName,
        userId: response.identity.userId,
        walletAddress: response.identity.walletAddress,
        tenantId: response.identity.tenantId,
        tier: response.identity.tier || 'verified',
        publicKey: response.identity.publicKey,
        verified: response.identity.verified,
        createdAt: response.identity.createdAt,
        lastVerifiedAt: response.identity.lastVerifiedAt,
      });
      
      setIsAuthenticated(true);
      return { success: true };
    } catch (error) {
      if (error instanceof Error) {
        const msg = error.message.toLowerCase();
        // Catch all lexical indicators of a missing node identity
        if (msg.includes('404') || msg.includes('not found') || msg.includes('no identity found') || msg.includes('no registered identity')) {
          return { success: false, requiresRegistration: true };
        }
      }
      return { success: false, error: error instanceof Error ? error.message : 'Verification failed' };
    }
  }, []);

  // Register new identity
  const register = useCallback(async (userName: string, walletAddress: string): Promise<{ success: boolean; error?: string }> => {
    const hardwareSignature = generateMockHardwareSignature();
    // Generate exactly 64 hex-characters with no prefix to satisfy ED25519 regex checks
    const generateMockPublicKey = () => {
      const chars = '0123456789abcdef';
      let result = '';
      for (let i = 0; i < 64; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
      }
      return result;
    };
    const publicKey = generateMockPublicKey();
    
    try {
      const response: IdentityRegistrationResponse = await registerIdentity(
        userName,
        walletAddress,
        publicKey,
        hardwareSignature
      );
      
      setUserNode({
        handle: response.identity.userName,
        userId: response.identity.userId,
        walletAddress: response.identity.walletAddress,
        tenantId: response.identity.tenantId,
        tier: response.identity.tier,
        publicKey: response.identity.publicKey,
        verified: response.identity.verified,
        createdAt: response.identity.createdAt,
      });
      
      setIsAuthenticated(true);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Registration failed' };
    }
  }, []);

  // Logout - clears all sensitive data including encrypted storage
  const logout = useCallback(() => {
    clearIdentityData();
    // Also clear all sensitive data from secure storage
    clearAllSensitiveData();
    setUserNode(null);
    setIsAuthenticated(false);
  }, []);

  // Refresh session
  const refreshSession = useCallback(async (): Promise<boolean> => {
    if (!userNode) return false;
    
    try {
      const hardwareSignature = localStorage.getItem('innova-hardware-sig') || generateMockHardwareSignature();
      const response: IdentityVerificationResponse = await verifyIdentity(userNode.handle, hardwareSignature);
      
      setUserNode({
        ...userNode,
        lastVerifiedAt: response.identity.lastVerifiedAt,
      });
      
      return true;
    } catch (error) {
      return false;
    }
  }, [userNode]);

  const value: NodeAuthState = {
    isAuthenticated,
    isLoading,
    userNode,
    login,
    register,
    logout,
    refreshSession,
  };

  return (
    <NodeAuthContext.Provider value={value}>
      {children}
    </NodeAuthContext.Provider>
  );
}

// Custom hook to use the auth context
export function useNodeAuth() {
  const context = useContext(NodeAuthContext);
  if (context === undefined) {
    throw new Error('useNodeAuth must be used within a NodeAuthProvider');
  }
  return context;
}

export default NodeAuthContext;