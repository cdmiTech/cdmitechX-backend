const express = require('express');
const router = express.Router();
const { getDashboardStats } = require('../controllers/dashboardController');
const { protect, facultyOnly } = require('../middleware/authMiddleware');

router.get('/stats', protect, facultyOnly, getDashboardStats);

module.exports = router;
