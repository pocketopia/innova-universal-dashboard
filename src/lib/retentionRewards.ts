/**
 * Innova Retention & Creator Reward Ecosystem
 * 
 * Tracks content consumption and distributes rewards based on
 * progression thresholds. Implements the 80% rule for series
 * completion on ArcHaven (AI-only high-fidelity film platform)
 * and Hektic TV.
 */

// ============================================
// TYPES & INTERFACES
// ============================================

export type PlatformType = 'archaven' | 'hektic' | 'mvn' | 'kreation' | 'streamshare';

export interface ContentItem {
  id: string;
  title: string;
  platform: PlatformType;
  type: 'episode' | 'film' | 'track' | 'game' | 'project';
  seriesId?: string;        // For episodic content
  seriesTitle?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  totalEpisodes?: number;   // Total episodes in series
  duration: number;         // Duration in seconds
  creatorHandle: string;
  creatorTier: CreatorTier;
  releaseDate: string;
}

export type CreatorTier = 'emerging' | 'verified' | 'established' | 'premium' | 'legend';

export interface CreatorProfile {
  handle: string;
  tier: CreatorTier;
  totalContent: number;
  totalViews: number;
  totalEarnings: number;
  limitations?: CreatorLimitations;
  verified: boolean;
  joinDate: string;
}

export interface CreatorLimitations {
  maxUploadsPerMonth: number;
  maxFileSize: number;        // in MB
  requiresReview: boolean;
  limitedMonetization: boolean;
  cooldownPeriod: number;     // days between payouts
}

export interface ViewingSession {
  id: string;
  userId: string;
  contentId: string;
  platform: PlatformType;
  startTime: number;
  endTime: number;
  durationWatched: number;    // seconds watched
  completed: boolean;
  percentageWatched: number;  // 0-100
}

export interface SeriesProgress {
  userId: string;
  seriesId: string;
  platform: PlatformType;
  totalEpisodes: number;
  watchedEpisodes: number;
  totalDuration: number;
  watchedDuration: number;
  percentageComplete: number;
  lastWatched: number;
  completedEpisodes: string[];  // episode IDs
}

export interface RewardThreshold {
  id: string;
  name: string;
  description: string;
  platform: PlatformType;
  requirement: {
    type: 'percentage' | 'episodes' | 'duration';
    value: number;
    seriesRequired: boolean;
  };
  reward: {
    type: 'token' | 'badge' | 'multiplier' | 'unlock';
    amount?: number;          // token amount
    multiplier?: number;      // earnings multiplier
    badgeId?: string;
    unlockId?: string;
  };
  tier: CreatorTier;          // minimum creator tier eligible
}

export interface RewardDistribution {
  id: string;
  userId: string;
  creatorHandle: string;
  thresholdId: string;
  amount: number;
  timestamp: number;
  transactionHash?: string;
  status: 'pending' | 'distributed' | 'failed';
}

export interface DailyRewardPool {
  date: string;               // YYYY-MM-DD
  platform: PlatformType;
  totalPool: number;
  distributed: number;
  recipients: number;
  status: 'active' | 'closed';
}

// ============================================
// CREATOR TIER CONFIGURATION
// ============================================

const CREATOR_TIER_CONFIG: Record<CreatorTier, {
  revenueShare: number;       // % of revenue creator receives
  limitations: CreatorLimitations;
  minContent: number;
  minViews: number;
  badgeColor: string;
}> = {
  emerging: {
    revenueShare: 0.70,       // 70% to creator
    limitations: {
      maxUploadsPerMonth: 5,
      maxFileSize: 500,       // 500MB
      requiresReview: true,
      limitedMonetization: true,
      cooldownPeriod: 30
    },
    minContent: 0,
    minViews: 0,
    badgeColor: '#94a3b8'     // slate-400
  },
  verified: {
    revenueShare: 0.75,
    limitations: {
      maxUploadsPerMonth: 15,
      maxFileSize: 2000,      // 2GB
      requiresReview: true,
      limitedMonetization: false,
      cooldownPeriod: 14
    },
    minContent: 3,
    minViews: 1000,
    badgeColor: '#3b82f6'     // blue-500
  },
  established: {
    revenueShare: 0.80,
    limitations: {
      maxUploadsPerMonth: 50,
      maxFileSize: 10000,     // 10GB
      requiresReview: false,
      limitedMonetization: false,
      cooldownPeriod: 7
    },
    minContent: 10,
    minViews: 10000,
    badgeColor: '#8b5cf6'     // violet-500
  },
  premium: {
    revenueShare: 0.85,
    limitations: {
      maxUploadsPerMonth: 100,
      maxFileSize: 50000,     // 50GB
      requiresReview: false,
      limitedMonetization: false,
      cooldownPeriod: 3
    },
    minContent: 25,
    minViews: 100000,
    badgeColor: '#ec4899'     // pink-500
  },
  legend: {
    revenueShare: 0.90,
    limitations: {
      maxUploadsPerMonth: -1, // unlimited
      maxFileSize: -1,        // unlimited
      requiresReview: false,
      limitedMonetization: false,
      cooldownPeriod: 1
    },
    minContent: 50,
    minViews: 1000000,
    badgeColor: '#f59e0b'     // amber-500
  }
};

