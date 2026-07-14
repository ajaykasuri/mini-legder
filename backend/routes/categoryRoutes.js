const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { listCategories, createCategory } = require('../controllers/categoryController');

router.use(requireAuth);

router.get('/', listCategories);
router.post('/', createCategory);

module.exports = router;
