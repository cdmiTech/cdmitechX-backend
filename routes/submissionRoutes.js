const express = require('express');
const router = express.Router();
const { getSubmissions, createSubmission, getMySubmissions, getStudentSubmissions } = require('../controllers/submissionController');
const { protect, facultyOnly } = require('../middleware/authMiddleware');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.get('/my', protect, getMySubmissions);
router.get('/student/:studentId', protect, facultyOnly, getStudentSubmissions);

router.route('/')
    .get(protect, facultyOnly, getSubmissions)
    .post(protect, upload.single('image'), createSubmission);

module.exports = router;
