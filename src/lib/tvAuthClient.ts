/**
 * TV Auth Client - OAuth 2.0 Device Authorization Grant (RFC 8628)
 * 
 * This module implements the client-side logic for TV devices to authenticate
 * users via the Device Authorization Grant flow. The TV displays a user code,
 * the user authorizes on a separate device (web dashboard), and the TV polls
 * for the access token.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://10.0.0.2:3002';

// Types for Device Authorization Flow
export interface DeviceAuthorizationResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

export interface DeviceTokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
}

export interface DeviceAuthorizationError {
  error: 'authorization_pending' | 'slow_down' | 'access_denied' | 'expired_device_code' | 'invalid_grant';
  error_description?: string;
  error_uri?: string;
}

export interface PollingState {
  status: 'pending' | 'authorized' | 'denied' | 'expired' | 'error';
  deviceCode: string;
  userCode: string;
  accessToken?: string;
  error?: string;
}

// Custom error class for TV auth errors
export class TVAuthError extends Error {
  constructor(
    public code: string,
    message: string,
    public isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'TVAuthError';
  }
}

/**
 * Request a new device authorization code from the server.
 * This is called when the TV app starts the authentication flow.
 * 
 * @param clientId - Unique identifier for the TV client (e.g., 'mvn-tv', 'kreation-tv')
 * @param clientName - Human-readable name for the device (e.g., 'MVN Fire TV')
 * @returns Device authorization response with device_code and user_code
 */
export async function requestDeviceAuthorization(
  clientId: string,
  clientName: string
): Promise<DeviceAuthorizationResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    const response = await fetch(`${API_BASE_URL}/api/device/authorize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ clientId, clientName }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new TVAuthError(
        errorData.error || 'server_error',
        errorData.message || `Failed to request device authorization: ${response.statusText}`,
        response.status >= 500 // Retryable for server errors
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof TVAuthError) {
      throw error;
    }
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new TVAuthError(
          'timeout',
          'Request timed out. Please check your network connection.',
          true // Retryable
        );
      }
      throw new TVAuthError(
        'network_error',
        `Network error: ${error.message}`,
        true // Retryable for network errors
      );
    }
    
    throw new TVAuthError('unknown_error', 'An unknown error occurred', false);
  }
}

/**
 * Poll the token endpoint to check if the user has authorized the device.
 * This should be called repeatedly at the interval specified in the authorization response.
 * 
 * @param deviceCode - The device_code from the authorization response
 * @param clientId - The same client_id used in the authorization request
 * @returns Access token response if authorized
 * @throws TVAuthError with specific error codes for different failure states
 */
export async function pollForAccessToken(
  deviceCode: string,
  clientId: string
): Promise<DeviceTokenResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    const response = await fetch(`${API_BASE_URL}/api/device/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        device_code: deviceCode,
        client_id: clientId,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    // Success - user authorized the device
    if (response.ok && data.access_token) {
      return data;
    }

    // Handle specific error codes from RFC 8628
    if (!response.ok && data.error) {
      switch (data.error) {
        case 'authorization_pending':
          throw new TVAuthError(
            'authorization_pending',
            'User has not yet authorized the device. Continue polling.',
            true // Retryable - keep polling
          );
        
        case 'slow_down':
          throw new TVAuthError(
            'slow_down',
            'Polling too frequently. Increase the polling interval.',
            true // Retryable - but with longer interval
          );
        
        case 'access_denied':
          throw new TVAuthError(
            'access_denied',
            'User denied the authorization request.',
            false // Not retryable - user explicitly denied
          );
        
        case 'expired_device_code':
          throw new TVAuthError(
            'expired_device_code',
            'The device code has expired. Please restart the authorization flow.',
            false // Not retryable - need new device code
          );
        
        case 'invalid_grant':
          throw new TVAuthError(
            'invalid_grant',
            'Invalid grant. The device code may be invalid.',
            false // Not retryable
          );
        
        default:
          throw new TVAuthError(
            data.error,
            data.error_description || 'Unknown error from server',
            response.status >= 500 // Retryable for server errors
          );
      }
    }

    throw new TVAuthError(
      'server_error',
      `Unexpected response: ${response.statusText}`,
      true
    );
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof TVAuthError) {
      throw error;
    }
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new TVAuthError(
          'timeout',
          'Request timed out. Please check your network connection.',
          true // Retryable
        );
      }
      throw new TVAuthError(
        'network_error',
        `Network error: ${error.message}`,
        true // Retryable for network errors
      );
    }
    
    throw new TVAuthError('unknown_error', 'An unknown error occurred', false);
  }
}