// ============================================
// REWARD THRESHOLDS (80% Rule Implementation)
// ============================================

const REWARD_THRESHOLDS: RewardThreshold[] = [
  // ArcHaven (AI-only high-fidelity film platform) thresholds
  {
    id: 'archaven-series-80',
    name: 'ArcHaven Series Completion',
    description: 'Watch 80% of a complete ArcHaven AI film series',
    platform: 'archaven',
    requirement: {
      type: 'percentage',
      value: 80,
      seriesRequired: true
    },
    reward: {
      type: 'token',
      amount: 500,            // 500 $INVA tokens
      multiplier: 1.5         // 1.5x creator earnings multiplier
    },
    tier: 'emerging'
  },
  {
    id: 'archaven-series-100',
    name: 'ArcHaven Series Mastery',
    description: 'Complete 100% of an ArcHaven AI film series',
    platform: 'archaven',
    requirement: {
      type: 'percentage',
      value: 100,
      seriesRequired: true
    },
    reward: {
      type: 'token',
      amount: 1000,
      multiplier: 2.0
    },
    tier: 'emerging'
  },
  {
    id: 'archaven-film-complete',
    name: 'ArcHaven Film Completion',
    description: 'Watch a complete ArcHaven AI film',
    platform: 'archaven',
    requirement: {
      type: 'percentage',
      value: 90,
      seriesRequired: false
    },
    reward: {
      type: 'token',
      amount: 100
    },
    tier: 'emerging'
  },
  
  // Hektic TV thresholds
  {
    id: 'hektic-series-80',
    name: 'Hektic TV Series Completion',
    description: 'Watch 80% of a Hektic TV series',
    platform: 'hektic',
    requirement: {
      type: 'percentage',
      value: 80,
      seriesRequired: true
    },
    reward: {
      type: 'token',
      amount: 300,
      multiplier: 1.25
    },
    tier: 'emerging'
  },
  {
    id: 'hektic-series-100',
    name: 'Hektic TV Series Mastery',
    description: 'Complete 100% of a Hektic TV series',
    platform: 'hektic',
    requirement: {
      type: 'percentage',
      value: 100,
      seriesRequired: true
    },
    reward: {
      type: 'token',
      amount: 750,
      multiplier: 1.75
    },
    tier: 'emerging'
  },
  
  // Premium tier exclusive rewards
  {
    id: 'archaven-premium-collection',
    name: 'ArcHaven Premium Collector',
    description: 'Complete 5 ArcHaven series as a premium creator',
    platform: 'archaven',
    requirement: {
      type: 'episodes',
      value: 50,
      seriesRequired: true
    },
    reward: {
      type: 'badge',
      badgeId: 'archaven-collector'
    },
    tier: 'premium'
  }
];

// ============================================
// STORAGE KEYS
// ============================================

const STORAGE_KEYS = {
  VIEWING_SESSIONS: 'innova-viewing-sessions',
  SERIES_PROGRESS: 'innova-series-progress',
  REWARD_DISTRIBUTIONS: 'innova-reward-distributions',
  CREATOR_PROFILES: 'innova-creator-profiles',
  DAILY_POOLS: 'innova-daily-pools'
};

// ============================================
// VIEWING SESSION MANAGEMENT
// ============================================

/**
 * Record a viewing session
 */
