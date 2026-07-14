const { isNetworkError } = require('../utils/networkErrors');

// Centralized error handler so controllers can just `next(err)` and every
// route returns a consistent { message } shape instead of leaking stack
// traces or raw MySQL errors to the client.
function errorHandler(err, req, res, next) {
  console.error(err);

  if (res.headersSent) return next(err); // e.g. the timeout middleware already responded

  if (isNetworkError(err)) {
    return res.status(503).json({
      message: 'The connection dropped. Please retry.',
      code: 'NETWORK_ERROR',
    });
  }

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ message: 'That record already exists.' });
  }

  const status = err.status || 500;
  const message = err.status ? err.message : 'Something went wrong on our end.';

  res.status(status).json({ message });
}

module.exports = { errorHandler };
