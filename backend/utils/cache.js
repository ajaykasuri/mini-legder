const { client } = require('../config/redis');

const DASHBOARD_TTL_SECONDS = 60;

async function getCached(key) {
  try {
    if (!client.isOpen) return null; // Redis unreachable — treat as a miss
    const raw = await client.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('Cache read failed:', err.message);
    return null;
  }
}

async function setCached(key, value, ttlSeconds = DASHBOARD_TTL_SECONDS) {
  try {
    if (!client.isOpen) return;
    await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch (err) {
    console.error('Cache write failed:', err.message);
  }
}

// Dashboard summary/charts are the only things cached in this app, and both
// are keyed per-user, so invalidation is just "drop these two keys" rather
// than a general pattern-scan.
async function invalidateDashboardCache(userId) {
  try {
    if (!client.isOpen) return;
    await client.del([`dash:summary:${userId}`, `dash:charts:${userId}`]);
  } catch (err) {
    console.error('Cache invalidation failed:', err.message);
  }
}

module.exports = { getCached, setCached, invalidateDashboardCache, DASHBOARD_TTL_SECONDS };