export const recordViewingSession = (session: Omit<ViewingSession, 'id'>): ViewingSession => {
  const sessions = getViewingSessions();
  
  const newSession: ViewingSession = {
    ...session,
    id: `view-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  };
  
  sessions.push(newSession);
  saveViewingSessions(sessions);
  
  // Update series progress
  updateSeriesProgress(newSession);
  
  // Check for reward thresholds
  checkRewardThresholds(session.userId, session.contentId, session.platform);
  
  return newSession;
};

/**
 * Get all viewing sessions
 */
export const getViewingSessions = (): ViewingSession[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.VIEWING_SESSIONS);
    if (stored) return JSON.parse(stored);
  } catch {
    // Storage error
  }
  return [];
};

/**
 * Save viewing sessions
 */
const saveViewingSessions = (sessions: ViewingSession[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.VIEWING_SESSIONS, JSON.stringify(sessions));
  } catch {
    // Storage error
  }
};

/**
 * Get viewing sessions for a user
 */
export const getUserViewingSessions = (userId: string): ViewingSession[] => {
  return getViewingSessions().filter(s => s.userId === userId);
};

/**
 * Get viewing sessions for a specific content
 */
export const getContentViewingSessions = (contentId: string): ViewingSession[] => {
  return getViewingSessions().filter(s => s.contentId === contentId);
};

// ============================================
// SERIES PROGRESS TRACKING
// ============================================

/**
 * Update series progress based on viewing session
 */
export const updateSeriesProgress = (session: ViewingSession): void => {
  if (!session.completed && session.percentageWatched < 80) {
    // Don't count incomplete views under 80%
    return;
  }
  
  const progressMap = getSeriesProgressMap();
  const progressKey = `${session.userId}-${session.contentId}`;
  
  // Get content info (would normally come from API)
  const content = getContentById(session.contentId);
  if (!content || !content.seriesId) return;
  
  const seriesKey = `${session.userId}-${content.seriesId}`;
  
  if (!progressMap[seriesKey]) {
    progressMap[seriesKey] = {
      userId: session.userId,
      seriesId: content.seriesId,
      platform: content.platform,
      totalEpisodes: content.totalEpisodes || 1,
      watchedEpisodes: 0,
      totalDuration: 0,
      watchedDuration: 0,
      percentageComplete: 0,
      lastWatched: session.startTime,
      completedEpisodes: []
    };
  }
  
  const progress = progressMap[seriesKey];
  
  // Add episode if not already counted
  if (!progress.completedEpisodes.includes(session.contentId)) {
    progress.completedEpisodes.push(session.contentId);
    progress.watchedEpisodes = progress.completedEpisodes.length;
  }
  
  // Update duration
  progress.watchedDuration += session.durationWatched;
  progress.lastWatched = Math.max(progress.lastWatched, session.endTime);
  
  // Calculate percentage
  progress.percentageComplete = Math.min(
    100,
    (progress.watchedEpisodes / progress.totalEpisodes) * 100
  );
  
  progressMap[seriesKey] = progress;
  saveSeriesProgressMap(progressMap);
};

/**
 * Get series progress map
 */
const getSeriesProgressMap = (): Record<string, SeriesProgress> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SERIES_PROGRESS);
    if (stored) return JSON.parse(stored);
  } catch {
    // Storage error
  }
  return {};
};

/**
 * Save series progress map
 */
const saveSeriesProgressMap = (map: Record<string, SeriesProgress>): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.SERIES_PROGRESS, JSON.stringify(map));
  } catch {
    // Storage error
  }
};

/**
 * Get series progress for a user
 */
export const getUserSeriesProgress = (userId: string, platform?: PlatformType): SeriesProgress[] => {
  const map = getSeriesProgressMap();
  return Object.values(map).filter(p => 
    p.userId === userId && (!platform || p.platform === platform)
  );
};

/**
 * Check if user has reached 80% threshold for a series
 */
export const hasReached80PercentThreshold = (
  userId: string,
  seriesId: string
): boolean => {
  const map = getSeriesProgressMap();
  const key = `${userId}-${seriesId}`;
  const progress = map[key];
  
  if (!progress) return false;
  
  // Check for eligible thresholds
  const threshold = REWARD_THRESHOLDS.find(t => 
    t.platform === progress.platform &&
    t.requirement.seriesRequired &&
    t.requirement.type === 'percentage' &&
    t.requirement.value <= 80
  );
  
  if (!threshold) return false;
  
  return progress.percentageComplete >= threshold.requirement.value;
};

// ============================================
// REWARD THRESHOLD CHECKING
// ============================================

/**
 * Check if user qualifies for any reward thresholds
 */
export const checkRewardThresholds = (
  userId: string,
  contentId: string,
  platform: PlatformType
): RewardDistribution[] => {
  const distributions: RewardDistribution[] = [];
  const content = getContentById(contentId);
  if (!content) return distributions;
  
  const creatorProfile = getCreatorProfile(content.creatorHandle);
  const userProgress = getUserSeriesProgress(userId, platform);
  
  for (const threshold of REWARD_THRESHOLDS) {
    // Skip if platform doesn't match
    if (threshold.platform !== platform) continue;
    
    // Skip if user's creator tier is too low (for creator rewards)
    const tierLevels: Record<CreatorTier, number> = {
      emerging: 0, verified: 1, established: 2, premium: 3, legend: 4
    };
    if (tierLevels[creatorProfile.tier] < tierLevels[threshold.tier]) continue;
    
    // Check if already distributed
    const existingDistributions = getRewardDistributions();
    const alreadyDistributed = existingDistributions.some(d =>
      d.userId === userId &&
      d.thresholdId === threshold.id &&
      d.creatorHandle === content.creatorHandle
    );
    
    if (alreadyDistributed) continue;
    
    // Check requirement
    let qualifies = false;
    
    if (threshold.requirement.seriesRequired && content.seriesId) {
      const progress = userProgress.find(p => p.seriesId === content.seriesId);
      if (progress) {
        switch (threshold.requirement.type) {
          case 'percentage':
            qualifies = progress.percentageComplete >= threshold.requirement.value;
            break;
          case 'episodes':
            qualifies = progress.watchedEpisodes >= threshold.requirement.value;
            break;
        }
      }
    } else if (!threshold.requirement.seriesRequired) {
      // For non-series content
      const session = getViewingSessions().find(s =>
        s.userId === userId && s.contentId === contentId
      );
      if (session) {
        qualifies = session.percentageWatched >= threshold.requirement.value;
      }
    }
    
    if (qualifies) {
      // Calculate reward amount based on creator tier
      const tierMultiplier = CREATOR_TIER_CONFIG[creatorProfile.tier].revenueShare;
      const rewardAmount = threshold.reward.amount 
        ? Math.floor(threshold.reward.amount * tierMultiplier)
        : 0;
      
      const distribution: RewardDistribution = {
        id: `reward-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        creatorHandle: content.creatorHandle,
        thresholdId: threshold.id,
        amount: rewardAmount,
        timestamp: Date.now(),
        status: 'pending'
      };
      
      distributions.push(distribution);
      saveRewardDistribution(distribution);
    }
  }
  
  return distributions;
};

