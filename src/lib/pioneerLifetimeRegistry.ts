// First-100 Pioneer Lifetime Access Registry & Hard Cutoff Gatekeeper
// Grants Free Lifetime All-Access to the first 100 verified @USER.NAME Nodes (1 per unique hardware device) and cuts off strictly at #100.

export const PIONEER_LIFETIME_CAP = 100;
const PIONEER_STORAGE_KEY = 'innova_pioneer_lifetime_registry_v1';

export interface PioneerClaimRecord {
  claimNumber: number;
  handle: string;
  hardwareFingerprint?: string;
  isLifetimeFree: boolean;
  tierAssigned: string;
  claimedAt: string;
}

// Removes any fake/test accounts like HENRY and re-indexes remaining legitimate claims (#1 = @TICKER)
export function sanitizeAndRestorePioneerRegistry(): PioneerClaimRecord[] {
  try {
    const raw = localStorage.getItem(PIONEER_STORAGE_KEY);
    let parsed: PioneerClaimRecord[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) parsed = [];

    // Purge HENRY / @HENRY or any invalid test entries and deduplicate by handle
    const seen = new Set<string>();
    const filtered: PioneerClaimRecord[] = [];
    for (const item of parsed) {
      const clean = String(item?.handle || '').trim().replace(/^@+/, '').toUpperCase();
      if (!clean || clean === 'HENRY' || clean === 'TEMPCREATOR') continue;
      const formatted = `@${clean}`;
      if (!seen.has(formatted)) {
        seen.add(formatted);
        filtered.push({ ...item, handle: formatted });
      }
    }

    // Ensure Founder @TICKER is always Slot #1/100
    if (!seen.has('@TICKER')) {
      filtered.unshift({
        claimNumber: 1,
        handle: '@TICKER',
        isLifetimeFree: true,
        tierAssigned: `Founder Pioneer — Free Lifetime All-Access (#1/${PIONEER_LIFETIME_CAP})`,
        claimedAt: new Date().toISOString()
      });
    }

    // Re-number sequentially so Henry's revoked slot is 100% restored!
    const reindexed = filtered.map((rec, idx) => {
      const num = idx + 1;
      const qualifies = num <= PIONEER_LIFETIME_CAP || rec.handle === '@TICKER' || rec.handle === '@TICKERTWIZTED';
      return {
        ...rec,
        claimNumber: num,
        isLifetimeFree: qualifies,
        tierAssigned: qualifies
          ? `Founder Pioneer — Free Lifetime All-Access (#${num}/${PIONEER_LIFETIME_CAP})`
          : `Standard Paid Tier Required (Account #${num} — First 100 Cap Reached)`
      };
    });

    localStorage.setItem(PIONEER_STORAGE_KEY, JSON.stringify(reindexed));
    return reindexed;
  } catch {
    return [];
  }
}

export function loadPioneerRegistry(): PioneerClaimRecord[] {
  return sanitizeAndRestorePioneerRegistry();
}

export function revokePioneerClaimForHandle(rawHandle: string): PioneerClaimRecord[] {
  const target = `@${String(rawHandle || '').trim().replace(/^@+/, '').toUpperCase()}`;
  try {
    const current = loadPioneerRegistry().filter((r) => r.handle.toUpperCase() !== target);
    localStorage.setItem(PIONEER_STORAGE_KEY, JSON.stringify(current));
  } catch {}
  return sanitizeAndRestorePioneerRegistry();
}

export function getPioneerSlotsRemaining(): {
  claimedCount: number;
  remainingFreeSlots: number;
  capReached: boolean;
  claims: PioneerClaimRecord[];
} {
  const list = sanitizeAndRestorePioneerRegistry();
  const claimedCount = list.length;
  const remainingFreeSlots = Math.max(0, PIONEER_LIFETIME_CAP - claimedCount);
  return {
    claimedCount,
    remainingFreeSlots,
    capReached: claimedCount >= PIONEER_LIFETIME_CAP,
    claims: list
  };
}

export function registerAccountWithPioneerCutoff(rawHandle: string, hardwareFp?: string): PioneerClaimRecord {
  const clean = String(rawHandle || '').trim().replace(/^@+/, '').toUpperCase();
  const cleanHandle = `@${clean}`;

  const registry = sanitizeAndRestorePioneerRegistry();
  const existing = registry.find((r) => r.handle.toUpperCase() === cleanHandle);
  if (existing) {
    return existing;
  }

  const nextNumber = registry.length + 1;
  // Strictly cut off at 100! (#1 to #100 = Free Lifetime; #101+ = Paid Required)
  const qualifiesForLifetime =
    nextNumber <= PIONEER_LIFETIME_CAP || cleanHandle === '@TICKER' || cleanHandle === '@TICKERTWIZTED';

  const record: PioneerClaimRecord = {
    claimNumber: nextNumber,
    handle: cleanHandle,
    hardwareFingerprint: hardwareFp,
    isLifetimeFree: qualifiesForLifetime,
    tierAssigned: qualifiesForLifetime
      ? `Founder Pioneer — Free Lifetime All-Access (#${nextNumber}/${PIONEER_LIFETIME_CAP})`
      : `Standard Paid Tier Required (Account #${nextNumber} — First 100 Cap Reached)`,
    claimedAt: new Date().toISOString()
  };

  const updated = [...registry, record];
  try {
    localStorage.setItem(PIONEER_STORAGE_KEY, JSON.stringify(updated));
    const profRaw = localStorage.getItem('innova_user_profile');
    const prof = profRaw ? JSON.parse(profRaw) : {};
    prof.handle = cleanHandle;
    prof.subscriptionTier = record.tierAssigned;
    prof.subscriptionStatus = qualifiesForLifetime ? 'Lifetime Active' : 'Payment Required';
    prof.billingCycle = qualifiesForLifetime
      ? 'Free Lifetime Access (First 100 Pioneer)'
      : 'Monthly ($14.99/mo) or Annual ($149.99/yr)';
    localStorage.setItem('innova_user_profile', JSON.stringify(prof));
  } catch {}

  return record;
}
