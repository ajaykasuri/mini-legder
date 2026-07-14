const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  listTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  exportCsv,
} = require('../controllers/transactionController');

router.use(requireAuth);

router.get('/export', exportCsv); // must come before /:id
router.get('/', listTransactions);
router.get('/:id', getTransaction);
router.post('/', createTransaction);
router.put('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);

module.exports = router;