// ============================================
// REWARD DISTRIBUTION
// ============================================

/**
 * Get all reward distributions
 */
export const getRewardDistributions = (): RewardDistribution[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.REWARD_DISTRIBUTIONS);
    if (stored) return JSON.parse(stored);
  } catch {
    // Storage error
  }
  return [];
};

/**
 * Save a reward distribution
 */
const saveRewardDistribution = (distribution: RewardDistribution): void => {
  try {
    const distributions = getRewardDistributions();
    distributions.push(distribution);
    localStorage.setItem(STORAGE_KEYS.REWARD_DISTRIBUTIONS, JSON.stringify(distributions));
  } catch {
    // Storage error
  }
};

/**
 * Get pending reward distributions
 */
export const getPendingRewards = (userId: string): RewardDistribution[] => {
  return getRewardDistributions().filter(d =>
    d.userId === userId && d.status === 'pending'
  );
};

/**
 * Process reward distribution (simulate blockchain transaction)
 */
export const processRewardDistribution = async (
  distributionId: string
): Promise<{ success: boolean; transactionHash?: string; error?: string }> => {
  const distributions = getRewardDistributions();
  const index = distributions.findIndex(d => d.id === distributionId);
  
  if (index === -1) {
    return { success: false, error: 'Distribution not found' };
  }
  
  const distribution = distributions[index];
  
  // Simulate blockchain transaction
  const txHash = `0x${Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)).join('')}`;
  
  distribution.status = 'distributed';
  distribution.transactionHash = txHash;
  
  try {
    localStorage.setItem(STORAGE_KEYS.REWARD_DISTRIBUTIONS, JSON.stringify(distributions));
    return { success: true, transactionHash: txHash };
  } catch (error) {
    return { success: false, error: 'Failed to update distribution status' };
  }
};

