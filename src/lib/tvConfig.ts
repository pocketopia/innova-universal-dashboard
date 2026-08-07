/**
 * LG webOS TV Configuration for Standalone Applications
 * Supports 5 ecosystem tenants: MVN, Kreation, ArcHaven, Hektic TV, StreamShare
 */

// Standalone app types
export type StandaloneApp = 'mvn' | 'kreation' | 'archaven' | 'hektic' | 'streamshare' | 'hub';

// TV Key Codes for webOS remote control
export const TV_KEYS = {
  UP: 38,
  DOWN: 40,
  LEFT: 37,
  RIGHT: 39,
  ENTER: 13,
  BACK: 461,
  RED: 403,
  GREEN: 427,
  YELLOW: 428,
  BLUE: 429,
  PLAY: 19,
  PAUSE: 20,
  FAST_FORWARD: 417,
  REWIND: 412,
  HOME: 460,
  INFO: 447,
  VOLUME_UP: 448,
  VOLUME_DOWN: 449,
} as const;

/**
 * Get the standalone app configuration from environment
 */
export const getStandaloneApp = (): StandaloneApp => {
  const envValue = import.meta.env.VITE_STANDALONE_APP;
  const validApps: StandaloneApp[] = ['mvn', 'kreation', 'archaven', 'hektic', 'streamshare', 'hub'];
  
  if (envValue && validApps.includes(envValue.toLowerCase())) {
    return envValue.toLowerCase() as StandaloneApp;
  }
  
  return 'hub'; // Default to hub if not specified
};

/**
 * Check if the app is running in standalone mode
 */
export const isStandaloneMode = (): boolean => {
  return getStandaloneApp() !== 'hub';
};

/**
 * Get the platform route for the standalone app
 */
export const getStandaloneRoute = (app: StandaloneApp): string => {
  const routes: Record<StandaloneApp, string> = {
    mvn: '/platform/mvn',
    kreation: '/platform/kreation',
    archaven: '/platform/archaven',
    hektic: '/platform/hektic',
    streamshare: '/platform/streamshare',
    hub: '/',
  };
  
  return routes[app] || '/';
};

/**
 * Get the platform name for display
 */
export const getPlatformName = (app: StandaloneApp): string => {
  const names: Record<StandaloneApp, string> = {
    mvn: 'MVN - Music Video Network',
    kreation: 'Kreation Gaming',
    archaven: 'ArcHaven Cinema',
    hektic: 'Hektic TV - Live Stream',
    streamshare: 'StreamShare Media',
    hub: 'Innova Ecosystem Hub',
  };
  
  return names[app] || 'Innova Ecosystem';
};

/**
 * Get the webOS app info configuration
 */
export const getWebOSAppInfo = (app: StandaloneApp) => {
  const configs = {
    mvn: {
      id: 'com.innova.mvn',
      title: 'MVN - Music Video Network',
      version: '1.0.0',
      icon: 'icon.png',
      largeIcon: 'largeIcon.png',
    },
    kreation: {
      id: 'com.innova.kreation',
      title: 'Kreation Gaming',
      version: '1.0.0',
      icon: 'icon.png',
      largeIcon: 'largeIcon.png',
    },
    archaven: {
      id: 'com.innova.archaven',
      title: 'ArcHaven Cinema',
      version: '1.0.0',
      icon: 'icon.png',
      largeIcon: 'largeIcon.png',
    },
    hektic: {
      id: 'com.innova.hektic',
      title: 'Hektic TV - Live Stream',
      version: '1.0.0',
      icon: 'icon.png',
      largeIcon: 'largeIcon.png',
    },
    streamshare: {
      id: 'com.innova.streamshare',
      title: 'StreamShare Media',
      version: '1.0.0',
      icon: 'icon.png',
      largeIcon: 'largeIcon.png',
    },
    hub: {
      id: 'com.innova.hub',
      title: 'Innova Ecosystem Hub',
      version: '1.0.0',
      icon: 'icon.png',
      largeIcon: 'largeIcon.png',
    },
  };
  
  return configs[app] || configs.hub;
};

/**
 * Spatial navigation configuration for TV D-Pad
 */
export interface SpatialNavConfig {
  focusableSelector: string;
  wrapAround: boolean;
  rememberSource: boolean;
}

export const DEFAULT_SPATIAL_NAV_CONFIG: SpatialNavConfig = {
  focusableSelector: 'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])',
  wrapAround: false,
  rememberSource: true,
};

/**
 * Check if a key code is a TV navigation key
 */
export const isTVNavigationKey = (keyCode: number): boolean => {
  const navKeys = Object.values(TV_KEYS) as number[];
  return navKeys.includes(keyCode);
};

/**
 * Handle TV remote key press
 */
export const handleTVKeyPress = (
  keyCode: number,
  callbacks: {
    onUp?: () => void;
    onDown?: () => void;
    onLeft?: () => void;
    onRight?: () => void;
    onEnter?: () => void;
    onBack?: () => void;
  }
): boolean => {
  switch (keyCode) {
    case TV_KEYS.UP:
      callbacks.onUp?.();
      return true;
    case TV_KEYS.DOWN:
      callbacks.onDown?.();
      return true;
    case TV_KEYS.LEFT:
      callbacks.onLeft?.();
      return true;
    case TV_KEYS.RIGHT:
      callbacks.onRight?.();
      return true;
    case TV_KEYS.ENTER:
      callbacks.onEnter?.();
      return true;
    case TV_KEYS.BACK:
      callbacks.onBack?.();
      return true;
    default:
      return false;
  }
};

/**
 * Initialize TV mode with spatial navigation
 */
export const initTVMode = (): void => {
  // Set touch to mouse event conversion for webOS
  if (typeof window !== 'undefined') {
    // Add webOS-specific meta tag
    const metaTag = document.createElement('meta');
    metaTag.name = 'webOS-mode';
    metaTag.content = 'fullscreen';
    document.head.appendChild(metaTag);
    
    // Prevent default touch behaviors that interfere with D-Pad
    document.addEventListener('keydown', (e) => {
      if (isTVNavigationKey(e.keyCode)) {
        // Allow default behavior for navigation
      }
    });
  }
};

/**
 * Get the initial route based on standalone app configuration
 */
export const getInitialRoute = (): string => {
  const app = getStandaloneApp();
  return getStandaloneRoute(app);
};

/**
 * Check if a platform should be shown based on standalone config
 */
export const shouldShowPlatform = (platform: string): boolean => {
  if (!isStandaloneMode()) return true; // Show all in hub mode
  
  const app = getStandaloneApp();
  const platformMap: Record<StandaloneApp, string> = {
    mvn: 'mvn',
    kreation: 'kreation',
    archaven: 'archaven',
    hektic: 'hektic',
    streamshare: 'streamshare',
    hub: '',
  };
  
  return platformMap[app] === platform;
};