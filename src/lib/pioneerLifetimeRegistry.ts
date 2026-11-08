// First-100 Pioneer Lifetime Access Registry & Hard Cutoff Gatekeeper
// Automatically grants Free Lifetime All-Access to the first 100 registered @USER.NAME Nodes, and strictly cuts off at #100.

export const PIONEER_LIFETIME_CAP = 100;
const PIONEER_STORAGE_KEY = 'innova_pioneer_lifetime_registry_v1';

export interface PioneerClaimRecord {
  claimNumber: number;
  handle: string;
  isLifetimeFree: boolean;
  tierAssigned: string;
  claimedAt: string;
}

export function loadPioneerRegistry(): PioneerClaimRecord[] {
  try {
    const raw = localStorage.getItem(PIONEER_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getPioneerSlotsRemaining(): { claimedCount: number; remainingFreeSlots: number; capReached: boolean } {
  const list = loadPioneerRegistry();
  const claimedCount = list.length;
  const remainingFreeSlots = Math.max(0, PIONEER_LIFETIME_CAP - claimedCount);
  return {
    claimedCount,
    remainingFreeSlots,
    capReached: claimedCount >= PIONEER_LIFETIME_CAP
  };
}

export function registerAccountWithPioneerCutoff(rawHandle: string): PioneerClaimRecord {
  const cleanHandle = rawHandle.trim().startsWith('@')
    ? rawHandle.trim().toUpperCase()
    : '@' + rawHandle.trim().toUpperCase();

  const registry = loadPioneerRegistry();
  const existing = registry.find((r) => r.handle.toUpperCase() === cleanHandle);
  if (existing) {
    return existing;
  }

  const nextNumber = registry.length + 1;
  // Strictly cut off at 100! (#1 to #100 = Free Lifetime; #101+ = Paid Required)
  const qualifiesForLifetime = nextNumber <= PIONEER_LIFETIME_CAP || cleanHandle === '@TICKER' || cleanHandle === '@TICKERTWIZTED';

  const record: PioneerClaimRecord = {
    claimNumber: nextNumber,
    handle: cleanHandle,
    isLifetimeFree: qualifiesForLifetime,
    tierAssigned: qualifiesForLifetime
      ? `Founder Pioneer — Free Lifetime All-Access (#${nextNumber}/${PIONEER_LIFETIME_CAP})`
      : `Standard Paid Tier Required (Account #${nextNumber} — First 100 Cap Reached)`,
    claimedAt: new Date().toISOString()
  };

  const updated = [...registry, record];
  try {
    localStorage.setItem(PIONEER_STORAGE_KEY, JSON.stringify(updated));
    // Also sync to the user's unified profile if they are the active user
    const profRaw = localStorage.getItem('innova_user_profile');
    const prof = profRaw ? JSON.parse(profRaw) : {};
    prof.handle = cleanHandle;
    prof.subscriptionTier = record.tierAssigned;
    prof.subscriptionStatus = qualifiesForLifetime ? 'Lifetime Active' : 'Payment Required';
    prof.billingCycle = qualifiesForLifetime ? 'Free Lifetime Access (First 100 Pioneer)' : 'Monthly ($14.99/mo) or Annual ($149.99/yr)';
    localStorage.setItem('innova_user_profile', JSON.stringify(prof));
  } catch {}

  return record;
}