/**
 * Get total rewards distributed to a user
 */
export const getTotalUserRewards = (userId: string): number => {
  return getRewardDistributions()
    .filter(d => d.userId === userId && d.status === 'distributed')
    .reduce((sum, d) => sum + d.amount, 0);
};

// ============================================
// CREATOR PROFILE MANAGEMENT
// ============================================

/**
 * Get creator profile
 */
export const getCreatorProfile = (handle: string): CreatorProfile => {
  try {
    const profiles = getCreatorProfiles();
    const profile = profiles.find(p => p.handle === handle);
    
    if (profile) return profile;
    
    // Create default profile
    const newProfile: CreatorProfile = {
      handle,
      tier: 'emerging',
      totalContent: 0,
      totalViews: 0,
      totalEarnings: 0,
      limitations: CREATOR_TIER_CONFIG.emerging.limitations,
      verified: false,
      joinDate: new Date().toISOString()
    };
    
    profiles.push(newProfile);
    saveCreatorProfiles(profiles);
    return newProfile;
  } catch {
    // Return default
    return {
      handle,
      tier: 'emerging',
      totalContent: 0,
      totalViews: 0,
      totalEarnings: 0,
      limitations: CREATOR_TIER_CONFIG.emerging.limitations,
      verified: false,
      joinDate: new Date().toISOString()
    };
  }
};

/**
 * Get all creator profiles
 */
const getCreatorProfiles = (): CreatorProfile[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CREATOR_PROFILES);
    if (stored) return JSON.parse(stored);
  } catch {
    // Storage error
  }
  return [];
};

/**
 * Save creator profiles
 */
const saveCreatorProfiles = (profiles: CreatorProfile[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.CREATOR_PROFILES, JSON.stringify(profiles));
  } catch {
    // Storage error
  }
};

/**
 * Update creator statistics
 */
export const updateCreatorStats = (
  handle: string,
  stats: Partial<Pick<CreatorProfile, 'totalContent' | 'totalViews' | 'totalEarnings'>>
): CreatorProfile => {
  const profiles = getCreatorProfiles();
  const index = profiles.findIndex(p => p.handle === handle);
  
  if (index === -1) {
    const newProfile = getCreatorProfile(handle);
    Object.assign(newProfile, stats);
    profiles.push(newProfile);
  } else {
    Object.assign(profiles[index], stats);
  }
  
  // Recalculate tier
  const profile = profiles[index >= 0 ? index : profiles.length - 1];
  profile.tier = calculateCreatorTier(profile.totalContent, profile.totalViews);
  profile.limitations = CREATOR_TIER_CONFIG[profile.tier].limitations;
  
  saveCreatorProfiles(profiles);
  return profile;
};

/**
 * Calculate creator tier based on content and views
 */
const calculateCreatorTier = (totalContent: number, totalViews: number): CreatorTier => {
  const tiers: CreatorTier[] = ['legend', 'premium', 'established', 'verified', 'emerging'];
  
  for (const tier of tiers) {
    const config = CREATOR_TIER_CONFIG[tier];
    if (totalContent >= config.minContent && totalViews >= config.minViews) {
      return tier;
    }
  }
  
  return 'emerging';
};

/**
 * Get tier configuration
 */
export const getTierConfig = (tier: CreatorTier) => CREATOR_TIER_CONFIG[tier];

// ============================================
// DAILY REWARD POOLS
// ============================================

/**
 * Get or create daily reward pool
 */
export const getOrCreateDailyPool = (date: string, platform: PlatformType): DailyRewardPool => {
  const pools = getDailyPools();
  const existingPool = pools.find(p => p.date === date && p.platform === platform);
  
  if (existingPool) return existingPool;
  
  // Create new pool with default amount
  const newPool: DailyRewardPool = {
    date,
    platform,
    totalPool: platform === 'archaven' ? 10000 : 5000,  // Higher pool for ArcHaven
    distributed: 0,
    recipients: 0,
    status: 'active'
  };
  
  pools.push(newPool);
  saveDailyPools(pools);
  return newPool;
};

