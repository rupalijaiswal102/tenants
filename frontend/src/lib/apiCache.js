// Simple in-memory cache — stale-while-revalidate pattern.
// Data shows instantly on re-visit; silent background refetch updates it.

const store = {};
const TTL = 2 * 60 * 1000; // 2 min — increase if data changes rarely

export function getCached(key) {
  const entry = store[key];
  if (!entry) return null;
  if (Date.now() - entry.ts > TTL) { delete store[key]; return null; }
  return entry.data;
}

export function setCached(key, data) {
  store[key] = { data, ts: Date.now() };
}

export function invalidate(...keys) {
  if (keys.length === 0) Object.keys(store).forEach(k => delete store[k]);
  else keys.forEach(k => delete store[k]);
}
