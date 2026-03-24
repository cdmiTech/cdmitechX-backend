const express = require('express');
const router = express.Router();
const { getWorkbooks, createWorkbook } = require('../controllers/workbookController');
const { protect, facultyOnly } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getWorkbooks)
    .post(protect, facultyOnly, createWorkbook);

module.exports = router;