/**
 * Get daily pools
 */
const getDailyPools = (): DailyRewardPool[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.DAILY_POOLS);
    if (stored) return JSON.parse(stored);
  } catch {
    // Storage error
  }
  return [];
};

/**
 * Save daily pools
 */
const saveDailyPools = (pools: DailyRewardPool[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.DAILY_POOLS, JSON.stringify(pools));
  } catch {
    // Storage error
  }
};

/**
 * Distribute from daily pool
 */
export const distributeFromDailyPool = (
  date: string,
  platform: PlatformType,
  amount: number,
  recipientCount: number
): boolean => {
  const pools = getDailyPools();
  const poolIndex = pools.findIndex(p => p.date === date && p.platform === platform);
  
  if (poolIndex === -1) return false;
  
  const pool = pools[poolIndex];
  if (pool.distributed + amount > pool.totalPool) return false;
  
  pool.distributed += amount;
  pool.recipients += recipientCount;
  
  // Close pool if fully distributed
  if (pool.distributed >= pool.totalPool) {
    pool.status = 'closed';
  }
  
  saveDailyPools(pools);
  return true;
};

// ============================================
// CONTENT REGISTRY (Mock for demo)
// ============================================

const MOCK_CONTENT: Record<string, ContentItem> = {
  'ARCH-001': {
    id: 'ARCH-001',
    title: 'Neural Dreams: Episode 1',
    platform: 'archaven',
    type: 'episode',
    seriesId: 'neural-dreams',
    seriesTitle: 'Neural Dreams',
    seasonNumber: 1,
    episodeNumber: 1,
    totalEpisodes: 10,
    duration: 2700,  // 45 minutes
    creatorHandle: '@AI_DIRECTOR',
    creatorTier: 'premium',
    releaseDate: '2024-01-15'
  },
  'HEK-001': {
    id: 'HEK-001',
    title: 'Live Gaming Championship',
    platform: 'hektic',
    type: 'episode',
    seriesId: 'gaming-championship',
    seriesTitle: 'Gaming Championship 2024',
    seasonNumber: 1,
    episodeNumber: 1,
    totalEpisodes: 8,
    duration: 7200,  // 2 hours
    creatorHandle: '@ESPORTS_LEAGUE',
    creatorTier: 'established',
    releaseDate: '2024-02-01'
  }
};

/**
 * Get content by ID
 */
export const getContentById = (contentId: string): ContentItem | null => {
  return MOCK_CONTENT[contentId] || null;
};

/**
 * Get all content for a series
 */
export const getSeriesContent = (seriesId: string): ContentItem[] => {
  return Object.values(MOCK_CONTENT).filter(c => c.seriesId === seriesId);
};

// ============================================
// EXPORT SUMMARY FUNCTIONS
// ============================================

/**
 * Get user's complete rewards summary
 */
export const getUserRewardsSummary = (userId: string) => {
  const distributions = getRewardDistributions().filter(d => d.userId === userId);
  const pending = distributions.filter(d => d.status === 'pending');
  const distributed = distributions.filter(d => d.status === 'distributed');
  
  return {
    totalPending: pending.reduce((sum, d) => sum + d.amount, 0),
    totalDistributed: distributed.reduce((sum, d) => sum + d.amount, 0),
    pendingCount: pending.length,
    distributedCount: distributed.length,
    recentDistributions: distributions.slice(-10).reverse()
  };
};

/**
 * Get platform statistics
 */
export const getPlatformStats = (platform: PlatformType) => {
  const sessions = getViewingSessions().filter(s => s.platform === platform);
  const progress = getUserSeriesProgress('', platform); // All users
  const today = new Date().toISOString().split('T')[0];
  const pool = getOrCreateDailyPool(today, platform);
  
  return {
    totalSessions: sessions.length,
    totalWatchTime: sessions.reduce((sum, s) => sum + s.durationWatched, 0),
    activeSeries: new Set(progress.map(p => p.seriesId)).size,
    dailyPoolRemaining: pool.totalPool - pool.distributed,
    dailyPoolStatus: pool.status
  };
};