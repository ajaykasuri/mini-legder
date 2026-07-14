const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { listSpendingLimits, upsertSpendingLimit, verifyOverride } = require('../controllers/spendingLockController');

router.use(requireAuth);

router.get('/', listSpendingLimits);
router.post('/', upsertSpendingLimit);
router.post('/verify-override', verifyOverride);

module.exports = router;
