// A request that hangs (e.g. the DB pool is exhausted, or a downstream call
// never returns) should fail fast with a retryable message rather than
// leaving the client's request spinning forever.
function requestTimeout(ms = 15000) {
  return (req, res, next) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(503).json({
          message: 'The request took too long. Please retry.',
          code: 'GATEWAY_TIMEOUT',
        });
      }
    }, ms);

    // Clean up regardless of how the response ends, or the timer leaks.
    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));

    next();
  };
}

module.exports = { requestTimeout };
