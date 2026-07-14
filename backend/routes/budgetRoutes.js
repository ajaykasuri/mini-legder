const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { listBudgets, upsertBudget } = require('../controllers/budgetController');

router.use(requireAuth);

router.get('/', listBudgets);
router.post('/', upsertBudget);

module.exports = router;
