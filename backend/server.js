require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { verifyConnection } = require('./config/db');
const { connectRedis } = require('./config/redis');
const { errorHandler } = require('./middleware/errorHandler');
const { requestTimeout } = require('./middleware/timeoutHandler');

const authRoutes = require('./routes/authRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const budgetRoutes = require('./routes/budgetRoutes');
const insightRoutes = require('./routes/insightRoutes');
const spendingLockRoutes = require('./routes/spendingLockRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(requestTimeout());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/dashboard', insightRoutes);
app.use('/api/spending-limits', spendingLockRoutes);

app.use((req, res) => res.status(404).json({ message: 'Route not found.' }));
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

verifyConnection().then(() => {
  connectRedis(); // fire-and-forget — caching just stays off if this fails
  const server = app.listen(PORT, () => console.log(`Mini Smart Ledger API running on port ${PORT}`));

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Stop any running server using this port or set a different PORT environment variable.`);
    } else {
      console.error('Server failed to start:', err.message || err);
    }
    process.exit(1);
  });
});
