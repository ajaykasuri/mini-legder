const { createClient } = require('redis');

let hasLoggedError = false;

const client = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    // Redis is a cache, not a source of truth — if it's not there, stop
    // retrying instead of hammering the console forever. Returning `false`
    // from reconnectStrategy tells the client to give up after the first
    // failed attempt rather than retrying indefinitely.
    reconnectStrategy: () => false,
  },
});

client.on('error', (err) => {
  if (!hasLoggedError) {
    console.error('Redis unavailable — dashboard caching disabled:', err.message || err.code || 'connection failed');
    hasLoggedError = true;
  }
});

async function connectRedis() {
  try {
    await client.connect();
    console.log('Redis connected');
  } catch (err) {
    // Already logged by the 'error' handler above — just let the app continue.
  }
}

module.exports = { client, connectRedis };