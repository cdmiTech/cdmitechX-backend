const express = require('express');
const router = express.Router();
const { submitReport, getStudentReports, getFacultyReports } = require('../controllers/reportController');
const { protect, facultyOnly, authorize } = require('../middleware/authMiddleware');

router.post('/', protect, authorize('student'), submitReport);
router.get('/student', protect, authorize('student'), getStudentReports);
router.get('/faculty', protect, authorize('faculty', 'admin'), getFacultyReports);

module.exports = router;
