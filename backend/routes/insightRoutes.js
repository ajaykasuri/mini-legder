const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { getDashboardSummary, getInsights, getCharts } = require('../controllers/insightController');

router.use(requireAuth);

router.get('/summary', getDashboardSummary);
router.get('/insights', getInsights);
router.get('/charts', getCharts);

module.exports = router;