/**
 * Start the complete device authorization flow with automatic polling.
 * This function handles the entire lifecycle: requesting a device code,
 * displaying it to the user, and polling until authorization is complete.
 * 
 * @param clientId - Unique identifier for the TV client
 * @param clientName - Human-readable name for the device
 * @param onUserCode - Callback when user code is received (to display on TV)
 * @param onAuthorized - Callback when access token is received
 * @param onError - Callback when an error occurs
 * @returns Function to cancel the polling (call this on component unmount)
 */
export function startDeviceAuthFlow(
  clientId: string,
  clientName: string,
  onUserCode: (userCode: string, verificationUri: string) => void,
  onAuthorized: (token: DeviceTokenResponse) => void,
  onError: (error: TVAuthError) => void
): () => void {
  let isCancelled = false;
  let pollingInterval: ReturnType<typeof setTimeout> | null = null;
  let deviceCode = '';
  let interval = 5; // Default polling interval in seconds

  async function startFlow() {
    try {
      // Step 1: Request device authorization
      const authResponse = await requestDeviceAuthorization(clientId, clientName);
      
      if (isCancelled) return;
      
      deviceCode = authResponse.device_code;
      interval = authResponse.interval || 5;

      // Notify UI to display user code
      onUserCode(authResponse.user_code, authResponse.verification_uri);

      // Step 2: Start polling
      startPolling();
    } catch (error) {
      if (isCancelled) return;
      onError(error as TVAuthError);
    }
  }

  async function startPolling() {
    // Clear any existing interval
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    // Use setTimeout for first poll to avoid immediate execution
    pollingInterval = setInterval(async () => {
      if (isCancelled) {
        if (pollingInterval) clearInterval(pollingInterval);
        return;
      }

      try {
        const tokenResponse = await pollForAccessToken(deviceCode, clientId);
        
        if (isCancelled) return;
        
        // Success! Stop polling and notify
        if (pollingInterval) clearInterval(pollingInterval);
        onAuthorized(tokenResponse);
      } catch (error) {
        if (isCancelled) return;
        
        const authError = error as TVAuthError;
        
        // Handle different error types
        switch (authError.code) {
          case 'authorization_pending':
            // Keep polling - this is expected
            break;
          
          case 'slow_down':
            // Increase polling interval and continue
            interval = Math.max(interval * 2, 10); // Double interval, minimum 10 seconds
            if (pollingInterval) {
              clearInterval(pollingInterval);
              pollingInterval = setInterval(startPolling, interval * 1000);
            }
            break;
          
          case 'access_denied':
            // User denied - stop polling
            if (pollingInterval) clearInterval(pollingInterval);
            onError(authError);
            break;
          
          case 'expired_device_code':
            // Code expired - stop polling
            if (pollingInterval) clearInterval(pollingInterval);
            onError(authError);
            break;
          
          default:
            // For other errors, we might want to retry a few times
            // For now, just report the error
            if (pollingInterval) clearInterval(pollingInterval);
            onError(authError);
            break;
        }
      }
    }, interval * 1000);
  }

  // Start the flow immediately
  startFlow();

  // Return cancellation function
  return () => {
    isCancelled = true;
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  };
}

/**
 * Check the status of a device authorization without starting a full flow.
 * Useful for checking status from the web dashboard.
 * 
 * @param userCode - The user code displayed on the TV
 * @returns Current status of the device authorization
 */
export async function checkDeviceStatus(userCode: string): Promise<{
  status: string;
  client_name: string;
  client_id: string;
  expires_in: number;
}> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/device/status/${encodeURIComponent(userCode)}`,
      {
        method: 'GET',
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to check status: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timed out');
      }
    }
    throw error;
  }
}

/**
 * Authorize a device from the web dashboard.
 * 
 * @param userCode - The user code displayed on the TV
 * @param userId - The ID of the user authorizing the device
 * @param action - 'authorize' or 'deny'
 * @returns Result of the authorization
 */
export async function authorizeDevice(
  userCode: string,
  userId: string,
  action: 'authorize' | 'deny' = 'authorize'
): Promise<{ success: boolean; message?: string; device_name?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`${API_BASE_URL}/api/device/authorize-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userCode,
        userId,
        action,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to authorize: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timed out');
      }
    }
    throw error;
  }
}