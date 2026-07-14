// Recognizes "the connection dropped mid-request" style errors — as
// opposed to a genuine bug in our own code — so the client gets a
// 503 + "please retry" instead of a generic, unhelpful 500.
const NETWORK_ERROR_CODES = new Set(['ECONNRESET', 'ECONNREFUSED', 'EPIPE', 'ETIMEDOUT', 'EAI_AGAIN']);

function isNetworkError(err) {
  if (!err) return false;
  return NETWORK_ERROR_CODES.has(err.code) || err.code === 'PROTOCOL_CONNECTION_LOST';
}

module.exports = { isNetworkError, NETWORK_ERROR_CODES };
